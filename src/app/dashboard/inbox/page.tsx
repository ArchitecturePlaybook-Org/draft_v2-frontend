"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { communicationsApi, Message } from "@/domains/communications/api";

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await communicationsApi.listInbox();
        const paginatedData = data as { results?: Message[] } | Message[];
        const items = Array.isArray(paginatedData) ? paginatedData : paginatedData?.results || [];
        setMessages(items);
        if (items.length > 0) {
          setActiveMessageId(items[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const activeMessage = messages.find(m => m.id === activeMessageId);


  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-extrabold text-primary mb-2 tracking-tight">Inbox</h1>
        <p className="text-surface-600 leading-relaxed">
          Communications from contractors, clients, and your architectural team.
        </p>
      </div>

      <div className="flex-1 bg-white border border-surface-200 rounded-2xl flex overflow-hidden shadow-sm">
        {/* Message List */}
        <div className="w-1/3 border-r border-surface-200 flex flex-col bg-surface-50">
          <div className="p-4 border-b border-surface-200 flex gap-2">
            <input 
              type="text" 
              placeholder="Search messages..." 
              className="w-full bg-white border border-surface-200 rounded px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                onClick={() => setActiveMessageId(msg.id)}
                className={`p-4 border-b border-surface-200 cursor-pointer transition-colors ${
                  activeMessageId === msg.id ? "bg-white border-l-4 border-l-primary" : "hover:bg-surface-100"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm ${!msg.is_read ? "font-bold text-primary" : "font-medium text-surface-600"}`}>
                    {msg.sender}
                  </h4>
                  <span className="text-[10px] text-surface-400 font-medium">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-surface-200 text-surface-600 px-1.5 py-0.5 rounded">
                    {msg.role || "Automated"}
                  </span>
                </div>
                <p className={`text-xs truncate ${!msg.is_read ? "text-primary font-bold" : "text-surface-500"}`}>
                  {msg.subject}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Message Detail View */}
        <div className="w-2/3 flex flex-col bg-white">
          <div className="p-6 border-b border-surface-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-primary mb-1">
                {activeMessage?.subject || "Select a message"}
              </h2>
              <p className="text-xs text-surface-600 font-medium">
                From: <span className="font-bold text-primary">{activeMessage?.sender}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="text-xs px-3 h-8">Reply</Button>
              <Button variant="ghost" className="text-xs px-3 h-8 text-red-500">Archive</Button>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-y-auto">
            {/* Dummy Content */}
            <div className="prose prose-sm max-w-none text-surface-600">
              <p>{activeMessage?.body}</p>
              <br />
              <p>Best regards,<br/><strong>{activeMessage?.sender}</strong></p>
            </div>
            <div className="mt-12 p-4 bg-surface-50 border border-surface-200 rounded-lg">
              <p className="text-xs font-bold text-primary mb-2">Attachments (1)</p>
              <div className="flex items-center gap-3 p-3 bg-white border border-surface-200 rounded cursor-pointer hover:border-accent transition-colors">
                <span className="text-xl">📄</span>
                <div>
                  <p className="text-xs font-bold text-primary">SectorA_Kitchen_Specs.pdf</p>
                  <p className="text-[10px] text-surface-400">2.4 MB</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-surface-200 bg-surface-50">
            <textarea 
              className="w-full bg-white border border-surface-200 rounded p-3 text-sm outline-none focus:border-accent resize-none h-24"
              placeholder="Write a reply..."
            ></textarea>
            <div className="flex justify-end mt-2">
              <Button>Send Message</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
