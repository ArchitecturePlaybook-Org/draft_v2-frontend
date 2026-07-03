import { fetchFromBff } from "@/shared/api/fetchFromBff";

export interface JobPosting {
  id: number;
  title: string;
  company_name: string;
  company_logo: string;
  location: string;
  is_remote: boolean;
  job_type: string;
  experience_level: string;
  salary_range: string;
  responsibilities?: string;
  requirements?: string;
  tags: string[];
  contact_email?: string;
  poster_name: string;
  poster_id?: number;
  days_remaining: number;
  applications_count: number;
  has_applied?: boolean;
  created_at: string;
  expires_at: string;
}

export interface Application {
  id: number;
  job: number;
  job_title: string;
  job_company: string;
  applicant: number;
  applicant_name: string;
  applicant_email: string;
  applicant_avatar: string | null;
  cover_message: string;
  status: 'pending' | 'shortlisted' | 'rejected' | 'hired';
  created_at: string;
}

export interface DashboardStats {
  total_postings: number;
  active_postings: number;
  total_applications: number;
  pending_applications: number;
  shortlisted: number;
}

export interface CreateJobPayload {
  title: string;
  company_name: string;
  company_logo?: string;
  location: string;
  is_remote: boolean;
  job_type: string;
  experience_level: string;
  salary_range?: string;
  responsibilities: string;
  requirements: string;
  tags: string[];
  contact_email?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function fetchJobs(params?: {
  search?: string;
  is_remote?: boolean;
  job_type?: string;
  experience_level?: string;
}): Promise<PaginatedResponse<JobPosting>> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.is_remote !== undefined) query.set("is_remote", String(params.is_remote));
  if (params?.job_type) query.set("job_type", params.job_type);
  if (params?.experience_level) query.set("experience_level", params.experience_level);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return fetchFromBff<PaginatedResponse<JobPosting>>(`/api/v1/jobs/postings/${qs}`);
}

export async function fetchJob(id: number): Promise<JobPosting> {
  return fetchFromBff<JobPosting>(`/api/v1/jobs/postings/${id}/`);
}

export async function createJob(data: CreateJobPayload): Promise<JobPosting> {
  return fetchFromBff<JobPosting>("/api/v1/jobs/postings/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function applyToJob(jobId: number, coverMessage: string): Promise<Application> {
  return fetchFromBff<Application>(`/api/v1/jobs/postings/${jobId}/apply/`, {
    method: "POST",
    body: JSON.stringify({ cover_message: coverMessage }),
  });
}

export async function fetchJobApplicants(jobId: number): Promise<Application[]> {
  return fetchFromBff<Application[]>(`/api/v1/jobs/postings/${jobId}/applicants/`);
}

export async function fetchMyPostings(): Promise<JobPosting[]> {
  return fetchFromBff<JobPosting[]>("/api/v1/jobs/postings/my-postings/");
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return fetchFromBff<DashboardStats>("/api/v1/jobs/postings/dashboard-stats/");
}

export async function updateApplicationStatus(
  applicationId: number,
  newStatus: Application["status"]
): Promise<Application> {
  return fetchFromBff<Application>(`/api/v1/jobs/applications/${applicationId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: newStatus }),
  });
}

export async function fetchMyApplications(): Promise<Application[]> {
  return fetchFromBff<Application[]>("/api/v1/jobs/applications/");
}
