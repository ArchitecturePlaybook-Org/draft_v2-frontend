import { create } from 'zustand';

interface CommandPaletteState {
  isOpen: boolean;
  searchQuery: string;
  setIsOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  searchQuery: '',
  setIsOpen: (isOpen) => set({ isOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
