"use client";

import React, { useState, useEffect } from "react";
import { projectsApi } from "@/domains/projects/api";
import { ChecklistTemplate, ChecklistTemplateItem } from "@/types/projects";
import { toast } from "sonner";

export const ChecklistTemplateManager = () => {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  
  const [workingItems, setWorkingItems] = useState<{title: string; requires_visual_proof: boolean}[]>([]);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemProof, setNewItemProof] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.getChecklistTemplates();
      setTemplates(data);
      if (selectedTemplate) {
        const updated = data.find(t => t.id === selectedTemplate.id);
        if (updated) setSelectedTemplate(updated);
      }
    } catch (err) {
      toast.error("Failed to load templates.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    setIsSaving(true);
    try {
      await projectsApi.createChecklistTemplate({ name: newTemplateName, description: newTemplateDesc });
      setNewTemplateName("");
      setNewTemplateDesc("");
      toast.success("Template created successfully.");
      loadTemplates();
    } catch (err) {
      toast.error("Failed to create template.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await projectsApi.deleteChecklistTemplate(id);
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
        setWorkingItems([]);
      }
      toast.success("Template deleted.");
      loadTemplates();
    } catch (err) {
      toast.error("Failed to delete template.");
    }
  };

  const handleSelectTemplate = (t: ChecklistTemplate) => {
    setSelectedTemplate(t);
    setWorkingItems(t.items?.map(i => ({ title: i.title, requires_visual_proof: i.requires_visual_proof })) || []);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    setWorkingItems([...workingItems, { title: newItemTitle, requires_visual_proof: newItemProof }]);
    setNewItemTitle("");
    setNewItemProof(false);
  };

  const handleRemoveItem = (index: number) => {
    setWorkingItems(workingItems.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === workingItems.length - 1) return;
    
    const newItems = [...workingItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setWorkingItems(newItems);
  };

  const handleSaveItems = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    try {
      await projectsApi.syncChecklistTemplateItems(selectedTemplate.id, workingItems);
      toast.success("Checklist items saved successfully.");
      loadTemplates();
    } catch (err) {
      toast.error("Failed to save items.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      {/* Templates List Sidebar */}
      <div className="lg:col-span-1 space-y-8">
        <section className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-surface-100 flex justify-between items-center bg-surface-50/50">
            <h3 className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">Global Templates</h3>
            <span className="text-[10px] font-bold text-surface-400 uppercase">{templates.length} Active</span>
          </div>
          
          <div className="p-4 space-y-4">
            {isLoading && <p className="text-center text-xs text-surface-400 p-4 font-bold uppercase tracking-widest animate-pulse">Loading...</p>}
            
            {!isLoading && templates.length === 0 && (
              <p className="text-center text-[10px] text-surface-400 font-bold uppercase tracking-widest p-4">No templates found.</p>
            )}
            
            <div className="space-y-2">
              {templates.map(t => (
                <div 
                  key={t.id} 
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                    selectedTemplate?.id === t.id 
                    ? "bg-primary text-white border-primary shadow-lg scale-[1.02]" 
                    : "bg-surface-50 text-primary border-surface-200 hover:border-accent/40"
                  }`}
                  onClick={() => handleSelectTemplate(t)}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-bold text-sm tracking-tight truncate">{t.name}</h4>
                    <p className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${
                      selectedTemplate?.id === t.id ? "text-white/60" : "text-surface-400"
                    }`}>
                      {t.items?.length || 0} Checkpoints
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      selectedTemplate?.id === t.id 
                      ? "bg-white/10 hover:bg-red-500 hover:text-white" 
                      : "bg-white text-surface-400 border border-surface-200 hover:bg-red-500 hover:border-red-500 hover:text-white"
                    }`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white p-6 border border-surface-200 rounded-2xl shadow-sm space-y-6">
          <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Establish New Template</h3>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Template Name</label>
              <input type="text" required value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-sm font-bold" placeholder="e.g. Concrete Pour QA" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Description</label>
              <input type="text" value={newTemplateDesc} onChange={e => setNewTemplateDesc(e.target.value)} className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-sm" placeholder="Optional context..." />
            </div>
            <button type="submit" disabled={isSaving || !newTemplateName.trim()} className="w-full h-12 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-accent disabled:opacity-50">
              Create Template
            </button>
          </form>
        </section>
      </div>

      {/* Template Editor */}
      <div className="lg:col-span-2">
        {selectedTemplate ? (
          <div className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[600px] animate-in slide-in-from-right-4 duration-500">
            <div className="p-8 border-b border-surface-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 arch-grid opacity-20 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-primary tracking-tight">{selectedTemplate.name}</h2>
                <p className="text-xs text-surface-500 mt-1">{selectedTemplate.description || "Standard operating procedure template"}</p>
              </div>
              <button 
                onClick={handleSaveItems} 
                disabled={isSaving}
                className="relative z-10 px-8 h-12 bg-accent text-white font-bold uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-primary shadow-lg shadow-accent/20 transition-all disabled:opacity-50 shrink-0"
              >
                {isSaving ? "Saving..." : "Save Template Changes"}
              </button>
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-primary uppercase tracking-[0.3em] flex items-center gap-3">
                  Checkpoints 
                  <span className="px-2 py-0.5 bg-surface-100 text-surface-500 rounded-md border border-surface-200">{workingItems.length}</span>
                </h3>
                
                {workingItems.length === 0 ? (
                  <div className="p-10 border-2 border-dashed border-surface-200 rounded-2xl text-center">
                    <p className="text-3xl mb-3 opacity-50">📋</p>
                    <p className="text-sm font-bold text-surface-400 uppercase tracking-widest">No checkpoints defined.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workingItems.map((item, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-surface-200 rounded-xl hover:border-accent/30 transition-colors group">
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="w-8 h-8 flex items-center justify-center bg-surface-50 rounded-lg border border-surface-200 text-surface-400 hover:text-primary hover:bg-surface-100 disabled:opacity-30">↑</button>
                          <button onClick={() => moveItem(index, 'down')} disabled={index === workingItems.length - 1} className="w-8 h-8 flex items-center justify-center bg-surface-50 rounded-lg border border-surface-200 text-surface-400 hover:text-primary hover:bg-surface-100 disabled:opacity-30">↓</button>
                          <span className="w-8 text-center text-[10px] font-black text-surface-300">{(index + 1).toString().padStart(2, '0')}</span>
                        </div>
                        
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={item.title} 
                            onChange={(e) => {
                              const newItems = [...workingItems];
                              newItems[index].title = e.target.value;
                              setWorkingItems(newItems);
                            }}
                            className="w-full bg-transparent outline-none font-bold text-sm text-primary"
                          />
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 sm:border-l border-surface-100 pt-3 sm:pt-0 sm:pl-4">
                          <label className="flex items-center gap-2 cursor-pointer group/label">
                            <input 
                              type="checkbox" 
                              checked={item.requires_visual_proof} 
                              onChange={(e) => {
                                const newItems = [...workingItems];
                                newItems[index].requires_visual_proof = e.target.checked;
                                setWorkingItems(newItems);
                              }}
                              className="w-4 h-4 rounded border-surface-300 text-accent focus:ring-accent"
                            />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-surface-400 group-hover/label:text-primary transition-colors">Visual Proof</span>
                          </label>
                          <button 
                            onClick={() => handleRemoveItem(index)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-300 hover:text-white hover:bg-red-500 transition-colors bg-surface-50 border border-surface-100"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-8 border-t border-surface-100 bg-surface-50/50">
              <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-4 items-center">
                <input 
                  type="text" 
                  value={newItemTitle}
                  onChange={e => setNewItemTitle(e.target.value)}
                  placeholder="New checkpoint requirement..." 
                  className="flex-1 h-12 bg-white border border-surface-200 rounded-xl px-5 outline-none focus:border-accent text-sm font-bold w-full"
                />
                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                  <input type="checkbox" checked={newItemProof} onChange={e => setNewItemProof(e.target.checked)} className="w-5 h-5 rounded border-surface-300 text-accent focus:ring-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Require Photo</span>
                </label>
                <button 
                  type="submit" 
                  disabled={!newItemTitle.trim()}
                  className="w-full sm:w-auto px-8 h-12 bg-surface-800 text-white font-bold uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-primary disabled:opacity-40 transition-colors shrink-0"
                >
                  + Add Checkpoint
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[600px] border-2 border-dashed border-surface-200 rounded-2xl flex flex-col items-center justify-center text-center p-10 bg-surface-50">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 opacity-50">
              <span className="text-4xl">📋</span>
            </div>
            <h2 className="text-xl font-bold text-primary tracking-tight mb-2">Select a Template</h2>
            <p className="text-sm text-surface-400 max-w-sm">Choose a global SOP template from the sidebar to modify its checkpoints, or establish a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};
