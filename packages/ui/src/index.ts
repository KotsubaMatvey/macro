export function cx(...parts: unknown[]) {
 return parts.filter(Boolean).join(' ')
}

export const surfaces = {
 page: 'min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased',
 shell: 'grid min-h-screen gap-3 xl:grid-cols-[236px_minmax(0,1fr)] 2xl:grid-cols-[244px_minmax(0,1fr)]',
 sidebar: 'px-2 py-2 md:px-3 xl:sticky xl:top-0 xl:h-screen xl:px-3 xl:py-3 xl:pr-0',
 topbar: 'ws-shell-topbar',
 panel: 'ws-panel ws-panel-level-context p-4',
 metric: 'ws-metric',
 input: 'w-full rounded-[10px] border border-[var(--line)] bg-[var(--panel-3)] px-3 py-2 text-[12px] text-white outline-none transition focus:border-amber-400/45 focus:bg-[var(--panel)]',
 button: 'rounded-[10px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#111318] transition hover:bg-[var(--accent-strong)]',
 subtleButton: 'rounded-[10px] border border-[var(--line)] bg-white/[0.02] px-4 py-2.5 text-sm text-slate-200 transition hover:border-white/18 hover:bg-white/[0.05]',
 navItem: 'group flex items-center justify-between gap-3 rounded-[9px] px-2.5 py-1.5 text-[11px] leading-5 transition',
 navItemActive: 'bg-white/[0.04] text-white ring-1 ring-inset ring-white/[0.045] shadow-[inset_2px_0_0_rgba(77,171,247,0.68)]',
 navItemIdle: 'text-slate-400 hover:bg-white/[0.025] hover:text-slate-100',
}

export function toneClass(value: string) {
 const normalized = value.trim().toLowerCase()
 if (['bullish', 'expansionary', 'triggered', 'beat', 'enter', 'above forecast', 'enabled', 'improving', 'risk-on', 'supportive', 'live', 'fresh', 'online', 'ready'].includes(normalized)) return 'text-emerald-300'
 if (['bearish', 'contractionary', 'miss', 'below forecast', 'failed', 'deteriorating', 'risk-off', 'restrictive', 'fallback', 'stale', 'degraded', 'offline'].includes(normalized)) return 'text-rose-300'
 if (['high', 'scheduled', 'pending', 'hold', 'aging', 'demo', 'replay', 'warning'].includes(normalized)) return 'text-amber-300'
 if (['neutral', 'inline', 'wait', 'stable', 'mixed', 'flat', 'static', 'derived'].includes(normalized)) return 'text-slate-200'
 return 'text-slate-300'
}
