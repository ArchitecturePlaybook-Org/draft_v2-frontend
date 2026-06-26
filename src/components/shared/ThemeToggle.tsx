"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<string>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // You could also read the initial theme from localStorage here if desired
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.className = theme === 'dark' ? 'dark' : `theme-${theme}`;
  }, [theme, mounted]);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-full border border-surface-200 shadow-inner">
      <button 
        onClick={() => setTheme('dark')} 
        className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-surface-300 text-primary shadow-sm' : 'text-text-secondary hover:text-foreground'}`} 
        title="Dark Theme"
      >
        <Moon size={14} />
      </button>
      <button 
        onClick={() => setTheme('light')} 
        className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-surface-300 text-primary shadow-sm' : 'text-text-secondary hover:text-foreground'}`} 
        title="Light Theme"
      >
        <Sun size={14} />
      </button>
      <button 
        onClick={() => setTheme('blueprint')} 
        className={`p-1.5 rounded-full transition-all ${theme === 'blueprint' ? 'bg-surface-300 text-primary shadow-sm' : 'text-text-secondary hover:text-foreground'}`} 
        title="Blueprint Theme"
      >
        <Monitor size={14} />
      </button>
    </div>
  );
};
