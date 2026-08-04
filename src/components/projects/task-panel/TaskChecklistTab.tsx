import React from "react";
import { Task, TaskChecklistItem } from "@/types/projects";

interface ChecklistTemplate {
  id: number;
  name: string;
  items?: any[];
}

interface TaskChecklistTabProps {
  task: Task;
  checklists: TaskChecklistItem[];
  newChecklistDesc: string;
  setNewChecklistDesc: (val: string) => void;
  handleAddChecklistItem: () => void;
  handleToggleChecklist: (item: TaskChecklistItem) => void;
  isContractor: boolean;
  isUpdating: boolean;
  isAdmin: boolean;
  isArchitect: boolean;
  isQA: boolean;
  checklistTemplates: ChecklistTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (val: string) => void;
  handleImportTemplate: () => void;
  setLightboxImageUrl: (url: string | null) => void;
  readOnly?: boolean;
}

export const TaskChecklistTab: React.FC<TaskChecklistTabProps> = ({
  task,
  checklists,
  newChecklistDesc,
  setNewChecklistDesc,
  handleAddChecklistItem,
  handleToggleChecklist,
  isContractor,
  isUpdating,
  isAdmin,
  isArchitect,
  isQA,
  checklistTemplates,
  selectedTemplateId,
  setSelectedTemplateId,
  handleImportTemplate,
  setLightboxImageUrl,
  readOnly = false,
}) => {
  return (
    <div className="max-w-4xl space-y-4">
      <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
        {checklists.length === 0 ? (
          <div className="p-8 text-center text-surface-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm font-bold">No checklist items yet</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {checklists.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 p-4 hover:bg-surface-50 transition-colors group border-b border-surface-100 last:border-0">
                <label className={`flex items-start gap-4 ${readOnly ? "cursor-default" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    onChange={() => !readOnly && handleToggleChecklist(item)}
                    disabled={(isContractor && task.status !== "WIP") || isUpdating || readOnly}
                    className="w-5 h-5 mt-0.5 rounded border-surface-300 accent-accent shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold transition-colors ${item.is_completed ? "line-through text-surface-400" : "text-primary group-hover:text-accent"}`}>
                        {item.title}
                      </p>
                      {item.requires_visual_proof && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">📸 Proof Req.</span>
                      )}
                    </div>
                    {item.is_completed && item.completed_by && (
                      <p className="text-[10px] text-surface-400 mt-1">Completed by {item.completed_by.email}</p>
                    )}
                  </div>
                  {item.is_completed && (
                    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </label>
                {item.attachments && item.attachments.length > 0 && (
                  <div className="flex gap-2 ml-9 mt-1">
                    {item.attachments.map((att) => (
                      <button 
                        key={att.id} 
                        onClick={() => setLightboxImageUrl(att.file)}
                        className="w-12 h-12 rounded overflow-hidden border border-surface-200 block hover:opacity-80 transition-opacity cursor-pointer focus:outline-none shrink-0"
                      >
                        <img src={att.file} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!readOnly && (isAdmin || isArchitect || isQA) && (
        <div className="bg-surface-100 border-surface-200 rounded-2xl border border-surface-200 p-4 shadow-sm">
          <div className="flex gap-3">
            <input
              type="text"
              value={newChecklistDesc}
              onChange={e => setNewChecklistDesc(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !isUpdating && handleAddChecklistItem()}
              placeholder="Add verification checkpoint..."
              disabled={isUpdating}
              className="flex-1 h-10 bg-surface-50 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-medium text-primary disabled:opacity-50"
            />
            <button
              onClick={handleAddChecklistItem}
              disabled={!newChecklistDesc.trim() || isUpdating}
              className="h-10 px-4 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent transition-all disabled:opacity-40 flex items-center gap-2 shrink-0"
            >
              {isUpdating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                "+ Add"
              )}
            </button>
          </div>
          
          {/* Import Template Section */}
          <div className="mt-4 pt-4 border-t border-surface-200 flex gap-3 items-center">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="flex-1 h-10 bg-surface-50 border border-surface-200 rounded-xl px-3 outline-none focus:border-accent text-sm font-medium text-primary appearance-none"
            >
              <option value="" disabled>Import from global template...</option>
              {checklistTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.items?.length || 0} items)</option>
              ))}
            </select>
            <button
              onClick={handleImportTemplate}
              disabled={!selectedTemplateId || isUpdating}
              className="h-10 px-4 bg-surface-200 text-surface-700 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-surface-300 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              {isUpdating ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
