"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PublicProfile } from "@/domains/users/api";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  ExternalLink,
  Layers,
  Building2,
  Sparkles,
  Maximize2,
  X,
} from "lucide-react";

interface ProfileProjectSliderProps {
  profile: PublicProfile;
}

export function ProfileProjectSlider({ profile }: ProfileProjectSliderProps) {
  // Combine portfolios or use default high-res fallback architectural projects
  const rawPortfolios = [
    ...(profile.portfolios || []),
    ...(profile.contributed_portfolios || []),
  ];

  const projects = rawPortfolios.length > 0 ? rawPortfolios.map((p, idx) => ({
    id: p.id || idx + 100,
    title: p.title || "Architectural Project",
    category: idx === 0 ? "Commercial High-Rise • BIM Level 2" : idx === 1 ? "Mixed-Use Tech Hub" : "Sustainable Luxury Architecture",
    location: profile.city ? `${profile.city}, ${profile.country}` : "Bengaluru, India",
    image: p.image || [
      "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ][idx % 3],
    views_count: p.views_count || (3500 - idx * 450),
    tags: idx === 0 ? ["Revit", "IFC 4.0", "LEED Platinum", "Facade Design"] : idx === 1 ? ["Navisworks", "4D Scheduling", "MEP Clash"] : ["Vastu Compliant", "Passive Solar", "Courtyard"],
    description: idx === 0 
      ? "34-Story Sustainable Commercial Office Tower featuring passive solar shading, double-skin glass facade, and automated rainwater harvesting."
      : idx === 1 
      ? "Integrated 4D BIM Clash detection model for 500,000 sq.ft. commercial retail & office plaza."
      : "Ultra-luxury biophilic residential residence designed with natural stone cladding, courtyard ventilation, and smart home automation.",
  })) : [
    {
      id: 101,
      title: "Manyata Tech Park Eco-Tower Masterplan",
      category: "Commercial High-Rise • BIM Level 2",
      location: "Bengaluru, India",
      image: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=1200&q=80",
      views_count: 4820,
      tags: ["Revit", "IFC 4.0", "LEED Platinum", "Facade Design"],
      description: "34-Story Sustainable Commercial Office Tower featuring passive solar shading, double-skin glass facade, and automated rainwater harvesting.",
    },
    {
      id: 102,
      title: "Whitefield Smart Commercial Hub BIM Model",
      category: "Mixed-Use Development",
      location: "Whitefield, Bengaluru",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
      views_count: 3150,
      tags: ["Navisworks", "4D Scheduling", "MEP Clash Detection"],
      description: "Integrated 4D BIM Clash detection model for 500,000 sq.ft. commercial retail & office plaza.",
    },
    {
      id: 103,
      title: "Indiranagar Sustainable Luxury Villa",
      category: "Residential Architecture",
      location: "Indiranagar, Bengaluru",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      views_count: 2890,
      tags: ["Vastu Compliant", "Passive Cooling", "Solar PV Grid"],
      description: "Ultra-luxury biophilic residential residence designed with natural stone cladding, courtyard ventilation, and smart home automation.",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAutoplay || projects.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % projects.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoplay, projects.length]);

  const activeProject = projects[currentIndex];

  const handlePrev = () => {
    setIsAutoplay(false);
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
  };

  const handleNext = () => {
    setIsAutoplay(false);
    setCurrentIndex((prev) => (prev + 1) % projects.length);
  };

  return (
    <div className="bg-surface-900 text-white rounded-2xl border border-white/10 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background Glow Overlay */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
              Featured Project Showcase
              <span className="text-[10px] font-extrabold text-accent bg-accent/15 border border-accent/30 px-2 py-0.5 rounded-full font-mono">
                {currentIndex + 1} / {projects.length}
              </span>
            </h2>
            <p className="text-[10px] text-white/60 font-medium">
              Highlighted architectural blueprints, 3D models, & construction specifications
            </p>
          </div>
        </div>

        {/* Carousel Arrow Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-accent hover:text-background border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
            title="Previous Project"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-accent hover:text-background border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
            title="Next Project"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Slide Card Viewport */}
      <div className="relative z-10 rounded-xl overflow-hidden border border-white/10 bg-surface-950/70 backdrop-blur-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeProject.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="grid grid-cols-1 lg:grid-cols-12 min-h-[360px] sm:min-h-[400px]"
          >
            {/* Project Image Viewport (7 cols) */}
            <div className="lg:col-span-7 relative group min-h-[240px] sm:min-h-[340px] bg-black overflow-hidden">
              <img
                src={activeProject.image}
                alt={activeProject.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
                onClick={() => setLightboxImage(activeProject.image)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-black/30 pointer-events-none" />

              {/* Lightbox Zoom Button */}
              <button
                onClick={() => setLightboxImage(activeProject.image)}
                className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-lg"
                title="Expand Full Resolution View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Location Badge */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white/90">
                <MapPin className="w-3 h-3 text-accent" />
                <span>{activeProject.location}</span>
              </div>
            </div>

            {/* Project Info Panel (5 cols) */}
            <div className="lg:col-span-5 p-5 flex flex-col justify-between space-y-4 bg-gradient-to-b from-surface-900/90 to-surface-950/90">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-accent/20 border border-accent/30 text-accent font-mono">
                    {activeProject.category}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-white/70">
                    <Eye className="w-3 h-3 text-white/50" />
                    {activeProject.views_count.toLocaleString()} Views
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white leading-snug">
                  {activeProject.title}
                </h3>

                <p className="text-xs text-white/75 font-normal leading-relaxed line-clamp-3">
                  {activeProject.description}
                </p>

                {/* Tech & Spec Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeProject.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/10 border border-white/10 text-white/80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Links */}
              <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                <Link
                  href={`/portfolio/${activeProject.id}`}
                  className="flex-1 h-9 bg-accent hover:bg-accent-hover text-background font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <span>Explore Blueprint & 3D Model</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnail Navigation Track */}
      {projects.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 relative z-10">
          {projects.map((proj, idx) => (
            <button
              key={proj.id}
              onClick={() => {
                setIsAutoplay(false);
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                currentIndex === idx
                  ? "w-8 bg-accent"
                  : "w-2 bg-white/20 hover:bg-white/40"
              }`}
              title={`Jump to ${proj.title}`}
            />
          ))}
        </div>
      )}

      {/* Full-Screen Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            <div className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 p-2 rounded-full border border-white/20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={lightboxImage}
                alt="Full resolution preview"
                className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/20 shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
