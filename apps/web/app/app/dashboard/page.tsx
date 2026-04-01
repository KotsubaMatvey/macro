import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type {
 DashboardAssetView,
 DashboardLinkedIntelligence,
 DashboardPayload,
 DashboardProviderStatus,
 DashboardRegimeBlock,
 DashboardTrackRecordItem,
 SourceMetadata,
} from "@macroaccess/types"

import { Badge, DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getDashboard } from "@/lib/server/api"

function showPercent(value: number) {
	const prefix = value > 0 ? '+' : ''
	return prefix + value.toFixed(2) + '%'
}

function selectedAsset(payload: DashboardPayload, requested?: string) {
	const source = payload.hero.assets ? payload.hero.assets : []
	const exact = requested ? source.find(function (item) { return item.symbol === requested }) : undefined
	return exact ? exact : source[0]
}

function freshnessBadges(meta: SourceMetadata) {
	return h('div', { className: 'flex flex-wrap gap-2' }, [
		h(Badge, { key: 'mode', accent: meta.mode === 'live' }, meta.mode),
		h(Badge, { key: 'fresh' }, meta.freshness),
		h(Badge, { key: 'source' }, meta.source),
	])
}

function assetTabs(payload: DashboardPayload, activeSymbol: string) {
	return h('div', { className: 'flex flex-wrap gap-2' }, (payload.hero.assets ? payload.hero.assets : []).map(function (item: DashboardAssetView) {
		const active = item.symbol === activeSymbol
		return h(Link, { key: item.symbol, href: '/app/dashboard?asset=' + item.symbol, className: active ? 'rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-medium text-amber-200' : 'rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-white/20 hover:text-white' }, item.symbol)
	}))
}

function sparkline(points: { label: string; value: number }[]) {
	if (points.length === 0) return h('div', { className: 'text-xs text-slate-500' }, 'No history loaded.')
	const values = points.map(function (item) { return item.value })
	const min = Math.min.apply(null, values)
	const max = Math.max.apply(null, values)
	return h('div', { className: 'flex h-20 items-end gap-1 rounded-[14px] border border-white/8 bg-white/[0.02] px-2 py-2' }, points.map(function (item, index) {
		const height = max === min ? 50 : Math.max(10, Math.round(((item.value - min) / (max - min)) * 100))
		return h('div', { key: item.label + String(index), className: 'flex-1 rounded-full bg-amber-300/70', style: { height: String(height) + '%' } })
	}))
}

function regimeSummary(block: DashboardRegimeBlock, href: string, label: string) {
	const rows: ReactNode[][] = [
		['State', block.label, block.interpretation],
		['Score', block.score.toFixed(2), 'Delta ' + block.delta.toFixed(2) + ' / ' + block.trend],
		['Drivers', String(block.drivers.length), block.drivers.join('. ')],
	]
	return h('div', { className: 'space-y-4' }, [
		freshnessBadges(block.freshness),
		h(DataTable, { key: label + '-table', headers: ['Field', 'Value', 'Desk read'], rows, dense: true, numericColumns: [1] }),
		h('div', { key: label + '-spark', className: 'space-y-2' }, [
			h('div', { key: 'label', className: 'text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500' }, 'History'),
			sparkline(block.history),
		]),
		h(Link, { key: label + '-link', href, className: 'text-sm text-sky-300 transition hover:text-sky-200' }, label),
	])
}

function trackRows(items: DashboardTrackRecordItem[]) {
	if (items.length === 0) return [['No replay records', '-', '-', '-'] as ReactNode[]]
	return items.map(function (item: DashboardTrackRecordItem) {
		const link = item.linkedEventHref && item.linkedEventTitle ? h(Link, { href: item.linkedEventHref, className: 'text-sky-300 transition hover:text-sky-200' }, item.linkedEventTitle) : 'No linked catalyst'
		return [item.symbol + ' / ' + item.stance, showPercent(item.expectedMove5dPct), showPercent(item.realizedMove5dPct), link]
	})
}

function providerRows(items: DashboardProviderStatus[]) {
	return items.map(function (item: DashboardProviderStatus) {
		return [item.name, item.status, item.detail]
	})
}

function intelligenceRows(linked: DashboardLinkedIntelligence) {
	const rows: ReactNode[][] = []
	for (const item of linked.briefings) rows.push(['Briefing', item.title, item.subtitle])
	for (const item of linked.news) rows.push(['News', h('a', { href: item.href, className: 'text-sky-300 transition hover:text-sky-200', target: '_blank', rel: 'noreferrer' }, item.title), item.subtitle])
	for (const item of linked.watchlists) rows.push(['Watchlist', item.title, item.subtitle])
	for (const item of linked.alerts) rows.push(['Alert', item.title, item.subtitle])
	for (const item of linked.catalysts) rows.push(['Catalyst', h(Link, { href: item.href, className: 'text-sky-300 transition hover:text-sky-200' }, item.title), item.subtitle])
	return rows.length !== 0 ? rows : [['Intelligence', 'No linked items', 'No linked intelligence is available']]
}

export default async function DashboardPage(props: any = {}) {
	const params = props.searchParams ? await props.searchParams : {}
	const requested = typeof params.asset === 'string' ? params.asset.toUpperCase() : undefined
	const payload = await getDashboard()
	const active = selectedAsset(payload, requested)
	const metrics = [
		{ label: 'Lead asset', value: active ? active.symbol : '-', note: active ? active.stance + ' / ' + String(Math.round(active.confidence * 100)) + '% confidence' : 'No live tape attached' },
		{ label: 'Expected 5d move', value: active ? showPercent(active.expectedMove5dPct) : '-', note: active ? active.subtitle : 'Model-derived edge is unavailable' },
		{ label: 'Key catalyst', value: payload.keyCatalyst.status, note: payload.keyCatalyst.title },
		{ label: 'Refresh', value: payload.utility.activeSession, note: payload.utility.refreshedAt.replace('T', ' ').slice(0, 16) },
	]
	const scenarioRows: ReactNode[][] = active ? active.scenarioBuckets.map(function (item) { return [item.label, String(Math.round(item.probability * 100)) + '%', item.description] }) : [['No asset', '-', 'No live asset was selected']]
	const catalystRows: ReactNode[][] = [
		['Status', payload.keyCatalyst.status, payload.keyCatalyst.countdownLabel],
		['Market', payload.keyCatalyst.country + ' / ' + payload.keyCatalyst.currency, payload.keyCatalyst.impact + ' impact'],
		['Threshold', payload.keyCatalyst.threshold, payload.keyCatalyst.relatedAssets.join(', ') || 'No mapped assets'],
		['Sensitivity', payload.keyCatalyst.sensitivity, payload.keyCatalyst.whyItMatters],
	]
	const consensusRows: ReactNode[][] = payload.marketConsensus.assets.length !== 0 ? payload.marketConsensus.assets.map(function (item) { return [item.symbol, item.direction, item.score.toFixed(1), String(Math.round(item.confidence * 100)) + '%', showPercent(item.change30dPct), item.note] }) : [['No assets', '-', '-', '-', '-', 'Consensus could not be computed']]
	return h(PageShell, { title: 'Dashboard', subtitle: 'Real market tape, honest catalyst state, regime context, and linked operator workflows.', active: 'dashboard' }, h('div', { className: 'space-y-5' }, [
		h(MetricGrid, { key: 'metrics', items: metrics }),
		h(Panel, { key: 'edge', title: 'Today edge', subtitle: payload.hero.modelNote }, active ? h('div', { className: 'space-y-4' }, [
			h('div', { key: 'tabs' }, assetTabs(payload, active.symbol)),
			h('div', { key: 'hero', className: 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]' }, [
				h('div', { key: 'copy', className: 'space-y-4' }, [
					freshnessBadges(active.freshness),
					h('div', { key: 'title', className: 'text-2xl font-semibold tracking-tight text-white' }, active.title + ' / ' + active.price),
					h('p', { key: 'subtitle', className: 'max-w-3xl text-sm leading-7 text-slate-400' }, active.regimeContext),
					h('div', { key: 'kpis', className: 'ws-kpi-inline' }, [
						h('div', { key: 'move', className: 'ws-kpi' }, [h('div', { key: 'label', className: 'text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500' }, '1d'), h('div', { key: 'value', className: 'mt-2 font-mono text-xl text-white' }, showPercent(active.change1dPct)), h('div', { key: 'note', className: 'mt-2 text-xs text-slate-400' }, 'Source-derived')]),
						h('div', { key: 'month', className: 'ws-kpi' }, [h('div', { key: 'label', className: 'text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500' }, '30d'), h('div', { key: 'value', className: 'mt-2 font-mono text-xl text-white' }, showPercent(active.change30dPct)), h('div', { key: 'note', className: 'mt-2 text-xs text-slate-400' }, 'Source-derived')]),
						h('div', { key: 'edge', className: 'ws-kpi' }, [h('div', { key: 'label', className: 'text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500' }, 'Expected 5d'), h('div', { key: 'value', className: 'mt-2 font-mono text-xl text-white' }, showPercent(active.expectedMove5dPct)), h('div', { key: 'note', className: 'mt-2 text-xs text-slate-400' }, 'Model-derived')]),
						h('div', { key: 'stance', className: 'ws-kpi' }, [h('div', { key: 'label', className: 'text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500' }, 'Stance'), h('div', { key: 'value', className: 'mt-2 text-base font-semibold text-white' }, active.stance + ' / ' + active.skew), h('div', { key: 'note', className: 'mt-2 text-xs text-slate-400' }, String(Math.round(active.confidence * 100)) + '% confidence')]),
					]),
				]),
				h('div', { key: 'rail', className: 'grid gap-3' }, [
					h('div', { key: 'source', className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500' }, 'Source-derived'), h('div', { key: 'body', className: 'mt-2 grid gap-2 text-sm text-slate-300' }, active.sourceFacts.map(function (item) { return h('div', { key: item }, item) }))]),
					h('div', { key: 'model', className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500' }, 'Model-derived'), h('div', { key: 'body', className: 'mt-2 grid gap-2 text-sm text-slate-300' }, active.modelFacts.map(function (item) { return h('div', { key: item }, item) }))]),
					h('div', { key: 'path', className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500' }, 'Recent path'), h('div', { key: 'body', className: 'mt-3' }, sparkline(active.sparkline)), h('p', { key: 'note', className: 'mt-3 text-sm leading-6 text-slate-400' }, active.freshness.note)]),
				]),
			]),
		]) : h('div', { className: 'text-sm text-slate-500' }, 'No live market assets are currently available.')), 
		h('div', { key: 'grid', className: 'ws-two-panel' }, [
			h('div', { key: 'left', className: 'space-y-5' }, [
				h(Panel, { key: 'scenario', title: 'Scenario distribution', subtitle: payload.hero.sourceNote }, h(DataTable, { headers: ['Bucket', 'Probability', 'Interpretation'], rows: scenarioRows, dense: true })),
				h(Panel, { key: 'catalyst', title: 'Key catalyst', subtitle: 'Highest-priority catalyst with explicit fallback labeling when live calendar coverage is missing.' }, h('div', { className: 'space-y-4' }, [freshnessBadges(payload.keyCatalyst.freshness), h(DataTable, { headers: ['Field', 'Value', 'Context'], rows: catalystRows, dense: true }), h('div', { className: 'grid gap-2 text-sm text-slate-300' }, payload.keyCatalyst.context.map(function (item) { return h('div', { key: item }, item) })), h(Link, { href: payload.keyCatalyst.href, className: 'text-sm text-sky-300 transition hover:text-sky-200' }, 'Open catalyst detail')])),
				h(Panel, { key: 'consensus', title: 'Market consensus', subtitle: payload.marketConsensus.note }, h('div', { className: 'space-y-4' }, [freshnessBadges(payload.marketConsensus.freshness), h(DataTable, { headers: ['Asset', 'Direction', 'Score', 'Confidence', '30d', 'Read'], rows: consensusRows, dense: true, numericColumns: [2, 3, 4] }), h(Link, { href: payload.marketConsensus.href, className: 'text-sm text-sky-300 transition hover:text-sky-200' }, 'Open market bias')])),
		]),
			h('div', { key: 'right', className: 'space-y-5' }, [
				h(Panel, { key: 'risk', title: 'Risk regime', subtitle: 'Real risk backdrop derived from cross-asset market inputs.' }, regimeSummary(payload.riskRegime, '/app/regime-monitor', 'Open liquidity regime')),
				h(Panel, { key: 'liquidity', title: 'Liquidity regime', subtitle: 'Funding and policy overlay tied back to the current tape.' }, regimeSummary(payload.liquidityRegime, '/app/regime-monitor', 'Open regime monitor')),
				h(Panel, { key: 'track', title: 'AI / model track record', subtitle: payload.trackRecord.note }, h('div', { className: 'space-y-4' }, [freshnessBadges(payload.trackRecord.freshness), h(DataTable, { headers: ['Signal', 'Expected', 'Realized', 'Linked catalyst'], rows: trackRows(payload.trackRecord.records), dense: true, numericColumns: [1, 2] })])),
				h(Panel, { key: 'providers', title: 'Provider state', subtitle: 'Dashboard freshness is explicit by block and provider.' }, h(DataTable, { headers: ['Provider', 'Status', 'Detail'], rows: providerRows(payload.utility.providers), dense: true })),
		]),
		]),
		h(Panel, { key: 'intel', title: 'Linked intelligence', subtitle: 'Official headlines plus internal watchlists, alerts, and catalyst paths.' }, h(DataTable, { headers: ['Type', 'Headline', 'Context'], rows: intelligenceRows(payload.linkedIntelligence), dense: true })),
	]))
}
