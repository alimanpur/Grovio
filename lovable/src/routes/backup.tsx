import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { StoreHeader } from "@/components/grovio/settings-kit";
import { exportBackup, resetDemo, restoreBackup, useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/backup")({
  head: () => ({
    meta: [
      { title: "Backup — Grovio" },
      { name: "description", content: "Download a full copy of your store data, restore it on another computer, or start fresh." },
      { property: "og:title", content: "Backup — Grovio" },
      { property: "og:description", content: "Is the store's data safe?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Backup,
});

function Backup() {
  const st = useGrovio();
  const file = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `grovio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Backup downloaded", { description: "Keep it somewhere safe, like Google Drive or a pen drive." });
  };

  return (
    <AppShell>
      <StoreHeader section="Backup" question="Is the store's data safe?" />
      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
        Grovio currently saves everything in this browser on this computer. Clearing the browser's data would erase it, so download a backup regularly.
      </p>

      <dl className="mt-8 grid grid-cols-2 border-y border-border sm:grid-cols-4">
        {[["Bills", st.invoices.length], ["Products", st.products.length], ["Purchase orders", st.purchaseOrders.length], ["Activity events", st.pulse.length]].map(([l, v]) => (
          <div key={l} className="border-r border-border px-4 py-4 first:pl-0 last:border-r-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{l}</dt>
            <dd className="num mt-1 text-2xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <ol className="mt-8 max-w-3xl divide-y divide-border border-y border-border">
        <Step n="01" title="Download a backup" body="One file with every bill, product, order, payment and setting.">
          <button onClick={download} className="ring-focus inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" /> Download</button>
        </Step>
        <Step n="02" title="Restore from a backup" body="Replaces what's here with the file's contents. Use this to move to a new computer.">
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Backup file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f || !confirm("Replace everything in this browser with this backup?")) return;
              const r = restoreBackup(await f.text());
              if (r.ok) toast.success("Backup restored");
              else toast.error("Not restored", { description: r.error });
            }}
          />
          <button onClick={() => file.current?.click()} className="ring-focus inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-accent"><Upload className="h-4 w-4" /> Choose file</button>
        </Step>
        <Step n="03" title="Start again with sample data" body="Erases your changes and reloads the sample store. Download a backup first.">
          <button onClick={() => { if (confirm("Erase all changes and reload the sample store?")) { resetDemo(); toast.success("Sample store reloaded"); } }} className="ring-focus inline-flex h-10 items-center gap-2 rounded-md border border-destructive/50 px-4 text-sm font-semibold text-destructive hover:bg-destructive/5"><RotateCcw className="h-4 w-4" /> Reset</button>
        </Step>
      </ol>
    </AppShell>
  );
}

function Step({ n, title, body, children }: { n: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-4 py-5 sm:grid-cols-[2.5rem_1fr_auto] sm:items-center">
      <span className="num text-sm text-muted-foreground">{n}</span>
      <span><span className="block font-semibold">{title}</span><span className="text-sm text-muted-foreground">{body}</span></span>
      <span className="col-start-2 sm:col-start-3">{children}</span>
    </li>
  );
}
