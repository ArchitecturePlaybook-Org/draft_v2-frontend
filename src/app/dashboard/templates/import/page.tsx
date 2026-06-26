"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { projectsApi } from "@/domains/projects/api";
import { orgsApi } from "@/domains/orgs/api";
import { Spinner } from "@/components/ui/Spinner";

function ImportTemplateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  useEffect(() => {
    orgsApi.listOrgs().then(data => {
      const orgList = Array.isArray(data) ? data : (data as any).results || [];
      setOrgs(orgList);
      if (orgList.length > 0) {
        setSelectedAccountId(orgList[0].id.toString());
      }
    }).catch(err => {
      setError("Failed to load your accounts.");
    });
  }, []);

  if (!token) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold text-red-500">Invalid Link</h1>
        <p>No template token provided in the URL.</p>
      </div>
    );
  }

  const handleImport = async () => {
    if (!selectedAccountId) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await projectsApi.importTemplate(token, parseInt(selectedAccountId));
      alert("Template imported successfully!");
      router.push(`/dashboard/projects/${res.uid}`);
    } catch (err: any) {
      setError(err.message || "Failed to import template. Ensure the token is valid.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-32 bg-surface-50/40 backdrop-blur-2xl p-12 rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-2xl shadow-primary/10 relative overflow-hidden group hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:-translate-y-2 transition-all duration-500">
      <div className="absolute top-0 right-0 w-full h-full arch-grid opacity-[0.05] pointer-events-none mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="relative z-10">
        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] flex items-center gap-2 mb-4">
          <span className="w-2 h-2 bg-accent rounded-sm animate-pulse shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
          Blueprint Invitation
        </h3>
        <h1 className="text-4xl font-black text-primary mb-4 tracking-tighter">Import Shared Template</h1>
        <p className="text-surface-400 font-bold uppercase tracking-widest text-[10px] leading-relaxed mb-10">
          You've been invited to use a shared Architectural Blueprint Template. Select an account to save it to.
        </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-10 relative z-10">
        <label className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Target Account</label>
        <div className="relative">
          <select 
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            className="w-full h-14 bg-white/5 border border-white/10 px-5 rounded-xl outline-none focus:border-accent focus:ring-1 focus:ring-accent font-black text-xs text-primary appearance-none cursor-pointer hover:bg-white/10 transition-colors backdrop-blur-md"
          >
            {orgs.map(org => (
              <option key={org.id} value={org.id} className="bg-surface-900 text-primary">{org.name} ({org.account_type})</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>
      </div>

      <button
        onClick={handleImport}
        disabled={isLoading || !selectedAccountId}
        className="w-full h-14 bg-accent hover:bg-accent text-background font-black text-[10px] uppercase tracking-[0.3em] rounded-xl shadow-[0_0_15px_rgba(var(--color-accent),0.4)] transition-all disabled:opacity-50 relative z-10 hover:scale-[1.02]"
      >
        {isLoading ? <Spinner size="sm" label="Importing..." /> : "Import Template"}
      </button>
      </div>
    </div>
  );
}

export default function ImportTemplatePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><Spinner size="lg" label="Loading..." /></div>}>
      <ImportTemplateInner />
    </Suspense>
  );
}
