import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { InvoiceDocument } from "@/components/grovio/InvoiceDocument";
import { Field, inputCls, SaveBar, StoreHeader, Toggle } from "@/components/grovio/settings-kit";
import { invoiceSettingsOf, saveInvoiceSettings, useGrovio, type InvoiceSettings } from "@/lib/grovio-store";

export const Route = createFileRoute("/invoice-settings")({
  head: () => ({
    meta: [
      { title: "Invoice settings — Grovio" },
      { name: "description", content: "Bill number prefix, printed terms, QR code and barcode — with a live preview of the invoice." },
      { property: "og:title", content: "Invoice settings — Grovio" },
      { property: "og:description", content: "What should every bill say?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoiceSettingsPage,
});

const SAMPLE = [
  { name: "Aashirvaad Atta 10 kg", hsn: "1101", qty: 1, unit: "bag", rate: 465, gst: 5 },
  { name: "Tata Tea Gold 500 g", hsn: "0902", qty: 1, unit: "pack", rate: 290, gst: 5 },
];

function InvoiceSettingsPage() {
  const st = useGrovio();
  const saved = invoiceSettingsOf(st);
  const [v, setV] = useState<InvoiceSettings>(saved);
  const dirty = (Object.keys(v) as (keyof InvoiceSettings)[]).some((k) => v[k] !== saved[k]);

  return (
    <AppShell>
      <StoreHeader section="Invoice settings" question="What should every bill say?" />
      <div className="mt-8 grid gap-12 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const r = saveInvoiceSettings(v);
            if (!r.ok) return void toast.error("Not saved", { description: r.error });
            toast.success("Invoice settings saved", { description: `Next bill: ${v.prefix.toUpperCase()}-${st.nextBill}` });
          }}
        >
          <div className="space-y-5">
            <Field label="Bill number prefix" hint={`Next bill will be ${(v.prefix || "—").toUpperCase()}-${st.nextBill}. Earlier bills keep their numbers.`}>
              <input value={v.prefix} maxLength={5} onChange={(e) => setV({ ...v, prefix: e.target.value.toUpperCase() })} className={`num uppercase ${inputCls}`} />
            </Field>
            <Field label="UPI ID for payment QR"><input value={v.upiId} onChange={(e) => setV({ ...v, upiId: e.target.value })} className={inputCls} /></Field>
            <Field label="Terms printed on the bill"><textarea rows={4} value={v.terms} onChange={(e) => setV({ ...v, terms: e.target.value })} className={`${inputCls} h-auto py-2`} /></Field>
          </div>
          <div className="mt-4 divide-y divide-border border-y border-border">
            <Toggle label="QR code" hint="Lets customers scan the bill" checked={v.showQr} onChange={(x) => setV({ ...v, showQr: x })} />
            <Toggle label="Barcode" hint="Scan to find the bill for returns" checked={v.showBarcode} onChange={(x) => setV({ ...v, showBarcode: x })} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Store name, address and GSTIN come from the <Link to="/settings" className="font-semibold text-primary hover:underline">Store profile</Link>.</p>
          <SaveBar dirty={dirty} />
        </form>

        <section aria-label="Preview" className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview · saved settings</p>
          <InvoiceDocument number={`${saved.prefix}-${st.nextBill}`} date={new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })} customer="Walk-in" phone="Walk-in customer" lines={SAMPLE} paid method="UPI" />
        </section>
      </div>
    </AppShell>
  );
}
