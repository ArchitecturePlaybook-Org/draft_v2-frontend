"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  Handle,
  Position,
  Panel
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Task } from "@/types/projects";
import { projectsApi } from "@/domains/projects/api";
import { Spinner } from "@/components/ui/Spinner";

interface TaskDependencyMapProps {
  projectUid: string;
  tasks: Task[];
  criticalPathUids: string[];
  onTasksChanged: () => void;
}

const nodeWidth = 250;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "LR") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: direction === "LR" ? Position.Left : Position.Top,
      sourcePosition: direction === "LR" ? Position.Right : Position.Bottom,
      // We are shifting the dagre node position (anchor=center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// Custom Node Component to match the design aesthetics
const CustomTaskNode = ({ data }: { data: any }) => {
  const isCritical = data.isCritical;
  const statusColors = {
    TODO: "bg-primary text-white",
    WIP: "bg-accent text-white",
    DONE: "bg-emerald-500 text-white",
  };
  const colorClass = (statusColors as any)[data.status] || "bg-gray-500 text-white";

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 bg-white shadow-sm transition-all hover:shadow-md ${
        isCritical ? "border-red-400 shadow-red-200" : "border-surface-200"
      }`}
      style={{ width: nodeWidth }}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 border-2 border-white bg-surface-400" />
      
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${colorClass}`}>
          {data.status}
        </span>
        {isCritical && (
          <span className="text-[9px] font-bold text-red-500 flex items-center gap-1">
            <span className="animate-pulse">⚡</span> Critical
          </span>
        )}
      </div>
      
      <div className="font-bold text-sm text-primary truncate" title={data.title}>
        {data.title}
      </div>
      
      <div className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-1 truncate">
        {data.zone || "No Zone"} • {data.phase || "No Phase"}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 border-2 border-white bg-accent" />
    </div>
  );
};

const nodeTypes = {
  customTask: CustomTaskNode,
};

export const TaskDependencyMap: React.FC<TaskDependencyMapProps> = ({
  projectUid,
  tasks,
  criticalPathUids,
  onTasksChanged,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize the graph
  useEffect(() => {
    const initialNodes: Node[] = tasks.map((task) => ({
      id: task.uid,
      type: "customTask",
      data: {
        title: task.title,
        status: task.status,
        zone: task.zone_name,
        phase: task.phase_name,
        isCritical: criticalPathUids.includes(task.uid),
      },
      position: { x: 0, y: 0 },
    }));

    const initialEdges: Edge[] = [];
    tasks.forEach((task) => {
      if (task.depends_on && task.depends_on.length > 0) {
        task.depends_on.forEach((depId) => {
          const depTask = tasks.find((t) => t.id === depId);
          if (depTask) {
            const isCriticalEdge =
              criticalPathUids.includes(task.uid) && criticalPathUids.includes(depTask.uid);
            initialEdges.push({
              id: `e-${depTask.uid}-${task.uid}`,
              source: depTask.uid,
              target: task.uid,
              animated: task.status === "WIP",
              style: { stroke: isCriticalEdge ? "#ef4444" : "#94a3b8", strokeWidth: isCriticalEdge ? 2 : 1.5 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: isCriticalEdge ? "#ef4444" : "#94a3b8",
              },
            });
          }
        });
      }
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [tasks, criticalPathUids, setNodes, setEdges]);

  const onConnect = useCallback(
    async (params: Connection) => {
      const { source, target } = params;
      if (!source || !target || source === target) return;

      // Find target task
      const targetTask = tasks.find((t) => t.uid === target);
      if (!targetTask) return;

      // Ensure we don't duplicate
      const currentDependsOnDbIds = targetTask.depends_on || [];
      const sourceTask = tasks.find((t) => t.uid === source);
      if (!sourceTask || currentDependsOnDbIds.includes(sourceTask.id)) return;

      // Map current DB IDs to UIDs for the API request
      const dependsOnUids = currentDependsOnDbIds
        .map((id) => tasks.find((t) => t.id === id)?.uid)
        .filter(Boolean) as string[];

      // Add the new dependency UID
      dependsOnUids.push(source.toString());

      setIsUpdating(true);
      try {
        await projectsApi.setTaskDependencies(targetTask.uid, dependsOnUids);
        onTasksChanged();
      } catch (err: any) {
        alert(err.message || "Failed to create dependency (possible cyclic dependency).");
      } finally {
        setIsUpdating(false);
      }
    },
    [tasks, onTasksChanged]
  );

  const onEdgesDelete = useCallback(
    async (deletedEdges: Edge[]) => {
      setIsUpdating(true);
      try {
        for (const edge of deletedEdges) {
          const { source, target } = edge;
          const targetTask = tasks.find((t) => t.uid === target);
          const sourceTask = tasks.find((t) => t.uid === source);
          if (!targetTask || !sourceTask) continue;

          // Remove the source from target's dependencies
          const newDependsOnUids = (targetTask.depends_on || [])
            .filter((id) => id !== sourceTask.id)
            .map((id) => tasks.find((t) => t.id === id)?.uid)
            .filter(Boolean) as string[];

          await projectsApi.setTaskDependencies(targetTask.uid, newDependsOnUids);
        }
        onTasksChanged();
      } catch (err: any) {
        alert("Failed to remove dependency.");
      } finally {
        setIsUpdating(false);
      }
    },
    [tasks, onTasksChanged]
  );

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges, setNodes, setEdges]
  );

  return (
    <div className="w-full h-[600px] bg-surface-50 rounded-2xl border border-surface-200 overflow-hidden relative">
      {isUpdating && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Spinner label="Updating Dependencies..." />
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Panel position="top-right" className="bg-white p-2 rounded-lg shadow-md border border-surface-200 flex gap-2">
          <button
            onClick={() => onLayout("TB")}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-surface-100 hover:bg-surface-200 rounded text-surface-600"
          >
            Vertical Layout
          </button>
          <button
            onClick={() => onLayout("LR")}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-surface-100 hover:bg-surface-200 rounded text-surface-600"
          >
            Horizontal Layout
          </button>
        </Panel>
        <Controls />
        <MiniMap nodeStrokeWidth={3} nodeColor={(node) => (node.data.isCritical ? "#ef4444" : "#e2e8f0")} />
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
};
