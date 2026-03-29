"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Panel } from "@/components/workstation";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleSignIn() {
    setLoading(true);
    document.cookie = "nsm_session=demo-user; path=/";
    router.push("/app/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b0e] px-6 py-8">
      <Panel title="Sign in" className="w-full max-w-md">
        <Badge accent>Demo credentials available</Badge>
        <div className="mt-6 space-y-4">
          <button
            onClick={handleSignIn}
            className="w-full rounded-md bg-amber-500 px-4 py-3 text-sm font-medium text-black"
          >
            {loading ? "Opening..." : "Sign in to demo"}
          </button>
        </div>
        <div className="mt-4 flex justify-between text-sm text-slate-500">
          <Link href="/sign-up">Create account</Link>
          <Link href="/reset-password">Reset password</Link>
        </div>
      </Panel>
    </main>
  );
}
