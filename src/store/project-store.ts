import { create } from 'zustand';
import { ProjectDetail, Task, ProjectStatus, SpatialZone, MilestonePhase } from '@/types/projects';
import { projectsApi } from '@/domains/projects/api';

type TabView = "kanban" | "gantt" | "data_hub" | "matrix" | "site_ops";
type HubCategory = "sketch" | "2d_plan" | "3d_model" | "document";

interface ProjectState {
  // Data
  project: ProjectDetail | null;
  isLoading: boolean;
  zones: SpatialZone[];
  phases: MilestonePhase[];
  taskTemplates: any[];
  
  // UI State
  activeTab: TabView;
  activeHubCategory: HubCategory;
  activeTask: Task | null;
  isSidePanelOpen: boolean;

  // Actions
  setActiveTab: (tab: TabView) => void;
  setActiveHubCategory: (category: HubCategory) => void;
  setActiveTask: (task: Task | null) => void;
  
  // Async Data Actions
  fetchProject: (id: string) => Promise<void>;
  addTaskOptimistically: (task: Partial<Task>) => void;
  updateProjectStatus: (uid: string, status: ProjectStatus) => Promise<void>;
  updateTaskStatus: (taskUid: string, status: string) => Promise<void>;
  updateTaskDates: (taskUid: string, start: string, end: string) => Promise<void>;
  fetchTemplates: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  isLoading: true,
  zones: [],
  phases: [],
  taskTemplates: [],
  
  activeTab: "matrix",
  activeHubCategory: "sketch",
  activeTask: null,
  isSidePanelOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveHubCategory: (category) => set({ activeHubCategory: category }),
  setActiveTask: (task) => set({ activeTask: task, isSidePanelOpen: !!task }),

  fetchProject: async (id: string) => {
    const currentProject = get().project;
    if (!currentProject || currentProject.uid !== id) {
      set({ isLoading: true });
    }
    try {
      const data = await projectsApi.getProjectDetails(id);
      
      const currentActiveTask = get().activeTask;
      let updatedActiveTask = currentActiveTask;
      if (currentActiveTask && data?.tasks) {
        const found = data.tasks.find((t: Task) => t.uid === currentActiveTask.uid || t.id === currentActiveTask.id);
        if (found) {
          updatedActiveTask = found;
        }
      }

      set({ project: data, activeTask: updatedActiveTask });
      
      try {
        const matrixData = await projectsApi.getMatrix(data.uid);
        set({ zones: matrixData.zones, phases: matrixData.phases });
      } catch (err) {
        console.warn("Failed to fetch matrix data:", err);
      }
    } catch (err: any) {
      if (err?.status === 404) {
        console.warn(`Project ${id} not found.`);
        set({ project: null });
      } else {
        console.error("Failed to fetch project details", err);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  addTaskOptimistically: (taskData: Partial<Task>) => {
    const { project } = get();
    if (!project) return;
    
    const newTask: Task = {
      id: Math.random() * 1000000,
      uid: `offline-${Date.now()}`,
      title: taskData.title || "New Task",
      status: (taskData.status as any) || "open",
      description: taskData.description || "",
      priority: taskData.priority || "MEDIUM",
      start_date: taskData.start_date || null,
      end_date: taskData.end_date || null,
      tags: [],
      asset_links: [],
      checklists: [],
      project: project.uid,
      cost: taskData.cost || "0.00",
      assigned_to: taskData.assigned_to || null,
      created_at: taskData.created_at || new Date().toISOString(),
      updated_at: taskData.updated_at || new Date().toISOString(),
      ...taskData
    };

    const updatedTasks = [...project.tasks, newTask];
    const doneCount = updatedTasks.filter(t => {
      const s = (t.status || "").toLowerCase();
      return s === "done" || s === "completed";
    }).length;

    set({ 
      project: { 
        ...project, 
        tasks: updatedTasks,
        tasks_count: updatedTasks.length,
        tasks_done_count: doneCount
      } 
    });
  },

  updateProjectStatus: async (uid: string, status: ProjectStatus) => {
    const { project } = get();
    if (!project) return;
    
    // Optimistic update
    set({ project: { ...project, status: status as any } });
    
    try {
      await projectsApi.updateProject(uid, { status: status as any });
    } catch (err) {
      // Revert on failure
      const currentProject = await projectsApi.getProjectDetails(uid);
      set({ project: currentProject });
    }
  },

  updateTaskStatus: async (taskUid: string, status: string) => {
    const { project, activeTask } = get();
    if (!project) return;

    // Optimistic update
    const updatedTasks = project.tasks.map(t => 
      t.uid === taskUid ? { ...t, status: status as any } : t
    );
    
    const doneCount = updatedTasks.filter(t => {
      const s = (t.status || "").toLowerCase();
      return s === "done" || s === "completed";
    }).length;

    set({ 
      project: { 
        ...project, 
        tasks: updatedTasks,
        tasks_count: updatedTasks.length,
        tasks_done_count: doneCount
      },
      activeTask: activeTask?.uid === taskUid ? { ...activeTask, status: status as any } : activeTask
    });

    try {
      await projectsApi.updateTask(taskUid, { status });
    } catch (err) {
      console.error("Task status update failed", err);
      // Revert mapping
      get().fetchProject(project.uid);
    }
  },

  updateTaskDates: async (taskUid: string, start: string, end: string) => {
    const { project } = get();
    if (!project) return;

    // Optimistic update
    const updatedTasks = project.tasks.map(t => 
      t.uid === taskUid ? { ...t, start_date: start, end_date: end } : t
    );
    
    set({ project: { ...project, tasks: updatedTasks } });

    try {
      await projectsApi.updateTask(taskUid, { start_date: start, end_date: end });
    } catch (err) {
      console.error("Task date update failed", err);
      get().fetchProject(project.uid);
    }
  },

  fetchTemplates: async () => {
    try {
      const data = await projectsApi.getTaskTemplates();
      set({ taskTemplates: Array.isArray(data) ? data : data.results || [] });
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  }
}));
