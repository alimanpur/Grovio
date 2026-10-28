/** Report definitions built from the live store, plus CSV export. */
import { customers, suppliers } from "@/lib/grovio-data";
import { customerDue, supplierDue, type GrovioState } from "@/lib/grovio-store";

export type Report = { columns: string[]; rows: (string | number)[][]; summary: string };
export const REPORTS = [
  { id: "sales", name: "Sales register", question: "Every bill, with method and status" },
  { id: "stock", name: "Stock valuation", question: "What the shelves are worth at cost" },
  { id: "reorder", name: "Reorder list", question: "What to buy, and from whom" },
  { id: "dues", name: "Customer dues", question: "Who owes the store" },
  { id: "payables", name: "Supplier payables", question: "What the store owes" },
  { id: "returns", name: "Returns", question: "Goods taken back and refunds" },
] as const;
export type ReportId = (typeof REPORTS)[number]["id"];

export function buildReport(id: ReportId, st: GrovioState): Report {
  switch (id) {
    case "sales": {
      const rows = st.invoices.map((i) => [i.id, i.customer, i.items, i.method, i.status, i.total]);
      return { columns: ["Bill", "Customer", "Items", "Method", "Status", "Total (₹)"], rows, summary: `${rows.length} bills · ₹${sum(st.invoices.map((i) => i.total))}` };
    }
    case "stock": {
      const rows = st.products.map((p) => [p.sku, p.name, p.stock, p.unit, p.purchasePrice, p.stock * p.purchasePrice]);
      return { columns: ["SKU", "Product", "On hand", "Unit", "Cost (₹)", "Value (₹)"], rows, summary: `${rows.length} products · ₹${sum(st.products.map((p) => p.stock * p.purchasePrice))} at cost` };
    }
    case "reorder": {
      const low = st.products.filter((p) => p.stock < p.minStock);
      const rows = low.map((p) => [p.name, p.stock, p.minStock, p.maxStock - p.stock, p.supplier || "—", (p.maxStock - p.stock) * p.purchasePrice]);
      return { columns: ["Product", "On hand", "Minimum", "Order qty", "Supplier", "Est. cost (₹)"], rows, summary: `${rows.length} products below minimum` };
    }
    case "dues": {
      const rows = customers.map((c) => [c.name, c.phone, customerDue(st, c.name, c.due)]).filter((r) => (r[2] as number) > 0);
      return { columns: ["Customer", "Phone", "Owed (₹)"], rows, summary: `₹${sum(rows.map((r) => r[2] as number))} to collect` };
    }
    case "payables": {
      const rows = suppliers.map((s) => [s.name, s.terms, supplierDue(st, s.name, s.outstanding)]).filter((r) => (r[2] as number) > 0);
      return { columns: ["Supplier", "Terms", "Owed (₹)"], rows, summary: `₹${sum(rows.map((r) => r[2] as number))} to pay` };
    }
    case "returns": {
      const rows = (st.returns ?? []).map((r) => [r.id, r.invoiceId, r.lines.map((l) => `${l.qty} × ${l.name}`).join("; "), r.reason, r.refund]);
      return { columns: ["Return", "Bill", "Items", "Reason", "Refund (₹)"], rows, summary: `${rows.length} returns` };
    }
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0).toLocaleString("en-IN");

/** RFC 4180 CSV: quotes fields containing commas, quotes or newlines. */
export function toCsv(r: Pick<Report, "columns" | "rows">): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [r.columns, ...r.rows].map((row) => row.map(cell).join(",")).join("\n");
}

export type GstRow = { rate: number; taxable: number; tax: number };
/**
 * GST from activity recorded in Grovio: output tax on counter bills (line price is pre-tax),
 * input tax credit on purchase orders raised in Grovio and received. Net = output − input, never below 0.
 */
export function gstSummary(st: GrovioState): { output: GstRow[]; input: number; net: number } {
  const rate = (id: string) => st.products.find((p) => p.id === id)?.gst ?? 0;
  const slabs = new Map<number, GstRow>();
  for (const i of st.invoices)
    for (const l of i.lines ?? []) {
      const r = rate(l.id);
      const row = slabs.get(r) ?? { rate: r, taxable: 0, tax: 0 };
      row.taxable += l.qty * l.price;
      row.tax += (l.qty * l.price * r) / 100;
      slabs.set(r, row);
    }
  const input = st.purchaseOrders
    .filter((p) => p.raised && p.status === "Goods received")
    .reduce((a, p) => a + (p.lines ?? []).reduce((b, l) => b + (l.qty * l.cost * rate(l.id)) / 100, 0), 0);
  const output = [...slabs.values()].sort((a, b) => a.rate - b.rate);
  const out = output.reduce((a, r) => a + r.tax, 0);
  return { output, input, net: Math.max(0, out - input) };
}
