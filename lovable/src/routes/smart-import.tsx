import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileText, Plus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { PageHead, Panel, Pill } from "@/components/grovio/kit";
import { inr, suppliers } from "@/lib/grovio-data";
import { createPurchase, receivePurchase, useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/smart-import")({
  head: () => ({
    meta: [
      { title: "Smart Import — enter a supplier invoice | Grovio" },
      {
        name: "description",
        content:
          "Keep the supplier invoice open beside a quick entry table, match each line to your catalogue and receive it into stock in one step.",
      },
      { property: "og:title", content: "Smart Import — Grovio" },
      { property: "og:description", content: "Supplier invoice beside you, stock updated in one confirm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SmartImport,
});

type Line = { key: number; id: string; qty: number; cost: number };

function SmartImport() {
  const st = useGrovio();
  const [file, setFile] = useState<{ name: string; url: string; pdf: boolean } | null>(null);
  const [supplier, setSupplier] = useState("");
  const [ref, setRef] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 1, id: "", qty: 0, cost: 0 }]);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url); }, [file]);

  const catalogue = useMemo(
    () => [...st.products].sort((a, b) => Number(b.supplier === supplier) - Number(a.supplier === supplier)),
    [st.products, supplier],
  );
  const total = lines.reduce((a, l) => a + l.qty * l.cost, 0);
  const set = (key: number, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast.error("That file is over 20 MB."); return; }
    setFile({ name: f.name, url: URL.createObjectURL(f), pdf: f.type === "application/pdf" });
    setDone(null);
  };

  const confirm = () => {
    if (lines.some((l) => l.qty > 0 && !l.id)) { toast.error("Choose a product for every line with a quantity."); return; }
    const r = createPurchase({ supplier, lines: lines.filter((l) => l.id) });
    if (!r.ok) { toast.error(r.error); return; }
    receivePurchase(r.po.id);
    toast.success(`${r.po.id} received into stock`, { description: `${inr(r.po.value)} added to ${supplier}'s dues.` });
    setDone(r.po.id);
    setLines([{ key: Date.now(), id: "", qty: 0, cost: 0 }]);
    setRef("");
  };

  return (
    <AppShell focus={{ title: "Smart Import", subtitle: "Invoice on one side, stock entry on the other", exitTo: "/purchases", exitLabel: "Back to purchases" }}>
      <PageHead
        eyebrow="Stock"
        title="Smart Import"
        question="Can I add this supplier invoice to stock quickly?"
        actions={<Pill tone="muted">Automatic reading is planned — see Future Lab</Pill>}
      />

      <div className="mt-8 grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Panel title="1. The supplier's invoice" hint="Open the PDF or photo here so you can read it while you enter lines. It stays on this screen only.">
          {file ? (
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate font-semibold">{file.name}</span>
                <button onClick={() => setFile(null)} className="ring-focus text-xs font-semibold text-muted-foreground hover:text-destructive">Remove</button>
              </div>
              {file.pdf ? (
                <iframe title="Supplier invoice" src={file.url} className="h-[32rem] w-full rounded-lg border border-border" />
              ) : (
                <img src={file.url} alt="Supplier invoice" className="max-h-[32rem] w-full rounded-lg border border-border object-contain" />
              )}
            </div>
          ) : (
            <label className="ring-focus flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-2/50 px-6 py-16 text-center transition-colors hover:border-sprout">
              <UploadCloud className="h-7 w-7 text-primary" />
              <span className="mt-3 text-sm font-semibold">Choose a PDF or photo of the invoice</span>
              <span className="mt-1 text-xs text-muted-foreground">PDF, JPG or PNG · up to 20 MB · optional</span>
              <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          )}
        </Panel>

        <Panel title="2. Enter and receive" hint="Products from the chosen supplier are listed first. Nothing changes until you confirm.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Supplier
              <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="ring-focus mt-1 h-10 w-full rounded-md border border-input bg-surface px-2 text-sm">
                <option value="">Choose supplier</option>
                {suppliers.map((s) => <option key={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Their invoice number <span className="font-normal text-muted-foreground">(for your reference)</span>
              <input value={ref} onChange={(e) => setRef(e.target.value)} className="ring-focus mt-1 h-10 w-full rounded-md border border-input bg-surface px-2 text-sm" />
            </label>
          </div>

          <div className="-mx-1 mt-5 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead><tr className="eyebrow text-left"><th className="pb-2">Product</th><th className="pb-2">Qty</th><th className="pb-2">Cost each</th><th className="pb-2 text-right">Line</th><th /></tr></thead>
              <tbody className="divide-y divide-border">
                {lines.map((l) => (
                  <tr key={l.key}>
                    <td className="py-2 pr-2">
                      <select
                        aria-label="Product"
                        value={l.id}
                        onChange={(e) => set(l.key, { id: e.target.value, cost: st.products.find((p) => p.id === e.target.value)?.purchasePrice ?? 0 })}
                        className="ring-focus h-9 w-full rounded-md border border-input bg-surface px-2"
                      >
                        <option value="">Choose product</option>
                        {catalogue.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2"><input aria-label="Quantity" type="number" min={0} value={l.qty || ""} onChange={(e) => set(l.key, { qty: Math.max(0, Number(e.target.value) || 0) })} className="num h-9 w-20 rounded-md border border-input bg-surface px-2" /></td>
                    <td className="py-2 pr-2"><input aria-label="Cost each" type="number" min={0} value={l.cost || ""} onChange={(e) => set(l.key, { cost: Math.max(0, Number(e.target.value) || 0) })} className="num h-9 w-24 rounded-md border border-input bg-surface px-2" /></td>
                    <td className="num py-2 text-right">{inr(l.qty * l.cost)}</td>
                    <td className="py-2 pl-2">
                      <button aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))} className="ring-focus text-muted-foreground hover:text-destructive disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setLines((p) => [...p, { key: Date.now(), id: "", qty: 0, cost: 0 }])} className="ring-focus mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Plus className="h-4 w-4" /> Add line
          </button>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2/60 p-4">
            <div>
              <p className="eyebrow">Invoice total</p>
              <p className="num text-2xl font-semibold">{inr(total)}</p>
            </div>
            <button onClick={confirm} className="ring-focus h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Receive into stock
            </button>
          </div>
          {done ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-sprout" /> {done} received.
              <Link to="/inventory" className="text-primary underline">See stock</Link>
            </p>
          ) : null}
        </Panel>
      </div>
    </AppShell>
  );
}
