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
}

export const TaskCommunicationPanel: React.FC<TaskCommunicationPanelProps> = ({ task, onCommentAdded }) => {
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
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await projectsApi.createTaskComment(task.uid, newComment.trim());
      setNewComment("");
      await fetchComments();
      if (onCommentAdded) onCommentAdded();
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-surface-200 bg-surface-50 shrink-0">
        <h3 className="text-sm font-bold text-primary flex items-center gap-2">
          <span>💬</span> Communications
        </h3>
        <p className="text-[10px] text-surface-500 uppercase tracking-widest mt-1 font-bold">
          Message the task owner
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50/50 min-h-[300px]">
        {isLoading ? (
          <div className="text-center text-sm text-surface-400 py-8">Loading...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-sm text-surface-400 py-8 font-medium">
            No messages yet. Start the conversation!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white p-3 rounded-xl border border-surface-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-primary">{comment.user?.name || comment.user?.email || "User"}</span>
                <span className="text-[9px] font-medium text-surface-400">
                  {formatTimeAgo(comment.created_at)}
                </span>
              </div>
              <p className="text-sm text-surface-600 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-surface-200 bg-white shrink-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type your message..."
            className="w-full h-20 bg-surface-50 border border-surface-200 rounded-xl p-3 outline-none focus:border-accent font-medium text-sm text-primary resize-none transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-surface-400">Press Enter to send</span>
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="h-9 px-5 bg-primary text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all disabled:opacity-40"
            >
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
