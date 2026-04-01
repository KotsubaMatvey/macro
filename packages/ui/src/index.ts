export function cx(...parts: unknown[]) {
 return parts.filter(Boolean).join(' ')
}

export const surfaces = {
 page: 'min-h-screen bg-[var(--bg)] text-[var(--fg)]',
 shell: 'grid min-h-screen gap-4 xl:grid-cols-[248px_minmax(0,1fr)]',
 sidebar: 'px-3 py-3 md:px-4 xl:sticky xl:top-0 xl:h-screen xl:px-4 xl:py-4 xl:pr-0',
 topbar: 'mb-4 grid gap-3 rounded-[16px] border border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.026),rgba(255,255,255,0.01))] px-4 py-3 shadow-[var(--shadow-soft)] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center',
 panel: 'rounded-[16px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.024),rgba(255,255,255,0.008))] p-4 shadow-[var(--shadow-panel)]',
 metric: 'rounded-[14px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.008))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]',
 input: 'w-full rounded-[12px] border border-[var(--line)] bg-[var(--panel-3)] px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/55 focus:bg-[var(--panel)]',
 button: 'rounded-[12px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#111318] transition hover:bg-[var(--accent-strong)]',
 subtleButton: 'rounded-[12px] border border-[var(--line)] bg-white/[0.02] px-4 py-2.5 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/[0.05]',
 navItem: 'group flex items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-[12px] leading-5 transition',
 navItemActive: 'bg-white/[0.055] text-white ring-1 ring-inset ring-white/7 shadow-[inset_2px_0_0_rgba(209,138,47,0.58)]',
 navItemIdle: 'text-slate-300 hover:bg-white/[0.03] hover:text-white',
}

export function toneClass(value: string) {
 if (['Bullish', 'Expansionary', 'Triggered', 'Beat', 'ENTER', 'Above forecast', 'Enabled', 'Improving'].includes(value)) return 'text-emerald-300'
 if (['Bearish', 'Contractionary', 'Miss', 'Below forecast', 'failed', 'Failed', 'Deteriorating'].includes(value)) return 'text-rose-300'
 if (['Live', 'High', 'Scheduled', 'Pending', 'HOLD'].includes(value)) return 'text-amber-300'
 if (['Neutral', 'Inline', 'WAIT', 'Stable'].includes(value)) return 'text-slate-200'
 return 'text-slate-300'
}
