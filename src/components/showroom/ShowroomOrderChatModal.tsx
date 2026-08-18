"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { communicationsApi, type Message } from "@/domains/communications/api";
import { type ProductOrder } from "@/domains/showroom/api";
import { useChatWebSocket } from "@/shared/hooks/useChatWebSocket";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { format } from "date-fns";

interface ShowroomOrderChatModalProps {
  order: ProductOrder | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: number;
}

export function ShowroomOrderChatModal({
  order,
  isOpen,
  onClose,
  currentUserId,
}: ShowroomOrderChatModalProps) {
  const { user, fetchCurrentUser } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      fetchCurrentUser().catch(() => {});
    }
  }, [user, fetchCurrentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = useCallback(async () => {
    if (!order) return;
    setLoading(true);
    try {
      const list = await communicationsApi.getShowroomOrderThread(order.id);
      setMessages(list || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [order]);

  useEffect(() => {
    if (isOpen && order) {
      loadMessages();
    }
  }, [isOpen, order, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-Time WebSocket Handler
  const handleWsMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  // Connect WebSocket live stream for this Showroom Order
  useChatWebSocket(
    "showroom_order",
    isOpen && order ? order.id : null,
    handleWsMessage
  );

  if (!isOpen || !order) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    setSending(true);
    try {
      const recipientId = typeof order.buyer === "number" ? order.buyer : undefined;

      const sent = await communicationsApi.sendMessage({
        showroom_order: order.id,
        recipient: recipientId,
        subject: `Showroom Order #${order.id} Chat`,
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

  const QUICK_REPLIES = [
    "✅ 10% Trade Discount available for this order.",
    "📦 Item is in stock & ready for immediate dispatch.",
    "📐 Please provide custom dimension specifications.",
    "🚚 Sample delivery will take 3-5 business days.",
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-surface-card border-l border-surface-200 dark:border-surface-800 h-full flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center font-black text-lg border border-accent/30 shrink-0 shadow-xs">
              🏛️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-primary truncate">
                  {order.product_name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Stream</span>
                </span>
              </div>
              <p className="text-[11px] font-medium text-surface-400 truncate">
                Order #{order.id} · Buyer: {order.buyer_name} · Qty: {order.quantity}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-200/60 dark:bg-surface-800 hover:bg-surface-300 text-surface-600 dark:text-surface-300 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Order Quick Context Summary Bar */}
        <div className="px-4 py-2.5 bg-surface-100/70 dark:bg-surface-800/40 border-b border-surface-200/60 dark:border-surface-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-surface-400 font-semibold">Status:</span>
            <span className="font-extrabold text-accent uppercase tracking-wider text-[11px]">
              {order.status}
            </span>
          </div>
          {order.message && (
            <span className="text-[11px] font-medium italic text-surface-400 truncate max-w-[200px]">
              "{order.message}"
            </span>
          )}
        </div>

        {/* Messages Stream Area (Premium Canvas Pattern) */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-0 bg-surface-50/40 dark:bg-surface-900/30 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
          {loading ? (
            <div className="space-y-3 py-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-12 w-2/3 bg-surface-200 dark:bg-surface-800 rounded-2xl animate-pulse ${
                    i % 2 === 0 ? "ml-auto" : ""
                  }`}
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-surface-400">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl shadow-inner">
                💬
              </div>
              <p className="text-xs font-bold text-primary">No Messages Yet</p>
              <p className="text-[11px] leading-relaxed max-w-xs">
                Start the negotiation thread directly with the buyer/vendor below. Messages stream live in real-time.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const senderObj = typeof msg.sender === "object" ? msg.sender : null;
              const senderId = senderObj?.id ?? (typeof msg.sender === "number" ? msg.sender : (typeof msg.sender === "string" ? parseInt(msg.sender, 10) : null));
              const senderName = senderObj?.name || msg.sender_name || (senderId ? `User #${senderId}` : "Participant");
              const senderEmail = senderObj?.email || (msg as any).sender_email;

              const myId = currentUserId || user?.id;
              const myEmail = user?.email;
              const myName = user?.name;

              // Failsafe isMe check
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
                  {/* Sender Name Header */}
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1 ${isMe ? "text-accent text-right" : "text-surface-400 text-left"}`}>
                    {isMe ? "You" : senderName}
                  </span>
                  
                  {/* Dynamic Content Bubble (w-fit ensures compact width for "hi") */}
                  <div
                    className={`w-fit max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed transition-all shadow-xs ${
                      isMe
                        ? "bg-accent text-background font-semibold rounded-tr-xs shadow-sm border border-accent/30"
                        : "bg-surface-card border border-surface-200 dark:border-surface-800 text-primary font-medium rounded-tl-xs shadow-xs"
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
                      <div className={`mt-2 pt-1.5 border-t space-y-1 ${isMe ? "border-background/20" : "border-surface-200 dark:border-surface-700"}`}>
                        {msg.assets.map((asset) => (
                          <a
                            key={asset.id}
                            href={asset.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 text-[11px] font-bold underline transition-opacity hover:opacity-80 ${
                              isMe ? "text-background" : "text-accent"
                            }`}
                          >
                            <span>📎 {asset.title}</span>
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

        {/* Quick Reply Chips */}
        <div className="px-3 py-2 bg-surface-100/50 dark:bg-surface-900/50 border-t border-surface-200/60 dark:border-surface-800 overflow-x-auto flex items-center gap-1.5 shrink-0">
          {QUICK_REPLIES.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => setNewMessage((prev) => (prev ? `${prev} ${reply}` : reply))}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface-card border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-accent shrink-0 cursor-pointer transition-all"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="px-4 py-2 bg-surface-100 dark:bg-surface-800 border-t border-surface-200 flex items-center gap-2 flex-wrap shrink-0">
            {selectedFiles.map((f, i) => (
              <span key={i} className="px-2 py-1 rounded-lg text-[10px] bg-accent/20 text-accent font-bold flex items-center gap-1">
                <span>📎 {f.name}</span>
                <button
                  onClick={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="hover:text-rose-500 ml-1 font-black cursor-pointer"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input & Action Form */}
        <form onSubmit={handleSend} className="p-3 bg-surface-card border-t border-surface-200 dark:border-surface-800 flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                setSelectedFiles(Array.from(e.target.files));
              }
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 text-surface-500 font-bold transition-colors cursor-pointer shrink-0"
            title="Attach file"
          >
            📎
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your quotation or negotiation message..."
            className="flex-1 bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-accent text-primary font-medium"
          />

          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}
            className="px-4 py-2.5 bg-accent text-background font-extrabold rounded-xl text-xs hover:opacity-90 transition-all disabled:opacity-40 shrink-0 cursor-pointer shadow-xs"
          >
            {sending ? "..." : "Send →"}
          </button>
        </form>

      </div>
    </div>
  );
}
