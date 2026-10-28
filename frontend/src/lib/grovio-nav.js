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
} from 'lucide-react'

export const WORKSPACES = [
  {
    id: 'today',
    label: 'Today',
    tagline: 'What needs you right now',
    icon: Sun,
    items: [
      { to: '/app/today', label: 'Overview', icon: LayoutGrid, hint: 'Your day in one screen' },
      { to: '/app/pulse', label: 'Pulse', icon: Activity, hint: 'Live store activity' },
      { to: '/app/future-lab', label: 'Future Lab', icon: Rocket, hint: 'What we\'re building next' },
    ],
  },
  {
    id: 'counter',
    label: 'Counter',
    tagline: 'Serve the customer in front of you',
    icon: ScanBarcode,
    items: [
      { to: '/app/billing', label: 'New Bill', icon: ScanBarcode, hint: 'Bill in seconds' },
      { to: '/app/bills', label: 'Bill History', icon: ReceiptText, hint: 'Every invoice you issued' },
      { to: '/app/returns', label: 'Returns', icon: Undo2, hint: 'Take items back cleanly' },
      { to: '/app/payments', label: 'Payments', icon: Wallet, hint: 'Cash, UPI, card and credit' },
    ],
  },
  {
    id: 'stock',
    label: 'Stock',
    tagline: 'Everything on your shelves',
    icon: Boxes,
    items: [
      { to: '/app/products', label: 'Products', icon: Package, hint: 'Your catalogue' },
      { to: '/app/inventory', label: 'Inventory', icon: Boxes, hint: 'Stock, batches and expiry' },
      { to: '/app/purchases', label: 'Purchases', icon: ClipboardList, hint: 'Orders and goods received' },
      { to: '/app/smart-import', label: 'Smart Import', icon: FileScan, hint: 'Read a supplier invoice' },
      { to: '/app/suppliers', label: 'Suppliers', icon: Truck, hint: 'Who you buy from' },
      { to: '/app/categories', label: 'Categories', icon: LayoutGrid, hint: 'How your shop is organised' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    tagline: 'Understand the business',
    icon: ChartLine,
    items: [
      { to: '/app/sales', label: 'Sales', icon: ChartLine, hint: 'Revenue, profit and pace' },
      { to: '/app/reports', label: 'Reports', icon: CalendarCheck, hint: 'Period-by-period analysis' },
      { to: '/app/customers', label: 'Customers', icon: Users, hint: 'Who keeps coming back' },
      { to: '/app/gst', label: 'GST', icon: IndianRupee, hint: 'Tax collected and payable' },
    ],
  },
  {
    id: 'store',
    label: 'Store',
    tagline: 'Set the shop up your way',
    icon: Store,
    items: [
      { to: '/app/users', label: 'Users', icon: UserRound, hint: 'Staff and permissions' },
      { to: '/app/invoice-settings', label: 'Invoice Settings', icon: ReceiptText, hint: 'How bills look' },
      { to: '/app/taxes', label: 'Taxes', icon: IndianRupee, hint: 'GST slabs and rules' },
      { to: '/app/settings', label: 'Store Profile', icon: Store, hint: 'Name, address, hours' },
      { to: '/app/change-password', label: 'Security', icon: Lock, hint: 'Passwords and sessions' },
      { to: '/app/backup', label: 'Backup', icon: CloudUpload, hint: 'Keep your data safe' },
      { to: '/app/help', label: 'Help', icon: LifeBuoy, hint: 'Guides and the guided tour' },
    ],
  },
]

const EXTRA = {
  '/app/onboarding': 'store',
}

export function workspaceForPath(pathname) {
  const direct = WORKSPACES.find((w) => w.items.some((i) => i.to === pathname))
  if (direct) return direct
  const extra = EXTRA[pathname]
  if (extra) return WORKSPACES.find((w) => w.id === extra)
  return WORKSPACES[0]
}

export const QUICK_ACTIONS = [
  { label: 'Create Invoice', to: '/app/billing', icon: ScanBarcode, note: 'F1' },
  { label: 'Add Product', to: '/app/products', icon: Package, note: 'F2' },
  { label: 'Purchase Stock', to: '/app/purchases', icon: Truck, note: 'F3' },
  { label: 'Add Customer', to: '/app/customers', icon: Users, note: 'F4' },
  { label: 'View Reports', to: '/app/reports', icon: ChartLine, note: 'F5' },
]

export const TRUST_ICONS = { ShieldCheck, Zap }
