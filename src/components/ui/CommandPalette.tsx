"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { useQuery } from "@tanstack/react-query";

interface SearchResult {
  type: "project" | "task" | "zone" | "system";
  id: string | number;
  uid: string;
  title: string;
  subtitle: string;
  url: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { isOpen, setIsOpen, toggle } = useCommandPaletteStore();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Toggle on Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, toggle, setIsOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setSelectedIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // React Query for Search
  const { data: results = [], isLoading: loading } = useQuery<SearchResult[]>({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const res = await fetch(`/api/v1/projects/search/?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: isOpen && !!debouncedQuery.trim(),
    staleTime: 1000 * 60 * 5, // Cache search results for 5 mins
  });

  // Handle keyboard navigation within results
  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          setIsOpen(false);
          router.push(selected.url);
        }
      }
    };

    window.addEventListener("keydown", handleNavigation);
    return () => window.removeEventListener("keydown", handleNavigation);
  }, [isOpen, results, selectedIndex, router, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-md transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 shadow-2xl rounded-xl overflow-hidden transform transition-all"
      >
        <div className="flex items-center px-4 py-4 border-b border-neutral-800">
          <svg className="w-5 h-5 text-neutral-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            className="w-full bg-transparent text-neutral-100 placeholder-neutral-500 focus:outline-none text-lg"
            placeholder="Search projects, tasks, or jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-neutral-600 border-t-neutral-300 animate-spin" />
          )}
          <div className="ml-2 px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-950 text-neutral-500 text-xs font-mono">
            ESC
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() && results.length === 0 && !loading && (
            <div className="p-8 text-center text-neutral-500">
              No results found for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((result, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(result.url);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "bg-neutral-800 text-white" : "text-neutral-300 hover:bg-neutral-800/50"
                    }`}
                  >
                    <div className="flex-shrink-0 mr-4">
                      {result.type === 'project' && (
                        <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                      )}
                      {result.type === 'task' && (
                        <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </div>
                      )}
                      {result.type === 'zone' && (
                        <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                        </div>
                      )}
                      {result.type === 'system' && (
                        <div className="w-8 h-8 rounded bg-orange-500/10 text-orange-400 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-100 truncate">
                        {result.title}
                      </div>
                      <div className="text-xs text-neutral-500 truncate">
                        {result.subtitle}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0 text-neutral-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center"><span className="px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 mr-1.5 font-mono">↑</span><span className="px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 mr-1.5 font-mono">↓</span> Navigate</span>
            <span className="flex items-center"><span className="px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 mr-1.5 font-mono">↵</span> Select</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 font-mono">Cmd</span>
            <span>+</span>
            <span className="px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 font-mono">K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
