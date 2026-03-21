"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0f', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div className="animate-pulse" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Redirecting...
      </div>
    </div>
  );
}
