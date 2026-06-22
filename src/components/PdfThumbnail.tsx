"use client";

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the worker for pdfjs
// Use unpkg or cdnjs as the simplest way to load the worker without complex webpack config in Next.js Turbopack
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfThumbnailProps {
  fileUrl: string;
  className?: string;
}

export default function PdfThumbnail({ fileUrl, className = "" }: PdfThumbnailProps) {
  const [numPages, setNumPages] = useState<number>();
  const [error, setError] = useState<boolean>(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Failed to load PDF:", error);
    setError(true);
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-surface-50 text-surface-400 ${className}`}>
        <span className="text-4xl opacity-20 mb-2">📄</span>
        <span className="text-[9px] font-bold uppercase tracking-widest">PDF</span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden flex items-center justify-center bg-surface-50 relative ${className}`}>
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        className="flex items-center justify-center w-full h-full"
        loading={
          <div className="flex flex-col items-center justify-center text-surface-400 w-full h-full">
             <div className="w-5 h-5 border-2 border-surface-300 border-t-accent rounded-full animate-spin mb-2" />
             <span className="text-[9px] font-bold uppercase tracking-widest">Loading</span>
          </div>
        }
      >
        <Page 
          pageNumber={1} 
          width={250} // Fixed width to ensure it acts as a thumbnail
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="transition-transform duration-500 group-hover:scale-105 pointer-events-none origin-top"
        />
      </Document>
      {numPages && numPages > 1 && (
        <div className="absolute bottom-2 right-2 bg-surface-900/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
          {numPages} Pages
        </div>
      )}
    </div>
  );
}
