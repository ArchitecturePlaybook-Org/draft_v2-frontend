"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TeamMemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await fetchFromBff<any>(`/api/v1/users/public/profiles/${userId}/`, {
          method: "GET",
          skipAuth: false, // We can send auth if they are logged in
        });
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (userId) loadProfile();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4 text-primary font-bold uppercase tracking-widest text-sm">
          <div className="w-16 h-16 rounded-full border-4 border-surface-200 border-t-accent animate-spin" />
          <span>Locating Professional...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center gap-4 text-center">
        <div className="w-24 h-24 bg-surface-100 rounded-3xl flex items-center justify-center text-surface-400">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-primary">Identity Not Found</h2>
        <p className="text-surface-400 text-sm">The requested professional profile could not be located or is restricted.</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-surface-100 text-primary font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-surface-200 transition-colors">
          Return to Previous Context
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[10px] font-bold text-surface-400 hover:text-primary uppercase tracking-[0.2em] transition-colors"
      >
        <span className="text-sm leading-none mt-px">←</span> Back to Directory
      </button>

      {/* Hero Section */}
      <div className="bg-surface-50/50 backdrop-blur-xl border border-surface-200 rounded-[2rem] p-8 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 arch-grid opacity-20 pointer-events-none mix-blend-overlay rounded-bl-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-full bg-accent/10 border-4 border-surface-50 shadow-xl overflow-hidden flex items-center justify-center">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-bold text-accent">{profile.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">{profile.name}</h1>
              <p className="text-sm font-bold text-accent uppercase tracking-widest mt-2">{profile.category || "Professional"}</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-bold text-surface-500 uppercase tracking-widest">
              {(profile.city || profile.country) && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </span>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {profile.email}
                </a>
              )}
            </div>

            <p className="text-sm text-surface-600 leading-relaxed max-w-2xl bg-surface-100/50 p-4 rounded-xl border border-surface-200">
              {profile.bio || "No biography provided by this professional."}
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Grid */}
      <div className="space-y-6">
        <h3 className="text-xs font-bold text-primary uppercase tracking-[0.3em] flex items-center gap-2 border-b border-surface-200 pb-4">
          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          Public Work History ({profile.portfolios?.length || 0})
        </h3>
        
        {profile.portfolios && profile.portfolios.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {profile.portfolios.map((item: any) => (
              <Link 
                key={item.id}
                href={`/portfolio/${item.id}`}
                className="group block aspect-[4/3] bg-surface-100 rounded-2xl overflow-hidden relative border border-surface-200 hover:border-accent hover:shadow-xl transition-all duration-300"
              >
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-surface-400 uppercase tracking-widest">No Image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                  <h4 className="text-white font-bold text-sm truncate">{item.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-surface-200 rounded-2xl bg-surface-50/50">
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">No public portfolio items available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
