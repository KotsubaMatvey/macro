import { createElement as h } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const api = vi.hoisted(function () {
 return { getEventDetail: vi.fn(), getWorkstation: vi.fn() }
})

vi.mock("@/lib/server/api", function () {
 return { getEventDetail: api.getEventDetail, getWorkstation: api.getWorkstation }
})

vi.mock("@/components/app/chrome", function () {
 return {
 PageShell: function PageShell(props: any) { return h("div", {}, [h("h1", { key: "title" }, props.title), h("div", { key: "body" }, props.children)]) },
 Panel: function Panel(props: any) { return h("section", {}, [h("h2", { key: "title" }, props.title), h("div", { key: "body" }, props.children)]) },
 MetricGrid: function MetricGrid() { return h("div", {}, "metrics") },
 DataTable: function DataTable() { return h("div", {}, "table") },
 EventLink: function EventLink(props: any) { return h("a", {}, props.title) },
 Badge: function Badge(props: any) { return h("span", {}, props.children) },
 }
})

import DashboardPage from "@/app/app/dashboard/page"

describe("DashboardPage", function () {
 it("renders the stronger catalyst workflow panels", async function () {
 api.getWorkstation.mockResolvedValue({
 metrics: [{ label: "Regime", value: "Expansionary", note: "Stable" }],
 regime: { label: "Expansionary", trend: "Stable", interpretation: "Backdrop supports risk taking.", confidence: 0.7, score: 0.61 },
 biases: [{ symbol: "BTC", direction: "Bullish", score: 62, confidence: 0.71, rationale: ["Liquidity"] }],
 nextEvents: [{ id: "event-cpi-mar", slug: "us-cpi-mar", title: "US CPI March", country: "United States", impact: "High", status: "Upcoming", scheduledAt: "2026-04-10T12:30:00+00:00", forecast: 2.9, previous: 3.1, actual: null, whyItMatters: "Inflation surprise reprices rates.", relatedAssets: ["BTC"] }],
 })
 api.getEventDetail.mockResolvedValue({
 id: "event-cpi-mar",
 historicalReactions: [{ window: "5m", avgMovePct: 0.22, consistency: 0.73, narrative: "Rates reaction leads BTC" }],
 linkedBriefings: [{ id: "brief-1" }],
 linkedNews: [{ id: "news-1" }],
 whyItMatters: "Inflation surprise reprices rates.",
 })
 const view = await DashboardPage()
 render(view)
 expect(screen.getByText("Dashboard")).toBeInTheDocument()
 expect(screen.getByText("Today edge")).toBeInTheDocument()
 expect(screen.getByText("Action paths")).toBeInTheDocument()
 expect(screen.getByText("Key catalyst")).toBeInTheDocument()
 })
})
