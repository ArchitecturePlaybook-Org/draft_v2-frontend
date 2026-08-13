export interface DiaryEntry {
  id: number;
  project: number;
  entry_date: string;
  weather_am?: string;
  weather_pm?: string;
  temperature_min?: number;
  temperature_max?: number;
  precip_inches?: number;
  wind_speed_mph?: number;
  status: "draft" | "signed";
  signed_by?: number | null;
  signed_at?: string | null;
  supervisor_notes?: string;
  created_at: string;
  updated_at: string;
  labor_entries?: DiaryLabor[];
  material_entries?: DiaryMaterial[];
  equipment_entries?: DiaryEquipment[];
  delay_entries?: DiaryDelay[];
  activity_entries?: DiaryActivity[];
  attachments?: DiaryAttachment[];
}

export interface DiaryLabor {
  id: number;
  diary_entry: number;
  crew_name: string;
  trade_type: string;
  headcount: number;
  total_hours: number;
  zone?: string;
  created_at: string;
}

export interface DiaryMaterial {
  id: number;
  diary_entry: number;
  description: string;
  quantity: number;
  unit: string;
  supplier?: string;
  ticket_number?: string;
  status: "good" | "damaged" | "shortage";
  cost?: number;
  created_at: string;
}

export interface DiaryEquipment {
  id: number;
  diary_entry: number;
  equipment_id: string;
  hours_operated: number;
  hours_idle: number;
  status: "operational" | "maintenance" | "broken";
  created_at: string;
}

export interface DiaryDelay {
  id: number;
  diary_entry: number;
  delay_type: "weather" | "material" | "labor" | "inspection" | "other";
  duration_hours: number;
  impacted_path?: string;
  description?: string;
  created_at: string;
}

export interface DiaryActivity {
  id: number;
  diary_entry: number;
  task?: number | null;
  description: string;
  created_at: string;
}

export interface DiaryAttachment {
  id: number;
  diary_entry: number;
  file: string;
  uploaded_by: number;
  uploaded_at: string;
  file_name?: string;
  file_size?: number;
}
