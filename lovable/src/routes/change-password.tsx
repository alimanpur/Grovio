import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { PageHead, Panel } from "@/components/grovio/kit";
import { Field, inputClass, submitClass } from "@/components/grovio/AuthLayout";

export const Route = createFileRoute("/change-password")({
  head: () => ({
    meta: [
      { title: "Change password — Grovio security" },
      {
        name: "description",
        content: "Update your Grovio password and review the devices with an active session on your store.",
      },
      { property: "og:title", content: "Change password — Grovio" },
      { property: "og:description", content: "Update your password and review active sessions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChangePassword,
});

const sessions = [
  { device: "Counter PC — Chrome", place: "Shop, Karol Bagh", last: "Active now", current: true },
  { device: "Ramesh's phone — Android", place: "Karol Bagh", last: "2 hours ago", current: false },
  { device: "Manager tablet — iPad", place: "Back office", last: "Yesterday", current: false },
];

function ChangePassword() {
  return (
    <AppShell>
      <PageHead
        eyebrow="Security"
        title="Change password"
        question="Is my store account still protected?"
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel title="Update password" hint="You'll stay signed in on this device only.">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Password changed", {
                description: "Other devices were signed out for safety.",
              });
            }}
          >
            <Field label="Current password">
              <input className={inputClass} type="password" required />
            </Field>
            <Field label="New password">
              <input className={inputClass} type="password" required />
            </Field>
            <Field label="Confirm new password">
              <input className={inputClass} type="password" required />
            </Field>
            <button className={submitClass}>
              <span className="flex items-center justify-center gap-2">
                <KeyRound className="h-4 w-4 text-sprout" /> Update password
              </span>
            </button>
          </form>
        </Panel>

        <Panel title="Active sessions" hint="Anything unfamiliar here should be signed out immediately.">
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.device} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                  <Smartphone className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{s.device}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.place} · {s.last}
                  </span>
                </span>
                {s.current ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-sprout-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" /> This device
                  </span>
                ) : (
                  <button
                    onClick={() => toast.success(`${s.device} signed out`)}
                    className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold hover:border-destructive hover:text-destructive"
                  >
                    Sign out
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
