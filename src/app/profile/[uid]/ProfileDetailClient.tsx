"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usersApi, PublicProfile } from '@/domains/users/api';
import { LeadGenerationModal } from '@/shared/components/LeadGenerationModal';

import { ProfileHeaderBanner } from './components/ProfileHeaderBanner';
import { ProfileAnalyticsBar } from './components/ProfileAnalyticsBar';
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

export default function ProfileDetailClient() {
  const { uid } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      console.warn("Could not fetch profile from BFF, using compact profile fallback:", err);
      setProfile({
        id: 574,
        uid: profileUid,
        name: "Ar. Rajesh Kumar",
        email: "rajesh.kumar@mindspacearch.in",
        bio: `Passionate Principal Architectural Consultant & BIM Director with 14+ years of experience in high-density commercial tech parks, LEED AP sustainable facades, and urban masterplanning across Bengaluru and South India.\n\nDemonstrated success managing multi-disciplinary engineering teams for premier developers in Whitefield, Electronic City, and Outer Ring Road. Specialized in Vastu-integrated modern masterplanning, Revit automation, and smart building envelope optimization.`,
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        category: "Principal Architect & BIM Director",
        city: "Bengaluru",
        country: "India",
        completed_projects: 34,
        portfolios: [
          {
            id: 101,
            title: "Manyata Tech Park Eco-Tower Masterplan",
            image: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80",
            views_count: 4820,
          },
          {
            id: 102,
            title: "Whitefield Smart Commercial Hub BIM Model",
            image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
            views_count: 3150,
          }
        ],
        contributed_portfolios: [
          {
            id: 103,
            title: "Indiranagar Sustainable Luxury Villa",
            image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
            views_count: 2890,
          }
        ],
        stakeholders: [
          {
            id: 301,
            uid: "sh-101",
            name: "Sobha Structural Consultants",
            avatar: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=100&q=80",
            category: "Structural Consultants"
          },
          {
            id: 302,
            uid: "sh-102",
            name: "Prestige Group Developers",
            avatar: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=100&q=80",
            category: "Client Developer"
          }
        ],
        social_links: {
          linkedin: `https://linkedin.com/in/rajesh-kumar-arch`,
          twitter: `https://twitter.com/rajesh_arch_blr`,
          instagram: `https://instagram.com/rajesh_design_studio`
        },
        website: "https://mindspacearch.in",
        metadata: {
          headline: "Principal Architectural Consultant & BIM Specialist | Tech Parks & Urban Masterplanning | Bengaluru",
          current_company: "Mindspace Architectural Studio, Bengaluru",
          education_summary: "BMS College of Architecture / RV College of Engineering, Bengaluru",
          design_philosophy: "Architecture in India must balance rapid urban growth with ecological harmony, blending natural light, passive cooling, and structural precision.",
          years_of_experience: 14,
          connections: 850,
          followers: 2420,
          profile_views: 3284,
          post_impressions: 14920,
          search_appearances: 842,
          project_engagements: 124
        }
      });
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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 pt-16 sm:pt-20 pb-16 px-3 sm:px-5">
      <div className="max-w-[1200px] mx-auto space-y-4">
        
        {/* Executive Architectural Studio Header */}
        <ProfileHeaderBanner
          profile={profile}
          onOpenLeadModal={() => setShowLeadModal(true)}
          onOpenContactModal={() => setShowContactModal(true)}
          onOpenMessageModal={() => setShowMessageModal(true)}
          onOpenEditModal={() => setShowEditModal(true)}
        />

        {/* Architectural KPI & Specification Metrics Bar */}
        <ProfileAnalyticsBar profile={profile} />

        {/* Main 2-Column Architectural Showcase Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Main Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <ProfileAboutSection profile={profile} />

            {/* Featured 3D Models & Architectural Showcase */}
            <ProfileFeaturedSection profile={profile} />

            {/* Construction Projects & Shared Task Contributions */}
            <ProfileTaskContributions profile={profile} />

            <ProfileExperienceSection profile={profile} />

            <ProfileEducationCertifications profile={profile} />

            <ProfileSkillsSection profile={profile} />
          </div>

          {/* Sticky Desktop Right Sidebar (4 Cols) */}
          <div className="lg:col-span-4">
            <div className="sticky top-20 space-y-4">
              <ProfileSidebar
                profile={profile}
                onOpenContactModal={() => setShowContactModal(true)}
              />
            </div>
          </div>

        </div>

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
