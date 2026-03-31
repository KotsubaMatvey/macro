export function cx(...parts: unknown[]) {
 return parts.filter(Boolean).join(" ")
}

export const surfaces = {
 page: "min-h-screen bg-[var(--bg)] text-[var(--fg)]",
 shell: "grid min-h-screen xl:grid-cols-[288px_minmax(0,1fr)]",
 sidebar: "sticky top-0 flex h-screen flex-col border-r border-[var(--line)] bg-[color:var(--panel-2)]/96 px-3 py-3 backdrop-blur-xl",
 topbar: "mb-4 grid gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--panel)] px-4 py-3 shadow-[var(--shadow-soft)] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center",
 panel: "rounded-[18px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow-panel)]",
 metric: "rounded-[16px] border border-[var(--line)] bg-[color:var(--panel-3)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
 input: "w-full rounded-[14px] border border-[var(--line)] bg-[color:var(--panel-3)] px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/70 focus:bg-[color:var(--panel)]",
 button: "rounded-[14px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#111318] transition hover:bg-[var(--accent-strong)]",
 subtleButton: "rounded-[14px] border border-[var(--line)] bg-white/[0.02] px-4 py-2.5 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/[0.05]",
 navItem: "group rounded-[14px] border border-transparent px-3 py-2.5 transition",
 navItemActive: "border-amber-500/20 bg-amber-500/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
 navItemIdle: "text-slate-300 hover:border-white/10 hover:bg-white/[0.03] hover:text-white",
}

export function toneClass(value: string) {
 if (["Bullish", "Expansionary", "Triggered", "Beat", "ENTER", "Above forecast", "Enabled", "Improving"].includes(value)) return "text-emerald-300"
 if (["Bearish", "Contractionary", "Miss", "Below forecast", "failed", "Failed", "Deteriorating"].includes(value)) return "text-rose-300"
 if (["Live", "High", "Scheduled", "Pending", "HOLD"].includes(value)) return "text-amber-300"
 if (["Neutral", "Inline", "WAIT", "Stable"].includes(value)) return "text-slate-200"
 return "text-slate-300"
}
