import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field, inputClass, submitClass } from "@/components/grovio/AuthLayout";
import { defaultSession, setOnboarded, setSession } from "@/lib/grovio-state";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your Grovio store account" },
      {
        name: "description",
        content:
          "Set up a Grovio store account in two minutes and start billing, tracking stock and understanding your grocery business.",
      },
      { property: "og:title", content: "Create your Grovio store account" },
      {
        property: "og:description",
        content: "Set up your grocery store on Grovio in about two minutes.",
      },
    ],
  }),
  component: Register,
});

const strengthOf = (v: string) => {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
};

function Register() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const strength = strengthOf(password);
  const labels = ["Too short", "Weak", "Fair", "Strong", "Excellent"];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setSession(defaultSession);
      setOnboarded(false);
      toast.success("Account created", { description: "Let's set your store up." });
      navigate({ to: "/onboarding" });
    }, 800);
  };

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Set up your store"
      subtitle="Two minutes now saves an hour every week at the counter."
      footer={
        <>
          Already running Grovio?{" "}
          <Link to="/sign-in" className="font-semibold text-primary underline decoration-sprout decoration-2 underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Owner name">
          <input className={inputClass} placeholder="Ramesh Sharma" required />
        </Field>
        <Field label="Store name">
          <input className={inputClass} placeholder="Sharma Provision Store" required />
        </Field>
        <Field label="Mobile number">
          <input className={inputClass} placeholder="+91 98110 00000" required />
        </Field>
        <Field label="Work email">
          <input className={inputClass} type="email" placeholder="you@yourstore.in" required />
        </Field>
        <Field label="Create password">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </Field>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < strength ? (strength >= 3 ? "bg-sprout" : "bg-saffron") : "bg-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">{labels[strength]}</span>
        </div>

        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" required className="mt-0.5 h-4 w-4 accent-[oklch(0.34_0.068_157)]" />
          I agree to Grovio's terms and understand my store data stays private to my account.
        </label>

        <button className={submitClass} disabled={busy}>
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Creating your store…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Check className="h-4 w-4 text-sprout" /> Create store account
            </span>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
