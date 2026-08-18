"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  fetchMyOrders, 
  fetchVendorOrders, 
  type ProductOrder, 
  type OrderStatus 
} from "@/domains/showroom/api";
import { communicationsApi, type Message } from "@/domains/communications/api";
import { useChatWebSocket } from "@/shared/hooks/useChatWebSocket";
import { useNotificationCenter } from "@/shared/hooks/useNotificationCenter";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { QuotationBuilderModal } from "@/components/showroom/QuotationBuilderModal";
import { QuotationCard } from "@/components/showroom/QuotationCard";

const STATUS_BADGES: Record<OrderStatus, { label: string; style: string; icon: string }> = {
  PENDING: { label: "Pending", style: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: "⏳" },
  ACCEPTED: { label: "Accepted", style: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: "✅" },
  DECLINED: { label: "Declined", style: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30", icon: "❌" },
  FULFILLED: { label: "Fulfilled", style: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30", icon: "📦" },
  CANCELLED: { label: "Cancelled", style: "bg-surface-200 dark:bg-surface-800 text-surface-500 border-surface-300 dark:border-surface-700", icon: "🚫" },
};

export function ShowroomChatsPageOriginal() {
  const pathname = usePathname();
  const { user, fetchCurrentUser } = useAuthStore();
  const { allNotifications, markThreadNotificationsAsRead } = useNotificationCenter();
  const basePath = pathname.startsWith("/dashboard/showroom") ? "/dashboard/showroom" : "/showroom";

  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");

  // Ensure current logged-in user profile is fetched
  useEffect(() => {
    if (!user) {
      fetchCurrentUser().catch(() => {});
    }
  }, [user, fetchCurrentUser]);

  // Per-thread cached messages map
  const [messagesMap, setMessagesMap] = useState<Record<number, Message[]>>({});

  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [searchThread, setSearchThread] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load unread counts per thread from backend DB
  const loadUnreadCounts = useCallback(async () => {
    try {
      const res = await communicationsApi.getUnreadCounts();
      if (res && res.showroom_orders) {
        const counts: Record<number, number> = {};
        Object.entries(res.showroom_orders).forEach(([k, v]) => {
          counts[Number(k)] = v;
        });
        setUnreadMap(counts);
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts]);

  // Sync real-time unread count indicators from live notification stream
  useEffect(() => {
    if (!allNotifications || allNotifications.length === 0) return;
    const countsFromNotifs: Record<number, number> = {};
    allNotifications.forEach((n: any) => {
      if (!n.is_read && n.notification_type === "CHAT" && n.metadata) {
        const orderId = n.metadata.showroom_order || n.metadata.order_id;
        if (orderId) {
          countsFromNotifs[Number(orderId)] = (countsFromNotifs[Number(orderId)] || 0) + 1;
        }
      }
    });
    setUnreadMap((prev) => {
      const merged = { ...prev, ...countsFromNotifs };
      if (selectedOrder?.id) {
        merged[selectedOrder.id] = 0;
      }
      return merged;
    });
  }, [allNotifications, selectedOrder?.id]);

  // Mark selected thread as read in DB and clear its unread badge
  const markOrderAsRead = useCallback(async (orderId: number) => {
    try {
      await communicationsApi.markShowroomOrderAsRead(orderId);
      markThreadNotificationsAsRead(orderId);
      setUnreadMap((prev) => ({ ...prev, [orderId]: 0 }));
    } catch {
      // Fallback
    }
  }, [markThreadNotificationsAsRead]);

  // 1. Fetch Orders Thread List
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const [buyer, vendor] = await Promise.all([
        fetchMyOrders().catch(() => []),
        fetchVendorOrders().catch(() => [])
      ]);
      
      const map = new Map<number, ProductOrder>();
      (buyer || []).forEach((o) => map.set(o.id, o));
      (vendor || []).forEach((o) => map.set(o.id, o));
      
      const allList = Array.from(map.values()).sort((a, b) => b.id - a.id);
      setOrders(allList);

      setSelectedOrder((prev) => prev || (allList.length > 0 ? allList[0] : null));
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // 2. Fetch Messages Quietly in Background for Selected Thread
  const fetchThreadMessages = useCallback(async (orderId: number) => {
    try {
      const thread = await communicationsApi.getShowroomOrderThread(orderId);
      setMessagesMap((prev) => ({ ...prev, [orderId]: thread || [] }));
    } catch {
      setMessagesMap((prev) => ({ ...prev, [orderId]: prev[orderId] || [] }));
    }
  }, []);

  useEffect(() => {
    if (selectedOrder?.id) {
      fetchThreadMessages(selectedOrder.id);
      markOrderAsRead(selectedOrder.id);
    }
  }, [selectedOrder?.id, fetchThreadMessages, markOrderAsRead]);

  const activeMessages = selectedOrder ? (messagesMap[selectedOrder.id] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, selectedOrder]);

  // 3. WebSocket Real-Time Stream
  const handleWsMessage = useCallback((msg: Message) => {
    if (!selectedOrder) return;
    const targetOrderId = selectedOrder.id;

    setMessagesMap((prev) => {
      const existing = prev[targetOrderId] || [];
      if (existing.some((m) => m.id === msg.id)) return prev;
      return {
        ...prev,
        [targetOrderId]: [...existing, msg],
      };
    });
    markOrderAsRead(targetOrderId);
  }, [selectedOrder?.id, markOrderAsRead]);

  useChatWebSocket(
    "showroom_order",
    selectedOrder ? selectedOrder.id : null,
    handleWsMessage
  );

  // Send Message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedOrder || (!newMessage.trim() && selectedFiles.length === 0)) return;

    const targetOrderId = selectedOrder.id;
    setSending(true);
    try {
      const buyerId = typeof selectedOrder.buyer === "number" ? selectedOrder.buyer : (selectedOrder.buyer as any)?.id;
      const isBuyer = user?.id && buyerId ? Number(user.id) === Number(buyerId) : false;
      const recipientId = isBuyer ? (selectedOrder as any).product_vendor_id : buyerId;

      const sent = await communicationsApi.sendMessage({
        showroom_order: targetOrderId,
        ...(recipientId ? { recipient: recipientId } : {}),
        subject: `Showroom Order #${targetOrderId} Chat`,
        body: newMessage,
        files: selectedFiles,
      });

      if (sent && sent.id) {
        setMessagesMap((prev) => {
          const existing = prev[targetOrderId] || [];
          if (existing.some((m) => m.id === sent.id)) return prev;
          return {
            ...prev,
            [targetOrderId]: [...existing, sent],
          };
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

  const filteredThreads = orders.filter((o) => {
    const q = searchThread.toLowerCase().trim();
    const matchesSearch = (
      !q ||
      o.id.toString().includes(q) ||
      o.product_name.toLowerCase().includes(q) ||
      o.buyer_name.toLowerCase().includes(q)
    );

    if (filterTab === "unread") {
      return matchesSearch && (unreadMap[o.id] || 0) > 0;
    }
    return matchesSearch;
  });

  const totalUnreadBadgeCount = Object.values(unreadMap).reduce((acc, curr) => acc + curr, 0);

  const QUICK_REPLIES = [
    "✅ Quotation approved! Item is available in stock.",
    "📦 Preparing sample dispatch with tracking info.",
    "📐 Please upload architectural dimension drawings.",
    "🚚 Delivery will take 3-5 business days.",
  ];

  const formatMessageDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
  };

  const [quotationModalOpen, setQuotationModalOpen] = useState(false);

  const buyerId = selectedOrder ? (typeof selectedOrder.buyer === "number" ? selectedOrder.buyer : (selectedOrder.buyer as any)?.id) : null;
  const isVendor = Boolean(user?.id && buyerId && Number(user.id) !== Number(buyerId));
  const isBuyer = Boolean(user?.id && buyerId && Number(user.id) === Number(buyerId));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background p-0 m-0 max-w-none rounded-none border-0 select-none">
      
      {/* Quotation Builder Modal */}
      <QuotationBuilderModal
        isOpen={quotationModalOpen}
        onClose={() => setQuotationModalOpen(false)}
        order={selectedOrder}
        onSuccess={() => selectedOrder?.id && fetchThreadMessages(selectedOrder.id)}
      />

      {/* Sleek Top Header Bar */}
      <div className="px-4 py-2 bg-surface-card/90 dark:bg-surface-900/90 backdrop-blur-xl border-b border-surface-200/80 dark:border-surface-800 flex items-center justify-between gap-3 shrink-0 h-13 shadow-xs z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-accent/30 to-accent/10 text-accent border border-accent/20 flex items-center justify-center text-xs font-black shrink-0 shadow-inner">
            💬
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs font-black text-primary tracking-tight truncate">
              Showroom Real-Time Negotiations
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-accent/15 text-accent border border-accent/30 shrink-0">
              {orders.length} Threads
            </span>
            {totalUnreadBadgeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs animate-pulse shrink-0">
                ● {totalUnreadBadgeCount} Unread Total
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadOrders()}
            className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 text-surface-500 font-bold transition-all text-xs cursor-pointer"
            title="Refresh threads"
          >
            🔄
          </button>
          <Link
            href={`${basePath}/orders`}
            className="px-3 py-1 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 text-primary font-black rounded-xl text-[11px] transition-all shrink-0 border border-surface-200/60 dark:border-surface-700 shadow-2xs flex items-center gap-1.5"
          >
            <span>Orders Table</span>
            <span className="text-[10px]">→</span>
          </Link>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 w-full">
        
        {/* ── LEFT PANE: Scrollable Threads Contact List ────────────────── */}
        <div className="w-full md:w-80 lg:w-96 border-r border-surface-200 dark:border-surface-800 flex flex-col shrink-0 bg-surface-50/60 dark:bg-surface-900/40 overflow-hidden">
          
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-surface-200/80 dark:border-surface-800 shrink-0 bg-surface-card space-y-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-surface-400 text-xs">🔍</span>
              <input
                type="text"
                value={searchThread}
                onChange={(e) => setSearchThread(e.target.value)}
                placeholder="Search by order #, product, or buyer..."
                className="w-full pl-8 pr-7 py-1.5 bg-surface-100/80 dark:bg-surface-900 border border-surface-200 dark:border-surface-700/80 rounded-xl text-xs outline-none focus:border-accent text-primary font-medium transition-all"
              />
              {searchThread && (
                <button
                  onClick={() => setSearchThread("")}
                  className="absolute inset-y-0 right-2.5 flex items-center text-surface-400 hover:text-surface-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-surface-100/70 dark:bg-surface-900/60 p-0.5 rounded-xl border border-surface-200/60 dark:border-surface-800">
              <button
                onClick={() => setFilterTab("all")}
                className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all ${
                  filterTab === "all"
                    ? "bg-surface-card text-primary shadow-2xs border border-surface-200/80 dark:border-surface-700"
                    : "text-surface-400 hover:text-primary"
                }`}
              >
                All Threads ({orders.length})
              </button>
              <button
                onClick={() => setFilterTab("unread")}
                className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1 ${
                  filterTab === "unread"
                    ? "bg-surface-card text-primary shadow-2xs border border-surface-200/80 dark:border-surface-700"
                    : "text-surface-400 hover:text-primary"
                }`}
              >
                <span>Unread</span>
                {totalUnreadBadgeCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[8px] bg-rose-500 text-white rounded-full font-black">
                    {totalUnreadBadgeCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Scrollable Threads List */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-surface-200/50 dark:divide-surface-800/50">
            {loadingOrders ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3.5 space-y-2 animate-pulse">
                  <div className="h-4 w-3/4 bg-surface-200 dark:bg-surface-800 rounded" />
                  <div className="h-3 w-1/2 bg-surface-200 dark:bg-surface-800 rounded" />
                </div>
              ))
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-surface-400 space-y-2">
                <span className="text-3xl block">💬</span>
                <p className="text-xs font-bold text-primary">No Threads Found</p>
                <p className="text-[11px]">
                  {filterTab === "unread" ? "You have no unread messages." : "When orders are placed, chat threads will appear here."}
                </p>
              </div>
            ) : (
              filteredThreads.map((order) => {
                const badge = STATUS_BADGES[order.status] || STATUS_BADGES.PENDING;
                const isSelected = selectedOrder?.id === order.id;
                const unreadCount = unreadMap[order.id] || 0;

                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      if (selectedOrder?.id !== order.id) {
                        setSelectedOrder(order);
                        setNewMessage("");
                        setSelectedFiles([]);
                      }
                    }}
                    className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative group ${
                      isSelected
                        ? "bg-accent/15 dark:bg-accent/20 border-l-4 border-l-accent shadow-inner"
                        : unreadCount > 0
                        ? "bg-accent/5 dark:bg-accent/10 hover:bg-accent/10"
                        : "hover:bg-surface-100/60 dark:hover:bg-surface-800/40"
                    }`}
                  >
                    {/* Cover Thumbnail Container */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-800 overflow-hidden shadow-2xs">
                        {order.product_cover ? (
                          <img src={order.product_cover} alt={order.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-surface-400 font-bold">🏛️</div>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-background animate-pulse z-10" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10px] font-black text-surface-400">#{order.id}</span>
                        <div className="flex items-center gap-1.5">
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-2xs animate-pulse flex items-center gap-1">
                              <span>●</span>
                              <span>{unreadCount} UNREAD</span>
                            </span>
                          )}
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase border ${badge.style}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                      <h4 className={`text-xs truncate leading-snug transition-colors ${unreadCount > 0 ? "font-black text-primary" : "font-bold text-primary/90 group-hover:text-accent"}`}>
                        {order.product_name}
                      </h4>
                      <p className="text-[11px] font-medium text-surface-400 truncate">
                        Buyer: {order.buyer_name} · Qty: {order.quantity}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: Stable Chat Workspace ──── */}
        {selectedOrder ? (
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-surface-card">
            
            {/* Thread Header Bar */}
            <div className="p-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/60 flex items-center justify-between gap-3 shrink-0 h-14 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-800 overflow-hidden shrink-0 shadow-2xs">
                  {selectedOrder.product_cover ? (
                    <img src={selectedOrder.product_cover} alt={selectedOrder.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-surface-400 font-bold">🏛️</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-primary truncate">
                      {selectedOrder.product_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Stream</span>
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-surface-400 truncate">
                    Order #{selectedOrder.id} · Buyer: {selectedOrder.buyer_name} · Qty: {selectedOrder.quantity}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setQuotationModalOpen(true)}
                  className="px-3 py-1 bg-accent text-background hover:opacity-95 font-black text-[11px] rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                  title="Issue structured proforma quotation offer"
                >
                  <span>📄 Offer Quotation</span>
                </button>

                <Link
                  href={`${basePath}/${selectedOrder.product_slug}`}
                  className="px-3 py-1 bg-surface-card hover:bg-surface-100 text-primary font-extrabold text-[11px] rounded-xl border border-surface-200 dark:border-surface-700 transition-colors shrink-0 hidden sm:block shadow-2xs"
                >
                  Catalog Specs →
                </Link>
              </div>
            </div>

            {/* Scrollable Messages Canvas */}
            <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-3.5 bg-surface-50/40 dark:bg-surface-900/30 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-surface-400">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl shadow-inner">
                    💬
                  </div>
                  <p className="text-xs font-bold text-primary">No Messages Yet</p>
                  <p className="text-[11px] leading-relaxed max-w-xs">
                    Start the quotation negotiation thread with the buyer/vendor below. Messages stream in real-time.
                  </p>
                </div>
              ) : (
                activeMessages.map((msg, index) => {
                  const senderObj = typeof msg.sender === "object" ? msg.sender : null;
                  const senderId = senderObj?.id ?? (typeof msg.sender === "number" ? msg.sender : (typeof msg.sender === "string" ? parseInt(msg.sender, 10) : null));
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

                  // Date Grouping Header logic
                  const currentDateLabel = formatMessageDate(msg.created_at);
                  const prevDateLabel = index > 0 ? formatMessageDate(activeMessages[index - 1].created_at) : null;
                  const showDateHeader = index === 0 || currentDateLabel !== prevDateLabel;

                  // Extract Quotation metadata if present
                  const msgMetadata = (msg as any).metadata;
                  const quotationData = msgMetadata?.quotation || (selectedOrder as any)?.metadata?.quotation;
                  const isQuotationMsg = Boolean(msgMetadata?.type === "QUOTATION" || msgMetadata?.type === "QUOTATION_ACCEPTED" || msgMetadata?.quotation);

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateHeader && (
                        <div className="flex items-center justify-center my-3">
                          <span className="px-3 py-0.5 rounded-full text-[9px] font-black bg-surface-200/80 dark:bg-surface-800/80 text-surface-500 uppercase tracking-widest border border-surface-300/40 dark:border-surface-700/40">
                            {currentDateLabel}
                          </span>
                        </div>
                      )}

                      <div className={`flex flex-col ${isMe ? "items-end ml-auto" : "items-start mr-auto"} space-y-0.5 group`}>
                        {/* Sender Name */}
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1 ${isMe ? "text-accent text-right" : "text-surface-400 text-left"}`}>
                          {isMe ? "You" : senderName}
                        </span>

                        {/* Content Bubble */}
                        <div
                          className={`w-fit max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed transition-all shadow-2xs ${
                            isMe
                              ? "bg-gradient-to-br from-accent to-accent/90 text-background font-semibold rounded-tr-xs shadow-xs border border-accent/30"
                              : "bg-surface-card border border-surface-200 dark:border-surface-800 text-primary font-medium rounded-tl-xs shadow-2xs"
                          }`}
                        >
                          <div className="flex flex-wrap items-end justify-between gap-3">
                            <span className="whitespace-pre-wrap break-words">{msg.body}</span>
                            <span className={`text-[9px] font-bold select-none shrink-0 self-end ml-auto ${isMe ? "opacity-90" : "text-surface-400"}`}>
                              {formattedTime} {isMe && (msg.is_read ? " · ✓✓ Seen" : " · ✓ Sent")}
                            </span>
                          </div>

                          {/* Render Embedded Quotation Card if message is a quotation offer */}
                          {isQuotationMsg && quotationData && (
                            <div className="mt-2 pt-2 border-t border-background/20 dark:border-surface-700">
                              <QuotationCard
                                quotation={quotationData}
                                orderId={selectedOrder.id}
                                isBuyer={isBuyer}
                                onAccepted={() => fetchThreadMessages(selectedOrder.id)}
                              />
                            </div>
                          )}

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
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Controls & Form */}
            <div className="shrink-0 border-t border-surface-200 dark:border-surface-800 bg-surface-card">
              {/* Quick Reply Chips */}
              <div className="px-3 py-1.5 bg-surface-100/50 dark:bg-surface-900/40 border-b border-surface-200/50 dark:border-surface-800 overflow-x-auto flex items-center gap-1.5">
                {QUICK_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => setNewMessage((prev) => (prev ? `${prev} ${reply}` : reply))}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface-card border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-accent hover:text-accent shrink-0 cursor-pointer transition-all shadow-2xs"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Selected Files Bar */}
              {selectedFiles.length > 0 && (
                <div className="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 flex items-center gap-2 flex-wrap">
                  {selectedFiles.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg text-[10px] bg-accent/20 text-accent font-bold flex items-center gap-1 border border-accent/30">
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

              {/* Input Form */}
              <form onSubmit={handleSend} className="p-3 flex items-center gap-2">
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
                  className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 text-surface-500 font-bold transition-colors cursor-pointer shrink-0 border border-surface-200/50 dark:border-surface-700"
                  title="Attach file"
                >
                  📎
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your quotation negotiation message..."
                  className="flex-1 bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-accent text-primary font-medium transition-all"
                />

                <button
                  type="submit"
                  disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}
                  className="px-4 py-2 bg-accent text-background font-black rounded-xl text-xs hover:opacity-95 transition-all disabled:opacity-40 shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {sending ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-background border-t-transparent animate-spin" />
                  ) : (
                    <span>Send →</span>
                  )}
                </button>
              </form>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-surface-400">
            <p className="text-xs font-bold">Select a thread on the left to start chatting</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ShowroomChatsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="w-20 h-20 bg-accent/20 text-accent rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner border border-accent/30">
        🚧
      </div>
      <h1 className="text-4xl font-black text-primary tracking-tight mb-4">Showroom Chats</h1>
      <p className="text-surface-500 font-medium max-w-md mb-8">
        We are actively building out this section of the architectural products marketplace. Check back soon for updates!
      </p>
      <div className="px-6 py-2 bg-surface-card border border-surface-200 rounded-full shadow-sm text-sm font-bold text-accent uppercase tracking-widest">
        Coming Soon
      </div>
    </div>
  );
}
