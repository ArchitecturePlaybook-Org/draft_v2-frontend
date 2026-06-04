"use client";

import { useEffect, useState } from "react";
import { projectsApi as api } from "@/domains/projects/api";
import { MaterialAssembly, MaterialAssemblyComponent } from "@/types/projects";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { useRef } from "react";

export function MaterialAssemblyManager() {
  const [assemblies, setAssemblies] = useState<MaterialAssembly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssembly, setSelectedAssembly] = useState<MaterialAssembly | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ item_code: "", description: "", unit: "" });

  const [compData, setCompData] = useState({ material_code: "", description: "", quantity_per_unit: "", unit: "", default_unit_rate: "", waste_percentage: "" });

  useEffect(() => {
    loadAssemblies();
  }, []);

  async function loadAssemblies() {
    setIsLoading(true);
    try {
      const data = await api.getMaterialAssemblies();
      setAssemblies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateAssembly(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createMaterialAssembly(formData);
      setFormData({ item_code: "", description: "", unit: "" });
      setIsCreating(false);
      loadAssemblies();
    } catch (err) {
      console.error(err);
      alert("Failed to create assembly");
    }
  }

  async function handleDeleteAssembly(id: number) {
    if (!confirm("Are you sure you want to delete this assembly?")) return;
    try {
      await api.deleteMaterialAssembly(id);
      setSelectedAssembly(null);
      loadAssemblies();
    } catch (err) {
      console.error(err);
      alert("Failed to delete assembly");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedAssembly) return;

    setIsUploading(true);
    try {
      await api.uploadMaterialAssemblyImage(selectedAssembly.id, file);
      loadAssemblies();
      const updated = await api.getMaterialAssemblies();
      setSelectedAssembly(updated.find((a: any) => a.id === selectedAssembly.id) || null);
    } catch (err) {
      console.error(err);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveImage() {
    if (!selectedAssembly || !confirm("Remove image?")) return;
    try {
      await api.removeMaterialAssemblyImage(selectedAssembly.id);
      loadAssemblies();
      const updated = await api.getMaterialAssemblies();
      setSelectedAssembly(updated.find((a: any) => a.id === selectedAssembly.id) || null);
    } catch (err) {
      console.error(err);
      alert("Failed to remove image");
    }
  }

  async function handleAddComponent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssembly) return;
    try {
      await api.createMaterialAssemblyComponent({
        assembly: selectedAssembly.id,
        ...compData
      });
      setCompData({ material_code: "", description: "", quantity_per_unit: "", unit: "", default_unit_rate: "", waste_percentage: "" });
      loadAssemblies();
      // Need to reload selected assembly
      const updated = await api.getMaterialAssemblies();
      setSelectedAssembly(updated.find((a: any) => a.id === selectedAssembly.id) || null);
    } catch (err) {
      console.error(err);
      alert("Failed to add component");
    }
  }

  async function handleDeleteComponent(id: number) {
    if (!confirm("Remove component?")) return;
    try {
      await api.deleteMaterialAssemblyComponent(id);
      loadAssemblies();
      const updated = await api.getMaterialAssemblies();
      setSelectedAssembly(updated.find((a: any) => a.id === selectedAssembly?.id) || null);
    } catch (err) {
      console.error(err);
      alert("Failed to remove component");
    }
  }

  if (isLoading) return <div className="p-10 text-center animate-pulse">Loading Assemblies...</div>;

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center bg-white p-8 border border-surface-200 rounded-2xl shadow-sm">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-primary tracking-tight uppercase">Material Composition & Recipes</h2>
          <p className="text-xs text-surface-500 max-w-xl">
            Define standard material assemblies (recipes) to automatically calculate required sub-materials when pushing takeoff items to the BOQ.
          </p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="px-6 py-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-accent transition-all shadow-md"
        >
          {isCreating ? "Cancel" : "New Assembly"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateAssembly} className="bg-surface-50 p-8 rounded-2xl border border-surface-200 shadow-sm space-y-6">
          <h3 className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] border-l-4 border-accent pl-3">Create Standard Recipe</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-surface-500 uppercase">Item Code (Matches Takeoff)</label>
              <input required type="text" value={formData.item_code} onChange={e => setFormData({...formData, item_code: e.target.value})} className="w-full h-11 px-4 border border-surface-200 rounded-lg text-sm" placeholder="e.g. WALL_150" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-surface-500 uppercase">Description</label>
              <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full h-11 px-4 border border-surface-200 rounded-lg text-sm" placeholder="150mm Block Wall" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-surface-500 uppercase">Unit</label>
              <input required type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full h-11 px-4 border border-surface-200 rounded-lg text-sm" placeholder="sqm" />
            </div>
          </div>
          <button type="submit" className="h-11 px-6 bg-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-lg">Save Assembly</button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <label className="text-[10px] font-bold uppercase text-surface-400 tracking-widest ml-2">Available Assemblies</label>
          {assemblies.map(assembly => (
            <div 
              key={assembly.id} 
              onClick={() => setSelectedAssembly(assembly)}
              className={`p-5 border rounded-xl cursor-pointer transition-all ${
                selectedAssembly?.id === assembly.id 
                ? "bg-primary text-white border-primary shadow-lg scale-[1.02]" 
                : "bg-white border-surface-200 hover:border-accent"
              }`}
            >
              <h4 className="font-bold text-sm">{assembly.item_code}</h4>
              <p className={`text-xs mt-1 ${selectedAssembly?.id === assembly.id ? "text-white/80" : "text-surface-500"}`}>{assembly.description}</p>
              <p className={`text-[10px] font-mono mt-2 ${selectedAssembly?.id === assembly.id ? "text-accent" : "text-surface-400"}`}>Per 1 {assembly.unit}</p>
            </div>
          ))}
          {assemblies.length === 0 && (
            <div className="p-8 text-center bg-surface-50 border border-dashed rounded-xl text-surface-400 text-xs">No assemblies found.</div>
          )}
        </div>

        {selectedAssembly && (
          <div className="lg:col-span-2 bg-white border border-surface-200 rounded-2xl p-8 space-y-8 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex gap-6">
                {selectedAssembly.image ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-surface-200 group cursor-pointer shadow-sm" onClick={() => setLightboxOpen(true)}>
                    <img src={selectedAssembly.image} alt={selectedAssembly.item_code} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-bold uppercase tracking-widest">View</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl border border-dashed border-surface-300 bg-surface-50 flex items-center justify-center text-surface-400 text-[10px] font-bold uppercase tracking-widest text-center p-2">
                    No Image
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-primary">{selectedAssembly.description} ({selectedAssembly.item_code})</h3>
                  <p className="text-sm text-surface-500 mt-1 mb-4">Components required per 1 {selectedAssembly.unit}</p>
                  
                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-[10px] bg-surface-100 hover:bg-surface-200 text-surface-700 px-4 py-2 rounded-lg font-bold uppercase tracking-widest transition-colors disabled:opacity-50 shadow-sm border border-surface-200">
                      {isUploading ? "Uploading..." : selectedAssembly.image ? "Replace Image" : "Upload Image"}
                    </button>
                    {selectedAssembly.image && (
                      <button onClick={handleRemoveImage} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold uppercase tracking-widest transition-colors shadow-sm border border-red-100">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => handleDeleteAssembly(selectedAssembly.id)} className="text-[10px] uppercase tracking-widest text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg font-bold transition-colors">Delete</button>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase text-surface-400 tracking-widest">Recipe Components</h4>
              <div className="border border-surface-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-50 text-[10px] uppercase tracking-widest text-surface-500">
                    <tr>
                      <th className="p-4 font-bold">Material Code</th>
                      <th className="p-4 font-bold">Description</th>
                      <th className="p-4 font-bold text-right">Qty/Unit</th>
                      <th className="p-4 font-bold text-right">Unit Rate</th>
                      <th className="p-4 font-bold">Waste %</th>
                      <th className="p-4 font-bold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {selectedAssembly.components?.map(comp => (
                      <tr key={comp.id} className="hover:bg-surface-50">
                        <td className="p-4 font-mono text-primary font-bold">{comp.material_code}</td>
                        <td className="p-4 text-surface-600">{comp.description}</td>
                        <td className="p-4 text-right font-bold">{comp.quantity_per_unit} {comp.unit}</td>
                        <td className="p-4 text-right font-bold">₹{comp.default_unit_rate}</td>
                        <td className="p-4 text-surface-500">{comp.waste_percentage}%</td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteComponent(comp.id)} className="text-red-400 hover:text-red-600">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!selectedAssembly.components || selectedAssembly.components.length === 0) && (
                      <tr><td colSpan={6} className="p-6 text-center text-surface-400 text-xs italic">No components added yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <form onSubmit={handleAddComponent} className="bg-surface-50 p-6 rounded-xl border border-surface-200 space-y-4">
              <h5 className="text-[10px] font-bold uppercase text-primary tracking-widest">Add Component</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input required type="text" placeholder="Mat Code (e.g. BRK)" value={compData.material_code} onChange={e => setCompData({...compData, material_code: e.target.value})} className="h-10 px-3 border border-surface-200 rounded text-xs" />
                <input required type="text" placeholder="Description" value={compData.description} onChange={e => setCompData({...compData, description: e.target.value})} className="h-10 px-3 border border-surface-200 rounded text-xs" />
                <input required type="number" step="0.01" placeholder="Qty per unit" value={compData.quantity_per_unit} onChange={e => setCompData({...compData, quantity_per_unit: e.target.value})} className="h-10 px-3 border border-surface-200 rounded text-xs" />
                <input required type="text" placeholder="Unit (e.g. nos)" value={compData.unit} onChange={e => setCompData({...compData, unit: e.target.value})} className="h-10 px-3 border border-surface-200 rounded text-xs" />
                <input required type="number" step="0.01" placeholder="Default Unit Rate" value={compData.default_unit_rate} onChange={e => setCompData({...compData, default_unit_rate: e.target.value})} className="h-10 px-3 border border-surface-200 rounded text-xs" />
                <input required type="number" step="0.01" placeholder="Waste %" value={compData.waste_percentage} onChange={e => setCompData({...compData, waste_percentage: e.target.value})} className="h-10 px-3 border border-surface-200 rounded text-xs" />
              </div>
              <button type="submit" className="h-10 px-6 bg-primary text-white text-[10px] font-bold uppercase rounded hover:bg-accent transition-colors">Add Component</button>
            </form>
          </div>
        )}
      </div>

      {lightboxOpen && selectedAssembly?.image && (
        <ImageLightbox 
          src={selectedAssembly.image} 
          alt={selectedAssembly.item_code} 
          onClose={() => setLightboxOpen(false)} 
        />
      )}
    </div>
  );
}
