"use client";

import React, { useEffect, useState } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/Card";
import { fetchFromBff } from "@/shared/api/fetchFromBff";

interface LeadAnalytics {
  total_leads: number;
  status_counts: {
    PENDING: number;
    ACCEPTED: number;
    REJECTED: number;
    CONVERTED: number;
  };
  conversion_rate: number;
  pipeline_value: number;
}

export default function LeadAnalyticsDashboard() {
  const [data, setData] = useState<LeadAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const data = await fetchFromBff<LeadAnalytics>("/api/v1/users/leads/analytics/");
        setData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load lead analytics");
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading analytics...</div>;
  }

  if (error || !data) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-4xl">{data.total_leads}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-4xl text-green-600 dark:text-green-400">
              {data.conversion_rate}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Pipeline Value</CardDescription>
            <CardTitle className="text-4xl text-amber-600 dark:text-amber-400">
              ${data.pipeline_value.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Converted</CardDescription>
            <CardTitle className="text-4xl text-purple-600 dark:text-purple-400">
              {data.status_counts.CONVERTED}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Breakdown</CardTitle>
          <CardDescription>Current status of all your incoming leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">Pending Response</span>
              <span className="font-bold">{data.status_counts.PENDING}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 dark:bg-slate-800">
              <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(data.status_counts.PENDING / Math.max(data.total_leads, 1)) * 100}%` }}></div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="font-medium text-emerald-500">Accepted (In Discussion)</span>
              <span className="font-bold">{data.status_counts.ACCEPTED}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 dark:bg-slate-800">
              <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${(data.status_counts.ACCEPTED / Math.max(data.total_leads, 1)) * 100}%` }}></div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="font-medium text-purple-500">Converted to Project</span>
              <span className="font-bold">{data.status_counts.CONVERTED}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 dark:bg-slate-800">
              <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${(data.status_counts.CONVERTED / Math.max(data.total_leads, 1)) * 100}%` }}></div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="font-medium text-red-500">Rejected</span>
              <span className="font-bold">{data.status_counts.REJECTED}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 dark:bg-slate-800">
              <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(data.status_counts.REJECTED / Math.max(data.total_leads, 1)) * 100}%` }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
