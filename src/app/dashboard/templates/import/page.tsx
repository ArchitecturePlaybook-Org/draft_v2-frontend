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
    <div className="max-w-2xl mx-auto mt-20 bg-white p-10 rounded-2xl border border-surface-200 shadow-xl">
      <h1 className="text-3xl font-extrabold text-primary mb-4">Import Shared Template</h1>
      <p className="text-surface-500 mb-8">
        You've been invited to use a shared Architectural Blueprint Template. Select an account to save it to.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-8">
        <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Target Account</label>
        <select 
          value={selectedAccountId}
          onChange={e => setSelectedAccountId(e.target.value)}
          className="w-full h-12 bg-surface-50 border border-surface-200 px-4 rounded-xl outline-none focus:border-accent font-bold text-sm text-primary appearance-none"
        >
          {orgs.map(org => (
            <option key={org.id} value={org.id}>{org.name} ({org.account_type})</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleImport}
        disabled={isLoading || !selectedAccountId}
        className="w-full h-12 bg-primary text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-accent transition-all disabled:opacity-50"
      >
        {isLoading ? <Spinner size="sm" label="Importing..." /> : "Import Template"}
      </button>
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
