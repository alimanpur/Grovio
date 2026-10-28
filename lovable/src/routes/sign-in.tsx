import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field, inputClass, submitClass } from "@/components/grovio/AuthLayout";
import { defaultSession, isOnboarded, setSession, type Role } from "@/lib/grovio-state";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in to Grovio — Retail OS for grocery stores" },
      {
        name: "description",
        content:
          "Sign in to Grovio to run billing, inventory, purchases, customers and reports for your grocery store.",
      },
      { property: "og:title", content: "Sign in to Grovio" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "One workspace for billing, stock, suppliers and business insight.",
      },
    ],
  }),
  component: SignIn,
});

const roles: { role: Role; blurb: string }[] = [
  { role: "Owner", blurb: "Full access, money and reports" },
  { role: "Manager", blurb: "Stock, purchases, staff" },
  { role: "Cashier", blurb: "Billing counter only" },
];

function SignIn() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("Owner");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setSession({ ...defaultSession, role });
      toast.success(`Signed in as ${role}`, { description: "Secure session started." });
      navigate({ to: isOnboarded() ? "/today" : "/onboarding" });
    }, 700);
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Open your counter"
      subtitle="Sign in to Sharma Provision Store. Sessions stay secure and expire after 12 hours of inactivity."
      footer={
        <>
          New to Grovio?{" "}
          <Link
            to="/register"
            className="font-semibold text-primary underline decoration-sprout decoration-2 underline-offset-4"
          >
            Create a store account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Work email or phone">
          <input
            className={inputClass}
            defaultValue="ramesh@sharmaprovision.in"
            placeholder="you@yourstore.in"
            required
          />
        </Field>

        <Field
          label="Password"
          hint={
            <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          }
        >
          <span className="relative block">
            <input
              className={inputClass}
              type={showPassword ? "text" : "password"}
              defaultValue="grovio-demo"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </Field>

        <div>
          <p className="text-xs font-semibold text-ink-soft">Sign in as</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {roles.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => setRole(r.role)}
                className={`ring-focus rounded-lg border p-2.5 text-left transition-all ${
                  role === r.role
                    ? "border-sprout bg-accent shadow-lift"
                    : "border-border bg-surface hover:border-sprout/60"
                }`}
              >
                <span className="block text-sm font-semibold">{r.role}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {r.blurb}
                </span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            defaultChecked
            className="h-4 w-4 accent-[oklch(0.34_0.068_157)]"
          />
          Remember this device for 30 days
        </label>

        <button className={submitClass} disabled={busy}>
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Opening workspace…
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
