import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { EmptyState } from "@/components/grovio/kit";
import { buildReport, REPORTS, toCsv, type ReportId } from "@/lib/grovio-reports";
import { useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Grovio" },
      { name: "description", content: "Sales register, stock valuation, reorder list, dues and returns — built from your live store data and downloadable as CSV." },
      { property: "og:title", content: "Reports — Grovio" },
      { property: "og:description", content: "Which report do I need to hand over today?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const st = useGrovio();
  const [id, setId] = useState<ReportId>("sales");
  const def = REPORTS.find((r) => r.id === id)!;
  const report = buildReport(id, st);

  const download = () => {
    const blob = new Blob(["\uFEFF" + toCsv(report)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `grovio-${id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`${def.name} downloaded`, { description: "Opens in Excel or Google Sheets." });
  };

  return (
    <AppShell>
      <header>
        <p className="eyebrow">Insights · Reports</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Which report do you need?</h1>
      </header>

      <div className="mt-8 grid gap-10 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <nav aria-label="Reports">
          <ul className="divide-y divide-border border-y border-border">
            {REPORTS.map((r, i) => {
              const n = buildReport(r.id, st).rows.length;
              return (
                <li key={r.id}>
                  <button onClick={() => setId(r.id)} aria-current={id === r.id} className={`ring-focus grid w-full grid-cols-[2rem_1fr_auto] items-baseline px-3 py-3 text-left ${id === r.id ? "bg-accent" : "hover:bg-surface-2/60"}`}>
                    <span className="num text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block text-sm font-semibold">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.question}</span>
                    </span>
                    <span className="num text-xs text-muted-foreground">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section aria-label={def.name} className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{def.name}</h2>
              <p className="num mt-1 text-sm text-muted-foreground">{report.summary} · as of {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="ring-focus inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-accent">
                <Printer className="h-4 w-4" /> Print
              </button>
              <button onClick={download} disabled={!report.rows.length} className="ring-focus inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                <Download className="h-4 w-4" /> Download CSV
              </button>
            </div>
          </div>

          {report.rows.length === 0 ? (
            <div className="mt-6"><EmptyState title="Nothing to report yet" body="This report fills in as the store records activity." /></div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-t border-foreground/80 text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    {report.columns.map((c) => <th key={c} className={`py-3 font-semibold ${c.includes("₹") || c === "Items" || c.startsWith("On hand") || c.includes("qty") || c === "Minimum" ? "text-right" : ""}`}>{c}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border border-b border-border">
                  {report.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((v, j) => (
                        <td key={j} className={`py-2.5 ${typeof v === "number" ? "num text-right" : ""} ${j === 0 ? "font-semibold" : ""}`}>
                          {typeof v === "number" && report.columns[j]!.includes("₹") ? v.toLocaleString("en-IN") : v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Built from what's saved in this browser, including the sample data.</p>
        </section>
      </div>
    </AppShell>
  );
}
