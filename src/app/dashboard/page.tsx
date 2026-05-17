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

export default function DashboardPage() {
  const { user, isLoading: isUserLoading } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, eventsRes, leadsRes] = await Promise.all([
          projectsApi.getProjects(),
          eventsApi.listEvents(),
          leadsApi.listLeads(),
        ]);
        
        // Handle paginated or array response for projects and events
        const projectsList = Array.isArray(projectsRes) ? projectsRes : projectsRes.results;
        const eventsList = Array.isArray(eventsRes) ? eventsRes : (eventsRes as any).results;
        
        setProjects(projectsList || []);
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
        <p className="text-(--gray-400) text-sm">Loading dashboard...</p>
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status !== "Completed");
  const upcomingEvents = events.slice(0, 5); // Show first 5

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          {getGreeting()}, {user?.name?.split(" ")[0] || "User"}
        </h1>
        <p className="text-(--gray-600)">Here's what's happening with your projects today.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-(--gray-400)">Active Projects</span>
            <span className="text-3xl font-bold text-foreground">{activeProjects.length}</span>
            <div className="mt-2">
              <Badge variant="primary" icon>In Progress</Badge>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-(--gray-400)">Upcoming Events</span>
            <span className="text-3xl font-bold text-foreground">{events.length}</span>
            <div className="mt-2">
              <Badge variant="info" icon>Next 7 Days</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-(--primary)/5 border-(--primary)/20!">
          <div className="flex flex-col gap-4 h-full justify-between">
            <div>
              <span className="text-sm font-medium text-(--primary) opacity-80">Quick Start</span>
              <p className="text-sm text-foreground/70 mt-1">Ready to start a new architectural blueprint?</p>
            </div>
            <Link href="/dashboard/projects">
              <Button className="w-full">Create New Project</Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Business Leads Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">Business Leads</h2>
            <Badge variant="info">{leads.filter(l => l.status === 'PENDING').length} New</Badge>
          </div>
          <Link href="/dashboard/leads" className="text-sm text-(--primary) hover:underline">Manage All Leads</Link>
        </div>
        
        {leads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {leads.slice(0, 3).map((lead) => (
              <Card key={lead.id} className="p-5 flex flex-col justify-between gap-4 border-l-4 border-l-accent!">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground">{lead.client_name}</span>
                      <span className="text-[10px] text-(--gray-500) uppercase tracking-widest">Inquiry Source: {lead.portfolio_item_title || "General"}</span>
                    </div>
                    <Badge variant={lead.status === 'PENDING' ? 'warning' : 'success'}>{lead.status}</Badge>
                  </div>
                  <p className="text-xs text-(--gray-600) line-clamp-2 italic">"{lead.message}"</p>
                  
                  {lead.metadata && (
                    <div className="flex gap-2">
                      {lead.metadata.project_type && (
                        <span className="text-[9px] font-bold text-surface-400 border border-surface-200 px-2 py-0.5 rounded-full">{lead.metadata.project_type}</span>
                      )}
                      {lead.metadata.budget_range && (
                        <span className="text-[9px] font-bold text-accent bg-accent/5 px-2 py-0.5 rounded-full">{lead.metadata.budget_range}</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="flex-1 text-[10px] font-bold uppercase tracking-widest"
                    onClick={() => {
                      // Logic to convert to project
                      window.location.href = `/dashboard/projects?lead_id=${lead.id}&client_name=${encodeURIComponent(lead.client_name)}&title=${encodeURIComponent(lead.portfolio_item_title || '')}`;
                    }}
                  >
                    Convert to Project
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="px-3"
                    onClick={async () => {
                      if (confirm("Reject this lead?")) {
                        await leadsApi.updateLeadStatus(lead.id, 'REJECTED');
                        setLeads(leads.filter(l => l.id !== lead.id));
                      }
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center gap-4 bg-surface-50/50">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center text-3xl opacity-50">💼</div>
            <div className="space-y-1">
              <p className="font-bold text-foreground">No active leads detected</p>
              <p className="text-xs text-(--gray-500) max-w-xs">Your portfolio is active. When clients show interest in your work, they will appear here as actionable leads.</p>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Recent Projects</h2>
            <Link href="/dashboard/projects" className="text-sm text-(--primary) hover:underline">View All</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            {projects.length > 0 ? (
              projects.slice(0, 3).map((project) => (
                <Card key={project.uid} className="p-4 flex items-center justify-between group">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-foreground group-hover:text-(--primary) transition-colors">
                      {project.title}
                    </span>
                    <span className="text-xs text-(--gray-500) line-clamp-1">{project.description}</span>
                  </div>
                  <Badge 
                    variant={project.status === "Completed" ? "success" : project.status === "To Start" ? "secondary" : "warning"}
                  >
                    {project.status}
                  </Badge>
                </Card>
              ))
            ) : (
              <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2">
                <span className="text-3xl opacity-20">🏗️</span>
                <p className="text-sm text-(--gray-500)">No projects found. Create your first one!</p>
              </Card>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Upcoming Events</h2>
            <Link href="/dashboard/calendar" className="text-sm text-(--primary) hover:underline">Full Calendar</Link>
          </div>

          <div className="flex flex-col gap-3">
            {events.length > 0 ? (
              upcomingEvents.map((event) => (
                <Card key={event.id} className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-(--surface-300)/20 flex flex-col items-center justify-center border border-(--surface-300)/30">
                    <span className="text-[10px] uppercase font-bold text-(--gray-500)">
                      {new Date(event.event_date).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {new Date(event.event_date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="font-semibold text-foreground">{event.title}</span>
                    <span className="text-xs text-(--gray-500)">
                      {event.event_type} • {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2">
                <span className="text-3xl opacity-20">📅</span>
                <p className="text-sm text-(--gray-500)">No upcoming events scheduled.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
