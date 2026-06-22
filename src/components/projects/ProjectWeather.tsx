import React, { useEffect, useState } from "react";
import { Project } from "@/types/projects";
import { Cloud, CloudRain, CloudSnow, CloudLightning, Sun, CloudFog } from "lucide-react";
import { toast } from "sonner";

interface ProjectWeatherProps {
  project: Project;
}

interface WeatherData {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  windspeed_10m_max: number[];
}

interface ProcessedDay {
  date: string;
  code: number;
  max: number;
  min: number;
  precipitation: number;
  windspeed: number;
}

export default function ProjectWeather({ project }: ProjectWeatherProps) {
  const [forecast, setForecast] = useState<ProcessedDay[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!project.latitude || !project.longitude) return;

    const lat = Number(project.latitude).toFixed(4);
    const lng = Number(project.longitude).toFixed(4);
    const cacheKey = `ap.weather.${lat}_${lng}`;

    const fetchWeather = async () => {
      setLoading(true);
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Check TTL (1 hour)
          if (Date.now() - parsed.timestamp < 3600 * 1000) {
            setForecast(parsed.data);
            setLoading(false);
            return;
          }
        }

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto&forecast_days=15`);
        if (!res.ok) throw new Error("Failed to fetch weather");
        
        const data = await res.json();
        const daily: WeatherData = data.daily;
        
        const processed: ProcessedDay[] = daily.time.map((timeStr, idx) => ({
          date: timeStr,
          code: daily.weathercode[idx],
          max: daily.temperature_2m_max[idx],
          min: daily.temperature_2m_min[idx],
          precipitation: daily.precipitation_sum[idx],
          windspeed: daily.windspeed_10m_max[idx],
        }));

        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          data: processed
        }));

        setForecast(processed);
      } catch (err: any) {
        console.error("Weather fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [project.latitude, project.longitude]);

  if (!project.latitude || !project.longitude) return null;
  if (loading && !forecast) {
    return (
      <div className="bg-white rounded-3xl border border-surface-200 shadow-sm p-6 flex flex-col items-center justify-center h-[280px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-surface-500 font-bold text-xs uppercase tracking-widest">Loading Forecast...</p>
      </div>
    );
  }
  
  if (!forecast) return null;

  const classifyWMOCode = (code: number) => {
    // 0-2: Clear/Partly Cloudy
    if (code <= 2) return { label: "Clear", icon: <Sun size={20} className="text-amber-500" />, bg: "bg-amber-50" };
    // 3, 45, 48: Overcast/Fog
    if (code === 3 || code === 45 || code === 48) return { label: "Overcast", icon: <CloudFog size={20} className="text-slate-500" />, bg: "bg-slate-50" };
    // 51-67: Rain
    if (code >= 51 && code <= 67) return { label: "Rain", icon: <CloudRain size={20} className="text-blue-500" />, bg: "bg-blue-50", warning: true };
    // 71-77: Snow
    if (code >= 71 && code <= 77) return { label: "Snow", icon: <CloudSnow size={20} className="text-sky-400" />, bg: "bg-sky-50", warning: true };
    // 80-82: Showers
    if (code >= 80 && code <= 82) return { label: "Showers", icon: <CloudRain size={20} className="text-indigo-500" />, bg: "bg-indigo-50" };
    // 95-99: Thunderstorm
    if (code >= 95 && code <= 99) return { label: "Storm", icon: <CloudLightning size={20} className="text-red-500" />, bg: "bg-red-50", critical: true };
    
    return { label: "Unknown", icon: <Cloud size={20} className="text-surface-400" />, bg: "bg-surface-50" };
  };

  return (
    <div className="bg-white rounded-3xl border border-surface-200 shadow-sm flex flex-col h-[280px]">
      <div className="p-4 border-b border-surface-100 flex justify-between items-center bg-surface-50 rounded-t-3xl">
        <div className="flex items-center gap-2 text-surface-600">
          <Sun size={16} />
          <h3 className="font-bold text-sm">15-Day Weather Outlook</h3>
        </div>
        <div className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">
          {project.location || "Project Location"}
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto p-4 flex gap-3 pb-2 items-center custom-scrollbar">
        {forecast.map((day, idx) => {
          const { label, icon, bg, warning, critical } = classifyWMOCode(day.code);
          const dateObj = new Date(day.date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          const isToday = idx === 0;

          return (
            <div 
              key={day.date} 
              className={`flex-shrink-0 w-[120px] h-full rounded-2xl border ${isToday ? 'border-primary shadow-sm' : 'border-surface-200'} p-3 flex flex-col justify-between ${bg}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className={`text-[10px] uppercase font-black tracking-widest ${isToday ? 'text-primary' : 'text-surface-500'}`}>
                    {isToday ? "Today" : dayName}
                  </div>
                  <div className="text-xs font-bold text-surface-600">{dayNum}</div>
                </div>
                {icon}
              </div>
              
              <div className="flex flex-col mt-auto pt-2">
                <div className="flex items-end justify-between">
                  <span className="text-lg font-black text-surface-800">{Math.round(day.max)}°</span>
                  <span className="text-sm font-bold text-surface-400 mb-[2px]">{Math.round(day.min)}°</span>
                </div>
                
                {warning && !critical && (
                  <div className="mt-1 text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase text-center w-full truncate">
                    {day.precipitation > 0 ? `${day.precipitation}mm Rain` : 'Weather Alert'}
                  </div>
                )}
                {critical && (
                  <div className="mt-1 text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded uppercase text-center w-full shadow-sm animate-pulse">
                    Storm Risk
                  </div>
                )}
                {!warning && !critical && (
                  <div className="mt-1 text-[9px] font-bold text-surface-500 px-1.5 py-0.5 rounded uppercase text-center w-full truncate">
                    {label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
