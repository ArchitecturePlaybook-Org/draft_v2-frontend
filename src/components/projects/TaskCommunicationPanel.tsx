import React, { useState, useEffect, useRef } from "react";
import { Task, TaskComment } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

function formatTimeAgo(dateString: string) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffInMilliseconds = new Date(dateString).getTime() - new Date().getTime();
  const diffInDays = Math.round(diffInMilliseconds / (1000 * 60 * 60 * 24));
  if (Math.abs(diffInDays) > 0) return rtf.format(diffInDays, 'day');
  const diffInHours = Math.round(diffInMilliseconds / (1000 * 60 * 60));
  if (Math.abs(diffInHours) > 0) return rtf.format(diffInHours, 'hour');
  const diffInMinutes = Math.round(diffInMilliseconds / (1000 * 60));
  if (Math.abs(diffInMinutes) > 0) return rtf.format(diffInMinutes, 'minute');
  return 'just now';
}

interface TaskCommunicationPanelProps {
  task: Task;
  onCommentAdded?: () => void;
  readOnly?: boolean;
}

export const TaskCommunicationPanel: React.FC<TaskCommunicationPanelProps> = ({ task, onCommentAdded, readOnly = false }) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting || readOnly) return;

    setIsSubmitting(true);
    try {
      await projectsApi.createTaskComment(task.uid, newComment.trim());
      setNewComment("");
      await fetchComments();
      if (onCommentAdded) onCommentAdded();
      toast.success("Comment added.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-xs">
      <div className="px-3.5 py-2.5 border-b border-surface-200 dark:border-surface-800 bg-surface-100 dark:bg-surface-850 shrink-0">
        <h4 className="text-[11px] font-bold text-primary dark:text-white uppercase tracking-wider">Communication & Audit Log</h4>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {isLoading ? (
          <div className="text-center text-xs text-surface-400 dark:text-surface-500 py-6 font-medium">
            Loading messages...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-xs text-surface-400 dark:text-surface-500 py-6 font-medium">
            No messages yet. Start the conversation!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-surface-100 dark:bg-surface-800/80 p-2.5 rounded-lg border border-surface-200 dark:border-surface-700/80 shadow-xs">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[11px] font-bold text-primary dark:text-white">{comment.user?.name || comment.user?.email || "User"}</span>
                <span className="text-[9px] font-medium text-surface-400 dark:text-surface-500">
                  {formatTimeAgo(comment.created_at)}
                </span>
              </div>
              <p className="text-xs text-surface-700 dark:text-surface-200 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {!readOnly ? (
        <div className="p-3 border-t border-surface-200 dark:border-surface-800 bg-surface-100 dark:bg-surface-850 shrink-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your message..."
              className="w-full h-16 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg p-2.5 outline-none focus:border-accent font-medium text-xs text-primary dark:text-white placeholder:text-surface-400 resize-none transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-surface-400 dark:text-surface-500">Press Enter to send</span>
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="h-7 px-3 bg-accent text-background font-bold text-[9px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all disabled:opacity-40"
              >
                {isSubmitting ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-3 border-t border-surface-200 dark:border-surface-800 bg-surface-100 dark:bg-surface-850 text-[11px] font-bold text-surface-400 text-center shrink-0">
          🔒 Audit Log is view-only
        </div>
      )}
    </div>
  );
};
