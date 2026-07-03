"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, QrCode } from "lucide-react";

interface UpiQrCodeProps {
  qrImageUrl: string;
  expiresAt: number; // timestamp in ms
  onRefresh: () => void;
}

export function UpiQrCode({ qrImageUrl, expiresAt, onRefresh }: UpiQrCodeProps) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, expiresAt - Date.now()));
  const [isExpired, setIsExpired] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  
  // Progress for SVG ring (15 mins = 900000 ms)
  const totalDuration = 15 * 60 * 1000; 
  const progress = Math.max(0, Math.min(1, timeLeft / totalDuration));
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Expiry Ring */}
        <svg className="w-56 h-56 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 pointer-events-none">
          <circle
            cx="112"
            cy="112"
            r="108"
            className="stroke-surface-800"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="112"
            cy="112"
            r="108"
            className={`${isExpired ? 'stroke-red-500' : 'stroke-accent'}`}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>

        {/* QR Code Wrapper */}
        <div className={`relative w-48 h-48 bg-white p-3 rounded-2xl shadow-xl z-10 transition-all ${isExpired ? 'opacity-30 grayscale' : ''}`}>
          {qrImageUrl ? (
            <img src={qrImageUrl} alt="UPI QR Code" className="w-full h-full object-contain mix-blend-multiply" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-100 rounded-xl">
              <QrCode className="w-10 h-10 text-surface-400 animate-pulse" />
            </div>
          )}
        </div>

        {/* Expired Overlay */}
        {isExpired && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
            <button 
              onClick={() => { setIsExpired(false); onRefresh(); }}
              className="bg-accent hover:bg-accent/90 text-background font-bold py-2 px-4 rounded-xl shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh QR
            </button>
          </div>
        )}
      </div>

      {/* Timer text */}
      <div className="mt-6 text-center">
        {!isExpired ? (
          <p className="text-sm font-medium text-surface-400">
            Scan with any UPI app to pay<br/>
            <span className="text-accent font-mono font-bold text-base block mt-1">
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
          </p>
        ) : (
          <p className="text-sm font-medium text-red-400">
            QR code expired
          </p>
        )}
      </div>
      
      {/* App Logos (Simulated) */}
      <div className="mt-6 flex items-center gap-3 grayscale opacity-60">
        <div className="w-8 h-8 bg-surface-800 rounded-full flex items-center justify-center text-[10px] font-bold text-white">GPay</div>
        <div className="w-8 h-8 bg-surface-800 rounded-full flex items-center justify-center text-[10px] font-bold text-white">Pe</div>
        <div className="w-8 h-8 bg-surface-800 rounded-full flex items-center justify-center text-[10px] font-bold text-white">Paytm</div>
        <div className="w-8 h-8 bg-surface-800 rounded-full flex items-center justify-center text-[10px] font-bold text-white">BHIM</div>
      </div>
    </div>
  );
}
