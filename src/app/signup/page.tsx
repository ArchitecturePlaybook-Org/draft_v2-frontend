"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/domains/auth/api";
import { useAuthStore } from "@/store/auth-store";
import { CATEGORY_DATA } from "./categories";
import * as v from "valibot";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "602486804656-th52ob7rmh9v63dct188b3cd12i1kvdo.apps.googleusercontent.com";
const REDIRECT_BASE =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

function initiateGoogleOAuth() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${REDIRECT_BASE}/auth/callback/google`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

const Step1Schema = v.pipe(
  v.object({
    name: v.pipe(v.string(), v.nonEmpty("Name is required."), v.minLength(2, "Name must be at least 2 characters.")),
    email: v.pipe(v.string(), v.nonEmpty("Email is required."), v.email("Please enter a valid email address.")),
    password: v.pipe(v.string(), v.nonEmpty("Password is required."), v.minLength(8, "Password must be at least 8 characters.")),
    password_confirm: v.string(),
  }),
  v.check((input) => input.password === input.password_confirm, "Passwords do not match.")
);

type Step = 1 | 2 | 3 | 4;

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirm: "",
    name: "",
    main_category: "",
    selections: {} as Record<string, string[]>,
    metadata: {} as Record<string, unknown>,
  });

  const nextStep = () => setStep((s) => (s + 1) as Step);
  const prevStep = () => setStep((s) => (s - 1) as Step);

  const handleNextFromStep1 = () => {
    const result = v.safeParse(Step1Schema, {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      password_confirm: formData.password_confirm,
    });
    
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.issues) {
        if (issue.path) {
          const key = issue.path[0].key as string;
          if (!errors[key]) {
             errors[key] = issue.message;
          }
        } else {
          errors["password_confirm"] = issue.message;
        }
      }
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    nextStep();
  };

  const handleCheckboxToggle = (groupName: string, option: string) => {
    const currentSelected = formData.selections[groupName] || [];
    const isSelected = currentSelected.includes(option);
    
    let newSelected;
    if (isSelected) {
      newSelected = currentSelected.filter(item => item !== option);
    } else {
      newSelected = [...currentSelected, option];
    }
    
    setFormData({
      ...formData,
      selections: {
        ...formData.selections,
        [groupName]: newSelected
      }
    });
  };

  const renderSubCategories = (data: any, path: string = "") => {
    if (Array.isArray(data)) {
       // Leaf array: Render Checkboxes
       return (
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
           {data.map(item => {
             const isChecked = (formData.selections[path] || []).includes(item);
              return (
                <label key={item} className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all duration-300 ${isChecked ? 'bg-accent/10 border-accent/50 shadow-[0_0_15px_rgba(255,186,8,0.15)] ring-1 ring-accent/20' : 'border-surface-200/50 bg-surface-100/50 backdrop-blur-md hover:bg-surface-50 hover:border-accent/30 hover:shadow-md'}`}>
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 accent-accent rounded border-surface-300 transition-all"
                    checked={isChecked}
                    onChange={() => handleCheckboxToggle(path, item)}
                  />
                  <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-accent' : 'text-primary'}`}>{item}</span>
                </label>
              );
           })}
         </div>
       );
    } else if (typeof data === 'object' && data !== null) {
       return (
         <div className="space-y-4 mt-3">
           {Object.keys(data).map(key => (
             <div key={key} className={path ? "pl-4 border-l-2 border-surface-200" : ""}>
               <h4 className="font-bold text-primary text-sm tracking-wide">{key}</h4>
               {renderSubCategories(data[key], path ? `${path} > ${key}` : key)}
             </div>
           ))}
         </div>
       );
    }
    return null;
  };

  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await authApi.register({
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        name: formData.name,
        category_path: {
          main: formData.main_category,
          selected: formData.selections
        },
        metadata: formData.metadata,
      });
      router.push("/verify-email/pending");
    } catch (err: any) {
      if (err.data && typeof err.data === 'object') {
        const backendErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(err.data)) {
           if (Array.isArray(val) && val.length > 0) {
              backendErrors[key] = val[0];
           } else {
              backendErrors[key] = String(val);
           }
        }
        setFormErrors(backendErrors);
        
        if (backendErrors.email || backendErrors.password || backendErrors.name) {
          setStep(1);
          setError("Please fix the errors below.");
        } else if (backendErrors.detail) {
          setError(backendErrors.detail);
        } else {
          setError("Please fix the errors below.");
        }
      } else {
        setError(err instanceof Error ? err.message : "Registration failed.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Count total selections
  const totalSelections = Object.values(formData.selections).flat().length;

  return (
    <div className="min-h-screen flex bg-background font-sans selection:bg-accent/10 selection:text-accent">
      {/* Background Grid */}
      <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none" />

      <div className="w-full flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <div className="max-w-2xl w-full space-y-12">
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
              <p className="text-text-secondary font-medium">
                Step {step} of 4: {step === 1 ? "Account Setup" : step === 2 ? "Primary Sector" : step === 3 ? "Specializations" : "Specifications"}
              </p>
            </div>
            <div className="flex gap-2 max-w-[250px] mx-auto pt-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= i ? "bg-accent shadow-[0_0_10px_rgba(255,186,8,0.5)]" : "bg-surface-200/50"}`} />
                ))}
            </div>
          </div>

          <form onSubmit={step === 4 ? handleFinalSubmit : (e) => { e.preventDefault(); if (step === 1) handleNextFromStep1(); else nextStep(); }} className="space-y-8">
            
            {/* STEP 1: ACCOUNT */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-primary uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full h-12 px-4 bg-surface-100/50 backdrop-blur-md border outline-none transition-all focus:ring-4 focus:bg-surface-50 rounded-xl placeholder:text-text-secondary/40 ${formErrors.name ? 'border-red-500 text-red-500 focus:border-red-500/50 focus:ring-red-500/10' : 'border-surface-200/50 focus:border-accent/50 focus:ring-accent/10'}`}
                    placeholder="Alice Architect"
                  />
                  {formErrors.name && <p className="text-red-500 text-xs font-semibold">{formErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-primary uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full h-12 px-4 bg-surface-100/50 backdrop-blur-md border outline-none transition-all focus:ring-4 focus:bg-surface-50 rounded-xl placeholder:text-text-secondary/40 ${formErrors.email ? 'border-red-500 text-red-500 focus:border-red-500/50 focus:ring-red-500/10' : 'border-surface-200/50 focus:border-accent/50 focus:ring-accent/10'}`}
                    placeholder="alice@studio.com"
                  />
                  {formErrors.email && <p className="text-red-500 text-xs font-semibold">{formErrors.email}</p>}
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <label className="text-[11px] font-bold text-primary uppercase tracking-wider">Password</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full h-12 px-4 bg-surface-100/50 backdrop-blur-md border outline-none transition-all focus:ring-4 focus:bg-surface-50 rounded-xl placeholder:text-text-secondary/40 ${formErrors.password ? 'border-red-500 text-red-500 focus:border-red-500/50 focus:ring-red-500/10' : 'border-surface-200/50 focus:border-accent/50 focus:ring-accent/10'}`}
                    />
                    {formErrors.password && <p className="text-red-500 text-xs font-semibold">{formErrors.password}</p>}
                    </div>
                    <div className="space-y-2">
                    <label className="text-[11px] font-bold text-primary uppercase tracking-wider">Confirm</label>
                    <input
                        type="password"
                        value={formData.password_confirm}
                        onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                        className={`w-full h-12 px-4 bg-surface-100/50 backdrop-blur-md border outline-none transition-all focus:ring-4 focus:bg-surface-50 rounded-xl placeholder:text-text-secondary/40 ${formErrors.password_confirm ? 'border-red-500 text-red-500 focus:border-red-500/50 focus:ring-red-500/10' : 'border-surface-200/50 focus:border-accent/50 focus:ring-accent/10'}`}
                    />
                    {formErrors.password_confirm && <p className="text-red-500 text-xs font-semibold">{formErrors.password_confirm}</p>}
                    </div>
                </div>

                {/* Social Login Divider & Button */}
                <div className="relative pt-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-surface-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px] font-bold uppercase bg-background px-4 text-surface-400 select-none">
                    Or register with
                  </div>
                </div>

                <button
                  id="google-signup-btn"
                  type="button"
                  onClick={initiateGoogleOAuth}
                  className="w-full h-12 bg-surface-100/50 backdrop-blur-md border border-surface-200/50 text-foreground font-bold uppercase tracking-widest text-[12px] transition-all hover:bg-surface-200/80 hover:-translate-y-0.5 hover:shadow-xl flex items-center justify-center gap-3 rounded-xl"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            )}

            {/* STEP 2: MAIN CATEGORY SELECTION */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 max-w-xl mx-auto">
                <div className="text-sm text-text-secondary mb-4">
                   Select your primary industry sector:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.keys(CATEGORY_DATA).map((mainCat) => (
                    <button
                      key={mainCat}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, main_category: mainCat, selections: {} });
                        nextStep();
                      }}
                      className="p-6 text-left border border-surface-200/50 transition-all duration-500 group relative overflow-hidden hover:border-accent/50 bg-surface-100/50 backdrop-blur-xl hover:bg-surface-50 hover:shadow-[0_0_25px_rgba(255,186,8,0.15)] hover:-translate-y-1 rounded-2xl"
                    >
                      <h3 className="font-bold text-primary text-base pr-6 group-hover:text-accent transition-colors">{mainCat}</h3>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-accent">
                         →
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: MULTI-SELECT SUB-CATEGORIES */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="p-8 bg-surface-100/50 backdrop-blur-xl border border-surface-200/50 rounded-3xl shadow-xl shadow-primary/5">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-surface-200/50">
                    <div>
                      <h3 className="text-2xl font-black text-primary tracking-tight">{formData.main_category}</h3>
                      <p className="text-sm text-text-secondary mt-1">Select all specializations that apply.</p>
                    </div>
                    <div className="bg-accent/10 text-accent font-bold px-3 py-1 rounded text-sm">
                      {totalSelections} Selected
                    </div>
                  </div>
                  
                  {/* Recursively render checkboxes */}
                  {(CATEGORY_DATA as any)[formData.main_category] && (
                    <div className="max-h-[50vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-surface-300">
                      {renderSubCategories((CATEGORY_DATA as any)[formData.main_category])}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: SPECIFICATIONS (METADATA) */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 max-w-xl mx-auto">
                <div className="p-6 bg-surface-50 border border-surface-200 rounded-xl">
                    <h3 className="text-lg font-bold text-primary mb-4">
                        Final Details
                    </h3>
                    
                    <div className="space-y-5">
                        {formData.main_category === "Architects" ? (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider">License Number</label>
                                    <input 
                                        type="text" 
                                        className="w-full h-10 bg-surface-100 border border-surface-200 px-3 rounded outline-none focus:border-accent"
                                        onChange={(e) => setFormData({...formData, metadata: {...formData.metadata, license_number: e.target.value}})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider">Registration Body</label>
                                    <input 
                                        type="text" 
                                        className="w-full h-10 bg-surface-100 border border-surface-200 px-3 rounded outline-none focus:border-accent"
                                        onChange={(e) => setFormData({...formData, metadata: {...formData.metadata, registration_body: e.target.value}})}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-6">
                              <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                                ✓
                              </div>
                              <p className="font-bold text-primary">Ready to Complete</p>
                              <p className="text-sm text-surface-600 mt-2">No additional specifications required for {formData.main_category}.</p>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm font-semibold text-center">{error}</p>}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-8 max-w-xl mx-auto">
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

              {step !== 2 && (
                <button
                  type="submit"
                  disabled={isLoading || (step === 3 && totalSelections === 0)}
                  className="px-12 h-14 bg-gradient-to-r from-accent to-accent/90 text-background font-black uppercase text-xs tracking-[0.2em] transition-all hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,186,8,0.4)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none rounded-xl"
                >
                  {isLoading ? "Processing..." : step === 4 ? "Complete" : "Continue"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
