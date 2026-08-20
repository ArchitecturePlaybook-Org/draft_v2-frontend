"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { ThemeToggle } from "./ThemeToggle";

const Navbar = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navLinks = [
    { name: "Portfolio", href: "/portfolio" },
    { name: "Showroom", href: "/showroom" },
    { name: "Social", href: "/social" },
    { name: "Templates Hub", href: "/marketplace" },
    { name: "Jobs", href: "/jobs" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 z-[2000] transition-all duration-300 border-b flex items-center overflow-hidden ${
        scrolled
          ? "bg-background/95 dark:bg-slate-950/95 backdrop-blur-md border-surface-200 dark:border-white/10 shadow-md"
          : "bg-background/80 dark:bg-slate-950/80 backdrop-blur-md border-surface-200/50 dark:border-white/5"
      }`}
    >
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 min-w-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 py-1.5 no-underline text-primary group shrink-0 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 245 247"
            className="w-7 h-7 text-accent transition-transform group-hover:scale-105 shrink-0"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="M 11.24 238.75 C11.48,238.06 24.24,187.21 39.59,125.75 C54.93,64.29 67.76,14.00 68.10,14.00 C68.43,14.00 81.18,63.90 96.42,124.89 C111.66,185.88 124.38,236.73 124.68,237.89 L 125.23 240.00 L 68.01 240.00 C22.66,240.00 10.88,239.74 11.24,238.75 ZM 124.00 70.00 L 124.00 13.00 L 181.25 41.62 L 238.49 70.25 L 182.00 98.57 C150.92,114.15 125.16,126.92 124.75,126.95 C124.34,126.98 124.00,101.35 124.00,70.00 Z"
              fill="currentColor"
            />
          </svg>
          <span className="font-black text-sm tracking-tight uppercase text-foreground truncate max-w-[150px] sm:max-w-none">
            Architecture Playbook
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-3 xl:gap-6 mx-2 min-w-0 flex-1 justify-center overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`text-[13px] font-medium transition-colors hover:text-foreground whitespace-nowrap shrink-0 ${
                pathname === link.href ? "text-foreground font-bold" : "text-text-secondary"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-4 shrink-0">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="bg-accent text-background text-xs font-extrabold px-4 py-2 rounded-xl hover:opacity-90 transition-all shadow-md shadow-accent/20 flex items-center gap-2 uppercase tracking-wider"
            >
              <span>📊</span>
              <span>Go to Dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[13px] font-semibold px-4 py-2 hover:bg-surface-100 text-foreground rounded-md transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-foreground text-background text-[13px] font-semibold px-4 py-2 rounded-md hover:scale-105 transition-transform"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Hamburger Menu (Mobile) */}
        <button
          onClick={toggleMenu}
          className="lg:hidden flex flex-col gap-[5px] p-2 z-[1001]"
          aria-label="Toggle Menu"
        >
          <span
            className={`w-[22px] h-[2px] bg-foreground transition-transform ${
              isMenuOpen ? "rotate-45 translate-y-[7px]" : ""
            }`}
          ></span>
          <span
            className={`w-[22px] h-[2px] bg-foreground transition-opacity ${
              isMenuOpen ? "opacity-0" : "opacity-100"
            }`}
          ></span>
          <span
            className={`w-[22px] h-[2px] bg-foreground transition-transform ${
              isMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""
            }`}
          ></span>
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 bg-background z-[999] lg:hidden flex flex-col pt-16 transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col border-t border-surface-200">
          {isAuthenticated && (
            <Link
              href="/dashboard"
              onClick={() => setIsMenuOpen(false)}
              className="px-6 py-4 text-[15px] font-bold border-b border-surface-200 bg-accent/10 text-accent flex items-center justify-between"
            >
              <span>📊 Go to Dashboard</span>
              <span>→</span>
            </Link>
          )}
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="px-6 py-4 text-[15px] font-medium border-b border-surface-200 text-foreground flex items-center justify-between group hover:bg-surface-100"
            >
              {link.name}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-accent">→</span>
            </Link>
          ))}
          {!isAuthenticated && (
            <>
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="px-6 py-4 text-[15px] font-semibold border-b border-surface-200 bg-surface-100 text-foreground hover:bg-surface-200"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsMenuOpen(false)}
                className="px-6 py-5 text-[15px] font-bold text-background bg-foreground hover:bg-foreground/90"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
