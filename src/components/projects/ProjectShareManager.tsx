"use client";

import React, { useState, useEffect } from "react";
import { Copy, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { projectsApi } from "@/domains/projects/api";

export default function ProjectShareManager({ projectId }: { projectId: string }) {
  const [links, setLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");

  useEffect(() => {
    fetchLinks();
  }, [projectId]);

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const data = await projectsApi.getShareLinks(projectId);
      setLinks(data);
    } catch (error) {
      console.error("Failed to fetch share links", error);
      toast.error("Failed to fetch links.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateLink = async () => {
    try {
      setIsGenerating(true);
      await projectsApi.createShareLink(projectId, expiresInDays || null);
      toast.success("Shareable link generated successfully!");
      fetchLinks();
      setExpiresInDays("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate link.");
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeLink = async (token: string) => {
    if (!confirm("Are you sure you want to revoke this link? Anyone with this link will immediately lose access.")) return;
    try {
      await projectsApi.revokeShareLink(projectId, token);
      toast.success("Link revoked.");
      fetchLinks();
    } catch (error) {
      console.error(error);
      toast.error("Failed to revoke link.");
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm mt-6">
      <h3 className="text-lg font-semibold text-neutral-800 mb-2">Public Dashboard Links</h3>
      <p className="text-sm text-neutral-500 mb-6">
        Generate read-only, infographic-heavy dashboard links to share with clients or stakeholders. These links do not expose sensitive project tasks or internal communication.
      </p>

      {/* Generate Section */}
      <div className="flex items-end gap-4 mb-8 bg-neutral-50 p-4 rounded-md border border-neutral-100">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-700 mb-1">Expiration (Days)</label>
          <input
            type="number"
            placeholder="Leave empty for no expiration"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : "")}
            className="w-full text-sm rounded-md border-neutral-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-10 px-3 border"
            min="1"
          />
        </div>
        <button
          onClick={generateLink}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors flex items-center h-10 shadow-sm"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-2" />
          )}
          Generate New Link
        </button>
      </div>

      {/* List Section */}
      {isLoading ? (
        <div className="text-sm text-neutral-500 py-4 text-center">Loading active links...</div>
      ) : links.length === 0 ? (
        <div className="text-sm text-neutral-500 py-4 text-center border border-dashed border-neutral-200 rounded-md bg-neutral-50">
          No active shareable links found.
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.token} className="flex items-center justify-between p-3 rounded-md border border-neutral-200 bg-white shadow-sm hover:border-indigo-200 transition-colors">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-neutral-800 truncate">
                    {window.location.origin}/share/{link.token}
                  </span>
                  {!link.is_valid && (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      Expired
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-500">
                  Created {format(new Date(link.created_at), "MMM d, yyyy")}
                  {link.expires_at && ` • Expires ${format(new Date(link.expires_at), "MMM d, yyyy")}`}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => copyToClipboard(link.token)}
                  className="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Copy Link"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => revokeLink(link.token)}
                  className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Revoke Link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
