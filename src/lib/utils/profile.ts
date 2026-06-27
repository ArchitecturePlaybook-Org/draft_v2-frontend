import { User } from "@/types/auth";

export interface FieldSchema {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date";
  placeholder?: string;
  options?: string[];
}

export const CATEGORY_SCHEMAS: Record<string, FieldSchema[]> = {
  architect: [
    { key: "license_number", label: "Professional License Number", type: "text", placeholder: "e.g. ARB-123456" },
    { key: "registration_body", label: "Registration Body", type: "select", options: ["ARB (UK)", "AIA (US)", "RIBA", "COA (India)", "Other"] },
    { key: "years_of_experience", label: "Years of Practice", type: "number" },
    { key: "primary_software", label: "Main Design Software", type: "select", options: ["Revit", "AutoCAD", "ArchiCAD", "Rhino", "SketchUp"] },
  ],
  contractor: [
    { key: "company_reg_number", label: "Company Registration", type: "text" },
    { key: "primary_trade", label: "Primary Trade", type: "select", options: ["General Construction", "MEP", "Structural", "Civil", "Finishing"] },
    { key: "insurance_limit", label: "Liability Insurance Limit", type: "text", placeholder: "e.g. $5M" },
  ],
  supplier: [
    { key: "product_category", label: "Main Product Line", type: "select", options: ["Raw Materials", "Finishes", "Equipment", "Structural Components"] },
    { key: "delivery_radius", label: "Max Delivery Radius (km)", type: "number" },
    { key: "credit_terms", label: "Available Credit Terms", type: "select", options: ["30 Days", "60 Days", "Prepaid", "Negotiable"] },
    { key: "warehouse_location", label: "Primary Dispatch Location", type: "text" },
  ],
  client: [
    { key: "project_interest", label: "Main Project Interest", type: "select", options: ["Residential", "Commercial", "Industrial", "Renovation"] },
    { key: "budget_range", label: "Planned Budget Range", type: "select", options: ["<$100k", "$100k-$500k", "$500k-$1M", ">$1M"] },
    { key: "estimated_start", label: "Target Start Date", type: "date" },
  ],
};

export interface ProfileIntegrity {
  score: number;
  isComplete: boolean;
  missing: Array<{ label: string; points: number }>;
}

export function calculateProfileCompleteness(user: any): ProfileIntegrity {
  if (!user) return { score: 0, isComplete: false, missing: [] };

  let score = 0;
  const missing: Array<{ label: string; points: number }> = [];

  const addPoint = (condition: boolean, label: string, points: number) => {
    if (condition) {
      score += points;
    } else {
      missing.push({ label, points });
    }
  };

  addPoint(!!user.name, "Full Name", 10);
  addPoint(!!user.email, "Email Address", 10);
  addPoint(!!user.profile?.bio, "Professional Biography", 15);
  addPoint(!!user.profile?.phone_number, "Phone Number", 10);
  addPoint(!!user.profile?.profile_picture, "Profile Picture", 15);
  addPoint(!!user.is_2fa_enabled, "Enable Two-Factor Authentication", 10);
  
  // Organization check
  const hasOrg = !!user.organization_id || (user.accounts && user.accounts.length > 0) || !!user.organization;
  addPoint(hasOrg, "Join or Create an Organization", 20);

  // First Project/Portfolio check
  const hasProject = (user.project_counts?.total ?? 0) > 0 || (user.profile?.metadata?.has_projects === true);
  addPoint(hasProject, "Publish First Project/Portfolio Item", 10);

  // Cap score at 100 just in case
  score = Math.min(score, 100);

  return {
    score,
    isComplete: score >= 100,
    missing
  };
}
