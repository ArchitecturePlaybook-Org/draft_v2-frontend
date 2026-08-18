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
      projectTitle: "Skyline Eco-Tower Masterplan",
      projectCode: "APX-RES-CL1-001",
      buildingType: "Commercial Tower",
      location: "San Francisco, CA",
      userRole: "Lead BIM & Structural Inspector",
      taskCode: "APX-RES-001-T014",
      taskTitle: "Parametric Glazing & Curtain Wall Installation",
      trade: "Facade & Glazing Trade",
      block: "Block A - Envelope & Cladding",
      status: "DONE",
      priority: "HIGH",
      progressPercent: 100,
      quantityCompleted: 450,
      quantityTarget: 450,
      unit: "Sq.M",
      estimatedCost: 54000,
      checklistsVerified: 4,
      checklistsTotal: 4,
      hasVisualProof: true,
      speckleBimLinked: true,
      lastUpdated: "Yesterday"
    },
    {
      id: 2,
      projectTitle: "Zenith Commercial Hub",
      projectCode: "MET-COM-CH2-004",
      buildingType: "Mixed-Use Retail & Office",
      location: "New York, NY",
      userRole: "Site Operations Coordinator",
      taskCode: "MET-COM-004-T028",
      taskTitle: "HVAC Duct Riser & Chiller Piping Inspection",
      trade: "MEP & Mechanical Trade",
      block: "Level 4 - Mechanical Penthouse",
      status: "QA",
      priority: "HIGH",
      progressPercent: 88,
      quantityCompleted: 220,
      quantityTarget: 250,
      unit: "R.M",
      estimatedCost: 37500,
      checklistsVerified: 3,
      checklistsTotal: 4,
      hasVisualProof: true,
      speckleBimLinked: true,
      lastUpdated: "3 days ago"
    },
    {
      id: 3,
      projectTitle: "Green Horizon Residential Complex",
      projectCode: "VNG-RES-GH3-012",
      buildingType: "Multi-Family Residential",
      location: "Chicago, IL",
      userRole: "Subcontractor Task Lead",
      taskCode: "VNG-RES-012-T009",
      taskTitle: "Reinforced Concrete Foundation Slab Pouring",
      trade: "Civil & Concrete Trade",
      block: "Podium Level - Foundation",
      status: "WIP",
      priority: "MEDIUM",
      progressPercent: 64,
      quantityCompleted: 320,
      quantityTarget: 500,
      unit: "Cu.M",
      estimatedCost: 90000,
      checklistsVerified: 2,
      checklistsTotal: 5,
      hasVisualProof: false,
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
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Verified Complete
          </span>
        );
      case 'QA':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Under Inspection (QA)
          </span>
        );
      case 'WIP':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-300 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            In Construction
          </span>
        );
      default:
        return (
          <span className="bg-surface-200 text-surface-600 px-2 py-0.5 rounded text-[10px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-surface-100/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header & Construction Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            <span>Construction Task & Project Contributions</span>
            <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
              🏗️ Site Ops
            </span>
          </h2>
          <p className="text-[11px] text-surface-500 font-medium">
            Shared tasks, field inspections, BIM milestone matrix & trade contributions
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-surface-200/60 p-1 rounded-xl">
          {(['all', 'wip', 'qa', 'done'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                selectedFilter === filter
                  ? 'bg-surface-50 text-primary shadow-2xs'
                  : 'text-surface-600 hover:text-primary'
              }`}
            >
              {filter === 'all' ? 'All Tasks' : filter === 'wip' ? 'In Progress' : filter === 'qa' ? 'QA Inspection' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Task Contribution Cards */}
      <div className="space-y-3.5">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="bg-surface-50 border border-surface-200/80 rounded-xl p-4 space-y-3 hover:border-amber-500/40 transition-colors shadow-2xs"
          >
            {/* Top Row: Project Code, Building Type & Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-[10px]">
                  🚧
                </span>
                <div>
                  <h3 className="font-bold text-primary text-xs flex items-center gap-1.5">
                    {task.projectTitle}
                    <span className="text-[10px] font-mono text-surface-400">({task.projectCode})</span>
                  </h3>
                  <p className="text-[10px] font-semibold text-surface-500">
                    {task.buildingType} • {task.location}
                  </p>
                </div>
              </div>

              {getStatusBadge(task.status)}
            </div>

            {/* Task Main Info */}
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mr-1.5">
                    {task.taskCode}
                  </span>
                  <span className="font-bold text-primary text-xs sm:text-sm">
                    {task.taskTitle}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-surface-500 bg-surface-200/80 px-2 py-0.5 rounded shrink-0">
                  {task.userRole}
                </span>
              </div>

              {/* Trade & Milestone Block tags */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <span className="bg-surface-200/70 text-surface-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  🔧 {task.trade}
                </span>
                <span className="bg-surface-200/70 text-surface-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  🧱 {task.block}
                </span>
              </div>
            </div>

            {/* Quantity Progress Bar & Financials */}
            <div className="bg-surface-100/70 p-3 rounded-lg border border-surface-200/50 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-surface-700">
                  Quantity Progress: <strong className="text-primary">{task.quantityCompleted} / {task.quantityTarget} {task.unit}</strong>
                </span>
                <span className="text-amber-600">{task.progressPercent}% Completed</span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${task.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-semibold text-surface-500 pt-0.5">
                <span>Est. Value: ${task.estimatedCost.toLocaleString()}</span>
                <span>Updated {task.lastUpdated}</span>
              </div>
            </div>

            {/* Inspection Proof & BIM Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 text-[10px] font-bold">
                {task.hasVisualProof && (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    📸 Visual Inspection Proof Attached ({task.checklistsVerified}/{task.checklistsTotal})
                  </span>
                )}
                {task.speckleBimLinked && (
                  <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                    🧊 3D Speckle BIM Objects Linked
                  </span>
                )}
              </div>

              <button
                onClick={() => alert(`Opening Task details for ${task.taskCode}`)}
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                Inspect Task Details →
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
