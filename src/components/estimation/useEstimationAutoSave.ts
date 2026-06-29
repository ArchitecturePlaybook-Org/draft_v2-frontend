import { useEffect, useRef } from 'react';
import { useEstimationStore } from '@/store/estimation-store';
import { projectsApi } from '@/domains/projects/api';

export const useEstimationAutoSave = () => {
  const { items, lastSavedItems, floorPlanId, setLastSavedItems, setSyncStatus, updateItem } = useEstimationStore();
  
  // Use a ref to debounce API calls without triggering re-renders
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Prevent sync on first mount
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (!floorPlanId) return;

    // Detect if there are changes
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(lastSavedItems);
    
    if (itemsChanged) {
      setSyncStatus('saving');
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      timeoutRef.current = setTimeout(async () => {
        try {
          const currentItems = [...items];
          const previousItems = [...lastSavedItems];
          
          const created = currentItems.filter(i => !previousItems.find(p => p.id === i.id));
          const deleted = previousItems.filter(p => !currentItems.find(c => c.id === p.id));
          const updated = currentItems.filter(i => {
            const prev = previousItems.find(p => p.id === i.id);
            return prev && JSON.stringify(prev) !== JSON.stringify(i) && i.backendId;
          });

          // Process Deletes
          for (const del of deleted) {
            if (del.backendId) {
              await projectsApi.deleteEstimation(del.backendId);
            }
          }
          
          // Process Creates
          for (const item of created) {
            const data = {
              floor_plan: floorPlanId,
              item_code: item.item_code,
              description: item.description,
              unit: item.unit,
              gross_qty: item.gross_qty,
              net_qty: item.net_qty,
              trace_data: {
                type: item.type,
                points: item.points,
                color: item.color,
                multiplier: item.multiplier,
                unit_cost: item.unit_cost
              }
            };
            const res = await projectsApi.createEstimation(data);
            if (res && res.id) {
              // Update the store with the backendId, but silently so it doesn't trigger another sync loop
              updateItem(item.id, { backendId: res.id });
            }
          }
          
          // Process Updates
          for (const item of updated) {
            if (item.backendId) {
              const data = {
                item_code: item.item_code,
                description: item.description,
                unit: item.unit,
                gross_qty: item.gross_qty,
                net_qty: item.net_qty,
                trace_data: {
                  type: item.type,
                  points: item.points,
                  color: item.color,
                  multiplier: item.multiplier,
                  unit_cost: item.unit_cost
                }
              };
              await projectsApi.updateEstimation(item.backendId, data);
            }
          }
          
          // Everything succeeded
          setSyncStatus('saved');
          // Important: update lastSavedItems so we don't infinitely re-sync
          // We must grab the fresh items from the store because backendIds might have updated
          setLastSavedItems(useEstimationStore.getState().items);
          
          // Reset status after a few seconds
          setTimeout(() => {
             if (useEstimationStore.getState().syncStatus === 'saved') {
               useEstimationStore.getState().setSyncStatus('idle');
             }
          }, 3000);

        } catch (error) {
          console.error("Auto-save failed:", error);
          setSyncStatus('error');
        }
      }, 1000); // 1 second debounce
    }
  }, [items, lastSavedItems, floorPlanId, setLastSavedItems, setSyncStatus, updateItem]);
};
