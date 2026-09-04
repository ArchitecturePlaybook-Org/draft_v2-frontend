import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/QueryProvider";
import Navbar from "@/components/shared/Navbar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { Toaster } from "sonner";
const geistSans = GeistSans;
const geistMono = GeistMono;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';

const performancePolyfillScript = `
  console.log('[Performance Polyfill] initializing');
  if (typeof window !== 'undefined' && window.performance) {
    const origMeasure = window.performance.measure;
    window.performance.measure = function(...args) {
      try {
        // Skip measuring ProjectsPage and DashboardPage to avoid negative timestamps
        if (typeof args[0] === 'string' && (args[0].includes('ProjectsPage') || args[0].includes('DashboardPage'))) {
          return null;
        }
        return origMeasure.apply(this, args);
      } catch (e) {
        console.warn('[Performance Polyfill] Suppressed measure error:', e);
        return null;
      }
    };
    const origMark = window.performance.mark;
    window.performance.mark = function(...args) {
      try {
        return origMark.apply(this, args);
      } catch (e) {
        console.warn("[Performance Polyfill] Suppressed mark error:", e);
        return null;
      }
    };
  }
`;

const swRegistrationScript = `
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').then(
        function(registration) {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        },
        function(err) {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    });
  }
`;

export const metadata: Metadata = {
  title: {
    default: "Architecture Playbook",
    template: "%s | Architecture Playbook",
  },
  description: "Discover exceptional architectural and construction professionals. Browse portfolios, connect with talent, and build your next project.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "Architecture Playbook",
    description: "Discover exceptional architectural and construction professionals.",
    url: APP_URL,
    siteName: "Architecture Playbook",
    images: [
      {
        url: "/api/og/default",
        width: 1200,
        height: 630,
        alt: "Architecture Playbook — Professional Portfolio Directory",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Architecture Playbook",
    description: "Discover exceptional architectural and construction professionals.",
    images: [`${APP_URL}/api/og/default`],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon_io/favicon.ico", sizes: "any" },
      { url: "/favicon_io/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon_io/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/favicon_io/apple-touch-icon.png",
    shortcut: "/favicon_io/favicon.ico",
  },
  manifest: "/favicon_io/site.webmanifest",
};

import { ThemeProvider } from "@/providers/ThemeProvider";

const themeInitScript = `
  (function() {
    try {
      var saved = localStorage.getItem('ap_theme') || 'dark';
      var root = document.documentElement;
      root.classList.remove('theme-light', 'theme-blueprint', 'light', 'dark');
      if (saved === 'light') {
        root.classList.add('theme-light', 'light');
      } else if (saved === 'blueprint') {
        root.classList.add('theme-blueprint', 'dark');
      } else {
        root.classList.add('dark');
      }
    } catch (e) {}
  })();
`;

import { InitClientScripts } from "@/components/shared/InitClientScripts";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <InitClientScripts />
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <Navbar />
              <CommandPalette />
              <main className="min-w-0 max-w-full overflow-x-clip">{children}</main>
              <Toaster position="top-right" richColors />
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
