"use client";

import React, { useState } from "react";
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { motion, Variants } from "framer-motion";
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
  Plus,
  Clock
} from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function DashboardView() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useAuthStore();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

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
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4">
        <div className="w-12 h-12 border-4 border-surface-200 border-t-primary rounded-full animate-spin" />
        <p className="text-surface-400 text-sm font-medium tracking-widest uppercase animate-pulse">Initializing Interface...</p>
      </div>
    );
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
        // Only include tasks that are not done and are upcoming or today
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
  
  // Calculate next event time
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
      className="flex flex-col gap-8 pb-12 w-full max-w-7xl mx-auto"
    >
      {/* HEADER SECTION */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-primary mb-2 flex items-center gap-2">
          {getGreeting()}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">{user?.name?.split(" ")[0] || "User"}</span>
        </h1>
        <p className="text-surface-500 font-medium text-lg">Your architectural command center is online.</p>
      </motion.div>

      {/* CONTEXTUAL ALERT PANEL */}
      {(overdueTasks > 0 || pendingLeads > 0 || nextEventStr) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          {overdueTasks > 0 && (
            <motion.div whileHover={{ scale: 1.02, y: -2 }} className="bg-error/10 border border-error/20 rounded-2xl p-5 flex items-center justify-between group cursor-pointer backdrop-blur-md shadow-lg shadow-error/5 transition-all" onClick={() => router.push('/dashboard/projects')}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-error/20 rounded-xl text-error group-hover:scale-110 transition-transform"><AlertCircle size={24} /></div>
                <div>
                  <h4 className="text-error font-bold text-sm tracking-wide">Attention Required</h4>
                  <p className="text-error/80 text-xs font-semibold mt-0.5">{overdueTasks} tasks overdue</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-error/50 group-hover:text-error group-hover:translate-x-1 transition-all" />
            </motion.div>
          )}
          {pendingLeads > 0 && (
            <motion.div whileHover={{ scale: 1.02, y: -2 }} className="bg-info/10 border border-info/20 rounded-2xl p-5 flex items-center justify-between group cursor-pointer backdrop-blur-md shadow-lg shadow-info/5 transition-all" onClick={() => router.push('/dashboard/leads')}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-info/20 rounded-xl text-info group-hover:scale-110 transition-transform"><Briefcase size={24} /></div>
                <div>
                  <h4 className="text-info font-bold text-sm tracking-wide">New Opportunities</h4>
                  <p className="text-info/80 text-xs font-semibold mt-0.5">{pendingLeads} unread leads</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-info/50 group-hover:text-info group-hover:translate-x-1 transition-all" />
            </motion.div>
          )}
          {nextEventStr && (
            <motion.div whileHover={{ scale: 1.02, y: -2 }} className="bg-warning/10 border border-warning/20 rounded-2xl p-5 flex items-center justify-between group cursor-pointer backdrop-blur-md shadow-lg shadow-warning/5 transition-all" onClick={() => router.push('/dashboard/calendar')}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/20 rounded-xl text-warning group-hover:scale-110 transition-transform"><Calendar size={24} /></div>
                <div>
                  <h4 className="text-warning font-bold text-sm tracking-wide">Upcoming Schedule</h4>
                  <p className="text-warning/80 text-xs font-semibold mt-0.5">{nextEventStr}</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-warning/50 group-hover:text-warning group-hover:translate-x-1 transition-all" />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Profile Setup / Reputation */}
      <motion.div variants={itemVariants}>
        {!integrity.isComplete ? (
          <Card className="p-6 md:p-8 bg-surface-100/50 backdrop-blur-xl border border-surface-200 relative overflow-hidden shadow-lg shadow-surface-900/5 group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex-1 space-y-4 w-full">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="text-accent" size={28} />
                  <h2 className="text-xl font-bold text-primary tracking-tight">Profile Integrity Checklist</h2>
                </div>
                <p className="text-sm font-medium text-surface-500 max-w-2xl">
                  You are <span className="text-accent font-bold">{integrity.score}% complete</span>. Finish your setup to unlock your Public Portfolio and Professional Reputation Score.
                </p>
                <div className="w-full h-3 bg-surface-200 rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${integrity.score}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-accent relative"
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                  </motion.div>
                </div>
              </div>
              <Link href="/dashboard/profile" className="shrink-0 w-full md:w-auto">
                <Button variant="primary" className="w-full whitespace-nowrap px-8 py-6 font-bold uppercase tracking-widest text-xs shadow-xl shadow-accent/20 hover:shadow-accent/40 transition-all">
                  Complete Setup
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-6 md:p-8 bg-gradient-to-br from-surface-900 via-surface-800 to-primary relative overflow-hidden border border-surface-700 shadow-2xl shadow-primary/20 group">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
            <div className="absolute top-0 right-0 w-full h-full arch-grid animate-pan-grid opacity-20 pointer-events-none transition-transform duration-1000 group-hover:scale-105" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/30 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform duration-500">
                    <Medal size={32} className="text-accent" />
                  </div>
                  <div>
                    <h2 className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-1">Professional Reputation</h2>
                    <p className="text-2xl md:text-3xl font-black tracking-tight text-white">Established Professional</p>
                  </div>
                </div>
              </div>
              <div className="md:pl-10 md:border-l border-white/10 flex flex-col items-center md:items-end gap-1 text-center md:text-right shrink-0">
                 <span className="text-4xl md:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">320</span>
                 <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Total XP</span>
              </div>
            </div>
          </Card>
        )}
      </motion.div>

      {/* STATS OVERVIEW GRID */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Active Projects", value: activeProjectsCount, icon: Building2, color: "text-accent", shadowColor: "shadow-[0_10px_40px_-10px_rgba(212,175,55,0.3)] border-accent/40", badge: "In Progress", sparkPoints: "0,10 5,8 10,12 15,6 20,10 25,5 30,8" },
          { label: "Project Tasks", value: dashboardStats?.task_counts?.total || 0, icon: CheckCircle2, color: "text-success", shadowColor: "shadow-[0_10px_40px_-10px_rgba(52,211,153,0.3)] border-success/40", badge: `${dashboardStats?.task_counts?.done || 0} Done`, sparkPoints: "0,15 5,12 10,10 15,8 20,5 25,2 30,0" },
          { label: "Upcoming Events", value: events.length, icon: CalendarClock, color: "text-info", shadowColor: "shadow-[0_10px_40px_-10px_rgba(0,136,204,0.3)] border-info/40", badge: "Next 7 Days", sparkPoints: "0,5 5,10 10,8 15,12 20,10 25,15 30,12" },
        ].map((stat, idx) => (
          <motion.div whileHover={{ y: -5, scale: 1.02 }} key={idx}>
            <Card className={`p-6 border border-surface-200 bg-surface-50/50 backdrop-blur-xl transition-all duration-500 group relative overflow-hidden h-full hover:${stat.shadowColor}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.03] rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-transform duration-500 group-hover:scale-150 ${stat.color}`} />
              
              <div className="absolute bottom-0 right-0 left-0 h-16 opacity-10 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none">
                <svg viewBox="0 0 30 15" preserveAspectRatio="none" className={`w-full h-full fill-none stroke-current stroke-[0.5] ${stat.color}`}>
                  <motion.polyline 
                    points={stat.sparkPoints}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: idx * 0.2, ease: "easeOut" }}
                  />
                  <polygon points={`0,15 ${stat.sparkPoints} 30,15`} className="fill-current opacity-20 border-none" />
                </svg>
              </div>

              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-surface-400 uppercase tracking-widest">{stat.label}</span>
                  <stat.icon size={18} className={`opacity-50 group-hover:opacity-100 transition-opacity ${stat.color}`} />
                </div>
                <span className="text-4xl md:text-5xl font-black text-primary">{stat.value}</span>
                <div className="mt-2 flex items-center">
                  <Badge variant="primary" className={`bg-background/80 backdrop-blur-md border-surface-200 font-bold ${stat.color} shadow-sm group-hover:border-current/30 transition-colors`}>{stat.badge}</Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ACTIVE PROJECTS (Registry) */}
      <motion.div variants={itemVariants} className="flex flex-col gap-6 mt-4">
        <div className="flex items-center justify-between border-b border-surface-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><LayoutDashboard size={20} /></div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Active Projects</h2>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/projects">
              <Button variant="outline" className="text-xs font-bold uppercase tracking-widest bg-background/50 backdrop-blur-md hover:bg-primary hover:text-background transition-colors">View Registry</Button>
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {recentProjects.length > 0 ? (
            recentProjects.slice(0, 3).map((project: Project, idx: number) => {
              const progress = project.tasks_count ? ((project.tasks_done_count || 0) / project.tasks_count) * 100 : 0;
              return (
                <motion.div 
                  key={project.uid} 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: 0.1 * idx }}
                  whileHover={{ rotateY: 2, rotateX: -2, y: -5, z: 20 }}
                  style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                  className="h-full"
                >
                  <Card className="flex flex-col h-full overflow-hidden group bg-surface-50/40 backdrop-blur-xl border border-surface-200 hover:border-accent hover:shadow-[0_20px_40px_-15px_rgba(212,175,55,0.2)] transition-all duration-500">
                    <div className="p-6 border-b border-surface-200/50 relative overflow-hidden bg-background/50" style={{ transform: "translateZ(30px)" }}>
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <Badge variant={project.status === "Completed" ? "primary" : "primary"} className="shadow-sm">
                          {project.status}
                        </Badge>
                        <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest bg-surface-200/50 px-2 py-1 rounded-md">Updated Today</span>
                      </div>
                      <h3 className="text-xl font-bold text-primary truncate relative z-10 group-hover:text-accent transition-colors" title={project.title}>{project.title}</h3>
                      <p className="text-xs text-surface-500 font-medium truncate mt-1 relative z-10 flex items-center gap-1.5">
                        <Briefcase size={12} className="opacity-70" />
                        {project.client_name ? project.client_name : `Code: ${project.uid.substring(0,8)}`}
                      </p>
                    </div>
                    
                    <div className="p-6 flex flex-col gap-6 flex-1 justify-between bg-surface-50/20">
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-surface-500">
                          <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Tasks Progress</span>
                          <span className="text-primary">{project.tasks_done_count || 0} / {project.tasks_count || 0}</span>
                        </div>
                        <div className="h-2 w-full bg-surface-200 rounded-full overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, delay: 0.2 }}
                            className="h-full bg-gradient-to-r from-primary to-accent relative"
                          >
                            <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                          </motion.div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => router.push(`/dashboard/projects/${project.uid}?tab=kanban`)}
                        className="w-full py-3 bg-surface-200/50 text-primary hover:bg-accent hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group/btn border border-transparent hover:border-accent/50 hover:shadow-lg hover:shadow-accent/20"
                      >
                        Open Kanban <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          ) : (
            <Card className="col-span-full p-16 border-dashed border-2 border-surface-200 flex flex-col items-center justify-center text-center gap-5 bg-surface-50/50 backdrop-blur-sm rounded-3xl">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center border border-surface-200 shadow-inner">
                <Building2 size={32} className="text-surface-400" />
              </motion.div>
              <div>
                <p className="font-bold text-primary text-xl">No active projects found</p>
                <p className="text-sm font-medium text-surface-500 mt-1 max-w-sm mx-auto">Your registry is currently empty. Create your first project to start organizing tasks and sketches.</p>
              </div>
              <Button onClick={() => router.push('/dashboard/projects')} variant="primary" className="mt-2 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20">Create Your First Project</Button>
            </Card>
          )}
        </div>
      </motion.div>

      {/* GLOBAL ANALYTICS SECTION (Temporarily Hidden) */}
      {/* 
      <motion.div variants={itemVariants} className="flex flex-col gap-6 mt-4">
        <div className="flex items-center justify-between border-b border-surface-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg text-accent"><LayoutDashboard size={20} /></div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Global Analytics</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-surface-50/50 backdrop-blur-xl border border-surface-200 hover:shadow-[0_10px_40px_-10px_rgba(212,175,55,0.15)] transition-all duration-500 group relative overflow-hidden h-[350px] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-primary">Financial Overview</h3>
                <p className="text-xs text-surface-500 font-medium">Estimated Cost vs Actual Burn</p>
              </div>
              <Badge variant="warning" className="bg-warning/10 text-warning border-warning/20">6 Months</Badge>
            </div>
            
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardStats?.financial_overview || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEstimated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="month" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="estimated" name="Estimated Cost" stroke="#d4af37" strokeWidth={3} fillOpacity={1} fill="url(#colorEstimated)" />
                  <Area type="monotone" dataKey="actual" name="Actual Burn" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 bg-surface-50/50 backdrop-blur-xl border border-surface-200 hover:shadow-[0_10px_40px_-10px_rgba(52,211,153,0.15)] transition-all duration-500 group relative overflow-hidden h-[350px] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-primary">Team Velocity</h3>
                <p className="text-xs text-surface-500 font-medium">Tasks Assigned vs Completed</p>
              </div>
              <Badge variant="success" className="bg-success/10 text-success border-success/20">7 Days</Badge>
            </div>
            
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardStats?.velocity_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="day" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                  />
                  <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} opacity={0.8} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </motion.div>
      */}

      {/* BOTTOM WIDGETS: LEADS & CALENDAR */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        {/* Business Leads Section */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-surface-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg text-info"><Briefcase size={20} /></div>
              <h2 className="text-xl font-bold text-primary">Business Leads</h2>
              {pendingLeads > 0 && <Badge variant="info" className="animate-pulse">{pendingLeads} New</Badge>}
            </div>
            <Link href="/dashboard/leads" className="text-[10px] font-bold text-surface-400 hover:text-primary uppercase tracking-widest transition-colors flex items-center gap-1 group">
              Manage All <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          {leads.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leads.slice(0, 4).map((lead, idx) => (
                <motion.div key={lead.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * idx }}>
                  <Card className="p-5 flex flex-col justify-between gap-4 border-l-4 border-l-accent hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:border-accent/80 transition-all duration-300 bg-surface-50/60 backdrop-blur-xl group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-accent/0 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                    <div className="space-y-3 relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-bold text-base text-primary group-hover:text-accent transition-colors">{lead.client_name}</span>
                          <span className="text-[9px] font-black text-surface-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-70" /> Source: {lead.portfolio_item_title || "General Inquiry"}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-surface-500 font-medium line-clamp-2 italic border-l-2 border-surface-200 pl-3">"{lead.message}"</p>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="flex-1 text-[10px] font-bold uppercase tracking-widest shadow-md shadow-primary/20"
                        onClick={() => {
                          window.location.href = `/dashboard/projects?lead_id=${lead.id}&client_name=${encodeURIComponent(lead.client_name)}&title=${encodeURIComponent(lead.portfolio_item_title || '')}`;
                        }}
                      >
                        Convert to Project
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-12 border-dashed border-2 border-surface-200 flex flex-col items-center justify-center text-center gap-4 bg-surface-50/50 rounded-2xl h-full min-h-[200px]">
              <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center text-surface-300"><Briefcase size={24} /></div>
              <p className="font-bold text-surface-500">No active leads detected.</p>
            </Card>
          )}
        </div>

        {/* Upcoming Events (Compact) */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-surface-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg text-warning"><CalendarClock size={20} /></div>
              <h2 className="text-xl font-bold text-primary">Schedule</h2>
            </div>
            <Link href="/dashboard/calendar" className="text-[10px] font-bold text-surface-400 hover:text-primary uppercase tracking-widest transition-colors flex items-center gap-1 group">
              Calendar <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {unifiedSchedule.length > 0 ? (
              unifiedSchedule.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * idx }}>
                  <Card className="p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-md transition-all duration-300 bg-surface-50/60 backdrop-blur-sm group cursor-default">
                    <div className={`w-14 h-14 rounded-xl bg-background flex flex-col items-center justify-center border border-surface-200 shrink-0 shadow-sm transition-colors ${
                      item.type === 'task' ? 'group-hover:border-success/20 group-hover:bg-success/5' : 'group-hover:border-primary/20 group-hover:bg-primary/5'
                    }`}>
                      <span className={`text-[9px] uppercase font-black ${item.type === 'task' ? 'text-success' : 'text-error'}`}>
                        {item.date.toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-xl font-black text-primary leading-none mt-0.5">
                        {item.date.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col min-w-0 justify-center">
                      <div className="flex items-center gap-1.5">
                        {item.type === 'task' && <CheckCircle2 size={12} className="text-success shrink-0" />}
                        <span className="font-bold text-sm text-primary truncate group-hover:text-accent transition-colors">{item.title}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mt-1 flex items-center gap-1.5">
                        <Clock size={10} /> {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="p-12 border-dashed border-2 border-surface-200 flex flex-col items-center justify-center text-center gap-4 bg-surface-50/50 rounded-2xl h-full min-h-[200px]">
                <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center text-surface-300"><Calendar size={24} /></div>
                <p className="text-sm font-bold text-surface-400">Your schedule is clear.</p>
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
