"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Project, ProjectStatus } from "@/types/projects";
import { ProjectStatusDropdown } from "@/components/projects/ProjectStatusDropdown";
import { ProjectActionsMenu } from "@/components/projects/ProjectActionsMenu";
import { ProjectProgressBar } from "@/components/projects/ProjectProgressBar";

interface ProjectHeroHeaderProps {
  project: Project;
  onStatusChange?: (uid: string, newStatus: ProjectStatus) => void;
  onAssignPersonnel?: () => void;
  onCloneProject?: () => void;
  onOpenSettings?: () => void;
  onDeleteProject?: () => void;
  readOnly?: boolean;
}

// Simple internal WeatherStrip component
const WeatherStrip: React.FC<{ lat?: number; lng?: number; location?: string; isDark: boolean }> = ({ lat, lng, location, isDark }) => {
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

  const pillCls = isDark
    ? "bg-slate-800/80 border-slate-700/60 text-slate-200 shadow-sm hover:border-slate-600"
    : "bg-surface-100 border-surface-200 text-primary shadow-sm";
  const dotCls = isDark ? "text-slate-500 font-bold" : "text-primary/50 font-bold";
  const wrapCls = isDark ? "text-slate-300" : "text-primary/70";

  return (
    <div className={`flex flex-wrap items-center gap-2 sm:gap-3 text-[9px] font-black uppercase tracking-[0.2em] mb-3 ${wrapCls}`}>
      {weatherInfo && (
        <span className={`flex items-center gap-2 px-2.5 py-1 rounded-lg backdrop-blur-md border transition-all ${pillCls}`}>
          {weatherInfo}
        </span>
      )}
      {weatherInfo && <span className={dotCls}>·</span>}
      <span className={`flex items-center gap-2 px-2.5 py-1 rounded-lg backdrop-blur-md border transition-all ${pillCls}`}>
        📍 {location || "No Location"}
      </span>
    </div>
  );
};

export const ProjectHeroHeader: React.FC<ProjectHeroHeaderProps> = ({ 
  project, 
  onStatusChange,
  onAssignPersonnel,
  onCloneProject,
  onOpenSettings,
  onDeleteProject,
  readOnly = false
}) => {
  const [bgClass, setBgClass] = useState("from-slate-950 via-slate-900/90 to-slate-950");
  const [isDark, setIsDark] = useState(true);

  // Detect current theme by watching <html> class attribute
  useEffect(() => {
    const checkTheme = () => {
      const cls = document.documentElement.className;
      const hasDarkClass = cls.includes("dark") || cls.includes("theme-dark");
      const isLightTheme = cls.includes("theme-light") || cls.includes("theme-blueprint");
      setIsDark(hasDarkClass || !isLightTheme);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Decide background gradient based on weather cache
  useEffect(() => {
    if (!project.latitude || !project.longitude) return;
    const cacheKey = `ap.weather.${Number(project.latitude).toFixed(4)}_${Number(project.longitude).toFixed(4)}`;
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cachedData = JSON.parse(cachedStr);
        if (cachedData.days && cachedData.days.length > 0) {
          const code = cachedData.days[0].weatherCode;
          if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) setBgClass("from-slate-950 via-indigo-950/70 to-slate-900");
          else if ([95, 96, 99].includes(code)) setBgClass("from-slate-950 via-slate-900 to-black");
          else if ([45, 48].includes(code)) setBgClass("from-slate-950 via-slate-800/70 to-gray-950");
          else setBgClass("from-slate-950 via-blue-950/50 to-slate-900");
        }
      } catch (e) { /* ignore */ }
    }
  }, [project.latitude, project.longitude]);

  const staticMapUrl = project.latitude && project.longitude 
    ? `https://staticmap.openstreetmap.de/?center=${project.latitude},${project.longitude}&zoom=14&size=400x200&maptype=mapnik` 
    : null;

  const tasksTotal = useMemo(() => {
    const tasks = (project as any).tasks;
    if (Array.isArray(tasks)) {
      return tasks.length;
    }
    return project.tasks_count || 0;
  }, [(project as any).tasks, project.tasks_count]);

  const tasksDone = useMemo(() => {
    const tasks = (project as any).tasks;
    if (Array.isArray(tasks)) {
      return tasks.filter((t: any) => {
        const s = (t.status || "").toLowerCase();
        return s === "done" || s === "completed";
      }).length;
    }
    return project.tasks_done_count || 0;
  }, [(project as any).tasks, project.tasks_done_count]);

  const completionPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  return (
    <header
      className={`relative rounded-xl mb-2.5 shadow-sm group transition-all duration-300 z-30 px-3.5 py-2 ${
        isDark ? "bg-slate-900/90 text-slate-100 border border-slate-800/80" : "bg-surface-card border border-surface-200"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
        {/* Left: Project Title, Code & Location */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-md bg-accent/20 text-accent font-black flex items-center justify-center text-xs shrink-0 border border-accent/30">
            🏗️
          </div>

          <div className="flex items-center gap-2 min-w-0 truncate">
            <h1 className={`text-xs sm:text-sm font-extrabold tracking-tight truncate ${isDark ? "text-white" : "text-primary"}`}>
              {project.title}
            </h1>

            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${isDark ? "bg-slate-800 text-amber-400 border border-slate-700" : "bg-surface-200/50 text-primary border border-surface-200"}`}>
              {project.project_code || project.uid.substring(0, 8)}
            </span>

            {project.location && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-surface-400 shrink-0">
                📍 {project.location}
              </span>
            )}
          </div>
        </div>

        {/* Center: Mini Completion Progress Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-100/60 border border-surface-200/50 shrink-0">
          <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent rounded-full transition-all duration-500" 
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-[10px] font-black text-primary font-mono">{completionPct}% Done</span>
          <span className="text-[9px] font-bold text-surface-400">({tasksDone}/{tasksTotal} tasks)</span>
        </div>

        {/* Right: Status Dropdown & Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {readOnly ? (
            <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${isDark ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-surface-100 text-primary border-surface-200"}`}>
              {project.status || "TEMPLATE"}
            </div>
          ) : (
            <>
              <ProjectStatusDropdown
                uid={project.uid}
                status={project.status as ProjectStatus}
                onChange={onStatusChange}
              />
              <ProjectActionsMenu
                project={project}
                onAssignPersonnel={onAssignPersonnel}
                onCloneProject={onCloneProject}
                onOpenSettings={onOpenSettings}
                onDeleteProject={onDeleteProject}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
};
