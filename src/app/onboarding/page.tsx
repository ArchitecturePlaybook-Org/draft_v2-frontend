"use client";

/**
 * Onboarding Page — /onboarding
 *
 * Shown ONLY to new users who signed up via Google or Apple OAuth.
 * They need to complete their professional profile (category_slug, category_path)
 * before accessing the dashboard — the same data captured in the standard
 * multi-step /signup flow.
 *
 * On completion, PATCHes /api/v1/auth/profile and redirects to /dashboard.
 */

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { CATEGORY_DATA } from "@/app/signup/categories";
import Link from "next/link";

type OnboardingStep = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, fetchCurrentUser } = useAuthStore();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [mainCategory, setMainCategory] = useState("");
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});

  const totalSelections = Object.values(selections).flat().length;

  const handleCheckboxToggle = (groupName: string, option: string) => {
    const current = selections[groupName] || [];
    const updated = current.includes(option)
      ? current.filter((i) => i !== option)
      : [...current, option];
    setSelections({ ...selections, [groupName]: updated });
  };

  const renderSubCategories = (data: any, path = ""): React.ReactNode => {
    if (Array.isArray(data)) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {data.map((item) => {
            const checked = (selections[path] || []).includes(item);
            return (
              <label
                key={item}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  checked
                    ? "bg-accent/10 border-accent shadow-sm"
                    : "border-surface-200 hover:bg-surface-50"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 accent-accent rounded"
                  checked={checked}
                  onChange={() => handleCheckboxToggle(path, item)}
                />
                <span className="text-sm font-medium text-primary">{item}</span>
              </label>
            );
          })}
        </div>
      );
    } else if (typeof data === "object" && data !== null) {
      return (
        <div className="space-y-4 mt-3">
          {Object.keys(data).map((key) => (
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

  async function handleComplete(e: FormEvent) {
    e.preventDefault();
    if (totalSelections === 0) return;

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/users/onboarding/complete/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category_path: {
            main: mainCategory,
            selected: selections,
          },
          metadata: {
            ...(user as any)?.metadata,
            ...metadata,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save profile. Please try again.");
      }

      const data = await res.json();
      
      // Re-fetch user to get the updated profile and is_onboarding_complete flag
      await fetchCurrentUser();

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-accent/10 selection:text-accent">
      <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none" />

      <div className="w-full flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <div className="max-w-2xl w-full space-y-10">

          {/* Header */}
          <div className="text-center space-y-4">
            <Link href="/" className="inline-block">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-12 h-12">
                <polygon points="50,0 0,200 100,200" fill="#111827" />
                <polygon points="100,0 100,100 200,50" fill="#111827" />
              </svg>
            </Link>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-primary">
                Complete Your Profile
              </h1>
              <p className="text-surface-600 font-medium">
                {step === 1
                  ? "Step 1 of 2 — Select your primary sector"
                  : "Step 2 of 2 — Select your specializations"}
              </p>
            </div>
            {/* Progress */}
            <div className="flex gap-2 max-w-[160px] mx-auto pt-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    step >= i ? "bg-accent" : "bg-surface-200"
                  }`}
                />
              ))}
            </div>
          </div>

          <form
            onSubmit={step === 2 ? handleComplete : (e) => { e.preventDefault(); }}
            className="space-y-8"
          >
            {/* STEP 1: Pick primary sector */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                <p className="text-sm text-surface-600">
                  This helps us tailor the platform to your workflow.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.keys(CATEGORY_DATA).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setMainCategory(cat);
                        setSelections({});
                        setStep(2);
                      }}
                      className="p-5 text-left border-2 transition-all group relative overflow-hidden border-surface-200 hover:border-accent/40 bg-white hover:bg-surface-50 rounded-xl"
                    >
                      <h3 className="font-bold text-primary text-base pr-6">{cat}</h3>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-accent">
                        →
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Pick specializations */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="p-6 bg-surface-50 border border-surface-200 rounded-xl">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-200">
                    <div>
                      <h3 className="text-xl font-bold text-primary">{mainCategory}</h3>
                      <p className="text-sm text-surface-600 mt-1">
                        Select all specializations that apply.
                      </p>
                    </div>
                    <div className="bg-accent/10 text-accent font-bold px-3 py-1 rounded text-sm">
                      {totalSelections} Selected
                    </div>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto pr-4">
                    {(CATEGORY_DATA as any)[mainCategory] &&
                      renderSubCategories((CATEGORY_DATA as any)[mainCategory])}
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-sm font-semibold text-center">{error}</p>
                )}

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-8 h-12 font-bold uppercase tracking-widest text-sm hover:text-accent transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || totalSelections === 0}
                    className="px-12 h-14 bg-primary text-white font-bold uppercase tracking-[0.2em] transition-all hover:bg-accent disabled:opacity-50 rounded"
                  >
                    {isLoading ? "Saving..." : "Enter Dashboard →"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
