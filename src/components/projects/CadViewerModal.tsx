import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CadViewerModalProps {
  assetUrl: string;
  assetTitle: string;
  onClose: () => void;
}

export const CadViewerModal: React.FC<CadViewerModalProps> = ({ assetUrl, assetTitle, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  // ShareCAD iframe integration for rendering DWG/DXF files
  const viewerUrl = `https://iframe.sharecad.org/cadframe/load?url=${encodeURIComponent(assetUrl)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-6xl h-full max-h-[90vh] relative z-10 flex flex-col overflow-hidden"
        >
          {/* Floating Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-6 z-20 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-red-500/80 text-surface-800 hover:text-white backdrop-blur-md shadow-lg transition-all"
            title="Close Preview"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Iframe Container */}
          <div className="flex-1 w-full bg-white relative overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-900 z-10">
                <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold text-surface-500 uppercase tracking-widest animate-pulse">
                  Loading CAD Viewer...
                </p>
                <p className="text-[10px] font-medium text-surface-400 mt-2 max-w-xs text-center">
                  Depending on the complexity of your DWG file, rendering may take a few moments.
                </p>
              </div>
            )}
            <iframe
              src={viewerUrl}
              className="absolute border-none"
              style={{ width: "100%", height: "calc(100% + 40px)", top: "-40px", left: 0 }}
              onLoad={() => setIsLoading(false)}
              title="CAD Viewer"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
