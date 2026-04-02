import type {
  DashboardAssetView,
  DashboardLiquidityInput,
  DashboardLinkedItem,
  DashboardPayload,
  EventImpact,
  EventRelease,
} from "@macroaccess/types"

export type DashboardWindowMode = "48h" | "1w"
export type DashboardImpactFilter = "all" | Exclude<EventImpact, "-">

export interface DashboardRouteSearchParams {
  asset?: string | string[]
  impact?: string | string[]
  window?: string | string[]
}

export interface DashboardQueryState {
  asset?: string
  impact: DashboardImpactFilter
  window: DashboardWindowMode
}

export interface DashboardBiasCard {
  change30dPct: number
  confidence: number
  direction: DashboardAssetView["stance"]
  label: string
  note: string
  price: string
  symbol: string
}

export interface DashboardProviderSummary {
  fallback: number
  live: number
}

export interface DashboardViewModel {
  activeAsset?: DashboardAssetView
  alertLead?: DashboardLinkedItem
  biasCards: DashboardBiasCard[]
  briefingLead?: DashboardLinkedItem
  catalysts: EventRelease[]
  highVisible: number
  liquidityInputs: DashboardLiquidityInput[]
  marketAssets: DashboardAssetView[]
  marketFallback: number
  marketLive: number
  providers: DashboardProviderSummary
  state: DashboardQueryState
  trackValue: string
  upcomingVisible: number
  visibleCalendar: EventRelease[]
}

const BIAS_SLOTS = [
  { label: "Equities", symbols: ["SPX"] },
  { label: "Rates", symbols: ["US10Y", "US2Y"] },
  { label: "Dollar", symbols: ["DXY", "EURUSD"] },
  { label: "Alternatives", symbols: ["BTC", "XAU"] },
] as const

const MARKET_STRIP_ORDER = ["SPX", "US10Y", "DXY", "BTC", "XAU", "EURUSD", "US2Y"] as const

function parseTime(value?: string) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function readParam(value: unknown) {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ""
  if (typeof value === "string") return value
  return ""
}

export function canonicalImpact(value: string): EventImpact | "" {
  const normalized = value.trim().toLowerCase()
  if (normalized === "high") return "High"
  if (normalized === "medium" || normalized === "med") return "Medium"
  if (normalized === "low") return "Low"
  if (normalized === "-") return "-"
  return ""
}

export function compactImpactLabel(value: string) {
  const canonical = canonicalImpact(value)
  if (canonical === "Medium") return "Med"
  return canonical || value
}

export function normalizeWindow(value: string): DashboardWindowMode {
  return value === "1w" ? "1w" : "48h"
}

export function normalizeImpact(value: string): DashboardImpactFilter {
  const canonical = canonicalImpact(value)
  if (canonical === "High" || canonical === "Medium" || canonical === "Low") return canonical
  return "all"
}

export function buildDashboardState(params?: DashboardRouteSearchParams): DashboardQueryState {
  return {
    asset: readParam(params?.asset).toUpperCase() || undefined,
    impact: normalizeImpact(readParam(params?.impact)),
    window: normalizeWindow(readParam(params?.window)),
  }
}

export function dashboardHref(state: DashboardQueryState, overrides: Partial<DashboardQueryState>) {
  const next = { ...state, ...overrides }
  const params = new URLSearchParams()
  if (next.asset) params.set("asset", next.asset)
  if (next.window !== "48h") params.set("window", next.window)
  if (next.impact !== "all") params.set("impact", next.impact)
  const query = params.toString()
  return query ? "/app/dashboard?" + query : "/app/dashboard"
}

function currentAsset(payload: DashboardPayload, requested?: string) {
  const assets = payload.hero.assets
  if (requested) {
    const exact = assets.find(function (item) {
      return item.symbol === requested
    })
    if (exact) return exact
  }
  return assets[0]
}

function resolveBiasCards(payload: DashboardPayload): DashboardBiasCard[] {
  const consensusMap = new Map(
    payload.marketConsensus.assets.map(function (item) {
      return [item.symbol, item] as const
    }),
  )
  const assetMap = new Map(
    payload.hero.assets.map(function (item) {
      return [item.symbol, item] as const
    }),
  )

  return BIAS_SLOTS.reduce<DashboardBiasCard[]>(function (cards, slot) {
    const symbol = slot.symbols.find(function (candidate) {
      return consensusMap.has(candidate) || assetMap.has(candidate)
    })
    const consensus = symbol ? consensusMap.get(symbol) : payload.marketConsensus.assets[0]
    const asset = symbol
      ? assetMap.get(symbol)
      : payload.hero.assets.find(function (item) {
        return item.symbol === (consensus ? consensus.symbol : "")
      })

    if (!consensus && !asset) return cards

    cards.push({
      change30dPct: consensus ? consensus.change30dPct : asset ? asset.change30dPct : 0,
      confidence: Math.round((consensus ? consensus.confidence : asset ? asset.confidence : 0.5) * 100),
      direction: consensus ? consensus.direction : asset ? asset.stance : "Neutral",
      label: slot.label,
      note: asset ? asset.regimeContext : consensus ? consensus.note : "No desk note loaded",
      price: asset ? asset.price : "--",
      symbol: consensus ? consensus.symbol : asset ? asset.symbol : slot.label,
    })
    return cards
  }, [])
}

function fallbackLiquidityInputs(payload: DashboardPayload) {
  return payload.liquidityRegime.drivers.slice(0, 4).map(function (item, index) {
    return {
      detail: item,
      label: index === 0 ? "Balance sheet" : "Layer " + String(index + 1),
      tone: payload.liquidityRegime.label,
      value: "Derived",
    }
  })
}

function selectCatalysts(events: EventRelease[], reference: string, windowMode: DashboardWindowMode) {
  const now = parseTime(reference) ?? new Date()
  const lowerBound = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  const horizonHours = windowMode === "1w" ? 168 : 48
  const upperBound = new Date(now.getTime() + horizonHours * 60 * 60 * 1000)

  const activeWindow = events
    .filter(function (item) {
      const scheduled = parseTime(item.scheduledAt)
      if (!scheduled) return false
      if (scheduled < lowerBound || scheduled > upperBound) return false
      if (item.status === "Released" && scheduled < lowerBound) return false
      return true
    })
    .slice(0, 5)

  if (activeWindow.length !== 0) return activeWindow

  const unresolved = events
    .filter(function (item) {
      return item.status !== "Released"
    })
    .slice(0, 5)

  return unresolved.length !== 0 ? unresolved : events.slice(0, 5)
}

function filterCalendar(events: EventRelease[], impact: DashboardImpactFilter) {
  if (impact === "all") return events
  return events.filter(function (item) {
    return normalizeImpact(item.impact) === impact
  })
}

function sortEvents(events: EventRelease[]) {
  return events.slice().sort(function (left, right) {
    const leftTime = parseTime(left.scheduledAt)
    const rightTime = parseTime(right.scheduledAt)
    return (leftTime ? leftTime.getTime() : 0) - (rightTime ? rightTime.getTime() : 0)
  })
}

function providerCounts(payload: DashboardPayload): DashboardProviderSummary {
  const live = payload.utility.providers.filter(function (item) {
    return item.status === "live"
  }).length
  return {
    fallback: Math.max(0, payload.utility.providers.length - live),
    live,
  }
}

function orderedMarketAssets(payload: DashboardPayload) {
  const ordered: DashboardAssetView[] = []

  MARKET_STRIP_ORDER.forEach(function (symbol) {
    const item = payload.hero.assets.find(function (candidate) {
      return candidate.symbol === symbol
    })
    if (item) ordered.push(item)
  })

  payload.hero.assets.forEach(function (item) {
    const alreadyIncluded = ordered.some(function (candidate) {
      return candidate.symbol === item.symbol
    })
    if (!alreadyIncluded) ordered.push(item)
  })

  return ordered.slice(0, 7)
}

export function buildDashboardView(payload: DashboardPayload, events: EventRelease[], state: DashboardQueryState): DashboardViewModel {
  const orderedEvents = sortEvents(events)
  const visibleCalendar = filterCalendar(orderedEvents, state.impact).slice(0, 12)
  const catalysts = selectCatalysts(orderedEvents, payload.generatedAt, state.window)
  const activeAsset = currentAsset(payload, state.asset)
  const biasCards = resolveBiasCards(payload)
  const liquidityInputs = payload.liquidityInputs.length !== 0 ? payload.liquidityInputs : fallbackLiquidityInputs(payload)
  const providers = providerCounts(payload)
  const marketAssets = orderedMarketAssets(payload)
  const marketLive = marketAssets.filter(function (item) {
    return item.freshness.mode === "live"
  }).length
  const marketFallback = Math.max(0, marketAssets.length - marketLive)
  const highVisible = visibleCalendar.filter(function (item) {
    return canonicalImpact(item.impact) === "High"
  }).length
  const upcomingVisible = visibleCalendar.filter(function (item) {
    return item.status !== "Released"
  }).length
  const trackValue =
    payload.trackRecord.hitRate === undefined ? "Replay only" : String(Math.round(payload.trackRecord.hitRate * 100)) + "% hit"

  return {
    activeAsset,
    alertLead: payload.linkedIntelligence.alerts[0],
    biasCards,
    briefingLead: payload.linkedIntelligence.briefings[0],
    catalysts,
    highVisible,
    liquidityInputs,
    marketAssets,
    marketFallback,
    marketLive,
    providers,
    state,
    trackValue,
    upcomingVisible,
    visibleCalendar,
  }
}

