import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { CommunityPost } from "@macroaccess/types"

import { DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getWorkstation } from "@/lib/server/api"

export default async function CommunityPage() {
 const payload = await getWorkstation()
 const likes = payload.posts.reduce(function (total: number, item: CommunityPost) { return total + item.likes }, 0)
 const comments = payload.posts.reduce(function (total: number, item: CommunityPost) { return total + item.comments }, 0)
 const desks = Array.from(new Set(payload.posts.map(function (item: CommunityPost) { return item.authorRole })))
 const metrics = [
 { label: "Posts", value: String(payload.posts.length), note: "Open macro discussions on the desk right now" },
 { label: "Likes", value: String(likes), note: "Peer endorsement across the current discussion stack" },
 { label: "Comments", value: String(comments), note: "Replies already attached to active posts" },
 { label: "Desk roles", value: String(desks.length), note: "Mix of participant roles visible in the feed" },
 ]
 const rows: ReactNode[][] = payload.posts.map(function (item: CommunityPost) {
 return [item.title, item.authorName, item.authorRole, String(item.likes), String(item.comments)]
 })
 return h(PageShell, { title: "Community", subtitle: "Professional discussion with desk notes, engagement context, and moderation-ready visibility.", active: "community" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "board", title: "Desk conversation", subtitle: "Keep the tone closer to a research board than a generic social feed." }, h("p", { className: "text-sm leading-6 text-slate-400" }, "Posts should add context to catalysts, bias, regime, or execution setup. Lightweight engagement exists, but the note itself stays central.")),
 h("div", { key: "grid", className: "ws-two-panel" }, [
 h(Panel, { key: "feed", title: "Discussion feed", subtitle: "Compact view of the active conversation stack." }, h(DataTable, { headers: ["Title", "Author", "Role", "Likes", "Comments"], rows, dense: true })),
 h(Panel, { key: "cards", title: "Desk notes", subtitle: "Recent posts rendered as compact research cards." }, h("div", { className: "grid gap-3" }, payload.posts.slice(0, 6).map(function (item: CommunityPost) { return h("div", { key: item.id, className: "ws-feed-card" }, [h("div", { key: "meta", className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500" }, item.authorName + " / " + item.authorRole), h("div", { key: "title", className: "mt-2 text-sm font-medium text-white" }, item.title), h("p", { key: "body", className: "mt-2 text-sm leading-6 text-slate-400" }, item.body)]) }))),
 ]),
 ]))
}
