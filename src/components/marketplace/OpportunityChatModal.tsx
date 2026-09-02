"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { communicationsApi, type Message } from "@/domains/communications/api";
import { OpportunityPosting, OpportunityInterest, updateInquiryStatus } from "@/domains/marketplace/api";
import { useChatWebSocket } from "@/shared/hooks/useChatWebSocket";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  X,
  Send,
  Paperclip,
  Building2,
  MapPin,
  Sparkles,
  Award,
  TrendingUp,
  CheckCircle2,
  FileText,
  Briefcase,
  Users,
} from "lucide-react";

interface OpportunityChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityPosting | null;
  interest: OpportunityInterest | null;
  onStatusUpdated?: (newStatus: "INTERESTED" | "IN_TALKS" | "AWARDED" | "REJECTED") => void;
}

export function OpportunityChatModal({
  isOpen,
  onClose,
  opportunity,
  interest,
  onStatusUpdated,
}: OpportunityChatModalProps) {
  const { user, fetchCurrentUser } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(interest?.status || "INTERESTED");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const channelId = interest?.chat_channel;

  useEffect(() => {
    if (!user) {
      fetchCurrentUser().catch(() => { });
    }
  }, [user, fetchCurrentUser]);

  useEffect(() => {
    if (interest?.status) {
      setCurrentStatus(interest.status);
    }
  }, [interest?.status]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const list = await communicationsApi.getChannelMessages(channelId);
      setMessages(list || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (isOpen && channelId) {
      loadMessages();
    }
  }, [isOpen, channelId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-Time WebSocket live stream for this Channel
  const handleWsMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useChatWebSocket(
    "channel",
    isOpen && channelId ? channelId : null,
    handleWsMessage
  );

  if (!isOpen || (!opportunity && !interest)) return null;

  const oppTitle = opportunity?.title || interest?.opportunity_details?.title || `Opportunity #${interest?.opportunity}`;
  const oppLocation = opportunity?.location || interest?.opportunity_details?.location || "Site Location";
  const oppBudget = opportunity?.budget_range || interest?.opportunity_details?.budget_range;
  const applicantName = interest?.applicant_details?.first_name
    ? `${interest.applicant_details.first_name} ${interest.applicant_details.last_name || ""}`
    : interest?.applicant_details?.email || `Applicant #${interest?.applicant}`;

  const isOwner = user?.id === opportunity?.poster || user?.id === interest?.opportunity_details?.poster;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    if (!channelId) {
      toast.error("Chat channel is not initialized for this inquiry.");
      return;
    }

    setSending(true);
    try {
      const sent = await communicationsApi.sendMessage({
        channel: channelId,
        subject: `Tender: ${oppTitle}`,
        body: newMessage,
        files: selectedFiles,
      });

      if (sent && sent.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent];
        });
      }

      setNewMessage("");
      setSelectedFiles([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "INTERESTED" | "IN_TALKS" | "AWARDED" | "REJECTED") => {
    if (!interest?.id) return;
    try {
      const res = await updateInquiryStatus(interest.id, newStatus);
      setCurrentStatus(newStatus);
      if (onStatusUpdated) onStatusUpdated(newStatus);
      
      if (res.po_created) {
        toast.success(`Tender Awarded & Draft PO Created! (ID: ${res.po_id})`, { duration: 5000 });
      } else {
        toast.success(`Inquiry marked as ${newStatus}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const QUICK_REPLIES = [
    "📋 Please review our technical quotation and scheduled dispatch timeline.",
    "🚚 We guarantee site delivery with factory test certificates.",
    "🤝 Rates include GST, transit insurance, and standard unloading.",
    "📐 Can you please share the site storage and unloading requirements?",
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface-100 border-l border-surface-200 h-full flex flex-col shadow-2xl relative overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-surface-200 bg-surface-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center font-black text-sm border border-accent/25 shrink-0 shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-primary truncate">
                  {oppTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-semantic-green border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Chat</span>
                </span>
              </div>
              <p className="text-[11px] font-medium text-surface-400 truncate flex items-center gap-1.5 mt-0.5">
                <span>With: <strong className="text-primary">{applicantName}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {oppLocation}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-200 hover:bg-surface-300 text-primary font-bold flex items-center justify-center text-sm transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tender Context & Status Ribbon */}
        <div className="px-4 py-2.5 bg-surface-200/50 border-b border-surface-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-surface-400">Status:</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${currentStatus === "AWARDED"
                  ? "bg-emerald-500/15 text-semantic-green border-emerald-500/30"
                  : currentStatus === "IN_TALKS"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    : currentStatus === "REJECTED"
                      ? "bg-red-500/15 text-semantic-red border-red-500/30"
                      : "bg-blue-500/15 text-semantic-blue border-semantic-blue/30"
                }`}
            >
              {currentStatus}
            </span>
            {oppBudget && (
              <span className="text-[11px] font-bold text-accent">
                Est. Value: {oppBudget}
              </span>
            )}
          </div>

          {/* Quick Owner Actions */}
          {isOwner && interest && currentStatus !== "AWARDED" && (
            <div className="flex items-center gap-1.5">
              {currentStatus === "INTERESTED" && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("IN_TALKS")}
                  className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 hover:bg-amber-500 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Mark In Talks
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (confirm("Confirm tender award to this contractor/supplier?")) {
                    handleUpdateStatus("AWARDED");
                  }
                }}
                className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-semantic-green hover:bg-emerald-500 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
              >
                <Award className="w-3 h-3" /> Award Tender
              </button>
            </div>
          )}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 bg-surface-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
          {loading ? (
            <div className="space-y-3 py-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-12 w-2/3 bg-surface-200 rounded-2xl animate-pulse ${i % 2 === 0 ? "ml-auto" : ""
                    }`}
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-surface-400">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-2xl shadow-inner">
                💬
              </div>
              <p className="text-xs font-bold text-primary">No Messages Yet</p>
              <p className="text-[11px] leading-relaxed max-w-xs text-surface-500">
                Start the negotiation thread directly. Discuss specifications, deliverables, and pricing.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const senderObj = typeof msg.sender === "object" ? msg.sender : null;
              const senderId = senderObj?.id ?? (typeof msg.sender === "number" ? msg.sender : null);
              const senderName = senderObj?.name || msg.sender_name || (senderId ? `User #${senderId}` : "Participant");
              const senderEmail = senderObj?.email || (msg as any).sender_email;

              const myId = user?.id;
              const myEmail = user?.email;
              const myName = user?.name;

              const isMe = Boolean(
                (myId && senderId && Number(myId) === Number(senderId)) ||
                (myEmail && senderEmail && myEmail.toLowerCase() === senderEmail.toLowerCase()) ||
                (myName && senderName && myName.toLowerCase() === senderName.toLowerCase()) ||
                (msg as any).is_me === true ||
                (msg as any).is_sender === true
              );

              const formattedTime = format(new Date(msg.created_at), "p");

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end ml-auto" : "items-start mr-auto"} space-y-0.5 group`}
                >
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1 ${isMe ? "text-accent text-right" : "text-surface-400 text-left"}`}>
                    {isMe ? "You" : senderName}
                  </span>

                  <div
                    className={`w-fit max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed transition-all shadow-xs ${isMe
                        ? "bg-accent text-background font-semibold rounded-tr-xs shadow-sm border border-accent/30"
                        : "bg-surface-100 border border-surface-200 text-primary font-medium rounded-tl-xs shadow-xs"
                      }`}
                  >
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <span className="whitespace-pre-wrap break-words">{msg.body}</span>
                      <span className={`text-[9px] font-bold select-none shrink-0 self-end ml-auto ${isMe ? "opacity-75" : "text-surface-400"}`}>
                        {formattedTime}
                      </span>
                    </div>

                    {/* File Attachments */}
                    {msg.assets && msg.assets.length > 0 && (
                      <div className={`mt-2 pt-1.5 border-t space-y-1 ${isMe ? "border-background/20" : "border-surface-200"}`}>
                        {msg.assets.map((asset) => (
                          <a
                            key={asset.id}
                            href={asset.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 text-[11px] font-bold underline transition-opacity hover:opacity-80 ${isMe ? "text-background" : "text-accent"
                              }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">{asset.title || "Attached Document"}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies Carousel */}
        <div className="px-3 py-2 bg-surface-50 border-t border-surface-200 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
          {QUICK_REPLIES.map((reply, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setNewMessage(reply)}
              className="px-2.5 py-1 rounded-lg bg-surface-200 hover:bg-surface-300 text-surface-600 text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="px-4 py-2 bg-surface-100 border-t border-surface-200 flex flex-wrap gap-2 shrink-0">
            {selectedFiles.map((file, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-surface-200 rounded-lg text-[10px] font-bold text-primary flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-accent" />
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="hover:text-red-500 font-black cursor-pointer"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Message Input Footer */}
        <form onSubmit={handleSend} className="p-3 border-t border-surface-200 bg-surface-50 flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                setSelectedFiles(Array.from(e.target.files));
              }
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl bg-surface-200 hover:bg-surface-300 text-surface-500 hover:text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Attach BOQ, PDF, or Drawings"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder="Type your message or proposal..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 h-10 px-4 bg-surface-100 border border-surface-200 rounded-xl text-xs font-bold text-primary outline-none focus:border-accent"
          />

          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}
            className="h-10 px-4 bg-accent hover:opacity-90 disabled:opacity-40 text-background rounded-xl font-bold uppercase text-xs tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>

      </div>
    </div>
  );
}
