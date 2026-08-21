"use client";

import React from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export { Skeleton, SkeletonTheme };

export interface AppSkeletonProps {
  className?: string;
  count?: number;
  height?: number | string;
  width?: number | string;
  circle?: boolean;
  borderRadius?: number | string;
  containerClassName?: string;
  style?: React.CSSProperties;
  inline?: boolean;
}

export const AppSkeleton: React.FC<AppSkeletonProps> = (props) => {
  return (
    <SkeletonTheme baseColor="rgba(148, 163, 184, 0.12)" highlightColor="rgba(255, 255, 255, 0.18)">
      <Skeleton {...props} />
    </SkeletonTheme>
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = "" }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <SkeletonTheme baseColor="rgba(148, 163, 184, 0.12)" highlightColor="rgba(255, 255, 255, 0.18)">
        <Skeleton count={lines} height={14} className="rounded-md my-1" />
      </SkeletonTheme>
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <SkeletonTheme baseColor="rgba(148, 163, 184, 0.12)" highlightColor="rgba(255, 255, 255, 0.18)">
      <div className={`p-4 rounded-xl border border-surface-200/80 dark:border-white/10 bg-surface-50/50 backdrop-blur-md space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton width={96} height={12} borderRadius={6} />
          <Skeleton width={20} height={20} borderRadius={6} />
        </div>
        <Skeleton width={80} height={32} borderRadius={8} />
        <div className="flex justify-between items-center pt-2">
          <Skeleton width={64} height={16} borderRadius={6} />
          <Skeleton width={48} height={12} borderRadius={6} />
        </div>
      </div>
    </SkeletonTheme>
  );
};

export const SkeletonGrid: React.FC<{ count?: number; columns?: string }> = ({
  count = 6,
  columns = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
}) => {
  return (
    <div className={`grid ${columns} gap-3 w-full`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <SkeletonTheme baseColor="rgba(148, 163, 184, 0.12)" highlightColor="rgba(255, 255, 255, 0.18)">
      <div className="w-full border border-surface-200/80 dark:border-white/10 rounded-xl overflow-hidden p-3 space-y-3 bg-surface-50/50">
        <div className="flex items-center justify-between pb-2 border-b border-surface-200/50">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} width={80} height={14} borderRadius={6} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center justify-between py-2 border-b border-surface-200/30 last:border-0">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} width={c === 0 ? 140 : 64} height={12} borderRadius={6} />
            ))}
          </div>
        ))}
      </div>
    </SkeletonTheme>
  );
};

export const SkeletonDashboard: React.FC = () => {
  return (
    <SkeletonTheme baseColor="rgba(148, 163, 184, 0.12)" highlightColor="rgba(255, 255, 255, 0.18)">
      <div className="flex flex-col gap-4 pb-8 w-full max-w-7xl mx-auto text-xs animate-in fade-in duration-300">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-200/80 dark:border-white/10 pb-3">
          <div className="space-y-1.5">
            <Skeleton width={192} height={24} borderRadius={8} />
            <Skeleton width={256} height={12} borderRadius={6} />
          </div>
          <Skeleton width={112} height={32} borderRadius={8} />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Projects Grid Skeleton */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center pb-2 border-b border-surface-200/80 dark:border-white/10">
            <Skeleton width={144} height={20} borderRadius={6} />
            <Skeleton width={96} height={24} borderRadius={8} />
          </div>
          <SkeletonGrid count={3} columns="grid-cols-1 md:grid-cols-3" />
        </div>

        {/* Bottom Widgets Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
          <div className="lg:col-span-2 space-y-3">
            <Skeleton width={128} height={20} borderRadius={6} />
            <SkeletonGrid count={4} columns="grid-cols-1 sm:grid-cols-2" />
          </div>
          <div className="space-y-3">
            <Skeleton width={112} height={20} borderRadius={6} />
            <SkeletonTable rows={4} cols={2} />
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
};
