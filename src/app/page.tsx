"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { STEPS, Step, Message } from "@/data/landing_neat";
import { motion, useScroll, useTransform } from "framer-motion";
import { Moon, Sun, Monitor } from "lucide-react";

// The new 10x MessageItem with framer-motion and glassmorphism
const MessageItem = ({ message, index }: { message: Message; index: number }) => {
  const isUser = message.type === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ delay: index * 0.15, duration: 0.8, ease: "easeOut" }}
      className={`max-w-2xl mb-8 relative ${isUser ? "ml-0" : "ml-auto"}`}
    >
      <div className={`p-8 border-l-4 ${isUser ? "border-primary" : "border-accent"} glass-card card-hover shadow-xl overflow-hidden group`}>
        {/* Subtle glow effect on hover */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-r ${isUser ? 'from-primary to-transparent' : 'from-accent to-transparent'}`} />
        
        <p className="text-xl lg:text-2xl font-medium text-foreground leading-relaxed relative z-10">
          {message.text}
        </p>
        <div className="flex items-center gap-3 mt-6">
          <div className={`w-6 h-[2px] ${isUser ? "bg-primary/40" : "bg-accent/60"}`} />
          <span className={`text-[12px] font-bold uppercase tracking-[0.2em] block ${isUser ? "text-primary/60" : "text-accent/80"}`}>
            {message.sender}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const StepSection = ({ step, index }: { step: Step; index: number }) => {
  const isEven = index % 2 === 0;

  return (
    <section id={step.id} className="min-h-screen py-32 relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 arch-grid" />
      
      <div className="container max-w-7xl mx-auto px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
        
        {/* Text Content */}
        <div className={`${isEven ? "lg:order-1" : "lg:order-2"} space-y-12`}>
          <motion.div 
            initial={{ opacity: 0, x: isEven ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6 relative"
          >
            <span className="absolute -top-16 -left-8 text-[8rem] font-black text-primary/5 uppercase tracking-tighter select-none z-0">
              0{step.number}
            </span>
            <div className="relative z-10">
              <h2 className="text-5xl lg:text-7xl font-bold text-foreground tracking-tight drop-shadow-sm">{step.title}</h2>
              <p className="text-xl text-text-secondary font-medium max-w-md mt-4">{step.tagline}</p>
            </div>
          </motion.div>
          
          <div className="space-y-4">
            {step.messages.map((msg, i) => (
              <MessageItem key={i} message={msg} index={i} />
            ))}
          </div>
        </div>

        {/* Visual Element */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`${isEven ? "lg:order-2" : "lg:order-1"} relative p-12 hidden lg:block`}
          style={{ perspective: "1000px" }}
        >
          <div className="aspect-square relative flex items-center justify-center transition-transform duration-700 hover:rotate-6" style={{ transformStyle: "preserve-3d" }}>
             {/* 10X Decorative 3D-like Shapes */}
             <div className="absolute inset-0 rounded-full border border-primary/20 animate-spin-slow shadow-primary/10 shadow-2xl" />
             <div className="absolute inset-8 rounded-full border border-accent/20 animate-reverse-spin-slow" />
             
             <div className="absolute w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent blur-3xl rounded-full" />
             
             <svg viewBox="0 0 400 400" className="w-full h-full text-primary/10 relative z-10 drop-shadow-lg">
                <rect x="50" y="50" width="300" height="300" stroke="currentColor" strokeWidth="2" fill="none" className="backdrop-blur-sm bg-white/5" />
                <line x1="50" y1="50" x2="350" y2="350" stroke="currentColor" strokeWidth="2" />
                <line x1="350" y1="50" x2="50" y2="350" stroke="currentColor" strokeWidth="2" />
             </svg>
             
             <motion.div 
                animate={{ y: [0, -20, 0], rotate: [45, 90, 45] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[20%] left-[20%] w-24 h-24 border-2 border-accent/40 bg-accent/5 backdrop-blur-md z-20 shadow-xl" 
             />
             <motion.div 
                animate={{ y: [0, 20, 0], rotate: [-12, -24, -12] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[30%] right-[10%] w-40 h-2 bg-primary/30 z-20 shadow-lg" 
             />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default function HomeRedesign() {
  const [activeStep, setActiveStep] = useState<string>("hero");
  const [theme, setTheme] = useState<string>("dark");
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  useEffect(() => {
    // Apply theme
    document.documentElement.className = theme === 'dark' ? '' : `theme-${theme}`;
  }, [theme]);

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
    <div className="relative bg-background selection:bg-accent/20 selection:text-accent min-h-screen text-foreground transition-colors duration-700 font-sans pt-20">
      
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
              activeStep === step.id ? "h-12 bg-accent shadow-accent shadow-[0_0_10px]" : "h-4 bg-surface-300 group-hover:bg-surface-200"
            }`} />
          </button>
        ))}
      </div>

      {/* Hero Section */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }}
        id="hero" 
        className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-8 origin-top"
      >
        <div className="absolute inset-0 arch-grid" />
        
        {/* Glow effect behind hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container max-w-7xl mx-auto relative z-20 text-center space-y-16">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="flex flex-col items-center space-y-12"
          >
            <motion.svg
              whileHover={{ rotate: 90, scale: 1.1 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 200 200"
              className="w-24 h-24 lg:w-32 lg:h-32 text-primary drop-shadow-lg cursor-pointer"
            >
              <polygon points="50,0 0,200 100,200" fill="currentColor" />
              <polygon points="100,0 100,100 200,50" fill="currentColor" />
            </motion.svg>
            
            <div className="space-y-8 relative">
              <h1 className="text-[5rem] sm:text-7xl lg:text-[10rem] font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-foreground to-text-secondary leading-none lowercase select-none">
                architecture<br className="hidden sm:block" /> playbook
              </h1>
              <p className="text-xl lg:text-3xl text-text-secondary font-medium tracking-tight max-w-3xl mx-auto leading-relaxed">
                The platform where <span className="text-primary font-bold relative inline-block">architectural intent
                  <span className="absolute -bottom-2 left-0 w-full h-1 bg-accent/50 blur-sm rounded-full"></span>
                  <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-accent rounded-full"></span>
                </span> stays alive from screen to site.
              </p>
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-10 mt-12"
              style={{ perspective: "1000px" }}
            >
              <motion.button
                whileHover={{ scale: 1.05, rotateX: 5 }}
                onClick={() => document.getElementById("step1")?.scrollIntoView({ behavior: "smooth" })}
                className="group relative flex items-center gap-6 text-[13px] font-bold uppercase tracking-[0.4em] text-text-secondary hover:text-foreground transition-colors outline-none"
              >
                <span>Read the Narrative</span>
                <div className="w-12 h-[2px] bg-accent transition-all duration-500 group-hover:w-24 group-hover:shadow-[0_0_15px_var(--accent)]" />
              </motion.button>
              
              <motion.div whileHover={{ scale: 1.05, rotateX: 5 }}>
                <Link
                  href="/login"
                  className="relative overflow-hidden bg-foreground text-background px-12 py-5 text-[12px] font-bold uppercase tracking-[0.3em] transition-all shadow-[0_10px_40px_-10px_var(--primary)] rounded-sm group block"
                >
                  <div className="absolute inset-0 bg-accent/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                  <span className="relative z-10 group-hover:text-foreground transition-colors block">Connect to Playbook</span>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Hero Decorative Visuals */}
        <div className="absolute inset-x-0 bottom-0 top-1/2 pointer-events-none opacity-[0.05] z-0 mix-blend-overlay">
             <svg viewBox="0 0 1000 500" className="w-full h-full text-primary" preserveAspectRatio="none">
                <path d="M0 500 L500 0 L1000 500" stroke="currentColor" strokeWidth="1" fill="none" />
                <path d="M100 500 L500 100 L900 500" stroke="currentColor" strokeWidth="1" fill="none" />
                <line x1="500" y1="0" x2="500" y2="500" stroke="currentColor" strokeWidth="1" />
             </svg>
        </div>
      </motion.section>

      {/* Narrative Steps */}
      <div className="relative z-20 bg-background">
        {STEPS.map((step, index) => (
          <StepSection key={step.id} step={step} index={index} />
        ))}
      </div>

      {/* Footer / Final CTA */}
      <footer className="py-48 bg-surface-50 text-foreground relative overflow-hidden border-t border-surface-200">
        <div className="absolute inset-0 arch-grid opacity-10 pointer-events-none" />
        
        {/* Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="container max-w-4xl mx-auto px-8 relative z-10 text-center space-y-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <h2 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground drop-shadow-md">Your project deserves to be built exactly as you imagined.</h2>
            <p className="text-xl text-text-secondary font-medium max-w-xl mx-auto">Join the movement where every detail matters and every brick has a purpose.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <Link
              href="/login"
              className="inline-block relative group border-2 border-primary text-primary px-16 py-6 text-sm font-bold uppercase tracking-[0.4em] transition-all hover:border-transparent hover:shadow-primary/30 hover:shadow-2xl"
            >
              <div className="absolute inset-0 bg-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-out" />
              <span className="relative z-10 group-hover:text-background transition-colors duration-500">Launch Playbook</span>
            </Link>
          </motion.div>
          
          <div className="pt-24 text-[11px] font-bold uppercase tracking-[0.5em] text-text-secondary">
            © Architecture Playbook — 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
