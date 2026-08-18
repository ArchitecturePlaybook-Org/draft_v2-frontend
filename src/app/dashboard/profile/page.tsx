"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/domains/auth/api";
import { orgsApi } from "@/domains/orgs/api";
import { portfoliosApi, PortfolioItem } from "@/domains/portfolios/api";
import { QRCodeSVG } from "qrcode.react";
import ReactCrop, { Crop, PixelCrop, makeAspectCrop, centerCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { motion } from "framer-motion";

import { CATEGORY_SCHEMAS, calculateProfileCompleteness } from "@/lib/utils/profile";
import { toast } from "sonner";

type TabType = "overview" | "professional" | "portfolio" | "organization" | "security" | "activity";



export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    linkedin: "",
    github: "",
    twitter: "",
    portfolio: ""
  });
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);

  // 2FA State
  const [is2FASetupModalOpen, setIs2FASetupModalOpen] = useState(false);
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaUri, setMfaUri] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isDisable2FAModalOpen, setIsDisable2FAModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  // Security Tab State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeEmailPassword, setChangeEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);

  // Cropping State
  const [imgSrc, setImgSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const categorySlug = useMemo(() => {
    return (user?.category || user?.profile?.category_path?.main || "architect").toLowerCase();
  }, [user]);

  const currentSchema = useMemo(() => {
    return CATEGORY_SCHEMAS[categorySlug] || [];
  }, [categorySlug]);

  useEffect(() => {
    loadOrgs();
    loadPortfolio();
  }, []);

  useEffect(() => {
    if (activeTab === "security") {
      loadSessions();
    }
  }, [activeTab]);

  async function loadSessions() {
    try {
      const data = await authApi.getActiveSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  }

  async function loadPortfolio() {
    try {
      const data = await portfoliosApi.listMyPortfolio();
      setPortfolioItems(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadOrgs() {
    try {
      const data = await orgsApi.listOrgs();
      setOrganizations(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (user?.profile) {
      setMetadata(user.profile.metadata || {});
      setBio(user.profile.bio || "");
      setPhone(user.profile.phone_number || "");
      setWebsite(user.profile.website || "");
      setSocialLinks({
        linkedin: String(user.profile.social_links?.linkedin || ""),
        github: String(user.profile.social_links?.github || ""),
        twitter: String(user.profile.social_links?.twitter || ""),
        portfolio: String(user.profile.social_links?.portfolio || ""),
        ...user.profile.social_links
      });
    }
  }, [user]);

  const completionPercentage = useMemo(() => {
    return calculateProfileCompleteness(user).score;
  }, [user]);

  async function handleUpdate() {
    setIsLoading(true);
    setSuccess("");
    try {
      const updatedUser = await authApi.updateProfile({
        bio,
        phone_number: phone,
        website,
        social_links: socialLinks,
        metadata, // Now contains dynamic fields
      });
      
      setUser(updatedUser);
      setSuccess("Identity and credentials synchronized.");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestEmailChange() {
    if (!newEmail || !changeEmailPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.requestEmailChange({ password: changeEmailPassword, new_email: newEmail });
      toast.success(`Verification email sent to ${newEmail}. Please check your inbox.`);
      setChangeEmailPassword("");
      setNewEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to request email change.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevokeSession(tokenId: number) {
    if (!confirm("Are you sure you want to revoke this session?")) return;
    setIsLoading(true);
    try {
      await authApi.revokeSession(tokenId);
      setSessions(prev => prev.filter(s => s.id !== tokenId));
      toast.success("Session revoked successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke session.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to base64 for cropping preview
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImgSrc(reader.result?.toString() || "");
      setIsCropModalOpen(true);
    });
    reader.readAsDataURL(file);
    
    // Clear input so selecting the same file again works
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(crop);
  }

  async function handleCropSubmit() {
    if (!completedCrop || !imgRef.current) return;

    // Create canvas to draw the cropped image
    const canvas = document.createElement("canvas");
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    setIsLoading(true);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsLoading(false);
        return;
      }
      
      const file = new File([blob], "avatar.png", { type: "image/png" });
      try {
        const updatedUser = await authApi.uploadAvatar(file);
        setUser(updatedUser);
        setSuccess("Profile picture updated successfully.");
        setIsCropModalOpen(false);
      } catch (err) {
        console.error(err);
        alert("Failed to upload image.");
      } finally {
        setIsLoading(false);
      }
    }, "image/png");
  }

  const updateMetadataField = (key: string, value: any) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  async function initiate2FASetup() {
    alert("Two-Factor Authentication (2FA) backend services are currently under development and will be available soon!");
  }

  async function confirm2FASetup() {
    setIsLoading(true);
    try {
      const res = await authApi.confirm2FA(mfaCode);
      setRecoveryCodes(res.recovery_codes);
      setUser({ ...user!, is_2fa_enabled: true });
    } catch (err: any) {
      alert(err.message || "Invalid code");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleVisibility() {
    setIsLoading(true);
    try {
      const currentIsPublic = user?.profile?.is_public ?? true;
      const res = await authApi.updateProfile({ is_public: !currentIsPublic });
      setUser(res);
      toast.success(currentIsPublic ? "Profile set to private" : "Profile set to public");
    } catch (err: any) {
      toast.error(err.message || "Failed to update visibility");
    } finally {
      setIsLoading(false);
    }
  }

  async function disable2FA() {
    setIsLoading(true);
    try {
      await authApi.disable2FA(disablePassword);
      setUser({ ...user!, is_2fa_enabled: false });
      setIsDisable2FAModalOpen(false);
      setDisablePassword("");
      alert("2FA Disabled successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to disable 2FA");
    } finally {
      setIsLoading(false);
    }
  }

  const [isDecommissionModalOpen, setIsDecommissionModalOpen] = useState(false);
  const [decommissionPassword, setDecommissionPassword] = useState("");

  async function handleExportData() {
    try {
      setIsLoading(true);
      const data = await authApi.exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ap_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setSuccess("Data export completed.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      alert("Failed to export data");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDecommission() {
    try {
      setIsLoading(true);
      await authApi.decommissionIdentity(decommissionPassword);
      setUser(null);
      window.location.href = "/login";
    } catch (err: any) {
      alert("Failed to decommission identity. " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return <div className="p-12 text-center font-bold text-primary animate-pulse tracking-widest uppercase">Initializing System Identity...</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Profile Header */}
      <div className="bg-surface-50/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-primary/5 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-full bg-primary/5 arch-grid opacity-20 pointer-events-none mix-blend-overlay" />
        
        <div className="relative z-10">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarUpload} 
            className="hidden" 
            accept="image/*" 
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 rounded-full bg-accent text-background font-bold shadow-2xl border-[6px] border-surface-100 dark:border-surface-50 overflow-hidden relative group/avatar cursor-pointer hover:scale-105 hover:rotate-3 transition-all duration-500 ease-out"
          >
            {user.profile?.profile_picture ? (
              <img src={user.profile.profile_picture as string} alt={user.name || user.email} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl flex items-center justify-center h-full">{(user.name || user.email || "?").charAt(0).toUpperCase()}</span>
            )}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 flex items-center justify-center">
              <span className="text-[10px] text-white font-bold uppercase tracking-[0.2em] transform translate-y-4 group-hover/avatar:translate-y-0 transition-transform duration-300">Upload</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-3 text-center md:text-left relative z-10">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-primary tracking-tight">{user.name || user.email.split('@')[0]}</h1>
            <p className="text-surface-400 text-sm font-medium">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
             <span className="px-4 py-1.5 bg-accent text-background text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg shadow-accent/20">
               {categorySlug}
             </span>
             <span className="px-4 py-1.5 bg-surface-200/50 backdrop-blur-md text-primary text-[10px] font-bold uppercase tracking-[0.2em] rounded-full border border-white/10">
               {user.role || "Standard Access"}
             </span>
          </div>
        </div>

        <div className="w-full md:w-72 space-y-3 relative z-10 bg-surface-100/50 backdrop-blur-md p-5 rounded-2xl border border-white/10 dark:border-white/5">
          <div className="flex justify-between items-end mb-1">
             <label className="text-[9px] font-bold text-surface-400 uppercase tracking-[0.2em]">Profile Integrity</label>
             <span className="text-xs font-bold text-accent drop-shadow-[0_0_8px_rgba(var(--color-accent),0.6)]">{completionPercentage}%</span>
          </div>
          <div className="h-2 w-full bg-surface-200/50 rounded-full overflow-hidden border border-black/5 dark:border-white/5 shadow-inner">
            <div 
              className="h-full bg-accent transition-all duration-1000 ease-out relative overflow-hidden" 
              style={{ width: `${completionPercentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-[200%] animate-[shimmer_2s_infinite] -skew-x-12" />
            </div>
          </div>
          <div className="pt-2">
            <Link href={`/profile/${user.uid}`} className="w-full py-2 bg-surface-200/50 hover:bg-surface-200 border border-surface-300/50 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest transition-all">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              View Public Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-200/50 overflow-x-auto no-scrollbar scroll-smooth relative">
        {(["overview", "professional", "portfolio", "organization", "security", "activity"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setIsEditing(false); }}
            className={`px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${
              activeTab === tab 
                ? "text-primary" 
                : "text-surface-400 hover:text-primary/70 hover:bg-surface-50/50"
            }`}
          >
            <span className="relative z-10">{tab}</span>
            {activeTab === tab && (
              <motion.div 
                layoutId="profileTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent rounded-t-full shadow-[0_-2px_10px_rgba(var(--color-accent),0.5)]" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {activeTab === "overview" && (
          <motion.div initial="hidden" animate="show" variants={{hidden: {opacity: 0}, show: {opacity: 1, transition: {staggerChildren: 0.1}}}} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} className="lg:col-span-2 space-y-8">
              <section className="bg-surface-100 border-surface-200 p-10 border border-surface-200 rounded-2xl shadow-sm space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-xs font-bold text-primary uppercase tracking-[0.3em] border-l-4 border-accent pl-4">Core Identity Specification</h2>
                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-[10px] font-bold uppercase text-accent border-b border-accent/20 hover:border-accent transition-all"
                    >
                        {isEditing ? "Cancel Specification" : "Update Identity"}
                    </button>
                </div>

                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest ml-2">Professional Biography</label>
                        {isEditing ? (
                            <textarea 
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full h-40 p-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm leading-relaxed shadow-inner"
                                placeholder="Define your professional expertise and architectural vision..."
                            />
                        ) : (
                            <p className="text-primary leading-relaxed text-sm bg-surface-50/30 backdrop-blur-sm p-6 rounded-2xl border border-dashed border-surface-200/50">{bio || "Biographical data missing. Please update your specification."}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest ml-2">Global Contact Line</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm shadow-inner"
                                    placeholder="+XX XXXXX XXXXX"
                                />
                            ) : (
                                <p className="font-bold text-primary text-sm tracking-tight bg-surface-50/30 p-4 rounded-xl border border-surface-200/30">{phone || "No contact line defined"}</p>
                            )}
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest ml-2">Years of Experience</label>
                            {isEditing ? (
                                <input 
                                    type="number" 
                                    value={Number(metadata.years_of_experience || 0)}
                                    onChange={(e) => updateMetadataField("years_of_experience", parseInt(e.target.value) || 0)}
                                    className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm shadow-inner"
                                    placeholder="e.g. 10"
                                />
                            ) : (
                                <p className="font-bold text-primary text-sm tracking-tight bg-surface-50/30 p-4 rounded-xl border border-surface-200/30">{metadata.years_of_experience ? `${metadata.years_of_experience} Years` : "Unspecified"}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest ml-2">Design Philosophy</label>
                        {isEditing ? (
                            <textarea 
                                value={String(metadata.design_philosophy || "")}
                                onChange={(e) => updateMetadataField("design_philosophy", e.target.value)}
                                className="w-full h-24 p-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm leading-relaxed shadow-inner"
                                placeholder="Describe your architectural approach and vision..."
                            />
                        ) : (
                            <p className="text-primary leading-relaxed text-sm bg-surface-50/30 backdrop-blur-sm p-6 rounded-2xl border border-dashed border-surface-200/50">{String(metadata.design_philosophy || "No philosophy specified.")}</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest ml-2">Services Offered (Comma Separated)</label>
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={Array.isArray(metadata.services_offered) ? metadata.services_offered.join(", ") : ""}
                                onChange={(e) => updateMetadataField("services_offered", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm shadow-inner"
                                placeholder="Master Planning, Interior Design, 3D Rendering..."
                            />
                        ) : (
                            <p className="font-bold text-primary text-sm tracking-tight bg-surface-50/30 p-4 rounded-xl border border-surface-200/30">
                              {Array.isArray(metadata.services_offered) && metadata.services_offered.length > 0 
                                ? metadata.services_offered.join(" • ") 
                                : "Unspecified"}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest ml-2">Licenses & Certifications</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={Array.isArray(metadata.licenses_and_certifications) ? metadata.licenses_and_certifications.join(", ") : ""}
                                    onChange={(e) => updateMetadataField("licenses_and_certifications", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                    className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm shadow-inner"
                                    placeholder="AIA, LEED AP, NCARB..."
                                />
                            ) : (
                                <p className="font-bold text-primary text-sm tracking-tight bg-surface-50/30 p-4 rounded-xl border border-surface-200/30">
                                  {Array.isArray(metadata.licenses_and_certifications) && metadata.licenses_and_certifications.length > 0 
                                    ? metadata.licenses_and_certifications.join(", ") 
                                    : "None specified"}
                                </p>
                            )}
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest ml-2">Awards & Recognition</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={Array.isArray(metadata.awards) ? metadata.awards.join(", ") : ""}
                                    onChange={(e) => updateMetadataField("awards", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                    className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm shadow-inner"
                                    placeholder="AIA Design Award 2024, ArchDaily Feature..."
                                />
                            ) : (
                                <p className="font-bold text-primary text-sm tracking-tight bg-surface-50/30 p-4 rounded-xl border border-surface-200/30">
                                  {Array.isArray(metadata.awards) && metadata.awards.length > 0 
                                    ? metadata.awards.join(", ") 
                                    : "None specified"}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <div className="pt-8 border-t border-surface-100 flex justify-end gap-4">
                        <button 
                            onClick={handleUpdate}
                            disabled={isLoading}
                            className="px-10 h-14 bg-accent text-background font-bold uppercase text-[10px] tracking-[0.25em] hover:bg-accent transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            {isLoading ? "Synchronizing..." : "Synchronize Identity"}
                        </button>
                    </div>
                )}
                {success && <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-[0.2em] text-center bg-emerald-50 dark:bg-emerald-900/20 py-3 rounded-lg border border-emerald-100">{success}</p>}
              </section>

              {/* Specializations */}
              {user.profile?.category_path?.selected && (
                <section className="bg-surface-50/50 p-10 border border-surface-200 rounded-2xl space-y-8">
                    <h2 className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Industrial DNA & Taxonomy</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {Object.entries(user.profile.category_path.selected).map(([group, specs]) => (
                            <div key={group} className="space-y-4">
                                <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em] border-b border-surface-200 pb-3">{group}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(specs as string[]).map((spec, idx) => (
                                        <span key={idx} className="px-3 py-2 bg-surface-100 border-surface-200 border border-surface-200 text-primary text-[10px] font-bold uppercase tracking-tight rounded-md shadow-sm hover:border-accent transition-colors">
                                            {spec}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
              )}
            </motion.div>

            <motion.div variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} className="space-y-8">
              <section className="bg-surface-900 text-white p-10 rounded-2xl space-y-8 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-40 h-40 arch-grid opacity-10 pointer-events-none" />
                  <div className="space-y-2">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Technical Metadata</h2>
                    <p className="text-[9px] opacity-40 uppercase tracking-widest">System-level markers and professional identifiers</p>
                  </div>
                  <div className="space-y-8">
                      {Object.entries(metadata).length > 0 ? (
                          Object.entries(metadata).map(([key, value]) => (
                              <div key={key} className="space-y-2 group">
                                  <label className="text-[9px] font-bold uppercase opacity-30 tracking-[0.2em] group-hover:opacity-100 transition-opacity">{key.replace(/_/g, ' ')}</label>
                                  <p className="text-xs font-mono tracking-tight text-white/90">
                                      {Array.isArray(value) ? value.join(", ") : String(value)}
                                  </p>
                              </div>
                          ))
                      ) : (
                          <p className="text-[10px] opacity-30 italic tracking-wide text-center py-8 border border-white/5 rounded-xl">No technical markers detected in current profile layer.</p>
                      )}
                  </div>
              </section>

              <section className="bg-surface-100 border-surface-200 border border-surface-200 p-8 rounded-2xl space-y-6 shadow-sm">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Professional Accolades</h2>
                <div className="grid grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-square bg-surface-50 rounded-2xl border border-surface-100 flex items-center justify-center grayscale opacity-20 hover:grayscale-0 hover:opacity-100 transition-all cursor-help hover:scale-105" title="Locked Badge: Complete 10 projects to unlock">
                      <div className="w-10 h-10 rounded-full border-2 border-surface-200 relative">
                        <div className="absolute inset-2 bg-surface-200 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          </motion.div>
        )}

        {activeTab === "professional" && (
          <motion.div initial="hidden" animate="show" variants={{hidden: {opacity: 0}, show: {opacity: 1, transition: {staggerChildren: 0.1}}}} className="max-w-4xl space-y-8">
            <motion.section variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} className="bg-surface-100 border-surface-200 p-10 border border-surface-200 rounded-2xl shadow-sm space-y-10">
              <div className="flex justify-between items-center border-b border-surface-100 pb-6">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Professional Specification</h2>
                  <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Verified data for {categorySlug} classification</p>
                </div>
                <button onClick={() => setIsEditing(!isEditing)} className="px-6 py-2 border border-surface-200 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-surface-50 transition-all">
                  {isEditing ? "Lock Data" : "Edit Details"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    Category Specifics
                  </h3>
                  {currentSchema.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest ml-2">{field.label}</label>
                      {isEditing ? (
                        field.type === "select" ? (
                          <select 
                            value={String(metadata[field.key] || "")} 
                            onChange={e => updateMetadataField(field.key, e.target.value)}
                            className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent text-sm shadow-inner"
                          >
                            <option value="">Select option...</option>
                            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input 
                            type={field.type} 
                            value={String(metadata[field.key] || "")} 
                            onChange={e => updateMetadataField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent text-sm shadow-inner" 
                          />
                        )
                      ) : (
                        <p className="text-sm font-bold text-primary tracking-tight bg-surface-50/30 p-4 rounded-xl border border-surface-100/50 min-h-[56px] flex items-center">
                          {String(metadata[field.key] || "—")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-8 md:border-l border-surface-200/50 md:pl-12">
                  <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                    Digital Footprint
                  </h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest ml-2">Official Portfolio/Website</label>
                      {isEditing ? (
                        <input type="text" value={website} onChange={e => setWebsite(e.target.value)} className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent text-sm shadow-inner" placeholder="https://..." />
                      ) : (
                        <div className="bg-surface-50/30 p-4 rounded-xl border border-surface-100/50 flex items-center">
                          <a href={website} target="_blank" className="text-sm font-bold text-accent hover:underline flex items-center gap-2 group w-full truncate">
                            {website || "Unspecified"}
                            {website && <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                          </a>
                        </div>
                      )}
                    </div>
                    {Object.entries(socialLinks).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest ml-2 capitalize">{key}</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={String(value)} 
                            onChange={e => setSocialLinks({...socialLinks, [key]: e.target.value})} 
                            className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-sm border border-surface-200/80 rounded-xl outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent text-sm shadow-inner" 
                            placeholder={`Your ${key} profile URL`}
                          />
                        ) : (
                          <p className="text-sm text-primary font-medium bg-surface-50/30 p-4 rounded-xl border border-surface-100/50 truncate">{String(value) || "—"}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="pt-10 border-t border-surface-100 flex justify-end">
                  <button onClick={handleUpdate} disabled={isLoading} className="px-10 h-14 bg-accent text-background font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-all shadow-xl shadow-primary/20">
                    {isLoading ? "Saving Specification..." : "Commit Professional Data"}
                  </button>
                </div>
              )}
            </motion.section>
          </motion.div>
        )}
...
        {activeTab === "portfolio" && (
          <motion.div initial="hidden" animate="show" variants={{hidden: {opacity: 0}, show: {opacity: 1, transition: {staggerChildren: 0.1}}}} className="space-y-8">
            <motion.section variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} className="bg-surface-100/50 backdrop-blur-xl p-10 border border-white/10 dark:border-white/5 rounded-3xl shadow-xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
              <div className="flex justify-between items-center relative z-10">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] flex items-center gap-3">
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Work Portfolio
                  </h2>
                  <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Showcase your architectural projects to the public</p>
                </div>
                <button 
                  onClick={() => setIsUploadingPortfolio(true)}
                  className="px-6 py-3 bg-accent text-background text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(var(--color-accent),0.4)]"
                >
                  Add Project
                </button>
              </div>

              {portfolioItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-4 relative z-10">
                  {portfolioItems.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ rotateY: 2, rotateX: -2, y: -5, z: 20 }}
                      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                      className="group relative bg-surface-50/50 backdrop-blur-sm rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10 transition-all duration-500"
                    >
                      <div className="aspect-[4/3] relative overflow-hidden bg-surface-100">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-700 ease-out" />
                        ) : (
                          <div className="w-full h-full bg-surface-200/50 flex items-center justify-center text-xs text-surface-400 font-bold uppercase tracking-widest">
                            No Image
                          </div>
                        )}
                        
                        {!item.is_owner && (
                          <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/10">
                            Contributor
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 justify-end gap-3">
                          {item.is_owner ? (
                            <button 
                              onClick={async (e) => {
                                e.preventDefault();
                                if (confirm("Permanently decommission this project from your portfolio?")) {
                                  try {
                                    await portfoliosApi.deletePortfolioItem(item.id);
                                    setPortfolioItems(prev => prev.filter(p => p.id !== item.id));
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          ) : null}
                          <Link 
                            href={`/portfolio/${item.id}`} 
                            className="w-10 h-10 bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl flex items-center justify-center hover:bg-white/40 transition-colors shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </Link>
                        </div>
                      </div>
                      <div className="p-6 space-y-2 relative bg-surface-50/80 backdrop-blur-md">
                        <h3 className="text-sm font-bold text-primary truncate group-hover:text-accent transition-colors">{item.title}</h3>
                        <p className="text-[10px] text-surface-400 uppercase tracking-widest font-mono flex items-center gap-2">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {item.project_date || "Date Unspecified"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center space-y-6 border border-white/10 rounded-3xl bg-gradient-to-b from-surface-50/50 to-transparent backdrop-blur-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 arch-grid opacity-10 pointer-events-none mix-blend-overlay group-hover:opacity-20 transition-opacity duration-1000" />
                  <div className="w-24 h-24 bg-surface-100/50 backdrop-blur-md rounded-[2rem] mx-auto flex items-center justify-center text-surface-300 border border-white/10 shadow-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
                    <svg className="w-12 h-12 text-accent/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="space-y-2 relative z-10">
                    <p className="text-lg font-bold text-primary tracking-tight">No portfolio items detected</p>
                    <p className="text-[10px] text-surface-400 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">Initialize your digital showcase to attract clients and demonstrate architectural mastery.</p>
                  </div>
                </div>
              )}
            </motion.section>

            {isUploadingPortfolio && (
              <div 
                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-20 pb-6 px-3 sm:px-4 overflow-hidden"
                onClick={() => setIsUploadingPortfolio(false)}
              >
                <div 
                  className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-lg max-h-[calc(100vh-6rem)] rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-surface-200 dark:border-white/10 flex justify-between items-center shrink-0 bg-surface-100/60 dark:bg-surface-800/40">
                    <div>
                      <h3 className="text-sm font-extrabold text-primary tracking-tight">Add Portfolio Project</h3>
                      <p className="text-[11px] text-surface-500 font-medium">Upload project assets & architectural specs</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsUploadingPortfolio(false)} 
                      className="w-7 h-7 rounded-full bg-surface-200/80 hover:bg-surface-300 text-surface-600 flex items-center justify-center font-bold text-xs transition-all"
                    >
                      ✕
                    </button>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const formData = new FormData(form);
                      setIsLoading(true);
                      try {
                        const newItem = await portfoliosApi.addPortfolioItem(formData);
                        setPortfolioItems(prev => [newItem, ...prev]);
                        setIsUploadingPortfolio(false);
                        setSuccess("Portfolio item synchronized successfully.");
                      } catch (err) {
                        console.error(err);
                        alert("System failure during data ingestion.");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="flex-1 flex flex-col min-h-0 overflow-hidden"
                  >
                    <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 min-h-0">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Project Title *</label>
                        <input name="title" required className="w-full h-10 px-3.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl outline-none focus:border-accent text-xs font-semibold text-primary" placeholder="e.g. Minimalist Glass Villa" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Main Thumbnail *</label>
                          <input type="file" name="image" required accept="image/*" className="w-full text-xs text-surface-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Gallery Images</label>
                          <input type="file" name="images" multiple accept="image/*" className="w-full text-xs text-surface-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Video URL (Optional)</label>
                        <input name="video_url" type="url" className="w-full h-10 px-3.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl outline-none focus:border-accent text-xs font-semibold text-primary" placeholder="e.g. https://www.youtube.com/watch?v=..." />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Execution Description</label>
                        <textarea name="description" rows={3} className="w-full p-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl outline-none focus:border-accent text-xs font-semibold text-primary resize-none" placeholder="Define the architectural parameters and outcome..." />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Project Date</label>
                          <input type="date" name="project_date" className="w-full h-10 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl outline-none focus:border-accent text-xs font-semibold text-primary" />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input 
                            type="checkbox" 
                            name="is_public" 
                            id="is_public_check" 
                            value="true"
                            defaultChecked 
                            className="w-4 h-4 rounded border-surface-200 text-accent focus:ring-accent/20" 
                          />
                          <label htmlFor="is_public_check" className="text-xs font-bold text-primary uppercase tracking-wider cursor-pointer">Public Visibility</label>
                        </div>
                      </div>
                      
                      <div className="space-y-3 pt-3 border-t border-surface-200 dark:border-white/10">
                        <h4 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Discovery Filters (Optional)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-surface-500 uppercase">Category</label>
                            <input name="category" type="text" className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" placeholder="e.g. Residential" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-surface-500 uppercase">City</label>
                            <input name="city" type="text" className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" placeholder="e.g. New York" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-surface-500 uppercase">Country</label>
                            <input name="country" type="text" className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" placeholder="e.g. USA" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-surface-200 dark:border-white/10 shrink-0 bg-surface-100/60 dark:bg-surface-800/40">
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full h-11 bg-accent text-background font-extrabold uppercase text-xs tracking-wider hover:opacity-90 transition-all rounded-xl shadow-sm disabled:opacity-50"
                      >
                        {isLoading ? "Ingesting Data..." : "Synchronize Project"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "organization" && (
           <motion.div initial="hidden" animate="show" variants={{hidden: {opacity: 0}, show: {opacity: 1, transition: {staggerChildren: 0.1}}}} className="max-w-4xl space-y-8">
              {organizations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {organizations.map((org) => (
                    <motion.div 
                      key={org.id} 
                      variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}}
                      whileHover={{ rotateY: 2, rotateX: -2, y: -5, z: 20 }}
                      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                      className="bg-surface-100 border-surface-200 p-8 border border-surface-200 rounded-2xl shadow-sm space-y-4 hover:border-accent transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-accent text-background rounded-xl flex items-center justify-center font-bold text-xl">
                          {(org.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-2 py-1 rounded">Active Practice</span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-primary tracking-tight">{org.name}</h3>
                        <p className="text-[10px] text-surface-400 uppercase tracking-widest font-mono">{org.uid}</p>
                      </div>
                      <Link href="/dashboard/organization" className="block w-full py-3 bg-surface-50 border border-surface-100 text-center text-[10px] font-bold uppercase tracking-widest hover:opacity-90 hover:text-white transition-all">
                        Access Practice Dashboard
                      </Link>
                    </motion.div>
                  ))}
                  <Link href="/dashboard/organization?create=true" className="border-2 border-dashed border-surface-200 rounded-2xl flex flex-col items-center justify-center p-8 gap-4 hover:border-accent hover:bg-surface-50 transition-all group">
                    <div className="w-12 h-12 bg-surface-50 rounded-full flex items-center justify-center text-surface-300 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Establish New Entity</span>
                  </Link>
                </div>
              ) : (
                <motion.section variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} className="bg-surface-100 border-surface-200 p-16 border border-surface-200 rounded-2xl shadow-sm text-center space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-30" />
                  <div className="w-24 h-24 bg-surface-50 rounded-3xl mx-auto flex items-center justify-center text-surface-200 border border-surface-100 shadow-inner">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m0 10V4m-4 6h4m1 5h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-primary tracking-tight">Organizational Affiliation</h2>
                    <p className="text-sm text-surface-500 text-surface-400 max-w-md mx-auto leading-relaxed">You are currently operating under a <span className="font-bold text-accent italic">Solo Identity</span>. Synchronize with a professional firm to enable enterprise resource planning and team collaboration.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link href="/dashboard/organization" className="w-full sm:w-auto px-10 h-14 bg-accent text-background font-bold uppercase text-[10px] tracking-[0.25em] hover:bg-accent transition-all shadow-lg shadow-primary/20 flex items-center justify-center">
                      Link to Firm
                    </Link>
                    <Link href="/dashboard/organization?create=true" className="w-full sm:w-auto px-10 h-14 border-2 border-surface-200 text-surface-500 text-surface-400 font-bold uppercase text-[10px] tracking-[0.25em] hover:border-primary hover:text-primary transition-all flex items-center justify-center">
                      Register New Entity
                    </Link>
                  </div>
                </motion.section>
              )}
           </motion.div>
        )}

        {activeTab === "activity" && (
          <motion.div initial="hidden" animate="show" variants={{hidden: {opacity: 0}, show: {opacity: 1, transition: {staggerChildren: 0.1}}}} className="max-w-4xl space-y-8">
            <motion.section variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} className="bg-surface-100 border-surface-200 p-12 border border-surface-200 rounded-2xl shadow-sm space-y-12">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Operational Timeline</h2>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest">Immutable audit trail of identity modifications</p>
              </div>
              <div className="relative pl-10 space-y-16 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-accent before:via-surface-200 before:to-surface-100">
                {[
                  { date: "May 15, 2026", event: "Professional Specification Initialized", desc: "Digital footprint and industrial DNA synchronized with central repository.", icon: "✓" },
                  { date: "May 10, 2026", event: "Classification Applied", desc: `Identity categorized as ${categorySlug.toUpperCase()} in the primary index.`, icon: "⚓" },
                  { date: "May 05, 2026", event: "Identity Provisioned", desc: "Security credentials and core account layer established.", icon: "●" }
                ].map((item, idx) => (
                  <motion.div key={idx} variants={{hidden: {opacity: 0, x: -20}, show: {opacity: 1, x: 0}}} className="relative">
                    <div className="absolute -left-[50px] top-0 w-5 h-5 bg-surface-100 border-surface-200 border-2 border-accent rounded-full flex items-center justify-center text-[10px] font-bold text-accent z-10 shadow-sm shadow-accent/20">
                      {item.icon}
                    </div>
                    <div className="space-y-2 group">
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em]">{item.date}</p>
                      <h3 className="text-base font-bold text-primary group-hover:text-accent transition-colors">{item.event}</h3>
                      <p className="text-sm text-surface-500 text-surface-400 leading-relaxed max-w-2xl">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </motion.div>
        )}

        {activeTab === "security" && (
          <motion.div initial="hidden" animate="show" variants={{hidden: {opacity: 0}, show: {opacity: 1, transition: {staggerChildren: 0.1}}}} className="max-w-3xl space-y-8">
            <motion.section variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} className="bg-surface-100 border-surface-200 p-10 border border-surface-200 rounded-2xl shadow-sm space-y-10">
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] border-l-4 border-red-500 pl-4">Security Specification</h2>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Manage authentication layers and credential rotation</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Current Security Token</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">New Security Token</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Verify New Token</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all" />
                  </div>
                  <button onClick={handleChangePassword} disabled={isLoading} className="w-full h-14 bg-accent text-background font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-all shadow-xl shadow-primary/20 mt-4 disabled:opacity-50">
                    {isLoading ? "Processing..." : "Rotate Security Credentials"}
                  </button>
                </div>
                <div className="bg-surface-50 rounded-2xl p-8 space-y-4 border border-surface-100 flex flex-col justify-center">
                  <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">Two-Factor Authentication</h3>
                  <p className="text-[11px] text-surface-500 text-surface-400 leading-relaxed">
                    Protect your account with an extra layer of security. Multi-factor authentication is recommended for all accounts.
                  </p>
                  <div className="pt-4">
                    {user?.is_2fa_enabled ? (
                      <button 
                        onClick={() => setIsDisable2FAModalOpen(true)}
                        className="w-full h-12 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold uppercase text-[10px] tracking-[0.2em] border border-red-200 dark:border-red-800/30 hover:bg-red-100 transition-all rounded-lg"
                      >
                        Disable 2FA
                      </button>
                    ) : (
                      <button 
                        onClick={initiate2FASetup}
                        disabled={isLoading}
                        className="w-full h-12 bg-accent text-background font-bold uppercase text-[10px] tracking-[0.2em] hover:opacity-90 transition-all shadow-lg shadow-accent/20 rounded-lg"
                      >
                        {isLoading ? "Loading..." : "Enable 2FA Protection"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} className="bg-surface-100 border-surface-200 p-10 border border-surface-200 rounded-2xl shadow-sm space-y-6">
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] border-l-4 border-accent pl-4">Change Email Address</h2>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Update the primary communication channel</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">New Email Address</label>
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new.email@example.com" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 text-surface-400 uppercase tracking-widest">Verify Password</label>
                    <input type="password" value={changeEmailPassword} onChange={e => setChangeEmailPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all" />
                  </div>
                  <button onClick={handleRequestEmailChange} disabled={isLoading} className="w-full h-14 bg-surface-800 text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:opacity-90 transition-all shadow-xl shadow-surface-800/20 mt-4 disabled:opacity-50">
                    {isLoading ? "Processing..." : "Request Email Change"}
                  </button>
                </div>
              </div>
            </motion.section>

            <motion.section variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} className="bg-surface-100 border-surface-200 p-10 border border-surface-200 rounded-2xl shadow-sm space-y-6">
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] border-l-4 border-accent pl-4">Active Sessions</h2>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Manage and revoke active logins across devices</p>
              </div>
              <div className="space-y-4 pt-4">
                {sessions.map(session => (
                  <div key={session.id} className="flex justify-between items-center bg-surface-50 p-4 border border-surface-100 rounded-xl">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-primary">{session.device_name || "Unknown Device"} ({session.ip_address})</p>
                      <p className="text-[10px] text-surface-500 text-surface-400 uppercase tracking-widest">Last Active: {new Date(session.last_active_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleRevokeSession(session.id)} className="text-[10px] text-red-500 uppercase font-bold tracking-widest hover:text-red-700">Revoke</button>
                  </div>
                ))}
                {sessions.length === 0 && <p className="text-xs text-surface-500 text-surface-400">No active sessions found.</p>}
              </div>
            </motion.section>

            <motion.section variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} className="bg-surface-100 border-surface-200 p-10 border border-surface-200 rounded-2xl shadow-sm space-y-6">
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] border-l-4 border-accent pl-4">Privacy & Visibility</h2>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Manage your public discovery presence</p>
              </div>
              <div className="flex items-center justify-between p-6 bg-surface-50 border border-surface-100 rounded-xl">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Public Profile</h3>
                  <p className="text-xs text-surface-500 text-surface-400 max-w-md leading-relaxed">
                    When disabled, your identity and all portfolio items are completely hidden from the public discovery network. You will operate in stealth mode.
                  </p>
                </div>
                <button 
                  onClick={handleToggleVisibility}
                  disabled={isLoading}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none ${
                    (user?.profile?.is_public ?? true) ? 'bg-accent' : 'bg-surface-300'
                  }`}
                >
                  <span className="sr-only">Toggle Public Profile</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-surface-100 border-surface-200 shadow ring-0 transition duration-300 ease-in-out ${
                      (user?.profile?.is_public ?? true) ? 'translate-x-3' : '-translate-x-3'
                    }`}
                  />
                </button>
              </div>
            </motion.section>

            <motion.section variants={{hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}} whileHover={{ scale: 1.01, boxShadow: "0px 0px 60px rgba(239,68,68,0.3)" }} className="bg-red-50/50 dark:bg-red-900/10 backdrop-blur-md border border-red-500/30 p-10 rounded-3xl space-y-6 shadow-[0_0_40px_rgba(239,68,68,0.1)] relative overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSIjZWY0NDQ0IiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBmaWxsPSJub25lIj48cGF0aCBkPSJNMCAwTDYwIDYwTTAlMjA2MEw2MCUwIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <h3 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-[0.3em]">Critical Decommission Zone</h3>
              </div>
              <p className="relative z-10 text-xs text-red-800/70 dark:text-red-200/70 leading-relaxed max-w-lg font-medium">Initiating identity decommissioning will permanently terminate all project access, membership tokens, and audit logs associated with this UID. (30-day grace period applies).</p>
              <div className="relative z-10 flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={handleExportData}
                  disabled={isLoading}
                  className="px-6 py-3.5 bg-surface-100/50 backdrop-blur-md border border-red-500/20 text-red-900 dark:text-red-300 font-bold uppercase text-[10px] tracking-widest hover:bg-red-500/10 transition-all rounded-xl"
                >
                  Download GDPR Data Export
                </button>
                <button 
                  onClick={() => setIsDecommissionModalOpen(true)}
                  className="px-6 py-3.5 bg-red-600/90 backdrop-blur-md text-white font-bold uppercase text-[10px] tracking-widest hover:bg-red-500 transition-all rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                >
                  Decommission System Identity
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </div>

      {/* Decommission Modal */}
      {isDecommissionModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-md max-h-[85vh] rounded-2xl overflow-y-auto shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200 border-t-4 border-red-600">
            <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">Confirm Decommission</h3>
            <p className="text-xs text-surface-500 leading-relaxed font-medium">
              This action will schedule your account for permanent anonymization in 30 days. You will immediately lose access to all projects and practices.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Verify Password</label>
              <input 
                type="password" 
                value={decommissionPassword}
                onChange={(e) => setDecommissionPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-10 px-3.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl outline-none focus:border-red-500 text-xs font-semibold text-primary"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setIsDecommissionModalOpen(false); setDecommissionPassword(""); }}
                className="w-full h-10 bg-surface-200 text-surface-700 font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-surface-300 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDecommission}
                disabled={!decommissionPassword || isLoading}
                className="w-full h-10 bg-red-600 text-white font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Confirm & Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropping Modal */}
      {isCropModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-lg max-h-[85vh] rounded-2xl overflow-y-auto shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200">
              <h3 className="text-sm font-extrabold text-primary tracking-tight">Adjust Profile Image</h3>
              <button 
                onClick={() => setIsCropModalOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-200 text-surface-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center max-h-[350px] overflow-hidden bg-surface-100 border border-surface-200 rounded-xl">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img ref={imgRef} src={imgSrc} alt="Crop preview" onLoad={onImageLoad} className="max-h-[350px] object-contain" />
              </ReactCrop>
            </div>
            <button 
              onClick={handleCropSubmit}
              disabled={!completedCrop || isLoading}
              className="w-full h-11 bg-accent text-background font-extrabold uppercase text-xs tracking-wider hover:opacity-90 transition-all disabled:opacity-50 shadow-sm rounded-xl"
            >
              {isLoading ? "Saving..." : "Crop & Save Image"}
            </button>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {is2FASetupModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-md max-h-[85vh] rounded-2xl overflow-y-auto shadow-2xl p-5 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-surface-200 pb-3">
              <h3 className="text-sm font-extrabold text-primary tracking-tight">
                {recoveryCodes.length > 0 ? "Recovery Codes" : "Setup 2FA"}
              </h3>
              <button 
                onClick={() => {
                  setIs2FASetupModalOpen(false);
                  setRecoveryCodes([]);
                  setMfaCode("");
                }} 
                className="w-7 h-7 rounded-full bg-surface-200 text-surface-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {recoveryCodes.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 text-amber-800 text-xs font-semibold">
                  <strong>Save these recovery codes in a safe place!</strong> They are the only way to access your account if you lose your device.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code, idx) => (
                    <div key={idx} className="bg-surface-100 border border-surface-200 p-2.5 text-center font-mono font-bold text-xs tracking-wider rounded-lg">
                      {code}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => { setIs2FASetupModalOpen(false); setRecoveryCodes([]); setMfaCode(""); }} 
                  className="w-full h-11 bg-accent text-background font-extrabold uppercase text-xs tracking-wider rounded-xl shadow-sm"
                >
                  I Have Saved Them
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-surface-500 leading-relaxed text-center font-medium">
                  Scan the QR code below with your authenticator app (Google Authenticator / Authy).
                </p>
                
                <div className="flex justify-center bg-surface-100 p-4 border border-surface-200 rounded-xl mx-auto w-max">
                  <QRCodeSVG value={mfaUri} size={180} />
                </div>
                
                <div className="text-center">
                  <p className="text-[10px] text-surface-400 uppercase tracking-wider font-bold mb-1">Manual Entry Code:</p>
                  <code className="text-xs bg-surface-100 px-3 py-1.5 rounded-lg border border-surface-200 font-mono text-primary font-bold">
                    {mfaSecret}
                  </code>
                </div>

                <div className="space-y-3 pt-3 border-t border-surface-200">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Verify Code</label>
                  <input 
                    type="text" 
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    maxLength={6}
                    placeholder="123456" 
                    className="w-full h-11 text-center text-xl tracking-[0.4em] font-mono px-4 bg-surface-100 border border-surface-200 rounded-xl outline-none focus:border-accent text-primary" 
                  />
                  <button 
                    onClick={confirm2FASetup}
                    disabled={mfaCode.length !== 6 || isLoading}
                    className="w-full h-11 bg-accent text-background font-extrabold uppercase text-xs tracking-wider rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {isLoading ? "Verifying..." : "Verify & Enable Protection"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {isDisable2FAModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-100 border-surface-200 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-[0.3em]">Disable 2FA</h3>
              <p className="text-sm text-surface-600 text-surface-300">Enter your password to confirm disabling two-factor authentication.</p>
              <input 
                type="password" 
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Your Password"
                className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => { setIsDisable2FAModalOpen(false); setDisablePassword(""); }}
                  className="w-full h-12 bg-surface-100 text-surface-600 text-surface-300 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-surface-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={disable2FA}
                  disabled={!disablePassword || isLoading}
                  className="w-full h-12 bg-red-600 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? "Disabling..." : "Disable"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
