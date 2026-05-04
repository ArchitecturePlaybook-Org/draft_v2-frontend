import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = "md", 
  className = "",
  label 
}) => {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div 
        className={`${sizes[size]} border-t-transparent border-(--primary) rounded-full animate-spin`}
        role="status"
        aria-label="loading"
      />
      {label && <p className="text-sm font-medium text-(--gray-400)">{label}</p>}
    </div>
  );
};
