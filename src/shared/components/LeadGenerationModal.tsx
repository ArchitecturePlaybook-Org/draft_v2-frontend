import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { leadsApi } from '@/domains/leads/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Calendar, DollarSign, Send, CheckCircle2, X, MessageSquare, Sparkles } from 'lucide-react';

interface LeadGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionalName: string;
  professionalId: string;
  portfolioItemId?: number;
  portfolioItemTitle?: string;
}

const PROJECT_TYPES = [
  { id: 'Residential', label: 'Residential', icon: '🏠' },
  { id: 'Commercial', label: 'Commercial', icon: '🏢' },
  { id: 'Industrial', label: 'Industrial', icon: '🏗️' },
  { id: 'Interior', label: 'Interior Design', icon: '🛋️' },
  { id: 'Renovation', label: 'Renovation', icon: '🔨' }
];

const TIMELINES = ['Immediate', '1-3 Months', '3-6 Months', '6+ Months'];
const BUDGETS = ['<₹50k', '₹50k-₹2L', '₹2L-₹10L', '₹10L+'];

const QUICK_PROMPTS = [
  "Looking for complete architectural design & blueprint execution.",
  "Need 3D BIM rendering and structural calculation review.",
  "Interested in turnkey interior and master planning consultation."
];

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
    budget: '₹2L-₹10L',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await leadsApi.createLead({
        professional: professionalId,
        portfolio_item: portfolioItemId,
        message: formData.message || `Inquiry regarding ${portfolioItemTitle || 'architectural services'}.`,
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-20 pb-6 px-3 sm:px-4 bg-black/70 backdrop-blur-md overflow-hidden">
      {/* Modal Dialog Shell */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-2xl max-h-[calc(100vh-6rem)] bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden z-10 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side Banner (Desktop: Sidebar, Mobile: Header) */}
        <div className="md:w-64 bg-gradient-to-br from-accent via-amber-500 to-amber-600 text-background p-5 sm:p-6 shrink-0 flex flex-row md:flex-col justify-between items-center md:items-start border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 space-y-3">
            <div className="w-10 h-10 bg-black/10 backdrop-blur-md border border-black/10 rounded-xl flex items-center justify-center text-xl shadow-inner">
              🤝
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-background leading-tight tracking-tight">Express Interest</h2>
              <p className="text-background/80 text-[10px] font-bold uppercase tracking-wider hidden sm:block">Trade Inquiry RFQ</p>
            </div>
          </div>

          <div className="relative z-10 hidden md:block space-y-4 my-6 w-full">
            <div className="p-3 bg-black/10 backdrop-blur-md rounded-xl border border-black/10 text-background">
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Recipient</p>
              <p className="text-xs font-black truncate">{professionalName}</p>
            </div>

            {portfolioItemTitle && (
              <div className="p-3 bg-black/10 backdrop-blur-md rounded-xl border border-black/10 text-background">
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Target Blueprint</p>
                <p className="text-xs font-bold truncate">{portfolioItemTitle}</p>
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-2">
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    step >= i ? 'bg-background shadow-sm' : 'bg-black/20'
                  }`} 
                />
              ))}
            </div>
          </div>

          {/* Mobile step indicator pill */}
          <div className="md:hidden text-xs font-black bg-black/20 px-3 py-1 rounded-full text-background">
            Step {Math.min(step, 3)} of 3
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-surface-50 dark:bg-surface-900">
          
          {/* Top Header */}
          <div className="p-4 border-b border-surface-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-surface-100/60 dark:bg-surface-800/40">
            <div>
              <h3 className="text-sm font-extrabold text-primary tracking-tight">
                {step === 1 ? 'Project Scope & Budget' : step === 2 ? 'Project Brief & Notes' : 'Inquiry Sent'}
              </h3>
              <p className="text-[11px] text-surface-500 font-medium">Connect directly with {professionalName.split(' ')[0]}</p>
            </div>
            
            {step !== 3 && (
              <button 
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-surface-200/80 hover:bg-surface-300 text-surface-600 flex items-center justify-center font-bold text-xs transition-all"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 min-h-0">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-4"
                >
                  {/* Project Type Grid */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 size={13} className="text-accent" /> Project Type
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PROJECT_TYPES.map(pt => (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, projectType: pt.id })}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                            formData.projectType === pt.id 
                              ? 'bg-accent/15 border-accent text-primary font-bold shadow-xs' 
                              : 'bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-white/10 text-surface-600 hover:border-accent/40'
                          }`}
                        >
                          <span className="text-base">{pt.icon}</span>
                          <span className="text-xs truncate">{pt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Pills */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={13} className="text-accent" /> Expected Timeline
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TIMELINES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, timeline: t })}
                          className={`py-2 px-3 rounded-xl text-center text-xs font-bold transition-all ${
                            formData.timeline === t
                              ? 'bg-accent text-background shadow-sm'
                              : 'bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 text-surface-600 hover:border-accent/40'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Budget Range Pills */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign size={13} className="text-accent" /> Estimated Budget
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {BUDGETS.map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setFormData({ ...formData, budget: b })}
                          className={`py-2 px-3 rounded-xl text-center text-xs font-bold transition-all ${
                            formData.budget === b
                              ? 'bg-primary text-background shadow-sm'
                              : 'bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 text-surface-600 hover:border-accent/40'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-accent" /> Project Brief & Requirements
                    </label>
                    <textarea 
                      rows={4}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      className="w-full p-3.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl text-xs font-semibold text-primary outline-none focus:border-accent resize-none placeholder:text-surface-400"
                      placeholder="Share project scope, location, architectural preferences, or specific deliverables..."
                    />
                  </div>

                  {/* Quick Prompts */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} className="text-accent" /> Quick Starters
                    </p>
                    <div className="space-y-1.5">
                      {QUICK_PROMPTS.map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData({ ...formData, message: prompt })}
                          className="w-full text-left p-2.5 bg-surface-100/60 dark:bg-surface-800/40 border border-surface-200 dark:border-white/5 rounded-xl text-[11px] font-medium text-surface-600 hover:border-accent/40 hover:text-primary transition-all"
                        >
                          "{prompt}"
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-5 py-6 flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 size={36} />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-primary tracking-tight">Inquiry Transmitted!</h3>
                    <p className="text-xs text-surface-500 font-medium max-w-xs mx-auto">
                      Your opportunity brief has been sent to <span className="font-bold text-primary">{professionalName}</span>.
                    </p>
                  </div>

                  <div className="p-3 bg-surface-100 border border-surface-200 rounded-xl text-left text-xs max-w-xs w-full space-y-1">
                    <div className="flex justify-between text-[10px] text-surface-400 uppercase font-bold">
                      <span>Type: {formData.projectType}</span>
                      <span>Timeline: {formData.timeline}</span>
                    </div>
                    <p className="font-mono text-[11px] text-accent font-bold">Budget: {formData.budget}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sticky Footer Bar */}
          <div className="p-4 border-t border-surface-200 dark:border-white/10 bg-surface-100/60 dark:bg-surface-800/40 flex items-center justify-between shrink-0">
            {step === 1 && (
              <Button 
                onClick={() => setStep(2)} 
                className="w-full h-11 bg-accent text-background font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm hover:opacity-90"
              >
                Continue to Brief →
              </Button>
            )}

            {step === 2 && (
              <div className="flex items-center justify-between w-full gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)} 
                  className="h-11 px-5 font-bold text-xs uppercase rounded-xl border-surface-300"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="h-11 px-6 bg-accent text-background font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Transmitting...' : 'Submit Inquiry'} <Send size={13} />
                </Button>
              </div>
            )}

            {step === 3 && (
              <Button 
                onClick={onClose} 
                className="w-full h-11 bg-primary text-background font-bold text-xs uppercase rounded-xl"
              >
                Close Pipeline
              </Button>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
};
