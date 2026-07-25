import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { projectsApi } from "@/domains/projects/api";
import { ChevronDown, ChevronUp, Plus, Sun, Cloud, CloudRain, Wind, AlertTriangle, Hammer, Package, Truck, Activity, Trash, Camera, Paperclip, File } from "lucide-react";

interface DiaryEntryDetailProps {
  entry: any;
  projectId: string;
  onUpdate: () => void;
  onClose?: () => void;
}

export const DiaryEntryDetail: React.FC<DiaryEntryDetailProps> = ({ entry, projectId, onUpdate, onClose }) => {
  const isLocked = entry.status === "signed";
  
  // Section states for adding new items
  const [newLabor, setNewLabor] = useState({ crew_name: "", trade_type: "", headcount: "", total_hours: "", zone: "" });
  const [newMaterial, setNewMaterial] = useState({ description: "", quantity: "", unit: "", supplier: "", ticket_number: "", status: "good" });
  const [newEquipment, setNewEquipment] = useState({ equipment_id: "", hours_operated: "", hours_idle: "", status: "operational" });
  const [newDelay, setNewDelay] = useState({ delay_type: "weather", duration_hours: "", impacted_path: "" });

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metadata: true,
    progress: true,
    attachments: true,
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMetadataUpdate = async (field: string, value: any) => {
    if (isLocked) return;
    try {
      await projectsApi.updateDiaryEntry(entry.id, { [field]: value });
      onUpdate();
    } catch (e) {
      toast.error("Failed to update");
    }
  };

  const handleSign = async () => {
    try {
      await projectsApi.signDiaryEntry(entry.id);
      toast.success("Diary Locked");
      onUpdate();
    } catch (e) {
      toast.error("Failed to sign");
    }
  };

  const addSubEntry = async (type: string, payload: any, resetFn: () => void) => {
    if (isLocked) return;
    try {
      await projectsApi.createDiarySubEntry(entry.id, type, payload);
      toast.success("Added successfully");
      resetFn();
      onUpdate();
    } catch (e) {
      toast.error("Failed to add entry");
    }
  };

  const handleDelete = async (subModel: string, id: number) => {
    if (isLocked) return;
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      await projectsApi.deleteDiarySubEntry(subModel, id);
      toast.success("Deleted successfully");
      onUpdate();
    } catch (e) {
      toast.error("Failed to delete entry");
    }
  };

  const isImageUrl = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0];
    return /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(cleanUrl);
  };

  const getCleanFileName = (url: string) => {
    if (!url) return "Attachment";
    const cleanUrl = url.split('?')[0];
    return cleanUrl.split('/').pop() || "Attachment";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const loadId = toast.loading("Uploading attachment...");
    try {
      await projectsApi.uploadDiaryAttachment(entry.id, file);
      toast.success("Attachment uploaded", { id: loadId });
      setExpandedSections(prev => ({ ...prev, attachments: true }));
      onUpdate();
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload attachment", { id: loadId });
    }
  };

  // Weather quick chips
  const weatherOptions = [
    { label: "Clear", value: "Clear", icon: <Sun className="w-4 h-4" /> },
    { label: "Rain", value: "Rain", icon: <CloudRain className="w-4 h-4" /> },
    { label: "Overcast", value: "Overcast", icon: <Cloud className="w-4 h-4" /> },
    { label: "Heavy Winds", value: "Heavy Winds", icon: <Wind className="w-4 h-4" /> },
  ];

  const siteConditionOptions = ["Dry", "Muddy", "Work Suspended"];

  return (
    <div className="bg-surface-100 border-surface-200 rounded-2xl border shadow-xl flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-surface-200 bg-surface-100 rounded-t-2xl flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-primary">Diary: {entry.entry_date}</h2>
          <div className="flex gap-2 items-center mt-1">
            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${entry.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {entry.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <Button variant="primary" onClick={handleSign}>Sign & Lock</Button>
          )}
          {onClose && <Button variant="outline" onClick={onClose}>Close</Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50">

        {/* 1. Metadata & Weather */}
        <div className="bg-surface-100 border-surface-200 border border-surface-200 rounded-xl overflow-hidden shadow-sm">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-surface-50 select-none"
            onClick={() => toggleSection('metadata')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Sun className="w-5 h-5" /></div>
              <h3 className="font-bold text-lg text-surface-800">Weather & Conditions</h3>
              {!expandedSections.metadata && (
                <span className="text-sm font-medium text-surface-500 text-surface-400 ml-4">
                  {entry.sky_conditions || 'Not set'} • {entry.temperature_high ? `${entry.temperature_high}°C` : '-'}
                </span>
              )}
            </div>
            {expandedSections.metadata ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
          </div>
          
          {expandedSections.metadata && (
            <div className="p-5 border-t border-surface-100 bg-surface-100 border-surface-200 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-surface-500 text-surface-400 uppercase mb-2">Sky Conditions</label>
                  <div className="flex flex-wrap gap-2">
                    {weatherOptions.map(opt => (
                      <button
                        key={opt.value}
                        disabled={isLocked}
                        onClick={() => handleMetadataUpdate("sky_conditions", opt.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          entry.sky_conditions === opt.value ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700' : 'bg-surface-100 border-surface-200 hover:bg-surface-50 text-surface-700 disabled:opacity-50'
                        }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-500 text-surface-400 uppercase mb-2">Site Conditions</label>
                  <div className="flex flex-wrap gap-2">
                    {siteConditionOptions.map(opt => (
                      <button
                        key={opt}
                        disabled={isLocked}
                        onClick={() => handleMetadataUpdate("site_conditions", opt)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          entry.site_conditions === opt ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700' : 'bg-surface-100 border-surface-200 hover:bg-surface-50 text-surface-700 disabled:opacity-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-surface-500 text-surface-400 uppercase mb-2">Temp High (°C)</label>
                    <input type="number" disabled={isLocked} className="w-full h-10 px-3 rounded-lg border border-surface-200" value={entry.temperature_high || ""} onChange={e => handleMetadataUpdate("temperature_high", e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-surface-500 text-surface-400 uppercase mb-2">Temp Low (°C)</label>
                    <input type="number" disabled={isLocked} className="w-full h-10 px-3 rounded-lg border border-surface-200" value={entry.temperature_low || ""} onChange={e => handleMetadataUpdate("temperature_low", e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-3 md:col-span-2 pt-2 border-t border-surface-100">
                  <input type="checkbox" id="weather_delay" className="w-5 h-5 rounded border-surface-300 text-blue-600 focus:ring-blue-500" disabled={isLocked} checked={entry.weather_delay || false} onChange={e => handleMetadataUpdate("weather_delay", e.target.checked)} />
                  <label htmlFor="weather_delay" className="text-sm font-bold text-surface-700 cursor-pointer select-none">Weather caused a delay today</label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Progress & Tasks */}
        <div className="bg-surface-100 border-surface-200 border border-surface-200 rounded-xl overflow-hidden shadow-sm">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-surface-50 select-none"
            onClick={() => toggleSection('progress')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Activity className="w-5 h-5" /></div>
              <h3 className="font-bold text-lg text-surface-800">Progress & Tasks Logged</h3>
              {!expandedSections.progress && (
                <span className="text-sm font-bold text-indigo-600 ml-4 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {entry.activities?.length || 0} activities
                </span>
              )}
            </div>
            {expandedSections.progress ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
          </div>
          
          {expandedSections.progress && (
            <div className="p-5 border-t border-surface-100 bg-surface-100 border-surface-200 space-y-4">
              {entry.activities?.length === 0 ? (
                <div className="text-center p-6 text-surface-400 text-sm font-medium border-2 border-dashed rounded-xl">No tasks logged today.</div>
              ) : (
                <div className="space-y-3">
                  {entry.activities?.map((act: any) => (
                    <div key={act.id} className="p-4 border border-surface-200 rounded-xl bg-surface-50">
                      <p className="text-xs font-bold text-indigo-600 uppercase mb-1 flex justify-between items-center">
                        <span>{act.task_name || "General Work"}</span>
                        {!isLocked && (
                          <button onClick={(e) => { e.stopPropagation(); handleDelete("activities", act.id); }} className="text-surface-400 hover:text-red-500">
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </p>
                      <p className="text-sm font-medium text-surface-800">{act.description}</p>
                      {(act.progress_percent || act.hours) && (
                        <div className="mt-3 text-xs text-surface-500 text-surface-400 font-bold flex gap-4">
                          {act.hours && <span className="flex items-center gap-1">⏱ {act.hours} hrs</span>}
                          {act.progress_percent && <span className="flex items-center gap-1">📈 {act.progress_percent}% complete</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Labor & Workforce */}
        <div className="bg-surface-100 border-surface-200 border border-surface-200 rounded-xl overflow-hidden shadow-sm">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-surface-50 select-none"
            onClick={() => toggleSection('labor')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Hammer className="w-5 h-5" /></div>
              <h3 className="font-bold text-lg text-surface-800">Labor & Workforce</h3>
              {!expandedSections.labor && (
                <span className="text-sm font-bold text-orange-600 ml-4 bg-orange-50 px-2 py-0.5 rounded-md">
                  {entry.labor_entries?.length || 0} crews · {entry.labor_entries?.reduce((sum: number, l: any) => sum + l.headcount, 0) || 0} workers
                </span>
              )}
            </div>
            {expandedSections.labor ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
          </div>
          
          {expandedSections.labor && (
            <div className="p-5 border-t border-surface-100 bg-surface-100 border-surface-200 space-y-4">
              <div className="space-y-3">
                {entry.labor_entries?.map((l: any) => (
                  <div key={l.id} className="p-4 bg-surface-50 border border-surface-200 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-surface-800">{l.crew_name} <span className="text-surface-400 font-normal">({l.trade_type})</span></p>
                      <p className="text-xs font-bold text-surface-500 text-surface-400 uppercase mt-1">Zone: {l.zone || 'N/A'}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-bold text-orange-600 text-lg">{l.headcount} <span className="text-sm font-normal text-surface-500 text-surface-400">workers</span></p>
                        <p className="text-xs font-bold text-surface-500 text-surface-400 uppercase">{l.total_hours} hrs</p>
                      </div>
                      {!isLocked && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete("labor", l.id); }} className="p-2 bg-surface-100 hover:bg-red-50 text-surface-400 hover:text-red-500 rounded-lg ml-2">
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {!isLocked && (
                <div className="p-4 border-2 border-dashed border-surface-200 rounded-xl bg-surface-50/50">
                  <h4 className="text-xs font-bold text-surface-500 text-surface-400 uppercase mb-3 flex items-center gap-1"><Plus className="w-3 h-3" /> Log New Crew</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" placeholder="Crew Name / Contractor" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newLabor.crew_name} onChange={e => setNewLabor({...newLabor, crew_name: e.target.value})}/>
                    <input type="text" placeholder="Trade (e.g. Masonry)" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newLabor.trade_type} onChange={e => setNewLabor({...newLabor, trade_type: e.target.value})}/>
                    <input type="number" placeholder="Headcount" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newLabor.headcount} onChange={e => setNewLabor({...newLabor, headcount: e.target.value})}/>
                    <input type="number" placeholder="Total Hours" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newLabor.total_hours} onChange={e => setNewLabor({...newLabor, total_hours: e.target.value})}/>
                    <input type="text" placeholder="Location / Zone" className="h-10 px-3 rounded-lg border border-surface-200 col-span-1 md:col-span-2 text-sm" value={newLabor.zone} onChange={e => setNewLabor({...newLabor, zone: e.target.value})}/>
                    <Button className="md:col-span-2" onClick={() => addSubEntry("labor", newLabor, () => setNewLabor({crew_name: "", trade_type: "", headcount: "", total_hours: "", zone: ""}))}>Add Crew Record</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Materials */}
        <div className="bg-surface-100 border-surface-200 border border-surface-200 rounded-xl overflow-hidden shadow-sm">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-surface-50 select-none"
            onClick={() => toggleSection('materials')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Package className="w-5 h-5" /></div>
              <h3 className="font-bold text-lg text-surface-800">Material Receipts</h3>
              {!expandedSections.materials && (
                <span className="text-sm font-bold text-emerald-600 ml-4 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                  {entry.material_entries?.length || 0} deliveries
                </span>
              )}
            </div>
            {expandedSections.materials ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
          </div>
          
          {expandedSections.materials && (
            <div className="p-5 border-t border-surface-100 bg-surface-100 border-surface-200 space-y-4">
              <div className="space-y-3">
                {entry.material_entries?.map((m: any) => (
                  <div key={m.id} className="p-4 bg-surface-50 border border-surface-200 rounded-xl flex justify-between items-start">
                    <div>
                      <p className="font-bold text-surface-800">{m.description}</p>
                      <p className="text-xs font-medium text-surface-500 text-surface-400 mt-1">Supplier: {m.supplier} • Ticket: {m.ticket_number}</p>
                    </div>
                    <div className="text-right flex items-start gap-3">
                      <div className="flex flex-col items-end">
                        <p className="font-bold text-emerald-600 text-lg bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">{m.quantity} <span className="text-sm font-normal text-emerald-700">{m.unit}</span></p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mt-2 ${m.status === 'good' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.status}</span>
                      </div>
                      {!isLocked && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete("materials", m.id); }} className="p-2 bg-surface-100 hover:bg-red-50 text-surface-400 hover:text-red-500 rounded-lg">
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {!isLocked && (
                <div className="p-4 border-2 border-dashed border-surface-200 rounded-xl bg-surface-50/50">
                   <h4 className="text-xs font-bold text-surface-500 text-surface-400 uppercase mb-3 flex items-center gap-1"><Plus className="w-3 h-3" /> Log Delivery</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" placeholder="Material Description" className="h-10 px-3 rounded-lg border border-surface-200 col-span-1 md:col-span-2 text-sm" value={newMaterial.description} onChange={e => setNewMaterial({...newMaterial, description: e.target.value})}/>
                    <input type="number" placeholder="Quantity" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newMaterial.quantity} onChange={e => setNewMaterial({...newMaterial, quantity: e.target.value})}/>
                    <input type="text" placeholder="Unit (e.g. tons, m3)" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}/>
                    <input type="text" placeholder="Supplier" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newMaterial.supplier} onChange={e => setNewMaterial({...newMaterial, supplier: e.target.value})}/>
                    <input type="text" placeholder="Ticket Number" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newMaterial.ticket_number} onChange={e => setNewMaterial({...newMaterial, ticket_number: e.target.value})}/>
                    <select className="h-10 px-3 rounded-lg border border-surface-200 col-span-1 md:col-span-2 text-sm font-medium" value={newMaterial.status} onChange={e => setNewMaterial({...newMaterial, status: e.target.value})}>
                      <option value="good">Status: Good Condition</option>
                      <option value="damaged">Status: Damaged</option>
                      <option value="rejected">Status: Rejected</option>
                    </select>
                    <Button className="md:col-span-2" onClick={() => addSubEntry("materials", newMaterial, () => setNewMaterial({description: "", quantity: "", unit: "", supplier: "", ticket_number: "", status: "good"}))}>Add Receipt</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Equipment */}
        <div className="bg-surface-100 border-surface-200 border border-surface-200 rounded-xl overflow-hidden shadow-sm">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-surface-50 select-none"
            onClick={() => toggleSection('equipment')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 text-stone-600 rounded-lg"><Truck className="w-5 h-5" /></div>
              <h3 className="font-bold text-lg text-surface-800">Equipment Utilization</h3>
              {!expandedSections.equipment && (
                <span className="text-sm font-bold text-stone-600 ml-4 bg-stone-50 px-2 py-0.5 rounded-md">
                  {entry.equipment_entries?.length || 0} equipment
                </span>
              )}
            </div>
            {expandedSections.equipment ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
          </div>
          
          {expandedSections.equipment && (
            <div className="p-5 border-t border-surface-100 bg-surface-100 border-surface-200 space-y-4">
              <div className="space-y-3">
                {entry.equipment_entries?.map((eq: any) => (
                  <div key={eq.id} className="p-4 bg-surface-50 border border-surface-200 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-surface-800">{eq.equipment_id}</p>
                      <p className="text-xs font-medium text-surface-500 text-surface-400 mt-1 uppercase tracking-wider">{eq.hours_operated}h operated • {eq.hours_idle}h idle</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-wider ${eq.status === 'operational' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{eq.status}</span>
                      {!isLocked && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete("equipment", eq.id); }} className="p-2 bg-surface-100 hover:bg-red-50 text-surface-400 hover:text-red-500 rounded-lg">
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {!isLocked && (
                <div className="p-4 border-2 border-dashed border-surface-200 rounded-xl bg-surface-50/50">
                  <h4 className="text-xs font-bold text-surface-500 text-surface-400 uppercase mb-3 flex items-center gap-1"><Plus className="w-3 h-3" /> Log Equipment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" placeholder="Equipment ID / Type" className="h-10 px-3 rounded-lg border border-surface-200 col-span-1 md:col-span-2 text-sm" value={newEquipment.equipment_id} onChange={e => setNewEquipment({...newEquipment, equipment_id: e.target.value})}/>
                    <input type="number" placeholder="Hrs Operated" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newEquipment.hours_operated} onChange={e => setNewEquipment({...newEquipment, hours_operated: e.target.value})}/>
                    <input type="number" placeholder="Hrs Idle" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newEquipment.hours_idle} onChange={e => setNewEquipment({...newEquipment, hours_idle: e.target.value})}/>
                    <select className="h-10 px-3 rounded-lg border border-surface-200 col-span-1 md:col-span-2 text-sm font-medium" value={newEquipment.status} onChange={e => setNewEquipment({...newEquipment, status: e.target.value})}>
                      <option value="operational">Operational</option>
                      <option value="breakdown">Breakdown</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                    <Button className="md:col-span-2" onClick={() => addSubEntry("equipment", newEquipment, () => setNewEquipment({equipment_id: "", hours_operated: "", hours_idle: "", status: "operational"}))}>Add Equipment</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. Delays */}
        <div className="bg-surface-100 border-surface-200 border border-surface-200 rounded-xl overflow-hidden shadow-sm">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-red-50 dark:bg-red-900/20 select-none transition-colors"
            onClick={() => toggleSection('delays')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
              <h3 className="font-bold text-lg text-surface-800">Delays & Disruptions</h3>
              {!expandedSections.delays && entry.delay_entries?.length > 0 && (
                <span className="text-sm font-bold text-red-600 ml-4 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800/30">
                  {entry.delay_entries?.length} reported
                </span>
              )}
            </div>
            {expandedSections.delays ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
          </div>
          
          {expandedSections.delays && (
            <div className="p-5 border-t border-surface-100 bg-surface-100 border-surface-200 space-y-4">
              <div className="space-y-3">
                {entry.delay_entries?.map((d: any) => (
                  <div key={d.id} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold text-red-800 text-sm uppercase tracking-widest flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {d.delay_type}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-surface-100 border-surface-200 text-red-700 px-2 py-1 rounded-md border border-red-200 dark:border-red-800/30">{d.duration_hours} hrs</span>
                        {!isLocked && (
                          <button onClick={(e) => { e.stopPropagation(); handleDelete("delays", d.id); }} className="p-1 bg-surface-100 hover:bg-red-50 text-surface-400 hover:text-red-500 rounded border border-red-200">
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-red-900 font-medium bg-surface-100 border-surface-200/50 p-2 rounded-lg border border-red-100">Impact: {d.impacted_path}</p>
                  </div>
                ))}
              </div>
              
              {!isLocked && (
                <div className="p-4 border-2 border-dashed border-red-200 dark:border-red-800/30 rounded-xl bg-red-50 dark:bg-red-900/20/30">
                  <h4 className="text-xs font-bold text-red-600 uppercase mb-3 flex items-center gap-1"><Plus className="w-3 h-3" /> Report Delay</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select className="h-10 px-3 rounded-lg border border-red-200 dark:border-red-800/30 text-sm font-medium focus:ring-red-500" value={newDelay.delay_type} onChange={e => setNewDelay({...newDelay, delay_type: e.target.value})}>
                      <option value="weather">Weather</option>
                      <option value="material">Material Shortage</option>
                      <option value="equipment">Equipment Breakdown</option>
                      <option value="design">Design Issue</option>
                      <option value="other">Other</option>
                    </select>
                    <input type="number" placeholder="Duration (hrs)" className="h-10 px-3 rounded-lg border border-red-200 dark:border-red-800/30 text-sm focus:ring-red-500" value={newDelay.duration_hours} onChange={e => setNewDelay({...newDelay, duration_hours: e.target.value})}/>
                    <input type="text" placeholder="Impacted Path / Tasks" className="h-10 px-3 rounded-lg border border-red-200 dark:border-red-800/30 col-span-1 md:col-span-2 text-sm focus:ring-red-500" value={newDelay.impacted_path} onChange={e => setNewDelay({...newDelay, impacted_path: e.target.value})}/>
                    <Button className="md:col-span-2" variant="danger" onClick={() => addSubEntry("delays", newDelay, () => setNewDelay({delay_type: "weather", duration_hours: "", impacted_path: ""}))}>Report Delay</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 7. Attachments */}
        <div className="bg-surface-100 border-surface-200 border border-surface-200 rounded-xl overflow-hidden shadow-sm">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-surface-50 select-none"
            onClick={() => toggleSection('attachments')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Camera className="w-5 h-5" /></div>
              <h3 className="font-bold text-lg text-surface-800">Photos & Attachments</h3>
              {!expandedSections.attachments && entry.attachments?.length > 0 && (
                <span className="text-sm font-bold text-purple-600 ml-4 bg-purple-50 px-2 py-0.5 rounded-md">
                  {entry.attachments.length} files
                </span>
              )}
            </div>
            {expandedSections.attachments ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
          </div>
          
          {expandedSections.attachments && (
            <div className="p-5 border-t border-surface-100 bg-surface-100 border-surface-200 space-y-4">
              {entry.attachments?.length === 0 ? (
                <div className="text-center p-6 text-surface-400 text-sm font-medium border-2 border-dashed rounded-xl">No attachments for this day.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {entry.attachments?.map((att: any) => {
                    const rawUrl = att.file || att.url || "";
                    const isImg = isImageUrl(rawUrl);
                    const fileName = getCleanFileName(rawUrl);

                    return (
                      <div key={att.id} className="relative group rounded-xl overflow-hidden border border-surface-200 aspect-square bg-surface-50 shadow-sm hover:shadow-md transition-all">
                        {isImg ? (
                          <a href={rawUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full block">
                            <img src={rawUrl} alt={att.caption || fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          </a>
                        ) : (
                          <a href={rawUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center text-surface-400 p-2 hover:bg-surface-100 transition-colors">
                            <File className="w-8 h-8 mb-2 text-surface-500" />
                            <span className="text-xs font-medium truncate w-full text-center text-surface-700">{fileName}</span>
                          </a>
                        )}
                        {!isLocked && (
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete("attachments", att.id); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
                            title="Delete attachment"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {!isLocked && (
                <div className="mt-4">
                  <input
                    type="file"
                    id={`file-upload-${entry.id}`}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <label 
                    htmlFor={`file-upload-${entry.id}`}
                    className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-surface-200 rounded-xl bg-surface-50 hover:bg-surface-100 text-surface-600 font-bold cursor-pointer transition-colors"
                  >
                    <Paperclip className="w-4 h-4" /> Add Attachment
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer padding */}
        <div className="h-8"></div>
      </div>
    </div>
  );
};
