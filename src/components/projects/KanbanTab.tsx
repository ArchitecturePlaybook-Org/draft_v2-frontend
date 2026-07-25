import React, { useState } from "react";
import { TaskItem } from "./TaskItem";
import { useProjectStore } from "@/store/project-store";
import { projectsApi } from "@/domains/projects/api";
import { usePermissions } from "@/hooks/use-permissions";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export const KanbanTab: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => {
  const { project, zones, phases, taskTemplates, setActiveTask, fetchProject, addTaskOptimistically, updateTaskStatus } = useProjectStore();
  const { canEditProject } = usePermissions();
  const canEdit = !readOnly && canEditProject;

  const [kanbanFilter, setKanbanFilter] = useState("");
  const [inlineTaskCol, setInlineTaskCol] = useState<string | null>(null);
  const [inlineTaskTitle, setInlineTaskTitle] = useState("");
  const [isCreatingInline, setIsCreatingInline] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");

  const [selectedTaskUids, setSelectedTaskUids] = useState<string[]>([]);
  const [isBulkOperationPending, setIsBulkOperationPending] = useState(false);

  if (!project) return null;

  const toggleTaskSelection = (uid: string) => {
    setSelectedTaskUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleBulkUpdate = async (updates: any) => {
    if (selectedTaskUids.length === 0) return;
    setIsBulkOperationPending(true);
    try {
      await projectsApi.bulkUpdateTasks(selectedTaskUids, updates);
      setSelectedTaskUids([]);
      fetchProject(project.uid);
    } catch (err: any) {
      alert("Bulk update failed: " + err.message);
    } finally {
      setIsBulkOperationPending(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskUids.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTaskUids.length} tasks?`)) return;
    setIsBulkOperationPending(true);
    try {
      await projectsApi.bulkDeleteTasks(selectedTaskUids);
      setSelectedTaskUids([]);
      fetchProject(project.uid);
    } catch (err: any) {
      alert("Bulk delete failed: " + err.message);
    } finally {
      setIsBulkOperationPending(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = selectedTemplate ? taskTemplates.find((t: any) => t.id.toString() === selectedTemplate)?.name : newTaskTitle;
    if (!title) return;
    
    setIsCreatingTask(true);
    try {
      addTaskOptimistically({
        title,
        status: "TODO" as any,
      });
      await projectsApi.createTask({ 
        project: project.id, 
        title,
        zone_id: selectedZoneId ? parseInt(selectedZoneId) : undefined,
        phase_id: selectedPhaseId ? parseInt(selectedPhaseId) : undefined
      });
      setNewTaskTitle("");
      setSelectedTemplate("");
      setSelectedZoneId("");
      setSelectedPhaseId("");
      if (navigator.onLine) fetchProject(project.uid);
    } catch(err: any) {
      alert(err.message || "Failed to queue execution phase");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleInlineCreateTask = async (e: React.FormEvent, status: string) => {
    e.preventDefault();
    if (!inlineTaskTitle.trim() || !project) return;
    setIsCreatingInline(true);
    try {
      addTaskOptimistically({
        title: inlineTaskTitle.trim(),
        status: status as any
      });
      await projectsApi.createTask({
        project: project.id,
        title: inlineTaskTitle.trim(),
        status: status
      });
      setInlineTaskTitle("");
      setInlineTaskCol(null);
      if (navigator.onLine) fetchProject(project.uid);
    } catch(err: any) {
      alert(err.message || "Failed to add task");
    } finally {
      setIsCreatingInline(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (readOnly) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    updateTaskStatus(draggableId, destination.droppableId);
    try {
      await projectsApi.updateTask(draggableId, { status: destination.droppableId });
      if (navigator.onLine) fetchProject(project.uid);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
      fetchProject(project.uid);
    }
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <form onSubmit={handleCreateTask} className="bg-surface-100 dark:bg-white/5 p-3 pr-4 rounded-2xl border border-surface-200 dark:border-white/10 flex flex-wrap md:flex-nowrap gap-4 items-center shadow-sm" style={{ colorScheme: 'dark' }}>
          <span className="text-lg pl-4 opacity-30 hidden md:block">📋</span>
          
          <select 
            value={selectedTemplate} 
            onChange={e => setSelectedTemplate(e.target.value)}
            className="h-12 px-4 appearance-none bg-surface-100 dark:bg-surface-100 border border-surface-200 rounded-xl outline-none text-sm font-bold text-primary flex-1 min-w-[200px] cursor-pointer"
          >
            <option value="">-- Custom Phase --</option>
            {taskTemplates.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {!selectedTemplate && (
            <input 
              type="text" 
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder="Custom phase title..."
              className="flex-2 h-12 px-4 bg-surface-100 dark:bg-surface-100 border border-surface-200 rounded-xl outline-none font-medium text-sm text-primary min-w-[200px]"
            />
          )}

          <select 
            required
            value={selectedZoneId} 
            onChange={e => setSelectedZoneId(e.target.value)}
            className="h-12 px-4 appearance-none bg-surface-100 dark:bg-surface-100 border border-surface-200 rounded-xl outline-none text-sm font-bold text-primary w-[140px] cursor-pointer"
          >
            <option value="" disabled>Zone...</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>

          <select 
            required
            value={selectedPhaseId} 
            onChange={e => setSelectedPhaseId(e.target.value)}
            className="h-12 px-4 appearance-none bg-surface-100 dark:bg-surface-100 border border-surface-200 rounded-xl outline-none text-sm font-bold text-primary w-[140px] cursor-pointer"
          >
            <option value="" disabled>Phase...</option>
            {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          
          <button 
            type="submit"
            disabled={isCreatingTask || (!selectedTemplate && !newTaskTitle) || !selectedZoneId || !selectedPhaseId}
            className="h-12 px-8 bg-accent text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50 ml-auto"
          >
            {isCreatingTask ? "Adding..." : "+ Add Task"}
          </button>
        </form>
      )}

      {selectedTaskUids.length > 0 && !readOnly && (
        <div className="bg-surface-800 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-4 sticky top-4 z-40">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm bg-surface-700 px-3 py-1 rounded-lg">{selectedTaskUids.length} selected</span>
            <button onClick={() => setSelectedTaskUids([])} className="text-xs text-surface-400 hover:text-white font-bold transition-colors">Clear Selection</button>
          </div>
          <div className="flex items-center gap-3">
            <select 
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkUpdate({ status: e.target.value });
                  e.target.value = "";
                }
              }}
              disabled={isBulkOperationPending}
              className="bg-surface-700 text-xs font-bold px-3 py-2.5 rounded-lg outline-none cursor-pointer border-r-8 border-transparent disabled:opacity-50"
              defaultValue=""
            >
              <option value="" disabled>Move to Status...</option>
              <option value="TODO">To Do</option>
              <option value="WIP">In Progress</option>
              <option value="QA">Inspection</option>
              <option value="DONE">Done</option>
            </select>
            
            <button 
              onClick={handleBulkDelete}
              disabled={isBulkOperationPending}
              className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span>🗑️</span> {isBulkOperationPending ? "Processing..." : "Delete Batch"}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 items-center bg-surface-100 dark:bg-white/5 p-2 rounded-xl border border-surface-200 dark:border-white/10">
        <span className="text-surface-400 dark:text-white/40 pl-2">🔍</span>
        <input 
          type="text" 
          placeholder="Filter tasks by title or assignee..." 
          value={kanbanFilter}
          onChange={e => setKanbanFilter(e.target.value)}
          className="flex-1 outline-none text-sm text-primary dark:text-white font-medium bg-transparent placeholder:text-surface-400 dark:placeholder:text-white/30"
        />
        {kanbanFilter && (
          <button onClick={() => setKanbanFilter("")} className="text-surface-400 dark:text-white/50 hover:text-primary dark:hover:text-white pr-2">✕</button>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex overflow-x-auto gap-5 pb-6 custom-scrollbar pt-2">
          {[
            { id: "TODO", label: "To Do", color: "border-t-surface-300", dot: "bg-surface-300" },
            { id: "WIP", label: "In Progress", color: "border-t-semantic-blue", dot: "bg-semantic-blue" },
            { id: "QA", label: "Under Inspection", color: "border-t-accent", dot: "bg-accent" },
            { id: "DONE", label: "Done", color: "border-t-semantic-green", dot: "bg-semantic-green" },
          ].map(col => (
            <Droppable key={col.id} droppableId={col.id} isDropDisabled={readOnly}>
              {(provided, snapshot) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col min-w-[280px] flex-1 px-3 min-h-[500px] transition-colors border-t-[3px] rounded-xl bg-surface-100 dark:bg-white/5 border border-surface-200 dark:border-white/10 shadow-xl shadow-primary/5 ${col.color} ${snapshot.isDraggingOver ? 'bg-surface-200/90 dark:bg-white/10 ring-2 ring-accent/50' : ''}`}
                >
                  <h4 className="flex items-center font-black text-[10px] uppercase tracking-[0.2em] text-text-secondary dark:text-white/60 mb-4 px-1">
                    {!readOnly && (
                      <input 
                        type="checkbox"
                        className="w-3.5 h-3.5 mr-3 flex-shrink-0 rounded border-surface-300 dark:border-white/20 text-primary focus:ring-accent cursor-pointer"
                        checked={project.tasks.filter(t => t.status === col.id).length > 0 && project.tasks.filter(t => t.status === col.id).every(t => selectedTaskUids.includes(t.uid))}
                        onChange={(e) => {
                          const colTasks = project.tasks.filter(t => t.status === col.id).map(t => t.uid);
                          if (e.target.checked) {
                            setSelectedTaskUids(prev => Array.from(new Set([...prev, ...colTasks])));
                          } else {
                            setSelectedTaskUids(prev => prev.filter(uid => !colTasks.includes(uid)));
                          }
                        }}
                      />
                    )}
                    <span className={`w-2 h-2 rounded-full mr-2 ${col.dot}`} />
                    {col.label} 
                    <span className="ml-auto bg-background/50 dark:bg-white/10 backdrop-blur border border-surface-200 dark:border-white/10 text-primary dark:text-white font-bold px-2.5 py-0.5 rounded-full shadow-inner">
                      {project.tasks.filter(t => {
                        if (!kanbanFilter) return t.status === col.id;
                        const term = kanbanFilter.toLowerCase();
                        return t.status === col.id && (t.title.toLowerCase().includes(term) || t.assigned_to?.name.toLowerCase().includes(term));
                      }).length}
                    </span>
                  </h4>
                  <div className="space-y-3 min-h-[500px] flex-1 pb-2 flex flex-col">
                    {project.tasks.filter(t => {
                        if (!kanbanFilter) return t.status === col.id;
                        const term = kanbanFilter.toLowerCase();
                        return t.status === col.id && (t.title.toLowerCase().includes(term) || t.assigned_to?.name.toLowerCase().includes(term));
                      }).map((task, index) => (
                      <Draggable key={task.uid} draggableId={task.uid} index={index}>
                        {(provided, snapshot) => (
                          <TaskItem 
                            task={task} 
                            readOnly={readOnly}
                            onClick={() => !readOnly && setActiveTask(task)} 
                            isSelected={selectedTaskUids.includes(task.uid)}
                            onSelectToggle={() => !readOnly && toggleTaskSelection(task.uid)}
                            innerRef={provided.innerRef}
                            draggableProps={provided.draggableProps}
                            dragHandleProps={provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    <div className="mt-auto pt-4">
                      {inlineTaskCol === col.id ? (
                        <form onSubmit={(e) => handleInlineCreateTask(e, col.id)} className="flex flex-col gap-2">
                          <input 
                            type="text" 
                            autoFocus
                            value={inlineTaskTitle}
                            onChange={e => setInlineTaskTitle(e.target.value)}
                            placeholder="Task title..."
                            className="w-full text-xs p-3 rounded-xl border border-primary/20 dark:border-white/10 bg-white dark:bg-white/10 text-primary dark:text-white placeholder:text-surface-400 dark:placeholder:text-white/30 outline-none focus:border-accent dark:focus:border-accent shadow-sm"
                          />
                          <div className="flex gap-2">
                            <button type="submit" disabled={isCreatingInline} className="flex-1 bg-accent text-background text-[10px] font-bold uppercase tracking-widest py-2 rounded-xl hover:opacity-90 disabled:opacity-50">
                              {isCreatingInline ? "..." : "Save"}
                            </button>
                            <button type="button" onClick={() => { setInlineTaskCol(null); setInlineTaskTitle(""); }} className="flex-1 bg-surface-100 dark:bg-white/10 text-surface-600 dark:text-white/60 text-[10px] font-bold uppercase tracking-widest py-2 rounded-xl hover:bg-surface-200 dark:hover:bg-white/20">
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button 
                          onClick={() => setInlineTaskCol(col.id)}
                          className="w-full py-2.5 border-2 border-dashed border-surface-200 dark:border-white/15 bg-surface-100 dark:bg-transparent text-surface-400 dark:text-white/40 hover:border-accent hover:text-accent rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                          <span>+</span> Add Task
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};
