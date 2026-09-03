"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/domains/auth/api";
import { orgsApi } from "@/domains/orgs/api";
import { portfoliosApi, PortfolioItem } from "@/domains/portfolios/api";
import { QRCodeSVG } from "qrcode.react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { CATEGORY_SCHEMAS, calculateProfileCompleteness } from "@/lib/utils/profile";
import { EditPortfolioModal } from "@/components/portfolios/EditPortfolioModal";
import { CATEGORY_DATA } from "@/app/signup/categories";

type TabType = "overview" | "professional" | "portfolio" | "organization" | "security" | "activity";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allSpecializations, setAllSpecializations] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});

  const handleCheckboxToggle = (groupName: string, option: string) => {
    const current = selections[groupName] || [];
    const updated = current.includes(option)
      ? current.filter((i) => i !== option)
      : [...current, option];
    setSelections({ ...selections, [groupName]: updated });
  };

  const renderSubCategories = (data: any, path = ""): React.ReactNode => {
    if (Array.isArray(data)) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {data.map((item) => {
            const checked = (selections[path] || []).includes(item);
            return (
              <label
                key={item}
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all duration-300 ${
                  checked
                    ? "bg-accent/10 border-accent/50 shadow-[0_0_15px_rgba(255,186,8,0.15)] ring-1 ring-accent/20"
                    : "border-surface-200/50 bg-surface-100/50 backdrop-blur-md hover:bg-surface-50 hover:border-accent/30 hover:shadow-md"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 accent-accent rounded transition-all"
                  checked={checked}
                  onChange={() => handleCheckboxToggle(path, item)}
                />
                <span className={`text-sm font-medium transition-colors ${checked ? 'text-accent' : 'text-primary'}`}>{item}</span>
              </label>
            );
          })}
        </div>
      );
    } else if (typeof data === "object" && data !== null) {
      return (
        <div className="space-y-4 mt-3">
          {Object.keys(data).map((key) => (
            <div key={key} className={path ? "pl-4 border-l-2 border-surface-200" : ""} >
              <h4 className="font-bold text-primary text-sm tracking-wide">{key}</h4>
              {renderSubCategories(data[key], path ? `${path} > ${key}` : key)}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
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
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<PortfolioItem | null>(null);

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

  async function loadSpecializations() {
    try {
      const data = await authApi.getSpecializations();
      setAllSpecializations(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadOrgs();
    loadPortfolio();
    loadSpecializations();
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
    if (user) {
      setName(user.name || "");
      if (user.profile) {
        setMetadata(user.profile.metadata || {});
        setBio(user.profile.bio || "");
        setPhone(user.profile.phone_number || "");
        setWebsite(user.profile.website || "");
        setHeadline(String(user.profile.metadata?.headline || ""));
        setCompany(String(user.profile.metadata?.current_company || ""));
        setCity(String((user.profile as any).city || user.profile.metadata?.city || ""));
        setCountry(String((user.profile as any).country || user.profile.metadata?.country || ""));
        setSocialLinks({
          linkedin: String(user.profile.social_links?.linkedin || ""),
          github: String(user.profile.social_links?.github || ""),
          twitter: String(user.profile.social_links?.twitter || ""),
          portfolio: String(user.profile.social_links?.portfolio || ""),
          ...user.profile.social_links
        });
        
        if (user.profile.category_path?.selected) {
          setSelections(user.profile.category_path.selected);
        } else {
          setSelections({});
        }
      }
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
        name,
        bio,
        phone_number: phone,
        website,
        city,
        country,
        social_links: socialLinks,
        metadata: {
          ...metadata,
          headline,
          current_company: company,
          city,
          country,
        },
      });

      if (user?.profile?.category_path?.main) {
        await fetch("/api/v1/users/onboarding/complete/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_path: {
              main: user.profile.category_path.main,
              selected: selections,
            },
          }),
        });
      }

      const refreshedUser = await authApi.me();
      setUser(refreshedUser);
      toast.success("Profile specifications updated successfully.");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success("Security credentials updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestEmailChange() {
    if (!newEmail || !changeEmailPassword) {
      toast.error("Please provide your new email and current password.");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.requestEmailChange({ new_email: newEmail, password: changeEmailPassword });
      toast.success("Verification link sent to your new email address.");
      setNewEmail("");
      setChangeEmailPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to request email change");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevokeSession(sessionId: any) {
    try {
      await authApi.revokeSession(Number(sessionId));
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success("Session revoked.");
    } catch (err) {
      toast.error("Failed to revoke session");
    }
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
        setIsCropModalOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const crop = { unit: '%', width: 80, height: 80, x: 10, y: 10 } as Crop;
    setCrop(crop);
  }

  async function handleCropSubmit() {
    if (!completedCrop || !imgRef.current) return;
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
        toast.success("Profile picture updated.");
        setIsCropModalOpen(false);
      } catch (err) {
        console.error(err);
        toast.error("Failed to upload image.");
      } finally {
        setIsLoading(false);
      }
    }, "image/png");
  }

  const updateMetadataField = (key: string, value: any) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  async function initiate2FASetup() {
    toast.info("2FA backend services are under development.");
  }

  async function confirm2FASetup() {
    setIsLoading(true);
    try {
      const res = await authApi.confirm2FA(mfaCode);
      setRecoveryCodes(res.recovery_codes);
      setUser({ ...user!, is_2fa_enabled: true });
    } catch (err: any) {
      toast.error(err.message || "Invalid code");
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
      toast.success("2FA disabled.");
    } catch (err: any) {
      toast.error(err.message || "Failed to disable 2FA");
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
      toast.success("Data export completed.");
    } catch (err: any) {
      toast.error("Failed to export data");
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
      toast.error("Failed to decommission identity. " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return <div className="p-8 text-center text-xs font-bold text-accent animate-pulse uppercase tracking-widest">Initializing User Profile...</div>;

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Profile Header */}
      <div className="bg-surface-50/60 dark:bg-surface-900/60 backdrop-blur-xl border border-surface-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center gap-4 sm:gap-6 shadow-sm relative overflow-hidden">
        <div className="relative shrink-0">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarUpload} 
            className="hidden" 
            accept="image/*" 
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-accent text-background font-bold shadow-md border-2 border-surface-100 dark:border-surface-800 overflow-hidden relative group/avatar cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {user.profile?.profile_picture ? (
              <img 
                src={user.profile.profile_picture as string} 
                alt={user.name || user.email} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const parent = (e.currentTarget as HTMLImageElement).parentElement;
                  if (parent && !parent.querySelector('.fallback-initial')) {
                    const span = document.createElement('span');
                    span.className = 'fallback-initial text-2xl flex items-center justify-center h-full text-background font-bold';
                    span.innerText = (user.name || user.email || "?").charAt(0).toUpperCase();
                    parent.appendChild(span);
                  }
                }}
              />
            ) : (
              <span className="text-2xl flex items-center justify-center h-full">{(user.name || user.email || "?").charAt(0).toUpperCase()}</span>
            )}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <span className="text-[9px] text-white font-bold uppercase tracking-wider">Upload</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-2 text-center md:text-left min-w-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight truncate">{user.name || user.email.split('@')[0]}</h1>
            <p className="text-surface-400 text-xs font-medium truncate">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
             <span className="px-2.5 py-1 bg-accent/10 border border-accent/20 text-accent text-[9px] font-bold uppercase tracking-wider rounded-md">
               {categorySlug}
             </span>
             <span className="px-2.5 py-1 bg-surface-200/60 dark:bg-surface-800 text-primary text-[9px] font-bold uppercase tracking-wider rounded-md border border-surface-200 dark:border-white/10">
               {user.role || "Standard Access"}
             </span>
          </div>
        </div>

        <div className="w-full md:w-80 space-y-3 bg-surface-100/70 dark:bg-surface-800/50 p-4 rounded-xl border border-surface-200 dark:border-white/10 shrink-0">
          <div className="flex justify-between items-center text-xs font-extrabold uppercase tracking-wider">
             <span className="text-surface-400">Profile Completeness</span>
             <span className="text-accent font-black text-xs">{completionPercentage}%</span>
          </div>
          <div className="h-2 w-full bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-700 ease-out" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full pt-1">
            <button
              onClick={() => {
                setActiveTab("overview");
                setIsEditing(!isEditing);
              }}
              className={`w-full sm:flex-1 h-8 border rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                isEditing
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-accent text-background border-accent hover:opacity-90 shadow-2xs'
              }`}
            >
              {isEditing ? "Cancel Edit" : "✏️ Edit Profile"}
            </button>

            <Link 
              href={`/profile/${user.uid || user.id}`} 
              className="w-full sm:flex-1 h-8 bg-surface-200/80 hover:bg-surface-300 border border-surface-300/60 dark:border-white/10 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold text-foreground uppercase tracking-wider transition-all truncate"
              title="View Public Profile Page"
            >
              <span>🌐</span>
              <span className="truncate">Public View</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-200/70 dark:border-white/10 overflow-x-auto no-scrollbar relative">
        {(["overview", "professional", "portfolio", "organization", "security", "activity"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setIsEditing(false); }}
            className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all relative whitespace-nowrap ${
              activeTab === tab 
                ? "text-primary font-extrabold" 
                : "text-surface-400 hover:text-primary hover:bg-surface-100/50"
            }`}
          >
            <span className="relative z-10 capitalize">{tab}</span>
            {activeTab === tab && (
              <motion.div 
                layoutId="profileTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-accent rounded-t-full" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <section className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 p-4 sm:p-5 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-surface-200/80 dark:border-white/10 pb-3">
                    <h2 className="text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-accent pl-2.5">
                      Identity & Specifications
                    </h2>
                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg text-[10px] font-extrabold uppercase text-accent hover:bg-accent hover:text-background transition-all"
                    >
                        {isEditing ? "Cancel Edit" : "✏️ Edit Specifications"}
                    </button>
                </div>

                <div className="space-y-3.5">
                    {/* Basic Info: Name & Headline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Full Name</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                                    placeholder="e.g. Ar. Rajesh Kumar"
                                />
                            ) : (
                                <p className="font-bold text-primary text-xs bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5">{name || user.name || "Unspecified"}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Current Studio / Firm</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                                    placeholder="e.g. Mindspace Architectural Studio"
                                />
                            ) : (
                                <p className="font-semibold text-primary text-xs bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5">{company || "Unspecified"}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Professional Headline</label>
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={headline}
                                onChange={(e) => setHeadline(e.target.value)}
                                className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                                placeholder="e.g. Principal Architectural Consultant & BIM Specialist"
                            />
                        ) : (
                            <p className="font-semibold text-primary text-xs bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5">{headline || "Unspecified"}</p>
                        )}
                    </div>

                    {/* Location & Contact */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">City</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                                    placeholder="e.g. Bengaluru"
                                />
                            ) : (
                                <p className="font-semibold text-primary text-xs bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5">{city || "Unspecified"}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Country</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                                    placeholder="e.g. India"
                                />
                            ) : (
                                <p className="font-semibold text-primary text-xs bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5">{country || "Unspecified"}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Years of Exp.</label>
                            {isEditing ? (
                                <input 
                                    type="number" 
                                    value={Number(metadata.years_of_experience || 0)}
                                    onChange={(e) => updateMetadataField("years_of_experience", parseInt(e.target.value) || 0)}
                                    className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                                    placeholder="e.g. 14"
                                />
                            ) : (
                                <p className="font-semibold text-primary text-xs bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5">{metadata.years_of_experience ? `${metadata.years_of_experience} Years` : "Unspecified"}</p>
                            )}
                        </div>
                    </div>

                    {/* Specializations */}
                    <div className="space-y-2 mt-4 pt-4 border-t border-surface-200 dark:border-white/10">
                        <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Specializations</label>
                        {isEditing ? (
                            <div className="space-y-4">
                                {user?.profile?.category_path?.main && CATEGORY_DATA[user.profile.category_path.main] ? (
                                    renderSubCategories(CATEGORY_DATA[user.profile.category_path.main])
                                ) : (
                                    <p className="text-xs text-surface-400">No categorization available for your current role. Please update via onboarding.</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {Object.values(selections).flat().length > 0 ? (
                                    Object.entries(selections).map(([group, specs]) => (
                                        (specs as string[]).map((spec, idx) => (
                                            <span key={`${group}-${idx}`} className="px-2 py-1 rounded-md bg-surface-100/40 border border-surface-200/50 text-primary text-[10px] font-bold">
                                                {spec}
                                            </span>
                                        ))
                                    ))
                                ) : (
                                    <p className="font-semibold text-primary text-xs bg-surface-100/40 p-2.5 rounded-lg border border-surface-200/50">Unspecified</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Phone Number</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                                    placeholder="+91 98765 43210"
                                />
                            ) : (
                                <p className="font-semibold text-primary text-xs bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5">{phone || "Not specified"}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Website URL</label>
                            {isEditing ? (
                                <input 
                                    type="url" 
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary"
                                    placeholder="https://mindspacearch.in"
                                />
                            ) : (
                                <p className="font-semibold text-primary text-xs bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5">{website || "Not specified"}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Biography</label>
                        {isEditing ? (
                            <textarea 
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full h-20 p-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-medium leading-relaxed"
                                placeholder="Describe your professional background and architectural experience..."
                            />
                        ) : (
                            <p className="text-primary text-xs leading-relaxed bg-surface-100/40 dark:bg-surface-800/40 p-3 rounded-lg border border-surface-200/50 dark:border-white/5">{bio || "Biographical details not specified."}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Design Philosophy</label>
                        {isEditing ? (
                            <textarea 
                                value={String(metadata.design_philosophy || "")}
                                onChange={(e) => updateMetadataField("design_philosophy", e.target.value)}
                                className="w-full h-16 p-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-medium leading-relaxed"
                                placeholder="Describe your architectural design approach..."
                            />
                        ) : (
                            <p className="text-primary text-xs leading-relaxed bg-surface-100/40 dark:bg-surface-800/40 p-3 rounded-lg border border-surface-200/50 dark:border-white/5">{String(metadata.design_philosophy || "No design philosophy specified.")}</p>
                        )}
                    </div>

                </div>

                {isEditing && (
                    <div className="pt-3 border-t border-surface-200 dark:border-white/10 flex justify-end gap-2">
                        <button 
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-surface-200 dark:bg-surface-800 text-primary font-bold text-xs rounded-lg hover:bg-surface-300 transition-all uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onClick={handleUpdate}
                            disabled={isLoading}
                            className="px-5 py-2 bg-accent text-background font-extrabold text-xs rounded-lg hover:opacity-90 transition-all uppercase tracking-wider shadow-sm"
                        >
                            {isLoading ? "Saving Specifications..." : "💾 Save Profile Specifications"}
                        </button>
                    </div>
                )}
                {success && <p className="text-emerald-600 text-xs font-bold text-center bg-emerald-50 dark:bg-emerald-900/20 py-2 rounded-lg border border-emerald-200">{success}</p>}
              </section>


            </div>

            <div className="space-y-4">
              <section className="bg-surface-900 text-white p-4 sm:p-5 rounded-xl space-y-4 relative overflow-hidden shadow-md">
                  <div className="space-y-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-accent">Technical Identifiers</h2>
                    <p className="text-[9px] opacity-60 uppercase tracking-wider">System profile metadata</p>
                  </div>
                  <div className="space-y-3">
                      {Object.entries(metadata).length > 0 ? (
                          Object.entries(metadata).map(([key, value]) => (
                              <div key={key} className="space-y-0.5">
                                  <label className="text-[8px] font-bold uppercase text-white/50 tracking-wider">{key.replace(/_/g, ' ')}</label>
                                  <p className="text-xs font-mono text-white/90 truncate">
                                      {Array.isArray(value) ? value.join(", ") : String(value)}
                                  </p>
                              </div>
                          ))
                      ) : (
                          <p className="text-xs text-white/40 italic tracking-wide text-center py-4">No custom metadata.</p>
                      )}
                  </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "professional" && (
          <div className="max-w-4xl space-y-4">
            <section className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 p-4 sm:p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-center border-b border-surface-200 dark:border-white/10 pb-3">
                <div>
                  <h2 className="text-xs font-bold text-primary uppercase tracking-wider">Professional Credentials</h2>
                  <p className="text-[10px] text-surface-400 font-medium">Verified data for {categorySlug} classification</p>
                </div>
                <button onClick={() => setIsEditing(!isEditing)} className="px-3.5 py-1.5 border border-surface-200 dark:border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-surface-100 transition-all">
                  {isEditing ? "Done" : "Edit Details"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">Category Fields</h3>
                  {currentSchema.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">{field.label}</label>
                      {isEditing ? (
                        field.type === "select" ? (
                          <select 
                            value={String(metadata[field.key] || "")} 
                            onChange={e => updateMetadataField(field.key, e.target.value)}
                            className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs"
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
                            className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" 
                          />
                        )
                      ) : (
                        <p className="text-xs font-semibold text-primary bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5">
                          {String(metadata[field.key] || "—")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-3 md:border-l border-surface-200 dark:border-white/10 md:pl-4">
                  <h3 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">Digital Presence</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Website / Portfolio</label>
                      {isEditing ? (
                        <input type="text" value={website} onChange={e => setWebsite(e.target.value)} className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" placeholder="https://..." />
                      ) : (
                        <div className="bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5">
                          <a href={website} target="_blank" className="text-xs font-bold text-accent hover:underline flex items-center gap-1.5 truncate">
                            {website || "Unspecified"}
                          </a>
                        </div>
                      )}
                    </div>
                    {Object.entries(socialLinks).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider capitalize">{key}</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={String(value)} 
                            onChange={e => setSocialLinks({...socialLinks, [key]: e.target.value})} 
                            className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" 
                            placeholder={`Your ${key} profile URL`}
                          />
                        ) : (
                          <p className="text-xs text-primary font-medium bg-surface-100/40 dark:bg-surface-800/40 p-2.5 rounded-lg border border-surface-200/50 dark:border-white/5 truncate">{String(value) || "—"}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="pt-3 border-t border-surface-200 dark:border-white/10 flex justify-end">
                  <button onClick={handleUpdate} disabled={isLoading} className="px-5 h-9 bg-accent text-background font-bold uppercase text-[10px] tracking-wider hover:opacity-90 transition-all rounded-lg">
                    {isLoading ? "Saving..." : "Commit Data"}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="space-y-4">
            <section className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 p-4 sm:p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xs font-bold text-primary uppercase tracking-wider">Work Portfolio</h2>
                  <p className="text-[10px] text-surface-400 font-medium">Architectural project showcase</p>
                </div>
                <button 
                  onClick={() => setIsUploadingPortfolio(true)}
                  className="px-4 py-2 bg-accent text-background text-[10px] font-bold uppercase tracking-wider rounded-lg hover:opacity-90 transition-all"
                >
                  Add Project
                </button>
              </div>

              {portfolioItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                  {portfolioItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="group relative bg-surface-100 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-white/10 overflow-hidden hover:border-accent/50 transition-all"
                    >
                      <div className="aspect-[16/10] relative overflow-hidden bg-surface-200">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-surface-400 font-bold uppercase tracking-wider">
                            No Image
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              setEditingPortfolioItem(item);
                            }}
                            className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center hover:bg-amber-600 transition-colors shadow-sm"
                            title="Edit Portfolio Item"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>

                          {item.is_owner ? (
                            <button 
                              onClick={async (e) => {
                                e.preventDefault();
                                if (confirm("Delete this portfolio project?")) {
                                  try {
                                    await portfoliosApi.deletePortfolioItem(item.id);
                                    setPortfolioItems(prev => prev.filter(p => p.id !== item.id));
                                    toast.success("Portfolio item deleted.");
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
                              title="Delete Portfolio Item"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          ) : null}
                          
                          <Link 
                            href={`/portfolio/${item.id}`} 
                            className="w-8 h-8 bg-white/20 text-white rounded-lg flex items-center justify-center hover:bg-white/40 transition-colors shadow-sm"
                            title="View Public Portfolio Page"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </Link>
                        </div>
                      </div>
                      <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-xs font-bold text-primary truncate">{item.title}</h3>
                          <button 
                            onClick={() => setEditingPortfolioItem(item)}
                            className="text-[10px] font-bold text-accent hover:underline shrink-0"
                          >
                            Edit
                          </button>
                        </div>
                        <p className="text-[9px] text-surface-400 uppercase font-mono">{item.project_date ? new Date(item.project_date).toLocaleDateString() : "Unspecified Date"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center space-y-3 border border-dashed border-surface-200 dark:border-white/10 rounded-xl bg-surface-100/30">
                  <div className="w-12 h-12 bg-surface-200/50 rounded-full mx-auto flex items-center justify-center text-surface-400">
                    <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-primary">No portfolio items found</p>
                    <p className="text-[10px] text-surface-400 max-w-xs mx-auto">Add your project portfolio to showcase your work.</p>
                  </div>
                </div>
              )}
            </section>

            {/* Edit Portfolio Modal */}
            <EditPortfolioModal
              isOpen={!!editingPortfolioItem}
              item={editingPortfolioItem}
              onClose={() => setEditingPortfolioItem(null)}
              onSuccess={(updated) => {
                setPortfolioItems((prev) =>
                  prev.map((p) => (p.id === updated.id ? updated : p))
                );
              }}
            />

            {isUploadingPortfolio && (
              <div 
                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-20 pb-6 px-3 sm:px-4 overflow-hidden"
                onClick={() => setIsUploadingPortfolio(false)}
              >
                <div 
                  className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-lg max-h-[calc(100vh-6rem)] rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-surface-200 dark:border-white/10 flex justify-between items-center shrink-0 bg-surface-100/60 dark:bg-surface-800/40">
                    <div>
                      <h3 className="text-sm font-extrabold text-primary">Add Portfolio Project</h3>
                      <p className="text-[11px] text-surface-500 font-medium">Upload project details</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsUploadingPortfolio(false)} 
                      className="w-7 h-7 rounded-full bg-surface-200 text-surface-600 flex items-center justify-center font-bold text-xs"
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
                        toast.success("Portfolio item added.");
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to add portfolio item.");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="flex-1 flex flex-col min-h-0 overflow-hidden"
                  >
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Project Title *</label>
                        <input name="title" required className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary" placeholder="e.g. Minimalist Villa" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Thumbnail *</label>
                          <input type="file" name="image" required accept="image/*" className="w-full text-xs text-surface-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-primary/10 file:text-primary" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Gallery Images</label>
                          <input type="file" name="images" multiple accept="image/*" className="w-full text-xs text-surface-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-primary/10 file:text-primary" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Description</label>
                        <textarea name="description" rows={3} className="w-full p-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs font-semibold text-primary resize-none" placeholder="Describe the project..." />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Project Date</label>
                          <input type="date" name="project_date" className="w-full h-9 px-2.5 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" />
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                          <input 
                            type="checkbox" 
                            name="is_public" 
                            id="is_public_check" 
                            value="true"
                            defaultChecked 
                            className="w-4 h-4 rounded border-surface-200 text-accent" 
                          />
                          <label htmlFor="is_public_check" className="text-xs font-bold text-primary uppercase tracking-wider cursor-pointer">Public Visibility</label>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-surface-200 dark:border-white/10 shrink-0 bg-surface-100/60 dark:bg-surface-800/40">
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full h-9 bg-accent text-background font-extrabold uppercase text-[10px] tracking-wider hover:opacity-90 transition-all rounded-lg disabled:opacity-50"
                      >
                        {isLoading ? "Saving..." : "Add Project"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "organization" && (
           <div className="max-w-4xl space-y-4">
              {organizations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {organizations.map((org) => (
                    <div 
                      key={org.id} 
                      className="bg-surface-50 dark:bg-surface-900 p-4 border border-surface-200 dark:border-white/10 rounded-xl space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-accent text-background rounded-lg flex items-center justify-center font-bold text-lg">
                          {(org.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[8px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded">Active Practice</span>
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-base font-bold text-primary tracking-tight">{org.name}</h3>
                        <p className="text-[9px] text-surface-400 uppercase font-mono">{org.uid}</p>
                      </div>
                      <Link href="/dashboard/organization" className="block w-full py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg hover:opacity-90 transition-all">
                        Access Practice Dashboard
                      </Link>
                    </div>
                  ))}
                  <Link href="/dashboard/organization?create=true" className="border-2 border-dashed border-surface-200 dark:border-white/10 rounded-xl flex flex-col items-center justify-center p-6 gap-2 hover:border-accent transition-all">
                    <div className="w-10 h-10 bg-surface-100 rounded-full flex items-center justify-center text-surface-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Establish New Entity</span>
                  </Link>
                </div>
              ) : (
                <section className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 p-6 sm:p-8 rounded-xl text-center space-y-4">
                  <div className="w-16 h-16 bg-surface-100 rounded-2xl mx-auto flex items-center justify-center text-surface-300 border border-surface-200 dark:border-white/10">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m0 10V4m-4 6h4m1 5h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-primary">Organizational Affiliation</h2>
                    <p className="text-xs text-surface-400 max-w-md mx-auto leading-relaxed">Operating under a Solo Identity. Link with a professional firm to enable team collaboration.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Link href="/dashboard/organization" className="w-full sm:w-auto px-6 h-9 bg-accent text-background font-bold uppercase text-[10px] tracking-wider rounded-lg flex items-center justify-center">
                      Link to Firm
                    </Link>
                    <Link href="/dashboard/organization?create=true" className="w-full sm:w-auto px-6 h-9 border border-surface-200 dark:border-white/10 text-surface-400 font-bold uppercase text-[10px] tracking-wider rounded-lg flex items-center justify-center hover:text-primary">
                      Register New Entity
                    </Link>
                  </div>
                </section>
              )}
           </div>
        )}

        {activeTab === "activity" && (
          <div className="max-w-4xl space-y-4">
            <section className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 p-4 sm:p-5 rounded-xl space-y-4">
              <div className="space-y-0.5">
                <h2 className="text-xs font-bold text-primary uppercase tracking-wider">Operational Timeline</h2>
                <p className="text-[10px] text-surface-400 font-medium">Audit trail of account modifications</p>
              </div>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-200 dark:before:bg-white/10">
                {[
                  { date: "May 15, 2026", event: "Professional Specification Initialized", desc: "Digital footprint and industrial DNA synchronized with central repository." },
                  { date: "May 10, 2026", event: "Classification Applied", desc: `Identity categorized as ${categorySlug.toUpperCase()} in primary index.` },
                  { date: "May 05, 2026", event: "Identity Provisioned", desc: "Security credentials and core account layer established." }
                ].map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[23px] top-1 w-3 h-3 bg-accent rounded-full border-2 border-surface-50 dark:border-surface-900" />
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">{item.date}</p>
                      <h3 className="text-xs font-bold text-primary">{item.event}</h3>
                      <p className="text-xs text-surface-400 max-w-xl leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "security" && (
          <div className="max-w-3xl space-y-4">
            <section className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 p-4 sm:p-5 rounded-xl space-y-4">
              <div className="space-y-0.5">
                <h2 className="text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-red-500 pl-2.5">Security Settings</h2>
                <p className="text-[10px] text-surface-400 font-medium">Password rotation and authentication controls</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Verify New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" />
                  </div>
                  <button onClick={handleChangePassword} disabled={isLoading} className="w-full h-9 bg-accent text-background font-bold uppercase text-[10px] tracking-wider hover:opacity-90 transition-all rounded-lg disabled:opacity-50 mt-1">
                    {isLoading ? "Processing..." : "Update Password"}
                  </button>
                </div>
                <div className="bg-surface-100/50 dark:bg-surface-800/40 rounded-xl p-4 space-y-2 border border-surface-200/60 dark:border-white/10 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Two-Factor Authentication</h3>
                    <p className="text-xs text-surface-400 leading-relaxed mt-1">
                      Add an extra security layer to your account with Multi-Factor Authentication.
                    </p>
                  </div>
                  <div className="pt-2">
                    {user?.is_2fa_enabled ? (
                      <button 
                        onClick={() => setIsDisable2FAModalOpen(true)}
                        className="w-full h-9 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold uppercase text-[10px] tracking-wider border border-red-200 dark:border-red-800/30 hover:bg-red-100 transition-all rounded-lg"
                      >
                        Disable 2FA
                      </button>
                    ) : (
                      <button 
                        onClick={initiate2FASetup}
                        disabled={isLoading}
                        className="w-full h-9 bg-accent text-background font-bold uppercase text-[10px] tracking-wider hover:opacity-90 transition-all rounded-lg"
                      >
                        {isLoading ? "Loading..." : "Enable 2FA Protection"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 p-4 sm:p-5 rounded-xl space-y-3">
              <div className="space-y-0.5">
                <h2 className="text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-accent pl-2.5">Change Email</h2>
                <p className="text-[10px] text-surface-400 font-medium">Update primary email address</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">New Email Address</label>
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new.email@example.com" className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Verify Password</label>
                    <input type="password" value={changeEmailPassword} onChange={e => setChangeEmailPassword(e.target.value)} placeholder="••••••••" className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-xs" />
                  </div>
                  <button onClick={handleRequestEmailChange} disabled={isLoading} className="w-full h-9 bg-surface-800 text-white font-bold uppercase text-[10px] tracking-wider hover:opacity-90 transition-all rounded-lg disabled:opacity-50 mt-1">
                    {isLoading ? "Processing..." : "Request Change"}
                  </button>
                </div>
              </div>
            </section>

            <section className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 p-4 sm:p-5 rounded-xl space-y-3">
              <div className="space-y-0.5">
                <h2 className="text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-accent pl-2.5">Active Sessions</h2>
                <p className="text-[10px] text-surface-400 font-medium">Active logins across devices</p>
              </div>
              <div className="space-y-2">
                {sessions.map(session => (
                  <div key={session.id} className="flex justify-between items-center bg-surface-100/60 dark:bg-surface-800/40 p-2.5 border border-surface-200 dark:border-white/10 rounded-lg">
                    <div>
                      <p className="text-xs font-bold text-primary">{session.device_name || "Unknown Device"} ({session.ip_address})</p>
                      <p className="text-[9px] text-surface-400 uppercase">Last Active: {new Date(session.last_active_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleRevokeSession(session.id)} className="text-[10px] text-red-500 uppercase font-bold tracking-wider hover:text-red-700">Revoke</button>
                  </div>
                ))}
                {sessions.length === 0 && <p className="text-xs text-surface-400">No active sessions found.</p>}
              </div>
            </section>

            <section className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 p-4 sm:p-5 rounded-xl space-y-3">
              <div className="space-y-0.5">
                <h2 className="text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-accent pl-2.5">Privacy & Visibility</h2>
                <p className="text-[10px] text-surface-400 font-medium">Public discovery controls</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-100/60 dark:bg-surface-800/40 border border-surface-200 dark:border-white/10 rounded-lg">
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Public Profile</h3>
                  <p className="text-xs text-surface-400 max-w-sm">When disabled, your profile and portfolio items are hidden from public discovery.</p>
                </div>
                <button 
                  onClick={handleToggleVisibility}
                  disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ${
                    (user?.profile?.is_public ?? true) ? 'bg-accent' : 'bg-surface-300 dark:bg-surface-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                      (user?.profile?.is_public ?? true) ? 'translate-x-2' : '-translate-x-2'
                    }`}
                  />
                </button>
              </div>
            </section>

            <section className="bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 p-4 sm:p-5 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Account Decommissioning</h3>
              </div>
              <p className="text-xs text-red-700/80 dark:text-red-300/80 leading-relaxed font-medium">Permanently anonymize identity and terminate project access. (30-day grace period applies).</p>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button 
                  onClick={handleExportData}
                  disabled={isLoading}
                  className="px-4 py-2 bg-surface-100 dark:bg-surface-800 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 font-bold uppercase text-[10px] tracking-wider hover:bg-red-50 dark:hover:bg-red-950/30 transition-all rounded-lg"
                >
                  Export Data
                </button>
                <button 
                  onClick={() => setIsDecommissionModalOpen(true)}
                  className="px-4 py-2 bg-red-600 text-white font-bold uppercase text-[10px] tracking-wider hover:bg-red-700 transition-all rounded-lg"
                >
                  Decommission Account
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Decommission Modal */}
      {isDecommissionModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-md max-h-[85vh] rounded-2xl overflow-y-auto shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200 border-t-4 border-red-600">
            <h3 className="text-sm font-black text-red-600 uppercase tracking-wider">Confirm Decommission</h3>
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
                className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-red-500 text-xs font-semibold text-primary"
              />
            </div>
            <div className="flex gap-2.5 pt-1">
              <button 
                onClick={() => { setIsDecommissionModalOpen(false); setDecommissionPassword(""); }}
                className="w-full h-9 bg-surface-200 dark:bg-surface-800 text-surface-700 dark:text-surface-300 font-bold uppercase text-xs tracking-wider rounded-lg hover:bg-surface-300 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDecommission}
                disabled={!decommissionPassword || isLoading}
                className="w-full h-9 bg-red-600 text-white font-bold uppercase text-xs tracking-wider rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
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
          <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-lg max-h-[85vh] rounded-2xl overflow-y-auto shadow-2xl p-4 sm:p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-white/10">
              <h3 className="text-sm font-extrabold text-primary">Adjust Profile Image</h3>
              <button 
                onClick={() => setIsCropModalOpen(false)}
                className="w-6 h-6 rounded-full bg-surface-200 text-surface-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center max-h-[300px] overflow-hidden bg-surface-100 rounded-xl border border-surface-200 dark:border-white/10">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img ref={imgRef} src={imgSrc} alt="Crop preview" onLoad={onImageLoad} className="max-h-[300px] object-contain" />
              </ReactCrop>
            </div>
            <button 
              onClick={handleCropSubmit}
              disabled={!completedCrop || isLoading}
              className="w-full h-9 bg-accent text-background font-extrabold uppercase text-[10px] tracking-wider hover:opacity-90 transition-all disabled:opacity-50 rounded-lg"
            >
              {isLoading ? "Saving..." : "Crop & Save Image"}
            </button>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {is2FASetupModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-md max-h-[85vh] rounded-2xl overflow-y-auto shadow-2xl p-4 sm:p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-surface-200 dark:border-white/10 pb-2">
              <h3 className="text-sm font-extrabold text-primary">
                {recoveryCodes.length > 0 ? "Recovery Codes" : "Setup 2FA"}
              </h3>
              <button 
                onClick={() => {
                  setIs2FASetupModalOpen(false);
                  setRecoveryCodes([]);
                  setMfaCode("");
                }} 
                className="w-6 h-6 rounded-full bg-surface-200 text-surface-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {recoveryCodes.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-lg border border-amber-200 text-amber-800 dark:text-amber-300 text-xs">
                  <strong>Save these recovery codes!</strong> Store them securely to recover access if you lose your device.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code, idx) => (
                    <div key={idx} className="bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 p-2 text-center font-mono font-bold text-xs tracking-wider rounded-md">
                      {code}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => { setIs2FASetupModalOpen(false); setRecoveryCodes([]); setMfaCode(""); }} 
                  className="w-full h-9 bg-accent text-background font-extrabold uppercase text-[10px] tracking-wider rounded-lg"
                >
                  I Have Saved Them
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-surface-400 text-center">
                  Scan QR code with your authenticator app (Google Authenticator / Authy).
                </p>
                
                <div className="flex justify-center bg-surface-100 dark:bg-surface-800 p-3 border border-surface-200 dark:border-white/10 rounded-xl mx-auto w-max">
                  <QRCodeSVG value={mfaUri} size={150} />
                </div>
                
                <div className="text-center">
                  <p className="text-[9px] text-surface-400 uppercase font-bold mb-1">Manual Entry Code:</p>
                  <code className="text-xs bg-surface-100 dark:bg-surface-800 px-2.5 py-1 rounded border border-surface-200 dark:border-white/10 font-mono text-primary font-bold">
                    {mfaSecret}
                  </code>
                </div>

                <div className="space-y-2 pt-2 border-t border-surface-200 dark:border-white/10">
                  <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">Verify Code</label>
                  <input 
                    type="text" 
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    maxLength={6}
                    placeholder="123456" 
                    className="w-full h-9 text-center text-lg tracking-[0.4em] font-mono px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-accent text-primary" 
                  />
                  <button 
                    onClick={confirm2FASetup}
                    disabled={mfaCode.length !== 6 || isLoading}
                    className="w-full h-9 bg-accent text-background font-extrabold uppercase text-[10px] tracking-wider rounded-lg disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider">Disable 2FA</h3>
            <p className="text-xs text-surface-400">Enter password to confirm disabling 2FA protection.</p>
            <input 
              type="password" 
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Your Password"
              className="w-full h-9 px-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-lg outline-none focus:border-red-500 text-xs"
            />
            <div className="flex gap-2.5">
              <button 
                onClick={() => { setIsDisable2FAModalOpen(false); setDisablePassword(""); }}
                className="w-full h-9 bg-surface-200 dark:bg-surface-800 text-surface-700 dark:text-surface-300 font-bold uppercase text-[10px] tracking-wider rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={disable2FA}
                disabled={!disablePassword || isLoading}
                className="w-full h-9 bg-red-600 text-white font-bold uppercase text-[10px] tracking-wider rounded-lg disabled:opacity-50"
              >
                {isLoading ? "Disabling..." : "Disable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
