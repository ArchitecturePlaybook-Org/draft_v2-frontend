"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usersApi, PublicProfile } from '@/domains/users/api';
import { LeadGenerationModal } from '@/shared/components/LeadGenerationModal';

import { ProfileHeaderBanner } from './components/ProfileHeaderBanner';
import { ProfileAnalyticsBar } from './components/ProfileAnalyticsBar';
import { ProfileProjectSlider } from './components/ProfileProjectSlider';
import { PinterestProjectGrid } from './components/PinterestProjectGrid';
import { ProfileAboutSection } from './components/ProfileAboutSection';
import { ProfileTaskContributions } from './components/ProfileTaskContributions';
import { ProfileFeaturedSection } from './components/ProfileFeaturedSection';
import { ProfileActivitySection } from './components/ProfileActivitySection';
import { ProfileExperienceSection } from './components/ProfileExperienceSection';
import { ProfileEducationCertifications } from './components/ProfileEducationCertifications';
import { ProfileSkillsSection } from './components/ProfileSkillsSection';
import { ProfileRecommendationsSection } from './components/ProfileRecommendationsSection';
import { ProfileSidebar } from './components/ProfileSidebar';

import { ContactInfoModal } from './components/ContactInfoModal';
import { SendMessageModal } from './components/SendMessageModal';
import { EditPublicProfileModal } from './components/EditPublicProfileModal';
import { LayoutGrid, FileText, TrendingUp } from 'lucide-react';

export default function ProfileDetailClient() {
  const { uid } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"gallery" | "overview" | "analytics">("gallery");

  // Modal States
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (uid) {
      fetchProfile(uid as string);
    }
  }, [uid]);

  const fetchProfile = async (profileUid: string) => {
    setIsLoading(true);
    try {
      const data = await usersApi.getPublicProfile(profileUid);
      setProfile(data);
    } catch (err) {
      console.warn("Could not fetch public profile:", err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="animate-pulse space-y-6 w-full max-w-6xl mx-auto">
          <div className="h-48 bg-surface-200 rounded-2xl w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 space-y-5">
              <div className="h-32 bg-surface-200 rounded-2xl w-full" />
              <div className="h-48 bg-surface-200 rounded-2xl w-full" />
            </div>
            <div className="lg:col-span-4 h-80 bg-surface-200 rounded-2xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-surface-50 pt-28 pb-16 px-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-primary">Profile Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 pt-20 sm:pt-24 pb-16 px-3 sm:px-5">
      <div className="max-w-[1200px] mx-auto space-y-4">
        
        {/* Executive Architectural Studio Header */}
        <ProfileHeaderBanner
          profile={profile}
          onOpenLeadModal={() => setShowLeadModal(true)}
          onOpenContactModal={() => setShowContactModal(true)}
          onOpenMessageModal={() => setShowMessageModal(true)}
          onOpenEditModal={() => setShowEditModal(true)}
        />

        {/* Compact Executive Tab Switcher */}
        <div className="flex items-center justify-start gap-1 p-1 bg-surface-100/90 backdrop-blur-xl rounded-xl border border-surface-200/80 shadow-2xs w-fit">
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "gallery"
                ? "bg-accent text-background shadow-xs font-black"
                : "bg-transparent text-surface-500 hover:text-foreground hover:bg-surface-200/50"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Portfolio Gallery
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-accent text-background shadow-xs font-black"
                : "bg-transparent text-surface-500 hover:text-foreground hover:bg-surface-200/50"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Overview & Bio
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "bg-accent text-background shadow-xs font-black"
                : "bg-transparent text-surface-500 hover:text-foreground hover:bg-surface-200/50"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Analytics & Reach
          </button>
        </div>

        {/* TAB 1: Primary Pinterest-Style Portfolio Visual Gallery */}
        {activeTab === "gallery" && (
          <div className="space-y-4">
            {/* Hero Project Slide Showcase */}
            <ProfileProjectSlider profile={profile} />

            {/* Pinterest-Style Staggered Project Grid */}
            <PinterestProjectGrid profile={profile} />
          </div>
        )}

        {/* TAB 2: Overview, Experience, Education & Sidebar */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-4">
              <ProfileAboutSection profile={profile} />
              <ProfileTaskContributions profile={profile} />
              <ProfileExperienceSection profile={profile} />
              <ProfileEducationCertifications profile={profile} />
              <ProfileSkillsSection profile={profile} />
            </div>
            <div className="lg:col-span-4">
              <div className="sticky top-20 space-y-4">
                <ProfileSidebar
                  profile={profile}
                  onOpenContactModal={() => setShowContactModal(true)}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Secondary Analytics & Reach Bar */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <ProfileAnalyticsBar profile={profile} />
          </div>
        )}

      </div>

      {/* Modals */}
      <LeadGenerationModal
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        professionalName={profile.name}
        professionalId={profile.uid}
      />

      <ContactInfoModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        profile={profile}
      />

      <SendMessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        profile={profile}
      />

      <EditPublicProfileModal
        isOpen={showEditModal}
        profile={profile}
        onClose={() => setShowEditModal(false)}
        onSaveSuccess={(updated) => setProfile(updated)}
      />

    </div>
  );
}
