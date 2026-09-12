"use client";

import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useCustomItemsStore } from '@/domains/infralens-boq/custom-items';

interface CustomSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSectionCreated?: (sectionName: string) => void;
}

export const CustomSectionModal: React.FC<CustomSectionModalProps> = ({
  isOpen,
  onClose,
  onSectionCreated
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { addCustomSection } = useCustomItemsStore();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Section name is required.');
      return;
    }

    const success = addCustomSection(trimmed);
    if (!success) {
      setError('A section with this name already exists.');
      return;
    }

    if (onSectionCreated) {
      onSectionCreated(trimmed);
    }

    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-surface-card border border-surface-200 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-surface-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground">Create New Section</h3>
              <p className="text-[11px] text-text-secondary">Group your custom items into a new category</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
              Section / Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Solar & EV Infrastructure, Luxury Finishes"
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground outline-none focus:border-accent"
            />
            {error && <p className="text-[11px] font-bold text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-foreground border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-accent to-accent-hover text-background text-xs font-black rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer"
            >
              Create Section
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
