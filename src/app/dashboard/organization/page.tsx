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
    } catch (err) {
      alert("Failed to synchronize firm data.");
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
      
      {/* Top Banner / Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-primary tracking-tighter uppercase flex items-center gap-4">
            Professional Entities
            <span className="px-3 py-1 bg-surface-100 text-surface-400 text-[10px] rounded-md border border-surface-200">
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
          className={`px-10 h-14 font-bold uppercase text-[10px] tracking-[0.25em] transition-all shadow-xl ${
            showCreate ? "bg-red-500 text-white" : "bg-primary text-white hover:bg-accent shadow-primary/20"
          }`}
        >
          {showCreate ? "Cancel Protocol" : "Establish New Firm"}
        </button>
      </div>

      {/* Creation Modal */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-12 border-2 border-primary rounded-2xl shadow-2xl animate-in slide-in-from-top-6 duration-500 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-full bg-primary/5 arch-grid opacity-10 pointer-events-none" />
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-primary uppercase tracking-tight">Establishment Protocol</h2>
                <p className="text-xs text-surface-400 uppercase tracking-widest">Register a new architectural or engineering firm in the central repository.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.2em]">Formal Firm Name</label>
                    <input 
                        type="text" required value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)}
                        className="w-full h-14 bg-surface-50 border border-surface-200 px-5 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-bold"
                        placeholder="SpaceDesign Studio & Partners"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.2em]">Administrative Email</label>
                    <input 
                        type="email" required value={newOrgEmail} onChange={(e) => setNewOrgEmail(e.target.value)}
                        className="w-full h-14 bg-surface-50 border border-surface-200 px-5 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-bold"
                        placeholder="operations@spacedesign.com"
                    />
                </div>
            </div>
            
            {isDetecting && (
              <div className="text-[10px] font-bold text-accent animate-pulse flex items-center gap-3 bg-accent/5 p-4 rounded-xl border border-accent/20">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                Auto-detecting regional configuration via browser locale...
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-surface-100">
                <div className="col-span-full mb-[-10px]">
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-accent">🌐</span> Regional Defaults
                  </p>
                </div>
                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-surface-500 uppercase tracking-[0.2em]">Base Timezone</label>
                    <input 
                        type="text" value={newOrgTimezone} onChange={(e) => setNewOrgTimezone(e.target.value)}
                        className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-bold text-xs"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-surface-500 uppercase tracking-[0.2em]">Default Currency</label>
                    <select 
                        value={newOrgCurrency} onChange={(e) => setNewOrgCurrency(e.target.value)}
                        className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-bold text-xs"
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
                        className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-bold text-xs"
                    >
                        <option value="metric">Metric (m, kg)</option>
                        <option value="imperial">Imperial (ft, lb)</option>
                    </select>
                </div>
            </div>

            <button type="submit" disabled={isSaving || isDetecting} className="w-full h-16 bg-accent text-white font-bold uppercase tracking-[0.3em] text-xs hover:shadow-2xl transition-all disabled:opacity-50">
              {isSaving ? "Provisioning Entity..." : "Confirm Establishment"}
            </button>
        </form>
      )}

      {orgs.length === 0 ? (
        <div className="text-center py-32 bg-surface-50 border-4 border-dashed border-surface-200 rounded-[3rem] space-y-6">
            <div className="w-24 h-24 bg-surface-100 rounded-full mx-auto flex items-center justify-center text-4xl opacity-20 italic font-bold">🏛️</div>
            <div className="space-y-2">
                <p className="text-xl font-bold text-primary tracking-tight">No Professional Firms Detected</p>
                <p className="text-sm text-surface-500 max-w-sm mx-auto">Initialize a new firm protocol or request an invitation from an existing administrator.</p>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
            
            {/* Firm Selector Sidebar */}
            <div className="xl:col-span-1 space-y-6">
                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-surface-400 ml-2">Active Indices</label>
                <div className="space-y-3">
                    {orgs.map((org) => (
                        <div 
                            key={org.id} 
                            onClick={() => setSelectedOrg(org)}
                            className={`p-6 rounded-2xl cursor-pointer transition-all border group relative overflow-hidden ${
                                selectedOrg?.id === org.id 
                                ? "bg-primary text-white border-primary shadow-2xl scale-[1.02]" 
                                : "bg-white text-primary border-surface-200 hover:border-accent/40 shadow-sm"
                            }`}
                        >
                            <div className="absolute top-0 right-0 w-20 h-full bg-white/5 arch-grid opacity-10" />
                            <h3 className="font-bold text-sm tracking-tight mb-1 truncate">{org.name}</h3>
                            <p className={`text-[10px] uppercase tracking-widest font-bold ${selectedOrg?.id === org.id ? "opacity-60" : "text-accent"}`}>
                                {org.uid.split('ap')[1]} · organization
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Firm Workspace */}
            {selectedOrg && (
                <div className="xl:col-span-3 space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
                    
                    {/* Workspace Header */}
                    <div className="bg-white p-10 border border-surface-200 rounded-3xl shadow-sm flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-full bg-primary/5 arch-grid opacity-10 pointer-events-none" />
                        <div className="relative group shrink-0">
                            <input 
                                type="file" 
                                ref={logoInputRef} 
                                onChange={handleLogoUpload} 
                                className="hidden" 
                                accept="image/*" 
                            />
                            <div 
                                onClick={() => logoInputRef.current?.click()}
                                className="w-24 h-24 bg-primary text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-2xl border-4 border-white overflow-hidden cursor-pointer relative"
                            >
                                {selectedOrg.logo ? (
                                    <img src={selectedOrg.logo} className="w-full h-full object-cover" />
                                ) : (
                                    selectedOrg.name.charAt(0)
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3 text-center md:text-left">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-bold text-primary tracking-tighter">{selectedOrg.name}</h2>
                                <p className="text-accent text-[11px] font-bold uppercase tracking-[0.3em] italic">{selectedOrg.tagline || "No professional tagline defined"}</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Verified Entity
                                </span>
                                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">
                                    EST {new Date(selectedOrg.created_at || new Date().toISOString()).getFullYear()}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsEditing(!isEditing)} className="px-6 py-3 border border-surface-200 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-surface-50 transition-all">
                                {isEditing ? "Lock Data" : "Edit Specification"}
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex border-b border-surface-200 overflow-x-auto no-scrollbar scroll-smooth">
                        {(["overview", "team", "brand", "compliance", "templates", "activity", "security", "preferences", "webhooks"] as OrgTabType[])
                        .filter(tab => canManageOrg || !["team", "compliance", "security", "webhooks"].includes(tab))
                        .map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
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
                    <div className="animate-in fade-in duration-500">
                        {activeTab === "overview" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <section className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm space-y-8">
                                    <h3 className="text-xs font-bold text-primary uppercase tracking-[0.3em] border-l-4 border-accent pl-4">Contact Specification</h3>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Office HQ Address</label>
                                            {isEditing ? (
                                                <textarea value={editData.address || ""} onChange={e => setEditData({...editData, address: e.target.value})} className="w-full h-24 p-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-sm" />
                                            ) : (
                                                <p className="text-sm font-bold text-primary leading-relaxed">{selectedOrg.address || "No address defined."}</p>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Business Phone</label>
                                                {isEditing ? (
                                                    <input type="text" value={editData.phone || ""} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-sm" />
                                                ) : (
                                                    <p className="text-sm font-bold text-primary">{selectedOrg.phone || "—"}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Main Website</label>
                                                {isEditing ? (
                                                    <input type="text" value={editData.website || ""} onChange={e => setEditData({...editData, website: e.target.value})} className="w-full h-11 px-4 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-sm" />
                                                ) : (
                                                    <p className="text-sm font-bold text-accent truncate underline">{selectedOrg.website || "—"}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isEditing && (
                                        <button onClick={handleUpdate} disabled={isSaving} className="w-full h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent shadow-xl shadow-primary/10">
                                            {isSaving ? "Saving..." : "Commit Overview Changes"}
                                        </button>
                                    )}
                                </section>

                                <section className="space-y-8">
                                    <div className="bg-surface-900 text-white p-10 rounded-2xl space-y-6 relative overflow-hidden shadow-2xl">
                                        <div className="absolute top-0 right-0 w-40 h-40 arch-grid opacity-10 pointer-events-none" />
                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">System Registry</h3>
                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold uppercase opacity-30 tracking-[0.2em]">Global UID</label>
                                                <p className="text-xs font-mono text-white/90">{selectedOrg.uid}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold uppercase opacity-30 tracking-[0.2em]">Entity Type</label>
                                                <p className="text-xs font-bold text-white/90 uppercase tracking-widest">organization</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white border border-surface-200 p-8 rounded-2xl shadow-sm space-y-4">
                                        <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">Social Footprint</h3>
                                        <div className="flex flex-col gap-4">
                                            {['LinkedIn', 'Instagram', 'Twitter'].map(link => {
                                                const key = link.toLowerCase();
                                                const val = (editData.social_links as any)?.[key] || "";
                                                const staticVal = (selectedOrg.social_links as any)?.[key];
                                                
                                                if (isEditing) {
                                                    return (
                                                        <div key={link} className="flex items-center gap-3">
                                                            <div className="w-10 h-10 shrink-0 bg-surface-50 border border-surface-200 rounded-lg flex items-center justify-center text-xs">🔗</div>
                                                            <input 
                                                                type="text" 
                                                                placeholder={`${link} URL`}
                                                                value={val}
                                                                onChange={(e) => setEditData(prev => ({
                                                                    ...prev, 
                                                                    social_links: { ...(prev.social_links || {}), [key]: e.target.value }
                                                                }))}
                                                                className="flex-1 h-10 px-4 bg-surface-50 border border-surface-200 rounded-lg outline-none focus:border-accent text-sm"
                                                            />
                                                        </div>
                                                    );
                                                }
                                                
                                                if (!staticVal) return null;
                                                return (
                                                    <a key={link} href={staticVal} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-surface-50 border border-surface-200 rounded-xl hover:border-accent transition-all group cursor-pointer">
                                                        <div className="w-8 h-8 bg-white border border-surface-100 rounded-md flex items-center justify-center text-xs group-hover:scale-110 transition-transform">🔗</div>
                                                        <span className="text-sm font-bold text-primary">{link}</span>
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
                                    <section className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="p-8 border-b border-surface-100 flex justify-between items-center bg-surface-50/30">
                                            <h3 className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">Active Personnel</h3>
                                            <span className="text-[10px] font-bold text-surface-400 uppercase">{members.length} Members</span>
                                        </div>
                                        <div className="divide-y divide-surface-100">
                                            {members.map((member) => (
                                                <div key={member.id} className="p-8 flex items-center justify-between hover:bg-surface-50/50 transition-colors">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-lg">
                                                            {member.user.name.charAt(0)}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="font-bold text-primary text-sm tracking-tight">{member.user.name}</p>
                                                            <p className="text-[10px] text-surface-400 font-medium">{member.user.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <span className={`px-3 py-1 text-white text-[9px] font-bold uppercase tracking-[0.15em] rounded-md shadow-sm ${ROLE_DISPLAY[member.role]?.color || 'bg-surface-400'}`}>
                                                            {ROLE_DISPLAY[member.role]?.label || member.role}
                                                        </span>
                                                        <button 
                                                            onClick={() => handleRemoveMember(member.id, member.user.name)}
                                                            className="text-surface-300 hover:text-red-500 transition-colors"
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
                                        <section className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                                            <div className="p-8 border-b border-surface-100 flex justify-between items-center bg-amber-50/20">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                                    <h3 className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">Pending Dispatches</h3>
                                                </div>
                                                <span className="text-[10px] font-bold text-surface-400 uppercase">{invitations.length} Awaiting</span>
                                            </div>
                                            <div className="divide-y divide-surface-100">
                                                {invitations.map((invite) => (
                                                    <div key={invite.id} className="p-8 flex items-center justify-between">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold text-lg opacity-60">
                                                                {invite.email.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="font-bold text-primary/60 text-sm tracking-tight italic">{invite.email}</p>
                                                                <p className="text-[9px] text-amber-600/70 font-bold uppercase tracking-widest">
                                                                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <span className="px-3 py-1 bg-surface-100 text-surface-500 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md">
                                                                {ROLE_DISPLAY[invite.role]?.label || invite.role}
                                                            </span>
                                                            <button 
                                                                onClick={() => handleRevoke(invite.id)}
                                                                className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
                                    <div className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm space-y-8">
                                        <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Dispatch Invitation</h3>
                                        <form onSubmit={handleInvite} className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Colleague Email</label>
                                                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-sm" placeholder="colleague@firm.com" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Assigned Role</label>
                                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-accent text-sm">
                                                    {Object.entries(ROLE_DISPLAY).map(([role, info]) => (
                                                        <option key={role} value={role}>{info.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button type="submit" className="w-full h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-accent shadow-xl shadow-primary/10">
                                                Dispatch Secure Token
                                            </button>
                                        </form>
                                        <div className="pt-4 border-t border-surface-100">
                                            <p className="text-[9px] text-surface-400 leading-relaxed uppercase tracking-widest">
                                                Invited users will have access to the firm's shared project repository and resource pool according to their role specification.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                            ) : (
                                <div className="p-20 text-center bg-white border border-surface-200 rounded-3xl">
                                    <div className="text-4xl mb-4 opacity-50">🔒</div>
                                    <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs">Restricted Access</p>
                                    <p className="text-surface-400 text-xs mt-2 font-medium">You must be an Organization Owner or Principal to view this section.</p>
                                </div>
                            )
                        )}

                        {activeTab === "brand" && (
                            <div className="max-w-4xl space-y-10">
                                <section className="bg-white p-12 border border-surface-200 rounded-2xl shadow-sm space-y-12">
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Visual Identity Specification</h3>
                                        <p className="text-xs text-surface-400 uppercase tracking-widest">Manage how your firm is perceived in project documents and AI reports.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Firm Logo (Primary)</label>
                                                <div 
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="w-40 h-40 bg-surface-50 border-2 border-dashed border-surface-200 rounded-3xl flex flex-col items-center justify-center text-center p-6 gap-3 group cursor-pointer hover:border-accent hover:bg-white transition-all overflow-hidden relative"
                                                >
                                                    {selectedOrg.logo ? (
                                                        <>
                                                            <img src={selectedOrg.logo} className="absolute inset-0 w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="text-[9px] font-bold text-white uppercase tracking-widest">Update Logo</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="text-2xl opacity-20 group-hover:scale-110 transition-transform">🖼️</span>
                                                            <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Drop SVG / PNG</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Firm Tagline / Motto</label>
                                                <input type="text" value={editData.tagline || ""} onChange={e => setEditData({...editData, tagline: e.target.value})} className="w-full h-12 bg-surface-50 border border-surface-200 px-5 rounded-xl outline-none focus:border-accent font-medium text-sm" placeholder="Elevating Structural Excellence" />
                                            </div>
                                        </div>
                                        <div className="bg-surface-50 rounded-3xl p-10 border border-surface-100 flex flex-col justify-center space-y-6">
                                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-accent">🎨</div>
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-bold text-primary tracking-tight">Identity Synchronization</h4>
                                                <p className="text-xs text-surface-500 leading-relaxed">Your brand assets will be automatically embedded in generated blueprints, task reports, and client presentations to maintain professional consistency.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-surface-100 flex justify-end">
                                        <button onClick={handleUpdate} disabled={isSaving} className="px-10 h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em]">Save Visual Identity</button>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === "compliance" && (
                            canManageOrg ? (
                            <div className="max-w-4xl space-y-10">
                                <section className="bg-white p-12 border border-surface-200 rounded-2xl shadow-sm space-y-12">
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Regulatory & Compliance Layer</h3>
                                        <p className="text-xs text-surface-400 uppercase tracking-widest font-medium italic text-red-600/70">Restricted to Account Owners & Principals</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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
                                                    className="w-full h-12 bg-surface-50 border border-surface-200 px-5 rounded-xl outline-none focus:border-accent text-sm font-mono" 
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-8 border-t border-surface-100">
                                        <button onClick={handleUpdate} disabled={isSaving} className="w-full h-16 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent shadow-2xl shadow-primary/20 transition-all">
                                            {isSaving ? "Synchronizing Compliance Index..." : "Update Regulatory Metadata"}
                                        </button>
                                    </div>
                                </section>
                            </div>
                            ) : (
                                <div className="p-20 text-center bg-white border border-surface-200 rounded-3xl">
                                    <div className="text-4xl mb-4 opacity-50">🔒</div>
                                    <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs">Restricted Access</p>
                                    <p className="text-surface-400 text-xs mt-2 font-medium">You must be an Organization Owner or Principal to view this section.</p>
                                </div>
                            )
                        )}
                        
                        {activeTab === "security" && (
                            canManageOrg ? (
                            <div className="max-w-4xl space-y-10">
                                <section className="bg-white p-12 border border-surface-200 rounded-2xl shadow-sm space-y-12">
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Security & Onboarding</h3>
                                        <p className="text-xs text-surface-400 uppercase tracking-widest font-medium">Manage access protocols and domain claiming.</p>
                                    </div>

                                    <div className="space-y-8 bg-surface-50 p-8 rounded-2xl border border-surface-200">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-primary uppercase tracking-widest text-xs">Domain Auto-Join</h4>
                                            <p className="text-xs text-surface-500 max-w-2xl leading-relaxed">
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
                                                    className="flex-1 h-12 bg-white border border-surface-200 px-5 rounded-xl outline-none focus:border-accent text-sm font-mono"
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
                                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                                                    Auto-join is not available for public email domains (e.g., @gmail.com).
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 flex justify-end">
                                            <button 
                                                onClick={handleUpdate} 
                                                disabled={isSaving || (editData.auto_join_domain ? PUBLIC_EMAIL_DOMAINS.includes(editData.auto_join_domain.toLowerCase()) : false)} 
                                                className="px-10 h-12 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent disabled:opacity-50 transition-all"
                                            >
                                                {isSaving ? "Saving..." : "Update Security Settings"}
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                            ) : (
                                <div className="p-20 text-center bg-white border border-surface-200 rounded-3xl">
                                    <div className="text-4xl mb-4 opacity-50">🔒</div>
                                    <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs">Restricted Access</p>
                                    <p className="text-surface-400 text-xs mt-2 font-medium">You must be an Organization Owner or Principal to view this section.</p>
                                </div>
                            )
                        )}
                        
                        {activeTab === "preferences" && (
                            <div className="max-w-4xl space-y-10">
                                <section className="bg-white p-12 border border-surface-200 rounded-2xl shadow-sm space-y-12">
                                    <div className="space-y-2 flex justify-between items-start">
                                        <div>
                                            <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Localization & Preferences</h3>
                                            <p className="text-xs text-surface-400 uppercase tracking-widest font-medium">Standardize formats for all firm members.</p>
                                        </div>
                                        {(!selectedOrg.metadata?.timezone || !selectedOrg.metadata?.currency) && (
                                            <span className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-md animate-pulse">
                                                ✨ Auto-Detected Defaults
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Base Timezone</label>
                                            <select 
                                                value={String((editData.metadata as any)?.[`timezone`] || "")} 
                                                onChange={e => updateMetadata("timezone", e.target.value)}
                                                className="w-full h-12 bg-surface-50 border border-surface-200 px-5 rounded-xl outline-none focus:border-accent text-sm"
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
                                                className="w-full h-12 bg-surface-50 border border-surface-200 px-5 rounded-xl outline-none focus:border-accent text-sm"
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
                                                    className={`flex-1 py-4 border rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${
                                                        (editData.metadata as any)?.unit_system === "metric" 
                                                        ? "bg-primary border-primary text-white shadow-xl" 
                                                        : "bg-surface-50 border-surface-200 text-surface-500 hover:border-accent"
                                                    }`}
                                                >
                                                    Metric (m, cm, kg)
                                                </button>
                                                <button 
                                                    onClick={() => updateMetadata("unit_system", "imperial")}
                                                    className={`flex-1 py-4 border rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${
                                                        (editData.metadata as any)?.unit_system === "imperial" 
                                                        ? "bg-primary border-primary text-white shadow-xl" 
                                                        : "bg-surface-50 border-surface-200 text-surface-500 hover:border-accent"
                                                    }`}
                                                >
                                                    Imperial (ft, in, lbs)
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-surface-100">
                                        <button onClick={handleUpdate} disabled={isSaving} className="w-full h-16 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent shadow-2xl shadow-primary/20 transition-all">
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
                                <div className="p-20 text-center bg-white border border-surface-200 rounded-3xl">
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
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-surface-200">
            <div className="p-8 border-b border-surface-100 flex justify-between items-center bg-surface-50">
              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Adjust Organization Logo</h3>
                <p className="text-xs text-surface-500 font-medium tracking-widest mt-1">Scale and position to fit the 1:1 format.</p>
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
                className="px-8 h-12 bg-white border border-surface-200 text-surface-600 font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCropSubmit}
                disabled={!completedCrop || isSaving}
                className="px-8 h-12 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-colors disabled:opacity-50"
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
