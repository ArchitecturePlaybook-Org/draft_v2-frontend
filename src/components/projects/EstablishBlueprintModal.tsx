import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { projectsApi } from '@/domains/projects/api';
import { authApi } from '@/domains/auth/api';
import { orgsApi } from '@/domains/orgs/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, CheckCircle2, User, X, Sparkles, ArrowRight } from 'lucide-react';
import { SpecializationMultiSelect } from '@/components/ui/SpecializationMultiSelect';

interface EstablishBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdProject?: any) => void;
  orgs?: { id: number; name: string; account_type?: string }[];
  initialData?: {
    title?: string;
    description?: string;
    preset_slug?: string;
    kind?: string;
    account_id?: string | number;
    specialization_ids?: number[];
  };
}

export const EstablishBlueprintModal: React.FC<EstablishBlueprintModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orgs,
  initialData
}) => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [internalOrgs, setInternalOrgs] = useState<{ id: number; name: string; account_type?: string }[]>(orgs || []);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  const [projectCodeMode, setProjectCodeMode] = useState<'auto' | 'manual'>('auto');

  const [presets, setPresets] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    account_id: initialData?.account_id ? String(initialData.account_id) : '',
    project_code: '',
    kind: initialData?.kind || 'Residential',
    location: '',
    description: initialData?.description || '',
    client_name: '',
    client_phone: '',
    client_email: '',
    specialization_ids: (initialData?.specialization_ids || []) as number[],
    preset_slug: initialData?.preset_slug || '',
  });

  React.useEffect(() => {
    if (orgs && orgs.length > 0) {
      setInternalOrgs(orgs);
    } else if (isOpen) {
      orgsApi.listOrgs().then(data => {
        const list = Array.isArray(data) ? data : (data as any).results || [];
        setInternalOrgs(list);
      }).catch(console.error);
    }
  }, [isOpen, orgs]);

  React.useEffect(() => {
    if (isOpen) {
      authApi.getSpecializations().then(setSpecializations).catch(console.error);
      projectsApi.getProjectPresets().then(setPresets).catch(console.error);
      setTemplatesLoading(true);
      Promise.allSettled([
        projectsApi.getTemplateLibrary({ tab: 'mine', sort: '-created_at' }),
        projectsApi.getTemplateLibrary({ tab: 'saved', sort: '-created_at' }),
      ]).then(([mine, saved]) => {
        const mineList = mine.status === 'fulfilled'
          ? (Array.isArray(mine.value) ? mine.value : (mine.value as any)?.results ?? [])
          : [];
        const savedList = saved.status === 'fulfilled'
          ? (Array.isArray(saved.value) ? saved.value : (saved.value as any)?.results ?? [])
          : [];
        const seen = new Set<string>();
        const all = [...mineList, ...savedList].filter(t => {
          if (seen.has(t.uid)) return false;
          seen.add(t.uid);
          return true;
        });
        setTemplates(all);
      }).catch(console.error).finally(() => setTemplatesLoading(false));

      const fallbackOrgId = initialData?.account_id
        ? String(initialData.account_id)
        : (orgs?.[0]?.id ? String(orgs[0].id) : (internalOrgs?.[0]?.id ? String(internalOrgs[0].id) : ''));

      setFormData(prev => ({
        ...prev,
        title: initialData?.title || '',
        description: initialData?.description || '',
        preset_slug: initialData?.preset_slug || '',
        kind: initialData?.kind || 'Residential',
        specialization_ids: initialData?.specialization_ids || [],
        account_id: fallbackOrgId || prev.account_id,
      }));
      setStep(1);
      setCreatedProject(null);
    }
  }, [isOpen, initialData]);

  React.useEffect(() => {
    if (internalOrgs.length > 0 && !formData.account_id) {
      setFormData(prev => ({ ...prev, account_id: String(internalOrgs[0].id) }));
    }
  }, [internalOrgs, formData.account_id]);

  if (!isOpen) return null;

  const selectedOrg = internalOrgs.find(o => o.id === parseInt(formData.account_id));
  const orgPart = selectedOrg ? selectedOrg.name.substring(0, 3).toUpperCase().padEnd(3, 'X') : 'ORG';
  const kindPart = formData.kind ? formData.kind.substring(0, 3).toUpperCase().padEnd(3, 'X') : 'GEN';
  const clientPart = formData.client_name ? formData.client_name.substring(0, 3).toUpperCase().padEnd(3, 'X') : 'NON';
  const autoPrefix = `${orgPart}-${kindPart}-${clientPart}-AUTO`;
  const manualPrefix = `${orgPart}-${kindPart}-`;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const finalProjectCode = projectCodeMode === 'manual' ? `${manualPrefix}${formData.project_code}` : undefined;
      
      let resProject: any = null;
      if (selectedTemplate) {
        resProject = await projectsApi.createProjectFromTemplate(selectedTemplate.uid, {
          title: formData.title,
          account_id: parseInt(formData.account_id),
          description: formData.description,
          kind: formData.kind,
          location: formData.location,
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
          specialization_ids: formData.specialization_ids,
        });
      } else {
        resProject = await projectsApi.createProject({
          title: formData.title,
          description: formData.description,
          account_id: parseInt(formData.account_id),
          project_code: finalProjectCode,
          kind: formData.kind,
          location: formData.location,
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
          specialization_ids: formData.specialization_ids,
          preset_slug: formData.preset_slug,
        });
      }
      setCreatedProject(resProject);
      setStep(4);
    } catch (err) {
      const error = err as { message?: string };
      const msg = error.message || "Submission failed. Please check required fields.";
      alert(`Submission failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.title.trim() !== '' && formData.account_id !== '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-hidden">
      {/* Modal Dialog Shell */}
      <div 
        className="relative w-full max-w-5xl max-h-[85vh] bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden z-10 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Left Sidebar (Desktop: Vertical Sidebar, Mobile: Top Banner) */}
        <div className="md:w-64 bg-accent text-white p-4 sm:p-6 shrink-0 flex flex-row md:flex-col justify-between items-center md:items-start border-b md:border-b-0 md:border-r border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0">
              🏗️
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight tracking-tight">Establish Blueprint</h2>
              <p className="text-white/80 text-[10px] uppercase font-bold tracking-wider hidden sm:block">Initialization Wizard</p>
            </div>
          </div>

          {/* Step Progress Indicators */}
          <div className="hidden md:flex flex-col space-y-4 my-6 w-full">
            {[
              { num: 1, label: "Project Details" },
              { num: 2, label: "Client Contact" },
              { num: 3, label: "Review & Submit" }
            ].map((item) => (
              <div key={item.num} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === item.num ? 'bg-white text-accent shadow-md scale-105' : 
                  step > item.num ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50 border border-white/20'
                }`}>
                  {step > item.num ? <CheckCircle2 size={13} className="text-white" /> : item.num}
                </div>
                <span className={`text-xs font-bold tracking-wide ${
                  step === item.num ? 'text-white' : 'text-white/70'
                }`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile Step Counter Pill */}
          <div className="md:hidden text-xs font-black bg-white/20 px-3 py-1 rounded-full text-white">
            Step {Math.min(step, 3)} of 3
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-surface-50 dark:bg-surface-900">
          
          {/* Header Bar */}
          <div className="p-4 border-b border-surface-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-surface-100/60 dark:bg-surface-800/40">
            <div>
              <h3 className="text-sm font-bold text-primary">
                {step === 1 ? 'Step 1: Project Parameters' : step === 2 ? 'Step 2: Client & Contact Info' : step === 3 ? 'Step 3: Final Review' : 'Blueprint Created'}
              </h3>
              <p className="text-[11px] text-surface-500 font-medium">Fill required details to set up new blueprint</p>
            </div>
            
            {step !== 4 && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-surface-200/80 hover:bg-surface-300 text-surface-600 flex items-center justify-center font-bold text-xs transition-all"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Form Body Viewport (SCROLLABLE CONTAINER) */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 min-h-0">
            
            {step === 1 && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Project Title *</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Nexus Tower Renovation"
                    className="w-full h-10 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-3 text-xs font-semibold text-primary outline-none focus:border-accent"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Entity / Organization *</label>
                  <select 
                    className="w-full h-10 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-3 text-xs font-semibold text-primary dark:text-white outline-none focus:border-accent"
                    value={formData.account_id}
                    onChange={(e) => setFormData({...formData, account_id: e.target.value})}
                  >
                    <option value="" disabled className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Select Firm / Tenant...</option>
                    {internalOrgs.map(org => (
                      <option key={org.id} value={org.id} className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">{org.name} ({org.account_type})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Project Code</label>
                      <div className="flex items-center bg-surface-200 dark:bg-surface-800 rounded-lg p-0.5">
                        <button 
                          onClick={() => setProjectCodeMode('auto')}
                          className={`px-2 py-0.5 text-[9px] font-bold rounded ${projectCodeMode === 'auto' ? 'bg-primary text-background shadow-xs' : 'text-surface-500'}`}
                        >Auto</button>
                        <button 
                          onClick={() => setProjectCodeMode('manual')}
                          className={`px-2 py-0.5 text-[9px] font-bold rounded ${projectCodeMode === 'manual' ? 'bg-primary text-background shadow-xs' : 'text-surface-500'}`}
                        >Manual</button>
                      </div>
                    </div>
                    {projectCodeMode === 'auto' ? (
                      <div className="w-full h-10 bg-surface-200/50 border border-surface-200 dark:border-white/5 rounded-xl px-3 flex items-center text-surface-500 font-mono text-xs truncate">{autoPrefix}</div>
                    ) : (
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-surface-400 font-mono text-xs">{manualPrefix}</span>
                        <input 
                          type="text" 
                          className="w-full h-10 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl pl-[85px] pr-3 text-primary dark:text-white font-mono text-xs outline-none focus:border-accent"
                          value={formData.project_code}
                          onChange={(e) => setFormData({...formData, project_code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')})}
                          placeholder="CODE"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Asset Kind</label>
                    <select 
                      className="w-full h-10 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-3 text-xs font-semibold text-primary dark:text-white outline-none focus:border-accent"
                      value={formData.kind}
                      onChange={(e) => setFormData({...formData, kind: e.target.value})}
                    >
                      <option className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Residential</option>
                      <option className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Commercial</option>
                      <option className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Renovation</option>
                      <option className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Industrial</option>
                      <option className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Infrastructure</option>
                    </select>
                  </div>
                </div>

                {/* ── Unified Template / QA/QC Preset Selector (Optional) ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                      Start from Template / Preset (Optional)
                    </label>
                    {(formData.preset_slug || selectedTemplate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, preset_slug: '' });
                          setSelectedTemplate(null);
                        }}
                        className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
                      >
                        ✕ Start Blank (Clear)
                      </button>
                    )}
                  </div>

                  {/* Preset / Template Choices Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-44 overflow-y-auto pr-1">
                    {/* Blank Project Option */}
                    <div
                      onClick={() => {
                        setFormData({ ...formData, preset_slug: '' });
                        setSelectedTemplate(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                        !formData.preset_slug && !selectedTemplate
                          ? 'bg-accent/15 border-accent text-foreground ring-1 ring-accent/30 font-bold'
                          : 'bg-surface-100 dark:bg-surface-800/50 border-surface-200 dark:border-white/10 hover:border-surface-300'
                      }`}
                    >
                      <span className="text-base">✨</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">Blank Project</p>
                        <p className="text-[9px] text-surface-500 font-semibold truncate">No preset or template</p>
                      </div>
                    </div>

                    {/* QA/QC Matrix Presets */}
                    {presets.length > 0 ? (
                      presets.map((p) => {
                        const isSelected = formData.preset_slug === p.slug && !selectedTemplate;
                        return (
                          <div
                            key={p.id || p.slug}
                            onClick={() => {
                              setFormData({ ...formData, preset_slug: p.slug });
                              setSelectedTemplate(null);
                            }}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                              isSelected
                                ? 'bg-purple-500/15 border-purple-500 text-foreground ring-1 ring-purple-500/30 font-bold'
                                : 'bg-surface-100 dark:bg-surface-800/50 border-surface-200 dark:border-white/10 hover:border-surface-300'
                            }`}
                          >
                            <span className="text-base">{p.icon_emoji || '⚡'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                              <p className="text-[9px] text-purple-500 font-semibold truncate">QA/QC Preset · {p.category || '6 Stages'}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : null}

                    {/* Saved Templates */}
                    {templatesLoading ? (
                      <div className="col-span-full py-2 text-center text-[10px] text-surface-400">Loading templates...</div>
                    ) : (
                      templates.map((t) => {
                        const isSelected = selectedTemplate?.uid === t.uid;
                        return (
                          <div
                            key={t.uid}
                            onClick={() => {
                              setSelectedTemplate(t);
                              setFormData({ ...formData, preset_slug: '' });
                            }}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                              isSelected
                                ? 'bg-accent/15 border-accent text-foreground ring-1 ring-accent/30 font-bold'
                                : 'bg-surface-100 dark:bg-surface-800/50 border-surface-200 dark:border-white/10 hover:border-surface-300'
                            }`}
                          >
                            <span className="text-base">📋</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{t.title}</p>
                              <p className="text-[9px] text-surface-500 font-semibold truncate">{t.template_category || 'Saved Template'}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Project Location</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Bangalore, KA"
                    className="w-full h-10 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-3 text-xs font-semibold text-primary outline-none focus:border-accent"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Brief description of the architectural project..."
                    className="w-full bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl p-3 text-xs font-semibold text-primary outline-none focus:border-accent resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Required Specializations</label>
                  <SpecializationMultiSelect 
                    specializations={specializations}
                    selectedIds={formData.specialization_ids}
                    onChange={(ids) => setFormData({...formData, specialization_ids: ids})}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Client Full Name</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Rahul Sharma"
                    className="w-full h-10 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-3 text-xs font-semibold text-primary outline-none focus:border-accent"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Client Phone</label>
                  <input 
                    type="text" 
                    placeholder="E.g. +91 98765 43210"
                    className="w-full h-10 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-3 text-xs font-semibold text-primary outline-none focus:border-accent"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Client Email</label>
                  <input 
                    type="email" 
                    placeholder="E.g. client@example.com"
                    className="w-full h-10 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-3 text-xs font-semibold text-primary outline-none focus:border-accent"
                    value={formData.client_email}
                    onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-surface-100 p-3 rounded-xl border border-surface-200 space-y-2">
                  <h4 className="font-bold text-accent uppercase text-[10px] tracking-wider">Project Specification</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-surface-400 font-bold">Title:</span> <p className="font-bold text-primary truncate">{formData.title}</p></div>
                    <div><span className="text-surface-400 font-bold">Code:</span> <p className="font-bold font-mono text-primary">{projectCodeMode === 'auto' ? autoPrefix : `${manualPrefix}${formData.project_code}`}</p></div>
                    <div><span className="text-surface-400 font-bold">Kind:</span> <p className="font-bold text-primary">{formData.kind}</p></div>
                    <div><span className="text-surface-400 font-bold">Location:</span> <p className="font-bold text-primary">{formData.location || '-'}</p></div>
                  </div>
                </div>

                <div className="bg-surface-100 p-3 rounded-xl border border-surface-200 space-y-2">
                  <h4 className="font-bold text-blue-600 uppercase text-[10px] tracking-wider">Client Identity</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-surface-400 font-bold">Client:</span> <p className="font-bold text-primary">{formData.client_name || '-'}</p></div>
                    <div><span className="text-surface-400 font-bold">Phone:</span> <p className="font-bold text-primary">{formData.client_phone || '-'}</p></div>
                    <div className="col-span-2"><span className="text-surface-400 font-bold">Email:</span> <p className="font-bold text-primary">{formData.client_email || '-'}</p></div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-md">
                  ✓
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-black text-primary">Blueprint Established!</h3>
                  <p className="text-xs text-surface-500 font-medium">
                    {createdProject?.title ? `Project "${createdProject.title}" initialized successfully.` : "Project has been initialized in your registry."}
                  </p>
                  {formData.preset_slug && (
                    <span className="inline-block mt-1 px-3 py-1 bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px] font-black uppercase rounded-full">
                      ⚡ QA/QC Preset Matrix Applied
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Footer Action Buttons Bar (FIXED AT BOTTOM OF FORM AREA) */}
          <div className="p-4 border-t border-surface-200 dark:border-white/10 bg-surface-100/60 dark:bg-surface-800/40 flex items-center justify-between shrink-0">
            {step === 1 && (
              <Button 
                onClick={() => setStep(2)} 
                disabled={!isStep1Valid} 
                className="w-full h-10 bg-accent hover:bg-accent/90 text-background font-black text-xs uppercase tracking-wider rounded-xl shadow-sm"
              >
                Continue to Client Details →
              </Button>
            )}

            {step === 2 && (
              <div className="flex items-center justify-between w-full gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)} 
                  className="h-10 px-5 font-bold text-xs uppercase rounded-xl border-surface-300"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  className="h-10 px-6 bg-accent hover:bg-accent/90 text-background font-black text-xs uppercase tracking-wider rounded-xl shadow-sm"
                >
                  Review Details →
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="flex items-center justify-between w-full gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(2)} 
                  className="h-10 px-5 font-bold text-xs uppercase rounded-xl border-surface-300"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="h-10 px-6 bg-accent hover:bg-accent/90 text-background font-black text-xs uppercase tracking-wider rounded-xl shadow-sm"
                >
                  {isSubmitting ? 'Establishing...' : 'Confirm & Establish Blueprint'}
                </Button>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2.5">
                <Button 
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onSuccess?.(createdProject);
                  }} 
                  className="w-full sm:w-auto h-10 px-5 font-bold text-xs uppercase rounded-xl border-surface-300"
                >
                  Return to Registry
                </Button>
                <Button 
                  onClick={() => {
                    onClose();
                    onSuccess?.(createdProject);
                    const targetUid = createdProject?.uid || (createdProject?.id ? String(createdProject.id) : '');
                    if (targetUid) {
                      router.push(`/dashboard/projects/${targetUid}`);
                    } else {
                      router.push('/dashboard/projects');
                    }
                  }} 
                  className="w-full sm:w-auto h-10 px-6 bg-accent hover:bg-accent/90 text-background font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Open Project Blueprint →</span>
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
