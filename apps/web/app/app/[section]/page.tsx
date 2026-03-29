import Link from "next/link";
import { notFound } from "next/navigation";
import { alerts, biases, briefings, events, impactWindows, news, optionsFlow, posts, regime, sections, watchlists } from "@/lib/demo";
import { Badge, MetricGrid, Panel, Shell, Table } from "@/components/workstation";

export default function SectionPage({ params }: { params: { section: string } }) {
  const section = sections.find((item) => item.slug === params.section);
  if (!section) notFound();

  const sectionSlug = params.section;

  return (
    <Shell title={section.title} subtitle={section.description}>
      <div className="mb-5 flex gap-2">
        <Badge accent>Desktop-first</Badge>
        <Badge>Data-first panels</Badge>
        <Badge>Demo dataset seeded</Badge>
      </div>
      {sectionSlug === "dashboard" && (
        <div className="space-y-5">
          <MetricGrid items={[
            { label: "Regime", value: regime.label, note: regime.trend },
            { label: "Bias breadth", value: "63 / 100", note: "+4 vs 24h" },
            { label: "High-impact next 24h", value: "6", note: "2 live windows" },
            { label: "Active alerts", value: String(alerts.length), note: "1 triggered" },
          ]} />
          <Panel title="Upcoming events">
            <Table headers={["Event","Country","Impact","Forecast","Actual","Status"]} rows={events.map((event) => [event.title,event.country,event.impact,String(event.forecast ?? "-"),String(event.actual ?? "-"),event.status])} />
          </Panel>
        </div>
      )}
      {sectionSlug === "market-bias" && <Panel title="Bias breakdown"><Table headers={["Asset","State","Score","24h","7d","Confidence"]} rows={biases.map((item) => [item.asset,item.state,String(item.score),`${item.dayChange}`,`${item.weekChange}`,`${Math.round(item.confidence * 100)}%`])} /></Panel>}
      {sectionSlug === "regime-monitor" && <Panel title="Regime components"><Table headers={["Dimension","Score"]} rows={regime.components.map((component) => [component.key,component.value.toFixed(2)])} /></Panel>}
      {(sectionSlug === "macro-calendar" || sectionSlug === "event-explorer") && <div className="space-y-5"><Panel title="Macro events"><Table headers={["Title","Category","Country","Forecast","Actual","Surprise"]} rows={events.map((event) => [event.title,event.category,event.country,String(event.forecast ?? "-"),String(event.actual ?? "-"),String(event.surprise ?? "-")])} /></Panel><div className="text-sm text-slate-500">Open example detail page: <Link href="/app/events/us-cpi-mar" className="text-amber-300">US CPI YoY</Link></div></div>}
      {sectionSlug === "advanced-charts" && <Panel title="Advanced charts"><div className="h-72 rounded-md border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-4"><div className="flex h-full items-end gap-2">{[24,32,20,48,54,49,68,63,72,70,84,88].map((value,index) => <div key={index} className="flex-1 rounded-t bg-amber-500/80" style={{ height: `${value}%` }} />)}</div></div></Panel>}
      {sectionSlug === "briefings" && <Panel title="Briefings">{briefings.map((item) => <div key={item.id} className="mb-3 rounded-md border border-white/10 p-4"><div className="font-medium text-white">{item.title}</div><div className="mt-1 text-slate-500">{item.type} · {item.author}</div><div className="mt-2 text-slate-300">{item.summary}</div></div>)}</Panel>}
      {sectionSlug === "news" && <Panel title="News feed">{news.map((item) => <div key={item.id} className="mb-3 rounded-md border border-white/10 p-4"><div className="font-medium text-white">{item.title}</div><div className="mt-1 text-slate-500">{item.source} · {item.sentiment}</div><div className="mt-2 text-slate-300">{item.summary}</div></div>)}</Panel>}
      {sectionSlug === "impact-lab" && <Panel title="Historical impact windows"><Table headers={["Window","Average move","Consistency"]} rows={impactWindows.map((item) => [item.window,`${item.avg}%`,`${Math.round(item.consistency * 100)}%`])} /></Panel>}
      {sectionSlug === "options-flow" && <Panel title="Options flow"><Table headers={["Symbol","Side","Premium","Strike","Expiry","Sentiment"]} rows={optionsFlow.map((item) => [item.symbol,item.side,item.premium,item.strike,item.expiry,item.sentiment])} /></Panel>}
      {sectionSlug === "watchlists" && <Panel title="Watchlists"><Table headers={["Name","Items","Alerts"]} rows={watchlists.map((item) => [item.name,item.items.join(", "),String(item.alerts)])} /></Panel>}
      {sectionSlug === "alerts" && <Panel title="Alert center"><Table headers={["Alert","Channel","Status"]} rows={alerts.map((item) => [item.label,item.channel,item.status])} /></Panel>}
      {sectionSlug === "community" && <Panel title="Trending discussions">{posts.map((item) => <div key={item.id} className="mb-3 rounded-md border border-white/10 p-4"><div className="font-medium text-white">{item.title}</div><div className="mt-1 text-slate-500">{item.author} · {item.role} · {item.likes} likes</div><div className="mt-2 text-slate-300">{item.body}</div></div>)}</Panel>}
      {sectionSlug === "settings" && <Panel title="User settings"><div className="grid gap-3 text-sm md:grid-cols-2">{["Profile","Email and password","Notifications","Timezone and region","Density","Saved filters"].map((item) => <div key={item} className="rounded-md border border-white/10 p-4 text-slate-300">{item}</div>)}</div></Panel>}
      {sectionSlug === "billing" && <Panel title="Billing"><div className="grid gap-4 md:grid-cols-3">{[{ name: "Free", price: "$0" }, { name: "Pro", price: "$49" }, { name: "Team", price: "$199" }].map((plan) => <div key={plan.name} className="rounded-md border border-white/10 p-4"><div className="text-lg font-medium text-white">{plan.name}</div><div className="mt-2 text-2xl text-amber-300">{plan.price}</div></div>)}</div></Panel>}
      {sectionSlug === "admin" && <Panel title="Admin overview"><Table headers={["Metric","Value"]} rows={[["Users","1284"],["Analysts","7"],["Events queued","42"],["Alerts sent","318"]]} /></Panel>}
    </Shell>
  );
}
