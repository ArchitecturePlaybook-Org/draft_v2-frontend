"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, X, Search, Tag, Filter } from "lucide-react";

export interface SpecializationItem {
  id: number;
  name: string;
  category_id?: number;
  category_name?: string;
  category?: any;
}

interface SpecializationMultiSelectProps {
  specializations: SpecializationItem[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const SpecializationMultiSelect: React.FC<SpecializationMultiSelectProps> = ({
  specializations = [],
  selectedIds = [],
  onChange,
  placeholder = "Select project specializations...",
  label = "Project Specializations",
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Selected items objects
  const selectedItems = useMemo(() => {
    return specializations.filter((s) => selectedIds.includes(s.id));
  }, [specializations, selectedIds]);

  // Filtered specializations by search query
  const filteredSpecializations = useMemo(() => {
    if (!searchQuery.trim()) return specializations;
    const query = searchQuery.toLowerCase();
    return specializations.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.category_name && s.category_name.toLowerCase().includes(query)) ||
        (typeof s.category === "string" && s.category.toLowerCase().includes(query))
    );
  }, [specializations, searchQuery]);

  // Group filtered items by category if available
  const groupedSpecializations = useMemo(() => {
    const groups: Record<string, SpecializationItem[]> = {};
    filteredSpecializations.forEach((item) => {
      const categoryName =
        item.category_name ||
        (typeof item.category === "string" ? item.category : item.category?.name) ||
        "General Specializations";
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(item);
    });
    return groups;
  }, [filteredSpecializations]);

  const toggleItem = (id: number) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeItem = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(selectedIds.filter((item) => item !== id));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
            {label}
          </label>
          {selectedIds.length > 0 && (
            <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/20">
              {selectedIds.length} Selected
            </span>
          )}
        </div>
      )}

      {/* Trigger Box */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] bg-surface-50 border rounded-lg px-3 py-2 text-sm cursor-pointer transition-all flex items-center justify-between gap-2 select-none ${
          isOpen
            ? "border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-sm"
            : error
            ? "border-semantic-red"
            : "border-surface-200 hover:border-surface-300"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-surface-100" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {selectedItems.length > 0 ? (
            selectedItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 transition-all hover:bg-[#D4AF37]/25"
              >
                <Tag className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[140px]">{item.name}</span>
                <button
                  type="button"
                  onClick={(e) => removeItem(e, item.id)}
                  className="hover:bg-[#D4AF37]/30 rounded p-0.5 transition-colors text-[#D4AF37]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-text-tertiary text-xs flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 opacity-50" />
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-text-tertiary">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="p-1 hover:bg-surface-200 rounded text-text-tertiary hover:text-text-primary text-xs transition-colors"
              title="Clear all selected"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#D4AF37]" : ""}`}
          />
        </div>
      </div>

      {error && <p className="text-xs text-semantic-red mt-1 font-medium">{error}</p>}

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[100%] mt-1 z-[120] bg-surface-100 border border-surface-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Sticky Search Header */}
          <div className="p-2 border-b border-surface-200 bg-surface-50/80 backdrop-blur-md">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-text-tertiary pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search specializations by name or category..."
                className="w-full bg-surface-100 border border-surface-200 rounded-md pl-9 pr-8 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 p-0.5 hover:bg-surface-200 rounded text-text-tertiary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Actions / Counter */}
            <div className="flex items-center justify-between px-1 pt-2 text-[11px] text-text-tertiary">
              <span>
                Showing {filteredSpecializations.length} of {specializations.length} specializations
              </span>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => clearAll(e)}
                  className="text-xs font-bold text-[#D4AF37] hover:underline"
                >
                  Deselect All ({selectedIds.length})
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar space-y-3">
            {Object.keys(groupedSpecializations).length > 0 ? (
              Object.entries(groupedSpecializations).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#D4AF37] bg-surface-50/60 rounded flex items-center gap-1.5">
                    <Filter className="w-3 h-3 opacity-70" />
                    <span>{category}</span>
                    <span className="text-text-tertiary font-medium">({items.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5 pl-1">
                    {items.map((spec) => {
                      const isSelected = selectedIds.includes(spec.id);
                      return (
                        <div
                          key={spec.id}
                          onClick={() => toggleItem(spec.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                            isSelected
                              ? "bg-[#D4AF37]/15 text-[#D4AF37] font-semibold"
                              : "text-text-primary hover:bg-surface-200/70"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isSelected
                                  ? "bg-[#D4AF37] border-[#D4AF37] text-black"
                                  : "border-surface-300 bg-surface-50"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{spec.name}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37]/20 px-1.5 py-0.5 rounded text-[#D4AF37]">
                              Selected
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-text-tertiary">
                No specializations found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>

          {/* Footer info */}
          <div className="px-3 py-2 bg-surface-50 border-t border-surface-200 flex items-center justify-between text-[11px] text-text-tertiary">
            <span>Click items to select/deselect</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-surface-200 hover:bg-surface-300 text-text-primary rounded font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
