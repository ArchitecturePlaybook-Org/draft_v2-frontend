"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from "recharts";
import { Spinner } from "@/components/ui/Spinner";

export default function PublicShareDashboard() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    
    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`/api/v1//public/share/${token}/`);
        if (!response.ok) {
          throw new Error("This link is invalid, expired, or has been revoked.");
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <Spinner size="lg" label="Loading Project Dashboard..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center border border-surface-200">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">Access Denied</h2>
          <p className="text-surface-500 text-sm mb-8">{error}</p>
        </div>
      </div>
    );
  }

  const { project, phases, tasks } = data;

  // Aggregate phase progress for donut chart
  const completedPhasesCount = phases.filter((p: any) => p.progress_percent === 100).length;
  
  // Format data for Recharts
  const pieData = [
    { name: 'To Do', value: tasks.breakdown.TODO, color: '#94a3b8' },
    { name: 'In Progress', value: tasks.breakdown.WIP, color: '#6366f1' },
    { name: 'Under Inspection', value: tasks.breakdown.QA, color: '#f59e0b' },
    { name: 'Done', value: tasks.breakdown.DONE, color: '#10b981' }
  ].filter(d => d.value > 0);

  const totalTasks = tasks.total || 1; // prevent division by zero
  const overallProgress = Math.round((tasks.breakdown.DONE / totalTasks) * 100) || 0;

  const barData = phases.map((p: any) => ({
    name: p.name,
    done: p.done_blocks,
    remaining: p.total_blocks - p.done_blocks,
    color: p.color_hex || '#2563eb'
  }));

  return (
    <div className="min-h-screen bg-surface-50 p-6 md:p-12 font-sans text-primary">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header Section */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-surface-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex gap-3 mb-4">
              {project.status === "Completed" ? (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Project Completed
                </span>
              ) : project.status === "Work in Progress" ? (
                <span className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest rounded-full">
                  In Progress
                </span>
              ) : (
                <span className="px-3 py-1 bg-surface-100 text-surface-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                  To Start
                </span>
              )}
              {project.kind && (
                <span className="px-3 py-1 bg-surface-100 text-surface-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-surface-200">
                  {project.kind}
                </span>
              )}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-primary">
              {project.title}
            </h1>
            
            {project.client_name && (
              <p className="text-surface-500 font-medium">Client: {project.client_name}</p>
            )}
            {project.location && (
              <p className="text-surface-400 text-sm mt-1 flex items-center gap-2">
                <span>📍</span> {project.location}
              </p>
            )}
          </div>
          
          {/* Health Indicator */}
          <div className="relative z-10 shrink-0 text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle className="text-surface-100" strokeWidth="12" stroke="currentColor" fill="transparent" r="56" cx="64" cy="64" />
                <circle 
                  className={overallProgress === 100 ? "text-emerald-500" : "text-accent"} 
                  strokeWidth="12" 
                  strokeDasharray={351.8} 
                  strokeDashoffset={351.8 - (351.8 * overallProgress) / 100}
                  strokeLinecap="round" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="56" cx="64" cy="64" 
                  style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black">{overallProgress}%</span>
              </div>
            </div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-surface-400 mt-2">Overall Progress</div>
          </div>
        </div>

        {/* High-Level Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-200">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-1">Total Phases</div>
            <div className="text-2xl font-black">{completedPhasesCount} / {phases.length} <span className="text-sm font-medium text-surface-400 lowercase tracking-normal">completed</span></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-200">
            <div className="text-3xl mb-2">🏗️</div>
            <div className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-1">Active Blocks</div>
            <div className="text-2xl font-black">{phases.reduce((acc: number, p: any) => acc + p.done_blocks, 0)} / {phases.reduce((acc: number, p: any) => acc + p.total_blocks, 0)} <span className="text-sm font-medium text-surface-400 lowercase tracking-normal">done</span></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-200 relative overflow-hidden">
            <div className="text-3xl mb-2">⚠️</div>
            <div className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-1">Owner Action Req.</div>
            <div className={`text-2xl font-black ${tasks.requires_owner_response > 0 ? "text-amber-500" : "text-emerald-500"}`}>
              {tasks.requires_owner_response} <span className="text-sm font-medium text-surface-400 lowercase tracking-normal">pending</span>
            </div>
            {tasks.requires_owner_response > 0 && (
               <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500" />
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Donut Chart: Task Distribution */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-surface-200">
            <h3 className="text-lg font-bold text-primary mb-6">Task Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => [`${value} Tasks`, '']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart: Phase Completion */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-surface-200">
            <h3 className="text-lg font-bold text-primary mb-6">Phase Completion</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} width={120} />
                  <RechartsTooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="done" stackId="a" fill="#10b981" radius={[4, 0, 0, 4]} name="Completed Blocks" />
                  <Bar dataKey="remaining" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} name="Pending Blocks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
