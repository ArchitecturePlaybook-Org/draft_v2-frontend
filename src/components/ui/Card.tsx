import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = "", 
  hover = true, 
  glass = true 
}) => {
  const baseClasses = "overflow-hidden border border-(--surface-300) rounded-(--radius-lg) bg-(--surface-100)";
  const hoverClasses = hover ? "transition-all duration-300 hover:-translate-y-1 hover:border-(--primary) hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.3)]" : "";
  const glassClasses = glass ? "backdrop-blur-md bg-opacity-70" : "";

  return (
    <div className={`${baseClasses} ${hoverClasses} ${glassClasses} ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`p-6 pb-4 ${className}`}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <p className={`text-sm text-surface-500 mt-2 ${className}`}>{children}</p>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);
