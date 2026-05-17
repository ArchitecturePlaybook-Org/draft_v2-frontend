import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { leadsApi } from '@/domains/leads/api';

interface LeadGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionalName: string;
  professionalId: string;
  portfolioItemId?: number;
  portfolioItemTitle?: string;
}

export const LeadGenerationModal: React.FC<LeadGenerationModalProps> = ({
  isOpen,
  onClose,
  professionalName,
  professionalId,
  portfolioItemId,
  portfolioItemTitle
}) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    projectType: 'Residential',
    timeline: '3-6 Months',
    budget: '$50k - $100k',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await leadsApi.createLead({
        professional: professionalId,
        portfolio_item: portfolioItemId,
        message: formData.message,
        metadata: {
          project_type: formData.projectType,
          timeline: formData.timeline,
          budget_range: formData.budget
        }
      });
      setStep(3); // Success step
    } catch (err: any) {
      const msg = err.message || "System failure. Please ensure you are logged in.";
      alert(`Submission failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/20 flex flex-col md:flex-row min-h-[500px]">
        {/* Left Side: Visual/Context */}
        <div className="w-full md:w-1/3 bg-primary p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10 space-y-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">🤝</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold leading-tight">Collaborate with {professionalName.split(' ')[0]}</h2>
              <p className="text-white/60 text-xs uppercase tracking-widest font-bold">Industrial Synergy Initialized</p>
            </div>
          </div>
          
          <div className="relative z-10 space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Contextual Source</p>
              <p className="text-sm font-bold truncate">{portfolioItemTitle || "General Inquiry"}</p>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-accent' : 'bg-white/20'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-10 flex flex-col justify-center relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-50 flex items-center justify-center text-surface-400 hover:text-primary transition-all hover:rotate-90"
          >
            ✕
          </button>

          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-primary">Define the Scope</h3>
                <p className="text-sm text-surface-500">Help the professional understand the nature of your project.</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Project Type</label>
                    <select 
                      value={formData.projectType}
                      onChange={e => setFormData({...formData, projectType: e.target.value})}
                      className="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-sm font-bold"
                    >
                      <option>Residential</option>
                      <option>Commercial</option>
                      <option>Industrial</option>
                      <option>Interior</option>
                      <option>Landscape</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Timeline</label>
                    <select 
                      value={formData.timeline}
                      onChange={e => setFormData({...formData, timeline: e.target.value})}
                      className="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-sm font-bold"
                    >
                      <option>Immediate</option>
                      <option>1-3 Months</option>
                      <option>3-6 Months</option>
                      <option>6+ Months</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Estimated Budget Range</label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {['<$10k', '$10k-$50k', '$50k-$100k', '$100k+'].map(b => (
                      <button
                        key={b}
                        onClick={() => setFormData({...formData, budget: b})}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                          formData.budget === b 
                          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                          : 'bg-surface-50 text-surface-400 border border-surface-100 hover:border-accent'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="w-full h-14 uppercase tracking-[0.2em] font-bold text-xs">
                Continue to Brief
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-primary">Finalize the Brief</h3>
                <p className="text-sm text-surface-500">Provide specific details or unique requirements for this collaboration.</p>
              </div>

              <div className="space-y-4">
                <textarea 
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full h-40 p-5 bg-surface-50 border border-surface-200 rounded-2xl outline-none focus:border-accent text-sm font-medium resize-none"
                  placeholder="Tell us about your vision, site constraints, or architectural preferences..."
                />
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="h-14 px-8 font-bold text-[10px] uppercase tracking-widest">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 h-14 uppercase tracking-[0.2em] font-bold text-xs">
                  {isSubmitting ? "Transmitting..." : "Send Opportunity"}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-green-500 text-white rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-2xl shadow-green-500/20">
                ✓
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-primary">Inquiry Synchronized</h3>
                <p className="text-sm text-surface-500 max-w-xs mx-auto">Your interest has been successfully transmitted to {professionalName}. They will review your brief in their dashboard.</p>
              </div>
              <Button onClick={onClose} variant="outline" className="h-12 px-10 uppercase tracking-widest font-bold text-[10px]">
                Close Pipeline
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
