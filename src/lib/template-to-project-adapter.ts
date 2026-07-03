import { ProjectDetail, Task } from "@/types/projects";

// The template structure from our public API endpoint
export interface PublicTemplateNode {
  uid: string;
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "TODO" | "WIP" | "QA" | "DONE";
  due_date: string | null;
  position: number;
  matrix_block_id: number | null;
  parent_task_uid: string | null;
  checklists: { title: string; order: number }[];
  subtasks: PublicTemplateNode[];
}

export interface PublicTemplate {
  uid: string;
  title: string;
  description: string;
  template_category: string;
  template_tags: string[];
  template_building_type: string;
  template_country: string;
  template_difficulty: string;
  template_license: string;
  template_est_duration_days: number | null;
  template_est_cost_min: string | null;
  template_est_cost_max: string | null;
  avg_rating: number;
  rating_count: number;
  task_count: number;
  author_name: string;
  is_in_library?: boolean;
  tasks: PublicTemplateNode[];
  created_at: string;
}

function flattenTaskTree(nodes: PublicTemplateNode[], projectUid: string, parentTaskObj?: Task): Task[] {
  let flat: Task[] = [];
  
  for (const node of nodes) {
    const task: Task = {
      id: Math.floor(Math.random() * 1000000), // mock id
      uid: node.uid,
      project: projectUid,
      project_uid: projectUid,
      title: node.title,
      description: node.description,
      cost: "0",
      status: (node.status || "TODO") as any,
      start_date: null,
      end_date: null,
      due_date: node.due_date,
      assigned_to: null,
      asset_links: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      block: node.matrix_block_id || undefined,
      checklists: node.checklists || [],
      priority: node.priority,
      parent_task_id: parentTaskObj ? parentTaskObj.id : undefined,
      parent_task: parentTaskObj || null,
      subtasks: [],
    };
    
    // add to flat list
    flat.push(task);
    
    // recurse
    if (node.subtasks && node.subtasks.length > 0) {
      const childTasks = flattenTaskTree(node.subtasks, projectUid, task);
      task.subtasks = childTasks; // nested list for Kanban tree view
      flat = [...flat, ...childTasks];
    }
  }
  
  return flat;
}

export function templateToProject(template: PublicTemplate): ProjectDetail {
  return {
    id: 0,
    uid: template.uid,
    title: template.title,
    description: template.description,
    status: "To Start",
    account: { id: 0, uid: "mock-account", name: "Template Preview", slug: "template-preview", account_type: "organization" },
    project_code: "TMPL",
    kind: template.template_building_type,
    location: template.template_country,
    client_name: template.author_name,
    unit_system: "metric",
    created_by: { id: 0, uid: "mock-author", email: "author@example.com", name: template.author_name, is_active: true, created_at: "", updated_at: "" },
    memberships_count: 1,
    tasks_count: template.task_count,
    created_at: template.created_at,
    updated_at: template.created_at,
    is_template: true,
    memberships: [],
    assets: [],
    folders: [],
    tasks: flattenTaskTree(template.tasks || [], template.uid),
  };
}
