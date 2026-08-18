"use client";

import React, { useState, useEffect } from 'react';
import { portfoliosApi, PortfolioItem } from '@/domains/portfolios/api';
import { PortfolioCard } from '@/shared/components/PortfolioCard';
import { LeadGenerationModal } from '@/shared/components/LeadGenerationModal';

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
  
  // Page-level single Modal state
  const [selectedLeadItem, setSelectedLeadItem] = useState<PortfolioItem | null>(null);

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
    <div className="min-h-screen bg-surface-50 pt-24 sm:pt-28 pb-20 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 arch-grid opacity-[0.03] pointer-events-none" />
      <div className="max-w-[1280px] mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        <div className="max-w-3xl space-y-3 animate-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-primary tracking-tight leading-tight">
            Discover Exceptional <span className="bg-gradient-to-r from-accent to-amber-500 bg-clip-text text-transparent italic">Architectural Portfolios</span>
          </h1>
          <p className="text-sm sm:text-base text-surface-500 leading-relaxed font-medium">
            Browse curated project blueprints, 3D renderings, and completed site operations. Express interest to initiate collaboration directly with lead architects.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-surface-100/90 backdrop-blur-2xl p-4 rounded-2xl border border-surface-200 shadow-md flex flex-col md:flex-row gap-3 items-center">
          <form onSubmit={handleSearch} className="flex-1 w-full relative">
            <input 
              type="text" 
              placeholder="Search projects, titles, or keywords..."
              className="w-full h-11 pl-11 pr-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent/40 text-xs sm:text-sm font-bold text-primary placeholder:font-normal placeholder:text-surface-400"
              value={filters.q}
              onChange={(e) => setFilters({...filters, q: e.target.value})}
            />
            <svg className="w-5 h-5 absolute left-3.5 top-3 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          <div className="flex flex-wrap w-full md:w-auto gap-2 items-center">
            <select 
              className="h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-primary uppercase tracking-wider cursor-pointer outline-none focus:border-accent"
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select 
              className="h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-primary uppercase tracking-wider cursor-pointer outline-none focus:border-accent"
              value={filters.sort}
              onChange={(e) => setFilters({...filters, sort: e.target.value})}
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
            </select>

            <input 
              type="text" 
              placeholder="City"
              className="h-11 px-3.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-primary uppercase tracking-wider w-24 placeholder:text-surface-400 outline-none focus:border-accent"
              value={filters.city}
              onChange={(e) => setFilters({...filters, city: e.target.value})}
            />

            <button 
              onClick={handleSearch}
              className="h-11 px-5 bg-accent text-background rounded-xl font-bold uppercase text-xs tracking-wider hover:opacity-90 transition-all shadow-sm"
            >
              Search
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="aspect-[16/12] bg-surface-100 rounded-2xl border border-surface-200 animate-pulse" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map(item => (
                <PortfolioCard
                  key={item.id}
                  item={item}
                  onExpressInterest={(targetItem) => setSelectedLeadItem(targetItem)}
                />
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-6 border-t border-surface-200">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider bg-surface-100 text-surface-600 hover:bg-surface-200 disabled:opacity-50 transition-all"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider bg-surface-100 text-surface-600 hover:bg-surface-200 disabled:opacity-50 transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center space-y-4 bg-surface-100/60 rounded-3xl border border-surface-200 p-8">
            <div className="text-4xl">🏛️</div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-primary">No professional work found</h3>
              <p className="text-xs text-surface-500">Try adjusting your filters or search terms to broaden results.</p>
            </div>
            <button 
              onClick={() => {
                setFilters({category: "", city: "", country: "", q: "", sort: "recent"});
                setCurrentPage(1);
              }}
              className="text-xs font-bold text-accent uppercase tracking-wider hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

      </div>

      {/* Page-level Global Lead Generation Modal (Rendered outside card loop) */}
      {selectedLeadItem && (
        <LeadGenerationModal
          isOpen={Boolean(selectedLeadItem)}
          onClose={() => setSelectedLeadItem(null)}
          professionalName={selectedLeadItem.user.name}
          professionalId={selectedLeadItem.user.uid}
          portfolioItemId={selectedLeadItem.id}
          portfolioItemTitle={selectedLeadItem.title}
        />
      )}
    </div>
  );
}
