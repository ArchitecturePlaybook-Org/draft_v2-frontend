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
    setIsLoading(true);
    try {
      const { secret, qr_uri } = await authApi.setup2FA();
      setMfaSecret(secret);
      setMfaUri(qr_uri);
      setIs2FASetupModalOpen(true);
    } catch (err) {
      console.error(err);
      alert("Failed to initiate 2FA setup");
    } finally {
      setIsLoading(false);
    }
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
      <div className="bg-white border border-surface-200 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-8 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-full bg-primary/5 arch-grid opacity-20 pointer-events-none" />
        
        <div className="relative group">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarUpload} 
            className="hidden" 
            accept="image/*" 
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-28 h-28 rounded-2xl bg-primary flex items-center justify-center text-4xl text-white font-bold shadow-xl border-4 border-white overflow-hidden relative group cursor-pointer"
          >
            {user.profile?.profile_picture ? (
              <img src={user.profile.profile_picture as string} alt={user.name || user.email} className="w-full h-full object-cover" />
            ) : (
              <span>{(user.name || user.email || "?").charAt(0).toUpperCase()}</span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[10px] text-white font-bold uppercase tracking-[0.2em]">Upload</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-primary tracking-tight">{user.name || user.email.split('@')[0]}</h1>
            <p className="text-surface-400 text-sm font-medium">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
             <span className="px-3 py-1 bg-primary text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-md">
               {categorySlug}
             </span>
             <span className="px-3 py-1 bg-accent/10 text-accent text-[9px] font-bold uppercase tracking-[0.2em] rounded-md border border-accent/20">
               {user.role || "Standard Access"}
             </span>
          </div>
        </div>

        <div className="w-full md:w-64 space-y-3">
          <div className="flex justify-between items-end">
             <label className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em]">Profile Integrity</label>
             <span className="text-xs font-bold text-primary">{completionPercentage}%</span>
          </div>
          <div className="h-2 w-full bg-surface-100 rounded-full overflow-hidden border border-surface-100">
            <div 
              className="h-full bg-accent transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--color-accent),0.5)]" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-200 overflow-x-auto no-scrollbar scroll-smooth">
        {(["overview", "professional", "portfolio", "organization", "security", "activity"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setIsEditing(false); }}
            className={`px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === tab 
                ? "border-accent text-accent" 
                : "border-transparent text-surface-400 hover:text-primary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm space-y-8">
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
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Professional Biography</label>
                        {isEditing ? (
                            <textarea 
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full h-40 p-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm leading-relaxed"
                                placeholder="Define your professional expertise and architectural vision..."
                            />
                        ) : (
                            <p className="text-primary leading-relaxed text-sm bg-surface-50/50 p-6 rounded-xl border border-dashed border-surface-200">{bio || "Biographical data missing. Please update your specification."}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Global Contact Line</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
                                    placeholder="+XX XXXXX XXXXX"
                                />
                            ) : (
                                <p className="font-bold text-primary text-sm tracking-tight">{phone || "No contact line defined"}</p>
                            )}
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <div className="pt-8 border-t border-surface-100 flex justify-end gap-4">
                        <button 
                            onClick={handleUpdate}
                            disabled={isLoading}
                            className="px-10 h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.25em] hover:bg-accent transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            {isLoading ? "Synchronizing..." : "Synchronize Identity"}
                        </button>
                    </div>
                )}
                {success && <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-[0.2em] text-center bg-emerald-50 py-3 rounded-lg border border-emerald-100">{success}</p>}
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
                                        <span key={idx} className="px-3 py-2 bg-white border border-surface-200 text-primary text-[10px] font-bold uppercase tracking-tight rounded-md shadow-sm hover:border-accent transition-colors">
                                            {spec}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
              )}
            </div>

            <div className="space-y-8">
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

              <section className="bg-white border border-surface-200 p-8 rounded-2xl space-y-6 shadow-sm">
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
            </div>
          </div>
        )}

        {activeTab === "professional" && (
          <div className="max-w-4xl space-y-8">
            <section className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm space-y-10">
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
                  <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-4">Category Specifics</h3>
                  {currentSchema.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">{field.label}</label>
                      {isEditing ? (
                        field.type === "select" ? (
                          <select 
                            value={String(metadata[field.key] || "")} 
                            onChange={e => updateMetadataField(field.key, e.target.value)}
                            className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
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
                            className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" 
                          />
                        )
                      ) : (
                        <p className="text-sm font-bold text-primary tracking-tight bg-surface-50/30 p-3 rounded-lg border border-surface-100 min-h-[44px] flex items-center">
                          {String(metadata[field.key] || "—")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-8 border-l border-surface-100 pl-12">
                  <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-4">Digital Footprint</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Official Portfolio/Website</label>
                      {isEditing ? (
                        <input type="text" value={website} onChange={e => setWebsite(e.target.value)} className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" placeholder="https://..." />
                      ) : (
                        <a href={website} target="_blank" className="text-sm font-bold text-accent hover:underline flex items-center gap-2 group">
                          {website || "Unspecified"}
                          <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </a>
                      )}
                    </div>
                    {Object.entries(socialLinks).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest capitalize">{key}</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={String(value)} 
                            onChange={e => setSocialLinks({...socialLinks, [key]: e.target.value})} 
                            className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" 
                            placeholder={`Your ${key} profile URL`}
                          />
                        ) : (
                          <p className="text-sm text-primary font-medium">{String(value) || "—"}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="pt-10 border-t border-surface-100 flex justify-end">
                  <button onClick={handleUpdate} disabled={isLoading} className="px-10 h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-all shadow-xl shadow-primary/20">
                    {isLoading ? "Saving Specification..." : "Commit Professional Data"}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
...
        {activeTab === "portfolio" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm space-y-8">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Work Portfolio</h2>
                  <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Showcase your architectural projects to the public</p>
                </div>
                <button 
                  onClick={() => setIsUploadingPortfolio(true)}
                  className="px-6 py-3 bg-primary text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-lg hover:bg-accent transition-all shadow-lg shadow-primary/20"
                >
                  Add Project
                </button>
              </div>

              {portfolioItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portfolioItems.map((item) => (
                    <div key={item.id} className="group relative bg-surface-50 rounded-2xl border border-surface-100 overflow-hidden hover:border-accent transition-all">
                      <div className="aspect-[4/3] relative overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-surface-200 flex items-center justify-center text-xs text-surface-400 font-bold uppercase tracking-widest">
                            No Image
                          </div>
                        )}
                        
                        {!item.is_owner && (
                          <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest backdrop-blur-sm">
                            Contributor
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          {item.is_owner ? (
                            <button 
                              onClick={async () => {
                                if (confirm("Permanently decommission this project from your portfolio?")) {
                                  try {
                                    await portfoliosApi.deletePortfolioItem(item.id);
                                    setPortfolioItems(prev => prev.filter(p => p.id !== item.id));
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          ) : (
                            <Link 
                              href={`/portfolio/${item.id}`} 
                              className="w-10 h-10 bg-white text-primary rounded-xl flex items-center justify-center hover:bg-surface-50 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="p-5 space-y-1">
                        <h3 className="text-sm font-bold text-primary truncate">{item.title}</h3>
                        <p className="text-[10px] text-surface-400 uppercase tracking-widest font-mono">
                          {item.project_date || "Date Unspecified"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4 border-2 border-dashed border-surface-100 rounded-2xl bg-surface-50/30">
                  <div className="w-16 h-16 bg-surface-100 rounded-2xl mx-auto flex items-center justify-center text-surface-300">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-primary">No portfolio items detected</p>
                    <p className="text-[10px] text-surface-400 uppercase tracking-widest">Initialize your digital showcase to attract clients</p>
                  </div>
                </div>
              )}
            </section>

            {isUploadingPortfolio && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="p-8 space-y-8">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Project Specification</h3>
                      <button onClick={() => setIsUploadingPortfolio(false)} className="text-surface-400 hover:text-primary transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Project Title</label>
                        <input name="title" required className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" placeholder="e.g. Minimalist Glass Villa" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Main Thumbnail</label>
                          <input type="file" name="image" required accept="image/*" className="w-full text-sm text-surface-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Gallery Images</label>
                          <input type="file" name="images" multiple accept="image/*" className="w-full text-sm text-surface-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Video URL (Optional)</label>
                        <input name="video_url" type="url" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" placeholder="e.g. https://www.youtube.com/watch?v=..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Execution Description</label>
                        <textarea name="description" className="w-full h-32 p-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" placeholder="Define the architectural parameters and outcome..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Project Date</label>
                          <input type="date" name="project_date" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" />
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                          <input 
                            type="checkbox" 
                            name="is_public" 
                            id="is_public_check" 
                            value="true"
                            defaultChecked 
                            className="w-5 h-5 rounded-lg border-surface-200 text-accent focus:ring-accent/20" 
                          />
                          <label htmlFor="is_public_check" className="text-[10px] font-bold text-surface-600 uppercase tracking-widest cursor-pointer">Public Visibility</label>
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-4 border-t border-surface-100">
                        <h4 className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Discovery Filters (Optional)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Category</label>
                            <input name="category" type="text" className="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" placeholder="e.g. Residential" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">City</label>
                            <input name="city" type="text" className="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" placeholder="e.g. New York" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Country</label>
                            <input name="country" type="text" className="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" placeholder="e.g. USA" />
                          </div>
                        </div>
                      </div>
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-all shadow-xl shadow-primary/20"
                      >
                        {isLoading ? "Ingesting Data..." : "Synchronize Project"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "organization" && (
           <div className="max-w-4xl space-y-8">
              {organizations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {organizations.map((org) => (
                    <div key={org.id} className="bg-white p-8 border border-surface-200 rounded-2xl shadow-sm space-y-4 hover:border-accent transition-all group">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-xl">
                          {(org.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-2 py-1 rounded">Active Practice</span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-primary tracking-tight">{org.name}</h3>
                        <p className="text-[10px] text-surface-400 uppercase tracking-widest font-mono">{org.uid}</p>
                      </div>
                      <Link href="/dashboard/organization" className="block w-full py-3 bg-surface-50 border border-surface-100 text-center text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                        Access Practice Dashboard
                      </Link>
                    </div>
                  ))}
                  <Link href="/dashboard/organization?create=true" className="border-2 border-dashed border-surface-200 rounded-2xl flex flex-col items-center justify-center p-8 gap-4 hover:border-accent hover:bg-surface-50 transition-all group">
                    <div className="w-12 h-12 bg-surface-50 rounded-full flex items-center justify-center text-surface-300 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Establish New Entity</span>
                  </Link>
                </div>
              ) : (
                <section className="bg-white p-16 border border-surface-200 rounded-2xl shadow-sm text-center space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-30" />
                  <div className="w-24 h-24 bg-surface-50 rounded-3xl mx-auto flex items-center justify-center text-surface-200 border border-surface-100 shadow-inner">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m0 10V4m-4 6h4m1 5h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-primary tracking-tight">Organizational Affiliation</h2>
                    <p className="text-sm text-surface-500 max-w-md mx-auto leading-relaxed">You are currently operating under a <span className="font-bold text-accent italic">Solo Identity</span>. Synchronize with a professional firm to enable enterprise resource planning and team collaboration.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link href="/dashboard/organization" className="w-full sm:w-auto px-10 h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.25em] hover:bg-accent transition-all shadow-lg shadow-primary/20 flex items-center justify-center">
                      Link to Firm
                    </Link>
                    <Link href="/dashboard/organization?create=true" className="w-full sm:w-auto px-10 h-14 border-2 border-surface-200 text-surface-500 font-bold uppercase text-[10px] tracking-[0.25em] hover:border-primary hover:text-primary transition-all flex items-center justify-center">
                      Register New Entity
                    </Link>
                  </div>
                </section>
              )}
           </div>
        )}

        {activeTab === "activity" && (
          <div className="max-w-4xl space-y-8">
            <section className="bg-white p-12 border border-surface-200 rounded-2xl shadow-sm space-y-12">
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
                  <div key={idx} className="relative">
                    <div className="absolute -left-[50px] top-0 w-5 h-5 bg-white border-2 border-accent rounded-full flex items-center justify-center text-[10px] font-bold text-accent z-10 shadow-sm shadow-accent/20">
                      {item.icon}
                    </div>
                    <div className="space-y-2 group">
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em]">{item.date}</p>
                      <h3 className="text-base font-bold text-primary group-hover:text-accent transition-colors">{item.event}</h3>
                      <p className="text-sm text-surface-500 leading-relaxed max-w-2xl">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "security" && (
          <div className="max-w-3xl space-y-8">
            <section className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm space-y-10">
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] border-l-4 border-red-500 pl-4">Security Specification</h2>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Manage authentication layers and credential rotation</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Current Security Token</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">New Security Token</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Verify New Token</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all" />
                  </div>
                  <button onClick={handleChangePassword} disabled={isLoading} className="w-full h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-all shadow-xl shadow-primary/20 mt-4 disabled:opacity-50">
                    {isLoading ? "Processing..." : "Rotate Security Credentials"}
                  </button>
                </div>
                <div className="bg-surface-50 rounded-2xl p-8 space-y-4 border border-surface-100 flex flex-col justify-center">
                  <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">Two-Factor Authentication</h3>
                  <p className="text-[11px] text-surface-500 leading-relaxed">
                    Protect your account with an extra layer of security. Multi-factor authentication is recommended for all accounts.
                  </p>
                  <div className="pt-4">
                    {user?.is_2fa_enabled ? (
                      <button 
                        onClick={() => setIsDisable2FAModalOpen(true)}
                        className="w-full h-12 bg-red-50 text-red-600 font-bold uppercase text-[10px] tracking-[0.2em] border border-red-200 hover:bg-red-100 transition-all rounded-lg"
                      >
                        Disable 2FA
                      </button>
                    ) : (
                      <button 
                        onClick={initiate2FASetup}
                        disabled={isLoading}
                        className="w-full h-12 bg-accent text-white font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-primary transition-all shadow-lg shadow-accent/20 rounded-lg"
                      >
                        {isLoading ? "Loading..." : "Enable 2FA Protection"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm space-y-6">
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] border-l-4 border-accent pl-4">Change Email Address</h2>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Update the primary communication channel</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">New Email Address</label>
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new.email@example.com" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Verify Password</label>
                    <input type="password" value={changeEmailPassword} onChange={e => setChangeEmailPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all" />
                  </div>
                  <button onClick={handleRequestEmailChange} disabled={isLoading} className="w-full h-14 bg-surface-800 text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-primary transition-all shadow-xl shadow-surface-800/20 mt-4 disabled:opacity-50">
                    {isLoading ? "Processing..." : "Request Email Change"}
                  </button>
                </div>
              </div>
            </section>

            <section className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm space-y-6">
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] border-l-4 border-accent pl-4">Active Sessions</h2>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Manage and revoke active logins across devices</p>
              </div>
              <div className="space-y-4 pt-4">
                {sessions.map(session => (
                  <div key={session.id} className="flex justify-between items-center bg-surface-50 p-4 border border-surface-100 rounded-xl">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-primary">{session.device_name || "Unknown Device"} ({session.ip_address})</p>
                      <p className="text-[10px] text-surface-500 uppercase tracking-widest">Last Active: {new Date(session.last_active_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleRevokeSession(session.id)} className="text-[10px] text-red-500 uppercase font-bold tracking-widest hover:text-red-700">Revoke</button>
                  </div>
                ))}
                {sessions.length === 0 && <p className="text-xs text-surface-500">No active sessions found.</p>}
              </div>
            </section>

            <section className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm space-y-6">
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] border-l-4 border-accent pl-4">Privacy & Visibility</h2>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest font-medium">Manage your public discovery presence</p>
              </div>
              <div className="flex items-center justify-between p-6 bg-surface-50 border border-surface-100 rounded-xl">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Public Profile</h3>
                  <p className="text-xs text-surface-500 max-w-md leading-relaxed">
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
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-300 ease-in-out ${
                      (user?.profile?.is_public ?? true) ? 'translate-x-3' : '-translate-x-3'
                    }`}
                  />
                </button>
              </div>
            </section>

            <section className="bg-red-50 border border-red-100 p-10 rounded-2xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <h3 className="text-xs font-bold text-red-900 uppercase tracking-[0.2em]">Critical Decommission Zone</h3>
              </div>
              <p className="text-xs text-red-700 leading-relaxed max-w-lg">Initiating identity decommissioning will permanently terminate all project access, membership tokens, and audit logs associated with this UID. (30-day grace period applies).</p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={handleExportData}
                  disabled={isLoading}
                  className="px-6 py-3 bg-white text-surface-700 border border-surface-300 font-bold uppercase text-[10px] tracking-widest hover:bg-surface-50 transition-all rounded-lg"
                >
                  Download GDPR Data Export
                </button>
                <button 
                  onClick={() => setIsDecommissionModalOpen(true)}
                  className="px-6 py-3 bg-red-600 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all rounded-lg shadow-lg shadow-red-500/20"
                >
                  Decommission System Identity
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Decommission Modal */}
      {isDecommissionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6 border-t-8 border-red-600">
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-[0.3em]">Confirm Decommission</h3>
              <p className="text-sm text-surface-600 leading-relaxed">
                This action will schedule your account for permanent anonymization in 30 days. You will immediately lose access to all projects and organizations.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Verify Password</label>
                <input 
                  type="password" 
                  value={decommissionPassword}
                  onChange={(e) => setDecommissionPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => { setIsDecommissionModalOpen(false); setDecommissionPassword(""); }}
                  className="w-full h-12 bg-surface-100 text-surface-600 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-surface-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDecommission}
                  disabled={!decommissionPassword || isLoading}
                  className="w-full h-12 bg-red-600 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? "Processing..." : "Confirm & Deactivate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropping Modal */}
      {isCropModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Adjust Profile Image</h3>
                <button 
                  onClick={() => setIsCropModalOpen(false)}
                  className="text-surface-400 hover:text-primary transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex justify-center max-h-[400px] overflow-hidden bg-surface-50 border border-surface-200 rounded-xl">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img ref={imgRef} src={imgSrc} alt="Crop preview" onLoad={onImageLoad} className="max-h-[400px] object-contain" />
                </ReactCrop>
              </div>
              <button 
                onClick={handleCropSubmit}
                disabled={!completedCrop || isLoading}
                className="w-full h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-all disabled:opacity-50 shadow-xl rounded-xl"
              >
                {isLoading ? "Saving..." : "Crop & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {is2FASetupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">
                  {recoveryCodes.length > 0 ? "Recovery Codes" : "Setup 2FA"}
                </h3>
                <button 
                  onClick={() => {
                    setIs2FASetupModalOpen(false);
                    setRecoveryCodes([]);
                    setMfaCode("");
                  }} 
                  className="text-surface-400 hover:text-primary transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {recoveryCodes.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-800 text-sm">
                    <strong>Save these recovery codes in a safe place!</strong> They are the only way to access your account if you lose your device.
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {recoveryCodes.map((code, idx) => (
                      <div key={idx} className="bg-surface-50 border border-surface-200 p-3 text-center font-mono font-bold tracking-widest rounded-lg">
                        {code}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => { setIs2FASetupModalOpen(false); setRecoveryCodes([]); setMfaCode(""); }} 
                    className="w-full h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-all shadow-xl rounded-xl"
                  >
                    I Have Saved Them
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-surface-600 leading-relaxed text-center">
                    Scan the QR code below with your authenticator app (like Google Authenticator or Authy).
                  </p>
                  
                  <div className="flex justify-center bg-white p-4 border border-surface-200 rounded-xl mx-auto w-max">
                    <QRCodeSVG value={mfaUri} size={200} />
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xs text-surface-500 uppercase tracking-widest font-bold mb-2">Manual Entry Code:</p>
                    <code className="text-sm bg-surface-50 px-3 py-2 rounded-lg border border-surface-200 font-mono text-primary">
                      {mfaSecret}
                    </code>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-surface-100">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Verify Code</label>
                    <input 
                      type="text" 
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      maxLength={6}
                      placeholder="123456" 
                      className="w-full h-14 text-center text-2xl tracking-[0.5em] font-mono px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" 
                    />
                    <button 
                      onClick={confirm2FASetup}
                      disabled={mfaCode.length !== 6 || isLoading}
                      className="w-full h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-all disabled:opacity-50 shadow-xl rounded-xl"
                    >
                      {isLoading ? "Verifying..." : "Verify & Enable"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {isDisable2FAModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-[0.3em]">Disable 2FA</h3>
              <p className="text-sm text-surface-600">Enter your password to confirm disabling two-factor authentication.</p>
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
                  className="w-full h-12 bg-surface-100 text-surface-600 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-surface-200 transition-all"
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
