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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    category: "",
    city: "",
    country: "",
    q: "",
    sort: "recent"
  });

  useEffect(() => {
    setCurrentPage(1);
    fetchPortfolios(1);
  }, [filters.category, filters.city, filters.country, filters.sort]);

  useEffect(() => {
    fetchPortfolios(currentPage);
  }, [currentPage]);

  const fetchPortfolios = async (page: number) => {
    setIsLoading(true);
    try {
      const data = await portfoliosApi.searchPublicPortfolios({ ...filters, page });
      setItems(data.results);
      setTotalPages(Math.ceil(data.count / 12));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPortfolios(1);
  };



  return (
    <div className="min-h-screen bg-surface-50 pt-32 pb-20 px-6 relative overflow-hidden">
      <div className="absolute inset-0 arch-grid opacity-[0.03] pointer-events-none" />
      <div className="max-w-[1400px] mx-auto space-y-12 relative z-10">
        {/* Header Section */}
        <div className="max-w-3xl space-y-6 animate-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-5xl font-bold text-primary tracking-tight leading-tight">
            Discover Exceptional <span className="bg-gradient-to-r from-accent to-accent/60 bg-clip-text text-transparent italic">Architectural Talent</span>
          </h1>
          <p className="text-lg text-surface-500 leading-relaxed font-medium">
            Browse through a curated collection of professional portfolios. Filter by expertise, location, and project type to find the perfect partner for your next endeavor.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-surface-100/40 backdrop-blur-2xl p-4 rounded-3xl border border-surface-200/50 shadow-xl shadow-primary/5 flex flex-col md:flex-row gap-4 items-center focus-within:shadow-[0_0_30px_rgba(255,186,8,0.15)] transition-shadow duration-500 animate-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          <form onSubmit={handleSearch} className="flex-1 w-full relative">
            <input 
              type="text" 
              placeholder="Search projects, names, or keywords..."
              className="w-full h-14 pl-14 pr-6 bg-surface-50/50 backdrop-blur-sm border border-transparent rounded-2xl outline-none focus:bg-surface-50 focus:border-accent/30 focus:ring-4 focus:ring-accent/10 transition-all text-primary font-bold placeholder:font-medium placeholder:text-surface-400"
              value={filters.q}
              onChange={(e) => setFilters({...filters, q: e.target.value})}
            />
            <svg className="w-6 h-6 absolute left-5 top-4 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          <div className="flex w-full md:w-auto gap-3">
            <select 
              className="h-14 px-6 bg-surface-50/50 backdrop-blur-sm border border-transparent rounded-2xl outline-none focus:bg-surface-50 focus:border-accent/30 focus:ring-4 focus:ring-accent/10 transition-all text-[11px] font-bold text-primary uppercase tracking-widest cursor-pointer appearance-none pr-10 relative"
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%23A1A1AA"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select 
              className="h-14 px-6 bg-surface-50/50 backdrop-blur-sm border border-transparent rounded-2xl outline-none focus:bg-surface-50 focus:border-accent/30 focus:ring-4 focus:ring-accent/10 transition-all text-[11px] font-bold text-primary uppercase tracking-widest cursor-pointer appearance-none pr-10 relative"
              value={filters.sort}
              onChange={(e) => setFilters({...filters, sort: e.target.value})}
              style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%23A1A1AA"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
            </select>

            <input 
              type="text" 
              placeholder="City"
              className="h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-transparent rounded-2xl outline-none focus:bg-surface-50 focus:border-accent/30 focus:ring-4 focus:ring-accent/10 transition-all text-[11px] font-bold text-primary uppercase tracking-widest w-28 placeholder:text-surface-400"
              value={filters.city}
              onChange={(e) => setFilters({...filters, city: e.target.value})}
            />

            <input 
              type="text" 
              placeholder="Country"
              className="h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-transparent rounded-2xl outline-none focus:bg-surface-50 focus:border-accent/30 focus:ring-4 focus:ring-accent/10 transition-all text-[11px] font-bold text-primary uppercase tracking-widest w-32 placeholder:text-surface-400"
              value={filters.country}
              onChange={(e) => setFilters({...filters, country: e.target.value})}
            />

            <button 
              onClick={handleSearch}
              className="h-14 px-8 bg-accent text-background rounded-2xl font-bold uppercase text-[11px] tracking-[0.2em] hover:bg-accent transition-all shadow-lg shadow-primary/20"
            >
              Search
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="aspect-[16/12] bg-surface-100 rounded-3xl border border-surface-100 animate-pulse" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {items.map(item => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-8 border-t border-surface-200">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-surface-50 text-surface-500 hover:opacity-90 hover:text-white disabled:opacity-50 disabled:hover:bg-surface-50 disabled:hover:text-surface-500 transition-all"
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-primary uppercase tracking-widest">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-surface-50 text-surface-500 hover:opacity-90 hover:text-white disabled:opacity-50 disabled:hover:bg-surface-50 disabled:hover:text-surface-500 transition-all"
                >
                  Next
                </button>
              </div>
            )}
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
              onClick={() => {
                setFilters({category: "", city: "", country: "", q: "", sort: "recent"});
                setCurrentPage(1);
              }}
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
