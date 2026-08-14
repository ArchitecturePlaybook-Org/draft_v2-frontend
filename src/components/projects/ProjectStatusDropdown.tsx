import React, { useState, useRef, useEffect } from "react";
import { ProjectStatus } from "@/types/projects";

interface ProjectStatusDropdownProps {
  uid: string;
  status: ProjectStatus;
  onChange?: (uid: string, newStatus: ProjectStatus) => void;
}

const STATUS_OPTIONS: ProjectStatus[] = ["To Start", "Work in Progress", "Completed"];

export const ProjectStatusDropdown: React.FC<ProjectStatusDropdownProps> = ({
  uid,
  status,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (e: React.MouseEvent, newStatus: ProjectStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (newStatus !== status && onChange) {
      onChange(uid, newStatus);
    }
    setIsOpen(false);
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  // Determine button color based on status
  const getButtonStyles = (currentStatus: ProjectStatus) => {
    switch (currentStatus) {
      case "Completed":
        return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-sm";
      case "Work in Progress":
        return "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold shadow-sm";
      case "To Start":
      default:
        return "bg-surface-100 dark:bg-slate-800/90 border border-surface-200 dark:border-slate-700/80 text-primary dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-400/60 font-bold shadow-sm";
    }
  };

  return (
    <div 
      className="relative inline-block text-left" 
      ref={dropdownRef}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={toggleDropdown}
        className={`px-2 py-0.5 flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider rounded outline-none cursor-pointer hover:brightness-110 transition-all whitespace-nowrap ${getButtonStyles(
          status
        )}`}
      >
        {status}
        <span className="text-[7px] opacity-70">▼</span>
      </button>



      {/* Animated Dropdown Menu */}
      <div
        className={`absolute right-0 mt-2 w-44 origin-top-right rounded-xl bg-surface-100 dark:bg-slate-900/95 border border-surface-200 dark:border-slate-800/90 shadow-2xl backdrop-blur-xl focus:outline-none z-50 transition-all duration-200 ease-out ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="py-1">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={(e) => handleSelect(e, option)}
              className={`w-full text-left block px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                status === option
                  ? "bg-surface-200 dark:bg-slate-800/80 text-amber-500 dark:text-amber-400 font-extrabold"
                  : "text-text-secondary dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-800/60 hover:text-amber-500 dark:hover:text-amber-400"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
