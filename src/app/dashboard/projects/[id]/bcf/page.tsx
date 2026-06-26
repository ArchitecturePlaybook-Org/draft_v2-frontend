"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Bug, MessageSquare, Camera, Download, Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface BCFTopic {
  id: number;
  project: number;
  guid: string;
  title: string;
  topic_type: string;
  topic_status: string;
  priority: string;
  assigned_to: string;
  due_date: string | null;
  created_at: string;
}

export default function BCFDashboard() {
  const params = useParams();
  const projectId = params.id as string; // UID

  const [topics, setTopics] = useState<BCFTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTopics = async () => {
    setIsLoading(true);
    try {
      const res = await fetchFromBff<BCFTopic[]>(`/api/v1/projects/bcf-topics/?project_uid=${projectId}`);
      // Handle paginated responses just in case
      const data = Array.isArray(res) ? res : (res as any).results;
      setTopics(data || []);
    } catch (e) {
      toast.error("Failed to fetch BCF topics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [projectId]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append("file", file);

    const loadId = toast.loading("Importing BCF archive...");
    try {
      await fetchFromBff(`/api/v1/projects/projects/${projectId}/bcf/import/`, {
        method: "POST",
        body: formData,
      });
      toast.success("BCF Imported successfully", { id: loadId });
      fetchTopics();
    } catch (err) {
      toast.error("BCF Import failed", { id: loadId });
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = async () => {
    const loadId = toast.loading("Generating BCF archive...");
    try {
      const token = localStorage.getItem("auth_token") || "";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const url = `${baseUrl}/api/v1/projects/projects/${projectId}/bcf/export/`;
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `project_${projectId}_issues.bcfzip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Export successful", { id: loadId });
    } catch (err) {
      toast.error("Export failed", { id: loadId });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "Critical": return "danger";
      case "Major": return "warning";
      case "Minor": return "info";
      default: return "secondary";
    }
  };

  const columns = ["Open", "In Progress", "Resolved", "Closed"];

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="text-primary w-6 h-6" />
            BIM Issue Tracking (BCF)
          </h1>
          <p className="text-sm text-surface-500 text-surface-400">
            Import, export, and manage BIM Collaboration Format (.bcfzip) clash reports and issues.
          </p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".bcfzip" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImport}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import BCF
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export BCF
          </Button>
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            New Issue
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {columns.map(statusCol => {
            const colTopics = topics.filter(t => t.topic_status === statusCol);
            
            return (
              <div key={statusCol} className="w-[320px] flex flex-col gap-3 bg-surface-50/50 rounded-xl p-3 border border-surface-200">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-bold text-sm text-surface-700 uppercase tracking-widest">{statusCol}</h3>
                  <Badge variant="secondary">{colTopics.length}</Badge>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-1 flex-1 custom-scrollbar">
                  {colTopics.map(topic => {
                    const getBorderColorClass = (priority: string) => {
                      switch(priority) {
                        case "Critical": return "border-l-danger";
                        case "Major": return "border-l-warning";
                        case "Minor": return "border-l-info";
                        default: return "border-l-primary";
                      }
                    };

                    return (
                    <Card key={topic.guid} className={`p-3 hover:shadow-md transition-shadow cursor-pointer group border-l-4 ${getBorderColorClass(topic.priority)}`}>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-mono text-surface-400 truncate">{topic.guid.substring(0,8)}</span>
                          <Badge variant={getPriorityColor(topic.priority) as any} className="text-[10px] leading-none px-1.5 py-0.5">
                            {topic.priority}
                          </Badge>
                        </div>
                        
                        <p className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">
                          {topic.title}
                        </p>

                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-surface-100">
                          <div className="flex items-center gap-3 text-surface-400">
                            <span className="flex items-center gap-1 text-[10px]"><MessageSquare className="w-3 h-3" /></span>
                            <span className="flex items-center gap-1 text-[10px]"><Camera className="w-3 h-3" /></span>
                          </div>
                          {topic.assigned_to && (
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary" title={topic.assigned_to}>
                              {topic.assigned_to.substring(0,2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                    );
                  })}
                  
                  {colTopics.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-40 text-center">
                      <div className="w-10 h-10 border-2 border-dashed border-surface-300 rounded-lg mb-2"></div>
                      <span className="text-xs text-surface-500 text-surface-400 font-medium">Drop issues here</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
