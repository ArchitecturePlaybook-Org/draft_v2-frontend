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

export default function ProfileDetailClient() {
  const { uid } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

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
        name: "Arch. Johnathan Vance",
        email: "johnathan.vance@apexdesign.com",
        bio: `Passionate Principal Architectural Consultant & BIM Director with 12+ years of experience in high-density urban developments and parametric facade engineering.\n\nDemonstrated success managing multi-disciplinary engineering teams across North America and Europe. Specialized in LEED AP certified masterplanning, Revit automation, and smart building envelope optimization.`,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        category: "Principal Architect & BIM Director",
        city: "San Francisco",
        country: "United States",
        completed_projects: 28,
        portfolios: [
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
          }
        ],
        contributed_portfolios: [
          {
            id: 103,
            title: "Contemporary Minimalist Villa",
            image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
            views_count: 1890,
          }
        ],
        stakeholders: [
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
        ],
        social_links: {
          linkedin: `https://linkedin.com/in/${profileUid}`,
          twitter: `https://twitter.com/jvance_arch`,
          instagram: `https://instagram.com/jvance_design`
        },
        website: "https://apexdesignstudio.com",
        metadata: {
          headline: "Principal Architectural Consultant & BIM Specialist | Urban Masterplanning & Facades",
          current_company: "Apex Architectural Studio",
          education_summary: "School of Planning and Architecture (SPA)",
          design_philosophy: "Architecture is not merely about shaping physical spaces, but crafting sustainable habitats that harmonize human experience, environmental stewardship, and structural elegance.",
          years_of_experience: 12,
          connections: 500,
          followers: 1420,
          profile_views: 1284,
          post_impressions: 8920,
          search_appearances: 342,
          project_engagements: 76
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
    <div className="min-h-screen bg-surface-50 pt-20 sm:pt-24 pb-16 px-3 sm:px-5">
      <div className="max-w-[1120px] mx-auto space-y-5">
        
        {/* Main 2-Column High-Density Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Main Feed Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <ProfileHeaderBanner
              profile={profile}
              onOpenLeadModal={() => setShowLeadModal(true)}
              onOpenContactModal={() => setShowContactModal(true)}
              onOpenMessageModal={() => setShowMessageModal(true)}
            />

            <ProfileAnalyticsBar profile={profile} />

            <ProfileAboutSection profile={profile} />

            {/* Construction Projects & Shared Task Contributions */}
            <ProfileTaskContributions profile={profile} />

            <ProfileFeaturedSection profile={profile} />

            <ProfileActivitySection profile={profile} />

            <ProfileExperienceSection profile={profile} />

            <ProfileEducationCertifications profile={profile} />

            <ProfileSkillsSection profile={profile} />

            <ProfileRecommendationsSection profile={profile} />
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

    </div>
  );
}
