import re

with open('src/types/projects.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update TaskStatus
content = content.replace('export type TaskStatus = "Pending" | "In Progress" | "Done";', 'export type TaskStatus = "TODO" | "WIP" | "QA" | "DONE";')

# 2. Add Matrix fields to Task
task_interface_pattern = r'(export interface Task \{[\s\S]*?\n)(\})'
def add_fields(match):
    original = match.group(1)
    insertion = """  // Matrix fields
  block?: number;
  trade?: Trade | null;
  trade_id?: number | null;
  quantity_target?: number | null;
  quantity_completed?: number;
  quantity_unit?: string;
  unit_rate?: string;
  estimated_cost?: string;
  actual_burn_cost?: number;
  cost_variance?: number;
  progress_percent?: number;
  has_active_blocker?: boolean;
  qa_inspector?: User | null;
  qa_inspector_id?: number | null;
  checklists?: any[];
  issues?: any[];\n"""
    return original + insertion + "}"

content = re.sub(task_interface_pattern, add_fields, content, count=1)

# 3. Remove ConstructionTaskStatus, ConstructionTaskIssue, TaskChecklistItem, ConstructionTask
content = re.sub(r'export type ConstructionTaskStatus = .*?;\n', '', content)
content = re.sub(r'export type IssueSeverity = .*?;\n', '', content)
content = re.sub(r'export interface TaskChecklistItem \{[\s\S]*?\}\n', '', content)
content = re.sub(r'export interface ConstructionTaskIssue \{[\s\S]*?\}\n', '', content)
content = re.sub(r'export interface ConstructionTask \{[\s\S]*?\}\n', '', content)

# 4. Update MilestoneBlockExpanded
content = content.replace('tasks: ConstructionTask[];', 'tasks: Task[];')

with open('src/types/projects.ts', 'w', encoding='utf-8') as f:
    f.write(content)
