import React from 'react';
import { PortfolioItem } from '@/domains/portfolios/api';

import { LeadGenerationModal } from './LeadGenerationModal';

interface PortfolioCardProps {
  item: PortfolioItem;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ item }) => {
  const [showLeadModal, setShowLeadModal] = React.useState(false);

  return (
    <div className="group bg-white border border-surface-200 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:border-accent/30 transition-all duration-500 flex flex-col">
      <div className="aspect-[16/10] relative overflow-hidden">
        <img 
          src={item.image} 
          alt={item.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
        
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div className="space-y-1">
            <span className="px-2 py-1 bg-accent text-white text-[8px] font-bold uppercase tracking-widest rounded shadow-sm">
              {item.user?.category || 'Professional'}
            </span>
            <h3 className="text-white font-bold text-sm leading-tight drop-shadow-md">{item.title}</h3>
          </div>
        </div>
      </div>
      
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
            <button className="text-[10px] font-bold text-surface-400 uppercase tracking-widest hover:text-accent transition-all">
              Details
            </button>
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
