"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicProfile, Stakeholder } from '@/domains/users/api';

interface ProfileSidebarProps {
  profile: PublicProfile;
  onOpenContactModal: () => void;
}

export function ProfileSidebar({ profile, onOpenContactModal }: ProfileSidebarProps) {
  const [connectedState, setConnectedState] = useState<Record<number, boolean>>({});

  const similarArchitects = [
    {
      id: 201,
      name: "Dr. Sarah Jenkins",
      category: "Senior Urban Masterplanner",
      location: "San Francisco, CA",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
      uid: "sarah-jenkins-882"
    },
    {
      id: 202,
      name: "Vikram Malhotra",
      category: "Principal Structural Engineer",
      location: "London, UK",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
      uid: "vikram-malhotra-491"
    },
    {
      id: 203,
      name: "Claire Dupont",
      category: "BIM Integration Director",
      location: "Paris, France",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
      uid: "claire-dupont-102"
    }
  ];

  const stakeholders: Stakeholder[] = profile.stakeholders?.length > 0
    ? profile.stakeholders
    : [
        {
          id: 301,
          uid: "sh-101",
          name: "Apex Engineering Group",
          avatar: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=100&q=80",
          category: "Structural Consultants"
        },
        {
          id: 302,
          uid: "sh-102",
          name: "Vance Real Estate",
          avatar: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=100&q=80",
          category: "Client Developer"
        }
      ];

  const toggleConnect = (id: number) => {
    setConnectedState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">

      {/* Profile URL Card */}
      <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-primary text-xs">Public profile & URL</h3>
          <button
            onClick={onOpenContactModal}
            className="text-[11px] font-bold text-blue-600 hover:underline"
          >
            Edit
          </button>
        </div>
        <p className="text-[11px] text-surface-500 font-medium break-all">
          architectureplaybook.com/profile/{profile.uid}
        </p>
      </div>

      {/* People Also Viewed */}
      <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-primary text-xs flex items-center justify-between">
          <span>People Also Viewed</span>
        </h3>

        <div className="space-y-3">
          {similarArchitects.map((person) => {
            const isConn = connectedState[person.id];

            return (
              <div key={person.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-200 shrink-0 border border-surface-300">
                    <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-primary text-xs truncate hover:text-blue-600 cursor-pointer">
                      {person.name}
                    </h4>
                    <p className="text-[10px] text-surface-500 truncate">{person.category}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleConnect(person.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition-all ${
                    isConn
                      ? 'bg-surface-200 text-surface-700'
                      : 'border border-blue-600 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {isConn ? '✓' : '+ Connect'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Collaborators */}
      <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-primary text-xs flex items-center justify-between">
          <span>Project Collaborators</span>
          <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            {stakeholders.length}
          </span>
        </h3>

        <div className="space-y-2">
          {stakeholders.map((sh) => (
            <Link
              key={sh.id}
              href={`/profile/${sh.uid}`}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-surface-200/50 transition-all group"
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-surface-200 shrink-0 border border-surface-300">
                {sh.avatar ? (
                  <img src={sh.avatar} alt={sh.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xs text-surface-400">
                    {sh.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-primary text-xs truncate group-hover:text-accent transition-colors">
                  {sh.name}
                </p>
                {sh.category && (
                  <p className="text-[10px] text-surface-500 font-medium truncate">
                    {sh.category}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Compact Pro Banner */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-accent/20 via-amber-500/10 to-primary/20 border border-accent/30 text-center space-y-2 shadow-sm">
        <span className="text-[9px] font-black uppercase tracking-wider bg-accent text-background px-2 py-0.5 rounded inline-block">
          Pro Showcase
        </span>
        <h4 className="font-bold text-primary text-xs">
          Showcase Architectural Portfolios Globally
        </h4>
        <button
          onClick={() => alert("Redirecting to Pro Membership...")}
          className="w-full py-1.5 bg-primary text-background rounded-lg font-bold text-xs hover:opacity-90 transition-opacity"
        >
          Try 1 Month Free
        </button>
      </div>

    </div>
  );
}
