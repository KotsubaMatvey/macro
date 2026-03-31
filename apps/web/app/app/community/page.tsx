import { createElement as h } from "react"

import { DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getWorkstation } from "@/lib/server/api"

export default async function CommunityPage() {
 const payload = await getWorkstation()
 const likes = payload.posts.reduce(function (total: number, item: any) { return total + item.likes }, 0)
 const comments = payload.posts.reduce(function (total: number, item: any) { return total + item.comments }, 0)
 const desks = Array.from(new Set(payload.posts.map(function (item: any) { return item.authorRole })))
 const metrics = [
 { label: "Posts", value: String(payload.posts.length), note: "Open macro discussions on the desk right now" },
 { label: "Likes", value: String(likes), note: "Peer endorsement across the current discussion stack" },
 { label: "Comments", value: String(comments), note: "Replies already attached to active posts" },
 { label: "Desk roles", value: String(desks.length), note: "Mix of participant roles visible in the feed" },
 ]
 const rows = payload.posts.map(function (item: any) {
 return [item.title, item.authorName, item.authorRole, String(item.likes), String(item.comments)]
 })
 return h(PageShell, { title: "Community", subtitle: "Professional macro discussion with desk notes, engagement context, and moderation-ready visibility.", active: "community" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-2" }, [
 h(Panel, { key: "feed", title: "Discussion feed" }, h(DataTable, { headers: ["Title", "Author", "Role", "Likes", "Comments"], rows })),
 h(Panel, { key: "cards", title: "Desk notes" }, h("div", { className: "grid gap-3" }, payload.posts.slice(0, 6).map(function (item: any) {
 return h("div", { key: item.id, className: "rounded-xl border border-white/8 p-4 text-sm text-slate-300" }, [
 h("div", { key: "title", className: "text-lg font-medium text-white" }, item.title),
 h("div", { key: "meta", className: "mt-1 text-xs uppercase tracking-[0.14em] text-slate-500" }, item.authorName + " / " + item.authorRole),
 h("p", { key: "body", className: "mt-3 leading-7 text-slate-400" }, item.body),
 ])
 }))),
 ]),
 ]))
}
