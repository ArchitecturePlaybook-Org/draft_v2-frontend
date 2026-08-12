"use client";

import React, { useState } from "react";
import { useWishlistStore } from "@/store/wishlist-store";
import { exportBoQToCSV, exportBoQToPDF } from "@/domains/showroom/boqExporter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function parsePrice(p: any): number {
  if (typeof p.price === 'number') return p.price;
  if (typeof p.price_min === 'number') return p.price_min;
  if (p.price_min) return parseFloat(p.price_min) || 0;
  if (p.price_display) {
    const num = parseFloat(p.price_display.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function WishlistDrawer({ isOpen, onClose }: WishlistDrawerProps) {
  const { items, removeItem, updateQuantity, projectFolders, addProjectFolder } = useWishlistStore();
  const [selectedFolder, setSelectedFolder] = useState<string>("All");
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  if (!isOpen) return null;

  const filteredItems = selectedFolder === "All" 
    ? items 
    : items.filter(item => item.projectFolder === selectedFolder);

  const grandTotal = filteredItems.reduce((sum, item) => {
    return sum + parsePrice(item.product) * (item.quantity || 1);
  }, 0);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      addProjectFolder(newFolderName.trim());
      setSelectedFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="w-full max-w-lg bg-surface-card border-l border-surface-200 h-full flex flex-col shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-5 border-b border-surface-200 bg-surface-100/80 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent text-background font-black flex items-center justify-center text-lg shadow-sm">
                ❤️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-primary">Saved Specs &amp; BoQ</h3>
                <p className="text-[11px] text-surface-400 font-medium">
                  {items.length} items in saved trade collection
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-surface-200/60 hover:bg-surface-200 text-surface-500 hover:text-primary flex items-center justify-center font-bold text-base transition-all"
            >
              ✕
            </button>
          </div>

          {/* Folder Tabs */}
          <div className="p-4 border-b border-surface-200 bg-surface-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-surface-400">Project Collections</span>
              <button 
                onClick={() => setIsCreatingFolder(prev => !prev)}
                className="text-[10px] font-bold text-accent hover:underline"
              >
                + New Folder
              </button>
            </div>

            {isCreatingFolder && (
              <form onSubmit={handleCreateFolder} className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name (e.g. Master Bedroom)..."
                  className="flex-1 bg-surface-card border border-surface-200 rounded-lg px-3 py-1 text-xs font-medium outline-none focus:border-accent"
                />
                <Button type="submit" className="h-7 px-3 text-[10px] font-bold bg-accent text-background rounded-lg">Add</Button>
              </form>
            )}

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedFolder("All")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedFolder === "All"
                    ? "bg-accent text-background shadow-sm"
                    : "bg-surface-100 text-surface-500 hover:bg-surface-200"
                }`}
              >
                All ({items.length})
              </button>
              {projectFolders.map((folder) => {
                const count = items.filter(i => i.projectFolder === folder).length;
                return (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      selectedFolder === folder
                        ? "bg-accent text-background shadow-sm"
                        : "bg-surface-100 text-surface-500 hover:bg-surface-200"
                    }`}
                  >
                    📁 {folder} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const p = item.product;
                const price = parsePrice(p);
                const title = p.name || (p as any).title || "Product";
                const vendor = p.vendor_name || (p as any).professional_name || "Studio Nordic";
                const location = p.country_of_origin || (p as any).location || "Bangalore";
                const imgUrl = p.cover_image_url || (p.images && p.images.length > 0 ? p.images[0].image_url : '/placeholder.jpg');

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl border border-surface-200 bg-surface-100/60 flex items-center gap-3 relative group"
                  >
                    <img
                      src={imgUrl}
                      alt={title}
                      className="w-14 h-14 rounded-xl object-cover border border-surface-200 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-primary truncate">{title}</h4>
                      <p className="text-[10px] text-surface-400 font-medium truncate">
                        {vendor} • {location}
                      </p>
                      <p className="text-xs font-extrabold text-accent mt-0.5">
                        ₹{price.toLocaleString('en-IN')}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 bg-surface-card border border-surface-200 rounded-xl px-2 py-1">
                      <button
                        onClick={() => updateQuantity(p.id, (item.quantity || 1) - 1)}
                        className="text-xs font-bold text-surface-400 hover:text-primary px-1"
                      >
                        -
                      </button>
                      <span className="text-xs font-extrabold px-1 text-primary">{item.quantity || 1}</span>
                      <button
                        onClick={() => updateQuantity(p.id, (item.quantity || 1) + 1)}
                        className="text-xs font-bold text-surface-400 hover:text-primary px-1"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(p.id)}
                      className="w-7 h-7 rounded-lg bg-surface-200/50 hover:bg-surface-200 text-surface-400 hover:text-semantic-red flex items-center justify-center font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 text-surface-400 text-xs font-medium space-y-2">
                <div className="text-3xl">❤️</div>
                <p>No saved items in this collection folder.</p>
              </div>
            )}
          </div>

          {/* Footer Actions (BoQ Exporters) */}
          <div className="p-5 border-t border-surface-200 bg-surface-100/90 backdrop-blur-md space-y-3 shrink-0">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-surface-400">Total Project Estimate:</span>
              <span className="text-base font-black text-primary">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => exportBoQToPDF(filteredItems, selectedFolder === 'All' ? 'Trade BoQ Spec Sheet' : selectedFolder)}
                disabled={filteredItems.length === 0}
                className="bg-accent text-background font-extrabold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                📄 Export PDF BoQ
              </Button>
              <Button
                variant="outline"
                onClick={() => exportBoQToCSV(filteredItems, selectedFolder === 'All' ? 'Trade BoQ' : selectedFolder)}
                disabled={filteredItems.length === 0}
                className="border-surface-300 font-extrabold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
              >
                📊 Export CSV
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
