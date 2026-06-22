"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { projectsApi } from "@/domains/projects/api";
import { eventsApi, Event } from "@/domains/events/api";
import { leadsApi, Lead } from "@/domains/leads/api";
import { Project } from "@/types/projects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calculateProfileCompleteness } from "@/lib/utils/profile";
import { fetchFromBff } from "@/shared/api/fetchFromBff";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useAuthStore();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rollupRes, eventsRes, leadsRes] = await Promise.all([
          fetchFromBff<any>("/api/v1/core/dashboard-rollup/", { method: "GET" }),
          eventsApi.listEvents(),
          leadsApi.listLeads(),
        ]);
        
        setDashboardStats(rollupRes);
        const eventsList = Array.isArray(eventsRes) ? eventsRes : (eventsRes as any).results;
        
        setEvents(eventsList || []);
        setLeads(leadsRes || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (isUserLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-surface-400 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  const activeProjectsCount = dashboardStats?.project_counts?.active || 0;
  const recentProjects = dashboardStats?.recent_projects || [];
  const upcomingEvents = events.slice(0, 5); // Show first 5
  const integrity = calculateProfileCompleteness(user);

  const overdueTasks = dashboardStats?.task_counts?.overdue || 0;
  const pendingLeads = leads.filter(l => l.status === 'PENDING').length;
  
  // Calculate next event time
  let nextEventStr = null;
  if (events.length > 0) {
    const nextEventDate = new Date(events[0].event_date);
    const diffHours = Math.round((nextEventDate.getTime() - Date.now()) / (1000 * 60 * 60));
    if (diffHours > 0 && diffHours < 48) {
      nextEventStr = `Next event in ${diffHours} hours`;
    } else if (diffHours <= 0) {
      nextEventStr = `Event happening now`;
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">
          {getGreeting()}, {user?.name?.split(" ")[0] || "User"}
        </h1>
        <p className="text-surface-500 font-medium">Here's what's happening with your projects today.</p>
      </div>

      {/* Contextual Alert Panel */}
      {(overdueTasks > 0 || pendingLeads > 0 || nextEventStr) && (
        <div className="flex flex-col md:flex-row gap-4 mb-2 animate-in slide-in-from-top-4">
          {overdueTasks > 0 && (
            <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between group cursor-pointer" onClick={() => router.push('/dashboard/projects')}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🔴</span>
                <div>
                  <h4 className="text-red-800 font-bold text-sm">Attention Required</h4>
                  <p className="text-red-600 text-xs font-medium">{overdueTasks} tasks are overdue across your projects</p>
                </div>
              </div>
              <span className="text-red-400 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          )}
          {pendingLeads > 0 && (
            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between group cursor-pointer" onClick={() => router.push('/dashboard/leads')}>
              <div className="flex items-center gap-3">
                <span className="text-xl">💼</span>
                <div>
                  <h4 className="text-blue-800 font-bold text-sm">New Opportunities</h4>
                  <p className="text-blue-600 text-xs font-medium">{pendingLeads} unread business leads waiting</p>
                </div>
              </div>
              <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          )}
          {nextEventStr && (
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between group cursor-pointer" onClick={() => router.push('/dashboard/calendar')}>
              <div className="flex items-center gap-3">
                <span className="text-xl">📅</span>
                <div>
                  <h4 className="text-amber-800 font-bold text-sm">Upcoming Schedule</h4>
                  <p className="text-amber-700 text-xs font-medium">{nextEventStr}</p>
                </div>
              </div>
              <span className="text-amber-400 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          )}
        </div>
      )}

      {/* Gamified Profile Completeness or Reputation Card */}
      {!integrity.isComplete ? (
        <Card className="p-6 bg-primary/5 border-primary/20 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h2 className="text-lg font-bold text-primary">Profile Integrity Checklist</h2>
              </div>
              <p className="text-sm text-surface-600">
                You are {integrity.score}% complete. Finish your setup to unlock your Professional Reputation Score.
              </p>
              
              <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-surface-200 mt-2">
                <div 
                  className="h-full bg-accent transition-all duration-1000 ease-out relative" 
                  style={{ width: `${integrity.score}%` }}
                />
              </div>
            </div>
            <Link href="/dashboard/profile">
              <Button variant="primary" className="whitespace-nowrap px-8 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                Complete Setup
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-6 bg-gradient-to-r from-surface-900 to-primary relative overflow-hidden text-white border-0 shadow-xl shadow-primary/20">
          <div className="absolute top-0 right-0 w-full h-full arch-grid opacity-10 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                  <span className="text-2xl">🥈</span>
                </div>
                <div>
                  <h2 className="text-[10px] font-bold text-white/50 uppercase tracking-[0.3em]">Professional Reputation</h2>
                  <p className="text-xl font-bold tracking-tight">Established Professional</p>
                </div>
              </div>
            </div>
            <div className="md:pl-8 md:border-l border-white/10 flex flex-col items-center md:items-end gap-2 text-center md:text-right shrink-0">
               <span className="text-3xl font-bold font-mono">320</span>
               <span className="text-[9px] font-bold text-white/50 uppercase tracking-[0.3em]">Total XP</span>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-surface-200 shadow-sm hover:border-primary/30 transition-colors">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">Active Projects</span>
            <span className="text-4xl font-black text-primary">{activeProjectsCount}</span>
            <div className="mt-2">
              <Badge variant="primary" icon>In Progress</Badge>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border-surface-200 shadow-sm hover:border-primary/30 transition-colors">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">Project Tasks</span>
            <span className="text-4xl font-black text-primary">{dashboardStats?.task_counts?.total || 0}</span>
            <div className="mt-2 flex gap-2">
              <Badge variant="success" icon>{dashboardStats?.task_counts?.done || 0} Done</Badge>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border-surface-200 shadow-sm hover:border-primary/30 transition-colors">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">Upcoming Events</span>
            <span className="text-4xl font-black text-primary">{events.length}</span>
            <div className="mt-2">
              <Badge variant="info" icon>Next 7 Days</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Projects (Elevated Priority) */}
      <div className="flex flex-col gap-6 mt-4">
        <div className="flex items-center justify-between border-b border-surface-200 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏗️</span>
            <h2 className="text-2xl font-extrabold text-primary tracking-tight">Your Active Projects</h2>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/projects">
              <Button variant="outline" className="text-xs font-bold uppercase tracking-widest">View Registry</Button>
            </Link>
            <Link href="/dashboard/projects">
              <Button variant="primary" className="text-xs font-bold uppercase tracking-widest shadow-md hover:shadow-lg">+ New Project</Button>
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {recentProjects.length > 0 ? (
            recentProjects.slice(0, 3).map((project: Project) => (
              <Card key={project.uid} className="flex flex-col overflow-hidden group hover:border-accent hover:shadow-xl transition-all duration-300">
                <div className="p-6 border-b border-surface-100 bg-surface-50 group-hover:bg-accent/5 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={project.status === "Completed" ? "success" : "primary"}>
                      {project.status}
                    </Badge>
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Updated Today</span>
                  </div>
                  <h3 className="text-lg font-bold text-primary truncate" title={project.title}>{project.title}</h3>
                  <p className="text-xs text-surface-500 font-medium truncate mt-1">
                    {project.client_name ? `Client: ${project.client_name}` : `Code: ${project.uid.substring(0,8)}`}
                  </p>
                </div>
                
                <div className="p-6 flex flex-col gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-surface-600">
                      <span>Tasks Progress</span>
                      <span>{project.tasks_done_count || 0} / {project.tasks_count || 0}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000"
                        style={{ width: `${project.tasks_count ? ((project.tasks_done_count || 0) / project.tasks_count) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button 
                      onClick={() => router.push(`/dashboard/projects/${project.uid}?tab=kanban`)}
                      className="w-full py-2 bg-surface-100 text-primary hover:bg-accent hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <span>📋</span> Open Kanban
                    </button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="col-span-full p-12 border-dashed border-2 flex flex-col items-center justify-center text-center gap-4 bg-surface-50/50">
              <span className="text-5xl opacity-20">🏗️</span>
              <p className="font-bold text-primary text-lg">No active projects found.</p>
              <Button onClick={() => router.push('/dashboard/projects')} variant="primary" className="mt-2 text-xs font-bold uppercase tracking-widest">Create Your First Project</Button>
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        {/* Business Leads Section (Moved down) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-surface-200 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-primary">Business Leads</h2>
              {pendingLeads > 0 && <Badge variant="info">{pendingLeads} New</Badge>}
            </div>
            <Link href="/dashboard/leads" className="text-[10px] font-bold text-surface-400 hover:text-primary uppercase tracking-widest transition-colors">Manage All</Link>
          </div>
          
          {leads.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leads.slice(0, 4).map((lead) => (
                <Card key={lead.id} className="p-5 flex flex-col justify-between gap-4 border-l-4 border-l-accent hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-primary">{lead.client_name}</span>
                        <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Source: {lead.portfolio_item_title || "General"}</span>
                      </div>
                    </div>
                    <p className="text-xs text-surface-600 line-clamp-2 italic border-l-2 border-surface-200 pl-3">"{lead.message}"</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="flex-1 text-[10px] font-bold uppercase tracking-widest bg-accent hover:bg-primary"
                      onClick={() => {
                        window.location.href = `/dashboard/projects?lead_id=${lead.id}&client_name=${encodeURIComponent(lead.client_name)}&title=${encodeURIComponent(lead.portfolio_item_title || '')}`;
                      }}
                    >
                      Convert
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center gap-4 bg-surface-50/50">
              <span className="text-4xl opacity-20">💼</span>
              <p className="font-bold text-surface-500">No active leads detected.</p>
            </Card>
          )}
        </div>

        {/* Upcoming Events (Compact) */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-surface-200 pb-4">
            <h2 className="text-xl font-bold text-primary">Schedule</h2>
            <Link href="/dashboard/calendar" className="text-[10px] font-bold text-surface-400 hover:text-primary uppercase tracking-widest transition-colors">Calendar</Link>
          </div>

          <div className="flex flex-col gap-3">
            {events.length > 0 ? (
              upcomingEvents.map((event) => (
                <Card key={event.id} className="p-4 flex items-center gap-4 hover:border-surface-300 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-surface-100 flex flex-col items-center justify-center border border-surface-200 shrink-0">
                    <span className="text-[9px] uppercase font-bold text-surface-500">
                      {new Date(event.event_date).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-lg font-black text-primary leading-none">
                      {new Date(event.event_date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <span className="font-bold text-sm text-primary truncate">{event.title}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-surface-400">
                      {event.event_type} • {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2">
                <span className="text-3xl opacity-20">📅</span>
                <p className="text-xs font-bold text-surface-400">No upcoming events.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
