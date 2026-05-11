"use client";

import { useEffect, useState } from "react";
import { orgsApi } from "@/domains/orgs/api";
import { Organization, Invitation } from "@/types/auth";

export default function OrganizationPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  
  // Create Form State
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgEmail, setNewOrgEmail] = useState("");
  
  // Invite State
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    loadOrgs();
  }, []);

  async function loadOrgs() {
    setIsLoading(true);
    try {
      const data = await orgsApi.listOrgs();
      setOrgs(data);
      if (data.length > 0) setSelectedOrg(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await orgsApi.createOrg({ name: newOrgName, email: newOrgEmail });
      setNewOrgName("");
      setNewOrgEmail("");
      setShowCreate(false);
      loadOrgs();
    } catch (err) {
      alert("Failed to create firm.");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrg) return;
    try {
      await orgsApi.sendInvitation(selectedOrg.id, { email: inviteEmail, role: "employee" });
      setInviteEmail("");
      alert("Invitation sent successfully!");
    } catch (err) {
      alert("Failed to send invitation.");
    }
  }

  if (isLoading) return <div className="p-12 text-center text-surface-600 font-medium">Synchronizing Firm Data...</div>;

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 space-y-16">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">
            <h1 className="text-4xl font-bold text-primary tracking-tighter uppercase">Firm Management</h1>
            <p className="text-surface-600 font-medium italic">Oversee your architectural practice and collaborators.</p>
        </div>
        <button 
            onClick={() => setShowCreate(!showCreate)}
            className="px-6 h-12 bg-primary text-white font-bold uppercase text-xs tracking-widest hover:bg-accent transition-all"
        >
            {showCreate ? "Cancel" : "Establish New Firm"}
        </button>
      </div>

      {/* Establishment Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-10 border-2 border-primary rounded-2xl animate-in slide-in-from-top-4 duration-500 space-y-8">
            <h2 className="text-xl font-bold text-primary italic">Establishment Protocol</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest">Firm Name</label>
                    <input 
                        type="text" 
                        required
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        className="w-full h-14 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent"
                        placeholder="SpaceDesign Studio"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest">Business Email</label>
                    <input 
                        type="email" 
                        required
                        value={newOrgEmail}
                        onChange={(e) => setNewOrgEmail(e.target.value)}
                        className="w-full h-14 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent"
                        placeholder="contact@spacedesign.com"
                    />
                </div>
            </div>
            <button type="submit" className="w-full h-14 bg-accent text-white font-bold uppercase tracking-widest">Register Firm</button>
        </form>
      )}

      {orgs.length === 0 ? (
        <div className="text-center py-20 bg-surface-50 border-2 border-dashed border-surface-200 rounded-3xl">
            <p className="text-surface-600 font-medium">No professional firms linked to this account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            
            {/* Firm List */}
            <div className="space-y-6">
                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-surface-400">Active Licenses</label>
                {orgs.map((org) => (
                    <div 
                        key={org.id} 
                        onClick={() => setSelectedOrg(org)}
                        className={`p-6 rounded-2xl cursor-pointer transition-all border ${
                            selectedOrg?.id === org.id 
                            ? "bg-primary text-white border-primary shadow-2xl" 
                            : "bg-white text-primary border-surface-200 hover:border-accent/40"
                        }`}
                    >
                        <h3 className="font-bold text-lg mb-1">{org.name}</h3>
                        <p className={`text-xs ${selectedOrg?.id === org.id ? "opacity-60" : "text-surface-600"}`}>{org.email || "No email"}</p>
                    </div>
                ))}
            </div>

            {/* Firm Details and Collaboration */}
            {selectedOrg && (
                <div className="lg:col-span-2 space-y-12 animate-in fade-in duration-700">
                    <section className="bg-white p-10 border border-surface-200 rounded-2xl arch-grid opacity-10 min-h-[400px]">
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-12">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-primary tracking-tighter">{selectedOrg.name}</h2>
                                    <span className="text-[10px] bg-accent/10 text-accent font-bold px-2 py-1 rounded uppercase tracking-widest">Boutique Studio</span>
                                </div>
                                <div className="w-16 h-16 bg-surface-100 rounded-xl flex items-center justify-center text-2xl">
                                    🏛️
                                </div>
                            </div>

                            {/* Invite Module */}
                            <div className="mt-auto p-8 bg-surface-50 rounded-2xl border border-surface-100">
                                <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Colleague Invitation</h3>
                                <form onSubmit={handleInvite} className="flex gap-4">
                                    <input 
                                        type="email" 
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="flex-1 h-12 bg-white border border-surface-200 px-4 rounded-xl outline-none focus:border-accent text-sm"
                                        placeholder="colleague@firm.com"
                                    />
                                    <button type="submit" className="px-8 h-12 bg-primary text-white font-bold uppercase text-[10px] tracking-[0.2em]">Send Invite</button>
                                </form>
                                <p className="text-[10px] text-surface-400 mt-4 leading-relaxed">
                                    Recipients will receive a secure token to join <span className="text-primary font-bold">{selectedOrg.name}</span> as a Firm Employee.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
