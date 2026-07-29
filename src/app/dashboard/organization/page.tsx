"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { orgsApi, OrgUpdateData } from "@/domains/orgs/api";
import { Organization, Invitation } from "@/types/auth";
import { detectUserTimezone, detectUserUnitSystem, detectUserCurrency } from "@/utils/localization";
import ReactCrop, { Crop, PixelCrop, makeAspectCrop, centerCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useAuthStore } from "@/store/auth-store";
import { useIsAdmin } from "@/domains/auth/hooks";

import { ChecklistTemplateManager } from "./ChecklistTemplateManager";
import { AuditLogsView } from "./AuditLogsView";
import { WebhooksView } from "./WebhooksView";

type OrgTabType = "overview" | "team" | "brand" | "compliance" | "templates" | "activity" | "security" | "preferences" | "webhooks";

const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", 
  "icloud.com", "aol.com", "protonmail.com", "mail.com"
];

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  owner: { label: "Account Owner", color: "bg-red-500" },
  principal: { label: "Principal/Partner", color: "bg-primary" },
  associate: { label: "Associate Director", color: "bg-accent" },
  member: { label: "Professional Member", color: "bg-surface-600" },
  guest: { label: "External Guest", color: "bg-surface-400" },
};

export default function OrganizationPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activeTab, setActiveTab] = useState<OrgTabType>("overview");
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Cropping State
  const [imgSrc, setImgSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Form States
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgEmail, setNewOrgEmail] = useState("");
  const [newOrgTimezone, setNewOrgTimezone] = useState("");
  const [newOrgCurrency, setNewOrgCurrency] = useState("");
  const [newOrgUnitSystem, setNewOrgUnitSystem] = useState("metric");
  const [isDetecting, setIsDetecting] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Editable Fields State
  const [editData, setEditData] = useState<OrgUpdateData>({});

  const { user } = useAuthStore();
  const isAdmin = useIsAdmin();

  const currentOrgRole = useMemo(() => {
    if (!user || !members) return null;
    return members.find(m => m.user.id === user.id)?.role;
  }, [members, user]);

  const canManageOrg = isAdmin || currentOrgRole === "owner" || currentOrgRole === "principal";

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadMembers(selectedOrg.id);
      loadInvitations(selectedOrg.id);
      setEditData({
        name: selectedOrg.name,
        tagline: selectedOrg.tagline,
        email: selectedOrg.email,
        phone: selectedOrg.phone,
        website: selectedOrg.website,
        address: selectedOrg.address,
        metadata: selectedOrg.metadata || {},
        social_links: selectedOrg.social_links || {},
        enable_auto_join: selectedOrg.enable_auto_join || false,
        auto_join_domain: selectedOrg.auto_join_domain || "",
      });
      setIsEditing(false);
    }
  }, [selectedOrg]);

  // Handle Auto-Detection when Preferences tab opens
  useEffect(() => {
    if (activeTab === "preferences" && selectedOrg && !selectedOrg.metadata?.timezone) {
      setEditData(prev => ({
        ...prev,
        metadata: {
          ...(prev.metadata || {}),
          timezone: prev.metadata?.timezone || detectUserTimezone(),
          currency: prev.metadata?.currency || detectUserCurrency(),
          unit_system: prev.metadata?.unit_system || detectUserUnitSystem(),
        }
      }));
    }
  }, [activeTab, selectedOrg]);

  async function loadOrgs() {
    setIsLoading(true);
    try {
      const data = await orgsApi.listOrgs();
      setOrgs(data);
      if (data.length > 0 && !selectedOrg) setSelectedOrg(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMembers(orgId: number) {
    if (!orgId) return;
    try {
      const data = await orgsApi.listMembers(orgId);
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadInvitations(orgId: number) {
    if (!orgId) return;
    try {
      const data = await orgsApi.listInvitations(orgId);
      setInvitations(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await orgsApi.createOrg({ 
        name: newOrgName, 
        email: newOrgEmail,
        metadata: {
          timezone: newOrgTimezone,
          currency: newOrgCurrency,
          unit_system: newOrgUnitSystem
        }
      });
      setNewOrgName("");
      setNewOrgEmail("");
      setShowCreate(false);
      loadOrgs();
    } catch (err) {
      alert("Failed to establish new firm.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate() {
    if (!selectedOrg) return;
    setIsSaving(true);
    try {
      const updated = await orgsApi.updateOrg(selectedOrg.id, editData);
      setSelectedOrg(updated);
      setOrgs(prev => prev.map(o => o.id === updated.id ? updated : o));
      setIsEditing(false);
    } catch (err: any) {
      const msg = err?.message || "Failed to synchronize firm data.";
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrg) return;
    try {
      await orgsApi.sendInvitation(selectedOrg.id, { email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      loadInvitations(selectedOrg.id);
      alert(`Invitation sent to ${inviteEmail} as ${inviteRole.toUpperCase()}`);
    } catch (err) {
      alert("Failed to dispatch invitation.");
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!confirm("Revoke this invitation?")) return;
    try {
      await orgsApi.revokeInvitation(inviteId);
      if (selectedOrg) loadInvitations(selectedOrg.id);
    } catch (err) {
      alert("Failed to revoke invitation.");
    }
  }

  async function handleRemoveMember(memberId: number, memberName: string) {
    if (!selectedOrg) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from the organization?`)) return;
    try {
      await orgsApi.removeMember(selectedOrg.id, memberId);
      loadMembers(selectedOrg.id);
    } catch (err: any) {
      alert(err.message || "Failed to remove member.");
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedOrg) return;

    // Convert file to base64 for cropping preview
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImgSrc(reader.result?.toString() || "");
      setIsCropModalOpen(true);
    });
    reader.readAsDataURL(file);
    
    // Clear input so selecting the same file again works
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
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
    if (!completedCrop || !imgRef.current || !selectedOrg) return;

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

    setIsSaving(true);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsSaving(false);
        return;
      }
      
      const file = new File([blob], "logo.png", { type: "image/png" });
      try {
        const updatedOrg = await orgsApi.uploadLogo(selectedOrg.id, file);
        setSelectedOrg(updatedOrg);
        setOrgs(prev => prev.map(o => o.id === updatedOrg.id ? updatedOrg : o));
        setIsCropModalOpen(false);
      } catch (err) {
        console.error(err);
        alert("Failed to upload logo.");
      } finally {
        setIsSaving(false);
      }
    }, "image/png");
  }

  const updateMetadata = (key: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      metadata: { ...(prev.metadata || {}), [key]: value }
    }));
  };

  if (isLoading) return <div className="p-20 text-center text-primary font-bold animate-pulse tracking-widest uppercase">Synchronizing Firm Intelligence...</div>;

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 space-y-12">
      
      {/* 10X Top Banner / Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-surface-50/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-6 rounded-[2rem] shadow-xl shadow-primary/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-full arch-grid opacity-[0.03] pointer-events-none mix-blend-overlay" />
        <div className="space-y-1 relative z-10">
          <h1 className="text-4xl font-black text-primary tracking-tighter uppercase flex items-center gap-4 drop-shadow-[0_0_15px_rgba(var(--color-primary),0.3)]">
            Professional Entities
            <span className="px-4 py-1.5 bg-accent/10 text-accent font-bold text-[10px] rounded-full border border-accent/20 shadow-[0_0_10px_rgba(var(--color-accent),0.2)]">
              {orgs.length} Active
            </span>
          </h1>
          <p className="text-surface-500 font-medium italic text-sm">Orchestrate your practice governance and collaborative team layers.</p>
        </div>
        <button 
          onClick={() => {
            if (!showCreate) {
              setIsDetecting(true);
              setTimeout(() => {
                setNewOrgTimezone(detectUserTimezone());
                setNewOrgCurrency(detectUserCurrency());
                setNewOrgUnitSystem(detectUserUnitSystem());
                setIsDetecting(false);
              }, 500);
            }
            setShowCreate(!showCreate);
          }}
          className={`px-10 h-14 font-bold uppercase text-[10px] tracking-[0.25em] transition-all rounded-xl shadow-xl relative z-10 ${
            showCreate 
              ? "bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30" 
              : "bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:shadow-[0_0_20px_rgba(var(--color-accent),0.4)]"
          }`}
        >
          {showCreate ? "Cancel Protocol" : "Establish New Firm"}
        </button>
      </div>

      {/* 10X Creation Modal */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-surface-50/60 backdrop-blur-3xl border border-white/20 dark:border-white/5 p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(var(--color-primary),0.1)] animate-in slide-in-from-top-8 duration-700 space-y-10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 arch-grid opacity-20 pointer-events-none mix-blend-overlay" />
            <div className="space-y-2 relative z-10">
                <h2 className="text-3xl font-black text-primary uppercase tracking-tight flex items-center gap-4">
                  Establishment Protocol
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
                </h2>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-widest drop-shadow-sm">Register a new architectural or engineering firm in the central repository.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.2em] flex items-center gap-2"><span className="text-accent">🏢</span> Formal Firm Name</label>
                    <input 
                        type="text" required value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)}
                        className="w-full h-14 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 px-5 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 font-bold shadow-inner transition-all placeholder:text-surface-400/50"
                        placeholder="SpaceDesign Studio & Partners"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.2em] flex items-center gap-2"><span className="text-accent">✉️</span> Administrative Email</label>
                    <input 
                        type="email" required value={newOrgEmail} onChange={(e) => setNewOrgEmail(e.target.value)}
                        className="w-full h-14 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 px-5 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 font-bold shadow-inner transition-all placeholder:text-surface-400/50"
                        placeholder="operations@spacedesign.com"
                    />
                </div>
            </div>
            
            {isDetecting && (
              <div className="text-[10px] font-bold text-accent animate-pulse flex items-center gap-3 bg-accent/5 backdrop-blur-md p-4 rounded-xl border border-accent/20 relative z-10 shadow-[0_0_15px_rgba(var(--color-accent),0.1)]">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                Auto-detecting regional configuration via browser locale...
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-surface-200/50 relative z-10">
                <div className="col-span-full mb-[-10px]">
                  <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-accent text-lg">🌐</span> Regional Defaults
                  </p>
                </div>
                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-surface-500 uppercase tracking-[0.2em]">Base Timezone</label>
                    <input 
                        type="text" value={newOrgTimezone} onChange={(e) => setNewOrgTimezone(e.target.value)}
                        className="w-full h-12 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 px-4 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 font-bold text-xs shadow-inner transition-all"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-surface-500 uppercase tracking-[0.2em]">Default Currency</label>
                    <select 
                        value={newOrgCurrency} onChange={(e) => setNewOrgCurrency(e.target.value)}
                        className="w-full h-12 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 px-4 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 font-bold text-xs shadow-inner transition-all appearance-none"
                    >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="AUD">AUD ($)</option>
                        <option value="CAD">CAD ($)</option>
                        {!["USD", "EUR", "GBP", "INR", "AUD", "CAD"].includes(newOrgCurrency) && newOrgCurrency && (
                            <option value={newOrgCurrency}>{newOrgCurrency}</option>
                        )}
                    </select>
                </div>
                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-surface-500 uppercase tracking-[0.2em]">Unit System</label>
                    <select 
                        value={newOrgUnitSystem} onChange={(e) => setNewOrgUnitSystem(e.target.value)}
                        className="w-full h-12 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 px-4 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 font-bold text-xs shadow-inner transition-all appearance-none"
                    >
                        <option value="metric">Metric (m, kg)</option>
                        <option value="imperial">Imperial (ft, lb)</option>
                    </select>
                </div>
            </div>

            <button type="submit" disabled={isSaving || isDetecting} className="w-full h-16 bg-accent/10 border border-accent/30 text-accent font-black uppercase tracking-[0.3em] text-xs rounded-xl hover:bg-accent hover:text-background shadow-[0_0_15px_rgba(var(--color-accent),0.1)] hover:shadow-[0_0_30px_rgba(var(--color-accent),0.3)] transition-all disabled:opacity-50 relative z-10">
              {isSaving ? "Provisioning Entity..." : "Confirm Establishment"}
            </button>
        </form>
      )}

      {/* 10X Empty State */}
      {orgs.length === 0 ? (
        <div className="text-center py-32 bg-surface-50/20 backdrop-blur-3xl border-4 border-dashed border-white/20 dark:border-white/5 rounded-[4rem] space-y-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
            <div className="w-32 h-32 bg-surface-50/50 backdrop-blur-md rounded-[2rem] mx-auto flex items-center justify-center text-6xl shadow-[0_0_30px_rgba(var(--color-primary),0.05)] border border-white/10 relative z-10 transition-transform group-hover:scale-110 duration-500">🏛️</div>
            <div className="space-y-3 relative z-10">
                <p className="text-3xl font-black text-primary tracking-tight drop-shadow-md">No Professional Firms Detected</p>
                <p className="text-sm text-surface-500 font-bold tracking-wide max-w-sm mx-auto">Initialize a new firm protocol or request an invitation from an existing administrator.</p>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
            
            {/* 10X Firm Selector Sidebar */}
            <div className="xl:col-span-1 space-y-6">
                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-surface-400 ml-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Active Indices
                </label>
                <div className="space-y-3">
                    {orgs.map((org) => (
                        <div 
                            key={org.id} 
                            onClick={() => setSelectedOrg(org)}
                            className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 border relative overflow-hidden group ${
                                selectedOrg?.id === org.id 
                                ? "bg-surface-50/60 backdrop-blur-xl border-accent/50 shadow-[0_8px_30px_rgba(var(--color-accent),0.15)] -translate-y-1" 
                                : "bg-surface-50/20 backdrop-blur-lg border-white/10 hover:border-accent/30 hover:shadow-lg hover:-translate-y-0.5"
                            }`}
                        >
                            <div className={`absolute top-0 right-0 w-32 h-full arch-grid transition-opacity duration-500 pointer-events-none mix-blend-overlay ${selectedOrg?.id === org.id ? "opacity-20" : "opacity-5"}`} />
                            {selectedOrg?.id === org.id && <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent pointer-events-none" />}
                            <h3 className={`font-bold text-sm tracking-tight mb-1 truncate relative z-10 ${selectedOrg?.id === org.id ? "text-accent drop-shadow-[0_0_8px_rgba(var(--color-accent),0.5)]" : "text-primary"}`}>
                              {org.name}
                            </h3>
                            <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-surface-500 relative z-10">
                                {org.uid.split('ap')[1]} · org
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Firm Workspace */}
            {selectedOrg && (
                <div className="xl:col-span-3 space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
                    
                    {/* 10X Workspace Header */}
                    <div className="bg-surface-50/40 backdrop-blur-3xl border border-white/20 dark:border-white/5 p-10 rounded-[2.5rem] shadow-2xl shadow-primary/5 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-accent/5 arch-grid opacity-[0.05] pointer-events-none mix-blend-overlay" />
                        <div className="relative group shrink-0 z-10">
                            <input 
                                type="file" 
                                ref={logoInputRef} 
                                onChange={handleLogoUpload} 
                                className="hidden" 
                                accept="image/*" 
                            />
                            <div 
                                onClick={() => logoInputRef.current?.click()}
                                className="w-28 h-28 bg-surface-50/50 backdrop-blur-md text-primary rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-[0_0_30px_rgba(var(--color-primary),0.1)] border border-white/20 overflow-hidden cursor-pointer relative transition-transform hover:scale-105"
                            >
                                {selectedOrg.logo ? (
                                    <img src={selectedOrg.logo} className="w-full h-full object-cover" />
                                ) : (
                                    selectedOrg.name.charAt(0)
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3 text-center md:text-left z-10">
                            <div className="space-y-1">
                                <h2 className="text-4xl font-black text-primary tracking-tighter drop-shadow-[0_0_15px_rgba(var(--color-primary),0.2)]">{selectedOrg.name}</h2>
                                <p className="text-accent text-[11px] font-bold uppercase tracking-[0.3em] italic drop-shadow-[0_0_10px_rgba(var(--color-accent),0.3)]">{selectedOrg.tagline || "No professional tagline defined"}</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                <span className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.2em] flex items-center gap-2 bg-surface-100/50 px-3 py-1 rounded-full border border-surface-200/50 backdrop-blur-md">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Verified Entity
                                </span>
                                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em] bg-surface-100/50 px-3 py-1 rounded-full border border-surface-200/50 backdrop-blur-md">
                                    EST {new Date(selectedOrg.created_at || new Date().toISOString()).getFullYear()}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3 z-10">
                            <button onClick={() => setIsEditing(!isEditing)} className="px-6 py-3 bg-surface-50/50 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-surface-100 transition-all hover:shadow-lg">
                                {isEditing ? "Lock Data" : "Edit Specification"}
                            </button>
                        </div>
                    </div>

                    {/* 10X Navigation Tabs */}
                    <div className="flex items-center gap-2 p-2 bg-surface-50/40 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
                        {(["overview", "team", "brand", "compliance", "templates", "activity", "security", "preferences", "webhooks"] as OrgTabType[])
                        .filter(tab => canManageOrg || !["team", "compliance", "security", "webhooks"].includes(tab))
                        .map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all rounded-xl whitespace-nowrap ${
                            activeTab === tab 
                                ? "bg-accent/10 text-accent shadow-[0_0_15px_rgba(var(--color-accent),0.15)] border border-accent/20" 
                                : "bg-transparent text-surface-400 hover:bg-surface-100/50 hover:text-primary border border-transparent"
                            }`}
                        >
                            {tab}
                        </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="animate-in fade-in duration-500">
                        {activeTab === "overview" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <section className="bg-surface-50/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-10 rounded-[2rem] shadow-xl shadow-primary/5 space-y-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-full bg-primary/5 arch-grid opacity-20 pointer-events-none mix-blend-overlay" />
                                    <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3">
                                      <span className="w-1 h-5 bg-accent rounded-full shadow-[0_0_10px_rgba(var(--color-accent),0.5)]" />
                                      Contact Specification
                                    </h3>
                                    <div className="space-y-6 relative z-10">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2"><span className="text-accent">📍</span> Office HQ Address</label>
                                            {isEditing ? (
                                                <textarea value={editData.address || ""} onChange={e => setEditData({...editData, address: e.target.value})} className="w-full h-24 p-4 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 text-sm" />
                                            ) : (
                                                <div className="p-4 bg-surface-50/30 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl">
                                                  <p className="text-sm font-bold text-primary leading-relaxed">{selectedOrg.address || "No address defined."}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2"><span className="text-accent">📞</span> Business Phone</label>
                                                {isEditing ? (
                                                    <input type="text" value={editData.phone || ""} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full h-11 px-4 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 text-sm" />
                                                ) : (
                                                    <div className="p-3 bg-surface-50/30 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl">
                                                      <p className="text-sm font-bold text-primary">{selectedOrg.phone || "—"}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2"><span className="text-accent">🌍</span> Main Website</label>
                                                {isEditing ? (
                                                    <input type="text" value={editData.website || ""} onChange={e => setEditData({...editData, website: e.target.value})} className="w-full h-11 px-4 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 text-sm" />
                                                ) : (
                                                    <div className="p-3 bg-surface-50/30 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl">
                                                      <p className="text-sm font-bold text-accent truncate hover:underline cursor-pointer">{selectedOrg.website || "—"}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isEditing && (
                                        <button onClick={handleUpdate} disabled={isSaving} className="w-full h-14 bg-accent/10 border border-accent/30 text-accent font-bold uppercase text-[10px] tracking-[0.3em] rounded-xl hover:bg-accent hover:text-background transition-all shadow-[0_0_15px_rgba(var(--color-accent),0.1)] relative z-10">
                                            {isSaving ? "Saving..." : "Commit Overview Changes"}
                                        </button>
                                    )}
                                </section>

                                <section className="space-y-8">
                                    <div className="bg-surface-900 border border-surface-800 text-white p-10 rounded-[2rem] space-y-6 relative overflow-hidden shadow-2xl">
                                        <div className="absolute top-0 right-0 w-40 h-full arch-grid opacity-[0.05] pointer-events-none mix-blend-overlay" />
                                        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent flex items-center gap-2 relative z-10">
                                          <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
                                          System Registry
                                        </h3>
                                        <div className="space-y-6 relative z-10">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold uppercase text-white/40 tracking-[0.2em]">Global UID</label>
                                                <div className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-white/90 break-all select-all">
                                                  {selectedOrg.uid}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold uppercase text-white/40 tracking-[0.2em]">Entity Type</label>
                                                <p className="text-xs font-bold text-white/90 uppercase tracking-widest bg-white/5 inline-block px-3 py-1 rounded-md border border-white/10">organization</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-surface-50/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-8 rounded-[2rem] shadow-xl shadow-primary/5 space-y-4 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                        <h3 className="text-[10px] font-black text-primary uppercase tracking-widest relative z-10 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
                                            Social Footprint
                                        </h3>
                                        <div className="flex flex-col gap-4 relative z-10">
                                            {['LinkedIn', 'Instagram', 'Twitter'].map(link => {
                                                const key = link.toLowerCase();
                                                const val = (editData.social_links as any)?.[key] || "";
                                                const staticVal = (selectedOrg.social_links as any)?.[key];
                                                
                                                if (isEditing) {
                                                    return (
                                                        <div key={link} className="flex items-center gap-3">
                                                            <div className="w-10 h-10 shrink-0 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl flex items-center justify-center text-xs shadow-inner">🔗</div>
                                                            <input 
                                                                type="text" 
                                                                placeholder={`${link} URL`}
                                                                value={val}
                                                                onChange={(e) => setEditData(prev => ({
                                                                    ...prev, 
                                                                    social_links: { ...(prev.social_links || {}), [key]: e.target.value }
                                                                }))}
                                                                className="flex-1 h-10 px-4 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 text-sm shadow-inner transition-all"
                                                            />
                                                        </div>
                                                    );
                                                }
                                                
                                                if (!staticVal) return null;
                                                return (
                                                    <a key={link} href={staticVal} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-surface-50/30 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl hover:border-accent/50 hover:shadow-[0_0_15px_rgba(var(--color-accent),0.2)] transition-all group cursor-pointer">
                                                        <div className="w-8 h-8 bg-surface-100/50 border border-white/10 dark:border-white/5 rounded-md flex items-center justify-center text-xs group-hover:scale-110 transition-transform shadow-inner">🔗</div>
                                                        <span className="text-sm font-bold text-primary group-hover:text-accent transition-colors">{link}</span>
                                                    </a>
                                                );
                                            })}
                                            {!isEditing && !Object.values(selectedOrg.social_links || {}).some(v => v) && (
                                                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest">No social links defined.</p>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === "team" && (
                            canManageOrg ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="lg:col-span-2 space-y-8">
                                    <section className="bg-surface-50/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-xl shadow-primary/5">
                                        <div className="p-8 border-b border-surface-200/50 flex justify-between items-center bg-surface-100/30">
                                            <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3">
                                              <span className="text-accent text-lg">👥</span> Active Personnel
                                            </h3>
                                            <span className="px-4 py-1.5 bg-primary/5 border border-primary/10 text-primary font-bold text-[10px] uppercase rounded-full">{members.length} Members</span>
                                        </div>
                                        <div className="divide-y divide-surface-200/30">
                                            {members.map((member) => (
                                                <div key={member.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-surface-50/80 transition-all duration-300 group hover:shadow-[inset_0_0_20px_rgba(var(--color-primary),0.02)]">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 bg-surface-100/80 backdrop-blur-md text-primary rounded-[1rem] flex items-center justify-center font-black text-xl shadow-inner border border-white/10 dark:border-white/5 group-hover:scale-105 transition-transform">
                                                            {member.user.name.charAt(0)}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="font-black text-primary text-sm tracking-tight">{member.user.name}</p>
                                                            <p className="text-[10px] text-surface-500 font-medium tracking-wide">{member.user.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <span className={`px-4 py-1.5 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-md shadow-md ${ROLE_DISPLAY[member.role]?.color || 'bg-surface-400'}`}>
                                                            {ROLE_DISPLAY[member.role]?.label || member.role}
                                                        </span>
                                                        <button 
                                                            onClick={() => handleRemoveMember(member.id, member.user.name)}
                                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-100/50 hover:bg-red-500/10 text-surface-400 hover:text-red-500 transition-all"
                                                            title="Remove Personnel"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {invitations.length > 0 && (
                                        <section className="bg-amber-500/5 backdrop-blur-2xl border border-amber-500/20 rounded-[2rem] overflow-hidden shadow-xl shadow-amber-500/5 animate-in slide-in-from-bottom-4 duration-700">
                                            <div className="p-8 border-b border-amber-500/10 flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
                                                    <h3 className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-[0.3em]">Pending Dispatches</h3>
                                                </div>
                                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{invitations.length} Awaiting</span>
                                            </div>
                                            <div className="divide-y divide-amber-500/10">
                                                {invitations.map((invite) => (
                                                    <div key={invite.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-amber-500/5 transition-colors">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-[1rem] flex items-center justify-center font-bold text-lg">
                                                                {invite.email.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="font-bold text-amber-700 dark:text-amber-300 text-sm tracking-tight">{invite.email}</p>
                                                                <p className="text-[9px] text-amber-600/70 font-bold uppercase tracking-widest">
                                                                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-md">
                                                                {ROLE_DISPLAY[invite.role]?.label || invite.role}
                                                            </span>
                                                            <button 
                                                                onClick={() => handleRevoke(invite.id)}
                                                                className="px-5 py-2 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all"
                                                            >
                                                                Revoke
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </div>

                                <section className="space-y-8">
                                    <div className="bg-surface-50/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-10 rounded-[2rem] shadow-xl shadow-primary/5 space-y-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 relative z-10">
                                          <span className="text-accent text-base">✉️</span> Dispatch Invitation
                                        </h3>
                                        <form onSubmit={handleInvite} className="space-y-6 relative z-10">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Colleague Email</label>
                                                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 text-sm placeholder:text-surface-400/50 shadow-inner transition-all" placeholder="colleague@firm.com" />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Assigned Role</label>
                                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full h-14 px-5 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 text-sm shadow-inner transition-all appearance-none">
                                                    {Object.entries(ROLE_DISPLAY).map(([role, info]) => (
                                                        <option key={role} value={role}>{info.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button type="submit" className="w-full h-16 bg-accent/10 border border-accent/30 text-accent font-black uppercase text-[10px] tracking-[0.3em] rounded-xl hover:bg-accent hover:text-background transition-all shadow-[0_0_15px_rgba(var(--color-accent),0.1)] hover:shadow-[0_0_30px_rgba(var(--color-accent),0.4)] hover:-translate-y-1">
                                                Dispatch Secure Token
                                            </button>
                                        </form>
                                        <div className="pt-6 border-t border-surface-200/50 relative z-10">
                                            <p className="text-[9px] text-surface-400 font-medium leading-relaxed uppercase tracking-widest">
                                                Invited users will have access to the firm's shared project repository and resource pool according to their role specification.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                            ) : (
                                <div className="p-20 text-center bg-surface-100 border-surface-200 border border-surface-200 rounded-3xl">
                                    <div className="text-4xl mb-4 opacity-50">🔒</div>
                                    <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs">Restricted Access</p>
                                    <p className="text-surface-400 text-xs mt-2 font-medium">You must be an Organization Owner or Principal to view this section.</p>
                                </div>
                            )
                        )}

                        {activeTab === "brand" && (
                            <div className="max-w-4xl space-y-10">
                                <section className="bg-surface-50/40 backdrop-blur-3xl border border-white/20 dark:border-white/5 p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(var(--color-primary),0.1)] space-y-12 relative overflow-hidden group animate-in slide-in-from-bottom-4 duration-700">
                                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                    <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 arch-grid opacity-20 pointer-events-none mix-blend-overlay" />
                                    <div className="space-y-2 relative z-10">
                                        <h3 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-3">
                                            <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
                                            Visual Identity Specification
                                        </h3>
                                        <p className="text-xs text-surface-500 font-bold uppercase tracking-widest">Manage how your firm is perceived in project documents and AI reports.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Firm Logo (Primary)</label>
                                                <div 
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="w-40 h-40 bg-surface-50/50 backdrop-blur-md border-2 border-dashed border-white/20 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-6 gap-3 group cursor-pointer hover:border-accent/50 hover:bg-surface-50/80 transition-all overflow-hidden relative shadow-inner"
                                                >
                                                    {selectedOrg.logo ? (
                                                        <>
                                                            <img src={selectedOrg.logo} className="absolute inset-0 w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                                <span className="text-[9px] font-bold text-white uppercase tracking-widest drop-shadow-md">Update Logo</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="text-3xl opacity-40 group-hover:scale-110 transition-transform drop-shadow-sm text-primary">🖼️</span>
                                                            <span className="text-[9px] font-bold text-surface-500 uppercase tracking-widest">Drop SVG / PNG</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Firm Tagline / Motto</label>
                                                <input type="text" value={editData.tagline || ""} onChange={e => setEditData({...editData, tagline: e.target.value})} className="w-full h-14 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 px-5 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 font-bold shadow-inner transition-all text-sm placeholder:text-surface-400/50" placeholder="Elevating Structural Excellence" />
                                            </div>
                                        </div>
                                        <div className="bg-surface-50/30 backdrop-blur-md rounded-[2rem] p-10 border border-white/10 dark:border-white/5 flex flex-col justify-center space-y-6 shadow-inner">
                                            <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent text-2xl shadow-[0_0_15px_rgba(var(--color-accent),0.2)]">🎨</div>
                                            <div className="space-y-2">
                                                <h4 className="text-base font-black text-primary tracking-tight drop-shadow-sm">Identity Synchronization</h4>
                                                <p className="text-xs text-surface-500 leading-relaxed font-medium">Your brand assets will be automatically embedded in generated blueprints, task reports, and client presentations to maintain professional consistency.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-8 border-t border-surface-200/50 flex justify-end relative z-10">
                                        <button onClick={handleUpdate} disabled={isSaving} className="px-12 h-16 bg-accent/10 border border-accent/30 text-accent font-black uppercase text-[10px] tracking-[0.3em] rounded-xl hover:bg-accent hover:text-background transition-all shadow-[0_0_15px_rgba(var(--color-accent),0.1)] hover:shadow-[0_0_30px_rgba(var(--color-accent),0.4)] disabled:opacity-50">Save Visual Identity</button>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === "compliance" && (
                            canManageOrg ? (
                            <div className="max-w-4xl space-y-10">
                                <section className="bg-surface-50/40 backdrop-blur-3xl border border-white/20 dark:border-white/5 p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(var(--color-primary),0.1)] space-y-12 relative overflow-hidden group animate-in slide-in-from-bottom-4 duration-700">
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                    <div className="absolute top-0 right-0 w-64 h-full bg-red-500/5 arch-grid opacity-20 pointer-events-none mix-blend-overlay" />
                                    <div className="space-y-2 relative z-10">
                                        <h3 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-3">
                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                            Regulatory & Compliance Layer
                                        </h3>
                                        <p className="text-xs text-red-500/80 font-bold uppercase tracking-widest">Restricted to Account Owners & Principals</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                                        {[
                                            { key: 'company_reg', label: 'Company Registration Number', type: 'text' },
                                            { key: 'tax_id', label: 'Tax / VAT Identification', type: 'text' },
                                            { key: 'insurance_policy', label: 'Professional Indemnity Policy', type: 'text' },
                                            { key: 'license_id', label: 'Principal Architect License', type: 'text' },
                                        ].map(field => (
                                            <div key={field.key} className="space-y-3">
                                                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">{field.label}</label>
                                                <input 
                                                    type="text" 
                                                    value={String((editData.metadata as any)?.[field.key] || "")} 
                                                    onChange={e => updateMetadata(field.key, e.target.value)}
                                                    className="w-full h-14 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 px-5 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 font-bold shadow-inner transition-all text-sm font-mono" 
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-8 border-t border-surface-200/50 relative z-10">
                                        <button onClick={handleUpdate} disabled={isSaving} className="w-full h-16 bg-red-500/10 border border-red-500/30 text-red-500 font-black uppercase text-[10px] tracking-[0.3em] rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] disabled:opacity-50">
                                            {isSaving ? "Synchronizing Compliance Index..." : "Update Regulatory Metadata"}
                                        </button>
                                    </div>
                                </section>
                            </div>
                            ) : (
                                <div className="p-20 text-center bg-surface-100 border-surface-200 border border-surface-200 rounded-3xl">
                                    <div className="text-4xl mb-4 opacity-50">🔒</div>
                                    <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs">Restricted Access</p>
                                    <p className="text-surface-400 text-xs mt-2 font-medium">You must be an Organization Owner or Principal to view this section.</p>
                                </div>
                            )
                        )}
                        
                        {activeTab === "security" && (
                            canManageOrg ? (
                            <div className="max-w-4xl space-y-10">
                                <section className="bg-surface-50/40 backdrop-blur-3xl border border-white/20 dark:border-white/5 p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(var(--color-primary),0.1)] space-y-12 relative overflow-hidden group animate-in slide-in-from-bottom-4 duration-700">
                                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                    <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 arch-grid opacity-20 pointer-events-none mix-blend-overlay" />
                                    <div className="space-y-2 relative z-10">
                                        <h3 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-3">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                            Security & Onboarding
                                        </h3>
                                        <p className="text-xs text-surface-500 font-bold uppercase tracking-widest">Manage access protocols and domain claiming.</p>
                                    </div>

                                    <div className="space-y-8 bg-surface-50/30 backdrop-blur-md p-10 rounded-[2rem] border border-white/10 dark:border-white/5 shadow-inner relative z-10">
                                        <div className="space-y-2">
                                            <h4 className="font-black text-primary uppercase tracking-widest text-xs">Domain Auto-Join</h4>
                                            <p className="text-xs text-surface-500 max-w-2xl leading-relaxed font-medium">
                                                Allow anyone with a verified company email address to automatically join this organization without an explicit invitation. They will be granted the lowest <strong>Member</strong> role by default.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Claimed Domain</label>
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="text" 
                                                    value={editData.auto_join_domain || ""} 
                                                    onChange={e => setEditData({...editData, auto_join_domain: e.target.value})}
                                                    placeholder="acme-architecture.com"
                                                    className="flex-1 h-14 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 px-5 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 font-bold shadow-inner transition-all text-sm font-mono"
                                                />
                                                <button 
                                                    onClick={() => {
                                                        const currentIsActive = editData.enable_auto_join || false;
                                                        setEditData({...editData, enable_auto_join: !currentIsActive});
                                                    }}
                                                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none ${
                                                        editData.enable_auto_join ? 'bg-accent' : 'bg-surface-300'
                                                    }`}
                                                >
                                                    <span className="sr-only">Toggle Auto-Join</span>
                                                    <span
                                                        aria-hidden="true"
                                                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-300 ease-in-out ${
                                                            editData.enable_auto_join ? 'translate-x-3' : '-translate-x-3'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                            {editData.auto_join_domain && PUBLIC_EMAIL_DOMAINS.includes(editData.auto_join_domain.toLowerCase()) && (
                                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                                    Auto-join is not available for public email domains (e.g., @gmail.com).
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-6 flex justify-end">
                                            <button 
                                                onClick={handleUpdate} 
                                                disabled={isSaving || (editData.auto_join_domain ? PUBLIC_EMAIL_DOMAINS.includes(editData.auto_join_domain.toLowerCase()) : false)} 
                                                className="px-12 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-emerald-500 hover:text-white disabled:opacity-50 transition-all rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                                            >
                                                {isSaving ? "Saving..." : "Update Security Settings"}
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                            ) : (
                                <div className="p-20 text-center bg-surface-100 border-surface-200 border border-surface-200 rounded-3xl">
                                    <div className="text-4xl mb-4 opacity-50">🔒</div>
                                    <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs">Restricted Access</p>
                                    <p className="text-surface-400 text-xs mt-2 font-medium">You must be an Organization Owner or Principal to view this section.</p>
                                </div>
                            )
                        )}
                        
                        {activeTab === "preferences" && (
                            <div className="max-w-4xl space-y-10">
                                <section className="bg-surface-50/40 backdrop-blur-3xl border border-white/20 dark:border-white/5 p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(var(--color-primary),0.1)] space-y-12 relative overflow-hidden group animate-in slide-in-from-bottom-4 duration-700">
                                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                    <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 arch-grid opacity-20 pointer-events-none mix-blend-overlay" />
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-3">
                                                <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
                                                Localization & Preferences
                                            </h3>
                                            <p className="text-xs text-surface-500 font-bold uppercase tracking-widest">Standardize formats for all firm members.</p>
                                        </div>
                                        {(!selectedOrg.metadata?.timezone || !selectedOrg.metadata?.currency) && (
                                            <span className="px-4 py-2 bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest rounded-xl animate-pulse shadow-[0_0_15px_rgba(var(--color-accent),0.2)]">
                                                ✨ Auto-Detected Defaults
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Base Timezone</label>
                                            <select 
                                                value={String((editData.metadata as any)?.[`timezone`] || "")} 
                                                onChange={e => updateMetadata("timezone", e.target.value)}
                                                className="w-full h-14 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 px-5 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 font-bold shadow-inner transition-all text-sm appearance-none"
                                            >
                                                <option value="">Select Timezone...</option>
                                                {/* In a real app, you'd map a full IANA list here. We'll use a simplified list. */}
                                                <option value="America/New_York">America/New_York (EST/EDT)</option>
                                                <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                                                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                                                <option value="Europe/London">Europe/London (GMT/BST)</option>
                                                <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                                                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                                                <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                                                {/* Fallback for auto-detected zones not in our tiny static list above */}
                                                {(editData.metadata as any)?.timezone && !["America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"].includes((editData.metadata as any)?.timezone) && (
                                                    <option value={(editData.metadata as any)?.timezone}>{(editData.metadata as any)?.timezone}</option>
                                                )}
                                            </select>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Base Currency</label>
                                            <select 
                                                value={String((editData.metadata as any)?.[`currency`] || "")} 
                                                onChange={e => updateMetadata("currency", e.target.value)}
                                                className="w-full h-14 bg-surface-50/50 backdrop-blur-md border border-white/10 dark:border-white/5 px-5 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 font-bold shadow-inner transition-all text-sm appearance-none"
                                            >
                                                <option value="">Select Currency...</option>
                                                <option value="USD">USD - US Dollar</option>
                                                <option value="EUR">EUR - Euro</option>
                                                <option value="GBP">GBP - British Pound</option>
                                                <option value="INR">INR - Indian Rupee</option>
                                                <option value="CAD">CAD - Canadian Dollar</option>
                                                <option value="AUD">AUD - Australian Dollar</option>
                                                <option value="JPY">JPY - Japanese Yen</option>
                                            </select>
                                        </div>

                                        <div className="space-y-3 md:col-span-2">
                                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Default Unit System</label>
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => updateMetadata("unit_system", "metric")}
                                                    className={`flex-1 py-5 border rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
                                                        (editData.metadata as any)?.unit_system === "metric" 
                                                        ? "bg-accent/10 border-accent/30 text-accent shadow-[0_0_15px_rgba(var(--color-accent),0.2)]" 
                                                        : "bg-surface-50/50 backdrop-blur-md border-white/10 dark:border-white/5 text-surface-400 hover:border-accent/30 hover:text-primary shadow-inner"
                                                    }`}
                                                >
                                                    Metric (m, cm, kg)
                                                </button>
                                                <button 
                                                    onClick={() => updateMetadata("unit_system", "imperial")}
                                                    className={`flex-1 py-5 border rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
                                                        (editData.metadata as any)?.unit_system === "imperial" 
                                                        ? "bg-accent/10 border-accent/30 text-accent shadow-[0_0_15px_rgba(var(--color-accent),0.2)]" 
                                                        : "bg-surface-50/50 backdrop-blur-md border-white/10 dark:border-white/5 text-surface-400 hover:border-accent/30 hover:text-primary shadow-inner"
                                                    }`}
                                                >
                                                    Imperial (ft, in, lbs)
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-surface-200/50 relative z-10">
                                        <button onClick={handleUpdate} disabled={isSaving} className="w-full h-16 bg-accent/10 border border-accent/30 text-accent font-black uppercase text-[10px] tracking-[0.3em] rounded-xl hover:bg-accent hover:text-background transition-all shadow-[0_0_15px_rgba(var(--color-accent),0.1)] hover:shadow-[0_0_30px_rgba(var(--color-accent),0.4)] disabled:opacity-50">
                                            {isSaving ? "Synchronizing Preferences..." : "Update Preferences"}
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}
                        
                        {activeTab === "templates" && (
                            <div className="animate-in fade-in duration-500">
                                <ChecklistTemplateManager />
                            </div>
                        )}
                        
                        {activeTab === "activity" && selectedOrg && (
                            <div className="animate-in fade-in duration-500">
                                <AuditLogsView orgId={selectedOrg.id} />
                            </div>
                        )}

                        {activeTab === "webhooks" && selectedOrg && (
                            canManageOrg ? (
                            <div className="animate-in fade-in duration-500">
                                <WebhooksView orgId={selectedOrg.id} />
                            </div>
                            ) : (
                                <div className="p-20 text-center bg-surface-100 border-surface-200 border border-surface-200 rounded-3xl">
                                    <div className="text-4xl mb-4 opacity-50">🔒</div>
                                    <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs">Restricted Access</p>
                                    <p className="text-surface-400 text-xs mt-2 font-medium">You must be an Organization Owner or Principal to view this section.</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Crop Modal */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-100 border-surface-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-surface-200">
            <div className="p-8 border-b border-surface-100 flex justify-between items-center bg-surface-50">
              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Adjust Organization Logo</h3>
                <p className="text-xs text-surface-500 text-surface-400 font-medium tracking-widest mt-1">Scale and position to fit the 1:1 format.</p>
              </div>
              <button onClick={() => setIsCropModalOpen(false)} className="text-surface-400 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 bg-surface-900 flex justify-center items-center max-h-[60vh] overflow-y-auto">
              {imgSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  className="max-h-full"
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    className="max-w-full max-h-[50vh] object-contain"
                  />
                </ReactCrop>
              )}
            </div>
            
            <div className="p-8 bg-surface-50 border-t border-surface-200 flex justify-end gap-4">
              <button 
                onClick={() => setIsCropModalOpen(false)}
                className="px-8 h-12 bg-surface-100 border-surface-200 border border-surface-200 text-surface-600 text-surface-300 font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCropSubmit}
                disabled={!completedCrop || isSaving}
                className="px-8 h-12 bg-accent text-background font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-colors disabled:opacity-50"
              >
                {isSaving ? "Uploading..." : "Confirm & Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
