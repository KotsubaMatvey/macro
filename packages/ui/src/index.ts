export function cx(...parts: unknown[]) {
 return parts.filter(Boolean).join(' ')
}

export const surfaces = {
 page: 'min-h-screen bg-[var(--bg)] text-[var(--fg)]',
 shell: 'grid min-h-screen gap-3 xl:grid-cols-[236px_minmax(0,1fr)] 2xl:grid-cols-[244px_minmax(0,1fr)]',
 sidebar: 'px-2 py-2 md:px-3 xl:sticky xl:top-0 xl:h-screen xl:px-3 xl:py-3 xl:pr-0',
 topbar: 'mb-3 grid gap-2 rounded-[14px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.006))] px-4 py-3 shadow-[0_12px_26px_rgba(0,0,0,0.24)] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center',
 panel: 'rounded-[15px] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.016),rgba(255,255,255,0.006))] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.018),0_16px_32px_rgba(0,0,0,0.24)]',
 metric: 'rounded-[12px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.016),rgba(255,255,255,0.006))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.016)]',
 input: 'w-full rounded-[10px] border border-[var(--line)] bg-[var(--panel-3)] px-3 py-2 text-[12px] text-white outline-none transition focus:border-amber-400/45 focus:bg-[var(--panel)]',
 button: 'rounded-[10px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#111318] transition hover:bg-[var(--accent-strong)]',
 subtleButton: 'rounded-[10px] border border-[var(--line)] bg-white/[0.02] px-4 py-2.5 text-sm text-slate-200 transition hover:border-white/18 hover:bg-white/[0.05]',
 navItem: 'group flex items-center justify-between gap-3 rounded-[9px] px-2.5 py-1.5 text-[11px] leading-5 transition',
 navItemActive: 'bg-white/[0.05] text-white ring-1 ring-inset ring-white/[0.06] shadow-[inset_2px_0_0_rgba(77,171,247,0.72)]',
 navItemIdle: 'text-slate-400 hover:bg-white/[0.025] hover:text-slate-100',
}

export function toneClass(value: string) {
 if (['Bullish', 'Expansionary', 'Triggered', 'Beat', 'ENTER', 'Above forecast', 'Enabled', 'Improving', 'Risk-on', 'Supportive'].includes(value)) return 'text-emerald-300'
 if (['Bearish', 'Contractionary', 'Miss', 'Below forecast', 'failed', 'Failed', 'Deteriorating', 'Risk-off', 'Restrictive'].includes(value)) return 'text-rose-300'
 if (['Live', 'High', 'Scheduled', 'Pending', 'HOLD'].includes(value)) return 'text-amber-300'
 if (['Neutral', 'Inline', 'WAIT', 'Stable', 'Mixed', 'Flat'].includes(value)) return 'text-slate-200'
 return 'text-slate-300'
}
