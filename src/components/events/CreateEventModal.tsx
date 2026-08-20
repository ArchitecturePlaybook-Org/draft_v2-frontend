import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { eventsApi } from "@/domains/events/api";
import { Spinner } from "@/components/ui/Spinner";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<"meeting" | "deadline" | "field">("meeting");
  const [eventDate, setEventDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !eventDate) {
      setError("Please fill out all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      await eventsApi.createEvent({
        title,
        event_type: eventType,
        event_date: eventDate,
      });
      onSuccess();
      setTitle("");
      setEventDate("");
      setEventType("meeting");
    } catch (err: any) {
      setError(err?.message || "Failed to create event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-surface-100 border border-surface-200 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 bg-surface-50/50">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2 tracking-tight">
            <span className="text-accent">📅</span> New Event
          </h2>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-surface-200 text-surface-400 hover:text-primary transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form id="create-event-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1.5">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Client Presentation, Site Visit, etc."
                required
                className="w-full bg-surface-50 border border-surface-200 text-primary text-sm rounded-lg p-2.5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1.5">
                Event Type <span className="text-red-500">*</span>
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as any)}
                required
                className="w-full bg-surface-50 border border-surface-200 text-primary text-sm rounded-lg p-2.5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              >
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="field">Field Work / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full bg-surface-50 border border-surface-200 text-primary text-sm rounded-lg p-2.5 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all custom-calendar-icon"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-200 bg-surface-50/50 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-bold uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="create-event-form"
            variant="primary"
            disabled={isSubmitting}
            className="text-xs font-bold uppercase tracking-widest min-w-[120px]"
          >
            {isSubmitting ? <Spinner size="sm" label="" /> : "Save Event"}
          </Button>
        </div>
        
      </div>
    </div>
  );
}
