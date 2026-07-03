import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { projectsApi } from '@/domains/projects/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, CheckCircle2, User, X } from 'lucide-react';

interface EstablishBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgs: any[];
  initialData?: { title: string; description: string };
}

const stepVariants = {
  hidden: { x: 20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { 
      type: "spring" as const, 
      stiffness: 300, 
      damping: 30, 
      staggerChildren: 0.1, 
      delayChildren: 0.1 
    }
  },
  exit: {
    x: -20,
    opacity: 0,
    transition: { ease: "easeInOut" as const, duration: 0.2 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export const EstablishBlueprintModal: React.FC<EstablishBlueprintModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orgs,
  initialData
}) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  const [projectCodeMode, setProjectCodeMode] = useState<'auto' | 'manual'>('auto');

  React.useEffect(() => {
    if (isOpen) {
      setTemplatesLoading(true);
      // Fetch both user's own templates and saved ones
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
        // Deduplicate by uid
        const seen = new Set<string>();
        const all = [...mineList, ...savedList].filter(t => {
          if (seen.has(t.uid)) return false;
          seen.add(t.uid);
          return true;
        });
        setTemplates(all);
      }).catch(console.error).finally(() => setTemplatesLoading(false));
    }
  }, [isOpen]);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    account_id: '',
    project_code: '',
    kind: 'Residential',
    location: '',
    description: initialData?.description || '',
    client_name: '',
    client_phone: '',
    client_email: ''
  });

  if (!isOpen) return null;

  const handleSetStep = (newStep: number) => {
    setStep(newStep);
  };

  const selectedOrg = orgs.find(o => o.id === parseInt(formData.account_id));
  const orgPart = selectedOrg ? selectedOrg.name.substring(0, 3).toUpperCase().padEnd(3, 'X') : 'ORG';
  const kindPart = formData.kind ? formData.kind.substring(0, 3).toUpperCase().padEnd(3, 'X') : 'GEN';
  const clientPart = formData.client_name ? formData.client_name.substring(0, 3).toUpperCase().padEnd(3, 'X') : 'NON';
  const autoPrefix = `${orgPart}-${kindPart}-${clientPart}-AUTO`;
  const manualPrefix = `${orgPart}-${kindPart}-`;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const finalProjectCode = projectCodeMode === 'manual' ? `${manualPrefix}${formData.project_code}` : undefined;
      
      if (selectedTemplate) {
        // Use the new template API: creates project from template via deep clone
        await projectsApi.createProjectFromTemplate(selectedTemplate.uid, {
          title: formData.title,
          account_id: parseInt(formData.account_id),
          description: formData.description,
          kind: formData.kind,
          location: formData.location,
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
        });
      } else {
        await projectsApi.createProject({
          title: formData.title,
          description: formData.description,
          account_id: parseInt(formData.account_id),
          project_code: finalProjectCode,
          kind: formData.kind,
          location: formData.location,
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
        });
      }
      handleSetStep(4); // Success step
    } catch (err: any) {
      const msg = err.message || "System failure. Please ensure you are logged in.";
      alert(`Submission failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.title.trim() !== '' && formData.account_id !== '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Heavy Blur Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Glowing Ambient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-[600px] h-[600px] bg-accent/20 rounded-full blur-[100px] mix-blend-screen absolute -translate-x-1/2 translate-y-1/4" 
        />
        <motion.div 
          animate={{ rotate: -360, scale: [1, 1.5, 1] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px] mix-blend-screen absolute translate-x-1/3 -translate-y-1/3" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-background/90 backdrop-blur-2xl border border-surface-200 dark:border-white/10 w-full max-w-5xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[95vh] md:h-[75vh] md:max-h-[750px] md:min-h-[600px] relative z-10"
      >
        {/* Left Side: Solid Gold Section */}
        <div className="w-full md:w-2/5 bg-accent text-white flex flex-col justify-between relative overflow-hidden p-8 border-r border-white/10 z-20 shrink-0">
          <div className="absolute -left-10 -bottom-10 text-[200px] font-black text-black/5 leading-none pointer-events-none select-none">
            0{Math.min(step, 3)}
          </div>

          <div className="relative z-10 space-y-8">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:rotate-6 transition-transform duration-500">
              🏗️
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black leading-tight text-white tracking-tight">Establish<br/><span className="text-white">Blueprint</span></h2>
              <p className="text-white/70 text-xs uppercase tracking-widest font-bold">Project Initialization</p>
            </div>
          </div>
          
          <div className="relative z-10 space-y-6 mt-12">
            <div className="space-y-5">
              {[
                { num: 1, label: "Project Details" },
                { num: 2, label: "Client Contact" },
                { num: 3, label: "Review & Submit" }
              ].map((item) => (
                <div key={item.num} className="flex items-center gap-4 group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 relative ${
                    step === item.num ? 'bg-white text-accent shadow-[0_0_20px_rgba(255,255,255,0.5)] scale-110' : 
                    step > item.num ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50 border border-white/20'
                  }`}>
                    {step > item.num ? <CheckCircle2 size={14} className="text-white" /> : item.num}
                    {step === item.num && (
                      <motion.div
                        layoutId="activeStepRing"
                        className="absolute inset-0 rounded-full border-2 border-white"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{ padding: '4px', margin: '-4px' }}
                      />
                    )}
                  </div>
                  <p className={`text-sm font-bold tracking-wide transition-colors duration-300 ${
                    step === item.num ? 'text-white' : step > item.num ? 'text-white/90' : 'text-white/60'
                  }`}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Form with Framer Motion AnimatePresence */}
        <div className="flex-1 p-6 md:p-10 flex flex-col relative overflow-hidden bg-surface-50/50">
          {step !== 4 && (
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-100/80 border border-surface-200 flex items-center justify-center text-surface-400 hover:text-primary transition-all z-50 shadow-sm"
            >
              <X size={14} />
            </button>
          )}

          <div className="flex-1 relative flex flex-col overflow-y-auto no-scrollbar pt-6 pb-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4 h-full flex flex-col"
                >
                  <motion.div variants={itemVariants} className="space-y-1">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Project Title</label>
                    <input 
                      type="text" 
                      placeholder="E.g. Nexus Tower Renovation"
                      className="w-full h-11 bg-surface-100/50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 rounded-xl px-4 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-inner"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-1">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Entity / Organization</label>
                    <select 
                      className="w-full h-11 bg-surface-100/50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 rounded-xl px-4 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-inner appearance-none cursor-pointer"
                      value={formData.account_id}
                      onChange={(e) => setFormData({...formData, account_id: e.target.value})}
                    >
                      <option value="" disabled>Select Firm / Tenant...</option>
                      {orgs.map(org => (
                        <option key={org.id} value={org.id}>{org.name} ({org.account_type})</option>
                      ))}
                    </select>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-4">
                    <motion.div variants={itemVariants} className="space-y-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Project Code</label>
                        <div className="flex items-center bg-surface-200/50 dark:bg-surface-800 rounded-full p-0.5">
                          <button 
                            onClick={() => setProjectCodeMode('auto')}
                            className={`px-3 py-1 text-[10px] uppercase font-black rounded-full transition-all ${projectCodeMode === 'auto' ? 'bg-surface-900 text-white shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}
                          >Auto</button>
                          <button 
                            onClick={() => setProjectCodeMode('manual')}
                            className={`px-3 py-1 text-[10px] uppercase font-black rounded-full transition-all ${projectCodeMode === 'manual' ? 'bg-surface-900 text-white shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}
                          >Manual</button>
                        </div>
                      </div>
                      {projectCodeMode === 'auto' ? (
                        <div className="w-full h-11 bg-surface-100/30 dark:bg-surface-900/30 border border-surface-200 dark:border-white/5 rounded-xl px-4 flex items-center text-surface-500 dark:text-white/50 font-mono text-sm">{autoPrefix}</div>
                      ) : (
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-surface-400 font-mono text-sm">{manualPrefix}</span>
                          <input 
                            type="text" 
                            className="w-full h-11 bg-surface-100/50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 rounded-xl pl-[100px] pr-4 text-surface-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-inner"
                            value={formData.project_code}
                            onChange={(e) => setFormData({...formData, project_code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')})}
                            placeholder="CODE"
                          />
                        </div>
                      )}
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-1">
                      <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Asset Kind</label>
                      <select 
                        className="w-full h-11 bg-surface-100/50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 rounded-xl px-4 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-inner appearance-none cursor-pointer"
                        value={formData.kind}
                        onChange={(e) => setFormData({...formData, kind: e.target.value})}
                      >
                        <option>Residential</option>
                        <option>Commercial</option>
                        <option>Renovation</option>
                      </select>
                    </motion.div>
                  </div>

                  <motion.div variants={itemVariants} className="space-y-1">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Site Location</label>
                    <input 
                      type="text" 
                      placeholder="City, Region, or Coordinates"
                      className="w-full h-11 bg-surface-100/50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 rounded-xl px-4 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-inner"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-1">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Scope & Description</label>
                    <textarea 
                      placeholder="Briefly describe the architectural objective..."
                      className="w-full h-20 bg-surface-100/50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 rounded-xl p-4 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-inner resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </motion.div>

                  {/* Template Picker */}
                  <motion.div variants={itemVariants} className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Start from Template</label>
                      {selectedTemplate && (
                        <button
                          onClick={() => setSelectedTemplate(null)}
                          className="text-[10px] font-bold text-red-500 hover:underline"
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>

                    {selectedTemplate ? (
                      <div className="w-full flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3">
                        <span className="text-base">📋</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-foreground truncate">{selectedTemplate.title}</p>
                          <p className="text-[10px] text-surface-400 font-bold">{selectedTemplate.template_category} · {selectedTemplate.task_count} tasks</p>
                        </div>
                        <button
                          onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                          className="text-[11px] font-black text-accent hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                        className="w-full flex items-center gap-3 bg-surface-100/50 border border-dashed border-surface-300 rounded-xl px-4 py-3 hover:border-accent/40 hover:bg-accent/5 transition-all group"
                      >
                        <span className="text-base opacity-50 group-hover:opacity-100">📋</span>
                        <span className="text-sm text-surface-400 font-medium group-hover:text-foreground">
                          {templatesLoading ? 'Loading templates...' : templates.length > 0 ? 'Apply a template (optional)' : 'No templates in your library'}
                        </span>
                        {templates.length > 0 && (
                          <span className="ml-auto text-[11px] font-bold text-accent">Browse →</span>
                        )}
                      </button>
                    )}

                    {/* Inline Template Selector */}
                    <AnimatePresence>
                      {showTemplateSelector && templates.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 max-h-56 overflow-y-auto space-y-2 pr-1">
                            {templates.map(t => (
                              <button
                                key={t.uid}
                                onClick={() => { setSelectedTemplate(t); setShowTemplateSelector(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                                  selectedTemplate?.uid === t.uid
                                    ? 'border-accent bg-accent/10'
                                    : 'border-surface-200 hover:border-accent/30 hover:bg-surface-50'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-lg bg-surface-200/50 border border-surface-200 flex items-center justify-center shrink-0 text-lg">
                                  📋
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black text-foreground truncate">{t.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {t.template_category && (
                                      <span className="text-[10px] font-bold text-primary">{t.template_category}</span>
                                    )}
                                    <span className="text-[10px] text-surface-400">📌 {t.task_count} tasks</span>
                                    {t.avg_rating > 0 && (
                                      <span className="text-[10px] text-surface-400">⭐ {t.avg_rating.toFixed(1)}</span>
                                    )}
                                  </div>
                                </div>
                                {selectedTemplate?.uid === t.uid && (
                                  <span className="text-accent font-black text-lg shrink-0">✓</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <Button onClick={() => handleSetStep(2)} disabled={!isStep1Valid} className="w-full h-12 uppercase tracking-[0.2em] font-bold text-xs bg-accent hover:bg-accent/90 text-white rounded-xl shadow-lg">
                      Continue
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4 h-full flex flex-col"
                >
                  <motion.div variants={itemVariants} className="space-y-1">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Client / Owner Name</label>
                    <input 
                      type="text" 
                      placeholder="Name of the primary stakeholder"
                      className="w-full h-11 bg-surface-100/50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 rounded-xl px-4 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-inner"
                      value={formData.client_name}
                      onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-1">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Contact Phone</label>
                    <input 
                      type="text" 
                      placeholder="+1 (555) 000-0000"
                      className="w-full h-11 bg-surface-100/50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 rounded-xl px-4 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-inner"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-1">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="contact@client.com"
                      className="w-full h-11 bg-surface-100/50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 rounded-xl px-4 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-inner"
                      value={formData.client_email}
                      onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-4 flex gap-4 mt-auto">
                    <Button variant="outline" onClick={() => handleSetStep(1)} className="h-12 px-8 font-bold text-[10px] uppercase tracking-widest rounded-xl">
                      Back
                    </Button>
                    <Button onClick={() => handleSetStep(3)} className="flex-1 h-12 uppercase tracking-[0.2em] font-bold text-xs shadow-xl shadow-accent/20 hover:shadow-accent/40 rounded-xl bg-accent hover:bg-accent/90 text-white">
                      Review Details
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4 h-full flex flex-col"
                >
                  <motion.div variants={itemVariants} className="space-y-2 text-center pb-2">
                    <h3 className="text-2xl font-black text-primary tracking-tight">Review & Submit</h3>
                    <p className="text-sm font-medium text-surface-500">Please review the details before establishing the blueprint.</p>
                  </motion.div>

                  <motion.div variants={itemVariants} className="bg-surface-100/80 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-sm space-y-6 text-sm">
                    <div className="relative">
                      <h4 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Building2 size={12} /> Project Core Parameters
                      </h4>
                      <div className="grid grid-cols-2 gap-y-3 text-sm bg-background/50 p-4 rounded-xl border border-surface-200">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Title</span>
                          <span className="font-bold text-primary">{formData.title}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Code</span>
                          <span className="font-bold text-primary font-mono bg-surface-200/50 px-2 py-0.5 rounded-md w-fit">{projectCodeMode === 'auto' ? autoPrefix : `${manualPrefix}${formData.project_code}`}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Kind</span>
                          <span className="font-bold text-primary">{formData.kind}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Location</span>
                          <span className="font-bold text-primary">{formData.location || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <h4 className="text-[10px] font-black text-info uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User size={12} /> Client Identity
                      </h4>
                      <div className="grid grid-cols-2 gap-y-3 text-sm bg-background/50 p-4 rounded-xl border border-surface-200">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Name</span>
                          <span className="font-bold text-primary">{formData.client_name || '-'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Contact</span>
                          <span className="font-bold text-primary">{formData.client_phone || '-'}</span>
                        </div>
                        <div className="flex flex-col gap-1 col-span-2">
                          <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Email</span>
                          <span className="font-bold text-primary">{formData.client_email || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-4 flex gap-4 mt-auto">
                    <Button variant="outline" onClick={() => handleSetStep(2)} className="h-12 px-8 font-bold text-[10px] uppercase tracking-widest rounded-xl">
                      Back
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 h-12 uppercase tracking-[0.2em] font-bold text-xs bg-accent hover:bg-accent/90 text-white border-none shadow-xl shadow-accent/20 rounded-xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      <span className="relative">{isSubmitting ? "Initializing..." : "Confirm & Create Project"}</span>
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-center space-y-8 flex flex-col items-center justify-center h-full py-10"
                >
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                    className="w-32 h-32 bg-success text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-success/40 relative"
                  >
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }} 
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-success rounded-[2.5rem] blur-xl -z-10"
                    />
                    <CheckCircle2 size={64} strokeWidth={3} />
                  </motion.div>
                  
                  <div className="space-y-3">
                    <motion.h3 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-success to-primary tracking-tight"
                    >
                      Blueprint Established
                    </motion.h3>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-sm font-bold text-surface-500 max-w-sm mx-auto"
                    >
                      Your new architectural project has been successfully initialized in the registry and is ready for execution.
                    </motion.p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Button 
                      onClick={() => {
                        onClose();
                        onSuccess();
                      }} 
                      variant="primary" 
                      className="h-14 px-12 uppercase tracking-[0.2em] font-bold text-xs shadow-xl shadow-primary/20 rounded-2xl"
                    >
                      Return to Registry
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
