import React, { useState, useEffect } from "react";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

interface ChecklistManagerProps {
  projectUid: string;
}

export const ChecklistManager: React.FC<ChecklistManagerProps> = ({ projectUid }) => {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const fetchChecklists = async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.getProjectChecklists(projectUid);
      setChecklists(data || []);
    } catch (err: any) {
      toast.error("Failed to load checklists: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, [projectUid]);

  if (isLoading) {
    return <div className="py-20 text-center text-surface-400 font-bold">Loading checklists...</div>;
  }

  if (checklists.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-surface-200 p-20 text-center shadow-sm mt-6">
        <p className="text-4xl mb-4 opacity-50">📋</p>
        <p className="text-sm font-bold text-surface-500">No checklists found in this project.</p>
        <p className="text-xs text-surface-400 mt-2">Add checklists within individual tasks.</p>
      </div>
    );
  }

  // Group checklists by task
  const groupedByTask = checklists.reduce((acc, item) => {
    const taskTitle = item.task_title || item.task;
    if (!acc[taskTitle]) {
      acc[taskTitle] = [];
    }
    acc[taskTitle].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6 mt-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm p-6">
        <h2 className="text-xl font-extrabold text-primary mb-6">Master Checklists</h2>
        
        <div className="space-y-8">
          {Object.entries(groupedByTask).map(([taskTitle, items]) => (
            <div key={taskTitle} className="space-y-4">
              <h3 className="text-sm font-bold text-surface-500 uppercase tracking-widest border-b border-surface-100 pb-2">
                Task: {taskTitle}
              </h3>
              
              <div className="divide-y divide-surface-100 border border-surface-100 rounded-xl overflow-hidden bg-surface-50">
                {items.map(item => (
                  <div key={item.id} className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.is_completed ? 'bg-emerald-100 text-emerald-600' : 'bg-surface-200 text-surface-400'}`}>
                          {item.is_completed ? '✓' : ''}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${item.is_completed ? 'text-surface-500 line-through' : 'text-primary'}`}>
                            {item.title || item.description}
                          </p>
                          <div className="flex gap-2 items-center mt-1">
                            {item.requires_visual_proof && (
                              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">📸 Proof Req.</span>
                            )}
                            {item.is_completed && item.completed_by && (
                              <span className="text-[9px] text-surface-400 font-medium">Completed by {item.completed_by.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!item.is_completed && (
                        <span className="px-2 py-1 rounded bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest">
                          Pending
                        </span>
                      )}
                    </div>

                    {item.attachments && item.attachments.length > 0 && (
                      <div className="flex gap-2 ml-8 mt-2">
                        {item.attachments.map((att: any) => (
                          <button 
                            key={att.id} 
                            onClick={() => setLightboxImageUrl(att.file)}
                            className="w-16 h-16 rounded-lg overflow-hidden border border-surface-200 block hover:opacity-80 transition-opacity cursor-pointer focus:outline-none shrink-0"
                          >
                            <img src={att.file} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {lightboxImageUrl && (
        <ImageLightbox 
          imageUrl={lightboxImageUrl} 
          onClose={() => setLightboxImageUrl(null)} 
        />
      )}
    </div>
  );
};
