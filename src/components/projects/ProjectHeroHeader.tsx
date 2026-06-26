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
    const cacheKey = `ap.weather.${Number(lat).toFixed(4)}_${Number(lng).toFixed(4)}`;
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cachedData = JSON.parse(cachedStr);
        if (cachedData.days && cachedData.days.length > 0) {
          const today = cachedData.days[0];
          // Map WMO codes to descriptions
          const code = today.weatherCode;
          let icon = "🌤️";
          let desc = "Clear";
          
          if (code === 0) { icon = "☀️"; desc = "Clear"; }
          else if ([1, 2, 3].includes(code)) { icon = "⛅"; desc = "Cloudy"; }
          else if ([45, 48].includes(code)) { icon = "🌫️"; desc = "Fog"; }
          else if ([51, 53, 55, 56, 57].includes(code)) { icon = "🌦️"; desc = "Drizzle"; }
          else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) { icon = "🌧️"; desc = "Rain"; }
          else if ([71, 73, 75, 77, 85, 86].includes(code)) { icon = "❄️"; desc = "Snow"; }
          else if ([95, 96, 99].includes(code)) { icon = "⛈️"; desc = "Storm"; }

          setWeatherInfo(`${icon} ${desc} — ${today.maxTemp}° / ${today.minTemp}°`);
        }
      } catch (e) { /* ignore */ }
    }
  }, [lat, lng]);

  return (
    <div className="flex items-center gap-3 text-[9px] font-black text-primary/70 dark:text-white/70 uppercase tracking-[0.2em] mb-3">
      {weatherInfo && <span className="flex items-center gap-2 px-2 py-1 bg-white/40 dark:bg-black/20 rounded-md backdrop-blur-md border border-surface-200 dark:border-white/10 shadow-inner text-primary dark:text-white">{weatherInfo}</span>}
      {weatherInfo && <span className="opacity-50 text-primary dark:text-white">·</span>}
      <span className="flex items-center gap-2 px-2 py-1 bg-white/40 dark:bg-black/20 rounded-md backdrop-blur-md border border-surface-200 dark:border-white/10 shadow-inner text-primary dark:text-white">📍 {location || "No Location"}</span>
    </div>
  );
};

export const ProjectHeroHeader: React.FC<ProjectHeroHeaderProps> = ({ project, onStatusChange }) => {
  const [bgClass, setBgClass] = useState("from-primary/5 to-accent/5");
  
  // Decide background gradient based on weather cache (if lat/long exists)
  useEffect(() => {
    if (!project.latitude || !project.longitude) return;
    const cacheKey = `ap.weather.${Number(project.latitude).toFixed(4)}_${Number(project.longitude).toFixed(4)}`;
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cachedData = JSON.parse(cachedStr);
        if (cachedData.days && cachedData.days.length > 0) {
          const code = cachedData.days[0].weatherCode;
          if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) setBgClass("from-slate-900 via-indigo-900/40 to-slate-800"); // Rain
          else if ([95, 96, 99].includes(code)) setBgClass("from-gray-900 via-slate-800 to-black"); // Storm
          else if ([45, 48].includes(code)) setBgClass("from-gray-800 via-slate-700/50 to-gray-900"); // Fog
          else setBgClass("from-sky-900/60 via-blue-900/30 to-slate-900"); // Clear/Cloudy
        }
      } catch (e) { /* ignore */ }
    }
  }, [project.latitude, project.longitude]);

  // Static Map URL
  const staticMapUrl = project.latitude && project.longitude 
    ? `https://staticmap.openstreetmap.de/?center=${project.latitude},${project.longitude}&zoom=14&size=400x200&maptype=mapnik` 
    : null;

  return (
    <header className="relative rounded-[1.5rem] overflow-hidden mb-6 shadow-2xl shadow-primary/10 border-2 border-accent dark:border dark:border-white/5 group bg-white dark:bg-transparent">
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgClass} opacity-5 dark:opacity-100 transition-all duration-1000`} />
      
      {/* Arch Grid Pattern Overlay */}
      <div className="absolute inset-0 arch-grid opacity-[0.05] mix-blend-overlay pointer-events-none" />
      
      {/* Map Decorative Layer */}
      {staticMapUrl && (
        <img 
          src={staticMapUrl} 
          alt=""
          className="absolute right-0 top-0 h-full w-[60%] object-cover opacity-10 blur-[2px] mask-gradient-left pointer-events-none mix-blend-luminosity group-hover:scale-105 transition-transform duration-[20s]" 
        />
      )}

      {/* Adaptive Glass overlay: transparent in light mode (since bg is white), Dark in dark mode */}
      <div className="absolute inset-0 bg-transparent dark:bg-black/50 backdrop-blur-xl transition-colors duration-1000" />

      {/* Content Container */}
      <div className="relative z-10 p-5 md:p-6 flex flex-col h-full min-h-[160px]">
        <WeatherStrip 
          lat={project.latitude != null ? Number(project.latitude) : undefined} 
          lng={project.longitude != null ? Number(project.longitude) : undefined} 
          location={project.location} 
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-5">
          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl md:text-4xl font-black text-primary dark:text-white tracking-tighter drop-shadow-md">
              {project.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-black text-primary/80 dark:text-white/80 uppercase tracking-[0.2em]">
              <span className="bg-surface-200/50 dark:bg-white/10 px-2 py-1 rounded-md shadow-inner text-primary dark:text-white border border-surface-200 dark:border-transparent">{project.project_code || project.uid.substring(0, 8)}</span>
              <span className="opacity-50 text-primary dark:text-white">·</span>
              <span className="flex items-center gap-1.5 text-primary dark:text-white"><span className="w-1.5 h-1.5 rounded-full bg-accent opacity-70" /> {project.account.name}</span>
              {project.client_name && (
                <>
                  <span className="opacity-50 text-primary dark:text-white">·</span>
                  <span className="flex items-center gap-1.5 text-primary dark:text-white"><span className="w-1.5 h-1.5 rounded-full bg-info opacity-70" /> {project.client_name}</span>
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
