import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentProject {
  uid: string;
  title: string;
  status: string;
  accessed_at: number;
}

interface ProjectNavStore {
  recentProjects: RecentProject[];
  isInsideProject: boolean;
  currentProjectUid: string | null;
  currentProjectTitle: string | null;
  isSidebarCollapsed: boolean;
  
  recordProjectAccess: (project: Omit<RecentProject, "accessed_at">) => void;
  setProjectContext: (uid: string | null, title?: string | null) => void;
  toggleSidebar: () => void;
}

export const useProjectNavStore = create<ProjectNavStore>()(
  persist(
    (set) => ({
      recentProjects: [],
      isInsideProject: false,
      currentProjectUid: null,
      currentProjectTitle: null,
      isSidebarCollapsed: false,

      recordProjectAccess: (project) =>
        set((state) => {
          const newAccess = { ...project, accessed_at: Date.now() };
          const filtered = state.recentProjects.filter((p) => p.uid !== project.uid);
          const updated = [newAccess, ...filtered].slice(0, 3); // Keep last 3
          return { recentProjects: updated };
        }),

      // title === undefined → preserve existing title
      // title === null     → clear the title (user left the project)
      // title === string   → set new title
      setProjectContext: (uid, title) =>
        set((state) => ({
          isInsideProject: !!uid,
          currentProjectUid: uid,
          currentProjectTitle: title === undefined
            ? state.currentProjectTitle
            : title,
        })),

      toggleSidebar: () => 
        set((state) => ({
          isSidebarCollapsed: !state.isSidebarCollapsed
        })),
    }),
    {
      name: "ap-project-nav",
    }
  )
);
