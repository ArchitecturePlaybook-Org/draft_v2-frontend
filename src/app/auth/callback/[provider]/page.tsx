"use client";

/**
 * OAuth Callback Handler — /auth/callback/[provider]
 *
 * This page receives the authorization `code` from Google or Apple after
 * the user consents on the provider's screen. It:
 *   1. Extracts the `code` (and optional `id_token` for Apple) from the URL.
 *   2. POSTs it to the Next.js proxy → Django backend for token exchange.
 *   3. On success, checks `is_new_user` in the response.
 *      - New user  → redirect to /onboarding (to fill category data)
 *      - Returning → redirect to /dashboard
 *   4. On failure, redirects back to /login with an error param.
 */

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { setUser } = useAuthStore();
  const hasFired = useRef(false);

  const provider = params.provider as string;

  useEffect(() => {
    // Guard against double-invocation in React StrictMode
    if (hasFired.current) return;
    hasFired.current = true;

    const code = searchParams.get("code");
    const idToken = searchParams.get("id_token"); // Apple only
    const error = searchParams.get("error");

    if (error || !code) {
      console.error(`[OAuth Callback] Provider error or missing code:`, error);
      router.replace(`/login?error=oauth_cancelled`);
      return;
    }

    const exchangeCode = async () => {
      try {
        const body: Record<string, string> = { code };
        if (provider === "apple" && idToken) {
          body.id_token = idToken;
        }

        const res = await fetch(`/api/v1//social/${provider}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error(`[OAuth Callback] Backend error:`, data);
          router.replace(`/login?error=oauth_failed`);
          return;
        }

        const data = await res.json();

        // Sync user into Zustand store
        if (data.user) {
          setUser(data.user);
        }

        // Route based on whether this is a brand new user or hasn't finished onboarding
        if (data.is_new_user || data.user?.profile?.is_onboarding_complete === false) {
          router.replace("/onboarding");
        } else {
          router.replace("/dashboard");
        }
      } catch (err) {
        console.error(`[OAuth Callback] Unexpected error:`, err);
        router.replace(`/login?error=oauth_failed`);
      }
    };

    exchangeCode();
  }, [provider, searchParams, router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 font-sans">
      <div className="text-center space-y-6 animate-in fade-in duration-500">
        {/* Animated logo */}
        <div className="flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            className="w-12 h-12 animate-pulse"
          >
            <polygon points="50,0 0,200 100,200" fill="#111827" />
            <polygon points="100,0 100,100 200,50" fill="#111827" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-primary tracking-tight">
            Connecting your account
          </h2>
          <p className="text-sm text-surface-600 font-medium">
            Please wait while we verify your{" "}
            {provider === "google" ? "Google" : "Apple"} identity…
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-accent rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
