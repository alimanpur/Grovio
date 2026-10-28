import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, FileScan, Brain, Globe2, Rocket, Smartphone, Sparkles, Truck, Vote } from "lucide-react";
import { AppShell } from "@/components/grovio/AppShell";
import { PageHead, Panel, Pill } from "@/components/grovio/kit";

export const Route = createFileRoute("/future-lab")({
  head: () => ({
    meta: [
      { title: "Future Lab — what's next for Grovio" },
      {
        name: "description",
        content:
          "The Grovio roadmap: demand forecasting, home delivery routes, a customer app, multi-store control and voice billing. Every concept is clearly planned, not available today.",
      },
      { property: "og:title", content: "Future Lab — Grovio" },
      { property: "og:description", content: "What should Grovio learn to do next?" },
    ],
  }),
  component: FutureLab,
});

const items = [
  {
    icon: Brain,
    title: "Demand forecasting",
    body: "Grovio studies two years of your own sales, festivals and weather to tell you how much atta to stock before the rush, not after.",
    stage: "Exploring",
  },
  {
    icon: FileScan,
    title: "Automatic invoice reading",
    body: "Photograph a supplier bill and Grovio fills the Smart Import table for you to check, instead of you typing each line.",
    stage: "Exploring",
  },
  {
    icon: Truck,
    title: "Home delivery routes",
    body: "Group the day's delivery orders by locality, hand each rider an ordered list, and let customers watch the bill move.",
    stage: "Exploring",
  },
  {
    icon: Smartphone,
    title: "Customer ordering app",
    body: "Regulars reorder their usual monthly basket from a phone. It arrives at your counter as a ready-made bill to confirm.",
    stage: "Exploring",
  },
  {
    icon: Globe2,
    title: "Multi-store control",
    body: "One owner, several shops. Compare margins, transfer stock between branches and see consolidated cash in a single view.",
    stage: "Exploring",
  },
  {
    icon: Sparkles,
    title: "Voice billing in Hindi & Marathi",
    body: "Say the item and quantity out loud while your hands are busy bagging. The cart fills as you speak.",
    stage: "Exploring",
  },
  {
    icon: Boxes,
    title: "Shelf-space planner",
    body: "Turn margin and movement data into a planogram, so the products that earn most sit where hands reach first.",
    stage: "Exploring",
  },
];

const KEY = "grovio-future-interest";

function FutureLab() {
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    try { setPicked(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { /* ignore */ }
  }, []);
  const toggle = (t: string) => {
    const next = picked.includes(t) ? picked.filter((x) => x !== t) : [...picked, t];
    setPicked(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  return (
    <AppShell>
      <PageHead
        eyebrow="Intelligence"
        title="Future Lab"
        question="What could Grovio do next?"
        actions={<Pill tone="muted"><Rocket className="h-3 w-3" /> Planned, not available yet</Pill>}
      />

      <section className="panel mt-7 p-6 lg:p-8">
        <p className="eyebrow">Read this first</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">None of these work today.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          These are ideas the team is exploring for later versions. There are no dates promised. Mark the ones
          that would help your store most — your picks are kept on this device so you can share them with us.
        </p>
        <p className="mt-3 text-sm font-semibold">{picked.length ? `You marked ${picked.length} of ${items.length}.` : "You haven't marked any yet."}</p>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => {
          const on = picked.includes(it.title);
          return (
            <Panel key={it.title} title={it.title} action={<Pill tone="muted">Planned</Pill>}>
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-primary"><it.icon className="h-5 w-5" /></span>
                <p className="text-sm leading-relaxed text-ink-soft">{it.body}</p>
              </div>
              <button
                aria-pressed={on}
                onClick={() => toggle(it.title)}
                className={`ring-focus mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border text-xs font-semibold transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-sprout hover:bg-accent"}`}
              >
                <Vote className="h-3.5 w-3.5" /> {on ? "Marked as useful" : "This would help my store"}
              </button>
            </Panel>
          );
        })}
      </div>
    </AppShell>
  );
}
