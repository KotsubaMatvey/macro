import { createElement as h } from "react"

import { DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getSession, getWorkstation } from "@/lib/server/api"

export default async function SettingsPage() {
 const user = await getSession()
 const payload = await getWorkstation()
 const metrics = [
 { label: "Role", value: user.role, note: "Current access tier on this workstation" },
 { label: "Feature flags", value: String(payload.featureFlags.length), note: "Enabled platform toggles visible to this session" },
 { label: "Watchlists", value: String(payload.watchlists.length), note: "Saved baskets tied to the current account" },
 { label: "Alerts", value: String(payload.alerts.length), note: "Trigger rules available in this environment" },
 ]
 const flagRows = payload.featureFlags.map(function (item: any) {
 return [item.key, item.enabled ? "Enabled" : "Disabled", item.description]
 })
 return h(PageShell, { title: "Settings", subtitle: "Account identity, active feature access, and environment state for the signed-in operator.", active: "settings" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-2" }, [
 h(Panel, { key: "profile", title: "Profile settings" }, h(DataTable, { headers: ["Field", "Value"], rows: [["Name", user.name], ["Email", user.email], ["Role", user.role], ["Email verified", user.emailVerified ? "Yes" : "No"], ["Onboarding", user.onboardingCompleted ? "Complete" : "Pending"]] })),
 h(Panel, { key: "flags", title: "Feature access" }, h(DataTable, { headers: ["Flag", "State", "Description"], rows: flagRows.length ? flagRows : [["No flags", "-", "No feature toggles returned"]] })),
 ]),
 ]))
}
