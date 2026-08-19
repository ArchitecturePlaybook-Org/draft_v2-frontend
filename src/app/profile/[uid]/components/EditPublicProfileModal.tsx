"use client";

import React, { useState, useEffect } from "react";
import { PublicProfile } from "@/domains/users/api";
import { authApi } from "@/domains/auth/api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

interface EditPublicProfileModalProps {
  isOpen: boolean;
  profile: PublicProfile;
  onClose: () => void;
  onSaveSuccess: (updatedProfile: PublicProfile) => void;
}

export function EditPublicProfileModal({
  isOpen,
  profile,
  onClose,
  onSaveSuccess,
}: EditPublicProfileModalProps) {
  const { setUser } = useAuthStore();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [headline, setHeadline] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [designPhilosophy, setDesignPhilosophy] = useState("");
  const [yearsOfExp, setYearsOfExp] = useState(14);
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    linkedin: "",
    twitter: "",
    instagram: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setCategory(profile.category || "Principal Architect & BIM Director");
      setHeadline(profile.metadata?.headline || `${profile.category || 'Principal Architectural Consultant'} & BIM Specialist`);
      setCompany(profile.metadata?.current_company || "Mindspace Architectural Studio, Bengaluru");
      setCity(profile.city || "Bengaluru");
      setCountry(profile.country || "India");
      setBio(profile.bio || "");
      setDesignPhilosophy(
        String(profile.metadata?.design_philosophy || "Architecture in India must balance rapid urban growth with ecological harmony, blending natural light, passive cooling, and structural precision.")
      );
      setYearsOfExp(Number(profile.metadata?.years_of_experience || 14));
      setWebsite(profile.website || "");
      setSocialLinks({
        linkedin: profile.social_links?.linkedin || "",
        twitter: profile.social_links?.twitter || "",
        instagram: profile.social_links?.instagram || "",
      });
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        name,
        category,
        city,
        country,
        bio,
        website,
        social_links: socialLinks,
        metadata: {
          ...(profile.metadata || {}),
          headline,
          current_company: company,
          design_philosophy: designPhilosophy,
          years_of_experience: yearsOfExp,
        },
      };

      const updatedUser = await authApi.updateProfile(updateData);
      if (updatedUser) {
        setUser(updatedUser);
      }

      const mergedPublicProfile: PublicProfile = {
        ...profile,
        name,
        category,
        city,
        country,
        bio,
        website,
        social_links: socialLinks,
        metadata: {
          ...(profile.metadata || {}),
          headline,
          current_company: company,
          design_philosophy: designPhilosophy,
          years_of_experience: yearsOfExp,
        },
      };

      toast.success("Profile specifications updated and saved!");
      onSaveSuccess(mergedPublicProfile);
      onClose();
    } catch (err: any) {
      console.error("[EditPublicProfileModal] Save error:", err);
      toast.error(err?.message || "Failed to update profile specifications.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-start justify-center pt-12 sm:pt-16 pb-6 px-3 sm:px-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-2xl max-h-[calc(100vh-5rem)] rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-surface-200 dark:border-white/10 flex justify-between items-center bg-surface-100/60 dark:bg-surface-800/40 shrink-0">
          <div>
            <h3 className="text-base font-black text-primary flex items-center gap-2">
              <span>✏️ Edit Practice & Studio Specifications</span>
            </h3>
            <p className="text-[11px] text-surface-400 font-medium">
              Update identity, firm parameters, design philosophy & location details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 flex items-center justify-center font-bold text-xs hover:bg-surface-300 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 min-h-0 custom-scrollbar">
            {/* Personal & Professional Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                  placeholder="e.g. Ar. Rajesh Kumar"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Primary Title / Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                  placeholder="e.g. Principal Architect & BIM Director"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Professional Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                placeholder="e.g. Principal Architectural Consultant & BIM Specialist | Bengaluru"
              />
            </div>

            {/* Firm & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Current Studio / Firm</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                  placeholder="e.g. Mindspace Architectural Studio"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                  placeholder="e.g. Bengaluru"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                  placeholder="e.g. India"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Years of Experience</label>
                <input
                  type="number"
                  value={yearsOfExp}
                  onChange={(e) => setYearsOfExp(parseInt(e.target.value) || 0)}
                  className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                  placeholder="e.g. 14"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Website URL</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                  placeholder="https://mindspacearch.in"
                />
              </div>
            </div>

            {/* Bio & Design Philosophy */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Practice Biography & Overview</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-medium leading-relaxed resize-none"
                placeholder="Describe architectural achievements and consultation services..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Design Philosophy</label>
              <textarea
                value={designPhilosophy}
                onChange={(e) => setDesignPhilosophy(e.target.value)}
                rows={2}
                className="w-full p-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-medium leading-relaxed resize-none"
                placeholder="Describe your design methodology and sustainable ethos..."
              />
            </div>

            {/* Social Links */}
            <div className="space-y-2 pt-1 border-t border-surface-200 dark:border-white/10">
              <h4 className="text-xs font-bold text-primary">Social Links & Digital Presence</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={socialLinks.linkedin}
                  onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                  placeholder="LinkedIn URL"
                  className="h-8 px-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-medium"
                />
                <input
                  type="text"
                  value={socialLinks.twitter}
                  onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                  placeholder="Twitter Handle/URL"
                  className="h-8 px-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-medium"
                />
                <input
                  type="text"
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                  placeholder="Instagram URL"
                  className="h-8 px-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-medium"
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 border-t border-surface-200 dark:border-white/10 shrink-0 bg-surface-100/60 dark:bg-surface-800/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-200 dark:bg-surface-800 text-primary font-bold text-xs rounded-lg hover:bg-surface-300 transition-all uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-accent text-background font-extrabold uppercase text-[10px] tracking-wider hover:opacity-90 transition-all rounded-lg disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {isLoading ? "Saving Specifications..." : "💾 Save Practice Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
