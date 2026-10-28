import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  Boxes,
  Command as CommandIcon,
  LogOut,
  ScanBarcode,
  Search,
  Truck,
  Users,
  X,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { api } from '@/lib/api.js'
import { QUICK_ACTIONS, WORKSPACES, workspaceForPath } from '@/lib/grovio-nav.js'
import { ProductTour } from './ProductTour.jsx'

export function GrovioMark({ compact = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-[0.85rem] bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M12 21V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".6" />
          <path d="M12 13c-5 0-8-3-8-8 5.5 0 8 3 8 8Zm0-3c0-5.5 3-8 8-8 0 5.5-3 8-8 8Z" fill="currentColor" />
        </svg>
      </span>
      {compact ? null : <span className="display text-[1.3rem] leading-none">Grovio</span>}
    </span>
  )
}

export const FocusConfig = {
  title: '',
  subtitle: '',
  exitTo: '/app/today',
  exitLabel: 'Leave focus mode',
}

export function AppShell({ children, focus }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Live search results for the command palette, fetched on demand from the
  // authenticated API only when the palette opens (no mock/demo fallbacks).
  const [paletteData, setPaletteData] = useState({ products: [], bills: [], customers: [], suppliers: [] })

  useEffect(() => {
    if (!paletteOpen) return
    let alive = true
    Promise.all([
      api.products.list({ limit: 8 }).catch(() => ({ data: { items: [] } })),
      api.bills.list({ limit: 6 }).catch(() => ({ data: { items: [] } })),
      api.customers.list({ limit: 5 }).catch(() => ({ data: { items: [] } })),
      api.suppliers.list({ limit: 5 }).catch(() => ({ data: { items: [] } })),
    ]).then(([p, b, c, s]) => {
      if (!alive) return
      setPaletteData({
        products: p?.data?.items || [],
        bills: b?.data?.items || [],
        customers: c?.data?.items || [],
        suppliers: s?.data?.items || [],
      })
    })
    return () => {
      alive = false
    }
  }, [paletteOpen])

  const session = {
    name: user?.name || 'there',
    storeName: user?.store?.name || 'Your store',
  }

  const workspace = workspaceForPath(location.pathname)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const signOut = async () => {
    await logout()
    navigate('/sign-in', { replace: true })
  }

  const palette = (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <CommandInput placeholder="Search products, invoices, customers, suppliers, settings…" />
      <CommandList>
        <CommandEmpty>Nothing matched. Try a product name or an invoice number.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          {QUICK_ACTIONS.map((q) => (
            <CommandItem
              key={q.label}
              value={`action ${q.label}`}
              onSelect={() => {
                setPaletteOpen(false)
                navigate(q.to)
              }}
            >
              <q.icon className="h-4 w-4" /> {q.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {WORKSPACES.map((w) => (
          <CommandGroup key={w.id} heading={w.label}>
            {w.items.map((item) => (
              <CommandItem
                key={item.to}
                value={`${w.label} ${item.label} ${item.hint}`}
                onSelect={() => {
                  setPaletteOpen(false)
                  navigate(item.to)
                }}
              >
                <item.icon className="h-4 w-4" /> {item.label}
                <span className="ml-auto text-xs text-muted-foreground">{item.hint}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        {paletteData.products.length > 0 && (
          <CommandGroup heading="Products">
            {paletteData.products.map((p) => (
              <CommandItem
                key={p.id}
                value={`product ${p.name} ${p.sku}`}
                onSelect={() => {
                  setPaletteOpen(false)
                  navigate('/app/inventory')
                }}
              >
                <Boxes className="h-4 w-4" /> {p.name}
                <span className="num ml-auto text-xs text-muted-foreground">{p.stock} in stock</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {paletteData.bills.length > 0 && (
          <CommandGroup heading="Invoices">
            {paletteData.bills.map((b) => (
              <CommandItem
                key={b.id}
                value={`invoice ${b.invoiceNo} ${b.customer}`}
                onSelect={() => {
                  setPaletteOpen(false)
                  navigate('/app/bills')
                }}
              >
                <ScanBarcode className="h-4 w-4" /> {b.invoiceNo} · {b.customer}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {paletteData.customers.length > 0 && (
          <CommandGroup heading="Customers">
            {paletteData.customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`customer ${c.name}`}
                onSelect={() => {
                  setPaletteOpen(false)
                  navigate('/app/customers')
                }}
              >
                <Users className="h-4 w-4" /> {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {paletteData.suppliers.length > 0 && (
          <CommandGroup heading="Suppliers">
            {paletteData.suppliers.map((s) => (
              <CommandItem
                key={s.id}
                value={`supplier ${s.name}`}
                onSelect={() => {
                  setPaletteOpen(false)
                  navigate('/app/suppliers')
                }}
              >
                <Truck className="h-4 w-4" /> {s.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )

  if (focus) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[80rem] items-center gap-4 px-5 py-4 sm:px-10">
            <Link
              to={focus.exitTo}
              className="ring-focus inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:border-sprout"
            >
              <ArrowLeft className="h-4 w-4" /> {focus.exitLabel}
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{focus.title}</p>
              <p className="truncate text-xs text-muted-foreground">{focus.subtitle}</p>
            </div>
            <span className="ml-auto hidden items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground sm:flex">
              Focus mode
            </span>
            <Link
              to={focus.exitTo}
              aria-label="Leave focus mode"
              className="ring-focus grid h-10 w-10 place-items-center rounded-full border border-border bg-surface"
            >
              <X className="h-4 w-4" />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[80rem] px-5 py-10 sm:px-10 sm:py-14">{children}</main>
        {palette}
        <ProductTour />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[5.5rem] flex-col items-center gap-2 border-r border-border bg-surface-2/50 py-6 lg:flex">
        <Link to="/story" className="mb-4" aria-label="Grovio story">
          <GrovioMark compact />
        </Link>
        {WORKSPACES.map((w) => {
          const active = workspace.id === w.id
          return (
            <Link
              key={w.id}
              to={w.items[0].to}
              data-tour={`ws-${w.id}`}
              title={w.tagline}
              className={cn(
                'ring-focus group flex w-16 flex-col items-center gap-1.5 rounded-2xl py-3 text-[11px] font-semibold transition-all duration-200',
                active ? 'bg-primary text-primary-foreground shadow-lift' : 'text-muted-foreground hover:bg-surface hover:text-foreground',
              )}
            >
              <w.icon className={cn('h-5 w-5 transition-transform group-hover:scale-110', active && 'text-sprout')} />
              {w.label}
            </Link>
          )
        })}
      </aside>

      <div className="lg:pl-[5.5rem]">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[84rem] items-center gap-3 px-5 py-4 sm:px-10">
            <Link to="/story" className="lg:hidden" aria-label="Grovio story">
              <GrovioMark compact />
            </Link>
            <div className="hidden min-w-[9rem] lg:block">
              <p className="display text-lg leading-none">{workspace.label}</p>
              <p className="text-xs text-muted-foreground">{workspace.tagline}</p>
            </div>

            <button
              onClick={() => setPaletteOpen(true)}
              data-tour="command"
              className="ring-focus flex h-10 flex-1 items-center gap-2.5 rounded-full border border-border bg-surface px-4 text-sm text-muted-foreground transition-colors hover:border-sprout hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="truncate">Search anything in Grovio</span>
              <span className="num ml-auto hidden items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] sm:flex">
                <CommandIcon className="h-3 w-3" />K
              </span>
            </button>

            <Link
              to="/app/pulse"
              data-tour="pulse"
              aria-label="Pulse"
              className="ring-focus relative grid h-10 w-10 place-items-center rounded-full border border-border bg-surface transition-colors hover:border-sprout"
            >
              <Activity className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 animate-halo rounded-full bg-sprout" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger className="ring-focus grid h-10 w-10 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                {session.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block text-sm">{session.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{session.storeName}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/app/settings')}>Store profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/app/change-password')}>Security</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/app/help')}>Help & guided tour</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mx-auto max-w-[84rem] overflow-x-auto px-5 pb-3 sm:px-10">
            <nav className="flex items-center gap-1.5">
              {workspace.items.map((item) => {
                const active = location.pathname === item.to
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'ring-focus whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-[84rem] px-5 py-10 pb-24 sm:px-10 sm:py-14 lg:pb-14">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-1 border-t border-border bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
          {WORKSPACES.map((w) => {
            const active = workspace.id === w.id
            return (
              <Link
                key={w.id}
                to={w.items[0].to}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <w.icon className="h-4 w-4" />
                {w.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {palette}
      <ProductTour />
    </div>
  )
}

export default AppShell
