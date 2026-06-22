"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Project, ProjectStatus } from "@/types/projects";
import { ProjectStatusDropdown } from "@/components/projects/ProjectStatusDropdown";
import { ProjectActionsMenu } from "@/components/projects/ProjectActionsMenu";
import { ProjectProgressBar } from "@/components/projects/ProjectProgressBar";

interface ProjectHeroHeaderProps {
  project: Project;
  onStatusChange?: (uid: string, newStatus: ProjectStatus) => void;
}

// Simple internal WeatherStrip component
const WeatherStrip: React.FC<{ lat?: number; lng?: number; location?: string }> = ({ lat, lng, location }) => {
  const [weatherInfo, setWeatherInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;
    const cacheKey = `ap.weather.${Number(lat).toFixed(2)}_${Number(lng).toFixed(2)}`;
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cachedData = JSON.parse(cachedStr);
        if (cachedData.days && cachedData.days.length > 0) {
          const today = cachedData.days[0];
          // Simplified classify logic
          const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(today.weatherCode);
          const icon = isRain ? "🌧️" : "🌤️";
          setWeatherInfo(`${icon} ${today.maxTemp}° / ${today.minTemp}°`);
        }
      } catch (e) { /* ignore */ }
    }
  }, [lat, lng]);

  return (
    <div className="flex items-center gap-3 text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-4">
      {weatherInfo && <span>{weatherInfo}</span>}
      {weatherInfo && <span>·</span>}
      <span>📍 {location || "No Location"}</span>
    </div>
  );
};

export const ProjectHeroHeader: React.FC<ProjectHeroHeaderProps> = ({ project, onStatusChange }) => {
  const [bgClass, setBgClass] = useState("from-primary/5 to-accent/5");
  
  // Decide background gradient based on weather cache (if lat/long exists)
  useEffect(() => {
    if (!project.latitude || !project.longitude) return;
    const cacheKey = `ap.weather.${Number(project.latitude).toFixed(2)}_${Number(project.longitude).toFixed(2)}`;
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cachedData = JSON.parse(cachedStr);
        if (cachedData.days && cachedData.days.length > 0) {
          const code = cachedData.days[0].weatherCode;
          if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) setBgClass("from-slate-500/20 to-indigo-600/10"); // Rain
          else if ([95, 96, 99].includes(code)) setBgClass("from-gray-700/30 to-slate-800/20"); // Storm
          else if ([45, 48].includes(code)) setBgClass("from-gray-300/20 to-slate-400/10"); // Fog
          else setBgClass("from-sky-400/15 to-blue-600/8"); // Clear/Cloudy
        }
      } catch (e) { /* ignore */ }
    }
  }, [project.latitude, project.longitude]);

  // Static Map URL
  const staticMapUrl = project.latitude && project.longitude 
    ? `https://staticmap.openstreetmap.de/?center=${project.latitude},${project.longitude}&zoom=14&size=400x200&maptype=mapnik` 
    : null;

  return (
    <header className="project-hero-header mb-8">
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgClass} transition-colors duration-1000`} />
      
      {/* Arch Grid Pattern Overlay */}
      <div className="absolute inset-0 arch-grid opacity-[0.03]" />
      
      {/* Map Decorative Layer */}
      {staticMapUrl && (
        <img 
          src={staticMapUrl} 
          alt=""
          className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-[0.08] blur-[1px] mask-gradient-left pointer-events-none" 
        />
      )}

      {/* Glass overlay for text readability */}
      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px]" />

      {/* Content Container */}
      <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
        <WeatherStrip 
          lat={project.latitude != null ? Number(project.latitude) : undefined} 
          lng={project.longitude != null ? Number(project.longitude) : undefined} 
          location={project.location} 
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
              {project.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-surface-500 uppercase tracking-widest">
              <span>{project.project_code || project.uid.substring(0, 8)}</span>
              <span>·</span>
              <span>🏢 {project.account.name}</span>
              {project.client_name && (
                <>
                  <span>·</span>
                  <span>👤 {project.client_name}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <ProjectStatusDropdown 
              uid={project.uid} 
              status={project.status as ProjectStatus} 
              onChange={onStatusChange} 
            />
            <ProjectActionsMenu 
              project={project as any} 
            />
          </div>
        </div>

        <div className="mt-auto">
          <ProjectProgressBar 
            tasksTotal={project.tasks_count || 0} 
            tasksDone={project.tasks_done_count || 0}
            budgetUsed={project.budget_used}
            budgetTotal={project.budget_total}
          />
        </div>
      </div>
    </header>
  );
};
