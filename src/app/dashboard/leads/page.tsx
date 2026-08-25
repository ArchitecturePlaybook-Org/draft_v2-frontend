"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { leadsApi, Lead, LeadAnalytics } from '@/domains/leads/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { communicationsApi, Message } from "@/domains/communications/api";
import { useAuthStore } from "@/store/auth-store";
import { useLeadWebSocket } from "@/shared/hooks/useLeadWebSocket";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  MessageSquare, CheckCircle2, XCircle, ArrowUpRight, 
  Download, Sparkles, Building2, Calendar, DollarSign, Eye, X, Check
} from 'lucide-react';

const ITEMS_PER_PAGE = 8;

export default function LeadsPage() {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  
  // Primary Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  // Search, Filter, Sort & Selection State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'status'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  // Chat Modal State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number | string; name: string } | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [activeThread, setActiveThread] = useState<Message[]>([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Leads & Analytics
  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const data = await leadsApi.listLeads(activeTab);
      setLeads(data);
      if (activeTab === 'received') {
        const stats = await leadsApi.getAnalytics();
        setAnalytics(stats);
      } else {
        setAnalytics(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    setCurrentPage(1);
    setSelectedLeadIds([]);
  }, [activeTab]);

  const handleStatusUpdate = async (id: number, status: Lead['status']) => {
    try {
      await leadsApi.updateLeadStatus(id, status);
      fetchLeads();
      if (detailLead && detailLead.id === id) {
        setDetailLead(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  // Bulk Batch Actions
  const handleBulkStatusUpdate = async (status: Lead['status']) => {
    if (selectedLeadIds.length === 0) return;
    try {
      await Promise.all(selectedLeadIds.map(id => leadsApi.updateLeadStatus(id, status)));
      setSelectedLeadIds([]);
      fetchLeads();
    } catch (err) {
      alert("Failed to update status for selected leads.");
    }
  };

  // Real-time Chat Thread Fetch & Stream
  const loadThread = async (otherUserId: number | string, leadId?: number | null, silent = false) => {
    if (!silent && activeThread.length === 0) {
      setIsThreadLoading(true);
    }
    try {
      const data = leadId 
        ? await communicationsApi.getLeadThread(leadId)
        : await communicationsApi.getThread(otherUserId);
      setActiveThread(data);
      if (typeof otherUserId === 'number') {
        await communicationsApi.markThreadAsRead(otherUserId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsThreadLoading(false);
    }
  };

  const handleWsMessage = useCallback((newMsg: Message) => {
    setActiveThread((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
  }, []);

  useLeadWebSocket(isChatOpen ? selectedLeadId : null, handleWsMessage);

  useEffect(() => {
    if (selectedUser?.id && isChatOpen) {
      loadThread(selectedUser.id, selectedLeadId);
    }
  }, [selectedUser, selectedLeadId, isChatOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [activeThread]);

  const openChatForUser = (userId: number | string, userName: string, leadId?: number, initialMsg?: string) => {
    setSelectedUser({ id: userId, name: userName });
    setSelectedLeadId(leadId || null);
    setActiveThread([]);
    if (initialMsg) {
      setNewMessage(initialMsg);
    }
    setIsChatOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') {
      e.preventDefault();
    }
    const messageBody = typeof e === 'string' ? e : newMessage;
    if ((!messageBody.trim() && selectedFiles.length === 0) || !selectedUser?.id || isSendingMsg) return;

    setIsSendingMsg(true);
    try {
      const sentMsg = await communicationsApi.sendMessage({
        recipient: selectedUser.id,
        lead: selectedLeadId || undefined,
        body: messageBody,
        subject: "Lead Inquiry Chat",
        files: selectedFiles,
      });

      if (typeof e !== 'string') {
        setNewMessage("");
        setSelectedFiles([]);
      }

      if (sentMsg && sentMsg.id) {
        setActiveThread((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }

      loadThread(selectedUser.id, selectedLeadId, true);
    } catch (err: any) {
      console.error("Error sending chat message:", err);
      alert(err.message || "Failed to send message.");
    } finally {
      setIsSendingMsg(false);
    }
  };

  // Filtered & Sorted Leads Calculation
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const targetName = activeTab === 'received' ? lead.client_name : lead.professional_name;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        targetName.toLowerCase().includes(q) ||
        (lead.message || "").toLowerCase().includes(q) ||
        (lead.portfolio_item_title || "").toLowerCase().includes(q) ||
        (lead.metadata?.project_type || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;
      const matchesType = projectTypeFilter === "ALL" || (lead.metadata?.project_type || "") === projectTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    }).sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [leads, activeTab, searchQuery, statusFilter, projectTypeFilter, sortBy]);

  // Paginated Results
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLeads.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLeads, currentPage]);

  const pendingCount = leads.filter(l => l.status === 'PENDING').length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(paginatedLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const toggleSelectLead = (id: number) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full max-w-full space-y-4 animate-fade-in">
      
      {/* 1. Header Bar */}
      <div className="bg-surface-100/90 backdrop-blur-xl border border-surface-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap justify-between items-center gap-4 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent text-xl font-bold border border-accent/20 shadow-inner">
            💼
          </div>
          <div>
            <h1 className="text-xl font-black text-primary tracking-tight">Business Leads & RFQ Pipeline</h1>
            <p className="text-xs text-surface-500 font-medium">Manage incoming client opportunities and trade proposals</p>
          </div>
        </div>

        {/* Tab Toggle Pill & Export */}
        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 bg-surface-200/60 backdrop-blur-md rounded-xl border border-surface-300/50">
            <button 
              onClick={() => setActiveTab('received')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'received' 
                  ? 'bg-primary text-background shadow-sm scale-[1.02]' 
                  : 'text-surface-600 hover:text-primary'
              }`}
            >
              <span>Incoming Leads</span>
              {pendingCount > 0 && activeTab === 'received' && (
                <span className="px-1.5 py-0.5 text-[10px] bg-accent text-background font-black rounded-full animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'sent' 
                  ? 'bg-primary text-background shadow-sm scale-[1.02]' 
                  : 'text-surface-600 hover:text-primary'
              }`}
            >
              <span>My Inquiries</span>
            </button>
          </div>

          {activeTab === 'received' && (
            <Button 
              variant="outline" 
              className="text-xs font-bold h-9 px-3.5 rounded-xl border-surface-300 hover:border-accent hover:text-accent transition-all flex items-center gap-1.5"
              onClick={() => leadsApi.exportLeadsToExcel()}
            >
              <Download size={13} /> <span>Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Analytics Ribbon */}
      {activeTab === 'received' && analytics && (
        <div className="bg-surface-100/90 backdrop-blur-xl border border-surface-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 border-r border-surface-200/60 pr-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-base font-black">
              ₹
            </div>
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Total Pipeline Value</p>
              <p className="text-xl font-black text-primary">
                ₹{(analytics.pipeline_value || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-r border-surface-200/60 px-4">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-base">
              ⚡
            </div>
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Conversion Rate</p>
              <p className="text-xl font-black text-accent">
                {analytics.conversion_rate || 0}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-4">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center text-base">
              📈
            </div>
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Status Breakdown</p>
              <p className="text-xs font-bold text-surface-600">
                <span className="text-amber-600 font-black">{analytics.status_counts?.PENDING || 0} Pending</span> • <span className="text-emerald-600 font-black">{analytics.status_counts?.CONVERTED || 0} Converted</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Search, Filter & Bulk Toolbar */}
      <div className="bg-surface-100/90 backdrop-blur-xl border border-surface-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3.5 top-3 text-surface-400" />
          <input 
            type="text"
            placeholder="Search by client, title, scope, or type..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full h-9 pl-9 pr-3 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold text-primary outline-none focus:border-accent placeholder:text-surface-400"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="absolute right-3 top-2.5 text-xs text-surface-400 hover:text-primary font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-2 py-1">
            <Filter size={12} className="text-surface-400" />
            <select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-xs font-bold text-primary dark:text-white outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">All Statuses</option>
              <option value="PENDING" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Pending</option>
              <option value="ACCEPTED" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Accepted</option>
              <option value="REJECTED" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Rejected</option>
              <option value="CONVERTED" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Converted</option>
            </select>
          </div>

          {/* Project Type Filter */}
          <div className="flex items-center gap-1 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-2 py-1">
            <Building2 size={12} className="text-surface-400" />
            <select 
              value={projectTypeFilter}
              onChange={(e) => { setProjectTypeFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-xs font-bold text-primary dark:text-white outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">All Types</option>
              <option value="Residential" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Residential</option>
              <option value="Commercial" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Commercial</option>
              <option value="Industrial" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Industrial</option>
              <option value="Interior" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Interior</option>
              <option value="Renovation" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Renovation</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-white/10 rounded-xl px-2 py-1">
            <ArrowUpDown size={12} className="text-surface-400" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-primary dark:text-white outline-none cursor-pointer pr-1"
            >
              <option value="newest" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Newest First</option>
              <option value="oldest" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">Oldest First</option>
              <option value="status" className="bg-surface-50 dark:bg-surface-800 text-primary dark:text-white">By Status</option>
            </select>
          </div>
        </div>

        {/* Batch Selection Action Buttons */}
        {selectedLeadIds.length > 0 && activeTab === 'received' && (
          <div className="flex items-center gap-2 animate-fade-in pl-2 border-l border-surface-200">
            <span className="text-[10px] font-black text-accent uppercase">
              {selectedLeadIds.length} Selected
            </span>
            <Button 
              className="h-7 text-[10px] px-2.5 bg-primary text-background font-bold rounded-lg"
              onClick={() => handleBulkStatusUpdate('ACCEPTED')}
            >
              Accept All
            </Button>
            <Button 
              variant="outline"
              className="h-7 text-[10px] px-2.5 border-surface-300 font-bold rounded-lg"
              onClick={() => handleBulkStatusUpdate('REJECTED')}
            >
              Reject All
            </Button>
          </div>
        )}
      </div>

      {/* 4. Leads Table */}
      <div className="flex-1">
        {isLoadingLeads ? (
          <SkeletonTable rows={6} cols={5} />
        ) : paginatedLeads.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-100 border border-surface-200 rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-200/50 text-[11px] font-extrabold text-surface-500 uppercase tracking-wider">
                    {activeTab === 'received' && (
                      <th className="py-3 px-3.5 w-10 text-center">
                        <input 
                          type="checkbox"
                          checked={selectedLeadIds.length === paginatedLeads.length && paginatedLeads.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-surface-300 text-accent focus:ring-accent/20 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="py-3 px-3.5">#</th>
                    <th className="py-3 px-3.5">{activeTab === 'received' ? 'Client / Buyer' : 'Vendor / Professional'}</th>
                    <th className="py-3 px-3.5">Inquiry Brief</th>
                    <th className="py-3 px-3.5">Project Specs</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/60 text-xs font-semibold text-primary">
                  {paginatedLeads.map((lead, index) => {
                    const targetUserId = activeTab === 'received' 
                      ? (lead.client_id || lead.client) 
                      : (lead.professional_id || lead.professional);
                    const targetUserName = activeTab === 'received' ? lead.client_name : lead.professional_name;
                    const isSelected = selectedLeadIds.includes(lead.id);

                    return (
                      <tr 
                        key={lead.id} 
                        className={`hover:bg-surface-200/40 transition-colors ${isSelected ? 'bg-accent/5' : ''}`}
                      >
                        {activeTab === 'received' && (
                          <td className="py-3 px-3.5 text-center">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectLead(lead.id)}
                              className="w-3.5 h-3.5 rounded border-surface-300 text-accent focus:ring-accent/20 cursor-pointer"
                            />
                          </td>
                        )}

                        <td className="py-3.5 px-3.5 font-mono font-bold text-surface-400">
                          #{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </td>

                        <td className="py-3.5 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent font-black flex items-center justify-center text-xs shrink-0 border border-accent/20">
                              {targetUserName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-primary truncate max-w-[140px]">{targetUserName}</div>
                              {lead.portfolio_item_title && (
                                <div className="text-[10px] text-surface-500 font-medium truncate max-w-[140px]">
                                  📦 {lead.portfolio_item_title}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5 max-w-xs cursor-pointer" onClick={() => setDetailLead(lead)}>
                          <p className="line-clamp-2 text-surface-700 font-medium italic hover:text-accent transition-colors">
                            "{lead.message}"
                          </p>
                        </td>

                        <td className="py-3.5 px-3.5">
                          <div className="flex flex-wrap gap-1">
                            {lead.metadata?.project_type && (
                              <span className="px-2 py-0.5 bg-surface-200/80 rounded text-[10px] font-bold text-surface-600">
                                📁 {lead.metadata.project_type}
                              </span>
                            )}
                            {lead.metadata?.timeline && (
                              <span className="px-2 py-0.5 bg-surface-200/80 rounded text-[10px] font-bold text-surface-600">
                                ⏱ {lead.metadata.timeline}
                              </span>
                            )}
                            {lead.metadata?.budget_range && (
                              <span className="px-2 py-0.5 bg-surface-200/80 rounded text-[10px] font-bold text-surface-600">
                                💰 {lead.metadata.budget_range}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5">
                          <Badge variant={lead.status === 'PENDING' ? 'warning' : lead.status === 'ACCEPTED' ? 'success' : lead.status === 'REJECTED' ? 'secondary' : 'info'}>
                            {lead.status}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-3.5 text-surface-500 font-medium text-[11px] whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>

                        <td className="py-3.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setDetailLead(lead)}
                              className="w-7 h-7 rounded-lg bg-surface-200 hover:bg-surface-300 text-surface-600 flex items-center justify-center transition-all"
                              title="View Brief Details"
                            >
                              <Eye size={13} />
                            </button>

                            {activeTab === 'received' && lead.status === 'PENDING' && (
                              <>
                                <Button 
                                  className="bg-primary text-background text-[11px] px-2.5 h-8 rounded-lg font-extrabold"
                                  onClick={() => handleStatusUpdate(lead.id, 'ACCEPTED')}
                                >
                                  Accept
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="text-[11px] px-2.5 h-8 rounded-lg font-extrabold border-surface-300"
                                  onClick={() => handleStatusUpdate(lead.id, 'REJECTED')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {activeTab === 'received' && lead.status === 'ACCEPTED' && (
                              <Button 
                                className="bg-emerald-600 text-white text-[11px] px-2.5 h-8 rounded-lg font-extrabold shadow-sm"
                                onClick={() => {
                                  handleStatusUpdate(lead.id, 'CONVERTED').then(() => {
                                    router.push(`/dashboard/projects?lead_id=${lead.id}&client_name=${encodeURIComponent(lead.client_name)}`);
                                  });
                                }}
                              >
                                ⭐ Convert
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              className="px-2.5 h-8 text-[11px] font-extrabold rounded-lg border-accent/40 text-accent hover:bg-accent/10 flex items-center gap-1 shadow-sm"
                              onClick={() => openChatForUser(targetUserId, targetUserName, lead.id)}
                            >
                              <MessageSquare size={12} /> <span>Chat</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="p-3.5 bg-surface-100/90 border-t border-surface-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-surface-500 font-medium text-[11px]">
                Showing <span className="font-bold text-primary">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-primary">{Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)}</span> of <span className="font-bold text-primary">{filteredLeads.length}</span> leads
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-surface-200 font-bold text-xs bg-surface-50 hover:bg-surface-200 disabled:opacity-40 transition-all flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> <span>Previous</span>
                </button>

                <span className="px-3 py-1 bg-accent/10 text-accent font-black rounded-lg text-xs">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-surface-200 font-bold text-xs bg-surface-50 hover:bg-surface-200 disabled:opacity-40 transition-all flex items-center gap-1"
                >
                  <span>Next</span> <ChevronRight size={14} />
                </button>
              </div>
            </div>

          </motion.div>
        ) : (
          <div className="text-center py-20 bg-surface-100/60 rounded-2xl border border-surface-200 space-y-3">
            <div className="text-4xl">💼</div>
            <h3 className="text-base font-bold text-primary">No Leads Found</h3>
            <p className="text-xs text-surface-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "ALL" || projectTypeFilter !== "ALL" 
                ? "No inquiries match your active search or filter criteria." 
                : "No active inquiries detected in this tab."}
            </p>
            {(searchQuery || statusFilter !== "ALL" || projectTypeFilter !== "ALL") && (
              <button 
                onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setProjectTypeFilter("ALL"); }}
                className="text-xs font-bold text-accent uppercase tracking-wider hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Lead Detail Drawer / Modal */}
      <AnimatePresence>
        {detailLead && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-20 pb-6 px-3 sm:px-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 rounded-2xl w-full max-w-xl max-h-[calc(100vh-6rem)] flex flex-col shadow-2xl overflow-hidden relative z-10"
            >
              {/* Header */}
              <div className="p-4 border-b border-surface-200 dark:border-white/10 bg-surface-100/80 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-accent text-background font-black flex items-center justify-center text-sm">
                    {(activeTab === 'received' ? detailLead.client_name : detailLead.professional_name).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-primary">
                      {activeTab === 'received' ? detailLead.client_name : detailLead.professional_name}
                    </h3>
                    <p className="text-[10px] text-surface-500 font-medium">Opportunity Brief #{detailLead.id}</p>
                  </div>
                </div>

                <button 
                  onClick={() => setDetailLead(null)}
                  className="w-7 h-7 rounded-full bg-surface-200 text-surface-600 flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
                
                {/* Status & Blueprint Banner */}
                <div className="p-3 bg-surface-100 rounded-xl border border-surface-200 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-bold text-surface-400 uppercase">Target Blueprint</span>
                    <p className="font-bold text-primary text-xs">{detailLead.portfolio_item_title || 'General Architectural Inquiry'}</p>
                  </div>
                  <Badge variant={detailLead.status === 'PENDING' ? 'warning' : detailLead.status === 'ACCEPTED' ? 'success' : detailLead.status === 'REJECTED' ? 'secondary' : 'info'}>
                    {detailLead.status}
                  </Badge>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-3 gap-2 bg-surface-100 p-3 rounded-xl border border-surface-200 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-surface-400 uppercase">Project Type</span>
                    <p className="font-extrabold text-primary">{detailLead.metadata?.project_type || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-surface-400 uppercase">Timeline</span>
                    <p className="font-extrabold text-primary">{detailLead.metadata?.timeline || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-surface-400 uppercase">Budget</span>
                    <p className="font-extrabold text-accent">{detailLead.metadata?.budget_range || '-'}</p>
                  </div>
                </div>

                {/* Full Message Brief */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Client Message & Requirements</label>
                  <div className="p-4 bg-surface-100 rounded-xl border border-surface-200 leading-relaxed text-surface-700 font-medium italic whitespace-pre-wrap">
                    "{detailLead.message}"
                  </div>
                </div>

              </div>

              {/* Action Footer */}
              <div className="p-4 border-t border-surface-200 bg-surface-100/80 flex items-center justify-between gap-2 shrink-0">
                <Button 
                  variant="outline"
                  className="h-9 text-xs px-4 rounded-xl border-accent/40 text-accent font-bold flex items-center gap-1.5"
                  onClick={() => {
                    const targetId = activeTab === 'received' ? (detailLead.client_id || detailLead.client) : (detailLead.professional_id || detailLead.professional);
                    const targetName = activeTab === 'received' ? detailLead.client_name : detailLead.professional_name;
                    setDetailLead(null);
                    openChatForUser(targetId, targetName, detailLead.id);
                  }}
                >
                  <MessageSquare size={13} /> Chat Stream
                </Button>

                {activeTab === 'received' && detailLead.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button 
                      className="h-9 text-xs px-4 bg-primary text-background font-bold rounded-xl"
                      onClick={() => handleStatusUpdate(detailLead.id, 'ACCEPTED')}
                    >
                      Accept Inquiry
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-9 text-xs px-4 rounded-xl border-surface-300 font-bold"
                      onClick={() => handleStatusUpdate(detailLead.id, 'REJECTED')}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {activeTab === 'received' && detailLead.status === 'ACCEPTED' && (
                  <Button 
                    className="h-9 text-xs px-4 bg-emerald-600 text-white font-bold rounded-xl shadow-sm"
                    onClick={() => {
                      handleStatusUpdate(detailLead.id, 'CONVERTED').then(() => {
                        router.push(`/dashboard/projects?lead_id=${detailLead.id}&client_name=${encodeURIComponent(detailLead.client_name)}`);
                      });
                    }}
                  >
                    ⭐ Convert to Project
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. High-Performance Chat Stream Modal */}
      <AnimatePresence>
        {isChatOpen && selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-20 pb-6 px-3 sm:px-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 rounded-3xl w-full max-w-2xl max-h-[calc(100vh-6rem)] flex flex-col shadow-2xl overflow-hidden relative z-10 my-auto"
            >
              {/* Chat Header */}
              <div className="p-3.5 px-5 border-b border-surface-200 bg-surface-100/90 backdrop-blur-md flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-accent text-background font-black flex items-center justify-center text-sm shadow-sm">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-primary tracking-tight">{selectedUser.name}</h3>
                      {selectedLeadId && (
                        <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent font-extrabold text-[10px] uppercase tracking-wider">
                          Lead #{selectedLeadId}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-surface-500 font-medium">
                      Direct RFQ Trade Negotiation Stream
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-200 hover:bg-surface-300 text-surface-600 flex items-center justify-center font-bold text-xs transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Chat Thread Messages Viewport */}
              <div ref={scrollRef} className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-surface-100/40 min-h-0">
                {isThreadLoading ? (
                  <div className="flex justify-center py-12">
                    <Spinner size="md" label="Loading conversation..." />
                  </div>
                ) : activeThread.length > 0 ? (
                  activeThread.map((msg) => {
                    const senderId = typeof msg.sender === 'object' && msg.sender !== null ? msg.sender.id : msg.sender;
                    const senderEmail = typeof msg.sender === 'object' && msg.sender !== null ? msg.sender.email : undefined;
                    const senderName = typeof msg.sender === 'object' && msg.sender !== null ? msg.sender.name : msg.sender_name;

                    const isMine = Boolean(
                      (currentUser?.id && senderId && Number(senderId) === Number(currentUser.id)) ||
                      (currentUser?.email && senderEmail && senderEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                      (currentUser?.name && senderName && senderName === currentUser.name)
                    );

                    return (
                      <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}>
                        <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-surface-400">
                          <span>{isMine ? "You" : senderName || selectedUser.name}</span>
                          <span>•</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isMine 
                            ? 'bg-accent text-background font-bold rounded-tr-xs shadow-sm' 
                            : 'bg-surface-100 border border-surface-200 text-primary font-semibold rounded-tl-xs shadow-2xs'
                        }`}>
                          {msg.body}

                          {msg.assets && msg.assets.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-black/10 space-y-1">
                              {msg.assets.map((asset) => (
                                <a
                                  key={asset.id}
                                  href={asset.file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                    isMine ? 'bg-black/10 text-background' : 'bg-surface-200 text-primary'
                                  }`}
                                >
                                  <span>📎</span>
                                  <span className="truncate flex-1">{asset.title}</span>
                                  <span className="text-[9px]">⬇️</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-surface-200 text-accent mx-auto flex items-center justify-center text-xl">
                      💬
                    </div>
                    <h4 className="text-xs font-bold text-primary">No Messages Yet</h4>
                    <p className="text-[11px] text-surface-500 font-medium max-w-xs mx-auto">
                      Send a trade message or specification attachment to start the conversation.
                    </p>
                  </div>
                )}
              </div>

              {/* Chat Input Toolbar */}
              <div className="p-3 border-t border-surface-200 bg-surface-100/90 backdrop-blur-md shrink-0">
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedFiles.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold bg-surface-200 text-primary px-2.5 py-0.5 rounded-lg border border-surface-300">
                        <span>📎 {f.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="hover:text-red-500 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-200 text-surface-600 flex items-center justify-center text-base transition-all shrink-0"
                    title="Attach Specifications"
                  >
                    📎
                  </button>

                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your trade message..."
                    className="flex-1 bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-primary placeholder:text-surface-400 outline-none focus:border-accent"
                  />

                  <Button 
                    type="submit" 
                    disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSendingMsg}
                    className="h-9 px-4 bg-accent text-background font-bold text-xs rounded-xl hover:opacity-90 disabled:opacity-40 shrink-0"
                  >
                    {isSendingMsg ? 'Sending...' : 'Send 🚀'}
                  </Button>
                </form>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
