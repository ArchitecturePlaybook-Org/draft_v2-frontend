"use client";

import React, { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";

interface ProjectWeatherProps {
  latitude: number;
  longitude: number;
  projectName?: string;
}

interface WeatherDay {
  date: string;
  weatherCode: number;
  maxTemp: number;
  minTemp: number;
}

interface WeatherData {
  days: WeatherDay[];
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
const classifyWeather = (code: number) => {
  if (code >= 0 && code <= 2) return { label: "Clear/Cloudy", icon: "🌤️", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "🌫️", color: "text-surface-600", bg: "bg-surface-100", border: "border-surface-200" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { label: "Rain/Showers", icon: "🌧️", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "❄️", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
  if (code >= 95 && code <= 99) return { label: "Thunderstorm", icon: "⛈️", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
  return { label: "Unknown", icon: "❓", color: "text-surface-500", bg: "bg-surface-50", border: "border-surface-200" };
};

export const ProjectWeather: React.FC<ProjectWeatherProps> = ({ latitude, longitude, projectName }) => {
  const [data, setData] = useState<WeatherDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async () => {
      setIsLoading(true);
      setError(null);

      const cacheKey = `ap.weather.${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
      
      try {
        // Check cache first
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          const cachedData: WeatherData = JSON.parse(cachedStr);
          if (Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
            if (isMounted) {
              setData(cachedData.days);
              setIsLoading(false);
            }
            return;
          }
        }

        // Fetch from Open-Meteo
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=15`;
        const res = await fetch(url);
        
        if (!res.ok) {
          throw new Error(`Weather API error: ${res.status}`);
        }
        
        const json = await res.json();
        
        if (!json.daily || !json.daily.time) {
          throw new Error("Invalid payload structure from Weather API");
        }

        const parsedDays: WeatherDay[] = json.daily.time.map((dateStr: string, idx: number) => ({
          date: dateStr,
          weatherCode: json.daily.weathercode[idx],
          maxTemp: Math.round(json.daily.temperature_2m_max[idx]),
          minTemp: Math.round(json.daily.temperature_2m_min[idx]),
        }));

        // Save to cache
        const newCacheData: WeatherData = { days: parsedDays, timestamp: Date.now() };
        localStorage.setItem(cacheKey, JSON.stringify(newCacheData));

        if (isMounted) {
          setData(parsedDays);
          setIsLoading(false);
        }

      } catch (err: any) {
        console.error("Failed to fetch weather forecast:", err);
        if (isMounted) {
          setError("Weather data temporarily unavailable.");
          setIsLoading(false);
        }
      }
    };

    if (latitude && longitude) {
      fetchWeather();
    } else {
      setIsLoading(false);
      setError("No coordinates available for this project.");
    }

    return () => { isMounted = false; };
  }, [latitude, longitude]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
        <Spinner size="md" label="Fetching 15-day meteorological forecast..." />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm flex flex-col items-center justify-center min-h-[200px] text-center">
        <span className="text-3xl mb-3 opacity-30">🌦️</span>
        <p className="text-sm font-bold text-surface-400">{error || "Failed to load weather data."}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl border border-surface-200 shadow-sm animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-surface-100 pb-4">
        <div>
          <h3 className="text-xl font-extrabold text-primary tracking-tight">15-Day Weather Forecast</h3>
          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-1">
            {projectName ? `${projectName} Location` : `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`}
          </p>
        </div>
        
        {/* Severity Legend */}
        <div className="flex gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span> Clear/Cloudy
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-amber-500 block animate-pulse"></span> Rain Risk
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-red-500 block animate-pulse"></span> Critical (Snow/Storm)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {data.map((day, index) => {
          const wInfo = classifyWeather(day.weatherCode);
          const dateObj = new Date(day.date);
          const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
          const dayDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          
          return (
            <div 
              key={index}
              className={`flex flex-col items-center p-3 rounded-xl border transition-all hover:-translate-y-1 hover:shadow-md ${wInfo.bg} ${wInfo.border}`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">{dayName}</span>
              <span className="text-xs font-bold text-primary mb-2">{dayDate}</span>
              
              <span className="text-3xl mb-2 filter drop-shadow-sm">{wInfo.icon}</span>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-extrabold text-primary">{day.maxTemp}°</span>
                <span className="text-xs font-bold text-surface-400">{day.minTemp}°</span>
              </div>
              
              <span className={`text-[8px] font-black uppercase tracking-widest text-center ${wInfo.color}`}>
                {wInfo.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
