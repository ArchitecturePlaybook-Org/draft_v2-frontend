"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/domains/auth/api";
import { orgsApi } from "@/domains/orgs/api";
import { portfoliosApi, PortfolioItem } from "@/domains/portfolios/api";

type TabType = "overview" | "professional" | "portfolio" | "organization" | "security" | "activity";

interface FieldSchema {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date";
  placeholder?: string;
  options?: string[];
}

const CATEGORY_SCHEMAS: Record<string, FieldSchema[]> = {
  architect: [
    { key: "license_number", label: "Professional License Number", type: "text", placeholder: "e.g. ARB-123456" },
    { key: "registration_body", label: "Registration Body", type: "select", options: ["ARB (UK)", "AIA (US)", "RIBA", "COA (India)", "Other"] },
    { key: "years_of_experience", label: "Years of Practice", type: "number" },
    { key: "primary_software", label: "Main Design Software", type: "select", options: ["Revit", "AutoCAD", "ArchiCAD", "Rhino", "SketchUp"] },
  ],
  contractor: [
    { key: "company_reg_number", label: "Company Registration", type: "text" },
    { key: "primary_trade", label: "Primary Trade", type: "select", options: ["General Construction", "MEP", "Structural", "Civil", "Finishing"] },
    { key: "insurance_limit", label: "Liability Insurance Limit", type: "text", placeholder: "e.g. $5M" },
    { key: "safety_rating", label: "Safety Performance Rating", type: "select", options: ["A+", "A", "B", "C"] },
  ],
  supplier: [
    { key: "product_category", label: "Main Product Line", type: "select", options: ["Raw Materials", "Finishes", "Equipment", "Structural Components"] },
    { key: "delivery_radius", label: "Max Delivery Radius (km)", type: "number" },
    { key: "credit_terms", label: "Available Credit Terms", type: "select", options: ["30 Days", "60 Days", "Prepaid", "Negotiable"] },
    { key: "warehouse_location", label: "Primary Dispatch Location", type: "text" },
  ],
  client: [
    { key: "project_interest", label: "Main Project Interest", type: "select", options: ["Residential", "Commercial", "Industrial", "Renovation"] },
    { key: "budget_range", label: "Planned Budget Range", type: "select", options: ["<$100k", "$100k-$500k", "$500k-$1M", ">$1M"] },
    { key: "estimated_start", label: "Target Start Date", type: "date" },
  ],
};

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
    if (!user) return 0;
    const baseFields = [
      user.name,
      user.email,
      user.profile?.bio,
      user.profile?.phone_number,
    ];
    
    // Add category-specific metadata fields to completion check
    const schemaFields = currentSchema.map(s => metadata[s.key]);
    
    const allFields = [...baseFields, ...schemaFields];
    const filled = allFields.filter(f => !!f).length;
    return Math.round((filled / allFields.length) * 100);
  }, [user, currentSchema, metadata]);

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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const updatedUser = await authApi.uploadAvatar(file);
      setUser(updatedUser);
      setSuccess("Profile picture updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to upload image.");
    } finally {
      setIsLoading(false);
    }
  }

  const updateMetadataField = (key: string, value: any) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

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
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Visual Asset (Image)</label>
                        <input type="file" name="image" required accept="image/*" className="w-full text-sm text-surface-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
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
                    <input type="password" placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">New Security Token</label>
                    <input type="password" placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Verify New Token</label>
                    <input type="password" placeholder="••••••••" className="w-full h-12 px-5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent" />
                  </div>
                </div>
                <div className="bg-surface-50 rounded-2xl p-8 space-y-4 border border-surface-100 flex flex-col justify-center">
                  <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">Security Protocol</h3>
                  <p className="text-[11px] text-surface-500 leading-relaxed">System policy requires credential rotation every 90 days. Multi-factor authentication is enforced for all administrative level modifications.</p>
                  <div className="pt-2">
                    <button className="text-[10px] font-bold text-accent uppercase tracking-widest border-b border-accent/20 hover:border-accent">Enable 2FA Protection</button>
                  </div>
                </div>
              </div>

              <button className="w-full h-14 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-accent transition-all shadow-xl shadow-primary/20 mt-4">
                Rotate Security Credentials
              </button>
            </section>

            <section className="bg-red-50 border border-red-100 p-10 rounded-2xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <h3 className="text-xs font-bold text-red-900 uppercase tracking-[0.2em]">Critical Decommission Zone</h3>
              </div>
              <p className="text-xs text-red-700 leading-relaxed max-w-lg">Initiating identity decommissioning will permanently terminate all project access, membership tokens, and audit logs associated with this UID.</p>
              <button className="text-[10px] font-bold text-red-600 uppercase border-b-2 border-red-200 hover:border-red-600 transition-all pb-1">Decommission System Identity</button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
