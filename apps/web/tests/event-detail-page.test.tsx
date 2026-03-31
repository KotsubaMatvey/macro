import { createElement as h } from "react"
import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const api = vi.hoisted(function () {
 return { getEventDetail: vi.fn(), getEvents: vi.fn(), getWorkstation: vi.fn() }
})

vi.mock("@/lib/server/api", function () {
 return { getEventDetail: api.getEventDetail, getEvents: api.getEvents, getWorkstation: api.getWorkstation }
})

vi.mock("@/components/app/chrome", function () {
 return {
 PageShell: function PageShell(props: { title: string; children?: ReactNode }) { return h("div", {}, [h("h1", { key: "title" }, props.title), h("div", { key: "body" }, props.children)]) },
 Panel: function Panel(props: { title: string; children?: ReactNode }) { return h("section", {}, [h("h2", { key: "title" }, props.title), h("div", { key: "body" }, props.children)]) },
 MetricGrid: function MetricGrid() { return h("div", {}, "metrics") },
 DataTable: function DataTable() { return h("div", {}, "table") },
 KeyValueList: function KeyValueList() { return h("div", {}, "meta") },
 EventLink: function EventLink(props: { title: string }) { return h("a", {}, props.title) },
 Badge: function Badge(props: { children?: ReactNode }) { return h("span", {}, props.children) },
 }
})

import EventDetailPage from "@/app/app/events/[eventId]/page"

describe("EventDetailPage", function () {
 it("renders dynamic event payload fields", async function () {
 api.getEventDetail.mockResolvedValue({ id: "event-cpi-mar", title: "US CPI March", family: "US CPI", category: "Inflation", country: "United States", currency: "USD", impact: "High", status: "Released", scheduledAt: "2026-04-10T12:30:00+00:00", previous: 3.1, forecast: 2.9, actual: 2.8, surprise: -3.4, whyItMatters: "Inflation surprise reprices rates.", relatedAssets: ["SPX"], historicalReactions: [{ window: "5m", avgMovePct: 0.2, consistency: 0.7, narrative: "Initial rates reaction" }], linkedBriefings: [], linkedNews: [] })
 api.getEvents.mockResolvedValue([{ id: "event-cpi-feb", slug: "us-cpi-feb", title: "US CPI February", family: "US CPI", country: "United States", currency: "USD", impact: "High", category: "Inflation", status: "Released", scheduledAt: "2026-03-10T12:30:00+00:00", relatedAssets: ["SPX"] }])
 api.getWorkstation.mockResolvedValue({ regime: { label: "Constructive", interpretation: "Risk backdrop remains contained." }, biases: [{ symbol: "SPX", direction: "Bullish", score: 62, confidence: 0.71, rationale: ["Rates easing"] }], briefings: [], news: [] })
 const view = await EventDetailPage({ params: { eventId: "event-cpi-mar" } })
 render(view)
 expect(screen.getByText("US CPI March")).toBeInTheDocument()
 expect(screen.getByText("Archive selector")).toBeInTheDocument()
 expect(screen.getByText("Bias context")).toBeInTheDocument()
 })
})
