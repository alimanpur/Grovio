import { describe, expect, it } from "vitest";
import { toCsv } from "./grovio-reports";

describe("report CSV export", () => {
  it("quotes fields that contain commas or quotes", () => {
    expect(toCsv({ columns: ["Name", "Total"], rows: [['Atta, 10 kg', 465], ['Say "hi"', 1]] })).toBe('Name,Total\n"Atta, 10 kg",465\n"Say ""hi""",1');
  });
});

import { gstSummary } from "./grovio-reports";
describe("GST summary", () => {
  it("groups output tax by slab and nets off input credit", () => {
    const st = {
      products: [{ id: "a", gst: 5 }, { id: "b", gst: 18 }],
      invoices: [{ lines: [{ id: "a", qty: 2, price: 100 }, { id: "b", qty: 1, price: 100 }] }],
      purchaseOrders: [{ raised: true, status: "Goods received", lines: [{ id: "a", qty: 10, cost: 10 }] }],
    } as any;
    const g = gstSummary(st);
    expect(g.output).toEqual([{ rate: 5, taxable: 200, tax: 10 }, { rate: 18, taxable: 100, tax: 18 }]);
    expect(g.input).toBe(5);
    expect(g.net).toBe(23);
  });
});
