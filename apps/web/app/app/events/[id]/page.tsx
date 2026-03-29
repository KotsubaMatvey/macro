import { notFound } from "next/navigation";
import { events, impactWindows } from "@/lib/demo";
import { Badge, Panel, Shell, Table } from "@/components/workstation";

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const event = events.find((item) => item.id === params.id);
  if (!event) notFound();

  return (
    <Shell title={event.title} subtitle={event.whyItMatters}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <Panel title="Release profile">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-white/10 p-4 text-sm"><div className="text-slate-400">Forecast</div><div className="mt-2 font-mono text-xl text-white">{event.forecast ?? "-"}</div></div>
              <div className="rounded-md border border-white/10 p-4 text-sm"><div className="text-slate-400">Actual</div><div className="mt-2 font-mono text-xl text-white">{event.actual ?? "-"}</div></div>
              <div className="rounded-md border border-white/10 p-4 text-sm"><div className="text-slate-400">Surprise</div><div className="mt-2 font-mono text-xl text-white">{event.surprise ?? "-"}</div></div>
            </div>
          </Panel>
          <Panel title="Historical reaction summary">
            <Table headers={["Window","Average move","Consistency"]} rows={impactWindows.map((item) => [item.window,`${item.avg}%`,`${Math.round(item.consistency * 100)}%`])} />
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Metadata">
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between"><span className="text-slate-500">Country</span><span>{event.country}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Category</span><span>{event.category}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><Badge accent>{event.status}</Badge></div>
              <div className="flex justify-between"><span className="text-slate-500">Assets</span><span>{event.assets.join(", ")}</span></div>
            </div>
          </Panel>
          <Panel title="Why it matters">
            <p className="text-sm leading-7 text-slate-300">{event.whyItMatters}</p>
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
