import { createFileRoute, redirect } from "@tanstack/react-router";

/** The notification centre became Pulse, a live activity feed. */
export const Route = createFileRoute("/notifications")({
  beforeLoad: () => {
    throw redirect({ to: "/pulse", replace: true });
  },
});
