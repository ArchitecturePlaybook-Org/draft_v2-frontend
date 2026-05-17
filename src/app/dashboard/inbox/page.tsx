"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { communicationsApi, Message, ConversationSummary } from "@/domains/communications/api";
import { useAuthStore } from "@/store/auth-store";

export default function MessengerPage() {
  const { user: currentUser } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeThread, setActiveThread] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations list
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
      setIsLoading(false);
    }
  };

  // Load specific thread
  const loadThread = async (otherUserId: number) => {
    setIsThreadLoading(true);
    try {
      const data = await communicationsApi.getThread(otherUserId);
      setActiveThread(data);
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;

    try {
      await communicationsApi.sendMessage({
        recipient: selectedUserId,
        body: newMessage,
        subject: "Chat Message", // Default subject for chat
      });
      setNewMessage("");
      loadThread(selectedUserId); // Refresh thread
      loadConversations(); // Refresh list
    } catch (err) {
      alert("Failed to send message.");
    }
  };

  const selectedConversation = conversations.find(c => c.user_id === selectedUserId);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-primary mb-2 tracking-tight">Messenger</h1>
          <p className="text-surface-600 leading-relaxed text-sm">
            Real-time collaboration and project coordination channel.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-4 py-2 rounded-full border border-accent/10">
          <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          Live Connection Active
        </div>
      </div>

      <div className="flex-1 bg-white border border-surface-200 rounded-[2rem] flex overflow-hidden shadow-2xl shadow-primary/5">
        {/* Sidebar: Conversations */}
        <div className="w-80 border-r border-surface-100 flex flex-col bg-surface-50/30">
          <div className="p-6 border-b border-surface-100">
            <input 
              type="text" 
              placeholder="Filter chats..." 
              className="w-full bg-white border border-surface-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-accent transition-all"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner size="sm" /></div>
            ) : conversations.length > 0 ? (
              conversations.map((conv) => (
                <div 
                  key={conv.user_id} 
                  onClick={() => setSelectedUserId(conv.user_id)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all flex gap-3 items-center group ${
                    selectedUserId === conv.user_id 
                    ? "bg-white shadow-lg shadow-primary/5 border border-surface-100" 
                    : "hover:bg-white/60"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 transition-all ${
                    selectedUserId === conv.user_id ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-primary/10 text-primary"
                  }`}>
                    {conv.user_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="text-sm font-bold text-primary truncate group-hover:text-accent transition-colors">
                        {conv.user_name}
                      </h4>
                      <span className="text-[9px] text-surface-400 font-bold uppercase tracking-tighter shrink-0">
                        {new Date(conv.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-surface-500 truncate leading-tight">
                      {conv.last_message}
                    </p>
                  </div>
                  {!conv.is_read && (
                    <div className="w-2 h-2 bg-accent rounded-full shrink-0 shadow-sm shadow-accent/40" />
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-20 px-6">
                <p className="text-xs text-surface-400 font-medium">No conversations found. Inquiries will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>

        {/* Main: Chat View */}
        <div className="flex-1 flex flex-col bg-white relative">
          {selectedUserId ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-surface-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-sm font-bold text-primary">
                    {selectedConversation?.user_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-primary">
                      {selectedConversation?.user_name}
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Active Partner</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="w-10 h-10 p-0 rounded-xl">📞</Button>
                  <Button variant="outline" className="w-10 h-10 p-0 rounded-xl">⚙️</Button>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 p-8 overflow-y-auto flex flex-col gap-6 bg-surface-50/30 scroll-smooth"
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
                      <div className={`max-w-[70%] p-5 rounded-3xl text-sm shadow-sm transition-all hover:shadow-md ${
                        isMine 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-white text-surface-700 border border-surface-100 rounded-tl-none"
                      }`}>
                        {msg.body}
                      </div>
                      <span className="text-[9px] font-bold text-surface-400 mt-2 uppercase tracking-widest px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="p-6 border-t border-surface-100 bg-white">
                <form onSubmit={handleSendMessage} className="flex gap-4 items-end">
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
                      className="w-full bg-surface-50 border border-surface-200 rounded-2xl p-5 pr-14 text-sm outline-none focus:border-accent resize-none min-h-[60px] max-h-[150px] transition-all"
                    />
                    <button 
                      type="button"
                      className="absolute right-4 bottom-4 w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-sm hover:bg-surface-200 transition-all"
                    >
                      📎
                    </button>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="w-14 h-14 p-0 rounded-2xl flex items-center justify-center text-lg bg-accent hover:bg-primary transition-all shadow-lg shadow-accent/20"
                  >
                    🚀
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 gap-6 opacity-40">
              <div className="text-8xl">💬</div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-primary">No Conversation Selected</h3>
                <p className="text-sm text-surface-500 max-w-xs mx-auto">Select a partner from the sidebar to initialize the communication channel.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
