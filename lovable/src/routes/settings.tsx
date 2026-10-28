import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { Field, inputCls, SaveBar, StoreHeader } from "@/components/grovio/settings-kit";
import { profileOf, saveProfile, useGrovio, type StoreProfile } from "@/lib/grovio-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Store profile — Grovio" },
      { name: "description", content: "Your store's name, address, GSTIN, FSSAI licence and hours — printed on every invoice." },
      { property: "og:title", content: "Store profile — Grovio" },
      { property: "og:description", content: "How does the store appear on its bills?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const saved = profileOf(useGrovio());
  const [p, setP] = useState<StoreProfile>(saved);
  const dirty = (Object.keys(p) as (keyof StoreProfile)[]).some((k) => p[k] !== saved[k]);
  const set = (k: keyof StoreProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP((x) => ({ ...x, [k]: e.target.value }));

  return (
    <AppShell>
      <StoreHeader section="Store profile" question="How does the store appear on its bills?" />
      <form
        className="mt-8 max-w-3xl"
        onSubmit={(e) => {
          e.preventDefault();
          const r = saveProfile(p);
          if (!r.ok) return void toast.error("Not saved", { description: r.error });
          toast.success("Store profile saved", { description: "New bills will print these details." });
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Store name" wide><input required value={p.name} onChange={set("name")} className={inputCls} /></Field>
          <Field label="Address" wide><textarea rows={2} value={p.address} onChange={set("address")} className={`${inputCls} h-auto py-2`} /></Field>
          <Field label="Phone"><input value={p.phone} onChange={set("phone")} className={`num ${inputCls}`} /></Field>
          <Field label="Billing email"><input type="email" value={p.email} onChange={set("email")} className={inputCls} /></Field>
          <Field label="GSTIN" hint="15 characters. Leave empty if you're not registered."><input value={p.gstin} onChange={(e) => setP((x) => ({ ...x, gstin: e.target.value.toUpperCase() }))} maxLength={15} className={`num uppercase ${inputCls}`} /></Field>
          <Field label="FSSAI licence"><input value={p.fssai} onChange={set("fssai")} className={`num ${inputCls}`} /></Field>
          <Field label="Opening hours" wide><input value={p.hours} onChange={set("hours")} className={inputCls} /></Field>
        </div>
        <SaveBar dirty={dirty} />
      </form>
    </AppShell>
  );
}
