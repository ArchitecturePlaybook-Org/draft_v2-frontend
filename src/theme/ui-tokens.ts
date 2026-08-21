/**
 * Architecture Playbook — Compact High-Density UI Design System Tokens
 * Reusable utility maps and design tokens to enforce consistent, sleek, compact UI styling across all components.
 */
export const COMPACT_UI = {
  // Typography
  title: "text-base sm:text-lg font-black text-primary tracking-tight",
  subtitle: "text-xs font-medium text-surface-500",
  sectionHeader: "text-xs font-black uppercase tracking-wider text-primary",
  caption: "text-[10px] font-bold text-surface-400 uppercase tracking-widest",

  // Buttons
  btnPrimary: "h-8 px-3.5 bg-accent text-background font-black text-[10px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0",
  btnSecondary: "h-8 px-3.5 bg-surface-200/70 hover:bg-surface-200 text-foreground font-black text-[10px] uppercase tracking-wider rounded-lg border border-surface-300/60 transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
  btnDanger: "h-8 px-3.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/30 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
  btnGhost: "h-8 px-2.5 text-surface-400 hover:text-primary hover:bg-surface-100 rounded-lg text-xs font-semibold transition-all cursor-pointer",

  // Cards & Containers
  card: "p-3 rounded-xl bg-surface-card border border-surface-200/80 dark:border-surface-800 shadow-xs",
  cardHover: "p-3 rounded-xl bg-surface-card border border-surface-200/80 dark:border-surface-800 hover:border-accent/60 hover:shadow-md transition-all duration-200",
  glassContainer: "p-3 rounded-xl bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-xl border border-surface-200/80 dark:border-surface-800 shadow-sm",

  // Inputs & Form Controls
  label: "text-xs font-bold text-surface-500 mb-1 block",
  input: "h-8 px-3 bg-surface-100/60 dark:bg-surface-950/60 border border-surface-200/80 dark:border-surface-800 rounded-lg text-xs font-bold text-primary placeholder:text-surface-400 outline-none focus:border-accent transition-all",
  select: "h-8 px-3 bg-surface-100/60 dark:bg-surface-950/60 border border-surface-200/80 dark:border-surface-800 rounded-lg text-xs font-bold text-primary uppercase tracking-wider cursor-pointer outline-none focus:border-accent",

  // Badges & Pills
  badgeAccent: "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-accent/10 text-accent border border-accent/20",
  badgeSuccess: "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  badgeWarning: "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20",
  badgeDanger: "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20",
};
