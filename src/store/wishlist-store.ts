"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Product } from "@/domains/showroom/api";

export interface WishlistItem {
  product: Product;
  addedAt: string;
  projectFolder?: string;
  quantity?: number;
}

interface WishlistStore {
  items: WishlistItem[];
  projectFolders: string[];
  addItem: (product: Product, projectFolder?: string) => void;
  removeItem: (productId: number) => void;
  toggleItem: (product: Product, projectFolder?: string) => void;
  isWishlisted: (productId: number) => boolean;
  updateQuantity: (productId: number, quantity: number) => void;
  addProjectFolder: (folderName: string) => void;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      projectFolders: ["General Spec", "Living Room", "Master Suite", "Commercial Lobby"],

      addItem: (product, projectFolder = "General Spec") => {
        const current = get().items;
        if (!current.some((item) => item.product.id === product.id)) {
          set({
            items: [
              ...current,
              { product, addedAt: new Date().toISOString(), projectFolder, quantity: 1 },
            ],
          });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.product.id !== productId),
        });
      },

      toggleItem: (product, projectFolder = "General Spec") => {
        const isAlreadyWishlisted = get().isWishlisted(product.id);
        if (isAlreadyWishlisted) {
          get().removeItem(product.id);
        } else {
          get().addItem(product, projectFolder);
        }
      },

      isWishlisted: (productId) => {
        return get().items.some((item) => item.product.id === productId);
      },

      updateQuantity: (productId, quantity) => {
        set({
          items: get().items.map((item) =>
            item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        });
      },

      addProjectFolder: (folderName) => {
        const trimmed = folderName.trim();
        if (trimmed && !get().projectFolders.includes(trimmed)) {
          set({ projectFolders: [...get().projectFolders, trimmed] });
        }
      },

      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: "showroom-wishlist-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
