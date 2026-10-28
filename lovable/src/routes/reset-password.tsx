import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout, Field, inputClass, submitClass } from "@/components/grovio/AuthLayout";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new Grovio password" },
      {
        name: "description",
        content: "Choose a new password for your Grovio store account and sign back in securely.",
      },
      { property: "og:title", content: "Set a new Grovio password" },
      { property: "og:description", content: "Choose a new password and return to your counter." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const match = a.length >= 8 && a === b;

  return (
    <AuthLayout
      eyebrow="Secure link verified"
      title="Set a new password"
      subtitle="Choose something you'll remember at a busy counter — but not your shop's phone number."
      footer={
        <Link to="/sign-in" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          toast.success("Password updated", { description: "Sign in with your new password." });
          navigate({ to: "/sign-in" });
        }}
      >
        <Field label="New password">
          <input
            className={inputClass}
            type="password"
            value={a}
            onChange={(e) => setA(e.target.value)}
            required
          />
        </Field>
        <Field label="Confirm new password">
          <input
            className={inputClass}
            type="password"
            value={b}
            onChange={(e) => setB(e.target.value)}
            required
          />
        </Field>
        <p className={`flex items-center gap-2 text-xs ${match ? "text-sprout-foreground" : "text-muted-foreground"}`}>
          <ShieldCheck className="h-4 w-4" />
          {match ? "Passwords match and meet the minimum length." : "Minimum 8 characters, both fields must match."}
        </p>
        <button className={submitClass} disabled={!match}>
          Update password
        </button>
      </form>
    </AuthLayout>
  );
}
