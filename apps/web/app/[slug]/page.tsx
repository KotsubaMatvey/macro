import Link from "next/link";
import { notFound } from "next/navigation";
import { marketingPages } from "@/lib/demo";
import { Badge, Panel } from "@/components/workstation";

export default function MarketingPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = marketingPages.find((item) => item.slug === params.slug);

  if (!page) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#090b0e] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400">
            Northstar Macro
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-white/10 px-3 py-2 text-sm"
          >
            Open app
          </Link>
        </div>
        <Panel title={page.title}>
          <Badge accent>{page.title}</Badge>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            {page.body}
          </p>
        </Panel>
      </div>
    </main>
  );
}
