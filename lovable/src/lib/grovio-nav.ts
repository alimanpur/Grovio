/**
 * Adaptive Workspace Navigation.
 * Grovio exposes five workspaces. Only the active workspace's items are ever
 * visible, so the interface never shows a long static SaaS sidebar.
 */
import {
  Activity,
  Boxes,
  CalendarCheck,
  ChartLine,
  ClipboardList,
  CloudUpload,
  FileScan,
  IndianRupee,
  LayoutGrid,
  LifeBuoy,
  Lock,
  Package,
  ReceiptText,
  Rocket,
  ScanBarcode,
  ShieldCheck,
  Store,
  Sun,
  Truck,
  Undo2,
  UserRound,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

export type WorkspaceId = "today" | "counter" | "stock" | "insights" | "store";

export type NavItem = {
  to: string;
  label: string;
  icon: typeof Sun;
  hint: string;
};

export type Workspace = {
  id: WorkspaceId;
  label: string;
  tagline: string;
  icon: typeof Sun;
  items: NavItem[];
};

export const WORKSPACES: Workspace[] = [
  {
    id: "today",
    label: "Today",
    tagline: "What needs you right now",
    icon: Sun,
    items: [
      { to: "/today", label: "Overview", icon: LayoutGrid, hint: "Your day in one screen" },
      { to: "/pulse", label: "Pulse", icon: Activity, hint: "Live store activity" },
      { to: "/future-lab", label: "Future Lab", icon: Rocket, hint: "What we're building next" },
    ],
  },
  {
    id: "counter",
    label: "Counter",
    tagline: "Serve the customer in front of you",
    icon: ScanBarcode,
    items: [
      { to: "/billing", label: "New Bill", icon: ScanBarcode, hint: "Bill in seconds" },
      { to: "/bills", label: "Bill History", icon: ReceiptText, hint: "Every invoice you issued" },
      { to: "/returns", label: "Returns", icon: Undo2, hint: "Take items back cleanly" },
      { to: "/payments", label: "Payments", icon: Wallet, hint: "Cash, UPI, card and credit" },
    ],
  },
  {
    id: "stock",
    label: "Stock",
    tagline: "Everything on your shelves",
    icon: Boxes,
    items: [
      { to: "/products", label: "Products", icon: Package, hint: "Your catalogue" },
      { to: "/inventory", label: "Inventory", icon: Boxes, hint: "Stock, batches and expiry" },
      { to: "/purchases", label: "Purchases", icon: ClipboardList, hint: "Orders and goods received" },
      { to: "/smart-import", label: "Smart Import", icon: FileScan, hint: "Read a supplier invoice" },
      { to: "/suppliers", label: "Suppliers", icon: Truck, hint: "Who you buy from" },
      { to: "/categories", label: "Categories", icon: LayoutGrid, hint: "How your shop is organised" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    tagline: "Understand the business",
    icon: ChartLine,
    items: [
      { to: "/sales", label: "Sales", icon: ChartLine, hint: "Revenue, profit and pace" },
      { to: "/reports", label: "Reports", icon: CalendarCheck, hint: "Period-by-period analysis" },
      { to: "/customers", label: "Customers", icon: Users, hint: "Who keeps coming back" },
      { to: "/gst", label: "GST", icon: IndianRupee, hint: "Tax collected and payable" },
    ],
  },
  {
    id: "store",
    label: "Store",
    tagline: "Set the shop up your way",
    icon: Store,
    items: [
      { to: "/users", label: "Users", icon: UserRound, hint: "Staff and permissions" },
      { to: "/invoice-settings", label: "Invoice Settings", icon: ReceiptText, hint: "How bills look" },
      { to: "/taxes", label: "Taxes", icon: IndianRupee, hint: "GST slabs and rules" },
      { to: "/settings", label: "Store Profile", icon: Store, hint: "Name, address, hours" },
      { to: "/change-password", label: "Security", icon: Lock, hint: "Passwords and sessions" },
      { to: "/backup", label: "Backup", icon: CloudUpload, hint: "Keep your data safe" },
      { to: "/help", label: "Help", icon: LifeBuoy, hint: "Guides and the guided tour" },
    ],
  },
];

/** Routes that belong to a workspace but are entered through Focus Mode. */
const EXTRA: Record<string, WorkspaceId> = {
  "/onboarding": "store",
};

export const workspaceForPath = (pathname: string): Workspace => {
  const direct = WORKSPACES.find((w) => w.items.some((i) => i.to === pathname));
  if (direct) return direct;
  const extra = EXTRA[pathname];
  if (extra) return WORKSPACES.find((w) => w.id === extra)!;
  return WORKSPACES[0]!;
};

export const QUICK_ACTIONS = [
  { label: "Create Invoice", to: "/billing", icon: ScanBarcode, note: "F1" },
  { label: "Add Product", to: "/products", icon: Package, note: "F2" },
  { label: "Purchase Stock", to: "/purchases", icon: Truck, note: "F3" },
  { label: "Add Customer", to: "/customers", icon: Users, note: "F4" },
  { label: "View Reports", to: "/reports", icon: ChartLine, note: "F5" },
] as const;

export const TRUST_ICONS = { ShieldCheck, Zap };
