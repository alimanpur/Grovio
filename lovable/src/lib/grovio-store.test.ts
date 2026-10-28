import { beforeEach, describe, expect, it } from "vitest";

const mem = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => mem.set(k, v),
    removeItem: (k: string) => mem.delete(k),
  },
};
const store = await import("./grovio-store");
const get = () => JSON.parse(mem.get("grovio.live.v1")!) as import("./grovio-store").GrovioState;

describe("grovio live store", () => {
  beforeEach(() => store.resetDemo());

  it("a completed sale reduces stock and records an invoice", () => {
    const res = store.completeSale({ lines: [{ id: "p2", qty: 3, price: 28 }], total: 84, method: "Cash", customer: "Walk-in" });
    expect(res.ok).toBe(true);
    const s = get();
    expect(s.products.find((p) => p.id === "p2")!.stock).toBe(93);
    expect(s.invoices[0]!.id).toBe("GRV-1043");
  });

  it("refuses to sell more than is on the shelf", () => {
    const res = store.completeSale({ lines: [{ id: "p11", qty: 5, price: 145 }], total: 725, method: "UPI", customer: "Walk-in" });
    expect(res.ok).toBe(false);
  });

  it("crossing the minimum raises a low-stock Pulse event", () => {
    store.completeSale({ lines: [{ id: "p4", qty: 7, price: 62 }], total: 434, method: "UPI", customer: "Walk-in" });
    expect(get().pulse.some((e) => e.title === "Low stock detected")).toBe(true);
  });

  it("receiving a purchase increases stock once", () => {
    const before = get().products.find((p) => p.id === "p8")!.stock;
    expect(store.receivePurchase("PO-2259")).toBeGreaterThan(0);
    expect(get().products.find((p) => p.id === "p8")!.stock).toBeGreaterThan(before);
    expect(store.receivePurchase("PO-2259")).toBe(0);
  });

  it("a new product needs a positive selling price", () => {
    const r = store.addProduct({ name: "Haldiram Bhujia 200 g", category: "Snacks", unit: "pack", sellingPrice: 0 });
    expect(r.ok).toBe(false);
  });

  it("an added product is sellable and duplicates are refused", () => {
    const r = store.addProduct({ name: "Haldiram Bhujia 200 g", category: "Snacks", unit: "pack", sellingPrice: 55, stock: 12 });
    expect(r.ok).toBe(true);
    expect(get().products[0]!.stock).toBe(12);
    expect(store.addProduct({ name: "haldiram bhujia 200 g", category: "Snacks", unit: "pack", sellingPrice: 55 }).ok).toBe(false);
  });

  it("minimum stock cannot exceed maximum", () => {
    expect(store.updateProduct("p1", { minStock: 70, maxStock: 60 }).ok).toBe(false);
    expect(store.updateProduct("p1", { minStock: 15 }).ok).toBe(true);
    expect(get().products.find((p) => p.id === "p1")!.minStock).toBe(15);
  });

  it("a raised order adds exactly its quantities on receipt and becomes a supplier due", () => {
    const before = get().products.find((p) => p.id === "p3")!.stock;
    const r = store.createPurchase({ supplier: "Amul Regional Depot", lines: [{ id: "p3", qty: 40, cost: 30 }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    store.receivePurchase(r.po.id);
    const s = get();
    expect(s.products.find((p) => p.id === "p3")!.stock).toBe(before + 40);
    expect(store.supplierDue(s, "Amul Regional Depot", 0)).toBe(1200);
  });

  it("an order needs at least one quantity", () => {
    expect(store.createPurchase({ supplier: "Parle Depot", lines: [{ id: "p7", qty: 0, cost: 22 }] }).ok).toBe(false);
  });

  it("a supplier payment cannot exceed what is due", () => {
    expect(store.paySupplier("Parle Depot", 5000, 4120).ok).toBe(false);
    expect(store.paySupplier("Parle Depot", 4120, 4120).ok).toBe(true);
    expect(store.supplierDue(get(), "Parle Depot", 4120)).toBe(0);
  });

  it("a return restocks and cannot exceed what was sold", () => {
    const sale = store.completeSale({ lines: [{ id: "p2", qty: 3, price: 28 }], total: 84, method: "Cash", customer: "Walk-in" });
    if (!sale.ok) throw new Error();
    const before = get().products.find((p) => p.id === "p2")!.stock;
    const r = store.processReturn({ invoiceId: sale.invoice.id, lines: [{ id: "p2", qty: 2 }], reason: "Wrong item", restock: true });
    expect(r.ok && r.record.refund).toBe(56);
    expect(get().products.find((p) => p.id === "p2")!.stock).toBe(before + 2);
    expect(store.processReturn({ invoiceId: sale.invoice.id, lines: [{ id: "p2", qty: 2 }], reason: "Wrong item", restock: true }).ok).toBe(false);
  });

  it("a credit bill adds to the customer's dues and payments reduce them", () => {
    store.completeSale({ lines: [{ id: "p2", qty: 1, price: 28 }], total: 28, method: "Credit", customer: "Meena Iyer" });
    expect(store.customerDue(get(), "Meena Iyer", 0)).toBe(28);
    expect(store.collectPayment("Meena Iyer", 50, 28, "Cash").ok).toBe(false);
    store.collectPayment("Meena Iyer", 28, 28, "Cash");
    expect(store.customerDue(get(), "Meena Iyer", 0)).toBe(0);
  });

  it("GSTIN must be valid and bill prefix flows into new bill numbers", () => {
    expect(store.saveProfile({ ...store.DEFAULT_PROFILE, gstin: "12345" }).ok).toBe(false);
    expect(store.saveProfile({ ...store.DEFAULT_PROFILE, gstin: "27aapfu0939f1zv" }).ok).toBe(true);
    expect(store.saveInvoiceSettings({ ...store.DEFAULT_INVOICE, prefix: "SPS" }).ok).toBe(true);
    const r = store.completeSale({ lines: [{ id: "p2", qty: 1, price: 28 }], total: 28, method: "Cash", customer: "Walk-in" });
    expect(r.ok && r.invoice.id).toBe("SPS-1043");
  });

  it("there is exactly one owner who cannot be removed", () => {
    expect(store.addStaff({ name: "A", email: "a@b.in", role: "Owner" }).ok).toBe(false);
    expect(store.updateStaff("u1", {}, true).ok).toBe(false);
    expect(store.addStaff({ name: "Asha", email: "asha@b.in", role: "Cashier" }).ok).toBe(true);
  });

  it("restore rejects files that are not a backup", () => {
    expect(store.restoreBackup('{"hello":1}').ok).toBe(false);
    expect(store.restoreBackup(store.exportBackup()).ok).toBe(true);
  });
});
