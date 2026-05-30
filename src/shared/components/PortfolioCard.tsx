import React from 'react';
import Link from 'next/link';
import { portfoliosApi, PortfolioItem } from '@/domains/portfolios/api';

import { LeadGenerationModal } from './LeadGenerationModal';

interface PortfolioCardProps {
  item: PortfolioItem;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ item }) => {
  const [showLeadModal, setShowLeadModal] = React.useState(false);
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
    <div className="group bg-white border border-surface-200 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:border-accent/30 transition-all duration-500 flex flex-col">
      <Link href={`/portfolio/${item.id}`} className="block aspect-[16/10] relative overflow-hidden">
        <img 
          src={item.image} 
          alt={item.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
        
        <button 
          onClick={handleToggleSave}
          disabled={isSaving}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition-all shadow-sm z-10"
        >
          <svg className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div className="space-y-1">
            <span className="px-2 py-1 bg-accent text-white text-[8px] font-bold uppercase tracking-widest rounded shadow-sm">
              {item.user?.category || 'Professional'}
            </span>
            <h3 className="text-white font-bold text-sm leading-tight drop-shadow-md">{item.title}</h3>
          </div>
          <div className="flex items-center gap-1 text-white/80 text-[10px] font-bold tracking-wider">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {item.views_count || 0}
          </div>
        </div>
      </Link>
      
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <p className="text-surface-500 text-xs leading-relaxed line-clamp-2">
          {item.description || 'No project specification provided.'}
        </p>
        
        <div className="pt-4 border-t border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
              {item.user?.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-primary truncate max-w-[100px]">{item.user?.name}</span>
              <span className="text-[9px] text-surface-400 uppercase tracking-tighter">
                {item.user?.city ? `${item.user.city}, ${item.user.country}` : 'Global'}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => setShowLeadModal(true)}
              className="px-3 py-1.5 bg-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-primary transition-all shadow-lg shadow-accent/20"
            >
              Express Interest
            </button>
            <Link href={`/portfolio/${item.id}`} className="text-[10px] font-bold text-surface-400 uppercase tracking-widest hover:text-accent transition-all">
              Details
            </Link>
          </div>
        </div>
      </div>

      <LeadGenerationModal 
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        professionalName={item.user.name}
        professionalId={item.user.uid}
        portfolioItemId={item.id}
        portfolioItemTitle={item.title}
      />
    </div>
  );
};
