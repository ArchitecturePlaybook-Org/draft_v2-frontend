"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { leadsApi, Lead, LeadAnalytics } from '@/domains/leads/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { communicationsApi, Message, ConversationSummary } from "@/domains/communications/api";
import { useAuthStore } from "@/store/auth-store";
import { useLeadWebSocket } from "@/shared/hooks/useLeadWebSocket";
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
  }, [activeTab]);

  const handleStatusUpdate = async (id: number, status: Lead['status']) => {
    try {
      await leadsApi.updateLeadStatus(id, status);
      fetchLeads();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

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

  // Real-time WebSocket Stream Hook
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

  const pendingCount = leads.filter(l => l.status === 'PENDING').length;

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col space-y-5 animate-fade-in pb-8 px-2 max-w-7xl mx-auto">
      
      {/* 1. Header & Single Tab Bar */}
      <div className="bg-surface-100/90 backdrop-blur-xl border border-surface-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap justify-between items-center gap-4 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold border border-primary/20 shadow-inner">
            💼
          </div>
          <div>
            <h1 className="text-xl font-black text-primary tracking-tight">Business Leads</h1>
            <p className="text-xs text-surface-500 font-medium">Manage project inquiries and professional proposals</p>
          </div>
        </div>

        {/* Single Toggle Tab Pill */}
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
              📊 <span>Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Analytics Ribbon */}
      {activeTab === 'received' && analytics && (
        <div className="bg-surface-100/90 backdrop-blur-xl border border-surface-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 border-r border-surface-200/60 pr-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-base">
              💰
            </div>
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Total Pipeline</p>
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
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-base">
              📈
            </div>
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Pending / Converted</p>
              <p className="text-xs font-bold text-surface-600">
                <span className="text-amber-600 font-black">{analytics.status_counts?.PENDING || 0} Pending</span> • <span className="text-emerald-600 font-black">{analytics.status_counts?.CONVERTED || 0} Converted</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Leads Table */}
      <div className="flex-1">
        {isLoadingLeads ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface-100/50 rounded-2xl border border-surface-200">
            <Spinner size="lg" label="Loading leads pipeline..." />
          </div>
        ) : leads.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-100 border border-surface-200 rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-200/50 text-[11px] font-extrabold text-surface-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">S.No</th>
                    <th className="py-3.5 px-4">{activeTab === 'received' ? 'Client / Buyer' : 'Vendor / Professional'}</th>
                    <th className="py-3.5 px-4">Inquiry Brief</th>
                    <th className="py-3.5 px-4">Project Specs</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/60 text-xs font-semibold text-primary">
                  {leads.map((lead, index) => {
                    const targetUserId = activeTab === 'received' 
                      ? (lead.client_id || lead.client) 
                      : (lead.professional_id || lead.professional);
                    const targetUserName = activeTab === 'received' ? lead.client_name : lead.professional_name;

                    return (
                      <tr key={lead.id} className="hover:bg-surface-200/40 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-surface-400">
                          #{index + 1}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent font-black flex items-center justify-center text-xs shrink-0 border border-accent/20">
                              {targetUserName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-primary">{targetUserName}</div>
                              {lead.portfolio_item_title && (
                                <div className="text-[10px] text-surface-500 font-medium truncate max-w-[160px]">
                                  📦 {lead.portfolio_item_title}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 max-w-xs">
                          <p className="line-clamp-2 text-surface-700 font-medium italic">
                            "{lead.message}"
                          </p>
                        </td>

                        <td className="py-4 px-4">
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

                        <td className="py-4 px-4">
                          <Badge variant={lead.status === 'PENDING' ? 'warning' : lead.status === 'ACCEPTED' ? 'success' : lead.status === 'REJECTED' ? 'secondary' : 'info'}>
                            {lead.status}
                          </Badge>
                        </td>

                        <td className="py-4 px-4 text-surface-500 font-medium text-[11px]">
                          {new Date(lead.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
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
                              className="px-3 h-8 text-[11px] font-extrabold rounded-lg border-accent/40 text-accent hover:bg-accent/10 flex items-center gap-1 shadow-sm"
                              onClick={() => openChatForUser(targetUserId, targetUserName, lead.id)}
                            >
                              💬 <span>Chat</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 bg-surface-100/60 rounded-2xl border border-surface-200">
            <div className="text-4xl mb-2">💼</div>
            <h3 className="text-base font-bold text-primary mb-1">No Leads Found</h3>
            <p className="text-xs text-surface-500">No active inquiries detected in this tab.</p>
          </div>
        )}
      </div>

      {/* 4. High-Performance Chat Modal */}
      <AnimatePresence>
        {isChatOpen && selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-surface-50 border border-surface-200 rounded-3xl w-full max-w-2xl h-[90vh] max-h-[640px] flex flex-col shadow-2xl overflow-hidden relative z-10"
            >
              {/* Chat Modal Header */}
              <div className="p-4 px-5 border-b border-surface-200 bg-surface-100/90 backdrop-blur-md flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-accent text-background font-black flex items-center justify-center text-base shadow-sm">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-primary tracking-tight">{selectedUser.name}</h3>
                      {selectedLeadId && (
                        <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent font-extrabold text-[10px] uppercase tracking-wider">
                          Lead #{selectedLeadId}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-surface-500 font-medium">
                      Direct RFQ Trade Negotiation Stream
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-200 hover:bg-surface-300 text-surface-600 flex items-center justify-center font-bold text-sm transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Chat Thread Messages Viewport */}
              <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-surface-100/40">
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
              <div className="p-3.5 border-t border-surface-200 bg-surface-100/90 backdrop-blur-md shrink-0">
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
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
