/**
 * Demo dataset for the Grovio frontend prototype.
 * Numbers are illustrative sample data for a single fictional store
 * (Sharma Provision Store) so every screen reads like a real business.
 */

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  maxStock: number;
  expiry?: string;
  batch?: string;
  supplier: string;
  gst: number;
};

export const products: Product[] = [
  { id: "p1", name: "Aashirvaad Atta 10 kg", sku: "GRV-ATT-10", category: "Staples", brand: "Aashirvaad", unit: "bag", purchasePrice: 412, sellingPrice: 465, stock: 24, minStock: 10, maxStock: 60, batch: "AT-2214", supplier: "Nagpal Distributors", gst: 5 },
  { id: "p2", name: "Tata Salt 1 kg", sku: "GRV-SLT-01", category: "Staples", brand: "Tata", unit: "pack", purchasePrice: 21, sellingPrice: 28, stock: 96, minStock: 40, maxStock: 200, batch: "TS-8891", supplier: "Nagpal Distributors", gst: 5 },
  { id: "p3", name: "Amul Gold Milk 500 ml", sku: "GRV-MLK-05", category: "Dairy", brand: "Amul", unit: "pouch", purchasePrice: 30, sellingPrice: 34, stock: 8, minStock: 24, maxStock: 120, expiry: "2026-08-05", batch: "AM-0803", supplier: "Amul Regional Depot", gst: 0 },
  { id: "p4", name: "Amul Butter 100 g", sku: "GRV-BTR-01", category: "Dairy", brand: "Amul", unit: "pack", purchasePrice: 52, sellingPrice: 62, stock: 18, minStock: 12, maxStock: 60, expiry: "2026-11-18", batch: "AB-1102", supplier: "Amul Regional Depot", gst: 12 },
  { id: "p5", name: "Fortune Sunflower Oil 1 L", sku: "GRV-OIL-01", category: "Oils", brand: "Fortune", unit: "bottle", purchasePrice: 128, sellingPrice: 149, stock: 41, minStock: 20, maxStock: 90, batch: "FS-3390", supplier: "Adani Wilmar Agent", gst: 5 },
  { id: "p6", name: "Maggi Noodles 12-pack", sku: "GRV-MAG-12", category: "Packaged Food", brand: "Nestlé", unit: "carton", purchasePrice: 132, sellingPrice: 168, stock: 15, minStock: 8, maxStock: 40, expiry: "2027-02-01", batch: "MG-5521", supplier: "Nestlé Superstockist", gst: 12 },
  { id: "p7", name: "Parle-G Biscuit 250 g", sku: "GRV-PGB-25", category: "Packaged Food", brand: "Parle", unit: "pack", purchasePrice: 22, sellingPrice: 30, stock: 120, minStock: 50, maxStock: 250, expiry: "2027-01-12", batch: "PG-7710", supplier: "Parle Depot", gst: 18 },
  { id: "p8", name: "Surf Excel Easy Wash 1 kg", sku: "GRV-SRF-01", category: "Home Care", brand: "HUL", unit: "pack", purchasePrice: 105, sellingPrice: 128, stock: 6, minStock: 15, maxStock: 60, batch: "SE-4412", supplier: "HUL Distributor", gst: 18 },
  { id: "p9", name: "Colgate Strong Teeth 200 g", sku: "GRV-CLG-20", category: "Personal Care", brand: "Colgate", unit: "pack", purchasePrice: 88, sellingPrice: 110, stock: 32, minStock: 12, maxStock: 60, expiry: "2028-04-30", batch: "CG-2201", supplier: "HUL Distributor", gst: 18 },
  { id: "p10", name: "Tata Tea Gold 500 g", sku: "GRV-TEA-05", category: "Beverages", brand: "Tata", unit: "pack", purchasePrice: 245, sellingPrice: 290, stock: 22, minStock: 10, maxStock: 50, batch: "TG-9021", supplier: "Nagpal Distributors", gst: 5 },
  { id: "p11", name: "Sunfeast Dark Fantasy 300 g", sku: "GRV-SDF-30", category: "Packaged Food", brand: "Sunfeast", unit: "pack", purchasePrice: 118, sellingPrice: 145, stock: 4, minStock: 10, maxStock: 40, expiry: "2026-09-09", batch: "SD-6612", supplier: "Parle Depot", gst: 18 },
  { id: "p12", name: "Basmati Rice 5 kg", sku: "GRV-RIC-05", category: "Staples", brand: "India Gate", unit: "bag", purchasePrice: 480, sellingPrice: 555, stock: 17, minStock: 8, maxStock: 40, batch: "IG-3312", supplier: "Nagpal Distributors", gst: 5 },
];

export const categories = [
  { name: "Staples", products: 34, share: 31, movement: "steady" },
  { name: "Dairy", products: 18, share: 22, movement: "up" },
  { name: "Packaged Food", products: 46, share: 19, movement: "up" },
  { name: "Home Care", products: 27, share: 12, movement: "down" },
  { name: "Personal Care", products: 31, share: 9, movement: "steady" },
  { name: "Beverages", products: 22, share: 7, movement: "up" },
];

export const suppliers = [
  { id: "s1", name: "Nagpal Distributors", contact: "Ravinder Nagpal", phone: "+91 98110 44521", city: "Karol Bagh, Delhi", outstanding: 18400, terms: "Net 15", lastPurchase: "2 days ago", skus: 42 },
  { id: "s2", name: "Amul Regional Depot", contact: "Depot Desk 4", phone: "+91 98204 11902", city: "Anand, Gujarat", outstanding: 0, terms: "Prepaid", lastPurchase: "Today", skus: 16 },
  { id: "s3", name: "HUL Distributor", contact: "Sameer Kulkarni", phone: "+91 99300 77120", city: "Andheri, Mumbai", outstanding: 9250, terms: "Net 30", lastPurchase: "6 days ago", skus: 58 },
  { id: "s4", name: "Parle Depot", contact: "Anil Bhatt", phone: "+91 97400 21883", city: "Vile Parle, Mumbai", outstanding: 4120, terms: "Net 15", lastPurchase: "9 days ago", skus: 29 },
  { id: "s5", name: "Nestlé Superstockist", contact: "Farah Sheikh", phone: "+91 90045 66712", city: "Gurugram, Haryana", outstanding: 12780, terms: "Net 21", lastPurchase: "4 days ago", skus: 33 },
];

export const customers = [
  { id: "c1", name: "Meena Iyer", phone: "+91 98333 21140", visits: 46, spend: 38420, due: 0, lastVisit: "Today", tag: "Frequent", note: "Prefers Amul dairy; monthly staples on the 3rd." },
  { id: "c2", name: "Rakesh Building Mess", phone: "+91 99887 41120", visits: 28, spend: 128900, due: 6400, lastVisit: "Yesterday", tag: "Bulk", note: "Bulk atta + oil, settles account every Friday." },
  { id: "c3", name: "Sunita Verma", phone: "+91 98700 55219", visits: 61, spend: 27340, due: 320, lastVisit: "2 days ago", tag: "Frequent", note: "Small basket, high frequency." },
  { id: "c4", name: "Ali Traders", phone: "+91 97555 90142", visits: 12, spend: 64200, due: 11200, lastVisit: "5 days ago", tag: "Credit", note: "Credit limit ₹15,000. Follow up before the 10th." },
  { id: "c5", name: "Deepak Rawat", phone: "+91 90112 88410", visits: 9, spend: 5120, due: 0, lastVisit: "Last week", tag: "New", note: "New to the area, moved in June." },
];

export const revenueTrend = [
  { day: "Mon", revenue: 28400, profit: 5120 },
  { day: "Tue", revenue: 31200, profit: 5840 },
  { day: "Wed", revenue: 26900, profit: 4610 },
  { day: "Thu", revenue: 35800, profit: 6980 },
  { day: "Fri", revenue: 41200, profit: 8340 },
  { day: "Sat", revenue: 47600, profit: 9720 },
  { day: "Sun", revenue: 38900, profit: 7410 },
];

export const inventoryTrend = [
  { week: "W1", value: 412000, turns: 2.1 },
  { week: "W2", value: 398000, turns: 2.4 },
  { week: "W3", value: 431000, turns: 2.2 },
  { week: "W4", value: 407000, turns: 2.8 },
];

export const topProducts = [
  { name: "Aashirvaad Atta 10 kg", units: 118, revenue: 54870, margin: 11 },
  { name: "Amul Gold Milk 500 ml", units: 942, revenue: 32028, margin: 12 },
  { name: "Fortune Sunflower Oil 1 L", units: 214, revenue: 31886, margin: 14 },
  { name: "Tata Tea Gold 500 g", units: 96, revenue: 27840, margin: 16 },
  { name: "Parle-G Biscuit 250 g", units: 610, revenue: 18300, margin: 27 },
];

export const invoices = [
  { id: "GRV-1042", customer: "Meena Iyer", items: 9, total: 1842, method: "UPI", time: "6 min ago", status: "Paid" },
  { id: "GRV-1041", customer: "Walk-in", items: 4, total: 386, method: "Cash", time: "18 min ago", status: "Paid" },
  { id: "GRV-1040", customer: "Rakesh Building Mess", items: 22, total: 12480, method: "Split", time: "52 min ago", status: "Partial" },
  { id: "GRV-1039", customer: "Sunita Verma", items: 6, total: 512, method: "Cash", time: "1 hr ago", status: "Paid" },
  { id: "GRV-1038", customer: "Ali Traders", items: 31, total: 18740, method: "Credit", time: "2 hrs ago", status: "Due" },
  { id: "GRV-1037", customer: "Walk-in", items: 2, total: 96, method: "UPI", time: "2 hrs ago", status: "Paid" },
];

export const purchaseOrders = [
  { id: "PO-2261", supplier: "Nagpal Distributors", items: 14, value: 42800, status: "Goods received", date: "3 Aug", payment: "Unpaid" },
  { id: "PO-2260", supplier: "Amul Regional Depot", items: 6, value: 8960, status: "Received", date: "3 Aug", payment: "Paid" },
  { id: "PO-2259", supplier: "HUL Distributor", items: 21, value: 26340, status: "In transit", date: "1 Aug", payment: "Partial" },
  { id: "PO-2258", supplier: "Nestlé Superstockist", items: 11, value: 19120, status: "Ordered", date: "30 Jul", payment: "Unpaid" },
];

export const activity = [
  { icon: "invoice", title: "Invoice GRV-1042 generated", detail: "₹1,842 · UPI · Meena Iyer", time: "6 min ago" },
  { icon: "stock", title: "Stock received against PO-2261", detail: "14 SKUs from Nagpal Distributors", time: "1 hr ago" },
  { icon: "alert", title: "Amul Gold Milk dropped below minimum", detail: "8 pouches left · reorder 60", time: "2 hrs ago" },
  { icon: "import", title: "Supplier invoice imported from PDF", detail: "11 line items matched automatically", time: "4 hrs ago" },
  { icon: "customer", title: "Ali Traders credit balance updated", detail: "₹11,200 outstanding · due 10 Aug", time: "Yesterday" },
];

export const notifications = [
  { id: "n1", kind: "Low stock", title: "4 products below minimum stock", body: "Amul Gold Milk, Surf Excel, Sunfeast Dark Fantasy and 1 more need reordering today.", time: "12 min ago", unread: true, tone: "warn" },
  { id: "n2", kind: "Expiry", title: "Amul Gold Milk expires in 2 days", body: "8 pouches from batch AM-0803. Move to front shelf or discount.", time: "1 hr ago", unread: true, tone: "danger" },
  { id: "n3", kind: "Payment", title: "Nagpal Distributors payment due", body: "₹18,400 against PO-2261 · Net 15 terms end on 8 Aug.", time: "3 hrs ago", unread: true, tone: "warn" },
  { id: "n4", kind: "Import", title: "Inventory imported successfully", body: "11 line items from a scanned invoice were added to stock.", time: "4 hrs ago", unread: false, tone: "ok" },
  { id: "n5", kind: "Summary", title: "Yesterday's summary is ready", body: "₹38,900 revenue · ₹7,410 profit · 164 bills · best hour 7-8 pm.", time: "Today, 7:00 am", unread: false, tone: "info" },
];

export const extractedLines = [
  { name: "Aashirvaad Atta 10 kg", qty: 20, price: 412, gst: 5, batch: "AT-2214", expiry: "—", match: "matched" },
  { name: "Tata Salt 1 kg", qty: 100, price: 21, gst: 5, batch: "TS-8891", expiry: "—", match: "matched" },
  { name: "Tata Tea Gold 500 g", qty: 12, price: 245, gst: 5, batch: "TG-9021", expiry: "—", match: "matched" },
  { name: "Basmati Rice 5 kg", qty: 10, price: 480, gst: 5, batch: "IG-3312", expiry: "—", match: "matched" },
  { name: "Rajdhani Besan 500 g", qty: 24, price: 58, gst: 5, batch: "RB-1180", expiry: "2027-03-31", match: "new" },
];

export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

/* ------------------------------------------------------------------ *
 * Workspace datasets (Pulse, Counter, Insights, Store)
 * ------------------------------------------------------------------ */

export type PulseKind =
  | "invoice"
  | "stock"
  | "alert"
  | "import"
  | "payment"
  | "purchase"
  | "gst"
  | "summary";

export const pulse: { id: string; kind: PulseKind; title: string; detail: string; time: string; day: string }[] = [
  { id: "e1", kind: "invoice", title: "Invoice GRV-1042 generated", detail: "₹1,842 · UPI · Meena Iyer", time: "6 min ago", day: "Today" },
  { id: "e2", kind: "payment", title: "Customer payment received", detail: "Rakesh Building Mess settled ₹6,400 in cash", time: "38 min ago", day: "Today" },
  { id: "e3", kind: "purchase", title: "Purchase completed", detail: "PO-2261 · 14 SKUs from Nagpal Distributors", time: "1 hr ago", day: "Today" },
  { id: "e4", kind: "alert", title: "Low stock alert", detail: "Amul Gold Milk down to 8 pouches · reorder 60", time: "2 hrs ago", day: "Today" },
  { id: "e5", kind: "import", title: "Supplier invoice imported", detail: "11 line items entered via Smart Import", time: "4 hrs ago", day: "Today" },
  { id: "e6", kind: "gst", title: "GST reminder", detail: "GSTR-3B for July is due on 20 Aug", time: "9:10 am", day: "Today" },
  { id: "e7", kind: "summary", title: "Daily summary ready", detail: "₹38,900 revenue · ₹7,410 profit · 164 bills", time: "7:00 am", day: "Today" },
  { id: "e8", kind: "stock", title: "Batch AM-0803 flagged near expiry", detail: "8 pouches expire on 5 Aug", time: "8:40 pm", day: "Yesterday" },
  { id: "e9", kind: "invoice", title: "Invoice GRV-1038 marked due", detail: "₹18,740 on credit · Ali Traders", time: "7:15 pm", day: "Yesterday" },
];

export const returnsLog = [
  { id: "RTN-114", bill: "GRV-1029", customer: "Sunita Verma", item: "Amul Butter 100 g", qty: 1, amount: 62, reason: "Packaging damaged", status: "Refunded", time: "Today, 4:20 pm" },
  { id: "RTN-113", bill: "GRV-1021", customer: "Meena Iyer", item: "Maggi Noodles 12-pack", qty: 1, amount: 168, reason: "Wrong variant", status: "Exchanged", time: "Yesterday" },
  { id: "RTN-112", bill: "GRV-1014", customer: "Walk-in", item: "Amul Gold Milk 500 ml", qty: 2, amount: 68, reason: "Curdled", status: "Refunded", time: "2 days ago" },
];

export const paymentLedger = [
  { method: "UPI", collected: 21400, share: 55, bills: 96 },
  { method: "Cash", collected: 11800, share: 30, bills: 52 },
  { method: "Card", collected: 3900, share: 10, bills: 11 },
  { method: "Credit", collected: 1800, share: 5, bills: 5 },
];

export const salesByHour = [
  { hour: "9a", revenue: 1800 },
  { hour: "11a", revenue: 3400 },
  { hour: "1p", revenue: 4200 },
  { hour: "3p", revenue: 3100 },
  { hour: "5p", revenue: 5600 },
  { hour: "7p", revenue: 9800 },
  { hour: "9p", revenue: 7100 },
];

export const priceHistory = [
  { date: "12 Jul 2026", purchase: 396, selling: 450, note: "Opening cost" },
  { date: "24 Jul 2026", purchase: 404, selling: 458, note: "Supplier revised rate" },
  { date: "3 Aug 2026", purchase: 412, selling: 465, note: "PO-2261 received" },
];

export const gstSlabs = [
  { rate: 0, taxable: 41200, tax: 0, items: "Fresh dairy, unbranded staples" },
  { rate: 5, taxable: 186400, tax: 9320, items: "Atta, rice, salt, edible oil, tea" },
  { rate: 12, taxable: 64800, tax: 7776, items: "Butter, noodles, ghee" },
  { rate: 18, taxable: 48900, tax: 8802, items: "Biscuits, detergent, toothpaste" },
];

export const staff = [
  { id: "u1", name: "Ramesh Sharma", role: "Owner", email: "ramesh@sharmaprovision.in", access: "Full access", lastActive: "Now" },
  { id: "u2", name: "Priya Sharma", role: "Manager", email: "priya@sharmaprovision.in", access: "Stock, Insights, Counter", lastActive: "20 min ago" },
  { id: "u3", name: "Imran Qureshi", role: "Cashier", email: "imran@sharmaprovision.in", access: "Counter only", lastActive: "Today, 6:05 pm" },
];
