/**
 * Live client-side data layer for the Grovio prototype.
 * One source of truth shared by Counter, Stock, Today and Pulse:
 * a completed bill reduces stock and adds an invoice + Pulse event;
 * receiving a purchase increases stock. Persisted to this browser only
 * (localStorage) — there is no server.
 */
import { useSyncExternalStore } from "react";
import {
  invoices as seedInvoices,
  products as seedProducts,
  pulse as seedPulse,
  purchaseOrders as seedPOs,
  inr,
  type Product,
  type PulseKind,
} from "@/lib/grovio-data";

export type Invoice = {
  id: string;
  customer: string;
  items: number;
  total: number;
  method: string;
  time: string;
  status: string;
  lines?: { id: string; name: string; qty: number; price: number }[];
};
export type PulseEvent = {
  id: string;
  kind: PulseKind;
  title: string;
  detail: string;
  time: string;
  day: string;
};
export type PurchaseOrder = (typeof seedPOs)[number] & {
  lines?: { id: string; name: string; qty: number; cost: number }[];
  /** Set when the order was raised in Grovio; its value counts toward supplier dues once received. */
  raised?: boolean;
};
export type GrovioState = {
  products: Product[];
  invoices: Invoice[];
  pulse: PulseEvent[];
  purchaseOrders: PurchaseOrder[];
  nextBill: number;
  supplierPayments?: Record<string, number>;
  customerPayments?: Record<string, number>;
  returns?: ReturnRecord[];
  profile?: StoreProfile;
  invoiceSettings?: InvoiceSettings;
  staff?: StaffMember[];
};
export type StoreProfile = { name: string; address: string; phone: string; email: string; gstin: string; fssai: string; hours: string };
export type InvoiceSettings = { prefix: string; terms: string; showQr: boolean; showBarcode: boolean; upiId: string };
export type StaffMember = { id: string; name: string; email: string; role: "Owner" | "Manager" | "Cashier"; lastActive: string };
export const DEFAULT_PROFILE: StoreProfile = {
  name: "Sharma Provision Store",
  address: "18/4 Ajmal Khan Road, Karol Bagh, New Delhi 110005",
  phone: "+91 98110 22440",
  email: "billing@sharmaprovision.in",
  gstin: "07AABCS1429P1ZV",
  fssai: "10819004000257",
  hours: "8:00 am – 10:00 pm, all days",
};
export const DEFAULT_INVOICE: InvoiceSettings = {
  prefix: "GRV",
  terms: "Goods once sold are exchangeable within 7 days against this invoice. Perishables are non-returnable. Subject to Delhi jurisdiction.",
  showQr: true,
  showBarcode: true,
  upiId: "sharmaprovision@upi",
};
export const DEFAULT_STAFF: StaffMember[] = [
  { id: "u1", name: "Ramesh Sharma", role: "Owner", email: "ramesh@sharmaprovision.in", lastActive: "Now" },
  { id: "u2", name: "Priya Sharma", role: "Manager", email: "priya@sharmaprovision.in", lastActive: "20 min ago" },
  { id: "u3", name: "Imran Qureshi", role: "Cashier", email: "imran@sharmaprovision.in", lastActive: "Today, 6:05 pm" },
];
export const profileOf = (st: GrovioState) => st.profile ?? DEFAULT_PROFILE;
export const invoiceSettingsOf = (st: GrovioState) => st.invoiceSettings ?? DEFAULT_INVOICE;
export const staffOf = (st: GrovioState) => st.staff ?? DEFAULT_STAFF;
export type ReturnRecord = {
  id: string;
  invoiceId: string;
  customer: string;
  lines: { id: string; name: string; qty: number; price: number }[];
  refund: number;
  reason: string;
  time: string;
};

const KEY = "grovio.live.v1";
const seed = (): GrovioState => ({
  products: seedProducts.map((p) => ({ ...p })),
  invoices: seedInvoices.map((i) => ({ ...i })),
  pulse: seedPulse.map((e) => ({ ...e })),
  purchaseOrders: seedPOs.map((p) => ({ ...p })),
  nextBill: 1043,
});
const SERVER = seed();
let state: GrovioState | null = null;
const listeners = new Set<() => void>();

function load(): GrovioState {
  if (state) return state;
  try {
    const raw = window.localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as GrovioState) : seed();
  } catch {
    state = seed();
  }
  return state;
}
function commit(next: GrovioState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked — keep in memory */
  }
  listeners.forEach((l) => l());
}
const now = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const event = (kind: PulseKind, title: string, detail: string): PulseEvent => ({
  id: `e${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
  kind,
  title,
  detail,
  time: now(),
  day: "Today",
});

export function useGrovio(): GrovioState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    load,
    () => SERVER,
  );
}

export type SaleLine = { id: string; qty: number; price: number };

/** Completes a sale. Returns the new invoice, or an error message. */
export function completeSale(input: {
  lines: SaleLine[];
  total: number;
  method: string;
  customer: string;
}): { ok: true; invoice: Invoice } | { ok: false; error: string } {
  const s = load();
  if (!input.lines.length) return { ok: false, error: "Add at least one product to the bill." };
  for (const l of input.lines) {
    const p = s.products.find((x) => x.id === l.id);
    if (!p) return { ok: false, error: "A product on this bill no longer exists." };
    if (l.qty > p.stock)
      return { ok: false, error: `Only ${p.stock} ${p.unit} of ${p.name} on the shelf.` };
  }
  const id = `${invoiceSettingsOf(s).prefix}-${s.nextBill}`;
  const invoice: Invoice = {
    id,
    customer: input.customer,
    items: input.lines.reduce((a, l) => a + l.qty, 0),
    total: Math.round(input.total),
    method: input.method,
    time: now(),
    status: input.method === "Credit" ? "Due" : "Paid",
    lines: input.lines.map((l) => ({
      ...l,
      name: s.products.find((p) => p.id === l.id)?.name ?? l.id,
    })),
  };
  const events: PulseEvent[] = [
    event("invoice", `Invoice ${id} generated`, `${inr(invoice.total)} · ${input.method} · ${input.customer}`),
  ];
  const products = s.products.map((p) => {
    const l = input.lines.find((x) => x.id === p.id);
    if (!l) return p;
    const stock = p.stock - l.qty;
    if (p.stock >= p.minStock && stock < p.minStock)
      events.unshift(
        event("alert", "Low stock detected", `${p.name} — ${stock} left · minimum ${p.minStock}`),
      );
    return { ...p, stock };
  });
  commit({
    ...s,
    products,
    invoices: [invoice, ...s.invoices],
    pulse: [...events, ...s.pulse],
    nextBill: s.nextBill + 1,
  });
  return { ok: true, invoice };
}

/** Marks a purchase order received and adds stock to products from that supplier. */
export function receivePurchase(poId: string): number {
  const s = load();
  const po = s.purchaseOrders.find((p) => p.id === poId);
  if (!po || po.status === "Goods received" || po.status === "Received") return 0;
  let touched = 0;
  const products = s.products.map((p) => {
    if (po.lines) {
      const l = po.lines.find((x) => x.id === p.id);
      if (!l) return p;
      touched++;
      return { ...p, stock: p.stock + l.qty, purchasePrice: l.cost || p.purchasePrice };
    }
    if (p.supplier !== po.supplier) return p;
    touched++;
    const qty = Math.max(p.minStock * 2 - p.stock, Math.round(p.minStock / 2));
    return { ...p, stock: p.stock + qty };
  });
  commit({
    ...s,
    products,
    purchaseOrders: s.purchaseOrders.map((p) => (p.id === poId ? { ...p, status: "Goods received" } : p)),
    pulse: [
      event("purchase", "Purchase received", `${po.id} · ${touched} products restocked from ${po.supplier}`),
      ...s.pulse,
    ],
  });
  return touched;
}

/** Raises a purchase order. Needs a supplier and at least one line with qty > 0. */
export function createPurchase(input: { supplier: string; lines: { id: string; qty: number; cost: number }[] }):
  | { ok: true; po: PurchaseOrder }
  | { ok: false; error: string } {
  const s = load();
  if (!input.supplier) return { ok: false, error: "Choose a supplier." };
  const lines = input.lines.filter((l) => l.qty > 0);
  if (!lines.length) return { ok: false, error: "Add at least one product with a quantity." };
  const max = Math.max(0, ...s.purchaseOrders.map((p) => Number(p.id.replace(/\D/g, "")) || 0));
  const po: PurchaseOrder = {
    id: `PO-${max + 1}`,
    supplier: input.supplier,
    items: lines.reduce((a, l) => a + l.qty, 0),
    value: Math.round(lines.reduce((a, l) => a + l.qty * l.cost, 0)),
    status: "Ordered",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    payment: "Unpaid",
    raised: true,
    lines: lines.map((l) => ({ ...l, name: s.products.find((p) => p.id === l.id)?.name ?? l.id })),
  };
  commit({
    ...s,
    purchaseOrders: [po, ...s.purchaseOrders],
    pulse: [event("purchase", `Purchase order ${po.id} raised`, `${inr(po.value)} · ${po.supplier}`), ...s.pulse],
  });
  return { ok: true, po };
}

/** What we owe a supplier: opening dues + received unpaid orders raised in Grovio − payments recorded. */
export function supplierDue(st: GrovioState, name: string, opening: number): number {
  const received = st.purchaseOrders
    .filter((p) => p.raised && p.supplier === name && p.status === "Goods received")
    .reduce((a, p) => a + p.value, 0);
  return Math.max(0, opening + received - (st.supplierPayments?.[name] ?? 0));
}

/** Records a payment to a supplier. Amount must be positive and not exceed what is due. */
export function paySupplier(name: string, amount: number, due: number): { ok: true } | { ok: false; error: string } {
  const s = load();
  if (!(amount > 0)) return { ok: false, error: "Enter an amount above ₹0." };
  if (amount > due) return { ok: false, error: `Only ${inr(due)} is due to ${name}.` };
  commit({
    ...s,
    supplierPayments: { ...s.supplierPayments, [name]: (s.supplierPayments?.[name] ?? 0) + amount },
    pulse: [event("payment", "Supplier paid", `${inr(amount)} to ${name}`), ...s.pulse],
  });
  return { ok: true };
}

/** Manual stock correction (count, damage, etc.). */
export function adjustStock(id: string, delta: number, reason: string) {
  const s = load();
  const p = s.products.find((x) => x.id === id);
  if (!p) return;
  const stock = Math.max(0, p.stock + delta);
  commit({
    ...s,
    products: s.products.map((x) => (x.id === id ? { ...x, stock } : x)),
    pulse: [
      event("stock", "Stock adjusted", `${p.name}: ${p.stock} → ${stock} · ${reason}`),
      ...s.pulse,
    ],
  });
}

export type NewProduct = Pick<Product, "name" | "category" | "unit" | "sellingPrice"> &
  Partial<Omit<Product, "id" | "name" | "category" | "unit" | "sellingPrice">>;

/** Adds a product. Name, category, unit and a positive selling price are required; SKU must be unique. */
export function addProduct(input: NewProduct): { ok: true; product: Product } | { ok: false; error: string } {
  const s = load();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the product a name." };
  if (!(input.sellingPrice > 0)) return { ok: false, error: "Selling price must be more than ₹0." };
  if (s.products.some((p) => p.name.toLowerCase() === name.toLowerCase()))
    return { ok: false, error: `${name} is already in your catalogue.` };
  const n = s.products.length + 1;
  const sku = (input.sku?.trim() || `GRV-${name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}-${String(n).padStart(2, "0")}`);
  if (s.products.some((p) => p.sku === sku)) return { ok: false, error: `SKU ${sku} is already used.` };
  const product: Product = {
    id: `p${Date.now().toString(36)}`,
    name,
    sku,
    category: input.category,
    brand: input.brand ?? "",
    unit: input.unit,
    purchasePrice: input.purchasePrice ?? 0,
    sellingPrice: input.sellingPrice,
    stock: Math.max(0, input.stock ?? 0),
    minStock: input.minStock ?? 0,
    maxStock: input.maxStock ?? Math.max(10, (input.stock ?? 0) * 2),
    supplier: input.supplier ?? "",
    gst: input.gst ?? 0,
    ...(input.expiry ? { expiry: input.expiry } : {}),
    ...(input.batch ? { batch: input.batch } : {}),
  };
  commit({
    ...s,
    products: [product, ...s.products],
    pulse: [event("stock", "Product added", `${name} · ${product.stock} ${product.unit} · ${inr(product.sellingPrice)}`), ...s.pulse],
  });
  return { ok: true, product };
}

/** Updates price and stock rules. Minimum must not exceed maximum. */
export function updateProduct(
  id: string,
  patch: Partial<Pick<Product, "purchasePrice" | "sellingPrice" | "minStock" | "maxStock" | "gst" | "supplier">>,
): { ok: true } | { ok: false; error: string } {
  const s = load();
  const p = s.products.find((x) => x.id === id);
  if (!p) return { ok: false, error: "Product not found." };
  const next = { ...p, ...patch };
  if (!(next.sellingPrice > 0)) return { ok: false, error: "Selling price must be more than ₹0." };
  if (next.minStock > next.maxStock) return { ok: false, error: "Minimum stock can't be above maximum." };
  const events: PulseEvent[] = [];
  if (next.sellingPrice !== p.sellingPrice)
    events.push(event("stock", "Price changed", `${p.name}: ${inr(p.sellingPrice)} → ${inr(next.sellingPrice)}`));
  commit({ ...s, products: s.products.map((x) => (x.id === id ? next : x)), pulse: [...events, ...s.pulse] });
  return { ok: true };
}

/** Units of a product on an invoice that can still be returned. */
export function returnable(st: GrovioState, invoiceId: string, productId: string): number {
  const inv = st.invoices.find((i) => i.id === invoiceId);
  const sold = inv?.lines?.find((l) => l.id === productId)?.qty ?? 0;
  const back = (st.returns ?? [])
    .filter((r) => r.invoiceId === invoiceId)
    .reduce((a, r) => a + (r.lines.find((l) => l.id === productId)?.qty ?? 0), 0);
  return Math.max(0, sold - back);
}

/** Processes a return: puts goods back on the shelf (unless damaged) and records the refund. */
export function processReturn(input: { invoiceId: string; lines: { id: string; qty: number }[]; reason: string; restock: boolean }):
  | { ok: true; record: ReturnRecord }
  | { ok: false; error: string } {
  const s = load();
  const inv = s.invoices.find((i) => i.id === input.invoiceId);
  if (!inv?.lines) return { ok: false, error: "Only bills with item details can be returned." };
  const lines = input.lines.filter((l) => l.qty > 0);
  if (!lines.length) return { ok: false, error: "Choose at least one item to return." };
  for (const l of lines) {
    const max = returnable(s, inv.id, l.id);
    if (l.qty > max) return { ok: false, error: `Only ${max} of that item can still be returned.` };
  }
  const full = lines.map((l) => {
    const sold = inv.lines!.find((x) => x.id === l.id)!;
    return { id: l.id, name: sold.name, qty: l.qty, price: sold.price };
  });
  const refund = full.reduce((a, l) => a + l.qty * l.price, 0);
  const record: ReturnRecord = {
    id: `RET-${String((s.returns?.length ?? 0) + 1).padStart(3, "0")}`,
    invoiceId: inv.id,
    customer: inv.customer,
    lines: full,
    refund,
    reason: input.reason,
    time: now(),
  };
  commit({
    ...s,
    products: input.restock
      ? s.products.map((p) => {
          const l = full.find((x) => x.id === p.id);
          return l ? { ...p, stock: p.stock + l.qty } : p;
        })
      : s.products,
    returns: [record, ...(s.returns ?? [])],
    pulse: [event("payment", `Return ${record.id} on ${inv.id}`, `${inr(refund)} refunded · ${input.reason}${input.restock ? " · back on shelf" : ""}`), ...s.pulse],
  });
  return { ok: true, record };
}

/** What a customer owes: opening dues + unpaid bills raised in Grovio − payments collected. */
export function customerDue(st: GrovioState, name: string, opening: number): number {
  const credit = st.invoices.filter((i) => i.lines && i.customer === name && i.status === "Due").reduce((a, i) => a + i.total, 0);
  const returned = (st.returns ?? [])
    .filter((r) => r.customer === name && st.invoices.find((i) => i.id === r.invoiceId)?.status === "Due")
    .reduce((a, r) => a + r.refund, 0);
  return Math.max(0, opening + credit - returned - (st.customerPayments?.[name] ?? 0));
}

/** Collects a payment against a customer's dues. Must be positive and not exceed what is due. */
export function collectPayment(name: string, amount: number, due: number, method: string): { ok: true } | { ok: false; error: string } {
  const s = load();
  if (!(amount > 0)) return { ok: false, error: "Enter an amount above ₹0." };
  if (amount > due) return { ok: false, error: `${name} only owes ${inr(due)}.` };
  commit({
    ...s,
    customerPayments: { ...s.customerPayments, [name]: (s.customerPayments?.[name] ?? 0) + amount },
    pulse: [event("payment", "Payment collected", `${inr(amount)} from ${name} · ${method}`), ...s.pulse],
  });
  return { ok: true };
}

/** GSTIN: 2-digit state code, 10-char PAN, entity digit, Z, checksum char. */
export const GSTIN_RE = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function saveProfile(p: StoreProfile): { ok: true } | { ok: false; error: string } {
  if (!p.name.trim()) return { ok: false, error: "The store needs a name." };
  const gstin = p.gstin.trim().toUpperCase();
  if (gstin && !GSTIN_RE.test(gstin)) return { ok: false, error: "GSTIN should be 15 characters, like 07AABCS1429P1ZV." };
  const s = load();
  commit({ ...s, profile: { ...p, name: p.name.trim(), gstin } });
  return { ok: true };
}

export function saveInvoiceSettings(v: InvoiceSettings): { ok: true } | { ok: false; error: string } {
  const prefix = v.prefix.trim().toUpperCase();
  if (!/^[A-Z]{2,5}$/.test(prefix)) return { ok: false, error: "Bill prefix must be 2–5 letters." };
  const s = load();
  commit({ ...s, invoiceSettings: { ...v, prefix } });
  return { ok: true };
}

export function addStaff(m: Omit<StaffMember, "id" | "lastActive">): { ok: true } | { ok: false; error: string } {
  const s = load();
  const list = staffOf(s);
  if (!m.name.trim()) return { ok: false, error: "Enter a name." };
  if (!/^\S+@\S+\.\S+$/.test(m.email)) return { ok: false, error: "Enter a valid email." };
  if (list.some((x) => x.email.toLowerCase() === m.email.toLowerCase())) return { ok: false, error: "Someone already uses that email." };
  if (m.role === "Owner") return { ok: false, error: "A store has one owner." };
  commit({ ...s, staff: [...list, { ...m, name: m.name.trim(), id: `u${Date.now().toString(36)}`, lastActive: "Invited" }] });
  return { ok: true };
}

export function updateStaff(id: string, patch: Partial<Pick<StaffMember, "role">>, remove = false): { ok: true } | { ok: false; error: string } {
  const s = load();
  const list = staffOf(s);
  const m = list.find((x) => x.id === id);
  if (!m) return { ok: false, error: "Not found." };
  if (m.role === "Owner") return { ok: false, error: "The owner can't be changed or removed." };
  if (patch.role === "Owner") return { ok: false, error: "A store has one owner." };
  commit({ ...s, staff: remove ? list.filter((x) => x.id !== id) : list.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  return { ok: true };
}

/** Restores a backup. Rejects files that aren't a Grovio backup. */
export function restoreBackup(json: string): { ok: true } | { ok: false; error: string } {
  try {
    const d = JSON.parse(json) as Partial<GrovioState>;
    if (!Array.isArray(d.products) || !Array.isArray(d.invoices) || !Array.isArray(d.pulse) || !Array.isArray(d.purchaseOrders) || typeof d.nextBill !== "number")
      return { ok: false, error: "This isn't a Grovio backup file." };
    commit(d as GrovioState);
    return { ok: true };
  } catch {
    return { ok: false, error: "The file couldn't be read." };
  }
}
export const exportBackup = () => JSON.stringify(load(), null, 2);

export function resetDemo() {
  commit(seed());
}
