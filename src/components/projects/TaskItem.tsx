import React from "react";
import { Task } from "@/types/projects";

interface TaskItemProps {
  task: Task;
  onStatusUpdate?: (taskId: number, newStatus: string) => void;
  canUpdateStatus?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onStatusUpdate, canUpdateStatus }) => {
  const statusIcon = {
    "Pending": "⏳",
    "In Progress": "🏗️",
    "Done": "✅",
  }[task.status] || "🔹";

  const statusColors = {
    "Pending": "rgba(251,191,36,0.1)",
    "In Progress": "rgba(96,165,250,0.1)",
    "Done": "rgba(52,211,153,0.1)",
  }[task.status] || "rgba(255,255,255,0.05)";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "1.5rem",
      padding: "1.25rem",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "1rem",
      transition: "border-color 0.2s",
    }}>
      <div style={{ 
        width: "48px", 
        height: "48px", 
        borderRadius: "12px", 
        background: statusColors,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.25rem"
      }}>
        {statusIcon}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{task.title}</h4>
          <div style={{ 
            fontSize: "0.875rem", 
            fontWeight: 700, 
            color: "rgba(255,255,255,0.8)"
          }}>
            ${Number(task.cost).toLocaleString()}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "rgba(255,255,255,0.4)" }}>
          {task.description || "No description provided."}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {canUpdateStatus && task.status !== "Done" && (
          <button 
            onClick={() => onStatusUpdate?.(task.id, task.status === "Pending" ? "In Progress" : "Done")}
            className="button-secondary"
            style={{ fontSize: "0.75rem", padding: "0.4rem 0.75rem" }}
          >
            {task.status === "Pending" ? "Start" : "Complete"}
          </button>
        )}
        <div style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "rgba(255,255,255,0.3)",
          background: "rgba(255,255,255,0.04)",
          padding: "0.25rem 0.5rem",
          borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.05)"
        }}>
          {task.status.toUpperCase()}
        </div>
      </div>
    </div>
  );
};
