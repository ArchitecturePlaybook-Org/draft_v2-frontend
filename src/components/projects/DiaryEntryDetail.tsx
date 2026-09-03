import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { projectsApi } from "@/domains/projects/api";
import { inventoryApi } from "@/domains/inventory/api";
import { MasterMaterial, Site, MaterialIssue, SiteBalance } from "@/domains/inventory/types";
import { ChevronDown, ChevronUp, Plus, Sun, Cloud, CloudRain, Wind, AlertTriangle, Hammer, Package, Truck, Activity, Trash, Camera, Paperclip, File, Receipt, ImagePlus, Calendar as CalendarIcon, UserCheck, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface DiaryEntryDetailProps {
  entry: any;
  projectId: string;
  onUpdate: () => void;
  onClose?: () => void;
  onOpenCalendar?: () => void;
  onGoToToday?: () => void;
  readOnly?: boolean;
}

export const DiaryEntryDetail: React.FC<DiaryEntryDetailProps> = ({ 
  entry, 
  projectId, 
  onUpdate, 
  onClose, 
  onOpenCalendar,
  onGoToToday,
  readOnly = false 
}) => {
  const isLocked = entry.status === "signed" || readOnly;
  
  // Section states for adding new items
  const [newLabor, setNewLabor] = useState({ labor_id: "", headcount: "", total_hours: "", zone: "" });
  const [newMaterial, setNewMaterial] = useState({ description: "", quantity: "", unit: "", supplier: "", ticket_number: "", status: "good", cost: "" });
  const [newMaterialReceipt, setNewMaterialReceipt] = useState<File | null>(null);
  const newMaterialReceiptRef = useRef<HTMLInputElement>(null);
  const [newEquipment, setNewEquipment] = useState({ equipment_id: "", hours_operated: "", hours_idle: "", status: "operational" });
  const [newDelay, setNewDelay] = useState({ delay_type: "weather", duration_hours: "", impacted_path: "" });
  const [uploadingReceiptId, setUploadingReceiptId] = useState<number | null>(null);

  // Material Receipts Sub-Tab state
  const [materialSubTab, setMaterialSubTab] = useState<"legacy" | "live">("legacy");
  const [liveMaterials, setLiveMaterials] = useState<MasterMaterial[]>([]);
  const [liveSites, setLiveSites] = useState<Site[]>([]);
  const [liveIssues, setLiveIssues] = useState<MaterialIssue[]>([]);
  const [liveBalances, setLiveBalances] = useState<SiteBalance[]>([]);
  const [liveEquipment, setLiveEquipment] = useState<any[]>([]);
  const [selectedLiveMat, setSelectedLiveMat] = useState("");
  const [selectedLiveSite, setSelectedLiveSite] = useState("");
  const [liveWorker, setLiveWorker] = useState("");
  const [liveTrade, setLiveTrade] = useState("MASON");
  const [liveQty, setLiveQty] = useState<number>(10);
  const [liveLocation, setLiveLocation] = useState("");
  const [liveMaterialFilter, setLiveMaterialFilter] = useState("ALL");
  const [isPostingLive, setIsPostingLive] = useState(false);

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metadata: true,
    progress: true,
    attachments: true,
  });

  const [laborMasters, setLaborMasters] = useState<any[]>([]);

  useEffect(() => {
    // Fetch Live Material and Equipment data when expanded
    if (expandedSections.materials && liveMaterials.length === 0) {
      inventoryApi.getMaterials().then(setLiveMaterials).catch(console.error);
      inventoryApi.getSites().then(setLiveSites).catch(console.error);
    }
    if (expandedSections.equipment && liveEquipment.length === 0) {
      inventoryApi.getEquipment().then((res: any) => setLiveEquipment(Array.isArray(res) ? res : res.results || [])).catch(console.error);
    }
    if (expandedSections.labor && laborMasters.length === 0) {
      projectsApi.getProjectLaborRates(projectId).then(setLaborMasters).catch(console.error);
    }
  }, [expandedSections]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (materialSubTab === "live" || expandedSections.equipment) {
      loadLiveInventoryData();
    }
  }, [materialSubTab, expandedSections.equipment]);

  const loadLiveInventoryData = async () => {
    try {
      const [mats, sites, issues, bals, equips] = await Promise.all([
        inventoryApi.getMaterials(),
        inventoryApi.getSites(),
        inventoryApi.getMaterialIssues(),
        inventoryApi.getAllBalances(),
        inventoryApi.getEquipment(),
      ]);
      setLiveMaterials(mats);
      setLiveSites(sites);
      setLiveIssues(issues);
      setLiveBalances(bals);
      setLiveEquipment(equips);
      if (mats.length > 0 && !selectedLiveMat) setSelectedLiveMat(mats[0].id);
      if (sites.length > 0 && !selectedLiveSite) setSelectedLiveSite(sites[0].id);
    } catch (err) {
      console.error("Failed to load live inventory data for field diary", err);
    }
  };

  const selectedMaterialObj = liveMaterials.find((m) => m.id === selectedLiveMat);
  const availableStockForSelected = liveBalances.find(
    (b) => b.site_id === selectedLiveSite && b.material_id === selectedLiveMat
  )?.current_balance ?? 0;

  const handlePostLiveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLiveSite || !selectedLiveMat || !liveWorker || liveQty <= 0) {
      toast.error("Please fill in worker name, material, site, and quantity.");
      return;
    }
    setIsPostingLive(true);
    const toastId = toast.loading("Generating Worker Material Issue Slip & Updating Site Stock...");
    try {
      await inventoryApi.createMaterialIssue({
        site: selectedLiveSite,
        material: selectedLiveMat,
        qty: liveQty,
        issued_to: liveWorker,
        worker_trade: liveTrade,
        purpose: `Field Diary Log Entry #${entry.id}`,
        location_in_site: liveLocation || "Site Work Area",
      });
      toast.success("Worker Material Issue Slip generated! Live Stock debited.", { id: toastId });
      setLiveWorker("");
      setLiveLocation("");
      loadLiveInventoryData();
      onUpdate();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create material issue slip", { id: toastId });
    } finally {
      setIsPostingLive(false);
    }
  };

  // Local temperature state — buffered so we only PATCH on blur, not on every keystroke.
  // Sending intermediate values like "", "-", "2." to the backend DecimalField causes 400 errors.
  const [tempHigh, setTempHigh] = useState<string>(entry.temperature_high != null ? String(entry.temperature_high) : "");
  const [tempLow, setTempLow] = useState<string>(entry.temperature_low != null ? String(entry.temperature_low) : "");

  // Keep local temp state in sync when the parent entry prop changes (e.g. after onUpdate refresh)
  React.useEffect(() => {
    setTempHigh(entry.temperature_high != null ? String(entry.temperature_high) : "");
    setTempLow(entry.temperature_low != null ? String(entry.temperature_low) : "");
  }, [entry.temperature_high, entry.temperature_low]);

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
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign");
    }
  };

  const addSubEntry = async (type: string, payload: any, resetFn: () => void) => {
    if (isLocked) return;
    try {
      const result = await projectsApi.createDiarySubEntry(entry.id, type, payload);
      // If this is a material entry and a receipt image was staged, upload it now
      if (type === "materials" && newMaterialReceipt) {
        // The result from createDiarySubEntry for materials returns the full entry;
        // find the latest material entry id from the updated entry's material_entries
        const latestMaterial = result?.material_entries?.at(-1);
        if (latestMaterial?.id) {
          try {
            await projectsApi.uploadMaterialReceipt(latestMaterial.id, newMaterialReceipt);
          } catch {
            toast.warning("Receipt image could not be attached — please use the attachment button on the card.");
          }
        }
        setNewMaterialReceipt(null);
        if (newMaterialReceiptRef.current) newMaterialReceiptRef.current.value = "";
      }
      toast.success("Added successfully");
      resetFn();
      onUpdate();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add entry");
    }
  };

  const handleDelete = async (subModel: string, id: number) => {
    if (isLocked) return;
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      await projectsApi.deleteDiarySubEntry(subModel, id);
      toast.success("Deleted successfully");
      onUpdate();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete entry");
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
    } finally {
      e.target.value = "";
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
    <div className="bg-surface-100 border-surface-200 rounded-xl border shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2 border-b border-surface-200 bg-surface-100 rounded-t-xl flex flex-wrap justify-between items-center gap-2 shadow-xs">
        <div>
          <h2 className="text-sm font-black text-primary">Diary: {entry.entry_date}</h2>
          <div className="flex gap-1.5 items-center mt-0.5">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase ${entry.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {entry.status}
            </span>
            {entry.status !== "signed" && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>Draft - Unlocked</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenCalendar && (
            <button
              onClick={onOpenCalendar}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-background font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-xs cursor-pointer"
              title="Select Date / Calendar"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Select Date</span>
            </button>
          )}

          {onGoToToday && (
            <button
              onClick={onGoToToday}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-200 hover:bg-surface-300 text-surface-700 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
              title="Go to Today"
            >
              Go to Today
            </button>
          )}

          {!isLocked && (
            <Button variant="primary" size="sm" onClick={handleSign}>Sign & Lock</Button>
          )}
          {onClose && <Button variant="outline" size="sm" onClick={onClose}>Close</Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-surface-50 no-scrollbar">

        {/* 1. Metadata & Weather */}
        <div className="bg-surface-100 border-surface-200 border rounded-lg overflow-hidden shadow-xs">
          <div 
            className="p-2.5 flex justify-between items-center cursor-pointer hover:bg-surface-50 select-none"
            onClick={() => toggleSection('metadata')}
          >
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-100 text-blue-600 rounded-md"><Sun className="w-4 h-4" /></div>
              <h3 className="font-bold text-xs text-surface-800">Weather & Conditions</h3>
              {!expandedSections.metadata && (
                <span className="text-[11px] font-medium text-surface-400 ml-2">
                  {entry.sky_conditions || 'Not set'} • {entry.temperature_high ? `${entry.temperature_high}°C` : '-'}
                </span>
              )}
            </div>
            {expandedSections.metadata ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
          </div>
          
          {expandedSections.metadata && (
            <div className="p-3 border-t border-surface-100 bg-surface-100 space-y-3">
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
                    <input
                      type="number"
                      disabled={isLocked}
                      className="w-full h-10 px-3 rounded-lg border border-surface-200"
                      value={tempHigh}
                      onChange={e => setTempHigh(e.target.value)}
                      onBlur={() => {
                        const parsed = tempHigh === "" ? null : parseFloat(tempHigh);
                        if (!isNaN(parsed as number) || parsed === null) {
                          handleMetadataUpdate("temperature_high", parsed);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-surface-500 text-surface-400 uppercase mb-2">Temp Low (°C)</label>
                    <input
                      type="number"
                      disabled={isLocked}
                      className="w-full h-10 px-3 rounded-lg border border-surface-200"
                      value={tempLow}
                      onChange={e => setTempLow(e.target.value)}
                      onBlur={() => {
                        const parsed = tempLow === "" ? null : parseFloat(tempLow);
                        if (!isNaN(parsed as number) || parsed === null) {
                          handleMetadataUpdate("temperature_low", parsed);
                        }
                      }}
                    />
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
                        <p className="font-bold text-surface-800">{l.labor_trade_type || l.crew_name} <span className="text-surface-400 font-normal">({l.labor_vendor_name || l.trade_type})</span></p>
                        <p className="text-xs font-bold text-surface-500 uppercase mt-1">Zone: {l.zone || 'N/A'}</p>
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
                  <h4 className="text-xs font-bold text-surface-400 uppercase mb-3 flex items-center gap-1"><Plus className="w-3 h-3" /> Log New Crew</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select className="h-10 px-3 rounded-lg border border-surface-200 text-sm md:col-span-2" value={newLabor.labor_id} onChange={e => setNewLabor({...newLabor, labor_id: e.target.value})}>
                      <option value="">Select Manpower Type...</option>
                      {laborMasters.map((lm: any) => (
                        <option key={lm.id} value={lm.id}>{lm.trade_type} {lm.vendor_name ? `(${lm.vendor_name})` : ""}</option>
                      ))}
                    </select>
                    <input type="number" placeholder="Headcount" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newLabor.headcount} onChange={e => setNewLabor({...newLabor, headcount: e.target.value})}/>
                    <input type="number" placeholder="Total Hours" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newLabor.total_hours} onChange={e => setNewLabor({...newLabor, total_hours: e.target.value})}/>
                    <input type="text" placeholder="Location / Zone" className="h-10 px-3 rounded-lg border border-surface-200 col-span-1 md:col-span-2 text-sm" value={newLabor.zone} onChange={e => setNewLabor({...newLabor, zone: e.target.value})}/>
                    <Button className="md:col-span-2" onClick={() => {
                      const payload = {
                        labor: newLabor.labor_id,
                        headcount: newLabor.headcount,
                        total_hours: newLabor.total_hours,
                        zone: newLabor.zone
                      };
                      addSubEntry("labor", payload, () => setNewLabor({labor_id: "", headcount: "", total_hours: "", zone: ""}))
                    }}>Add Crew Record</Button>
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
              {/* Sub-Tab Selector */}
              <div className="flex items-center gap-2 bg-surface-50 p-1 rounded-xl border border-surface-200">
                <button
                  type="button"
                  onClick={() => setMaterialSubTab("legacy")}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    materialSubTab === "legacy"
                      ? "bg-surface-200 text-primary shadow-sm border-b-2 border-accent"
                      : "text-surface-400 hover:bg-surface-100"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Manual Field Log (Legacy)
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialSubTab("live")}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    materialSubTab === "live"
                      ? "bg-surface-200 text-emerald-600 shadow-sm border-b-2 border-emerald-500"
                      : "text-surface-400 hover:bg-surface-100"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Live Stock & Worker Issue Slips
                </button>
              </div>

              {materialSubTab === "legacy" ? (
                <>
                  <div className="space-y-3">
                    {entry.material_entries?.map((m: any) => {
                      const receiptUrl: string | null = m.receipt_image_url || null;
                      const isReceiptImg = receiptUrl ? isImageUrl(receiptUrl) : false;
                      return (
                        <div key={m.id} className="p-4 bg-surface-50 border border-surface-200 rounded-xl flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-surface-800">{m.description}</p>
                            <p className="text-xs font-medium text-surface-500 text-surface-400 mt-1">
                              Supplier: {m.supplier} • Ticket: {m.ticket_number}
                              {m.cost != null && ` • Cost: ₹${parseFloat(m.cost).toFixed(2)}`}
                            </p>

                            {/* Receipt image: thumbnail or file link */}
                            {receiptUrl && (
                              <div className="mt-3">
                                {isReceiptImg ? (
                                  <a href={receiptUrl} target="_blank" rel="noopener noreferrer" title="View full receipt">
                                    <img
                                      src={receiptUrl}
                                      alt="Receipt"
                                      className="h-20 w-auto max-w-[160px] object-cover rounded-lg border border-emerald-200 dark:border-emerald-800/50 hover:opacity-90 transition-opacity cursor-zoom-in"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    href={receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50 hover:underline"
                                  >
                                    <Receipt className="w-3.5 h-3.5" /> View Receipt PDF
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Attach receipt button for entries without one */}
                            {!receiptUrl && !isLocked && (
                              <div className="mt-3">
                                <input
                                  type="file"
                                  id={`receipt-upload-${m.id}`}
                                  className="hidden"
                                  accept="image/*,application/pdf"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingReceiptId(m.id);
                                    const toastId = toast.loading("Uploading receipt...");
                                    try {
                                      await projectsApi.uploadMaterialReceipt(m.id, file);
                                      toast.success("Receipt attached", { id: toastId });
                                      onUpdate();
                                    } catch (err: any) {
                                      toast.error(err?.message || "Failed to upload receipt", { id: toastId });
                                    } finally {
                                      setUploadingReceiptId(null);
                                      e.target.value = "";
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`receipt-upload-${m.id}`}
                                  className={`inline-flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-emerald-600 bg-surface-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-surface-200 hover:border-emerald-300 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                    uploadingReceiptId === m.id ? "opacity-60 pointer-events-none" : ""
                                  }`}
                                >
                                  <ImagePlus className="w-3.5 h-3.5" />
                                  {uploadingReceiptId === m.id ? "Uploading..." : "Attach Receipt"}
                                </label>
                              </div>
                            )}
                          </div>

                          <div className="text-right flex items-start gap-3 shrink-0">
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
                      );
                    })}
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
                        <input type="number" step="0.01" placeholder="Cost (e.g. 1500.00)" className="h-10 px-3 rounded-lg border border-surface-200 text-sm" value={newMaterial.cost} onChange={e => setNewMaterial({...newMaterial, cost: e.target.value})}/>
                        <select className="h-10 px-3 rounded-lg border border-surface-200 text-sm font-medium" value={newMaterial.status} onChange={e => setNewMaterial({...newMaterial, status: e.target.value})}>
                          <option value="good">Status: Good Condition</option>
                          <option value="damaged">Status: Damaged</option>
                          <option value="rejected">Status: Rejected</option>
                        </select>

                        {/* Receipt image picker */}
                        <div className="col-span-1 md:col-span-2">
                          <input
                            ref={newMaterialReceiptRef}
                            type="file"
                            id={`new-material-receipt-${entry.id}`}
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={e => setNewMaterialReceipt(e.target.files?.[0] ?? null)}
                          />
                          <label
                            htmlFor={`new-material-receipt-${entry.id}`}
                            className="flex items-center gap-2 w-full h-10 px-3 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 text-sm font-medium cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          >
                            <Receipt className="w-4 h-4 shrink-0" />
                            {newMaterialReceipt
                              ? <span className="truncate">{newMaterialReceipt.name}</span>
                              : <span>Attach receipt image or PDF <span className="text-surface-400 font-normal">(optional)</span></span>
                            }
                          </label>
                        </div>

                        <Button className="md:col-span-2" onClick={() => addSubEntry("materials", newMaterial, () => setNewMaterial({description: "", quantity: "", unit: "", supplier: "", ticket_number: "", status: "good", cost: ""}))}>Add Receipt</Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Live Material Issue & Stock Transaction Form */}
                  {!isLocked && (
                    <form onSubmit={handlePostLiveIssue} className="p-4 border-2 border-emerald-500/30 rounded-xl bg-emerald-950/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-500" /> Issue Material Slip to Worker (Live Stock Debit)
                        </h4>
                        <button
                          type="button"
                          onClick={loadLiveInventoryData}
                          className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Refresh Stock
                        </button>
                      </div>

                      {/* Dynamic Live On-Site Material Availability Inspector Card */}
                      {selectedMaterialObj && (
                        <div className="p-3 rounded-xl bg-surface-50 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-inner">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-surface-500 block">
                              Live On-Site Stock Balance for Selected Material
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-bold text-surface-900 text-sm">{selectedMaterialObj.name}</span>
                              <span className="text-[10px] font-extrabold font-mono px-1.5 py-0.5 rounded bg-surface-200 text-surface-700">
                                [{selectedMaterialObj.item_code || "MAT"}]
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] font-semibold text-surface-500 block">Available in Site Yard:</span>
                              <span className={`text-base font-extrabold font-mono ${availableStockForSelected > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {availableStockForSelected.toLocaleString()} {selectedMaterialObj.unit}
                              </span>
                            </div>
                            {availableStockForSelected > 0 ? (
                              <span className="px-2 py-1 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-300 uppercase shrink-0">
                                In Stock
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-300 uppercase shrink-0">
                                Out of Stock
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="font-bold text-surface-700 block mb-1">Target Construction Site</label>
                          <select
                            value={selectedLiveSite}
                            onChange={(e) => setSelectedLiveSite(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-surface-200 bg-surface-50 text-surface-800 font-medium"
                          >
                            {liveSites.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} [{s.code}]
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-surface-700 block mb-1">Master Material</label>
                          <select
                            value={selectedLiveMat}
                            onChange={(e) => setSelectedLiveMat(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-surface-200 bg-surface-50 text-surface-800 font-medium"
                          >
                            {liveMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-surface-700 block mb-1">Issued To (Worker / Subcontractor)</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ramesh Kumar / Mason Crew"
                            value={liveWorker}
                            onChange={(e) => setLiveWorker(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-surface-200 bg-surface-50 text-surface-800"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-surface-700 block mb-1">Worker Trade</label>
                          <select
                            value={liveTrade}
                            onChange={(e) => setLiveTrade(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-surface-200 bg-surface-50 text-surface-800 font-medium"
                          >
                            <option value="MASON">Mason</option>
                            <option value="BAR_BENDER">Bar Bender / Steel Fixer</option>
                            <option value="CARPENTER">Shuttering Carpenter</option>
                            <option value="ELECTRICIAN">Electrician</option>
                            <option value="PLUMBER">Plumber</option>
                            <option value="PAINTER">Painter</option>
                            <option value="TILER">Tiler</option>
                            <option value="WELDER">Welder</option>
                            <option value="HELPER">Helper / Unskilled Labor</option>
                            <option value="SUBCONTRACTOR">Subcontractor Firm</option>
                          </select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-surface-700">Quantity to Issue</label>
                            {availableStockForSelected > 0 && (
                              <button
                                type="button"
                                onClick={() => setLiveQty(availableStockForSelected)}
                                className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                              >
                                Max Available ({availableStockForSelected})
                              </button>
                            )}
                          </div>
                          <input
                            type="number"
                            required
                            min="0.001"
                            step="any"
                            value={liveQty}
                            onChange={(e) => setLiveQty(parseFloat(e.target.value) || 0)}
                            className="w-full h-9 px-3 rounded-lg border border-surface-200 bg-surface-50 text-surface-800 font-bold text-emerald-600"
                          />
                          {liveQty > availableStockForSelected && availableStockForSelected >= 0 && (
                            <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              Requested quantity exceeds live available stock ({availableStockForSelected} {selectedMaterialObj?.unit || "units"}).
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="font-bold text-surface-700 block mb-1">Site Location / Zone</label>
                          <input
                            type="text"
                            placeholder="e.g. Floor 2, Grid C-4"
                            value={liveLocation}
                            onChange={(e) => setLiveLocation(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-surface-200 bg-surface-50 text-surface-800"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isPostingLive || (availableStockForSelected <= 0 && liveQty > 0)}
                        className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        {isPostingLive ? "Generating Slip & Debit..." : "Generate Issue Slip & Debit Live Stock"}
                      </Button>
                    </form>
                  )}

                  {/* Live Issues Audit List */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-surface-600 uppercase tracking-wider">
                        Live Stock Issue Audit Slips ({liveIssues.length})
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs">
                        <label className="text-[11px] font-semibold text-surface-500">Filter Material:</label>
                        <select
                          value={liveMaterialFilter}
                          onChange={(e) => setLiveMaterialFilter(e.target.value)}
                          className="h-7 px-2 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-800 font-medium"
                        >
                          <option value="ALL">All Materials</option>
                          <option value="SELECTED">Selected Material Only</option>
                        </select>
                      </div>
                    </div>

                    {liveIssues.length === 0 ? (
                      <p className="text-xs text-surface-400 text-center py-4">No live worker issue slips generated yet.</p>
                    ) : (
                      liveIssues
                        .filter((iss) => liveMaterialFilter === "ALL" || (liveMaterialFilter === "SELECTED" && iss.material === selectedLiveMat))
                        .map((iss) => (
                          <div key={iss.id} className="p-3 bg-surface-50 border border-surface-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div>
                              <div className="font-bold text-surface-900 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                                {iss.issued_to}
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-100 text-purple-700 uppercase">
                                  {iss.worker_trade}
                                </span>
                              </div>
                              <div className="text-[11px] text-surface-500 mt-0.5">
                                Material: <span className="font-semibold text-surface-800">{iss.material_name}</span> • Site: {iss.site_name}
                              </div>
                              <div className="text-[10px] text-surface-400 mt-0.5">
                                {new Date(iss.issued_at).toLocaleString()} • Authorized by {iss.issued_by_name || "Storekeeper"}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-600 text-sm font-mono block">
                                -{iss.qty} {iss.material_unit}
                              </span>
                              <span className="text-[10px] text-surface-400 font-mono">
                                #{iss.issue_number || "SLIP"}
                              </span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </>
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
                    <input list="equipment-options" type="text" placeholder="Equipment ID / Type (Select or Type)" className="h-10 px-3 rounded-lg border border-surface-200 col-span-1 md:col-span-2 text-sm" value={newEquipment.equipment_id} onChange={e => setNewEquipment({...newEquipment, equipment_id: e.target.value})}/>
                    <datalist id="equipment-options">
                      {liveEquipment.map(eq => (
                        <option key={eq.id} value={`[${eq.equipment_code}] ${eq.name}`} />
                      ))}
                    </datalist>
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
