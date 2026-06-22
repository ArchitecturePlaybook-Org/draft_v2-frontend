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

export default function LeadsPage() {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  
  // Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

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
        <div className="bg-white p-6 border border-surface-200 rounded-2xl shadow-sm space-y-6 shrink-0">
          <div>
            <h1 className="text-3xl font-extrabold text-primary mb-2 tracking-tight">Business Opportunity Pipeline</h1>
            <p className="text-xs text-surface-500 max-w-2xl leading-relaxed">
              {activeTab === 'received' 
                ? "Manage architectural inquiries and project leads generated from your professional portfolio." 
                : "Track your active inquiries and project interests sent to other professionals."}
            </p>
          </div>

          <div className="flex justify-between items-center border-b border-surface-100 pb-3">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('received')}
                className={`px-2 text-xs font-bold uppercase tracking-widest transition-all border-b-2 -mb-3 ${activeTab === 'received' ? 'text-accent border-accent' : 'text-surface-400 border-transparent'}`}
              >
                Incoming Leads
              </button>
              <button 
                onClick={() => setActiveTab('sent')}
                className={`px-2 text-xs font-bold uppercase tracking-widest transition-all border-b-2 -mb-3 ${activeTab === 'sent' ? 'text-accent border-accent' : 'text-surface-400 border-transparent'}`}
              >
                My Inquiries
              </button>
            </div>
            {activeTab === 'received' && (
              <Button 
                variant="outline" 
                className="text-[10px] font-bold uppercase tracking-widest h-8"
                onClick={() => leadsApi.exportLeadsToExcel()}
              >
                📊 Export Excel
              </Button>
            )}
          </div>
        </div>

        {/* Analytics Dashboard (Only for Received) */}
        {activeTab === 'received' && analytics && (
          <div className="grid grid-cols-4 gap-4 shrink-0">
            <div className="bg-white p-4 border border-surface-200 rounded-2xl shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Total Pipeline</p>
              <p className="text-2xl font-bold text-primary">${analytics.pipeline_value.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 border border-surface-200 rounded-2xl shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Conversion</p>
              <p className="text-2xl font-bold text-accent">{analytics.conversion_rate}%</p>
            </div>
            <div className="bg-white p-4 border border-surface-200 rounded-2xl shadow-sm flex flex-col justify-center col-span-2">
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2">Lead Statuses</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  <span className="text-xs font-bold text-surface-600">{analytics.status_counts.PENDING} Pending</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-bold text-surface-600">{analytics.status_counts.ACCEPTED} Accepted</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-xs font-bold text-surface-600">{analytics.status_counts.CONVERTED} Converted</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lead Cards */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {isLoadingLeads ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-surface-200 rounded-2xl">
              <Spinner size="lg" label="Synchronizing pipeline data..." />
            </div>
          ) : leads.length > 0 ? (
            leads.map((lead) => {
              const isOldPending = lead.status === 'PENDING' && (new Date().getTime() - new Date(lead.updated_at).getTime()) > 48 * 60 * 60 * 1000;
              
              return (
                <Card key={lead.id} className="p-6 flex flex-col gap-6 group hover:border-accent/50 transition-all relative">
                  
                  {/* Lead Hotness Score */}
                  {lead.score !== undefined && lead.score > 0 && activeTab === 'received' && (
                    <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 border-2 border-white">
                      <span>🔥</span>
                      <span>Score: {lead.score}</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-lg font-bold text-primary shrink-0">
                        {activeTab === 'received' ? lead.client_name.charAt(0) : lead.professional_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-primary">
                            {activeTab === 'received' ? lead.client_name : `Recipient: ${lead.professional_name}`}
                          </h3>
                          {isOldPending && activeTab === 'received' && (
                            <span className="bg-yellow-100 text-yellow-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border border-yellow-200">⚠️ Needs Follow-up</span>
                          )}
                        </div>
                        <p className="text-[10px] text-surface-400 uppercase tracking-[0.2em] font-mono mt-0.5">ID: {lead.id} • {new Date(lead.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant={lead.status === 'PENDING' ? 'warning' : lead.status === 'ACCEPTED' ? 'success' : lead.status === 'REJECTED' ? 'secondary' : 'info'}>
                      {lead.status}
                    </Badge>
                  </div>
                  
                  <div className="bg-surface-50 p-4 rounded-xl border border-surface-100">
                    <p className="text-sm text-surface-600 italic leading-relaxed">"{lead.message}"</p>
                  </div>
                  
                  {lead.metadata && (
                    <div className="flex flex-wrap gap-2">
                      {lead.metadata.project_type && (
                        <div className="px-3 py-1 bg-surface-100 rounded-full text-[10px] font-bold text-surface-600 uppercase tracking-widest border border-surface-200">
                          📁 {lead.metadata.project_type}
                        </div>
                      )}
                      {lead.metadata.timeline && (
                        <div className="px-3 py-1 bg-surface-100 rounded-full text-[10px] font-bold text-surface-600 uppercase tracking-widest border border-surface-200">
                          ⏱ {lead.metadata.timeline}
                        </div>
                      )}
                      {lead.metadata.budget_range && (
                        <div className="px-3 py-1 bg-surface-100 rounded-full text-[10px] font-bold text-surface-600 uppercase tracking-widest border border-surface-200">
                          💰 {lead.metadata.budget_range}
                        </div>
                      )}
                    </div>
                  )}

                  {lead.portfolio_item_title && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">{activeTab === 'received' ? 'Inquiry Source:' : 'Target Project:'}</span>
                      <span className="text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-2 py-1 rounded">{lead.portfolio_item_title}</span>
                    </div>
                  )}

                  {activeTab === 'received' && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-100">
                      {lead.status === 'PENDING' && (
                        <>
                          <Button variant="primary" className="flex-1 text-xs py-2" onClick={() => handleStatusUpdate(lead.id, 'ACCEPTED')}>
                            Accept Inquiry
                          </Button>
                          <Button variant="outline" className="flex-1 text-xs py-2" onClick={() => handleStatusUpdate(lead.id, 'REJECTED')}>
                            Reject
                          </Button>
                          {isOldPending && (
                            <Button 
                              variant="outline" 
                              className="w-full text-xs py-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50"
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
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 shadow-md shadow-green-600/20"
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
                            className="flex-1 border-accent text-accent hover:bg-accent/5 text-xs py-2"
                            onClick={() => handleMessageUser(lead.client_name)}
                          >
                            Message
                          </Button>
                        </>
                      )}
                      {lead.status === 'CONVERTED' && (
                        <div className="w-full py-2 flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs font-bold">
                          <span>✅</span> Converted to Active Project
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'sent' && (
                     <div className="flex justify-between items-center gap-3 pt-2 border-t border-surface-100">
                       <div className={`px-4 py-1.5 rounded-lg border font-bold text-[10px] uppercase tracking-widest ${
                         lead.status === 'PENDING' ? 'bg-surface-50 text-surface-400 border-surface-200' :
                         lead.status === 'ACCEPTED' ? 'bg-green-50 text-green-600 border-green-200' :
                         lead.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-200' :
                         'bg-accent/5 text-accent border-accent/20'
                       }`}>
                         {lead.status}
                       </div>
                       <Button
                          variant="ghost"
                          className="text-[10px] font-bold uppercase tracking-widest text-accent hover:bg-accent/5"
                          onClick={() => handleMessageUser(lead.professional_name)}
                        >
                          Message
                        </Button>
                     </div>
                  )}
                </Card>
              );
            })
          ) : (
            <div className="text-center py-20 bg-white border border-surface-200 rounded-2xl shadow-sm">
              <div className="text-4xl mb-4 opacity-20">💼</div>
              <h3 className="text-lg font-bold text-primary mb-2 tracking-tight">Pipeline Empty</h3>
              <p className="text-xs text-surface-400 max-w-[250px] mx-auto leading-relaxed">
                No business inquiries have been detected yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Messenger */}
      <div className="w-1/2 flex flex-col bg-white border border-surface-200 rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/5">
        {/* Messenger Header */}
        <div className="p-5 border-b border-surface-100 bg-surface-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              💬
            </div>
            <h2 className="text-lg font-bold text-primary tracking-tight">Messenger</h2>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-3 py-1.5 rounded-full border border-accent/10">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            Live
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Sidebar inside Messenger */}
          <div className="w-64 border-r border-surface-100 flex flex-col bg-surface-50/30">
            <div className="p-4 border-b border-surface-100">
              <input 
                type="text" 
                placeholder="Search messages..." 
                value={globalSearchQuery}
                onChange={e => setGlobalSearchQuery(e.target.value)}
                className="w-full bg-white border border-surface-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-accent transition-all"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {globalSearchQuery.trim() ? (
                isSearching ? (
                  <div className="flex justify-center py-10"><Spinner size="sm" /></div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-surface-100">
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
                          className="p-3 cursor-pointer hover:bg-surface-100 transition-colors group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-primary group-hover:text-accent truncate pr-2">
                              {otherName}
                            </span>
                            <span className="text-[9px] text-surface-400 shrink-0">
                              {new Date(msg.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-surface-500 font-medium truncate">
                            Sub: {msg.subject}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 px-4">
                    <p className="text-[10px] text-surface-400 font-medium">No results found.</p>
                  </div>
                )
              ) : isLoadingMessenger ? (
                <div className="flex justify-center py-10"><Spinner size="sm" /></div>
              ) : conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div 
                    key={conv.user_id} 
                    onClick={() => setSelectedUserId(conv.user_id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex gap-2 items-center group ${
                      selectedUserId === conv.user_id 
                      ? "bg-white shadow-md shadow-primary/5 border border-surface-100" 
                      : "hover:bg-white/60"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      selectedUserId === conv.user_id ? "bg-primary text-white scale-110 shadow-md shadow-primary/20" : "bg-primary/10 text-primary"
                    }`}>
                      {conv.user_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className="text-xs font-bold text-primary truncate group-hover:text-accent transition-colors">
                          {conv.user_name}
                        </h4>
                      </div>
                      <p className="text-[10px] text-surface-500 truncate leading-tight">
                        {conv.last_message}
                      </p>
                    </div>
                    {!conv.is_read && (
                      <div className="w-1.5 h-1.5 bg-accent rounded-full shrink-0 shadow-sm shadow-accent/40" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 px-4">
                  <p className="text-[10px] text-surface-400 font-medium">No conversations found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Chat View */}
          <div className="flex-1 flex flex-col bg-white relative">
            {selectedUserId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-surface-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-xs font-bold text-primary">
                      {selectedConversation?.user_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-primary">
                        {selectedConversation?.user_name}
                      </h2>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Active</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-8 h-8 p-0 rounded-lg text-xs">📞</Button>
                </div>

                {/* Messages Area */}
                <div 
                  ref={scrollRef}
                  className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-surface-50/30 scroll-smooth"
                >
                  {isThreadLoading ? (
                    <div className="flex-1 flex items-center justify-center"><Spinner label="Decrypting channel..." /></div>
                  ) : activeThread.map((msg, idx) => {
                    const isMine = msg.sender_name === currentUser?.name;
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                      >
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs shadow-sm ${
                          isMine 
                          ? "bg-primary text-white rounded-tr-none" 
                          : "bg-white text-surface-700 border border-surface-100 rounded-tl-none"
                        }`}>
                          {msg.body && <div className="mb-1">{msg.body}</div>}
                          {(msg as any).assets && (msg as any).assets.length > 0 && (
                            <div className="flex flex-col gap-1 mt-2">
                              {(msg as any).assets.map((asset: any) => (
                                <a 
                                  key={asset.id} 
                                  href={asset.file} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold ${
                                    isMine ? "bg-white/20 hover:bg-white/30 text-white" : "bg-surface-100 hover:bg-surface-200 text-surface-700"
                                  } transition-all`}
                                >
                                  <span>📎</span>
                                  <span className="truncate max-w-[150px]">{asset.title || "Attachment"}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[8px] font-bold text-surface-400 mt-1 uppercase tracking-widest px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-surface-100 bg-white">
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 bg-surface-100 px-2 py-1 rounded-md text-[10px]">
                          <span className="truncate max-w-[100px]">{f.name}</span>
                          <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
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
                      className="w-11 h-11 p-0 rounded-xl flex items-center justify-center text-sm shrink-0 border-surface-200 text-surface-500 hover:text-primary hover:border-surface-300"
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
                        placeholder="Type a message..."
                        className="w-full bg-surface-50 border border-surface-200 rounded-xl p-3 pr-10 text-xs outline-none focus:border-accent resize-none min-h-[44px] max-h-[100px] transition-all"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={!newMessage.trim() && selectedFiles.length === 0}
                      className="w-11 h-11 p-0 rounded-xl flex items-center justify-center text-sm bg-accent hover:bg-primary transition-all shadow-md shadow-accent/20 shrink-0"
                    >
                      🚀
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-4 opacity-40">
                <div className="text-6xl">💬</div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-primary">No Conversation</h3>
                  <p className="text-xs text-surface-500">Select a partner to chat.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
