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
        return "bg-semantic-green text-background";
      case "Work in Progress":
        return "bg-semantic-blue text-background";
      case "To Start":
      default:
        return "bg-surface-100 border border-surface-200 text-text-secondary hover:text-[#D4AF37] hover:border-[#D4AF37]";
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
        className={`px-3 py-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md shadow-none outline-none cursor-pointer hover:brightness-110 transition-all ${getButtonStyles(
          status
        )}`}
      >
        {status}
        <span className="text-[8px] opacity-70">▼</span>
      </button>

      {/* Animated Dropdown Menu */}
      <div
        className={`absolute right-0 mt-1.5 w-40 origin-top-right rounded-md bg-surface-100 border border-surface-200 shadow-none ring-0 focus:outline-none z-50 transition-all duration-200 ease-out ${
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
                  ? "bg-surface-200 text-[#D4AF37]"
                  : "text-text-secondary hover:bg-surface-200 hover:text-[#D4AF37]"
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
