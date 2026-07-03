"use client";

import React, { useEffect, useState } from "react";

interface UpiAppButtonsProps {
  amount: number; // paise
  upiString: string; 
  merchantVpa?: string; // fallback if upiString isn't perfect
}

export function UpiAppButtons({ amount, upiString, merchantVpa = "razorpay@icici" }: UpiAppButtonsProps) {
  // Mobile UA check
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      setIsMobile(true);
    }
  }, []);

  if (!isMobile) {
    return (
      <div className="text-center py-10 bg-surface-900 rounded-xl border border-surface-800">
        <p className="text-surface-400 text-sm">App intent payments are only available on mobile devices.</p>
        <p className="text-surface-500 text-xs mt-2">Please use the QR Code tab to scan and pay from your desktop.</p>
      </div>
    );
  }

  // Ensure amount format (rupees with 2 decimals)
  const amountStr = (amount / 100).toFixed(2);
  
  // Base parameters for building intent if raw string fails
  const name = encodeURIComponent("Architecture Playbook");
  
  const generateIntent = (scheme: string, params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return `${scheme}?${qs}`;
  };

  const apps = [
    {
      id: 'gpay',
      name: 'Google Pay',
      color: 'bg-white hover:bg-gray-50',
      textColor: 'text-gray-800',
      icon: 'GPay', // Placeholder
      href: generateIntent("gpay://upi/pay", { pa: merchantVpa, pn: name, am: amountStr, cu: "INR" })
    },
    {
      id: 'phonepe',
      name: 'PhonePe',
      color: 'bg-[#5f259f] hover:bg-[#4b1d7d]',
      textColor: 'text-white',
      icon: 'Pe', // Placeholder
      href: generateIntent("phonepe://pay", { pa: merchantVpa, pn: name, am: amountStr, cu: "INR" })
    },
    {
      id: 'paytm',
      name: 'Paytm',
      color: 'bg-[#002970] hover:bg-[#001e52]',
      textColor: 'text-white',
      icon: 'Paytm', // Placeholder
      href: generateIntent("paytmmp://pay", { pa: merchantVpa, pn: name, am: amountStr, cu: "INR" })
    },
    {
      id: 'cred',
      name: 'CRED',
      color: 'bg-black hover:bg-gray-900',
      textColor: 'text-white',
      icon: 'C', // Placeholder
      href: generateIntent("cred://upi/pay", { pa: merchantVpa, pn: name, am: amountStr, cu: "INR" })
    },
    {
      id: 'amazon',
      name: 'Amazon Pay',
      color: 'bg-[#f3a847] hover:bg-[#d89640]',
      textColor: 'text-black',
      icon: 'a', // Placeholder
      href: generateIntent("amazonpay://upi/pay", { pa: merchantVpa, pn: name, am: amountStr, cu: "INR" })
    },
    {
      id: 'bhim',
      name: 'BHIM / Any UPI App',
      color: 'bg-surface-800 hover:bg-surface-700',
      textColor: 'text-white',
      icon: 'UPI', // Placeholder
      href: generateIntent("upi://pay", { pa: merchantVpa, pn: name, am: amountStr, cu: "INR" })
    }
  ];

  // If Razorpay gives us a valid upi:// string, we should prioritize that for the generic button
  if (upiString && upiString.startsWith("upi://")) {
    const genericIndex = apps.findIndex(a => a.id === 'bhim');
    if (genericIndex > -1) apps[genericIndex].href = upiString;
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-surface-400 mb-6">Select your preferred UPI app to pay</p>
      
      <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
        {apps.map(app => (
          <a
            key={app.id}
            href={app.href}
            className={`w-full ${app.color} ${app.textColor} py-4 px-6 rounded-xl font-bold flex items-center justify-between transition-transform active:scale-95 shadow-lg shadow-black/20`}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-sm mix-blend-luminosity">
                {app.icon}
              </div>
              <span>{app.name}</span>
            </div>
            <span className="opacity-70 text-sm">Pay ₹{amountStr}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
