"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Bot, X, Send, Sparkles, AlertCircle, TrendingUp, Hammer, ClipboardCheck } from "lucide-react";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

// A simple hook for a typewriter effect
function useTypewriter(text: string, speed: number = 10) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    if (!text) return;

    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return displayedText;
}

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  isTyping?: boolean;
}

const GLOBAL_CHIPS = [
  { id: "financial_health", label: "Financial Health Check", icon: <TrendingUp size={14} /> },
  { id: "critical_alerts", label: "Critical Safety & Quality Alerts", icon: <AlertCircle size={14} /> },
  { id: "workload_blockers", label: "Workforce Blockers", icon: <Hammer size={14} /> },
];

const PROJECT_CHIPS = [
  { id: "budget_variance", label: "Procurement & Budget", icon: <TrendingUp size={14} /> },
  { id: "task_bottlenecks", label: "Task Bottlenecks", icon: <Hammer size={14} /> },
  { id: "material_shortage", label: "Material Shortage Risk", icon: <AlertCircle size={14} /> },
  { id: "open_issues", label: "Open BIM & Quality Issues", icon: <ClipboardCheck size={14} /> },
  { id: "site_activity", label: "Recent Site Activity", icon: <Sparkles size={14} /> },
];

export function AnalystBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Hello! I am your Project Analyst. Select a query below and I will compile the data for you instantly.",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const params = useParams();
  const projectUid = params.id as string | undefined;

  const chips = projectUid ? PROJECT_CHIPS : GLOBAL_CHIPS;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleChipClick = async (chipId: string, chipLabel: string) => {
    // 1. Add User Message
    const userMsgId = Date.now().toString();
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: chipLabel }]);

    // 2. Add "Typing" Bot Message
    const botMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: botMsgId, role: "bot", content: "", isTyping: true }]);

    // Artificial Latency
    await new Promise((r) => setTimeout(r, 400));

    try {
      // 3. Fetch from API
      let url = `/api/v1/core/analytics-bot/?intent=${chipId}`;
      if (projectUid) url += `&project_uid=${projectUid}`;

      const res = await fetchFromBff<any>(url);
      
      // 4. Update Bot Message with response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, content: res.markdown_response, isTyping: false } : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, content: "⚠️ Sorry, I was unable to fetch that data. Please try again.", isTyping: false }
            : msg
        )
      );
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-accent to-[#FDE047] rounded-full shadow-2xl flex items-center justify-center text-primary-900 transition-transform hover:scale-105 active:scale-95 z-50 ${
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
      >
        <Sparkles size={24} className="animate-pulse" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 w-[400px] h-[600px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] bg-white rounded-2xl shadow-2xl border border-surface-200 flex flex-col z-50 overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-50 opacity-0 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="h-16 bg-gradient-to-r from-surface-900 to-primary flex items-center justify-between px-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Bot size={18} className="text-accent" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">Analyst Assistant</h3>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">
                {projectUid ? "Project Context Active" : "Global Context Active"}
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area (Chips) */}
        <div className="p-4 bg-white border-t border-surface-200 shrink-0">
          <p className="text-[10px] uppercase font-bold text-surface-400 tracking-widest mb-3 px-1">
            Suggested Queries
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => handleChipClick(chip.id, chip.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 hover:bg-primary hover:text-white text-surface-700 text-xs rounded-full transition-colors border border-surface-200 shadow-sm"
              >
                {chip.icon}
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isBot = message.role === "bot";
  // Only apply typewriter to the LAST bot message that just finished loading.
  // For simplicity, we just use the hook. If content updates, it will type.
  const typedContent = useTypewriter(message.content, 15);

  return (
    <div className={`flex w-full ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl p-3 text-sm ${
          isBot
            ? "bg-white border border-surface-200 text-surface-800 shadow-sm rounded-tl-sm"
            : "bg-primary text-white shadow-md rounded-tr-sm"
        }`}
      >
        {message.isTyping ? (
          <div className="flex items-center gap-1 h-5 px-2">
            <div className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        ) : (
          <div 
            className="prose prose-sm prose-p:my-1 prose-h3:text-sm prose-h3:mt-0 prose-h3:mb-2 prose-h3:text-primary prose-ul:my-1 prose-li:my-0"
            dangerouslySetInnerHTML={{ 
              // Very simple markdown parsing for our specific output
              __html: (isBot ? typedContent : message.content)
                .replace(/### (.*?)\n/g, '<h3>$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/- (.*?)\n/g, '<li>$1</li>')
                .replace(/> (.*?)$/gm, '<blockquote className="border-l-2 border-accent pl-2 text-surface-500 text-xs my-2">$1</blockquote>')
                .replace(/\n/g, '<br/>')
                .replace(/<br\/><br\/>/g, '<br/>')
                .replace(/(<li>[\s\S]*<\/li>)/g, '<ul className="pl-4 list-disc marker:text-surface-300">$1</ul>')
            }} 
          />
        )}
      </div>
    </div>
  );
}
