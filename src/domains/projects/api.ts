import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { Project, ProjectDetail } from "@/types/projects";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const projectsApi = {
  getProjects: async () => {
    return fetchFromBff<PaginatedResponse<Project> | Project[]>("/api/projects/projects/", { method: "GET" });
  },
  
  getProjectDetails: async (id: string | number) => {
    return fetchFromBff<ProjectDetail>(`/api/projects/projects/${id}/`, { method: "GET" });
  }
};
