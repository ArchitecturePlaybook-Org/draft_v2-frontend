import React from 'react';
import Link from 'next/link';
import { portfoliosApi, PortfolioItem } from '@/domains/portfolios/api';

interface PortfolioCardProps {
  item: PortfolioItem;
  onExpressInterest?: (item: PortfolioItem) => void;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ item, onExpressInterest }) => {
  const [isSaved, setIsSaved] = React.useState(item.is_saved || false);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaving(true);
    try {
      const res = await portfoliosApi.toggleSavePortfolio(item.id);
      setIsSaved(res.is_saved);
    } catch (err) {
      alert("Please login to save portfolios.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="group bg-surface-100 border border-surface-200 rounded-3xl overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(255,186,8,0.2)] hover:border-accent/40 transition-all duration-500 flex flex-col hover:-translate-y-1">
      <Link href={`/portfolio/${item.id}`} className="block aspect-[16/10] relative overflow-hidden bg-surface-200">
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-surface-400 uppercase tracking-widest bg-surface-200">
            Architectural Visual
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80" />
        
        <button 
          onClick={handleToggleSave}
          disabled={isSaving}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-background/30 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-red-500 hover:scale-110 transition-all shadow-md z-10"
          title={isSaved ? "Saved" : "Save Portfolio"}
        >
          <svg className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-1 bg-black/40 backdrop-blur-md border border-white/20 text-accent text-[9px] font-black uppercase tracking-widest rounded-md shadow-sm">
              {item.user?.category || 'Professional'}
            </span>
            <h3 className="text-white font-bold text-sm leading-tight drop-shadow-md group-hover:text-accent transition-colors">
              {item.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-white/90 text-[10px] font-bold tracking-wider">
            <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {item.views_count || 0}
          </div>
        </div>
      </Link>
      
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <p className="text-surface-600 text-xs leading-relaxed line-clamp-2 font-medium">
          {item.description || 'No project specification provided.'}
        </p>
        
        <div className="pt-3 border-t border-surface-200/60 flex items-center justify-between gap-2">
          <Link href={`/profile/${item.user?.uid}`} className="flex items-center gap-2.5 group/author min-w-0">
            <div className="w-7 h-7 rounded-full bg-surface-200 overflow-hidden flex items-center justify-center text-[10px] font-bold text-primary shrink-0 border border-surface-300">
              {item.user?.avatar ? (
                <img src={item.user.avatar} alt={item.user.name} className="w-full h-full object-cover" />
              ) : (
                item.user?.name.charAt(0)
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-primary truncate group-hover/author:text-accent transition-colors">{item.user?.name}</span>
              <span className="text-[9px] text-surface-400 font-semibold truncate">
                {item.user?.city ? `${item.user.city}, ${item.user.country}` : 'Global'}
              </span>
            </div>
          </Link>
          
          <div className="flex gap-2 items-center shrink-0">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onExpressInterest) onExpressInterest(item);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-accent to-accent/90 text-background text-[10px] font-black uppercase tracking-wider rounded-xl hover:shadow-md transition-all"
            >
              Express Interest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
