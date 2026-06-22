import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { projectsApi } from '@/domains/projects/api';

interface EstablishBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgs: any[];
  initialData?: { title: string; description: string };
}

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
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  const [projectCodeMode, setProjectCodeMode] = useState<'auto' | 'manual'>('auto');

  React.useEffect(() => {
    if (isOpen) {
      projectsApi.getTemplates().then(data => {
        setTemplates(Array.isArray(data) ? data : (data as any).results || []);
      }).catch(console.error);
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
      
      if (selectedTemplateId) {
        const cloned = await projectsApi.cloneProject(selectedTemplateId, parseInt(formData.account_id));
        await projectsApi.updateProject(cloned.uid, {
          title: formData.title,
          description: formData.description,
          project_code: finalProjectCode,
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
      setStep(4); // Success step
    } catch (err: any) {
      const msg = err.message || "System failure. Please ensure you are logged in.";
      alert(`Submission failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.title.trim() !== '' && formData.account_id !== '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/20 flex flex-col md:flex-row min-h-[600px]">
        {/* Left Side: Visual/Context */}
        <div className="w-full md:w-1/3 bg-primary p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10 space-y-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">🏗️</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold leading-tight">Establish Blueprint</h2>
              <p className="text-white/60 text-xs uppercase tracking-widest font-bold">Project Initialization</p>
            </div>
          </div>
          
          <div className="relative z-10 space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-accent' : 'bg-white/20'}`} />
                <p className={`text-xs font-bold ${step >= 1 ? 'text-white' : 'text-white/40'}`}>1. Project Details</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-accent' : 'bg-white/20'}`} />
                <p className={`text-xs font-bold ${step >= 2 ? 'text-white' : 'text-white/40'}`}>2. Client Contact</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-accent' : 'bg-white/20'}`} />
                <p className={`text-xs font-bold ${step >= 3 ? 'text-white' : 'text-white/40'}`}>3. Review & Submit</p>
              </div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-accent' : 'bg-white/20'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-10 flex flex-col relative overflow-y-auto max-h-[90vh]">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-50 flex items-center justify-center text-surface-400 hover:text-primary transition-all hover:rotate-90 z-10"
          >
            ✕
          </button>

          <div className="flex-1 flex flex-col justify-center">
            {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary">Project Details</h3>
                  <p className="text-sm text-surface-500">Define the core parameters of your new architectural project.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Project Title *</label>
                    <input 
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-medium text-sm" 
                      placeholder="e.g. Neo-Gothic Skyscraper Extension"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Map to Professional Entity *</label>
                    <select 
                      value={formData.account_id}
                      onChange={e => setFormData({...formData, account_id: e.target.value})}
                      className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary appearance-none"
                    >
                      <option value="" disabled>Select Firm / Tenant...</option>
                      {orgs.map(org => (
                        <option key={org.id} value={org.id}>{org.name} ({org.account_type})</option>
                      ))}
                    </select>
                  </div>

                  {templates.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Start from Template (Optional)</label>
                      <select 
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-medium text-sm appearance-none"
                      >
                        <option value="">Blank Project</option>
                        {templates.map(tmpl => (
                          <option key={tmpl.uid} value={tmpl.uid}>{tmpl.title} ({tmpl.template_scope})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Project Code</label>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-xs flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={projectCodeMode === 'auto'} onChange={() => setProjectCodeMode('auto')} />
                          Auto-generated
                        </label>
                        <label className="text-xs flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={projectCodeMode === 'manual'} onChange={() => setProjectCodeMode('manual')} />
                          Manual Entry
                        </label>
                      </div>
                      <div className="flex w-full">
                        {projectCodeMode === 'manual' && (
                          <div className="flex items-center justify-center bg-surface-100 border border-surface-200 border-r-0 rounded-l-xl px-3 text-xs font-bold text-surface-500">
                            {manualPrefix}
                          </div>
                        )}
                        <input 
                          type="text" 
                          disabled={projectCodeMode === 'auto'}
                          value={projectCodeMode === 'auto' ? '' : formData.project_code}
                          onChange={e => setFormData({...formData, project_code: e.target.value.toUpperCase()})}
                          className={`w-full h-12 bg-surface-50 border border-surface-200 px-4 ${projectCodeMode === 'manual' ? 'rounded-r-xl' : 'rounded-xl'} outline-none focus:border-accent font-medium text-sm disabled:opacity-50`} 
                          placeholder={projectCodeMode === 'auto' ? autoPrefix : "CLIENT-001"}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Kind of Project</label>
                      <select 
                        value={formData.kind}
                        onChange={e => setFormData({...formData, kind: e.target.value})}
                        className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-medium text-sm appearance-none"
                      >
                        <option>Residential</option>
                        <option>Commercial</option>
                        <option>Renovation</option>
                        <option>Master Planning</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Location of the Project</label>
                    <input 
                      type="text" 
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-medium text-sm" 
                      placeholder="e.g. 123 Architecture Ave, New York"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full h-24 bg-surface-50 border border-surface-200 p-4 rounded-xl outline-none focus:border-accent font-medium text-sm resize-none" 
                      placeholder="Detailed context regarding the project..."
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={() => setStep(2)} disabled={!isStep1Valid} className="h-12 px-8 uppercase tracking-[0.2em] font-bold text-xs">
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary">Client Contact</h3>
                  <p className="text-sm text-surface-500">Who is the primary contact for this project?</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Client Name</label>
                    <input 
                      type="text" 
                      value={formData.client_name}
                      onChange={e => setFormData({...formData, client_name: e.target.value})}
                      className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-medium text-sm" 
                      placeholder="Enter client or company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Client Phone Number</label>
                    <input 
                      type="tel" 
                      value={formData.client_phone}
                      onChange={e => setFormData({...formData, client_phone: e.target.value})}
                      className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-medium text-sm" 
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Client Email</label>
                    <input 
                      type="email" 
                      value={formData.client_email}
                      onChange={e => setFormData({...formData, client_email: e.target.value})}
                      className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-medium text-sm" 
                      placeholder="client@example.com"
                    />
                  </div>
                </div>

                <div className="pt-8 flex gap-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-8 font-bold text-[10px] uppercase tracking-widest">
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1 h-12 uppercase tracking-[0.2em] font-bold text-xs">
                    Review Details
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary">Review & Submit</h3>
                  <p className="text-sm text-surface-500">Please review the details before establishing the blueprint.</p>
                </div>

                <div className="bg-surface-50 p-6 rounded-2xl border border-surface-200 space-y-6 text-sm">
                  <div>
                    <h4 className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2 border-b border-surface-200 pb-1">Project</h4>
                    <div className="grid grid-cols-2 gap-y-2">
                      <span className="text-surface-500">Title:</span> <span className="font-bold">{formData.title}</span>
                      <span className="text-surface-500">Code:</span> <span className="font-bold">{projectCodeMode === 'auto' ? autoPrefix : `${manualPrefix}${formData.project_code}`}</span>
                      <span className="text-surface-500">Kind:</span> <span className="font-bold">{formData.kind}</span>
                      <span className="text-surface-500">Location:</span> <span className="font-bold">{formData.location || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2 border-b border-surface-200 pb-1">Client</h4>
                    <div className="grid grid-cols-2 gap-y-2">
                      <span className="text-surface-500">Name:</span> <span className="font-bold">{formData.client_name || '-'}</span>
                      <span className="text-surface-500">Phone:</span> <span className="font-bold">{formData.client_phone || '-'}</span>
                      <span className="text-surface-500">Email:</span> <span className="font-bold">{formData.client_email || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="h-12 px-8 font-bold text-[10px] uppercase tracking-widest">
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 h-12 uppercase tracking-[0.2em] font-bold text-xs bg-accent hover:bg-accent/90 text-white border-none">
                    {isSubmitting ? "Initializing..." : "Confirm & Create Project"}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-6 animate-in zoom-in-95 duration-500 py-10">
                <div className="w-20 h-20 bg-green-500 text-white rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-2xl shadow-green-500/20">
                  ✓
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-primary">Blueprint Established</h3>
                  <p className="text-sm text-surface-500 max-w-xs mx-auto">Your new project has been successfully initialized in the registry.</p>
                </div>
                <Button 
                  onClick={() => {
                    onClose();
                    onSuccess();
                  }} 
                  variant="outline" 
                  className="h-12 px-10 uppercase tracking-widest font-bold text-[10px]"
                >
                  Return to Registry
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
