"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { STEPS, Step, Message } from "@/data/landing_neat";

const MessageItem = ({ message, index }: { message: Message; index: number }) => {
  const isUser = message.type === "user";
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), index * 200);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className={`max-w-2xl mb-8 transition-all duration-1000 transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className={`p-8 border-l-2 ${isUser ? "border-primary" : "border-accent"} bg-white shadow-sm`}>
        <p className="text-xl lg:text-2xl font-medium text-primary leading-relaxed">
          {message.text}
        </p>
        <span className={`text-[12px] font-bold uppercase tracking-[0.2em] mt-4 block ${isUser ? "text-primary/40" : "text-accent/60"}`}>
          — {message.sender}
        </span>
      </div>
    </div>
  );
};

const StepSection = ({ step, index }: { step: Step; index: number }) => {
  const isEven = index % 2 === 0;

  return (
    <section id={step.id} className="min-h-screen py-32 relative flex items-center overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 arch-grid opacity-[0.05]" />
      
      <div className="container max-w-7xl mx-auto px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
        
        {/* Left Side: Text Content */}
        <div className={`${isEven ? "lg:order-1" : "lg:order-2"} space-y-12`}>
          <div className="space-y-4">
            <span className="text-6xl font-black text-primary/5 uppercase tracking-tighter select-none">STEP {step.number}</span>
            <h2 className="text-5xl lg:text-7xl font-bold text-primary tracking-tight">{step.title}</h2>
            <p className="text-xl text-surface-600 font-medium max-w-md">{step.tagline}</p>
          </div>
          
          <div className="space-y-4">
            {step.messages.map((msg, i) => (
              <MessageItem key={i} message={msg} index={i} />
            ))}
          </div>
        </div>

        {/* Right Side: Visual Element */}
        <div className={`${isEven ? "lg:order-2" : "lg:order-1"} relative p-12 hidden lg:block`}>
          <div className="aspect-square relative flex items-center justify-center">
             {/* Decorative Architectural Shapes */}
             <svg viewBox="0 0 400 400" className="w-full h-full text-primary/5 animate-pulse-slow">
                <rect x="50" y="50" width="300" height="300" stroke="currentColor" strokeWidth="1" fill="none" />
                <line x1="50" y1="50" x2="350" y2="350" stroke="currentColor" strokeWidth="1" />
                <line x1="350" y1="50" x2="50" y2="350" stroke="currentColor" strokeWidth="1" />
                <circle cx="200" cy="200" r="100" stroke="currentColor" strokeWidth="1" fill="none" />
             </svg>
             
             {/* Abstract Floating Element */}
             <div className="absolute top-[20%] left-[20%] w-20 h-20 border border-accent/20 rotate-45 animate-float" />
             <div className="absolute bottom-[30%] right-[10%] w-32 h-1 border border-primary/10 -rotate-12" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default function HomeRedesign() {
  const [activeStep, setActiveStep] = useState<string>("hero");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight / 2;
      const stepElements = STEPS.map((s) => document.getElementById(s.id));
      
      let current = "hero";
      stepElements.forEach((el, index) => {
        if (el && scrollPos >= el.offsetTop) {
          current = STEPS[index].id;
        }
      });
      setActiveStep(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative bg-white selection:bg-accent/10 selection:text-accent">
      
      {/* Side Progress Navigation */}
      <div className={`fixed right-12 top-1/2 -translate-y-1/2 z-[1001] hidden xl:flex flex-col gap-8 transition-opacity duration-1000 ${
        activeStep !== "hero" ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}>
        {STEPS.map((step) => (
          <button
            key={step.id}
            onClick={() => document.getElementById(step.id)?.scrollIntoView({ behavior: "smooth" })}
            className="group flex items-center justify-end gap-6 outline-none"
          >
            <span className={`text-[11px] font-bold uppercase tracking-[0.3em] transition-all duration-500 ${
              activeStep === step.id ? "opacity-100 translate-x-0 text-primary" : "opacity-0 translate-x-12"
            }`}>
              {step.title}
            </span>
            <div className={`w-[2px] transition-all duration-700 ${
              activeStep === step.id ? "h-12 bg-accent" : "h-4 bg-surface-200 group-hover:bg-primary/20"
            }`} />
          </button>
        ))}
      </div>

      {/* Hero Section */}
      <section id="hero" className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white px-8">
        <div className="absolute inset-0 arch-grid opacity-10" />
        
        <div className="container max-w-7xl mx-auto relative z-20 text-center space-y-16">
          <div className="flex flex-col items-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 200 200"
              className="w-24 h-24 lg:w-32 lg:h-32"
            >
              <polygon points="50,0 0,200 100,200" fill="#111827" />
              <polygon points="100,0 100,100 200,50" fill="#111827" />
            </svg>
            
            <div className="space-y-6">
              <h1 className="text-8xl lg:text-[10rem] font-bold tracking-tighter text-primary leading-none lowercase select-none">
                archplaybook
              </h1>
              <p className="text-xl lg:text-3xl text-surface-600 font-medium tracking-tight max-w-2xl mx-auto">
                The platform where <span className="text-primary font-bold">architectural intent</span> stays alive from screen to site.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
              <button
                onClick={() => document.getElementById("step1")?.scrollIntoView({ behavior: "smooth" })}
                className="group relative flex items-center gap-6 text-[13px] font-bold uppercase tracking-[0.4em] text-primary"
              >
                <span>Read the Narrative</span>
                <div className="w-12 h-[1px] bg-accent transition-all group-hover:w-24" />
              </button>
              
              <Link
                href="/login"
                className="bg-primary text-white px-12 py-5 text-[12px] font-bold uppercase tracking-[0.3em] hover:bg-accent transition-colors"
              >
                Connect to Playbook
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Decorative Visuals */}
        <div className="absolute inset-x-0 bottom-0 top-1/2 pointer-events-none opacity-[0.03]">
             {/* Large ghostly wireframe */}
             <svg viewBox="0 0 1000 500" className="w-full h-full text-primary">
                <path d="M0 500 L500 0 L1000 500" stroke="currentColor" strokeWidth="1" fill="none" />
                <path d="M100 500 L500 100 L900 500" stroke="currentColor" strokeWidth="1" fill="none" />
                <line x1="500" y1="0" x2="500" y2="500" stroke="currentColor" strokeWidth="1" />
             </svg>
        </div>
      </section>

      {/* Narrative Steps */}
      {STEPS.map((step, index) => (
        <StepSection key={step.id} step={step} index={index} />
      ))}

      {/* Footer / Final CTA */}
      <footer className="py-48 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 arch-grid opacity-5 pointer-events-none" />
        
        <div className="container max-w-4xl mx-auto px-8 relative z-10 text-center space-y-16">
          <div className="space-y-6">
            <h2 className="text-5xl lg:text-7xl font-bold tracking-tight">Your project deserves to be built exactly as you imagined.</h2>
            <p className="text-xl text-white/60 font-medium max-w-xl mx-auto">Join the movement where every detail matters and every brick has a purpose.</p>
          </div>

          <Link
            href="/login"
            className="inline-block border-2 border-white px-16 py-6 text-sm font-bold uppercase tracking-[0.4em] hover:bg-white hover:text-primary transition-all"
          >
            Launch Playbook
          </Link>
          
          <div className="pt-24 text-[11px] font-bold uppercase tracking-[0.5em] text-white/20">
            © Architecture Playbook — 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
