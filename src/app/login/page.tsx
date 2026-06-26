"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

// -------------------------------------------------------------------------
// OAuth Helpers
// -------------------------------------------------------------------------
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? "";
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

function initiateAppleOAuth() {
  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    redirect_uri: `${REDIRECT_BASE}/auth/callback/apple`,
    response_type: "code id_token",
    scope: "name email",
    response_mode: "fragment",
  });
  window.location.href = `https://appleid.apple.com/auth/authorize?${params}`;
}

// -------------------------------------------------------------------------
// Modal
// -------------------------------------------------------------------------
const Modal = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-primary/10 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-surface-50 rounded-2xl shadow-none border border-surface-200 w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-surface-100 rounded-full transition-colors z-20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="overflow-y-auto max-h-[90vh] p-8 lg:p-12">{children}</div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Page
// -------------------------------------------------------------------------
import { Suspense } from "react";

// ... existing code ...

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verify2FA, isLoading } = useAuthStore();

  const [step, setStep] = useState<"login" | "2fa" | "magic-link" | "unverified">("login");
  const [preAuthToken, setPreAuthToken] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Surface OAuth errors from callback redirect params
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError === "oauth_cancelled")
      setError("Sign-in was cancelled. Please try again.");
    else if (oauthError === "oauth_failed")
      setError("Sign-in failed. Please try a different method or contact support.");
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    
    if (step === "login") {
      try {
        const result = await login(email, password, rememberMe);
        if (result.requires_2fa) {
          setPreAuthToken(result.pre_auth_token);
          setStep("2fa");
        } else {
          if (result.user?.profile?.is_onboarding_complete === false) {
            router.push("/onboarding");
          } else {
            router.push("/dashboard");
          }
        }
      } catch (err: any) {
        if (err.data && err.data.code === "email_unverified") {
          setStep("unverified");
          setError("");
        } else {
          setError(err instanceof Error ? err.message : "Login failed. Please try again.");
        }
      }
    } else if (step === "2fa") {
      try {
        const result = await verify2FA(preAuthToken, otpCode);
        if (result.user?.profile?.is_onboarding_complete === false) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid 2FA code. Please try again.");
      }
    } else if (step === "magic-link") {
      try {
        const { authApi } = await import("@/domains/auth/api");
        const res = await authApi.requestMagicLink(email);
        setError("");
        alert(res.detail || "Magic link sent to your email.");
        setStep("login");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send magic link.");
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-background font-sans selection:bg-accent/10 selection:text-accent">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-100 overflow-hidden items-center justify-center p-20 border-r border-surface-200">
        <div className="absolute inset-0 arch-grid opacity-20" />
        <div className="relative z-10 w-full max-w-lg aspect-square flex items-center justify-center">
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
        <div className="absolute bottom-16 left-16 right-16 text-surface-400">
          <p className="text-sm font-medium tracking-tight uppercase">Intent Translation Platform v1.0</p>
          <div className="h-[1px] w-12 bg-accent/30 mt-4" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12 relative">
        <div className="max-w-md w-full mx-auto space-y-10 animate-in slide-in-from-right-4 duration-700">
          {/* Logo & Header */}
          <div className="space-y-6">
            <Link href="/" className="inline-block group">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-10 h-10 transition-transform group-hover:scale-105" preserveAspectRatio="xMidYMid meet">
                <polygon points="50,0 0,200 100,200" fill="#111827" />
                <polygon points="100,0 100,100 200,50" fill="#111827" />
              </svg>
            </Link>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-primary">
                {step === "login" ? "Welcome back" : step === "2fa" ? "Two-Factor Authentication" : "Passwordless Login"}
              </h1>
              <p className="text-text-secondary font-medium">
                {step === "login" ? "Continue building your architectural vision." : step === "2fa" ? "Enter the 6-digit code from your authenticator app." : "Enter your email to receive a secure login link."}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === "login" ? (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-[13px] font-bold text-primary uppercase tracking-wider">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 bg-surface-100/50 backdrop-blur-md border border-surface-200/50 outline-none transition-all focus:border-accent/50 focus:ring-4 focus:ring-accent/10 focus:bg-surface-50 rounded-xl placeholder:text-text-secondary/40"
                    placeholder="name@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="text-[13px] font-bold text-primary uppercase tracking-wider">Password</label>
                    <Link href="/forgot-password" className="text-[11px] font-bold uppercase border-b border-transparent hover:border-primary transition-all">Forgot?</Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 px-4 bg-surface-100/50 backdrop-blur-md border border-surface-200/50 outline-none transition-all focus:border-accent/50 focus:ring-4 focus:ring-accent/10 focus:bg-surface-50 rounded-xl placeholder:text-text-secondary/40"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 hover:text-accent transition-colors p-2">
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a22.28 22.28 0 0 1 2.18-3.18"></path><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-surface-200 text-primary focus:ring-accent accent-primary"
                  />
                  <label htmlFor="rememberMe" className="text-sm font-medium text-text-secondary cursor-pointer select-none">
                    Remember me for 90 days
                  </label>
                </div>
                
                <div className="flex justify-center pt-2">
                  <button 
                    type="button"
                    onClick={() => setStep("magic-link")}
                    className="text-[12px] font-bold text-accent hover:text-accent/80 transition-colors"
                  >
                    Use Magic Link (Passwordless)
                  </button>
                </div>
              </div>
            ) : step === "unverified" ? (
              <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2 text-center pb-2">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-primary">Email Not Verified</h3>
                    <p className="text-sm text-text-secondary">Please verify your email address to access your account. If you didn't receive the email, you can request a new one.</p>
                </div>
                <button 
                  type="button" 
                  onClick={async () => {
                      const { authApi } = await import("@/domains/auth/api");
                      try {
                          const res = await authApi.resendVerificationEmail(email);
                          alert(res.detail || "Verification email sent.");
                      } catch(e: any) {
                          alert(e.message || "Failed to send verification email.");
                      }
                  }} 
                  className="w-full h-12 bg-surface-100 border border-surface-200 text-foreground font-bold uppercase tracking-widest text-[13px] hover:bg-surface-200 transition-all rounded"
                >
                  Resend Verification Email
                </button>
                <div className="text-center">
                    <button 
                    type="button" 
                    onClick={() => setStep("login")} 
                    className="text-xs font-semibold text-accent hover:underline"
                    >
                    &larr; Back to login
                    </button>
                </div>
              </div>
            ) : step === "2fa" ? (
              <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label htmlFor="otpCode" className="text-[13px] font-bold text-primary uppercase tracking-wider">Authentication Code</label>
                  <input
                    id="otpCode"
                    type="text"
                    required
                    maxLength={8}
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full h-12 px-4 bg-surface-100/50 backdrop-blur-md border border-surface-200/50 outline-none transition-all focus:border-accent/50 focus:ring-4 focus:ring-accent/10 focus:bg-surface-50 rounded-xl placeholder:text-text-secondary/40 text-xl tracking-widest text-center"
                    placeholder="123456"
                    autoFocus
                  />
                  <p className="text-xs text-text-secondary pt-2">You can also use a recovery code if you lost your device.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setStep("login")} 
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  &larr; Back to login
                </button>
              </div>
            ) : (
              <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label htmlFor="magicEmail" className="text-[13px] font-bold text-primary uppercase tracking-wider">Email Address</label>
                  <input
                    id="magicEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 bg-surface-100/50 backdrop-blur-md border border-surface-200/50 outline-none transition-all focus:border-accent/50 focus:ring-4 focus:ring-accent/10 focus:bg-surface-50 rounded-xl placeholder:text-text-secondary/40"
                    placeholder="name@company.com"
                    autoFocus
                  />
                  <p className="text-xs text-text-secondary pt-2">We'll send a secure, one-time link to your inbox.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setStep("login")} 
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  &larr; Back to login
                </button>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm font-semibold animate-in fade-in slide-in-from-top-1">{error}</div>
            )}

            {step !== "unverified" && (
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-r from-accent to-accent/90 text-background rounded-xl font-black uppercase text-xs tracking-[0.2em] hover:shadow-[0_0_25px_rgba(255,186,8,0.4)] hover:-translate-y-1 transition-all shadow-lg shadow-accent/20 group flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Validating..." : (<>{step === "login" ? "Connect" : step === "2fa" ? "Verify" : "Send Link"} <ArrowRightIcon /></>)}
              </button>
            )}
          </form>

          {/* Social Login Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200" />
            </div>
            <div className="relative flex justify-center text-[11px] font-bold uppercase bg-background px-4 text-surface-400 select-none">
              Or continue with
            </div>
          </div>

          {/* Social Buttons */}
          <div className="space-y-3">
            <button
              id="google-login-btn"
              type="button"
              onClick={initiateGoogleOAuth}
              className="w-full h-14 bg-surface-100/50 backdrop-blur-md border border-surface-200/50 text-foreground font-bold uppercase tracking-widest text-[13px] transition-all hover:bg-surface-200/80 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5 flex items-center justify-center gap-4 rounded-xl"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button
              id="apple-login-btn"
              type="button"
              onClick={initiateAppleOAuth}
              className="w-full h-14 bg-surface-100/50 backdrop-blur-md border border-surface-200/50 text-foreground font-bold uppercase tracking-widest text-[13px] transition-all hover:bg-surface-200/80 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5 flex items-center justify-center gap-4 rounded-xl"
            >
              <AppleIcon />
              Continue with Apple
            </button>
          </div>

          <div className="flex flex-col items-center gap-6 pt-4">
            <Link href="/signup" className="text-sm font-bold border-b border-primary pb-0.5">
              Create individual account
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-[11px] font-bold uppercase text-text-secondary/60 hover:text-accent transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              How it works?
            </button>
          </div>
        </div>
      </div>

      {/* How It Works Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-primary">The Architecture Playbook</h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">Ensuring architectural intent is delivered to reality without losing meaning.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
            {[
              { step: "01", title: "Setup Intent", desc: "Upload models and define specific construction tasks in a high-fidelity digital twin environment." },
              { step: "02", title: "Collaborative Sync", desc: "Invite contractors and assign precise roles to track progress and intent in real-time." },
              { step: "03", title: "Verified Output", desc: "Monitor execution and resolve bottlenecks by teaching hands directly through 3D guidance." },
            ].map((item, i) => (
              <div key={i} className="space-y-4 group">
                <span className="text-5xl font-black text-surface-100 group-hover:text-accent/10 transition-colors">{item.step}</span>
                <h3 className="text-xl font-bold text-primary">{item.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setIsModalOpen(false)} className="inline-flex items-center gap-3 font-bold uppercase tracking-widest text-sm text-accent hover:gap-5 transition-all">
            Ready to start <ArrowRightIcon />
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-primary animate-pulse tracking-widest uppercase">Loading Auth...</div>}>
      <LoginContent />
    </Suspense>
  );
}

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="17" height="20" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57.9-155.5-127.4C46 790.7 0 663.3 0 541.8 0 284.9 130.5 149.4 258.3 149.4c68.1 0 119.4 44.6 160.1 44.6 38.8 0 99.9-47.6 169.5-47.6 26.5 0 108.3 2.6 168.5 79.1zm-118.5-215.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  );
}
