"use client";

import React, { useState, useEffect } from 'react';
import { portfoliosApi, PortfolioItem } from '@/domains/portfolios/api';
import { PortfolioCard } from '@/shared/components/PortfolioCard';

const CATEGORIES = [
  { label: "All Categories", value: "" },
  { label: "Architects", value: "architect" },
  { label: "Contractors", value: "contractor" },
  { label: "Suppliers", value: "supplier" },
  { label: "Interior Designers", value: "designer" },
];

export default function PublicPortfoliosPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    city: "",
    q: ""
  });

  useEffect(() => {
    fetchPortfolios();
  }, [filters.category, filters.city]);

  const fetchPortfolios = async () => {
    setIsLoading(true);
    try {
      const data = await portfoliosApi.searchPublicPortfolios(filters);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPortfolios();
  };

  return (
    <div className="min-h-screen bg-surface-50 pt-32 pb-20 px-6">
      <div className="max-w-[1400px] mx-auto space-y-12">
        {/* Header Section */}
        <div className="max-w-3xl space-y-6">
          <h1 className="text-5xl font-bold text-primary tracking-tight leading-tight">
            Discover Exceptional <span className="text-accent italic">Architectural Talent</span>
          </h1>
          <p className="text-lg text-surface-500 leading-relaxed">
            Browse through a curated collection of professional portfolios. Filter by expertise, location, and project type to find the perfect partner for your next endeavor.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-3xl border border-surface-200 shadow-xl shadow-primary/5 flex flex-col md:flex-row gap-4 items-center">
          <form onSubmit={handleSearch} className="flex-1 w-full relative">
            <input 
              type="text" 
              placeholder="Search projects, names, or keywords..."
              className="w-full h-14 pl-14 pr-6 bg-surface-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-accent/20 transition-all text-primary font-medium"
              value={filters.q}
              onChange={(e) => setFilters({...filters, q: e.target.value})}
            />
            <svg className="w-6 h-6 absolute left-5 top-4 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          <div className="flex w-full md:w-auto gap-4">
            <select 
              className="h-14 px-6 bg-surface-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-accent/20 text-sm font-bold text-primary uppercase tracking-widest cursor-pointer"
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <input 
              type="text" 
              placeholder="City/Location"
              className="h-14 px-6 bg-surface-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-accent/20 text-sm font-bold text-primary uppercase tracking-widest"
              value={filters.city}
              onChange={(e) => setFilters({...filters, city: e.target.value})}
            />

            <button 
              onClick={fetchPortfolios}
              className="h-14 px-8 bg-primary text-white rounded-2xl font-bold uppercase text-[11px] tracking-[0.2em] hover:bg-accent transition-all shadow-lg shadow-primary/20"
            >
              Search
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="aspect-[16/12] bg-white rounded-3xl border border-surface-100 animate-pulse" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {items.map(item => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="py-32 text-center space-y-6">
            <div className="w-24 h-24 bg-surface-100 rounded-3xl mx-auto flex items-center justify-center text-surface-200">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.022.547l-2.387 2.387a2 2 0 002.828 2.828l2.387-2.387a2 2 0 011.022-.547l2.387-.477a6 6 0 013.86-.517l.318-.158a6 6 0 003.86-.517L16.05 15.21a2 2 0 011.022.547l2.387 2.387a2 2 0 002.828-2.828l-2.387-2.387z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-primary">No professional work found</h3>
              <p className="text-surface-500">Try adjusting your filters or search terms to broaden your results.</p>
            </div>
            <button 
              onClick={() => setFilters({category: "", city: "", q: ""})}
              className="text-sm font-bold text-accent uppercase tracking-widest border-b-2 border-accent/20 hover:border-accent"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
