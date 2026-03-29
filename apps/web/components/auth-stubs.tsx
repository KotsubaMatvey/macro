import { Badge, Panel } from "@/components/workstation";

export function SignUpStub() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b0e] px-6 py-8">
      <Panel title="Create account" className="w-full max-w-lg">
        <Badge>Onboarding scaffolded</Badge>
      </Panel>
    </main>
  );
}

export function ResetStub() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b0e] px-6 py-8">
      <Panel title="Reset password" className="w-full max-w-md">
        <button className="w-full rounded-md bg-amber-500 px-4 py-3 text-sm font-medium text-black">
          Send reset link
        </button>
      </Panel>
    </main>
  );
}

export function VerifyStub() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b0e] px-6 py-8">
      <Panel title="Verify email" className="w-full max-w-md">
        <Badge accent>Verification flow</Badge>
      </Panel>
    </main>
  );
}

export function OnboardingStub() {
  return (
    <main className="min-h-screen bg-[#090b0e] px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <Panel title="Onboarding">
          <div className="grid gap-4 md:grid-cols-2">
            {["Assets", "Regions", "Event interests", "Alert channels"].map((item) => (
              <div key={item} className="rounded-md border border-white/10 p-4">
                <div className="text-sm font-medium text-white">{item}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}
