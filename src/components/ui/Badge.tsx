import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "info";
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = "primary", 
  className = "",
  icon
}) => {
  const baseStyles = "inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border transition-all duration-300";
  
  const variants = {
    primary: "bg-(--primary)/10 text-(--primary) border-(--primary)/20",
    secondary: "bg-(--surface-300)/20 text-(--gray-400) border-(--surface-300)/30",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    info: "bg-(--accent)/10 text-(--accent) border-(--accent)/20",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {icon && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
};
