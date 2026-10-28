import { createFileRoute, redirect } from "@tanstack/react-router";

/** The old Dashboard is now the Today workspace. */
export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/today", replace: true });
  },
});
