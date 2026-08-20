"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PublicProfile } from "@/domains/users/api";
import {
  Eye,
  Heart,
  ExternalLink,
  Maximize2,
  Search,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
} from "lucide-react";

interface PinterestProjectGridProps {
  profile: PublicProfile;
}

export function PinterestProjectGrid({ profile }: PinterestProjectGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [likedIds, setLikedIds] = useState<number[]>([]);

  const sliderRef = useRef<HTMLDivElement>(null);

  const rawPortfolios = [
    ...(profile.portfolios || []),
    ...(profile.contributed_portfolios || []),
  ];

  const projects = rawPortfolios.length > 0 ? rawPortfolios.map((p, idx) => ({
    id: p.id || idx + 100,
    title: p.title || `Architectural Work #${idx + 1}`,
    category: idx % 4 === 0 ? "Commercial & Tech Parks" : idx % 4 === 1 ? "Masterplan" : idx % 4 === 2 ? "Residential & Villas" : "3D BIM & Facades",
    image: p.image || [
      "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    ][idx % 4],
    views: p.views_count || (4200 - idx * 350),
    likes: 180 + idx * 45,
    tags: idx % 2 === 0 ? ["Revit", "IFC 4.0", "BIM Level 2"] : ["Grasshopper", "Vastu", "LEED AP"],
  })) : [
    {
      id: 101,
      title: "Manyata Eco-Tower Masterplan",
      category: "Masterplan",
      image: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80",
      views: 4820,
      likes: 312,
      tags: ["Revit", "LEED Platinum", "Double Facade"],
    },
    {
      id: 102,
      title: "Whitefield Smart Commercial Hub",
      category: "Commercial & Tech Parks",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
      views: 3150,
      likes: 245,
      tags: ["BIM Level 2", "4D Navisworks", "Clash Free"],
    },
    {
      id: 103,
      title: "Indiranagar Sustainable Luxury Villa",
      category: "Residential & Villas",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      views: 2890,
      likes: 198,
      tags: ["Vastu Compliant", "Biophilic", "Solar PV"],
    },
    {
      id: 104,
      title: "Parametric Kinetic Facade Detail",
      category: "3D BIM & Facades",
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
      views: 1940,
      likes: 167,
      tags: ["Grasshopper", "Rhino 3D", "Solar Shading"],
    },
    {
      id: 105,
      title: "Urban Forest High-Rise Atrium",
      category: "Masterplan",
      image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
      views: 2410,
      likes: 289,
      tags: ["Atrium", "Natural Light", "HVAC Opt"],
    },
    {
      id: 106,
      title: "Penthouse Loft Interior Blueprint",
      category: "Residential & Villas",
      image: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
      views: 1820,
      likes: 142,
      tags: ["Interior Specs", "Custom Lighting"],
    },
  ];

  const categories = ["All", "Commercial & Tech Parks", "Masterplan", "Residential & Villas", "3D BIM & Facades"];

  const filteredProjects = projects.filter((p) => {
    const matchesCat = selectedCategory === "All" || p.category === selectedCategory;
    const matchesQuery = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const toggleSave = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      
      {/* Category Pills & Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-100/90 backdrop-blur-xl p-2.5 rounded-2xl border border-surface-200 shadow-2xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-accent text-background font-black shadow-xs"
                  : "bg-surface-50 hover:bg-surface-200 text-surface-600 dark:text-surface-300 border border-surface-200/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Controls: Search + Left/Right Slide Arrows */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between shrink-0">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search gallery..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-50 border border-surface-200 text-xs font-semibold text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-xl bg-surface-50 hover:bg-accent hover:text-background border border-surface-200 text-surface-600 dark:text-surface-300 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              title="Slide Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-xl bg-surface-50 hover:bg-accent hover:text-background border border-surface-200 text-surface-600 dark:text-surface-300 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              title="Slide Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Sliding Project Cards Carousel */}
      <div 
        ref={sliderRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar py-1"
      >
        {filteredProjects.map((project) => {
          const isSaved = savedIds.includes(project.id);
          const isLiked = likedIds.includes(project.id);

          return (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="snap-start shrink-0 w-[280px] sm:w-[310px] lg:w-[340px] group bg-surface-100/90 backdrop-blur-xl border border-surface-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:border-accent/40 transition-all duration-300 flex flex-col"
            >
              {/* Image Card Container */}
              <div className="relative h-48 sm:h-56 overflow-hidden bg-surface-900 cursor-pointer">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onClick={() => setLightboxImage(project.image)}
                />

                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none" />

                {/* Top Actions */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-md border border-white/20">
                    {project.category}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => toggleSave(project.id, e)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md ${
                        isSaved
                          ? "bg-rose-600 text-white"
                          : "bg-black/60 backdrop-blur-md text-white hover:bg-white hover:text-black border border-white/20"
                      }`}
                      title={isSaved ? "Saved" : "Save Project"}
                    >
                      <Bookmark className="w-3.5 h-3.5" fill={isSaved ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => setLightboxImage(project.image)}
                      className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white hover:bg-white hover:text-black border border-white/20 transition-all cursor-pointer shadow-md"
                      title="Expand View"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10">
                  <div className="flex items-center justify-between text-white/80 text-[10px] font-semibold">
                    <span className="flex items-center gap-1 font-mono">
                      <Eye className="w-3 h-3 text-accent" />
                      {project.views.toLocaleString()} Views
                    </span>
                    <button
                      onClick={(e) => toggleLike(project.id, e)}
                      className="flex items-center gap-1 text-white hover:text-rose-400 transition-colors"
                    >
                      <Heart className="w-3 h-3" fill={isLiked ? "#f43f5e" : "none"} color={isLiked ? "#f43f5e" : "currentColor"} />
                      <span>{project.likes + (isLiked ? 1 : 0)}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Details Footer */}
              <div className="p-3 space-y-2 bg-surface-100/60 border-t border-surface-200/60 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-black text-primary truncate group-hover:text-accent transition-colors">
                      {project.title}
                    </h4>
                    <Link
                      href={`/portfolio/${project.id}`}
                      className="text-surface-400 hover:text-accent transition-colors shrink-0"
                      title="Open Full Details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {project.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-200/80 text-surface-600 dark:text-surface-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center p-8 bg-surface-100/60 rounded-2xl border border-dashed border-surface-200">
          <Search className="w-8 h-8 text-surface-400 mx-auto mb-2 opacity-40" />
          <h3 className="text-xs font-black text-primary uppercase tracking-wider">No Projects Found</h3>
          <p className="text-[10px] text-surface-400 mt-1">Try clearing search filters or selected category.</p>
        </div>
      )}

      {/* Lightbox Modal */}
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
