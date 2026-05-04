"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

type Step = 1 | 2 | 3;

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirm: "",
    name: "",
    user_type: "client",
    metadata: {} as Record<string, any>,
  });

  const nextStep = () => setStep((s) => (s + 1) as Step);
  const prevStep = () => setStep((s) => (s - 1) as Step);

  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await apiClient.register(formData);
      // Auto login after registration (mocked logic or separate login)
      // For now, redirect to login
      router.push("/login?registered=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  }

  const roleOptions = [
    { id: "architect", label: "Architect", icon: "📐", desc: "Design & Project Lead" },
    { id: "builder", label: "Builder", icon: "🏗️", desc: "Construction & Execution" },
    { id: "contractor", label: "Contractor", icon: "🛠️", desc: "Specialized Trades" },
    { id: "supplier", label: "Supplier", icon: "📦", desc: "Material & Equipment" },
    { id: "client", label: "Client", icon: "🏠", desc: "Project Owner" },
  ];

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-accent/10 selection:text-accent">
      {/* Background Grid */}
      <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none" />

      <div className="w-full flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <div className="max-w-xl w-full space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <Link href="/" className="inline-block">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-12 h-12">
                <polygon points="50,0 0,200 100,200" fill="#111827" />
                <polygon points="100,0 100,100 200,50" fill="#111827" />
              </svg>
            </Link>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-primary">Genesis Registration</h1>
              <p className="text-surface-600 font-medium">Step {step} of 3: {step === 1 ? "Account Setup" : step === 2 ? "Professional Identity" : "Specifications"}</p>
            </div>
            {/* Progress Bar */}
            <div className="flex gap-2 max-w-[200px] mx-auto pt-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${step >= i ? "bg-accent" : "bg-surface-200"}`} />
                ))}
            </div>
          </div>

          <form onSubmit={step === 3 ? handleFinalSubmit : (e) => { e.preventDefault(); nextStep(); }} className="space-y-8">
            
            {/* STEP 1: ACCOUNT */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-primary uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-12 bg-transparent border-b-2 border-surface-200 outline-none transition-all focus:border-accent placeholder:text-surface-600/30"
                    placeholder="Alice Architect"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-primary uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-12 bg-transparent border-b-2 border-surface-200 outline-none transition-all focus:border-accent placeholder:text-surface-600/30"
                    placeholder="alice@studio.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <label className="text-[11px] font-bold text-primary uppercase tracking-wider">Password</label>
                    <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full h-12 bg-transparent border-b-2 border-surface-200 outline-none transition-all focus:border-accent"
                    />
                    </div>
                    <div className="space-y-2">
                    <label className="text-[11px] font-bold text-primary uppercase tracking-wider">Confirm</label>
                    <input
                        type="password"
                        required
                        value={formData.password_confirm}
                        onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                        className="w-full h-12 bg-transparent border-b-2 border-surface-200 outline-none transition-all focus:border-accent"
                    />
                    </div>
                </div>
              </div>
            )}

            {/* STEP 2: ROLE SELECTION */}
            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-500">
                {roleOptions.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, user_type: role.id })}
                    className={`p-6 text-left border-2 transition-all group relative overflow-hidden ${
                      formData.user_type === role.id 
                      ? "border-accent bg-accent/5" 
                      : "border-surface-200 hover:border-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-3xl">{role.icon}</span>
                        {formData.user_type === role.id && <div className="w-2 h-2 rounded-full bg-accent" />}
                    </div>
                    <h3 className="font-bold text-primary mb-1">{role.label}</h3>
                    <p className="text-xs text-surface-600 leading-relaxed">{role.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {/* STEP 3: SPECIFICATIONS (METADATA) */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="p-6 bg-surface-100/50 border border-surface-200 rounded-lg">
                    <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                        {roleOptions.find(r => r.id === formData.user_type)?.icon}
                        {formData.user_type.charAt(0).toUpperCase() + formData.user_type.slice(1)} Details
                    </h3>
                    
                    <div className="space-y-5">
                        {formData.user_type === "architect" && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider">License Number</label>
                                    <input 
                                        type="text" 
                                        className="w-full h-10 bg-white border border-surface-200 px-3 rounded outline-none focus:border-accent"
                                        onChange={(e) => setFormData({...formData, metadata: {...formData.metadata, license_number: e.target.value}})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider">Registration Body</label>
                                    <input 
                                        type="text" 
                                        className="w-full h-10 bg-white border border-surface-200 px-3 rounded outline-none focus:border-accent"
                                        onChange={(e) => setFormData({...formData, metadata: {...formData.metadata, registration_body: e.target.value}})}
                                    />
                                </div>
                            </>
                        )}
                        {/* More dynamic fields here for other roles */}
                        {formData.user_type !== "architect" && (
                            <p className="text-sm text-surface-600 italic">No additional specifications required for this role yet. Click Register to continue.</p>
                        )}
                    </div>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm font-semibold text-center">{error}</p>}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-8">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-8 h-12 font-bold uppercase tracking-widest text-sm hover:text-accent transition-colors"
                >
                  Back
                </button>
              ) : (
                <Link href="/login" className="text-sm font-bold border-b border-primary pb-0.5">
                    Already have an account?
                </Link>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="px-12 h-14 bg-primary text-white font-bold uppercase tracking-[0.2em] transition-all hover:bg-accent disabled:opacity-50"
              >
                {isLoading ? "Processing..." : step === 3 ? "Complete Registration" : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
