import React, { useState } from "react";

import { X, Upload, FileJson, CheckCircle2 } from "lucide-react";
import { projectsApi } from "@/domains/projects/api";
import { toast } from "sonner";

interface BIMImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectUid: string;
  onImportSuccess: () => void;
  existingMaterialCodes: string[];
}

interface ParsedElement {
  category: string;
  volume?: number;
  area?: number;
  length?: number;
  count?: number;
}

interface GroupedCategory {
  category: string;
  totalQty: number;
  mapped_material_code: string;
}

export default function BIMImportDialog({ isOpen, onClose, projectUid, onImportSuccess, existingMaterialCodes }: BIMImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [groupedData, setGroupedData] = useState<GroupedCategory[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsParsing(true);
    
    try {
      const text = await selectedFile.text();
      const json = JSON.parse(text);
      
      const elements: ParsedElement[] = json.elements || json;
      if (!Array.isArray(elements)) {
        toast.error("Invalid JSON format. Expected an array of elements.");
        return;
      }

      // Group by category
      const groups: Record<string, number> = {};
      
      elements.forEach(el => {
        const cat = el.category || "Uncategorized";
        const qty = Number(el.volume) || Number(el.area) || Number(el.length) || Number(el.count) || 0;
        groups[cat] = (groups[cat] || 0) + qty;
      });

      const groupedArray = Object.entries(groups).map(([category, totalQty]) => ({
        category,
        totalQty,
        mapped_material_code: existingMaterialCodes.includes(category) ? category : "",
      }));

      setGroupedData(groupedArray);
      
    } catch (err) {
      toast.error("Failed to parse JSON file.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleMappingChange = (category: string, newCode: string) => {
    setGroupedData(prev => prev.map(item => 
      item.category === category ? { ...item, mapped_material_code: newCode } : item
    ));
  };

  const handleImport = async () => {
    if (groupedData.length === 0) return;
    
    setIsImporting(true);
    try {
      // Reconstruct elements payload with mappings
      const elementsPayload = groupedData.map(item => ({
        category: item.category,
        mapped_material_code: item.mapped_material_code || item.category,
        count: item.totalQty // we use count to pass the generic qty since backend checks volume/area/length/count
      }));

      const res = await projectsApi.importBIMJson(projectUid, elementsPayload);
      toast.success(`Successfully imported ${res.imported} BOQ items.`);
      onImportSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to import BIM data.");
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="flex items-center justify-between p-6 border-b border-surface-200">
            <div>
              <h2 className="text-xl font-black text-primary uppercase tracking-tight">Import from BIM</h2>
              <p className="text-sm text-surface-500 font-medium mt-1">Upload a CAD JSON export to auto-generate your BOQ.</p>
            </div>
            <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-surface-300 rounded-xl hover:border-accent hover:bg-surface-50 cursor-pointer transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileJson className="w-10 h-10 text-surface-400 mb-3" />
                  <p className="text-sm font-bold text-surface-600">Click to upload JSON</p>
                  <p className="text-xs text-surface-400 mt-1">or drag and drop</p>
                </div>
                <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
              </label>
            ) : isParsing ? (
              <div className="flex items-center justify-center h-48 text-surface-500 font-bold">
                Parsing JSON...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-surface-50 p-4 rounded-xl border border-surface-200">
                  <div className="flex items-center gap-3">
                    <FileJson className="w-6 h-6 text-emerald-500" />
                    <div>
                      <p className="font-bold text-sm text-surface-700">{file.name}</p>
                      <p className="text-xs text-surface-500">{groupedData.length} unique categories found</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="text-xs font-bold text-accent hover:text-primary">
                    Change File
                  </button>
                </div>

                <div className="border border-surface-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-surface-50 border-b border-surface-200">
                      <tr>
                        <th className="py-3 px-4 text-[10px] font-black text-surface-500 uppercase tracking-wider w-[40%]">BIM Category</th>
                        <th className="py-3 px-4 text-[10px] font-black text-surface-500 uppercase tracking-wider w-[20%] text-right">Total Qty</th>
                        <th className="py-3 px-4 text-[10px] font-black text-surface-500 uppercase tracking-wider w-[40%]">Map to Material Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {groupedData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-50">
                          <td className="py-3 px-4 font-bold text-sm text-primary">{item.category}</td>
                          <td className="py-3 px-4 font-black text-sm text-surface-600 text-right tabular-nums">
                            {item.totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-4">
                            <select
                              value={item.mapped_material_code}
                              onChange={(e) => handleMappingChange(item.category, e.target.value)}
                              className="w-full h-8 px-2 border border-surface-300 rounded-md text-xs font-bold bg-white text-surface-600 focus:border-accent outline-none"
                            >
                              <option value="">-- Keep as '{item.category}' --</option>
                              {existingMaterialCodes.map(code => (
                                <option key={code} value={code}>{code}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-surface-200 bg-surface-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-surface-600 hover:bg-surface-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || isImporting || groupedData.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isImporting ? "Importing..." : (
                <>
                  <Upload className="w-4 h-4" />
                  Import BOQ
                </>
              )}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
