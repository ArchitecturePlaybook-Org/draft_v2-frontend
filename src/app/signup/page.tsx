"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/domains/auth/api";
import { useAuthStore } from "@/store/auth-store";
import { CATEGORY_DATA } from "./categories";
import * as v from "valibot";

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
               <label key={item} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-accent/10 border-accent shadow-sm' : 'border-surface-200 hover:bg-surface-50'}`}>
                 <input 
                   type="checkbox" 
                   className="mt-1 w-4 h-4 accent-accent rounded border-surface-300"
                   checked={isChecked}
                   onChange={() => handleCheckboxToggle(path, item)}
                 />
                 <span className="text-sm font-medium text-primary">{item}</span>
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
      router.push("/login?registered=true");
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
    <div className="min-h-screen flex bg-white font-sans selection:bg-accent/10 selection:text-accent">
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
              <p className="text-surface-600 font-medium">
                Step {step} of 4: {step === 1 ? "Account Setup" : step === 2 ? "Primary Sector" : step === 3 ? "Specializations" : "Specifications"}
              </p>
            </div>
            {/* Progress Bar */}
            <div className="flex gap-2 max-w-[250px] mx-auto pt-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${step >= i ? "bg-accent" : "bg-surface-200"}`} />
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
                    className={`w-full h-12 bg-transparent border-b-2 outline-none transition-all placeholder:text-surface-600/30 ${formErrors.name ? 'border-red-500 text-red-500' : 'border-surface-200 focus:border-accent'}`}
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
                    className={`w-full h-12 bg-transparent border-b-2 outline-none transition-all placeholder:text-surface-600/30 ${formErrors.email ? 'border-red-500 text-red-500' : 'border-surface-200 focus:border-accent'}`}
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
                        className={`w-full h-12 bg-transparent border-b-2 outline-none transition-all ${formErrors.password ? 'border-red-500 text-red-500' : 'border-surface-200 focus:border-accent'}`}
                    />
                    {formErrors.password && <p className="text-red-500 text-xs font-semibold">{formErrors.password}</p>}
                    </div>
                    <div className="space-y-2">
                    <label className="text-[11px] font-bold text-primary uppercase tracking-wider">Confirm</label>
                    <input
                        type="password"
                        value={formData.password_confirm}
                        onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                        className={`w-full h-12 bg-transparent border-b-2 outline-none transition-all ${formErrors.password_confirm ? 'border-red-500 text-red-500' : 'border-surface-200 focus:border-accent'}`}
                    />
                    {formErrors.password_confirm && <p className="text-red-500 text-xs font-semibold">{formErrors.password_confirm}</p>}
                    </div>
                </div>
              </div>
            )}

            {/* STEP 2: MAIN CATEGORY SELECTION */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 max-w-xl mx-auto">
                <div className="text-sm text-surface-600 mb-4">
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
                      className="p-5 text-left border-2 transition-all group relative overflow-hidden border-surface-200 hover:border-accent/40 bg-white hover:bg-surface-50 rounded-xl"
                    >
                      <h3 className="font-bold text-primary text-base pr-6">{mainCat}</h3>
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
                <div className="p-6 bg-surface-50 border border-surface-200 rounded-xl">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-200">
                    <div>
                      <h3 className="text-xl font-bold text-primary">{formData.main_category}</h3>
                      <p className="text-sm text-surface-600 mt-1">Select all specializations that apply.</p>
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
                  className="px-12 h-14 bg-primary text-white font-bold uppercase tracking-[0.2em] transition-all hover:bg-accent disabled:opacity-50 rounded"
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
