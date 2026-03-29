import Link from "next/link";
import { Badge, Panel } from "@/components/workstation";
import {
  biases,
  briefings,
  events,
  marketingPages,
  optionsFlow,
  regime,
} from "@/lib/demo";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090b0e] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-12">
        <header className="grid gap-6 border-b border-white/10 pb-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="max-w-4xl">
            <Badge accent>Macro intelligence workstation</Badge>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">
              Track macro events. Read the regime. Trade the reaction.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-400">
              Northstar Macro is a serious macro terminal for event-driven traders.
              It combines regime analysis, market bias, macro calendar, reaction history,
              charts, briefings, watchlists, alerts, options flow, and community in one
              dense workstation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="rounded-md bg-amber-500 px-4 py-3 text-sm font-medium text-black"
              >
                Open demo workstation
              </Link>
              <Link
                href="/pricing"
                className="rounded-md border border-white/10 px-4 py-3 text-sm text-slate-200"
              >
                View pricing
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <Panel title="Regime monitor">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Current regime</span>
                  <span className="font-mono text-lg text-white">{regime.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Confidence</span>
                  <span className="font-mono text-white">
                    {Math.round(regime.confidence * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{ width: `${regime.confidence * 100}%` }}
                  />
                </div>
              </div>
            </Panel>
          </div>
        </header>
      </div>
    </main>
  );
}
