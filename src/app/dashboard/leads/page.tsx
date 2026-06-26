"use client";

import React, { useState, useEffect, useRef } from 'react';
import { leadsApi, Lead, LeadAnalytics } from '@/domains/leads/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { communicationsApi, Message, ConversationSummary } from "@/domains/communications/api";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function LeadsPage() {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  
  // Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [hoverConvertId, setHoverConvertId] = useState<number | null>(null);

  // Messenger State
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeThread, setActiveThread] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoadingMessenger, setIsLoadingMessenger] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  
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
  }, [activeTab]);

  const handleStatusUpdate = async (id: number, status: Lead['status']) => {
    try {
      await leadsApi.updateLeadStatus(id, status);
      fetchLeads();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  // Messenger Logic
  const loadConversations = async (selectFirst = false) => {
    try {
      const data = await communicationsApi.listConversations();
      setConversations(data);
      if (selectFirst && data.length > 0 && !selectedUserId) {
        setSelectedUserId(data[0].user_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMessenger(false);
    }
  };

  const loadThread = async (otherUserId: number) => {
    setIsThreadLoading(true);
    try {
      const data = await communicationsApi.getThread(otherUserId);
      setActiveThread(data);
      // Mark as read when thread is opened
      await communicationsApi.markThreadAsRead(otherUserId);
      // Reload conversations to update unread indicator in the sidebar
      loadConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setIsThreadLoading(false);
    }
  };

  useEffect(() => {
    loadConversations(true);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadThread(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (!globalSearchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await communicationsApi.searchMessages(globalSearchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Failed to search messages", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread]);

  const handleSendMessage = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') {
      e.preventDefault();
    }
    const messageBody = typeof e === 'string' ? e : newMessage;
    if ((!messageBody.trim() && selectedFiles.length === 0) || !selectedUserId) return;

    try {
      await communicationsApi.sendMessage({
        recipient: selectedUserId,
        body: messageBody,
        subject: "Chat Message",
        files: selectedFiles,
      });
      if (typeof e !== 'string') {
        setNewMessage("");
        setSelectedFiles([]);
      }
      loadThread(selectedUserId);
      loadConversations();
    } catch (err) {
      alert("Failed to send message.");
    }
  };

  const handleMessageUser = (userName: string, defaultMessage?: string) => {
    const conv = conversations.find(c => c.user_name === userName);
    if (conv) {
      setSelectedUserId(conv.user_id);
      if (defaultMessage) {
        setNewMessage(defaultMessage);
      }
    } else {
      alert(`Conversation with ${userName} not found in the recent list. Start by sending an inquiry.`);
    }
  };

  const selectedConversation = conversations.find(c => c.user_id === selectedUserId);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in pb-4">
      {/* LEFT COLUMN: Leads Pipeline */}
      <div className="w-1/2 flex flex-col space-y-6 h-full overflow-hidden">
        
        {/* Header & Tabs */}
        <div className="bg-surface-50/50 backdrop-blur-2xl p-8 border border-white/20 dark:border-white/5 rounded-[2rem] shadow-2xl shadow-primary/5 space-y-8 shrink-0 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-full arch-grid opacity-[0.05] pointer-events-none mix-blend-overlay" />
          
          <div className="relative z-10">
            <h1 className="text-4xl font-black text-primary mb-3 tracking-tight drop-shadow-sm">Business Opportunity Pipeline</h1>
            <p className="text-sm text-surface-400 font-medium max-w-2xl leading-relaxed">
              {activeTab === 'received' 
                ? "Manage architectural inquiries and project leads generated from your professional portfolio." 
                : "Track your active inquiries and project interests sent to other professionals."}
            </p>
          </div>

          <div className="flex justify-between items-center relative z-10">
            <div className="flex bg-surface-100/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 dark:border-white/5 shadow-inner">
              <button 
                onClick={() => setActiveTab('received')}
                className={`px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'received' ? 'bg-primary text-background shadow-lg shadow-primary/20 scale-105' : 'text-surface-400 hover:text-primary hover:bg-surface-200/50'}`}
              >
                Incoming Leads
              </button>
              <button 
                onClick={() => setActiveTab('sent')}
                className={`px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'sent' ? 'bg-primary text-background shadow-lg shadow-primary/20 scale-105' : 'text-surface-400 hover:text-primary hover:bg-surface-200/50'}`}
              >
                My Inquiries
              </button>
            </div>
            {activeTab === 'received' && (
              <Button 
                variant="outline" 
                className="text-[10px] font-bold uppercase tracking-widest h-10 px-5 rounded-xl border-white/10 dark:border-white/5 bg-surface-100/50 backdrop-blur-md shadow-sm hover:shadow-lg hover:border-accent hover:text-accent transition-all"
                onClick={() => leadsApi.exportLeadsToExcel()}
              >
                📊 Export Excel
              </Button>
            )}
          </div>
        </div>

        {/* 10X Analytics Dashboard (Only for Received) */}
        {activeTab === 'received' && analytics && (
          <div className="bg-gradient-to-br from-surface-100/80 to-surface-50/30 backdrop-blur-3xl border border-white/20 dark:border-white/5 rounded-[2rem] p-8 shadow-2xl shadow-primary/5 relative overflow-hidden group shrink-0 transition-all duration-700 hover:shadow-primary/10 hover:border-white/30">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 blur-3xl rounded-full opacity-50 pointer-events-none" />
            <div className="absolute top-0 right-0 w-1/2 h-full arch-grid opacity-[0.03] pointer-events-none mix-blend-overlay" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
              
              {/* Total Pipeline */}
              <div className="flex flex-col justify-center space-y-4 border-r border-white/10 dark:border-white/5 pr-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-lg shadow-inner border border-primary/20">💰</div>
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em]">Total Pipeline</p>
                </div>
                <p className="text-5xl font-black text-primary drop-shadow-[0_0_25px_rgba(var(--color-primary),0.3)] tracking-tighter">
                  ${(analytics.pipeline_value || 0).toLocaleString()}
                </p>
              </div>

              {/* Conversion Rate */}
              <div className="flex flex-col justify-center space-y-4 border-r border-white/10 dark:border-white/5 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent text-lg shadow-inner border border-accent/20">⚡</div>
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em]">Conversion</p>
                </div>
                <div>
                  <p className="text-5xl font-black text-accent drop-shadow-[0_0_25px_rgba(var(--color-accent),0.4)] tracking-tighter">
                    {analytics.conversion_rate || 0}%
                  </p>
                </div>
              </div>

              {/* Pipeline Health (Lead Statuses) */}
              <div className="flex flex-col justify-center space-y-4 pl-6">
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="text-xs">📊</span> Pipeline Health
                </p>
                
                <div className="space-y-4">
                  {/* Pending Bar */}
                  <div className="space-y-1.5 group/bar cursor-default">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] transition-transform group-hover/bar:scale-125" />
                        <span className="text-[11px] font-bold text-surface-500 group-hover/bar:text-primary transition-colors">Pending Review</span>
                      </div>
                      <span className="text-xs font-black text-yellow-600 dark:text-yellow-400">{analytics.status_counts?.PENDING || 0}</span>
                    </div>
                    <div className="w-full bg-surface-200/50 dark:bg-surface-800/50 rounded-full h-1.5 overflow-hidden shadow-inner">
                      <div className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-full rounded-full relative" style={{ width: `${((analytics.status_counts?.PENDING || 0) / Math.max(1, (analytics.status_counts?.PENDING || 0) + (analytics.status_counts?.ACCEPTED || 0) + (analytics.status_counts?.CONVERTED || 0))) * 100}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Converted Bar */}
                  <div className="space-y-1.5 group/bar cursor-default">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] transition-transform group-hover/bar:scale-125" />
                        <span className="text-[11px] font-bold text-surface-500 group-hover/bar:text-primary transition-colors">Successfully Converted</span>
                      </div>
                      <span className="text-xs font-black text-green-600 dark:text-green-400">{analytics.status_counts?.CONVERTED || 0}</span>
                    </div>
                    <div className="w-full bg-surface-200/50 dark:bg-surface-800/50 rounded-full h-1.5 overflow-hidden shadow-inner">
                      <div className="bg-gradient-to-r from-green-600 to-green-400 h-full rounded-full relative" style={{ width: `${((analytics.status_counts?.CONVERTED || 0) / Math.max(1, (analytics.status_counts?.PENDING || 0) + (analytics.status_counts?.ACCEPTED || 0) + (analytics.status_counts?.CONVERTED || 0))) * 100}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                      </div>
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        )}

        {/* Lead Cards */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {isLoadingLeads ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface-100 border-surface-200 border border-surface-200 rounded-2xl">
              <Spinner size="lg" label="Synchronizing pipeline data..." />
            </div>
          ) : leads.length > 0 ? (
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
              className="space-y-4"
            >
            {leads.map((lead) => {
              const isOldPending = lead.status === 'PENDING' && (new Date().getTime() - new Date(lead.updated_at).getTime()) > 48 * 60 * 60 * 1000;
              const isGlowing = hoverConvertId === lead.id;
              
              return (
                <motion.div 
                  key={lead.id} 
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  whileHover={{ rotateY: 1, rotateX: -1, y: -5, z: 20 }}
                  style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                  className={`bg-surface-50/50 backdrop-blur-md p-6 rounded-[2rem] border ${isGlowing ? 'border-green-400 shadow-[0_0_50px_rgba(34,197,94,0.3)]' : 'border-white/10 dark:border-white/5 hover:border-accent/50 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-accent/10'} transition-all duration-500 flex flex-col gap-6 group relative overflow-hidden`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${isGlowing ? 'from-green-500/20 to-transparent opacity-100 animate-pulse' : 'from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100'} transition-opacity duration-700 pointer-events-none`} />
                  
                  {/* Lead Hotness Score */}
                  {lead.score !== undefined && lead.score > 0 && activeTab === 'received' && (
                    <div className="absolute top-4 right-4 bg-red-500/10 text-red-500 dark:text-red-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 border border-red-500/20 backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse z-10">
                      <span>🔥</span>
                      <span>Score: {lead.score}</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-[1rem] flex items-center justify-center text-xl font-black text-primary shrink-0 shadow-inner border border-white/10">
                        {activeTab === 'received' ? lead.client_name.charAt(0) : lead.professional_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-primary tracking-tight">
                            {activeTab === 'received' ? lead.client_name : `Recipient: ${lead.professional_name}`}
                          </h3>
                          {isOldPending && activeTab === 'received' && (
                            <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[9px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest border border-yellow-500/20 shadow-sm animate-pulse">⚠️ Needs Follow-up</span>
                          )}
                        </div>
                        <p className="text-[10px] text-surface-400 uppercase tracking-[0.2em] font-bold mt-1 opacity-70">ID: {lead.id} • {new Date(lead.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {/* Move badge below if hotness score exists so they don't overlap, actually hotness score is absolute. Badge is normal flow. */}
                    <div className="mr-24">
                      <Badge variant={lead.status === 'PENDING' ? 'warning' : lead.status === 'ACCEPTED' ? 'success' : lead.status === 'REJECTED' ? 'secondary' : 'info'}>
                        {lead.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="bg-surface-100/50 backdrop-blur-sm p-5 rounded-2xl border border-white/5 shadow-inner relative z-10">
                    <p className="text-sm text-surface-600 dark:text-surface-300 italic leading-relaxed font-medium">"{lead.message}"</p>
                  </div>
                  
                  {lead.metadata && (
                    <div className="flex flex-wrap gap-2 relative z-10">
                      {lead.metadata.project_type && (
                        <div className="px-3 py-1.5 bg-surface-100/50 backdrop-blur-md rounded-xl text-[10px] font-bold text-surface-500 uppercase tracking-widest border border-white/5 shadow-sm">
                          📁 {lead.metadata.project_type}
                        </div>
                      )}
                      {lead.metadata.timeline && (
                        <div className="px-3 py-1.5 bg-surface-100/50 backdrop-blur-md rounded-xl text-[10px] font-bold text-surface-500 uppercase tracking-widest border border-white/5 shadow-sm">
                          ⏱ {lead.metadata.timeline}
                        </div>
                      )}
                      {lead.metadata.budget_range && (
                        <div className="px-3 py-1.5 bg-surface-100/50 backdrop-blur-md rounded-xl text-[10px] font-bold text-surface-500 uppercase tracking-widest border border-white/5 shadow-sm">
                          💰 {lead.metadata.budget_range}
                        </div>
                      )}
                    </div>
                  )}

                  {lead.portfolio_item_title && (
                    <div className="flex items-center gap-2 relative z-10">
                      <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">{activeTab === 'received' ? 'Inquiry Source:' : 'Target Project:'}</span>
                      <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-3 py-1 rounded-lg border border-accent/20 shadow-sm">{lead.portfolio_item_title}</span>
                    </div>
                  )}

                  {activeTab === 'received' && (
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10 dark:border-white/5 relative z-10">
                      {lead.status === 'PENDING' && (
                        <>
                          <Button className="flex-1 bg-primary text-background hover:bg-primary/90 hover:scale-[1.02] transition-all text-xs py-5 rounded-xl shadow-[0_0_20px_rgba(var(--color-primary),0.3)] font-bold uppercase tracking-widest" onClick={() => handleStatusUpdate(lead.id, 'ACCEPTED')}>
                            Accept Inquiry
                          </Button>
                          <Button variant="outline" className="flex-1 border-surface-300 text-surface-500 hover:bg-surface-100 text-xs py-5 rounded-xl transition-all font-bold uppercase tracking-widest" onClick={() => handleStatusUpdate(lead.id, 'REJECTED')}>
                            Reject
                          </Button>
                          {isOldPending && (
                            <Button 
                              variant="outline" 
                              className="w-full border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10 text-xs py-5 rounded-xl transition-all font-bold uppercase tracking-widest shadow-sm"
                              onClick={() => handleMessageUser(lead.client_name, `Hi ${lead.client_name}, just following up on your inquiry! Are you still interested in discussing the project?`)}
                            >
                              Send Follow-up Message
                            </Button>
                          )}
                        </>
                      )}
                      {lead.status === 'ACCEPTED' && (
                        <>
                          <Button 
                            onMouseEnter={() => setHoverConvertId(lead.id)}
                            onMouseLeave={() => setHoverConvertId(null)}
                            className="flex-1 bg-green-500 hover:bg-green-400 text-white text-xs py-5 rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-[1.02] font-bold uppercase tracking-widest border border-green-400"
                            onClick={() => {
                              if (confirm("This will take you to the Project Registry to establish the new Blueprint. Proceed?")) {
                                handleStatusUpdate(lead.id, 'CONVERTED').then(() => {
                                  router.push(`/dashboard/projects?lead_id=${lead.id}&title=${encodeURIComponent(lead.portfolio_item_title || '')}&client_name=${encodeURIComponent(lead.client_name)}`);
                                });
                              }
                            }}
                          >
                            ⭐ Convert to Project
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-accent text-accent hover:bg-accent/10 hover:shadow-[0_0_15px_rgba(var(--color-accent),0.2)] text-xs py-5 rounded-xl transition-all font-bold uppercase tracking-widest"
                            onClick={() => handleMessageUser(lead.client_name)}
                          >
                            Message
                          </Button>
                        </>
                      )}
                      {lead.status === 'CONVERTED' && (
                        <div className="w-full py-4 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-widest shadow-inner">
                          <span className="drop-shadow-md">✅</span> Converted to Active Project
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'sent' && (
                     <div className="flex justify-between items-center gap-3 pt-4 border-t border-white/10 dark:border-white/5 relative z-10">
                       <div className={`px-4 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-[0.2em] shadow-sm ${
                         lead.status === 'PENDING' ? 'bg-surface-100 text-surface-400 border-white/10' :
                         lead.status === 'ACCEPTED' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' :
                         lead.status === 'REJECTED' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' :
                         'bg-accent/10 text-accent border-accent/20'
                       }`}>
                         {lead.status}
                       </div>
                       <Button
                          variant="ghost"
                          className="text-[10px] font-bold uppercase tracking-widest text-accent hover:bg-accent/10 rounded-xl"
                          onClick={() => handleMessageUser(lead.professional_name)}
                        >
                          Message
                        </Button>
                     </div>
                  )}
                </motion.div>
              );
            })}
            </motion.div>
          ) : (
            <div className="text-center py-24 bg-gradient-to-b from-surface-50/50 to-transparent backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 arch-grid opacity-10 pointer-events-none mix-blend-overlay" />
              <div className="relative z-10">
                <div className="w-24 h-24 bg-surface-100/50 backdrop-blur-md rounded-[2rem] mx-auto flex items-center justify-center border border-white/10 shadow-2xl mb-8">
                  <span className="text-5xl drop-shadow-[0_0_15px_rgba(var(--color-primary),0.2)]">💼</span>
                </div>
                <h3 className="text-2xl font-black text-primary mb-3 tracking-tight">Pipeline Empty</h3>
                <p className="text-sm text-surface-400 font-medium max-w-[250px] mx-auto leading-relaxed">
                  No business inquiries have been detected yet.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Messenger */}
      <div className="w-1/2 flex flex-col bg-surface-50/30 backdrop-blur-3xl border border-white/20 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/5 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none mix-blend-overlay" />
        
        {/* Messenger Header */}
        <div className="p-5 border-b border-white/10 dark:border-white/5 bg-surface-100/50 backdrop-blur-md flex justify-between items-center relative z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent text-xl shadow-inner border border-accent/20">
              💬
            </div>
            <h2 className="text-xl font-bold text-primary tracking-tight">Messenger</h2>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-bold text-accent uppercase tracking-[0.2em] bg-accent/10 px-4 py-2 rounded-full border border-accent/20 shadow-[0_0_15px_rgba(var(--color-accent),0.2)]">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
            Live
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative z-10">
          {/* Conversations Sidebar inside Messenger */}
          <div className="w-72 border-r border-white/10 dark:border-white/5 flex flex-col bg-surface-50/20 backdrop-blur-sm">
            <div className="p-5 border-b border-white/10 dark:border-white/5">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search messages..." 
                  value={globalSearchQuery}
                  onChange={e => setGlobalSearchQuery(e.target.value)}
                  className="w-full bg-surface-100/50 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all shadow-inner placeholder:font-medium font-bold"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {globalSearchQuery.trim() ? (
                isSearching ? (
                  <div className="flex justify-center py-10"><Spinner size="sm" /></div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {searchResults.map(msg => {
                      const otherId = msg.sender === currentUser?.id ? msg.recipient : msg.sender;
                      const otherName = msg.sender === currentUser?.id ? "Them" : msg.sender_name;
                      return (
                        <div 
                          key={msg.id}
                          onClick={() => {
                            if (otherId) {
                              setSelectedUserId(otherId);
                              setGlobalSearchQuery("");
                            }
                          }}
                          className="p-3 cursor-pointer hover:bg-surface-100/50 transition-colors group rounded-xl"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-primary group-hover:text-accent truncate pr-2 transition-colors">
                              {otherName}
                            </span>
                            <span className="text-[9px] text-surface-400 shrink-0 font-bold uppercase tracking-widest">
                              {new Date(msg.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-surface-500 font-medium truncate">
                            <span className="opacity-50">Sub:</span> {msg.subject}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 px-4">
                    <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest">No results found.</p>
                  </div>
                )
              ) : isLoadingMessenger ? (
                <div className="flex justify-center py-10"><Spinner size="sm" /></div>
              ) : conversations.length > 0 ? (
                <motion.div initial="hidden" animate="show" variants={{hidden: {opacity: 0}, show: {opacity: 1, transition: {staggerChildren: 0.05}}}}>
                {conversations.map((conv) => (
                  <motion.div 
                    variants={{hidden: {opacity: 0, x: -20}, show: {opacity: 1, x: 0}}}
                    key={conv.user_id} 
                    onClick={() => setSelectedUserId(conv.user_id)}
                    className={`p-3 rounded-[1rem] cursor-pointer transition-all duration-300 flex gap-3 items-center group mb-1 ${
                      selectedUserId === conv.user_id 
                      ? "bg-surface-100/80 backdrop-blur-md shadow-lg shadow-primary/5 border border-white/20 dark:border-white/5 scale-[1.02]" 
                      : "hover:bg-surface-100/40 border border-transparent"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-[0.8rem] flex items-center justify-center text-sm font-black shrink-0 transition-all duration-300 ${
                      selectedUserId === conv.user_id ? "bg-accent text-background shadow-lg shadow-accent/40 rotate-3" : "bg-primary/5 text-primary border border-white/10"
                    }`}>
                      {conv.user_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className={`text-sm font-bold truncate transition-colors ${selectedUserId === conv.user_id ? "text-accent" : "text-primary group-hover:text-accent"}`}>
                          {conv.user_name}
                        </h4>
                      </div>
                      <p className="text-[10px] text-surface-400 font-medium truncate leading-tight">
                        {conv.last_message}
                      </p>
                    </div>
                    {!conv.is_read && (
                      <div className="w-2 h-2 bg-accent rounded-full shrink-0 shadow-[0_0_8px_rgba(var(--color-accent),0.8)] animate-pulse" />
                    )}
                  </motion.div>
                ))}
                </motion.div>
              ) : (
                <div className="text-center py-10 px-4">
                  <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest">No conversations found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Chat View */}
          <div className="flex-1 flex flex-col relative bg-transparent">
            {selectedUserId ? (
              <>
                {/* Chat Header */}
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-surface-100/30 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-sm font-black text-primary shadow-inner border border-white/10">
                      {selectedConversation?.user_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-primary tracking-tight">
                        {selectedConversation?.user_name}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Active Now</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-10 h-10 p-0 rounded-xl text-sm border-white/10 bg-surface-100/50 hover:bg-surface-200/50 hover:scale-105 transition-all shadow-sm">📞</Button>
                </div>

                {/* Messages Area */}
                <div 
                  ref={scrollRef}
                  className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 scroll-smooth bg-transparent relative z-10"
                >
                  {isThreadLoading ? (
                    <div className="flex-1 flex items-center justify-center"><Spinner label="Decrypting channel..." /></div>
                  ) : (
                    <AnimatePresence initial={false}>
                    {activeThread.map((msg, idx) => {
                      const isMine = msg.sender_name === currentUser?.name;
                      return (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.95, y: 10, originX: isMine ? 1 : 0 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          key={msg.id} 
                          className={`flex flex-col group ${isMine ? "items-end" : "items-start"}`}
                        >
                          <div className={`max-w-[80%] p-4 rounded-[1.5rem] text-sm shadow-xl transition-all duration-300 hover:scale-[1.01] ${
                            isMine 
                            ? "bg-gradient-to-br from-accent to-accent/90 text-background rounded-tr-sm shadow-accent/20 border border-accent/20" 
                            : "bg-surface-100/80 backdrop-blur-xl text-primary border border-white/20 dark:border-white/5 rounded-tl-sm shadow-primary/5"
                          }`}>
                            {msg.body && <div className="leading-relaxed font-medium">{msg.body}</div>}
                            {(msg as any).assets && (msg as any).assets.length > 0 && (
                              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
                                {(msg as any).assets.map((asset: any) => (
                                  <a 
                                    key={asset.id} 
                                    href={asset.file} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md ${
                                      isMine ? "bg-black/10 hover:bg-black/20 text-white" : "bg-surface-200/50 hover:bg-surface-200 text-primary border border-white/10"
                                    }`}
                                  >
                                    <span className="text-lg">📎</span>
                                    <span className="truncate max-w-[200px]">{asset.title || "Attachment"}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-surface-400 mt-2 uppercase tracking-widest px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </motion.div>
                      );
                    })}
                    </AnimatePresence>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-5 border-t border-white/10 dark:border-white/5 bg-surface-100/50 backdrop-blur-xl relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 bg-surface-200/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 shadow-sm">
                          <span className="truncate max-w-[150px] text-primary">{f.name}</span>
                          <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-600 transition-colors bg-red-500/10 w-5 h-5 rounded-md flex items-center justify-center">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-12 h-12 p-0 rounded-2xl flex items-center justify-center text-lg shrink-0 border-white/10 bg-surface-50/50 hover:bg-surface-200/50 text-surface-400 hover:text-primary transition-all shadow-inner hover:shadow-md"
                    >
                      📎
                    </Button>
                    <div className="flex-1 relative">
                      <textarea 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        placeholder="Message..."
                        className="w-full bg-surface-50/80 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-2xl p-4 pr-12 text-sm font-medium outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 resize-none min-h-[48px] max-h-[120px] transition-all shadow-inner placeholder:text-surface-400"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={!newMessage.trim() && selectedFiles.length === 0}
                      className="w-12 h-12 p-0 rounded-2xl flex items-center justify-center text-lg bg-accent hover:opacity-90 hover:scale-105 transition-all shadow-lg shadow-accent/30 shrink-0 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                    >
                      🚀
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-6 opacity-40 mix-blend-luminosity">
                <div className="text-8xl drop-shadow-2xl">💬</div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-primary tracking-tight">No Conversation Selected</h3>
                  <p className="text-sm font-medium text-surface-400 max-w-[200px] mx-auto">Choose a partner from the sidebar to start collaborating.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
