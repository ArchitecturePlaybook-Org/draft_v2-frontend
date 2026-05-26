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
        return "bg-emerald-500 text-white";
      case "Work in Progress":
        return "bg-primary text-white";
      case "To Start":
      default:
        return "bg-surface-200 text-surface-600 hover:bg-surface-300";
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
        className={`px-3 py-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md shadow-sm outline-none cursor-pointer hover:brightness-110 transition-all ${getButtonStyles(
          status
        )}`}
      >
        {status}
        <span className="text-[8px] opacity-70">▼</span>
      </button>

      {/* Animated Dropdown Menu */}
      <div
        className={`absolute right-0 mt-1.5 w-40 origin-top-right rounded-lg bg-white shadow-xl ring-1 ring-black/5 focus:outline-none z-50 transition-all duration-200 ease-out ${
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
                  ? "bg-primary/5 text-primary"
                  : "text-surface-700 hover:bg-surface-50 hover:text-surface-900"
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
