"use client";

import React from 'react';
import Link from 'next/link';
import { PublicProfile, PublicProfilePortfolio } from '@/domains/users/api';

interface ProfileFeaturedSectionProps {
  profile: PublicProfile;
}

export function ProfileFeaturedSection({ profile }: ProfileFeaturedSectionProps) {
  const allPortfolios: PublicProfilePortfolio[] = [
    ...(profile.portfolios || []),
    ...(profile.contributed_portfolios || []),
  ];

  const featuredList = allPortfolios.length > 0 ? allPortfolios : [
    {
      id: 101,
      title: "Skyline Eco-Tower Masterplan",
      image: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80",
      views_count: 3420,
    },
    {
      id: 102,
      title: "Zenith Commercial Hub BIM Model",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
      views_count: 2150,
    },
    {
      id: 103,
      title: "Contemporary Minimalist Villa",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      views_count: 1890,
    },
  ];

  return (
    <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            Featured Architectural 3D Models & Blueprints
            <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {featuredList.length}
            </span>
          </h2>
          <p className="text-[11px] text-surface-500 font-medium">
            3D models, parametric facades, and masterplan specifications
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {featuredList.map((item) => (
          <Link
            key={item.id}
            href={`/portfolio/${item.id}`}
            className="group bg-surface-50 border border-surface-200 rounded-xl overflow-hidden hover:shadow-md hover:border-accent/40 transition-all duration-300 flex flex-col hover:-translate-y-0.5"
          >
            <div className="aspect-[16/9] relative overflow-hidden bg-surface-200">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-surface-400 uppercase tracking-wider bg-surface-200">
                  Visual Blueprint
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />

              <div className="absolute bottom-3 left-3 right-3 space-y-0.5">
                <h3 className="text-white font-bold text-xs line-clamp-1 group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 text-white/80 text-[10px] font-semibold">
                  <span className="flex items-center gap-1">
                    👁️ {item.views_count.toLocaleString()} Views
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-surface-100/50 flex items-center justify-between border-t border-surface-200/50">
              <span className="text-[11px] font-bold text-surface-600 group-hover:text-primary transition-colors">
                View Details →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
