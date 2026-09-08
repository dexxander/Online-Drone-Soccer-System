// ─── ADVANCED THEME ENGINE ─────────────────────────────────────────────────

export type ThemeDef = {
  id: string;
  name: string;
  appBg: string;
  headerBg: string;
  cardBg: string;
  border: string;
  textMain: string;
  textMuted: string;
  clock: string;
  teamA: { text: string; border: string; ring: string; watermark: string; bg: string };
  teamB: { text: string; border: string; ring: string; watermark: string; bg: string };
};

export const THEMES: Record<string, ThemeDef> = {
  default: {
    id: "default",
    name: "Default Dark",
    appBg: "bg-background",
    headerBg: "bg-background",
    cardBg: "bg-background",
    border: "border-border",
    textMain: "text-foreground",
    textMuted: "text-muted-foreground",
    clock: "text-slate-900 dark:text-white font-black drop-shadow-md",
    teamA: { text: "text-primary", border: "border-border", ring: "ring-primary/50", watermark: "opacity-[0.05]", bg: "bg-background" },
    teamB: { text: "text-destructive", border: "border-border", ring: "ring-destructive/50", watermark: "opacity-[0.05]", bg: "bg-background" },
  },
  kkhs: {
    id: "kkhs",
    name: "KKHS Pride",
    appBg: "bg-gradient-to-br from-blue-950 via-slate-900 to-red-950",
    headerBg: "bg-slate-950/40 backdrop-blur-xl border-b-yellow-500/30 shadow-lg",
    cardBg: "bg-slate-900/40 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
    border: "border-white/10 border-t-white/20",
    textMain: "text-slate-50",
    textMuted: "text-slate-300",
    clock: "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]",
    teamA: { text: "text-blue-400 drop-shadow-md", border: "border-blue-500/30", ring: "ring-blue-500/50", watermark: "opacity-[0.1]", bg: "bg-blue-950/20" },
    teamB: { text: "text-red-400 drop-shadow-md", border: "border-red-500/30", ring: "ring-red-500/50", watermark: "opacity-[0.1]", bg: "bg-red-950/20" },
  },
  cyber: {
    id: "cyber",
    name: "Neon Cyber",
    appBg: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-black to-black",
    headerBg: "bg-black/50 backdrop-blur-md border-b-orange-500/40 shadow-[0_4px_15px_rgba(249,115,22,0.1)]",
    cardBg: "bg-black/40 backdrop-blur-xl shadow-[0_0_20px_rgba(249,115,22,0.15)]",
    border: "border-orange-500/30",
    textMain: "text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]",
    textMuted: "text-orange-200/60",
    clock: "text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)] font-black",
    teamA: { text: "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]", border: "border-cyan-500/30 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]", ring: "ring-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.4)]", watermark: "opacity-[0.05]", bg: "bg-cyan-950/10" },
    teamB: { text: "text-fuchsia-400 drop-shadow-[0_0_10px_rgba(217,70,239,0.6)]", border: "border-fuchsia-500/30 shadow-[inset_0_0_20px_rgba(217,70,239,0.1)]", ring: "ring-fuchsia-400/80 shadow-[0_0_15px_rgba(217,70,239,0.4)]", watermark: "opacity-[0.05]", bg: "bg-fuchsia-950/10" },
  },
  frosted: {
    id: "frosted",
    name: "Frosted Glass",
    appBg: "bg-gradient-to-tr from-red-200/80 via-slate-50 to-blue-200/80 dark:from-red-950/80 dark:via-slate-950 dark:to-blue-950/80",
    headerBg: "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-b-white/50 dark:border-b-white/10 shadow-sm",
    cardBg: "bg-white/50 dark:bg-black/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
    border: "border-white/60 dark:border-white/10 border-t-white/90 dark:border-t-white/20",
    textMain: "text-slate-900 dark:text-slate-100",
    textMuted: "text-slate-600 dark:text-slate-400",
    clock: "text-slate-900 dark:text-white font-black drop-shadow-md",
    teamA: { text: "text-blue-700 dark:text-blue-400 drop-shadow-sm", border: "border-blue-300/70 dark:border-blue-500/40 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]", ring: "ring-blue-500/60", watermark: "opacity-[0.08]", bg: "bg-blue-500/10 dark:bg-blue-900/30" },
    teamB: { text: "text-red-700 dark:text-red-400 drop-shadow-sm", border: "border-red-300/70 dark:border-red-500/40 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]", ring: "ring-red-500/60", watermark: "opacity-[0.08]", bg: "bg-red-500/10 dark:bg-red-900/30" },
  },
  sunset: {
    id: "sunset",
    name: "Sunset Vibes",
    appBg: "bg-gradient-to-br from-orange-500 via-rose-500 to-purple-700",
    headerBg: "bg-black/20 backdrop-blur-md border-b-white/10",
    cardBg: "bg-white/10 backdrop-blur-lg shadow-xl",
    border: "border-white/20 border-t-white/30",
    textMain: "text-white",
    textMuted: "text-white/80",
    clock: "text-yellow-300 drop-shadow-md font-black",
    teamA: { text: "text-yellow-300 drop-shadow-sm", border: "border-yellow-300/30", ring: "ring-yellow-300/60", watermark: "opacity-[0.15]", bg: "bg-yellow-500/10" },
    teamB: { text: "text-white drop-shadow-sm", border: "border-white/30", ring: "ring-white/60", watermark: "opacity-[0.15]", bg: "bg-white/10" },
  },
  midnight: {
    id: "midnight",
    name: "Midnight Aurora",
    appBg: "bg-[#0B0F19] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0B0F19] to-[#0B0F19]",
    headerBg: "bg-slate-950/50 backdrop-blur-lg border-b-blue-500/20",
    cardBg: "bg-slate-900/50 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.4)]",
    border: "border-blue-500/10 border-t-blue-400/20",
    textMain: "text-slate-100",
    textMuted: "text-slate-400",
    clock: "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]",
    teamA: { text: "text-blue-400 drop-shadow-sm", border: "border-blue-500/20", ring: "ring-blue-400/50", watermark: "opacity-[0.05]", bg: "bg-blue-950/30" },
    teamB: { text: "text-emerald-400 drop-shadow-sm", border: "border-emerald-500/20", ring: "ring-emerald-400/50", watermark: "opacity-[0.05]", bg: "bg-emerald-950/30" },
  }
};