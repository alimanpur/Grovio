import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, PlayCircle, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { PageHead, Panel } from "@/components/grovio/kit";
import { setTourDone } from "@/lib/grovio-state";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help center — Grovio" },
      {
        name: "description",
        content:
          "Guides for billing, inventory, smart invoice import and reports, plus the interactive product tour and direct support for your store.",
      },
      { property: "og:title", content: "Help center — Grovio" },
      { property: "og:description", content: "Stuck on something? Start here." },
    ],
  }),
  component: Help,
});

const guides = [
  {
    t: "Billing your first customer",
    b: "Scan or search a product, adjust quantity with the keypad, pick a payment method and print. The whole flow is four keystrokes.",
    m: "3 min read",
    to: "/billing" as const,
  },
  {
    t: "Setting minimum stock levels",
    b: "Every product carries a minimum. When stock falls below it, Grovio raises a low-stock alert and suggests a reorder quantity.",
    m: "4 min read",
    to: "/inventory" as const,
  },
  {
    t: "Importing a supplier invoice",
    b: "Open the PDF or photo beside the entry table, pick each product, quantity and cost, then receive it into stock in one confirm.",
    m: "5 min read",
    to: "/smart-import" as const,
  },
  {
    t: "Reading your profit correctly",
    b: "Profit uses purchase price, not MRP. Keep cost prices updated through purchases so reports stay honest.",
    m: "4 min read",
    to: "/reports" as const,
  },
  {
    t: "Managing credit customers",
    b: "Choose Credit at the counter for a named customer and the amount is added to what they owe. Record collections in Payments.",
    m: "3 min read",
    to: "/customers" as const,
  },
  {
    t: "Giving staff the right access",
    b: "Add staff and note their role. Roles describe responsibilities; separate staff logins are not available yet.",
    m: "2 min read",
    to: "/settings" as const,
  },
];

const faqs = [
  { q: "Where is my data kept?", a: "In this version everything is saved in this browser on this device. Use Backup in Store settings to download a copy and restore it elsewhere." },
  { q: "Can I use my existing barcode scanner?", a: "Any USB or Bluetooth scanner that types works. Grovio listens to the search field, so no driver setup is needed." },
  { q: "What happens to expired stock?", a: "Products close to expiry are flagged in Inventory. Use a stock adjustment with a reason to write them off." },
  { q: "How do I correct a wrong bill?", a: "Open Returns, pick the bill and the items. Grovio works out the refund, can put items back on the shelf, and logs it in Pulse." },
];

function Help() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(faqs[0]!.q);
  const shown = guides.filter((g) => `${g.t} ${g.b}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <AppShell>
      <PageHead
        eyebrow="Store"
        title="Help center"
        question="Stuck on something? Start here."
        actions={
          <button
            onClick={() => {
              setTourDone(false);
              toast.success("Product tour restarted", { description: "Head to the overview to follow along." });
            }}
            className="ring-focus inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            <PlayCircle className="h-4 w-4 text-sprout" /> Restart product tour
          </button>
        }
      />

      <div className="relative mt-7 max-w-xl">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides — billing, expiry, GST, import"
          className="ring-focus h-12 w-full rounded-full border border-input bg-surface pl-11 pr-4 text-sm outline-none focus:border-sprout"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Panel title="Guides" hint="Short, written for someone who has never used software to run a shop.">
            <ul className="grid gap-3 sm:grid-cols-2">
              {shown.map((g) => (
                <li key={g.t}>
                  <Link
                    to={g.to}
                    className="group flex h-full flex-col rounded-xl border border-border bg-surface-2/40 p-4 transition-all hover:border-sprout hover:shadow-lift"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="eyebrow">{g.m}</span>
                    </span>
                    <span className="mt-2 text-sm font-semibold group-hover:text-primary">{g.t}</span>
                    <span className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{g.b}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {shown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No guide matches “{query}”. Try “import”, “stock” or “profit”.
              </p>
            ) : null}
          </Panel>

          <Panel title="Frequent questions" hint="The four things every new store owner asks.">
            <ul className="divide-y divide-border">
              {faqs.map((f) => (
                <li key={f.q}>
                  <button
                    onClick={() => setOpen(open === f.q ? null : f.q)}
                    className="ring-focus flex w-full items-center gap-3 py-3 text-left text-sm font-semibold"
                  >
                    <span className="flex-1">{f.q}</span>
                    <span className="text-muted-foreground">{open === f.q ? "–" : "+"}</span>
                  </button>
                  {open === f.q ? (
                    <p className="animate-fade pb-3 text-sm leading-relaxed text-ink-soft">{f.a}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="About this version" hint="What to know before you rely on it.">
            <ul className="space-y-2 text-sm leading-relaxed text-ink-soft">
              <li>• Data is saved in this browser only — back it up from Store settings.</li>
              <li>• Printing uses your browser's print dialog; choose “Save as PDF” for a file.</li>
              <li>• Features in Future Lab are planned and not available yet.</li>
            </ul>
            <Link to="/backup" className="ring-focus mt-4 inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-semibold hover:border-sprout">Open Backup</Link>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
