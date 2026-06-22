"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TaskMaterialAllocation } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { Spinner } from "@/components/ui/Spinner";

interface DeliveryScheduleViewProps {
  projectUid: string;
}

export function DeliveryScheduleView({ projectUid }: DeliveryScheduleViewProps) {
  const [allocations, setAllocations] = useState<TaskMaterialAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [filterMode, setFilterMode] = useState<"all" | "overdue" | "next7days">("all");

  useEffect(() => {
    fetchAllocations();
  }, [projectUid]);

  const fetchAllocations = async () => {
    try {
      setIsLoading(true);
      const res = await projectsApi.getMaterialAllocations(projectUid);
      setAllocations(res);
    } catch (err: any) {
      alert("Failed to load delivery schedule.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAllocations = useMemo(() => {
    return allocations
      .filter((a) => !!a.expected_on_site_by) // Only those with a date
      .filter((a) => {
        if (filterMode === "all") return true;
        const expectedDate = new Date(a.expected_on_site_by!);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (filterMode === "overdue") {
          return expectedDate < today && a.req_status !== "DELIVERED";
        }
        
        if (filterMode === "next7days") {
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          return expectedDate >= today && expectedDate <= nextWeek;
        }
        
        return true;
      })
      .sort((a, b) => new Date(a.expected_on_site_by!).getTime() - new Date(b.expected_on_site_by!).getTime());
  }, [allocations, filterMode]);

  const isOverdue = (dateStr: string, status: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    return d < today && status !== "DELIVERED";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Schedule</h2>
          <p className="text-sm text-gray-500">Track when materials are expected on site.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
          >
            <option value="all">All Deliveries</option>
            <option value="overdue">Overdue</option>
            <option value="next7days">Next 7 Days</option>
          </select>
          
          <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-md flex">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 text-sm font-medium rounded-sm ${viewMode === "list" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500"}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1 text-sm font-medium rounded-sm ${viewMode === "timeline" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500"}`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      <div className="p-0">
        {filteredAllocations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No deliveries found for the selected filter.
          </div>
        ) : (
          <>
            {viewMode === "list" && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task / Zone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAllocations.map((alloc) => {
                      const overdue = isOverdue(alloc.expected_on_site_by!, alloc.req_status);
                      return (
                        <tr key={alloc.id} className={overdue ? "bg-red-50 dark:bg-red-900/10" : ""}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-medium ${overdue ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                              {alloc.expected_on_site_by}
                            </span>
                            {overdue && <span className="ml-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">OVERDUE</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {alloc.boq_item_detail?.material_code || "Unknown Material"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{alloc.task_title || "Unknown Task"}</div>
                            <div className="text-xs text-gray-500">{alloc.task_zone_name || ""}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {alloc.allocated_qty}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              alloc.req_status === "DELIVERED" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                              alloc.req_status === "ORDERED" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                              "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            }`}>
                              {alloc.req_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {viewMode === "timeline" && (
              <div className="p-6">
                <div className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-8">
                  {filteredAllocations.map((alloc) => {
                    const overdue = isOverdue(alloc.expected_on_site_by!, alloc.req_status);
                    return (
                      <div key={alloc.id} className="relative pl-6">
                        <div className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                          alloc.req_status === "DELIVERED" ? "bg-green-500" :
                          overdue ? "bg-red-500" : "bg-blue-500"
                        }`} />
                        <div className="mb-1">
                          <span className={`text-sm font-bold ${overdue ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                            {alloc.expected_on_site_by}
                          </span>
                          {overdue && <span className="ml-2 text-xs font-bold text-red-600 dark:text-red-400">OVERDUE</span>}
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">{alloc.boq_item_detail?.material_code || "Unknown Material"}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              alloc.req_status === "DELIVERED" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                              "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}>
                              {alloc.req_status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Qty: {alloc.allocated_qty}</p>
                          <p className="text-sm text-gray-500 mt-1">Task: {alloc.task_title}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
