import Link from "next/link";
import type { ReactNode } from "react";
import { alerts, brand, sections } from "@/lib/demo";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Badge({
  children,
  accent = false,
}: {
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]",
        accent
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-white/10 bg-white/[0.03] text-slate-300",
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-white/10 bg-[#11151a] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      {children}
    </section>
  );
}

export function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#090b0e] text-slate-100">
      <div className="grid min-h-screen xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r border-white/10 bg-[#0f1317] px-4 py-5">
          <div className="mb-6 border-b border-white/10 pb-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-amber-400">
              Macro Intelligence
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">{brand}</div>
          </div>
          <nav className="grid gap-1">
            {sections.map((item) => (
              <Link
                key={item.slug}
                href={`/app/${item.slug}`}
                className="rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="px-5 py-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#11151a] px-4 py-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge accent>Demo mode</Badge>
              <Badge>Provider-ready</Badge>
              <Badge>{alerts.length} active alerts</Badge>
            </div>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

export function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: string; note: string }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/10 bg-[#11151a] p-4"
        >
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            {item.label}
          </div>
          <div className="mt-3 font-mono text-3xl text-white">{item.value}</div>
          <div className="mt-2 text-sm text-slate-400">{item.note}</div>
        </div>
      ))}
    </div>
  );
}

export function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="border-b border-white/10 px-3 py-3 text-[11px] uppercase tracking-[0.16em] text-slate-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${index}-${cellIndex}`}
                  className="border-b border-white/5 px-3 py-3 text-slate-200"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
