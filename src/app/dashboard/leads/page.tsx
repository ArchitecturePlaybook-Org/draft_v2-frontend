"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { leadsApi, Lead, LeadAnalytics } from '@/domains/leads/api';
import { Card } from '@/components/ui/Card';
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
  const [hoverConvertId, setHoverConvertId] = useState<number | null>(null);

  // Chat Modal State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number | string; name: string } | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeThread, setActiveThread] = useState<Message[]>([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
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

  // Messenger / Chat Modal Logic
  const loadConversations = async () => {
    try {
      const data = await communicationsApi.listConversations();
      setConversations(data);
    } catch (err) {
      console.error(err);
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

  // Real-time WebSocket Stream Hook (0 HTTP Polling Calls)
  const handleWsMessage = useCallback((newMsg: Message) => {
    setActiveThread((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
  }, []);

  useLeadWebSocket(isChatOpen ? selectedLeadId : null, handleWsMessage);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedUser?.id && isChatOpen) {
      loadThread(selectedUser.id, selectedLeadId);
    }
  }, [selectedUser, selectedLeadId, isChatOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
    if ((!messageBody.trim() && selectedFiles.length === 0) || !selectedUser?.id) return;

    try {
      const sentMsg = await communicationsApi.sendMessage({
        recipient: selectedUser.id,
        lead: selectedLeadId || undefined,
        body: messageBody,
        subject: "Showroom RFQ Chat",
        files: selectedFiles,
      });

      if (typeof e !== 'string') {
        setNewMessage("");
        setSelectedFiles([]);
      }

      // Immediately append sent message to activeThread locally
      if (sentMsg && sentMsg.id) {
        setActiveThread((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }

      // Refresh thread silently without showing loading spinner
      loadThread(selectedUser.id, selectedLeadId, true);
      loadConversations();
    } catch (err: any) {
      console.error("Error sending chat message:", err);
      alert(err.message || "Failed to send message. Please try again.");
    }
  };

  const pendingCount = leads.filter(l => l.status === 'PENDING').length;

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col space-y-5 animate-fade-in pb-8 px-2 max-w-7xl mx-auto">
      
      {/* 1. Sleek Compact Header & Single Tab Bar */}
      <div className="bg-surface-50/70 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-wrap justify-between items-center gap-4 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold border border-primary/20 shadow-inner">
            💼
          </div>
          <div>
            <h1 className="text-xl font-black text-primary tracking-tight">Business Leads</h1>
            <p className="text-xs text-surface-400 font-medium">Manage Showroom RFQs and project inquiries</p>
          </div>
        </div>

        {/* Compact Single Toggle Tab Pill */}
        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 bg-surface-200/60 dark:bg-surface-800/60 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
            <button 
              onClick={() => setActiveTab('received')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'received' 
                  ? 'bg-primary text-background shadow-md scale-[1.02]' 
                  : 'text-surface-500 hover:text-primary'
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
                  ? 'bg-primary text-background shadow-md scale-[1.02]' 
                  : 'text-surface-500 hover:text-primary'
              }`}
            >
              <span>My Inquiries</span>
            </button>
          </div>

          {activeTab === 'received' && (
            <Button 
              variant="outline" 
              className="text-xs font-bold h-9 px-3.5 rounded-xl border-white/10 bg-surface-100/50 hover:border-accent hover:text-accent transition-all flex items-center gap-1.5"
              onClick={() => leadsApi.exportLeadsToExcel()}
            >
              📊 <span>Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Compact Analytics Ribbon (Only for Received) */}
      {activeTab === 'received' && analytics && (
        <div className="bg-gradient-to-r from-surface-100/80 via-surface-50/50 to-surface-100/80 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl p-4 shadow-md grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="flex items-center gap-3 border-r border-white/10 dark:border-white/5 pr-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-base border border-primary/20">
              💰
            </div>
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Total Pipeline</p>
              <p className="text-xl font-black text-primary tracking-tight">
                ${(analytics.pipeline_value || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-r border-white/10 dark:border-white/5 px-4">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-base border border-accent/20">
              ⚡
            </div>
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Conversion Rate</p>
              <p className="text-xl font-black text-accent tracking-tight">
                {analytics.conversion_rate || 0}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-4">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 text-base border border-green-500/20">
              📈
            </div>
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Pending / Converted</p>
              <p className="text-sm font-bold text-surface-600 dark:text-surface-300">
                <span className="text-yellow-500 font-black">{analytics.status_counts?.PENDING || 0} Pending</span> • <span className="text-green-500 font-black">{analytics.status_counts?.CONVERTED || 0} Converted</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Full-Width Leads Pipeline Container */}
      <div className="flex-1">
        {isLoadingLeads ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface-50/50 backdrop-blur-md border border-white/10 rounded-2xl">
            <Spinner size="lg" label="Loading leads..." />
          </div>
        ) : leads.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-card border border-surface-200 rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-100/70 text-[11px] font-extrabold text-surface-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">S.No</th>
                    <th className="py-3.5 px-4">{activeTab === 'received' ? 'Client / Buyer' : 'Vendor / Recipient'}</th>
                    <th className="py-3.5 px-4">RFQ Inquiry / Spec</th>
                    <th className="py-3.5 px-4">Project Scope</th>
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
                      <tr key={lead.id} className="hover:bg-surface-100/50 transition-colors">
                        {/* Serial Number */}
                        <td className="py-4 px-4 font-mono font-extrabold text-surface-400">
                          #{index + 1}
                        </td>

                        {/* Client / Vendor User */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent font-black flex items-center justify-center text-xs shrink-0 border border-accent/20">
                              {targetUserName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-primary">{targetUserName}</div>
                              {lead.portfolio_item_title && (
                                <div className="text-[10px] text-surface-400 font-medium truncate max-w-[160px]">
                                  📦 {lead.portfolio_item_title}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Message */}
                        <td className="py-4 px-4 max-w-xs">
                          <p className="line-clamp-2 text-surface-600 dark:text-surface-300 font-medium italic">
                            "{lead.message}"
                          </p>
                        </td>

                        {/* Spec Tags */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {lead.metadata?.project_type && (
                              <span className="px-2 py-0.5 bg-surface-100 rounded-md text-[10px] font-bold text-surface-500">
                                📁 {lead.metadata.project_type}
                              </span>
                            )}
                            {lead.metadata?.timeline && (
                              <span className="px-2 py-0.5 bg-surface-100 rounded-md text-[10px] font-bold text-surface-500">
                                ⏱ {lead.metadata.timeline}
                              </span>
                            )}
                            {lead.metadata?.budget_range && (
                              <span className="px-2 py-0.5 bg-surface-100 rounded-md text-[10px] font-bold text-surface-500">
                                💰 {lead.metadata.budget_range}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <Badge variant={lead.status === 'PENDING' ? 'warning' : lead.status === 'ACCEPTED' ? 'success' : lead.status === 'REJECTED' ? 'secondary' : 'info'}>
                            {lead.status}
                          </Badge>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 text-surface-400 font-medium text-[11px]">
                          {new Date(lead.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>

                        {/* Actions */}
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
                                className="bg-green-500 text-white text-[11px] px-2.5 h-8 rounded-lg font-extrabold shadow-sm"
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
          <div className="text-center py-20 bg-surface-50/50 backdrop-blur-xl border border-white/10 rounded-2xl">
            <div className="text-4xl mb-3">💼</div>
            <h3 className="text-lg font-bold text-primary mb-1">No Leads Found</h3>
            <p className="text-xs text-surface-400">No active inquiries detected in this tab.</p>
          </div>
        )}
      </div>

      {/* 4. High-End Interactive Chat Modal */}
      <AnimatePresence>
        {isChatOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-surface-card border border-surface-200 rounded-3xl w-full max-w-2xl h-[620px] flex flex-col shadow-2xl overflow-hidden relative"
            >
              {/* Sleek Chat Modal Header */}
              <div className="p-4 px-6 border-b border-surface-200 bg-surface-100/90 backdrop-blur-md flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-accent text-background font-black flex items-center justify-center text-base shadow-sm">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-surface-card animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-primary tracking-tight">{selectedUser.name}</h3>
                      {selectedLeadId && (
                        <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent font-extrabold text-[10px] uppercase tracking-wider">
                          Lead #{selectedLeadId} Thread
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-surface-400 font-medium">
                      Direct Showroom RFQ &amp; Trade Negotiation
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="w-9 h-9 rounded-xl bg-surface-200/60 hover:bg-surface-200 text-surface-500 hover:text-primary flex items-center justify-center font-bold text-base transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Chat Thread Messages Viewport */}
              <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-background/50">
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
                        
                        {/* Sender / Receiver Label */}
                        <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-surface-400">
                          <span>{isMine ? "You" : senderName || selectedUser.name}</span>
                          <span>•</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Message Bubble Container */}
                        <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-xs font-semibold shadow-sm leading-relaxed ${
                          isMine 
                            ? 'bg-accent text-background rounded-tr-xs shadow-md font-bold' 
                            : 'bg-surface-card border border-surface-200 text-primary rounded-tl-xs shadow-sm'
                        }`}>
                          {msg.body}

                          {/* File Asset Attachments */}
                          {msg.assets && msg.assets.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/10 space-y-1.5">
                              {msg.assets.map((asset) => (
                                <a
                                  key={asset.id}
                                  href={asset.file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-xl text-[11px] font-bold transition-all ${
                                    isMine 
                                      ? 'bg-background/20 text-background hover:bg-background/30' 
                                      : 'bg-surface-100 text-primary hover:bg-surface-200'
                                  }`}
                                >
                                  <span>📎</span>
                                  <span className="truncate flex-1">{asset.title}</span>
                                  <span className="text-[9px] opacity-80">⬇️</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-surface-100 text-accent mx-auto flex items-center justify-center text-2xl shadow-inner border border-surface-200">
                      💬
                    </div>
                    <h4 className="text-sm font-bold text-primary">No Messages Yet</h4>
                    <p className="text-xs text-surface-400 font-medium max-w-xs mx-auto">
                      Send a direct inquiry or trade message to start the conversation.
                    </p>
                  </div>
                )}
              </div>

              {/* Chat Input Toolbar */}
              <div className="p-4 border-t border-surface-200 bg-surface-100/90 backdrop-blur-md shrink-0">
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedFiles.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-surface-200 text-primary px-3 py-1 rounded-xl border border-surface-300">
                        <span>📎 {f.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="hover:text-semantic-red"
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
                    className="w-10 h-10 rounded-xl border border-surface-200 bg-surface-card hover:bg-surface-200 text-surface-500 hover:text-primary flex items-center justify-center text-lg transition-all shadow-sm shrink-0"
                    title="Attach Specification Files"
                  >
                    📎
                  </button>

                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your trade message..."
                    className="flex-1 bg-surface-card border border-surface-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-primary placeholder:text-surface-400 outline-none focus:border-accent transition-colors shadow-sm"
                  />

                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() && selectedFiles.length === 0}
                    className="h-10 px-5 bg-accent text-background font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all disabled:opacity-40 shadow-sm shrink-0"
                  >
                    Send 🚀
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
