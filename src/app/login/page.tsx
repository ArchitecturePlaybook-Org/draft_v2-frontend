"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

const ROLE_DASHBOARD: Record<string, string> = {
  architect: "/dashboard/admin",
  co_owner: "/dashboard/admin",
  constructor: "/dashboard/admin", 
  client: "/dashboard/viewer",
  admin: "/dashboard/admin",
};

const Modal = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-primary/10 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-surface-100 rounded-full transition-colors z-20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div className="overflow-y-auto max-h-[90vh] p-8 lg:p-12">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const user = await login(email, password);
      const userRole = (user && typeof user.role === "string") ? user.role : "unknown";
      
      const target = (Object.prototype.hasOwnProperty.call(ROLE_DASHBOARD, userRole))
        ? ROLE_DASHBOARD[userRole]
        : "/dashboard";
      
      router.push(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-accent/10 selection:text-accent">
      {/* Left Panel: Architectural Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-100 overflow-hidden items-center justify-center p-20 border-r border-surface-200">
        <div className="absolute inset-0 arch-grid opacity-20" />
        <div className="relative z-10 w-full max-w-lg aspect-square flex items-center justify-center">
            {/* Minimalist Line Art Placeholder */}
            <svg viewBox="0 0 400 400" className="w-full h-full text-accent/20">
                <path d="M50 350 L350 350" stroke="currentColor" strokeWidth="1" />
                <path d="M50 350 L50 200 L150 100 L350 200 L350 350" stroke="currentColor" strokeWidth="1" fill="none" />
                <path d="M150 100 L150 350" stroke="currentColor" strokeWidth="1" />
                <circle cx="150" cy="100" r="4" fill="currentColor" />
                <rect x="80" y="250" width="30" height="60" stroke="currentColor" strokeWidth="1" fill="none" />
                <rect x="200" y="230" width="100" height="80" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <h3 className="text-primary/10 text-9xl font-bold uppercase tracking-tighter select-none">ARCH</h3>
            </div>
        </div>
        
        <div className="absolute bottom-16 left-16 right-16 text-primary/40">
            <p className="text-sm font-medium tracking-tight uppercase">Intent Translation Platform v1.0</p>
            <div className="h-[1px] w-12 bg-accent/30 mt-4" />
        </div>
      </div>

      {/* Right Panel: Content */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12 relative">
        <div className="max-w-md w-full mx-auto space-y-12 animate-in slide-in-from-right-4 duration-700">
          {/* Logo & Header */}
          <div className="space-y-6">
            <Link href="/" className="inline-block group">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 200 200"
                className="w-10 h-10 transition-transform group-hover:scale-105"
                preserveAspectRatio="xMidYMid meet"
              >
                <polygon points="50,0 0,200 100,200" fill="#111827" />
                <polygon points="100,0 100,100 200,50" fill="#111827" />
              </svg>
            </Link>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome back</h1>
              <p className="text-surface-600 font-medium">Continue building your architectural vision.</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2 group">
                <label htmlFor="email" className="text-[13px] font-bold text-primary uppercase tracking-wider">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-0 bg-transparent border-b-2 border-surface-200 outline-none transition-all focus:border-accent placeholder:text-surface-600/40"
                  placeholder="name@company.com"
                />
              </div>

              <div className="space-y-2 group">
                <div className="flex justify-between items-center">
                    <label htmlFor="password" className="text-[13px] font-bold text-primary uppercase tracking-wider">Password</label>
                    <Link href="/forgot-password" title="Forgot Password?" className="text-[11px] font-bold uppercase border-b border-transparent hover:border-primary transition-all">Forgot?</Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-0 bg-transparent border-b-2 border-surface-200 outline-none transition-all focus:border-accent placeholder:text-surface-600/40"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-primary/40 hover:text-accent transition-colors p-2"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a22.28 22.28 0 0 1 2.18-3.18"></path><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm font-semibold animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-primary text-white font-bold uppercase tracking-[0.2em] transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-4"
            >
              {isLoading ? "Validating..." : (
                <>
                  Connect <ArrowRightIcon />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200"></div>
            </div>
            <div className="relative flex justify-center text-[11px] font-bold uppercase bg-white px-4 text-surface-600/40 select-none">
              Institutional Access
            </div>
          </div>

          {/* Social login */}
          <button className="w-full h-14 border border-surface-200 font-bold uppercase tracking-widest text-[13px] transition-all hover:bg-surface-100 flex items-center justify-center gap-4">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
          </button>

          <div className="pt-8 flex flex-col items-center gap-6">
            <Link href="/signup" className="text-sm font-bold border-b border-primary pb-0.5">
              Create individual account
            </Link>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="text-[11px] font-bold uppercase text-surface-600/60 hover:text-accent transition-colors flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                How it works?
            </button>
          </div>
        </div>
      </div>

      {/* Modal for How It Works */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-center space-y-12">
            <div className="space-y-4">
                <h2 className="text-4xl font-bold text-primary">The Architecture Playbook</h2>
                <p className="text-surface-600 text-lg max-w-2xl mx-auto">Ensuring architectural intent is delivered to reality without losing meaning.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
                {[
                    {
                    step: "01",
                    title: "Setup Intent",
                    desc: "Upload models and define specific construction tasks in a high-fidelity digital twin environment.",
                    },
                    {
                    step: "02",
                    title: "Collaborative Sync",
                    desc: "Invite contractors and assign precise roles to track progress and intent in real-time.",
                    },
                    {
                    step: "03",
                    title: "Verified Output",
                    desc: "Monitor execution and resolve bottlenecks by teaching hands directly through 3D guidance.",
                    }
                ].map((item, i) => (
                    <div key={i} className="space-y-4 group">
                        <span className="text-5xl font-black text-surface-100 group-hover:text-accent/10 transition-colors">{item.step}</span>
                        <h3 className="text-xl font-bold text-primary">{item.title}</h3>
                        <p className="text-surface-600 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>

            <button 
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center gap-3 font-bold uppercase tracking-widest text-sm text-accent hover:gap-5 transition-all"
            >
                Ready to start <ArrowRightIcon />
            </button>
        </div>
      </Modal>
    </div>
  );
}

function ArrowRightIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
}
