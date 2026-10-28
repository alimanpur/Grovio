import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { StoreHeader } from "@/components/grovio/settings-kit";
import { inr } from "@/lib/grovio-data";
import { updateProduct, useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/taxes")({
  head: () => ({
    meta: [
      { title: "Taxes — Grovio" },
      { name: "description", content: "Which GST slab each product is billed at, grouped by rate and editable in place." },
      { property: "og:title", content: "Taxes — Grovio" },
      { property: "og:description", content: "Is every product billed at the right GST rate?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Taxes,
});

const SLABS = [0, 5, 12, 18, 28];

function Taxes() {
  const { products } = useGrovio();
  return (
    <AppShell>
      <StoreHeader section="Taxes" question="Is every product billed at the right GST rate?" />
      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
        Change a rate here and the next bill uses it. Earlier bills keep the rate they were billed at. If you're unsure of a rate, check with your accountant. Monthly totals are on the <Link to="/gst" className="font-semibold text-primary hover:underline">GST page</Link>.
      </p>
      <div className="mt-8 space-y-10">
        {SLABS.map((rate) => {
          const items = products.filter((p) => p.gst === rate);
          return (
            <section key={rate} aria-label={`${rate}% GST`}>
              <div className="flex items-baseline gap-4 border-b border-foreground/80 pb-2">
                <h2 className="num text-3xl font-semibold">{rate}%</h2>
                <p className="text-sm text-muted-foreground">{items.length} product{items.length === 1 ? "" : "s"}{rate ? ` · CGST ${rate / 2}% + SGST ${rate / 2}%` : " · exempt"}</p>
              </div>
              {items.length ? (
                <ul className="divide-y divide-border">
                  {items.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                      <span><span className="font-semibold">{p.name}</span> <span className="num text-xs text-muted-foreground">· {p.category} · sells at {inr(p.sellingPrice)}</span></span>
                      <select aria-label={`GST rate for ${p.name}`} value={p.gst} onChange={(e) => { const g = Number(e.target.value); const r = updateProduct(p.id, { gst: g }); if (r.ok) toast.success(`${p.name} moved to ${g}%`); }} className="ring-focus h-9 rounded-md border border-input bg-surface px-2 text-sm">
                        {SLABS.map((s) => <option key={s} value={s}>{s}%</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-3 text-sm text-muted-foreground">No products at this rate.</p>}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
