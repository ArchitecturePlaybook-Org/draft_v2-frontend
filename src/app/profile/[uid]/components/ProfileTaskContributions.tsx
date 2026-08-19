"use client";

import React, { useState } from 'react';
import { PublicProfile } from '@/domains/users/api';

interface ProfileTaskContributionsProps {
  profile: PublicProfile;
}

export function ProfileTaskContributions({ profile }: ProfileTaskContributionsProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'wip' | 'qa' | 'done'>('all');

  const sharedProjectsTasks = [
    {
      id: 1,
      projectTitle: "Manyata Tech Park Eco-Tower",
      projectCode: "BLR-MTP-CL1-001",
      buildingType: "Commercial IT Park",
      location: "Outer Ring Road, Bengaluru",
      userRole: "Lead BIM & Structural Inspector",
      taskCode: "BLR-MTP-001-T014",
      taskTitle: "Parametric Double-Glazed Facade Installation",
      trade: "Facade & Glazing",
      block: "Tower A - Envelope & Cladding",
      status: "DONE",
      priority: "HIGH",
      progressPercent: 100,
      quantityCompleted: 650,
      quantityTarget: 650,
      unit: "Sq.M",
      estimatedCost: 4500000,
      checklistsVerified: 4,
      checklistsTotal: 4,
      hasVisualProof: true,
      speckleBimLinked: true,
      lastUpdated: "Yesterday"
    },
    {
      id: 2,
      projectTitle: "Whitefield Smart Commercial Hub",
      projectCode: "BLR-WFD-CH2-004",
      buildingType: "Mixed-Use Retail & Office",
      location: "Whitefield, Bengaluru",
      userRole: "Site Operations Coordinator",
      taskCode: "BLR-WFD-004-T028",
      taskTitle: "HVAC Central Riser & Chiller Plant Inspection",
      trade: "MEP & Mechanical",
      block: "Level 5 - Mechanical Room",
      status: "QA",
      priority: "HIGH",
      progressPercent: 88,
      quantityCompleted: 280,
      quantityTarget: 320,
      unit: "R.M",
      estimatedCost: 3200000,
      checklistsVerified: 3,
      checklistsTotal: 4,
      hasVisualProof: true,
      speckleBimLinked: true,
      lastUpdated: "3 days ago"
    },
    {
      id: 3,
      projectTitle: "Electronic City Green Residential Complex",
      projectCode: "BLR-EC-GH3-012",
      buildingType: "Multi-Family Residential",
      location: "Electronic City, Bengaluru",
      userRole: "Subcontractor Task Lead",
      taskCode: "BLR-EC-012-T009",
      taskTitle: "Reinforced M40 Concrete Slab Pouring",
      trade: "Civil & Concrete",
      block: "Podium B - Foundation",
      status: "WIP",
      priority: "MEDIUM",
      progressPercent: 64,
      quantityCompleted: 420,
      quantityTarget: 650,
      unit: "Cu.M",
      estimatedCost: 7500000,
      checklistsVerified: 2,
      checklistsTotal: 5,
      hasVisualProof: true,
      speckleBimLinked: false,
      lastUpdated: "5 days ago"
    }
  ];

  const filteredTasks = selectedFilter === 'all' 
    ? sharedProjectsTasks 
    : sharedProjectsTasks.filter(t => t.status.toLowerCase() === selectedFilter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return (
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Verified Complete
          </span>
        );
      case 'QA':
        return (
          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            QA Inspection
          </span>
        );
      case 'WIP':
        return (
          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            In Construction
          </span>
        );
      default:
        return (
          <span className="bg-surface-200 text-surface-600 px-2 py-0.5 rounded text-[9px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header & Construction Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-200/80 dark:border-white/10 pb-3">
        <div>
          <h2 className="text-sm font-extrabold text-primary flex items-center gap-2">
            <span>Construction Tasks & Site Contributions</span>
            <span className="text-[9px] font-extrabold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded uppercase tracking-wider">
              BIM & Site Ops
            </span>
          </h2>
          <p className="text-[10px] text-surface-400 font-medium">
            Field inspections, task quantity logs, and 3D BIM model milestones
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl border border-surface-200 dark:border-white/10 shrink-0">
          {(['all', 'wip', 'qa', 'done'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                selectedFilter === filter
                  ? 'bg-surface-50 dark:bg-surface-700 text-primary shadow-xs'
                  : 'text-surface-400 hover:text-primary'
              }`}
            >
              {filter === 'all' ? 'All Tasks' : filter === 'wip' ? 'Active Site' : filter === 'qa' ? 'QA Inspection' : 'Verified'}
            </button>
          ))}
        </div>
      </div>

      {/* Task Contribution Cards */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="bg-surface-100/60 dark:bg-surface-800/40 border border-surface-200/80 dark:border-white/10 rounded-xl p-3.5 sm:p-4 space-y-3 hover:border-accent/40 transition-all duration-200"
          >
            {/* Top Row: Project Code, Building Type & Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-200/60 dark:border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center font-bold text-xs">
                  🏗️
                </span>
                <div>
                  <h3 className="font-bold text-primary text-xs flex items-center gap-1.5">
                    {task.projectTitle}
                    <span className="text-[9px] font-mono text-surface-400">({task.projectCode})</span>
                  </h3>
                  <p className="text-[10px] font-medium text-surface-400">
                    {task.buildingType} • {task.location}
                  </p>
                </div>
              </div>

              {getStatusBadge(task.status)}
            </div>

            {/* Task Main Info */}
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-bold font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
                    {task.taskCode}
                  </span>
                  <span className="font-bold text-primary text-xs sm:text-sm">
                    {task.taskTitle}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-surface-400 bg-surface-200/60 dark:bg-surface-700 px-2 py-0.5 rounded shrink-0">
                  {task.userRole}
                </span>
              </div>

              {/* Trade & Milestone Block tags */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <span className="bg-surface-200/50 dark:bg-surface-700/50 text-primary text-[9px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                  🔧 {task.trade}
                </span>
                <span className="bg-surface-200/50 dark:bg-surface-700/50 text-primary text-[9px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                  🧱 {task.block}
                </span>
              </div>
            </div>

            {/* Quantity Progress Bar & Financials */}
            <div className="bg-surface-50 dark:bg-surface-900 p-2.5 rounded-lg border border-surface-200/60 dark:border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-surface-400">
                  Quantity Log: <strong className="text-primary font-mono">{task.quantityCompleted} / {task.quantityTarget} {task.unit}</strong>
                </span>
                <span className="text-accent">{task.progressPercent}% Completed</span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-1.5 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${task.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[9px] font-medium text-surface-400 pt-0.5">
                <span>Est. Value: ${task.estimatedCost.toLocaleString()}</span>
                <span>Updated {task.lastUpdated}</span>
              </div>
            </div>

            {/* Inspection Proof & BIM Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2 text-[9px] font-bold">
                {task.hasVisualProof && (
                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    📸 Visual Inspection Proof ({task.checklistsVerified}/{task.checklistsTotal})
                  </span>
                )}
                {task.speckleBimLinked && (
                  <span className="text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                    🧊 3D Speckle BIM Linked
                  </span>
                )}
              </div>

              <button
                onClick={() => alert(`Inspecting task details for ${task.taskCode}`)}
                className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1 ml-auto"
              >
                Task Specs →
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
