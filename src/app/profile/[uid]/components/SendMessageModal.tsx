"use client";

import React, { useState } from 'react';
import { PublicProfile } from '@/domains/users/api';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicProfile;
}

export function SendMessageModal({ isOpen, onClose, profile }: SendMessageModalProps) {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setMessage('');
      setSubject('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-50 w-full max-w-lg rounded-3xl border border-surface-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-surface-100 border-b border-surface-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-primary text-base">Direct Message</h3>
              <p className="text-xs text-surface-500 font-medium">To {profile.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-200 flex items-center justify-center text-surface-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {isSent ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-2xl animate-bounce">
              ✓
            </div>
            <h4 className="text-xl font-bold text-primary">Message Sent!</h4>
            <p className="text-sm text-surface-500 max-w-xs mx-auto">
              Your message has been delivered to {profile.name}. You will be notified when they reply.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-100 border border-surface-200">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-200 shrink-0">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-surface-400">
                    {profile.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary truncate">{profile.name}</p>
                <p className="text-xs text-surface-500 truncate">{profile.category || 'Architectural Specialist'}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-1.5">
                Subject (Optional)
              </label>
              <input
                type="text"
                placeholder="Project inquiry, BIM collaboration, Consultation..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-100 border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:border-accent text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-1.5">
                Message *
              </label>
              <textarea
                rows={5}
                required
                placeholder={`Write your message to ${profile.name}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-4 bg-surface-100 border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:border-accent text-primary resize-none"
              />
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-surface-200">
              <span className="text-[11px] text-surface-400 font-medium flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                InMail Protected
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-surface-200 text-xs font-bold text-surface-600 hover:bg-surface-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  Send Message
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
