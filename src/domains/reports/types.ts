export type ReportType = "daily" | "weekly" | "monthly" | "overall";

export interface ReportPhotoItem {
  id?: number;
  url: string;
  caption: string;
  grid_col?: number;
  grid_row?: number;
  grid_cell?: string;
  floor_plan_id?: number;
  floor_plan_title?: string;
  captured_at?: string | null;
}

export interface DailyReportData {
  report_type: "daily";
  period_label: string;
  date: string;
  weather: {
    weather: string;
    temperature_high?: number | null;
    temperature_low?: number | null;
    temperature_c?: number | null;
    sky_conditions: string;
    site_conditions: string;
    weather_delay: boolean;
    diary_status: string;
    notes?: string;
  };
  labor: {
    total_headcount: number;
    total_man_hours: number;
    entries: Array<{
      crew_name: string;
      trade_type: string;
      headcount: number;
      total_hours: number;
      zone?: string;
    }>;
  };
  equipment: Array<{
    equipment_id: string;
    hours_operated: number;
    hours_idle: number;
    status: string;
  }>;
  materials: Array<{
    description: string;
    quantity: number;
    unit: string;
    supplier: string;
    ticket_number: string;
    status: string;
    cost?: number | null;
  }>;
  delays: Array<{
    delay_type: string;
    duration_hours: number;
    impacted_path: string;
    status: string;
  }>;
  tasks: Array<{
    id: number;
    uid: string;
    task_code: string;
    title: string;
    status: string;
    phase_name: string;
    zone_name: string;
    progress_percent: number;
  }>;
  photos: ReportPhotoItem[];
  kpis: {
    overall_progress_percent: number;
    total_tasks: number;
    completed_tasks: number;
    active_tasks_today: number;
  };
}

export interface WeeklyReportData {
  report_type: "weekly";
  period_label: string;
  start_date: string;
  end_date: string;
  kpis: {
    overall_progress_percent: number;
    weekly_delta_percent: number;
    completed_this_week: number;
    total_tasks: number;
    weekly_man_hours: number;
  };
  phases: Array<{
    id: number;
    name: string;
    color_hex: string;
    total_tasks: number;
    completed_tasks: number;
    progress_percent: number;
  }>;
  trades: Array<{
    trade: string;
    hours: number;
    headcount: number;
  }>;
  tasks: Array<{
    id: number;
    uid: string;
    title: string;
    status: string;
    phase_name: string;
    zone_name: string;
  }>;
  photos: ReportPhotoItem[];
}

export interface MonthlyReportData {
  report_type: "monthly";
  period_label: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  kpis: {
    overall_progress_percent: number;
    tasks_completed_in_month: number;
    total_tasks: number;
    monthly_invoiced: number;
    total_invoiced_cumulative: number;
    total_paid_cumulative: number;
    outstanding_balance: number;
  };
  compliance: {
    total_ncrs: number;
    closed_ncrs: number;
    open_ncrs: number;
    safety_incidents: number;
    safe_work_hours: string;
  };
  phases: Array<{
    id: number;
    name: string;
    color_hex: string;
    progress_percent: number;
  }>;
  photos: ReportPhotoItem[];
}

export interface OverallReportData {
  report_type: "overall";
  period_label: string;
  project_meta: {
    title: string;
    project_code: string;
    client_name: string;
    client_email: string;
    location: string;
    status: string;
    created_at: string;
  };
  kpis: {
    overall_progress_percent: number;
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    total_invoiced: number;
    total_paid: number;
    outstanding_balance: number;
  };
  phases: Array<{
    id: number;
    name: string;
    color_hex: string;
    progress_percent: number;
    total_tasks: number;
    completed_tasks: number;
  }>;
  zones: Array<{
    id: number;
    name: string;
    zone_type: string;
    total_tasks: number;
    completed_tasks: number;
    progress_percent: number;
  }>;
  floor_plans: Array<{
    id: number;
    title: string;
    url: string;
    photos_count: number;
  }>;
  photos: ReportPhotoItem[];
}

export type ReportAggregatePayload = DailyReportData | WeeklyReportData | MonthlyReportData | OverallReportData;

export interface ProjectReportSnapshot {
  id: number;
  project: number;
  project_uid: string;
  project_title: string;
  report_type: ReportType;
  title: string;
  period_start: string;
  period_end: string;
  summary_data: ReportAggregatePayload;
  selected_photos: ReportPhotoItem[];
  config: Record<string, any>;
  share_token: string;
  is_public: boolean;
  public_share_url: string;
  created_at: string;
  updated_at: string;
}

export interface PublicReportResponse {
  id: number;
  title: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  project_title: string;
  project_code: string;
  client_name: string;
  summary_data: ReportAggregatePayload;
  selected_photos: ReportPhotoItem[];
  config: Record<string, any>;
  created_at: string;
  restricted?: boolean;
}
