import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExtractedPdfSheet } from "@/lib/pdf/pdfToJpeg";

interface PdfMultiSheetModalProps {
  isOpen: boolean;
  pdfFileName: string;
  initialSheets: ExtractedPdfSheet[];
  isUploading: boolean;
  onClose: () => void;
  onConfirmUpload: (sheetsToUpload: { title: string; blob: Blob; filename: string }[]) => Promise<void>;
}

const PRESET_TAGS = ["Ground Floor", "1st Floor", "2nd Floor", "Roof Plan", "Structural", "Electrical", "Plumbing"];

export const PdfMultiSheetModal: React.FC<PdfMultiSheetModalProps> = ({
  isOpen,
  pdfFileName,
  initialSheets,
  isUploading,
  onClose,
  onConfirmUpload,
}) => {
  const [sheets, setSheets] = useState<ExtractedPdfSheet[]>([]);
  const [expandedPreviewSheet, setExpandedPreviewSheet] = useState<ExtractedPdfSheet | null>(null);

  useEffect(() => {
    setSheets(initialSheets);
  }, [initialSheets]);

  if (!isOpen) return null;

  const handleTitleChange = (index: number, newTitle: string) => {
    setSheets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, title: newTitle } : s))
    );
  };

  const handleApplyPreset = (index: number, tag: string) => {
    const cleanBase = pdfFileName.replace(/\.[^/.]+$/, "");
    setSheets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, title: `${cleanBase} - ${tag}` } : s))
    );
  };

  const handleToggleSelect = (index: number) => {
    setSheets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setSheets((prev) => prev.map((s) => ({ ...s, selected: select })));
  };

  const selectedCount = sheets.filter((s) => s.selected).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toUpload = sheets
      .filter((s) => s.selected)
      .map((s) => ({
        title: s.title || `Sheet ${s.pageNumber}`,
        blob: s.blob,
        filename: `${s.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_p${s.pageNumber}.jpg`,
      }));

    if (toUpload.length === 0) return;
    await onConfirmUpload(toUpload);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-surface-card border border-surface-200/80 dark:border-surface-700/80 rounded-3xl p-5 sm:p-6 max-w-4xl w-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] relative flex flex-col max-h-[90vh] text-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-surface-200/60 dark:border-surface-800 shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent font-black text-lg shrink-0 shadow-inner">
                📐
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-foreground truncate">
                    PDF 2D Floor Plan Extractor
                  </h3>
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0">
                    2.0x Ultra HD
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-text-secondary truncate mt-0.5">
                  File: <strong className="text-foreground">{pdfFileName}</strong> • ({sheets.length} sheets converted to JPEG)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isUploading}
              className="w-8 h-8 rounded-full bg-surface-100 hover:bg-red-500 hover:text-white flex items-center justify-center text-surface-400 text-xs transition-colors shrink-0 disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Quick Select & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 my-3 p-2.5 rounded-2xl bg-surface-100/60 dark:bg-surface-800/40 border border-surface-200/60 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-surface-200/70 hover:bg-accent hover:text-background text-foreground rounded-lg transition-all"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-surface-200/70 hover:bg-surface-300 text-text-secondary rounded-lg transition-all"
              >
                Deselect All
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-accent bg-accent/15 px-3 py-1 rounded-xl border border-accent/30 shadow-2xs">
                {selectedCount} of {sheets.length} Sheets Selected
              </span>
            </div>
          </div>

          {/* Sheet Cards Grid */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-1 no-scrollbar pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sheets.map((sheet, index) => (
                  <div
                    key={sheet.pageNumber}
                    className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-3 ${
                      sheet.selected
                        ? "bg-surface-card border-accent/60 shadow-md ring-1 ring-accent/20"
                        : "bg-surface-100/30 border-surface-200 dark:border-surface-800 opacity-50"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={sheet.selected}
                        onChange={() => handleToggleSelect(index)}
                        className="w-4 h-4 rounded accent-accent cursor-pointer mt-1 shrink-0"
                      />

                      {/* Thumbnail Preview with Lightbox Toggle */}
                      <div 
                        onClick={() => setExpandedPreviewSheet(sheet)}
                        className="w-24 h-24 rounded-xl overflow-hidden border border-surface-200 bg-surface-100 shrink-0 relative group cursor-pointer shadow-xs hover:border-accent transition-colors"
                        title="Click to expand preview"
                      >
                        <img
                          src={sheet.previewUrl}
                          alt={`Page ${sheet.pageNumber}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                          🔍 Preview
                        </div>
                        <span className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-xs text-white text-[8px] font-black px-1.5 py-0.5 rounded-md">
                          Page {sheet.pageNumber}
                        </span>
                      </div>

                      {/* Sheet Details & Preset Quick Buttons */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[9px] font-black uppercase tracking-wider text-text-secondary">
                            Sheet {sheet.pageNumber} Title
                          </label>
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            JPEG Ready
                          </span>
                        </div>
                        <input
                          type="text"
                          required={sheet.selected}
                          value={sheet.title}
                          onChange={(e) => handleTitleChange(index, e.target.value)}
                          placeholder={`Floor Plan Sheet ${sheet.pageNumber}`}
                          className="w-full bg-surface-100 border border-surface-200 rounded-xl px-3 py-1.5 text-xs font-bold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all mb-2"
                        />

                        {/* Quick Presets Bar */}
                        <div className="flex flex-wrap gap-1">
                          {PRESET_TAGS.slice(0, 4).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleApplyPreset(index, tag)}
                              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-200/60 hover:bg-accent/20 hover:text-accent border border-surface-300/40 transition-colors"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons (Solid Accent Button without Gradient) */}
            <div className="pt-4 border-t border-surface-200 dark:border-surface-800 mt-4 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-5 py-2.5 bg-surface-200 hover:bg-surface-300 text-foreground text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isUploading || selectedCount === 0}
                className="px-6 py-2.5 bg-accent hover:opacity-90 text-background font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-accent/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <>Processing & Uploading...</>
                ) : (
                  <>📥 Save & Import {selectedCount} Floor Plan Sheets</>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Lightbox Zoom Modal */}
        {expandedPreviewSheet && (
          <div 
            onClick={() => setExpandedPreviewSheet(null)}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-surface-card p-3 rounded-2xl border border-surface-200 shadow-2xl flex flex-col items-center">
              <button
                onClick={() => setExpandedPreviewSheet(null)}
                className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-red-500 text-white font-bold flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                ✕
              </button>
              <img 
                src={expandedPreviewSheet.previewUrl} 
                alt={expandedPreviewSheet.title}
                className="max-h-[80vh] w-auto object-contain rounded-xl"
              />
              <p className="text-xs font-bold text-foreground mt-3 uppercase tracking-wider">
                {expandedPreviewSheet.title} (Page {expandedPreviewSheet.pageNumber})
              </p>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
