"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

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
    { name: "Forum", href: "/forum" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Jobs", href: "/jobs" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-topbar z-50 transition-all duration-300 border-b flex items-center ${
        scrolled
          ? "bg-white/95 backdrop-blur-md border-surface-200 shadow-sm"
          : "bg-white/80 backdrop-blur-sm border-transparent"
      }`}
    >
      <div className="w-full max-w-[1400px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 no-underline text-primary group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            className="w-10 h-10 transition-transform group-hover:scale-105"
            preserveAspectRatio="xMidYMid meet"
          >
            <polygon points="50,0 0,200 100,200" fill="currentColor" />
            <polygon points="100,0 100,100 200,50" fill="currentColor" />
          </svg>
          <span className="font-bold text-base whitespace-nowrap tracking-tight uppercase">
            Architecture Playbook
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6 mx-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`text-[13px] font-medium transition-colors hover:text-black ${
                pathname === link.href ? "text-black" : "text-surface-600"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="bg-primary text-white text-[13px] font-semibold px-6 py-2.5 rounded-full hover:bg-accent transition-all shadow-lg shadow-primary/10 flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">👤</div>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[13px] font-semibold px-4 py-2 hover:bg-surface-100 rounded-md transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-primary text-white text-[13px] font-semibold px-4 py-2 rounded-md hover:bg-primary-hover transition-colors"
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
            className={`w-[22px] h-[2px] bg-primary transition-transform ${
              isMenuOpen ? "rotate-45 translate-y-[7px]" : ""
            }`}
          ></span>
          <span
            className={`w-[22px] h-[2px] bg-primary transition-opacity ${
              isMenuOpen ? "opacity-0" : "opacity-100"
            }`}
          ></span>
          <span
            className={`w-[22px] h-[2px] bg-primary transition-transform ${
              isMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""
            }`}
          ></span>
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 bg-white z-[999] lg:hidden flex flex-col pt-topbar transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col border-t border-surface-100">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="px-6 py-4 text-[15px] font-medium border-b border-surface-100 flex items-center justify-between group"
            >
              {link.name}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setIsMenuOpen(false)}
            className="px-6 py-4 text-[15px] font-semibold border-b border-surface-100 bg-surface-100/50"
          >
            Login
          </Link>
          <Link
            href="/signup"
            onClick={() => setIsMenuOpen(false)}
            className="px-6 py-5 text-[15px] font-bold text-white bg-primary"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
