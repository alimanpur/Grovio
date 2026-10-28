import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { Field, inputCls, StoreHeader } from "@/components/grovio/settings-kit";
import { addStaff, staffOf, updateStaff, useGrovio, type StaffMember } from "@/lib/grovio-store";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users — Grovio" },
      { name: "description", content: "Who can use Grovio at your store, and what each role can open." },
      { property: "og:title", content: "Users — Grovio" },
      { property: "og:description", content: "Who can do what in the store?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Users,
});

const ACCESS: Record<StaffMember["role"], string> = {
  Owner: "Everything, including store settings and backup",
  Manager: "Counter, Stock and Insights — not store settings",
  Cashier: "Counter only: billing, returns and payments",
};

function Users() {
  const staff = staffOf(useGrovio());
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", email: "", role: "Cashier" as StaffMember["role"] });

  return (
    <AppShell>
      <StoreHeader
        section="Users"
        question="Who can do what in the store?"
        action={<button onClick={() => setAdding(true)} className="ring-focus inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"><UserPlus className="h-4 w-4" /> Add person</button>}
      />

      {adding ? (
        <form
          className="animate-rise mt-8 grid gap-4 rounded-md border border-foreground/80 bg-surface p-5 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const r = addStaff(f);
            if (!r.ok) return void toast.error("Not added", { description: r.error });
            toast.success(`${f.name} added as ${f.role}`);
            setF({ name: "", email: "", role: "Cashier" });
            setAdding(false);
          }}
        >
          <Field label="Name"><input autoFocus required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} /></Field>
          <Field label="Email"><input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} /></Field>
          <Field label="Role">
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffMember["role"] })} className={inputCls}>
              <option>Cashier</option><option>Manager</option>
            </select>
          </Field>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)} aria-label="Cancel" className="ring-focus grid h-10 w-10 place-items-center rounded-md border border-border"><X className="h-4 w-4" /></button>
            <button className="ring-focus h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Add</button>
          </div>
        </form>
      ) : null}

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 font-semibold">Person</th>
              <th className="py-3 font-semibold">Role</th>
              <th className="py-3 font-semibold">Can open</th>
              <th className="py-3 font-semibold">Last active</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border border-y border-border">
            {staff.map((m) => (
              <tr key={m.id}>
                <td className="py-3"><span className="block font-semibold">{m.name}</span><span className="text-xs text-muted-foreground">{m.email}</span></td>
                <td className="py-3">
                  {m.role === "Owner" ? <span className="font-semibold">Owner</span> : (
                    <select aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => { const r = updateStaff(m.id, { role: e.target.value as StaffMember["role"] }); if (r.ok) toast.success(`${m.name} is now ${e.target.value}`); }} className="ring-focus h-9 rounded-md border border-input bg-surface px-2 text-sm">
                      <option>Manager</option><option>Cashier</option>
                    </select>
                  )}
                </td>
                <td className="py-3 text-xs text-muted-foreground">{ACCESS[m.role]}</td>
                <td className="py-3 text-xs text-muted-foreground">{m.lastActive}</td>
                <td className="py-3 text-right">
                  {m.role !== "Owner" ? (
                    <button onClick={() => { if (confirm(`Remove ${m.name}? They won't be able to sign in.`)) { updateStaff(m.id, {}, true); toast.success(`${m.name} removed`); } }} className="ring-focus text-xs font-semibold text-destructive hover:underline">Remove</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Saved in this browser. Sign-in invitations need an online account system, which isn't set up yet.</p>
    </AppShell>
  );
}
