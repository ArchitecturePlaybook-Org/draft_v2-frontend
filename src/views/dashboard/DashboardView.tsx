"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { projectsApi } from "@/domains/projects/api";
import { eventsApi, Event } from "@/domains/events/api";
import { leadsApi, Lead } from "@/domains/leads/api";
import { Project, Task } from "@/types/projects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calculateProfileCompleteness } from "@/lib/utils/profile";
import { fetchFromBff } from "@/shared/api/fetchFromBff";
import { AdminDashboardView } from "@/views/dashboard/AdminDashboardView";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { motion, Variants } from "framer-motion";
import { SkeletonDashboard } from "@/components/ui/Skeleton";
import { 
  AlertCircle, 
  Briefcase, 
  Calendar, 
  ShieldAlert, 
  Medal, 
  LayoutDashboard, 
  CheckCircle2, 
  CalendarClock,
  Building2,
  ArrowRight,
  Clock
} from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function DashboardView() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useAuthStore();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const isSuperAdmin = Boolean((user as any)?.is_superuser) || user?.email === "superadmin@ap.com";

  // TanStack Queries for caching dashboard components
  const { data: dashboardStats = null, isLoading: isStatsLoading } = useQuery<any>({
    queryKey: ["dashboard-rollup"],
    queryFn: () => fetchFromBff<any>("/api/v1/core/dashboard-rollup/", { method: "GET" })
  });

  const { data: eventsData = [], isLoading: isEventsLoading } = useQuery<any>({
    queryKey: ["dashboard-events"],
    queryFn: () => eventsApi.listEvents()
  });

  const { data: leadsData = [], isLoading: isLeadsLoading } = useQuery<any>({
    queryKey: ["dashboard-leads"],
    queryFn: () => leadsApi.listLeads()
  });

  const { data: tasksData = [], isLoading: isTasksLoading } = useQuery<any>({
    queryKey: ["dashboard-tasks"],
    queryFn: () => projectsApi.getTasks()
  });

  const isLoadingData = isStatsLoading || isEventsLoading || isLeadsLoading || isTasksLoading;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (isUserLoading || isLoadingData || !isMounted) {
    return <SkeletonDashboard />;
  }

  if (isSuperAdmin) {
    return <AdminDashboardView />;
  }

  const events: Event[] = Array.isArray(eventsData) ? eventsData : (eventsData?.results || []);
  const tasks: Task[] = Array.isArray(tasksData) ? tasksData : (tasksData?.results || []);
  const leads: Lead[] = Array.isArray(leadsData) ? leadsData : ((leadsData as any)?.results || []);

  const activeProjectsCount = dashboardStats?.project_counts?.active || 0;
  const recentProjects = dashboardStats?.recent_projects || [];
  
  // Combine Events and Tasks for the unified schedule
  const unifiedSchedule = (() => {
    const items: Array<{
      id: string;
      type: "event" | "task";
      title: string;
      date: Date;
      rawDate: string;
    }> = [];
    
    events.forEach(e => {
      if (e.event_date) {
        items.push({
          id: `e-${e.id}`,
          type: "event",
          title: e.title,
          date: new Date(e.event_date),
          rawDate: e.event_date
        });
      }
    });
    
    tasks.forEach(t => {
      const targetDate = t.due_date || t.end_date;
      if (targetDate) {
        const d = new Date(targetDate);
        if (t.status !== 'DONE' && d >= new Date(new Date().setHours(0,0,0,0))) {
          items.push({
            id: `t-${t.id}`,
            type: "task",
            title: t.title,
            date: d,
            rawDate: targetDate
          });
        }
      }
    });
    
    return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
  })();
  const integrity = calculateProfileCompleteness(user);

  const overdueTasks = dashboardStats?.task_counts?.overdue || 0;
  const pendingLeads = leads.filter(l => l.status === 'PENDING').length;
  
  let nextEventStr = null;
  if (unifiedSchedule.length > 0) {
    const nextItem = unifiedSchedule[0];
    const diffHours = Math.round((nextItem.date.getTime() - Date.now()) / (1000 * 60 * 60));
    if (diffHours > 0 && diffHours < 48) {
      nextEventStr = `Next ${nextItem.type} in ${diffHours}h`;
    } else if (diffHours <= 0 && diffHours > -24) {
      nextEventStr = `Happening now`;
    }
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4 w-full max-w-full text-xs"
    >
      {/* COMPACT EXECUTIVE HEADER SECTION */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-200/80 dark:border-white/10 pb-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-primary flex items-center gap-2">
            {getGreeting()}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">{user?.name?.split(" ")[0] || "User"}</span>
          </h1>
          <p className="text-surface-500 font-semibold text-xs mt-0.5">Architectural Command Center & Project Overview</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/projects">
            <Button size="sm" variant="primary" className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 shadow-sm">
              + New Project
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* CONTEXTUAL ALERT PANEL */}
      {(overdueTasks > 0 || pendingLeads > 0 || nextEventStr) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {overdueTasks > 0 && (
            <motion.div whileHover={{ scale: 1.01 }} className="bg-error/10 border border-error/20 rounded-xl p-3 flex items-center justify-between group cursor-pointer backdrop-blur-md transition-all" onClick={() => router.push('/dashboard/projects')}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-error/20 rounded-lg text-error shrink-0"><AlertCircle size={16} /></div>
                <div className="min-w-0">
                  <h4 className="text-error font-bold text-xs truncate">Attention Required</h4>
                  <p className="text-error/80 text-[10px] font-semibold mt-0.5 truncate">{overdueTasks} tasks overdue</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-error/50 group-hover:text-error group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </motion.div>
          )}
          {pendingLeads > 0 && (
            <motion.div whileHover={{ scale: 1.01 }} className="bg-info/10 border border-info/20 rounded-xl p-3 flex items-center justify-between group cursor-pointer backdrop-blur-md transition-all" onClick={() => router.push('/dashboard/leads')}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-info/20 rounded-lg text-info shrink-0"><Briefcase size={16} /></div>
                <div className="min-w-0">
                  <h4 className="text-info font-bold text-xs truncate">New Opportunities</h4>
                  <p className="text-info/80 text-[10px] font-semibold mt-0.5 truncate">{pendingLeads} unread leads</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-info/50 group-hover:text-info group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </motion.div>
          )}
          {nextEventStr && (
            <motion.div whileHover={{ scale: 1.01 }} className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center justify-between group cursor-pointer backdrop-blur-md transition-all" onClick={() => router.push('/dashboard/calendar')}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-warning/20 rounded-lg text-warning shrink-0"><Calendar size={16} /></div>
                <div className="min-w-0">
                  <h4 className="text-warning font-bold text-xs truncate">Upcoming Schedule</h4>
                  <p className="text-warning/80 text-[10px] font-semibold mt-0.5 truncate">{nextEventStr}</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-warning/50 group-hover:text-warning group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* COMPACT PROFILE INTEGRITY / REPUTATION CARD */}
      <motion.div variants={itemVariants}>
        {!integrity.isComplete ? (
          <Card className="p-4 bg-surface-100/50 backdrop-blur-xl border border-surface-200 relative overflow-hidden shadow-sm group rounded-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
              <div className="flex-1 space-y-2 w-full min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-accent shrink-0" size={18} />
                  <h2 className="text-sm font-bold text-primary tracking-tight truncate">Profile Integrity Checklist</h2>
                  <span className="text-[10px] text-accent font-bold ml-auto sm:ml-0">({integrity.score}% Complete)</span>
                </div>
                <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${integrity.score}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-accent relative"
                  />
                </div>
              </div>
              <Link href="/dashboard/profile" className="shrink-0 w-full sm:w-auto">
                <Button variant="primary" size="sm" className="w-full sm:w-auto whitespace-nowrap px-4 py-1.5 font-bold uppercase tracking-wider text-[10px]">
                  Complete Setup
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-gradient-to-br from-surface-900 via-surface-800 to-primary relative overflow-hidden border border-surface-700 shadow-md group rounded-xl">
            <div className="flex flex-row items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Medal size={20} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-[9px] font-black text-white/50 uppercase tracking-widest">Professional Reputation</h2>
                  <p className="text-base font-black tracking-tight text-white">Established Professional</p>
                </div>
              </div>
              <div className="pl-4 border-l border-white/10 flex flex-col items-end shrink-0">
                <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70">320</span>
                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Total XP</span>
              </div>
            </div>
          </Card>
        )}
      </motion.div>

      {/* COMPACT STATS OVERVIEW GRID */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Active Projects", value: activeProjectsCount, icon: Building2, color: "text-accent", badge: "In Progress" },
          { label: "Project Tasks", value: dashboardStats?.task_counts?.total || 0, icon: CheckCircle2, color: "text-emerald-500", badge: `${dashboardStats?.task_counts?.done || 0} Done` },
          { label: "Upcoming Events", value: events.length, icon: CalendarClock, color: "text-sky-500", badge: "Next 7 Days" },
        ].map((stat, idx) => (
          <motion.div whileHover={{ y: -2 }} key={idx}>
            <Card className="p-3.5 border border-surface-200/80 dark:border-white/10 bg-surface-50/60 backdrop-blur-xl transition-all group relative overflow-hidden rounded-xl">
              <div className="flex flex-col gap-2 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-surface-400 uppercase tracking-wider">{stat.label}</span>
                  <stat.icon size={15} className={`opacity-60 group-hover:opacity-100 transition-opacity ${stat.color}`} />
                </div>
                <div className="flex items-baseline justify-between gap-2 mt-1">
                  <span className="text-2xl font-black text-primary">{stat.value}</span>
                  <Badge variant="primary" className={`bg-surface-200/40 text-[9px] font-bold ${stat.color} border-0 px-2 py-0.5`}>{stat.badge}</Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* COMPACT ACTIVE PROJECTS REGISTRY */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-surface-200/80 dark:border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><LayoutDashboard size={16} /></div>
            <h2 className="text-base font-black text-primary tracking-tight">Active Projects</h2>
          </div>
          <Link href="/dashboard/projects">
            <Button size="sm" variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
              View All ({dashboardStats?.project_counts?.total || 0})
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recentProjects.length > 0 ? (
            recentProjects.slice(0, 3).map((project: Project, idx: number) => {
              const progress = project.tasks_count ? ((project.tasks_done_count || 0) / project.tasks_count) * 100 : 0;
              return (
                <motion.div key={project.uid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * idx }}>
                  <Card className="flex flex-col h-full overflow-hidden group bg-surface-50/50 border border-surface-200/80 dark:border-white/10 hover:border-accent/60 transition-all rounded-xl p-3.5 gap-3 justify-between">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center gap-2">
                        <Badge variant="primary" className="text-[9px] px-2 py-0.5 font-bold">{project.status}</Badge>
                        <span className="text-[9px] font-mono text-surface-400 truncate">ID: {project.uid.substring(0,6)}</span>
                      </div>
                      <h3 className="text-sm font-bold text-primary truncate group-hover:text-accent transition-colors" title={project.title}>
                        {project.title}
                      </h3>
                      <p className="text-[10px] text-surface-500 font-semibold truncate flex items-center gap-1">
                        <Briefcase size={11} className="opacity-70 shrink-0" />
                        {project.client_name ? project.client_name : "Architecture Project"}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-surface-200/50">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-surface-500">
                          <span>Progress</span>
                          <span className="text-primary">{project.tasks_done_count || 0} / {project.tasks_count || 0} tasks</span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      <button 
                        onClick={() => router.push(`/dashboard/projects/${project.uid}?tab=data_hub`)}
                        className="w-full py-1.5 bg-surface-200/50 hover:bg-accent hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                      >
                        Open Data Hub <ArrowRight size={12} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          ) : (
            <Card className="col-span-full p-8 border-dashed border-2 border-surface-200 flex flex-col items-center justify-center text-center gap-3 bg-surface-50/50 rounded-xl">
              <Building2 size={24} className="text-surface-400" />
              <div>
                <p className="font-bold text-primary text-sm">No active projects found</p>
                <p className="text-xs text-surface-500 mt-0.5">Create your first project to start organizing blueprints and tasks.</p>
              </div>
              <Button onClick={() => router.push('/dashboard/projects')} size="sm" variant="primary" className="text-[10px] font-bold uppercase tracking-wider">
                Create Project
              </Button>
            </Card>
          )}
        </div>
      </motion.div>

      {/* COMPACT BOTTOM WIDGETS: LEADS & CALENDAR */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
        
        {/* Business Leads Section */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-surface-200/80 dark:border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-info/10 rounded-lg text-info"><Briefcase size={16} /></div>
              <h2 className="text-base font-black text-primary">Business Leads</h2>
              {pendingLeads > 0 && <Badge variant="info" className="text-[9px] px-1.5 py-0.5">{pendingLeads} New</Badge>}
            </div>
            <Link href="/dashboard/leads" className="text-[10px] font-bold text-surface-400 hover:text-primary uppercase tracking-wider transition-colors flex items-center gap-1">
              Manage All <ArrowRight size={12} />
            </Link>
          </div>
          
          {leads.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {leads.slice(0, 4).map((lead, idx) => (
                <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * idx }}>
                  <Card className="p-3 flex flex-col justify-between gap-2.5 border-l-3 border-l-accent hover:border-accent transition-all bg-surface-50/60 rounded-xl">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-xs text-primary truncate block">{lead.client_name}</span>
                          <span className="text-[9px] font-semibold text-surface-400 truncate block mt-0.5">
                            {lead.portfolio_item_title || "General Inquiry"}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-surface-500 font-medium line-clamp-2 italic border-l-2 border-surface-200 pl-2">"{lead.message}"</p>
                    </div>
                    
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="w-full text-[9px] font-bold uppercase tracking-wider py-1"
                      onClick={() => {
                        window.location.href = `/dashboard/projects?lead_id=${lead.id}&client_name=${encodeURIComponent(lead.client_name)}&title=${encodeURIComponent(lead.portfolio_item_title || '')}`;
                      }}
                    >
                      Convert to Project
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-8 border-dashed border-2 border-surface-200 flex flex-col items-center justify-center text-center gap-2 bg-surface-50/50 rounded-xl min-h-[140px]">
              <Briefcase size={20} className="text-surface-400" />
              <p className="font-semibold text-xs text-surface-500">No active leads detected.</p>
            </Card>
          )}
        </div>

        {/* Upcoming Schedule (Compact) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-surface-200/80 dark:border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-warning/10 rounded-lg text-warning"><CalendarClock size={16} /></div>
              <h2 className="text-base font-black text-primary">Schedule</h2>
            </div>
            <Link href="/dashboard/calendar" className="text-[10px] font-bold text-surface-400 hover:text-primary uppercase tracking-wider transition-colors flex items-center gap-1">
              Calendar <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {unifiedSchedule.length > 0 ? (
              unifiedSchedule.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * idx }}>
                  <Card className="p-2.5 flex items-center gap-3 hover:border-primary/30 transition-all bg-surface-50/60 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex flex-col items-center justify-center border border-surface-200 shrink-0 shadow-2xs">
                      <span className={`text-[8px] uppercase font-black ${item.type === 'task' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {item.date.toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-sm font-black text-primary leading-none">
                        {item.date.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col min-w-0 justify-center">
                      <div className="flex items-center gap-1">
                        {item.type === 'task' && <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />}
                        <span className="font-bold text-xs text-primary truncate">{item.title}</span>
                      </div>
                      <span className="text-[9px] font-semibold text-surface-400 mt-0.5 flex items-center gap-1">
                        <Clock size={9} /> {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="p-8 border-dashed border-2 border-surface-200 flex flex-col items-center justify-center text-center gap-2 bg-surface-50/50 rounded-xl min-h-[140px]">
                <Calendar size={20} className="text-surface-400" />
                <p className="text-xs font-semibold text-surface-400">Your schedule is clear.</p>
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
