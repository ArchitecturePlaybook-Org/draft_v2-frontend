import React, { useState, useEffect, useRef, useCallback } from "react";
import { Task, TaskComment } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { 
  Send, 
  Mic, 
  Globe, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  RefreshCw, 
} from "lucide-react";
import { INDIAN_LANGUAGES, getLanguageByCode, LanguageOption } from "@/lib/i18n/languages";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

function formatTimeAgo(dateString: string) {
  try {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diffInMilliseconds = new Date(dateString).getTime() - new Date().getTime();
    const diffInDays = Math.round(diffInMilliseconds / (1000 * 60 * 60 * 24));
    if (Math.abs(diffInDays) > 0) return rtf.format(diffInDays, 'day');
    const diffInHours = Math.round(diffInMilliseconds / (1000 * 60 * 60));
    if (Math.abs(diffInHours) > 0) return rtf.format(diffInHours, 'hour');
    const diffInMinutes = Math.round(diffInMilliseconds / (1000 * 60));
    if (Math.abs(diffInMinutes) > 0) return rtf.format(diffInMinutes, 'minute');
    return 'just now';
  } catch {
    return 'recently';
  }
}

interface TaskCommunicationPanelProps {
  task: Task;
  onCommentAdded?: () => void;
  readOnly?: boolean;
}

export const TaskCommunicationPanel: React.FC<TaskCommunicationPanelProps> = ({ 
  task, 
  onCommentAdded, 
  readOnly = false 
}) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(INDIAN_LANGUAGES[0]);
  // Map of commentId -> Record<langCode, string>
  const [translationsCache, setTranslationsCache] = useState<Record<number, Record<string, string>>>({});
  const [isDictating, setIsDictating] = useState(false);
  const [speakingCommentId, setSpeakingCommentId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live Speech Dictation for Textarea
  const {
    startListening,
    stopListening,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition({
    lang: selectedLang.locale,
    onResult: (spokenText) => {
      setNewComment(prev => {
        const base = prev.trim();
        return base ? `${base} ${spokenText}` : spokenText;
      });
    },
  });

  const fetchComments = async () => {
    try {
      const data = await projectsApi.getTaskComments(task.uid);
      setComments(data);
    } catch (err) {
      console.error("Failed to load comments", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [task.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Clean up text-to-speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-To-Speech (Speaker / Read Aloud) handler
  const handleSpeakText = (commentId: number, textToSpeak: string, langLocale: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Text-to-speech is not supported on this browser.");
      return;
    }

    if (speakingCommentId === commentId) {
      window.speechSynthesis.cancel();
      setSpeakingCommentId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langLocale;
    utterance.rate = 0.95; // Natural spoken speed

    // Pick best matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = langLocale.split("-")[0];
    const matchedVoice = voices.find(v => v.lang === langLocale || v.lang.startsWith(langPrefix));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setSpeakingCommentId(commentId);
    };

    utterance.onend = () => {
      setSpeakingCommentId(null);
    };

    utterance.onerror = () => {
      setSpeakingCommentId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Auto-translate all comments when selected language changes
  const autoTranslateComments = useCallback(async (targetLangCode: string, commentsList: TaskComment[]) => {
    if (!commentsList || commentsList.length === 0) return;

    // Filter comments that need translation
    const needsTranslation = commentsList.filter(comment => {
      if (!comment.content || !comment.content.trim()) return false;

      // Check if already in local cache
      const cached = translationsCache[comment.id]?.[targetLangCode];
      if (cached) return false;

      // Check if backend cached
      const backendCached = comment.translations?.[targetLangCode];
      if (backendCached && backendCached.trim()) {
        return false;
      }

      return true;
    });

    if (needsTranslation.length === 0) return;

    setIsTranslatingAll(true);
    try {
      await Promise.all(
        needsTranslation.map(async (comment) => {
          try {
            const res = await projectsApi.translateTaskComment(comment.id, targetLangCode);
            if (res && res.translated_text) {
              setTranslationsCache(prev => ({
                ...prev,
                [comment.id]: {
                  ...(prev[comment.id] || {}),
                  [targetLangCode]: res.translated_text
                }
              }));
            }
          } catch (err) {
            console.warn(`Translation error for comment ${comment.id}:`, err);
          }
        })
      );
    } finally {
      setIsTranslatingAll(false);
    }
  }, [translationsCache]);

  useEffect(() => {
    if (comments.length > 0) {
      autoTranslateComments(selectedLang.code, comments);
    }
  }, [selectedLang.code, comments]);

  // Handle standard text comment submit (Stored in canonical English on backend)
  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim() || isSubmitting || readOnly) return;

    if (isDictating) {
      stopListening();
      setIsDictating(false);
    }

    setIsSubmitting(true);
    try {
      await projectsApi.createTaskComment(task.uid, newComment.trim(), selectedLang.code);
      setNewComment("");
      await fetchComments();
      if (onCommentAdded) onCommentAdded();
      toast.success("Message posted.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDictation = () => {
    if (!isSpeechSupported) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    if (isDictating) {
      stopListening();
      setIsDictating(false);
    } else {
      setIsDictating(true);
      startListening(selectedLang.locale);
      toast.info(`Dictation active in ${selectedLang.nativeName}. Speak into microphone...`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-900/95 rounded-2xl border border-surface-200/90 dark:border-surface-800 overflow-hidden shadow-sm transition-colors">
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="px-3.5 py-3 border-b border-surface-200/80 dark:border-surface-800/90 bg-surface-100/90 dark:bg-surface-850/90 backdrop-blur-md shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <h4 className="text-[11px] font-black text-foreground dark:text-white uppercase tracking-wider truncate">
            Communication & Audit
          </h4>
          {isTranslatingAll && (
            <span title="Translating messages..." className="inline-flex items-center">
              <RefreshCw className="w-3 h-3 text-accent animate-spin shrink-0" />
            </span>
          )}
        </div>

        {/* Regional Language Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Globe className="w-3.5 h-3.5 text-accent" />
          <select
            value={selectedLang.code}
            onChange={(e) => setSelectedLang(getLanguageByCode(e.target.value))}
            className="h-6.5 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-lg px-2 text-[10px] font-black text-foreground dark:text-surface-100 outline-none focus:border-accent appearance-none cursor-pointer hover:border-accent transition-colors shadow-2xs"
            title="Select language — automatically translates all messages in thread"
          >
            {INDIAN_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code} className="bg-surface-100 dark:bg-surface-900 text-foreground">
                {lang.flagEmoji} {lang.nativeName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── MESSAGES LIST ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-0 bg-surface-50/50 dark:bg-surface-950/40">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-surface-400 dark:text-surface-500">
            <RefreshCw className="w-5 h-5 animate-spin text-accent" />
            <p className="text-xs font-bold">Loading communications...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-surface-200/60 dark:bg-surface-800/80 flex items-center justify-center text-surface-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground dark:text-surface-200">No messages yet</p>
            <p className="text-[10px] text-surface-400 max-w-[220px]">
              Post directives, updates, or click mic to dictate in your language.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const authorName = comment.user?.name || comment.user?.email?.split("@")[0] || "Team Member";
            const authorRole = (comment.user as any)?.role || "COLLABORATOR";
            
            // Get content in the chosen language (auto translated or original)
            const targetLang = selectedLang.code;
            let displayText = comment.content;
            if (translationsCache[comment.id]?.[targetLang]) {
              displayText = translationsCache[comment.id][targetLang];
            } else if (comment.translations && comment.translations[targetLang]) {
              displayText = comment.translations[targetLang];
            }

            const isSpeaking = speakingCommentId === comment.id;

            return (
              <div 
                key={comment.id} 
                className={`p-3 rounded-xl border transition-all duration-200 shadow-2xs group bg-surface-100/90 dark:bg-surface-900 border-surface-200/80 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 ${
                  isSpeaking ? "ring-2 ring-accent/60 bg-accent/5" : ""
                }`}
              >
                {/* Author Info, Speaker Button & Timestamp */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* User Avatar Circle */}
                    <div className="w-5.5 h-5.5 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center text-[9px] font-black uppercase shrink-0">
                      {authorName.charAt(0)}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-foreground dark:text-white truncate">
                        {authorName}
                      </span>
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-surface-200 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-300 dark:border-surface-700 shrink-0">
                        {authorRole}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* SPEAKER / READ ALOUD BUTTON */}
                    {displayText && (
                      <button
                        type="button"
                        onClick={() => handleSpeakText(comment.id, displayText, selectedLang.locale)}
                        className={`h-6 px-1.5 rounded-md text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isSpeaking
                            ? "bg-accent text-background shadow-xs font-black animate-pulse"
                            : "text-surface-400 hover:text-accent hover:bg-surface-200/80 dark:hover:bg-surface-800"
                        }`}
                        title={isSpeaking ? "Stop speaking" : "Listen / Read message aloud in this language"}
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="w-3 h-3 text-current" />
                            <span className="text-[8px] uppercase">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-current" />
                            <span className="text-[8px] uppercase hidden sm:inline">Listen</span>
                          </>
                        )}
                      </button>
                    )}

                    <span className="text-[9px] text-surface-400 dark:text-surface-500 font-bold tabular-nums">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>
                </div>

                {/* Text Content */}
                {displayText && (
                  <div className="text-xs text-foreground dark:text-surface-100 leading-relaxed font-medium">
                    <p className="whitespace-pre-wrap">{displayText}</p>
                  </div>
                )}
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT AREA ─────────────────────────────────────────────────────── */}
      {!readOnly ? (
        <div className="p-3 border-t border-surface-200/80 dark:border-surface-800 bg-surface-100/90 dark:bg-surface-850/90 backdrop-blur-md shrink-0">
          <form onSubmit={handleTextSubmit} className="space-y-2">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={`Write in ${selectedLang.nativeName} or click mic to dictate...`}
                rows={2}
                className="w-full bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-700/80 rounded-xl p-2.5 pr-10 outline-none focus:border-accent font-medium text-xs text-foreground dark:text-white placeholder:text-surface-400 resize-none transition-colors shadow-2xs leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
              />

              {/* Inline Dictation Mic Button inside textarea */}
              <button
                type="button"
                onClick={toggleDictation}
                className={`absolute right-2.5 top-2.5 p-1.5 rounded-lg transition-all cursor-pointer ${
                  isDictating
                    ? "bg-red-500 text-white animate-pulse shadow-xs"
                    : "text-surface-400 hover:text-accent hover:bg-surface-200 dark:hover:bg-surface-800"
                }`}
                title={isDictating ? "Stop speech dictation" : `Dictate in ${selectedLang.nativeName} (${selectedLang.name})`}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] text-surface-400">
                Press Enter to send (automatically translated to English for audit)
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="h-7 px-4 bg-accent text-background font-black text-[9px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-40 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="animate-spin text-xs">⟳</span>
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>Send</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-3 border-t border-surface-200/80 dark:border-surface-800 bg-surface-100 dark:bg-surface-850 text-[11px] font-bold text-surface-400 text-center shrink-0">
          🔒 Communication & Audit Log is view-only
        </div>
      )}
    </div>
  );
};
