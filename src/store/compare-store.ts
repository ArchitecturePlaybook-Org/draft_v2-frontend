"use client";

import { create } from "zustand";
import { Product } from "@/domains/showroom/api";

interface CompareStore {
  items: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: number) => void;
  toggleCompare: (product: Product) => void;
  isCompared: (productId: number) => boolean;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareStore>((set, get) => ({
  items: [],

  addToCompare: (product) => {
    const current = get().items;
    if (current.length >= 4) {
      alert("You can compare up to 4 products side-by-side at a time.");
      return;
    }
    if (!current.some((item) => item.id === product.id)) {
      set({ items: [...current, product] });
    }
  },

  removeFromCompare: (productId) => {
    set({ items: get().items.filter((item) => item.id !== productId) });
  },

  toggleCompare: (product) => {
    if (get().isCompared(product.id)) {
      get().removeFromCompare(product.id);
    } else {
      get().addToCompare(product);
    }
  },

  isCompared: (productId) => {
    return get().items.some((item) => item.id === productId);
  },

  clearCompare: () => set({ items: [] }),
}));
