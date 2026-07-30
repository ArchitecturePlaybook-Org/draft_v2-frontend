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

  return (
    <header
      className={`relative rounded-[1.5rem] mb-6 shadow-2xl group transition-all duration-300 z-30 ${
        isDark ? "bg-slate-900/90 text-slate-100 border border-slate-800/80" : "bg-surface-card border border-surface-200"
      }`}
    >
      {/* Background layers */}
      <div className="absolute inset-0 rounded-[1.5rem] overflow-hidden pointer-events-none">
        {isDark ? (
          <>
            {/* Dark: rich weather-driven gradient & glowing accent */}
            <div className={`absolute inset-0 bg-gradient-to-br ${bgClass} transition-all duration-1000`} />
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="absolute inset-0 arch-grid opacity-[0.07] mix-blend-overlay" />
            {staticMapUrl && (
              <img
                src={staticMapUrl}
                alt=""
                className="absolute right-0 top-0 h-full w-[60%] object-cover opacity-15 blur-[1px] mask-gradient-left mix-blend-luminosity group-hover:scale-105 transition-transform duration-[20s]"
              />
            )}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xl" />
          </>
        ) : (
          <>
            {/* Light: clean card with subtle accent tint */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
            {staticMapUrl && (
              <img
                src={staticMapUrl}
                alt=""
                className="absolute right-0 top-0 h-full w-[50%] object-cover opacity-5 blur-[3px] mask-gradient-left mix-blend-multiply group-hover:scale-105 transition-transform duration-[20s]"
              />
            )}
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 p-5 md:p-6 flex flex-col h-full min-h-[160px]">
        <WeatherStrip
          lat={project.latitude != null ? Number(project.latitude) : undefined}
          lng={project.longitude != null ? Number(project.longitude) : undefined}
          location={project.location}
          isDark={isDark}
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-5">
          <div className="space-y-2 relative z-10">
            <h1 className={`text-3xl md:text-4xl font-black tracking-tighter drop-shadow-md ${isDark ? "text-white" : "text-primary"}`}>
              {project.title}
            </h1>
            <div className={`flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-slate-300" : "text-primary/80"}`}>
              <span className={`px-2.5 py-1 rounded-lg shadow-sm border font-mono ${isDark ? "bg-slate-800/80 border-slate-700/80 text-amber-400 font-bold" : "bg-surface-200/50 border-surface-200 text-primary"}`}>
                {project.project_code || project.uid.substring(0, 8)}
              </span>
              <span className={isDark ? "text-slate-500 font-bold" : "opacity-50"}>·</span>
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400 opacity-90 shadow-sm" /> {project.account.name}
              </span>
              {project.client_name && (
                <>
                  <span className={isDark ? "text-slate-500 font-bold" : "opacity-50"}>·</span>
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 opacity-90 shadow-sm" /> {project.client_name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-50">
            {readOnly ? (
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${isDark ? "bg-slate-800/80 text-slate-200 border-slate-700" : "bg-surface-100 text-primary border-surface-200"}`}>
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

        <div className="mt-auto">
          <ProjectProgressBar
            tasksTotal={tasksTotal}
            tasksDone={tasksDone}
            budgetUsed={project.budget_used}
            budgetTotal={project.budget_total}
          />
        </div>
      </div>
    </header>
  );
};
