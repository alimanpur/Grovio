import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthLayout, Field, inputClass, submitClass } from "@/components/grovio/AuthLayout";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your Grovio password" },
      {
        name: "description",
        content: "Send a secure reset link to the email or mobile number registered to your Grovio store.",
      },
      { property: "og:title", content: "Reset your Grovio password" },
      { property: "og:description", content: "Get back into your store workspace securely." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [sent, setSent] = useState(false);

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title={sent ? "Check your inbox" : "Forgot your password?"}
      subtitle={
        sent
          ? "We sent a secure reset link. It expires in 30 minutes and can only be used once."
          : "Enter the email registered to your store. We'll send a one-time reset link."
      }
      footer={
        <Link to="/sign-in" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="animate-pop panel flex gap-3 p-4">
          <MailCheck className="h-5 w-5 shrink-0 text-sprout" />
          <div>
            <p className="text-sm font-semibold">Link sent to ramesh@sharmaprovision.in</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Didn't get it? Check spam, or{" "}
              <button onClick={() => setSent(false)} className="font-semibold text-primary hover:underline">
                try another address
              </button>
              .
            </p>
            <Link to="/reset-password" className="mt-3 inline-block text-xs font-semibold text-primary underline decoration-sprout decoration-2 underline-offset-4">
              Open the reset screen
            </Link>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <Field label="Registered email">
            <input className={inputClass} type="email" placeholder="you@yourstore.in" required />
          </Field>
          <button className={submitClass}>Send reset link</button>
        </form>
      )}
    </AuthLayout>
  );
}
