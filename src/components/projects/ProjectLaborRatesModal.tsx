import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { X, Plus, Save, Trash, HardHat, RefreshCw, AlertCircle } from "lucide-react";
import { projectsApi } from "@/domains/projects/api";
import { inventoryApi } from "@/domains/inventory/api";
import { toast } from "sonner";

interface ProjectLaborRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function ProjectLaborRatesModal({ isOpen, onClose, projectId }: ProjectLaborRatesModalProps) {
  const [rates, setRates] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New assignment state
  const [selectedMaster, setSelectedMaster] = useState("");
  const [dailyWage, setDailyWage] = useState("");

  const [isCreatingNewTrade, setIsCreatingNewTrade] = useState(false);
  const [newTradeName, setNewTradeName] = useState("");
  const [newTradeCategory, setNewTradeCategory] = useState("UNSKILLED");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([
        projectsApi.getProjectLaborRates(projectId),
        inventoryApi.getLaborMasters()
      ]);
      setRates(r);
      setMasters(m);
    } catch (err) {
      toast.error("Failed to load labor configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchData();
    }
  }, [isOpen, projectId]);

  const handleAdd = async () => {
    if (isCreatingNewTrade) {
      if (!newTradeName || !dailyWage) {
        toast.error("Enter a trade name and a daily wage");
        return;
      }
    } else {
      if (!selectedMaster || !dailyWage) {
        toast.error("Select a trade and enter a daily wage");
        return;
      }
      if (rates.some(r => r.labor_master === selectedMaster)) {
        toast.error("This trade is already mapped to the project.");
        return;
      }
    }

    try {
      let masterId = selectedMaster;
      
      if (isCreatingNewTrade) {
        const newMaster = await inventoryApi.createLaborMaster({
          trade_type: newTradeName,
          category: newTradeCategory as any,
          standard_daily_rate: dailyWage as any
        });
        masterId = newMaster.id;
      }

      await projectsApi.createProjectLaborRate(projectId, {
        labor_master: masterId,
        project_daily_wage: parseFloat(dailyWage)
      });
      toast.success(isCreatingNewTrade ? "New trade created and added to project!" : "Labor rate configured for project!");
      
      setSelectedMaster("");
      setDailyWage("");
      setIsCreatingNewTrade(false);
      setNewTradeName("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add project labor rate");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await projectsApi.deleteProjectLaborRate(projectId, id);
      toast.success("Labor rate removed");
      setRates(rates.filter(r => r.id !== id));
    } catch (err) {
      toast.error("Failed to remove");
    }
  };

  const unassignedMasters = masters.filter(m => !rates.some(r => r.labor_master === m.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface-50 border border-surface-300 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-surface-200 bg-surface-100">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <HardHat className="w-5 h-5 text-accent" />
            Site Manpower & Daily Wages
          </h2>
          <p className="text-xs text-surface-500 mt-1">
            Define the specific trades and their daily wages applicable to this project. Only these trades will be available for logging attendance in the Field Diary.
          </p>
        </div>
        <button onClick={onClose} className="p-2 text-surface-400 hover:text-foreground bg-surface-100 hover:bg-surface-200 rounded-full transition-colors">
          <X className="w-4 h-4" />
        </button>
        </div>

      <div className="p-6 bg-surface-50 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Add New Rate Form */}
        <div className="bg-surface-50 p-5 border border-surface-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-foreground">Add Manpower to Site</h4>
            
            <div className="flex bg-surface-200/50 p-1 rounded-lg">
              <button 
                onClick={() => setIsCreatingNewTrade(false)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!isCreatingNewTrade ? "bg-background shadow-xs text-foreground" : "text-surface-500 hover:text-foreground"}`}
              >
                Select Existing Trade
              </button>
              <button 
                onClick={() => setIsCreatingNewTrade(true)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${isCreatingNewTrade ? "bg-background shadow-xs text-foreground" : "text-surface-500 hover:text-foreground"}`}
              >
                Create Custom Trade
              </button>
            </div>
          </div>

          {!isCreatingNewTrade ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-7">
                <label className="block text-xs font-bold text-surface-500 mb-1.5 uppercase tracking-wider">Select Trade</label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent bg-surface-100 text-foreground outline-none cursor-pointer"
                  value={selectedMaster}
                  onChange={(e) => {
                    setSelectedMaster(e.target.value);
                    const match = masters.find(m => m.id === e.target.value);
                    if (match) setDailyWage(match.standard_daily_rate);
                  }}
                >
                  <option value="">Select a Trade from Master Registry...</option>
                  {unassignedMasters.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.trade_type} {m.vendor ? `(Vendor: ${m.vendor_name})` : ''} - Std: ₹{m.standard_daily_rate}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-surface-500 mb-1.5 uppercase tracking-wider">Daily Wage (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm font-bold">₹</span>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full h-10 pl-7 pr-3 rounded-lg border border-surface-200 text-sm font-black focus:ring-2 focus:ring-accent/20 focus:border-accent bg-surface-100 text-foreground outline-none"
                    value={dailyWage}
                    onChange={(e) => setDailyWage(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button onClick={handleAdd} className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-10 shadow-sm cursor-pointer">
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-surface-500 mb-1.5 uppercase tracking-wider">Trade Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Master Mason" 
                  className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent bg-surface-100 text-foreground outline-none"
                  value={newTradeName}
                  onChange={(e) => setNewTradeName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-surface-500 mb-1.5 uppercase tracking-wider">Category</label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent bg-surface-100 text-foreground outline-none cursor-pointer"
                  value={newTradeCategory}
                  onChange={(e) => setNewTradeCategory(e.target.value)}
                >
                  <option value="UNSKILLED">Unskilled</option>
                  <option value="SEMI_SKILLED">Semi-Skilled</option>
                  <option value="SKILLED">Skilled</option>
                  <option value="SUPERVISORY">Supervisory</option>
                  <option value="OPERATOR">Operator</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-surface-500 mb-1.5 uppercase tracking-wider">Daily Wage (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm font-bold">₹</span>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full h-10 pl-7 pr-3 rounded-lg border border-surface-200 text-sm font-black focus:ring-2 focus:ring-accent/20 focus:border-accent bg-surface-100 text-foreground outline-none"
                    value={dailyWage}
                    onChange={(e) => setDailyWage(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button onClick={handleAdd} className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-10 shadow-sm cursor-pointer">
                  Create & Add
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Rates List */}
        <div>
          <h4 className="text-xs font-bold text-surface-400 uppercase mb-3 flex justify-between items-center">
            Configured Project Trades
            {loading && <RefreshCw className="w-3 h-3 animate-spin text-surface-400" />}
          </h4>
          
          {rates.length === 0 && !loading ? (
            <div className="text-center py-12 bg-surface-50 border border-surface-200 border-dashed rounded-xl">
              <HardHat className="w-10 h-10 mx-auto text-surface-300 mb-3" />
              <h3 className="text-sm font-bold text-foreground">No Labor Configured</h3>
              <p className="text-xs text-surface-500 mt-1">Map trades to this project to log them in the Field Diary.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rates.map(rate => (
                <div key={rate.id} className="bg-surface-50 border border-surface-200 p-4 rounded-xl flex items-center justify-between shadow-sm hover:border-accent hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center text-accent">
                      <HardHat className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">{rate.trade_type}</p>
                      <p className="text-[11px] text-surface-500 font-medium">
                        {rate.vendor_name ? `Vendor: ${rate.vendor_name} • ` : ''} 
                        Category: <span className="uppercase text-[9px] bg-surface-100 px-1 py-0.5 rounded ml-1">{rate.category}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-surface-400 uppercase font-bold">Daily Wage</p>
                      <p className="font-black text-accent">₹{parseFloat(rate.project_daily_wage).toFixed(2)}</p>
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(rate.id)}
                      className="p-1.5 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove from project"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
