import React from "react";
import { Task } from "@/types/projects";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface TaskItemProps {
  task: Task;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Done": return "success";
      case "In Progress": return "info";
      default: return "warning";
    }
  };

  return (
    <Card hover={false} className="p-5 border-(--surface-300)! bg-(--surface-100)!">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground mb-1.5">{task.title}</h4>
          <p className="text-xs text-(--gray-400) leading-relaxed">
            {task.description || "No description provided."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
          <div className="text-[10px] font-black text-(--primary) bg-(--primary)/5 px-3 py-1.5 rounded-full border border-(--primary)/20 backdrop-blur-md tracking-widest uppercase">
            ${Number(task.cost).toLocaleString()}
          </div>
        </div>
      </div>
    </Card>
  );
};
