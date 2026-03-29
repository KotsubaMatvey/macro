export function cx(...parts: any[]) {
  return parts.filter(Boolean).join(" ");
};

export const surfaces = {
  page: "min-h-screen bg-[var(--bg)] text-[var(--fg)]",
  shell: "grid min-h-screen xl:grid-cols-[260px_minmax(0,1fr)]",
  sidebar: "border-r border-white/8 bg-[var(--panel-2)] px-4 py-5",
  topbar: "mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[var(--panel)] px-4 py-3",
  panel: "rounded-2xl border border-white/8 bg-[var(--panel)] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_48px_rgba(0,0,0,0.24)]",
  metric: "rounded-2xl border border-white/8 bg-[var(--panel)] p-4",
  input: "w-full rounded-xl border border-white/10 bg-[#0b1015] px-3 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]",
  button: "rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-strong)]",
  subtleButton: "rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/5",
};

export function toneClass(value: string) {
  if (value === "Bullish" || value === "Expansionary" || value === "Triggered") return "text-emerald-300";
  if (value === "Bearish" || value === "Contractionary") return "text-rose-300";
  if (value === "Live" || value === "High" || value === "Scheduled") return "text-amber-300";
  return "text-slate-300";
}



