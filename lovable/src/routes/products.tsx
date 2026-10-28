import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PackagePlus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/grovio/AppShell";
import { EmptyState } from "@/components/grovio/kit";
import { categories, inr, type Product } from "@/lib/grovio-data";
import { addProduct, updateProduct, useGrovio } from "@/lib/grovio-store";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — Grovio" },
      { name: "description", content: "Your catalogue: pricing, margin, stock rules and supplier for every product, editable in place." },
      { property: "og:title", content: "Products — Grovio" },
      { property: "og:description", content: "What exactly am I selling, and on what terms?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Products,
});

const UNITS = ["piece", "pack", "pouch", "bottle", "bag", "carton", "kg", "litre"];
const GST = [0, 5, 12, 18, 28];
const field = "ring-focus mt-1 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary";
const marginOf = (p: Pick<Product, "sellingPrice" | "purchasePrice">) =>
  p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100) : 0;

function Products() {
  const { products, pulse } = useGrovio();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const list = useMemo(
    () =>
      products.filter(
        (p) => (cat === "All" || p.category === cat) && `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, query, cat],
  );
  const product = products.find((p) => p.id === selected) ?? list[0];
  const cats = Array.from(new Set([...categories.map((c) => c.name), ...products.map((p) => p.category)]));

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Stock · Products</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">What are we selling, and on what terms?</h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="ring-focus inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <PackagePlus className="h-4 w-4" /> Add product
        </button>
      </header>

      {adding ? (
        <AddProduct
          cats={cats}
          initialName={query}
          onClose={() => setAdding(false)}
          onAdded={(id) => {
            setAdding(false);
            setQuery("");
            setCat("All");
            setSelected(id);
          }}
        />
      ) : null}

      <div className="mt-8 grid gap-10 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <section aria-label="Catalogue" className="min-w-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" placeholder="Name, brand or SKU" className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary" />
            </div>
            <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className="ring-focus h-10 w-36 shrink-0 rounded-md border border-input bg-surface px-3 text-sm">
              <option value="All">All</option>
              {cats.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <p className="num mt-3 text-xs text-muted-foreground">
            {list.length} of {products.length} products
          </p>
          {list.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Not in your catalogue yet"
                body="Add it now — only name, category, unit and price are needed."
                action={
                  <button onClick={() => setAdding(true)} className="ring-focus rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                    Add “{query || "product"}”
                  </button>
                }
              />
            </div>
          ) : (
            <ul className="mt-2 max-h-[40rem] divide-y divide-border overflow-y-auto border-y border-border">
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelected(p.id)}
                    aria-current={product?.id === p.id}
                    className={`ring-focus grid w-full grid-cols-[1fr_auto] gap-x-3 px-3 py-3 text-left ${product?.id === p.id ? "bg-accent" : "hover:bg-surface-2/60"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="num block text-xs text-muted-foreground">
                        {p.sku} · {p.category}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="num block text-sm font-semibold">{inr(p.sellingPrice)}</span>
                      <span className={`num text-xs ${p.stock < p.minStock ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                        {p.stock} {p.unit}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {product ? <Detail key={product.id} product={product} history={pulse.filter((e) => e.detail.includes(product.name)).slice(0, 6)} /> : null}
      </div>
    </AppShell>
  );
}

function Detail({ product: p, history }: { product: Product; history: { id: string; title: string; detail: string; time: string; day: string }[] }) {
  const [draft, setDraft] = useState({
    purchasePrice: p.purchasePrice,
    sellingPrice: p.sellingPrice,
    gst: p.gst,
    minStock: p.minStock,
    maxStock: p.maxStock,
    supplier: p.supplier,
  });
  const dirty = (Object.keys(draft) as (keyof typeof draft)[]).some((k) => draft[k] !== p[k]);
  const margin = marginOf(draft);
  const low = p.stock < p.minStock;
  const num = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [k]: Number(e.target.value) || 0 }));

  return (
    <section aria-label={p.name} className="min-w-0">
      <p className="eyebrow">
        {[p.brand, p.category].filter(Boolean).join(" · ")}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{p.name}</h2>
      <p className="num mt-1 text-xs text-muted-foreground">
        SKU {p.sku}
        {p.batch ? ` · batch ${p.batch}` : ""}
      </p>

      <dl className="mt-6 grid grid-cols-3 border-y border-border">
        <Fig label="Selling" value={inr(p.sellingPrice)} />
        <Fig label="Margin" value={p.purchasePrice ? `${marginOf(p)}%` : "Add cost"} warn={!!p.purchasePrice && marginOf(p) < 10} />
        <Fig label={low ? "On hand · below minimum" : "On hand"} value={`${p.stock} ${p.unit}`} warn={low} />
      </dl>

      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          const r = updateProduct(p.id, draft);
          if (r.ok) toast.success(`${p.name} updated`);
          else toast.error("Not saved", { description: r.error });
        }}
      >
        <h3 className="text-sm font-semibold">Price and stock rules</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Cost price (₹)
            <input inputMode="decimal" value={draft.purchasePrice} onChange={num("purchasePrice")} className={`num ${field}`} />
          </label>
          <label className="text-xs text-muted-foreground">
            Selling price (₹)
            <input inputMode="decimal" value={draft.sellingPrice} onChange={num("sellingPrice")} className={`num ${field}`} />
          </label>
          <label className="text-xs text-muted-foreground">
            GST slab
            <select value={draft.gst} onChange={num("gst")} className={field}>
              {GST.map((g) => (
                <option key={g} value={g}>
                  {g}%
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Minimum stock
            <input inputMode="numeric" value={draft.minStock} onChange={num("minStock")} className={`num ${field}`} />
          </label>
          <label className="text-xs text-muted-foreground">
            Maximum stock
            <input inputMode="numeric" value={draft.maxStock} onChange={num("maxStock")} className={`num ${field}`} />
          </label>
          <label className="text-xs text-muted-foreground">
            Supplier
            <input value={draft.supplier} onChange={(e) => setDraft((d) => ({ ...d, supplier: e.target.value }))} className={field} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="num text-xs text-muted-foreground">
            Margin at these prices: <span className={margin < 10 ? "font-semibold text-destructive" : "font-semibold text-foreground"}>{margin}%</span>
            {" · "}reorder {Math.max(0, draft.maxStock - p.stock)} {p.unit} to fill the shelf
          </p>
          <button disabled={!dirty} className="ring-focus h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            Save changes
          </button>
        </div>
      </form>

      <div className="mt-10">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <Link to="/inventory" className="text-xs font-semibold text-primary hover:underline">
            Adjust stock in Inventory
          </Link>
        </div>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No sales, deliveries or changes recorded for this product yet.</p>
        ) : (
          <ol className="mt-3 divide-y divide-border border-y border-border">
            {history.map((h) => (
              <li key={h.id} className="grid grid-cols-[5.5rem_1fr] gap-3 py-2.5 text-sm">
                <span className="num text-xs text-muted-foreground">
                  {h.day === "Today" ? h.time : h.day}
                </span>
                <span>
                  <span className="font-semibold">{h.title}</span>
                  <span className="block text-xs text-muted-foreground">{h.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function AddProduct({ cats, initialName, onClose, onAdded }: { cats: string[]; initialName: string; onClose: () => void; onAdded: (id: string) => void }) {
  const [f, setF] = useState({ name: initialName, category: cats[0] ?? "Staples", unit: "pack", sellingPrice: "", purchasePrice: "", stock: "", minStock: "", gst: 5 });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((d) => ({ ...d, [k]: e.target.value }));
  return (
    <form
      aria-label="Add product"
      className="animate-rise mt-8 rounded-md border border-foreground/80 bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const r = addProduct({
          name: f.name,
          category: f.category,
          unit: f.unit,
          sellingPrice: Number(f.sellingPrice),
          purchasePrice: Number(f.purchasePrice) || 0,
          stock: Number(f.stock) || 0,
          minStock: Number(f.minStock) || 0,
          gst: Number(f.gst),
        });
        if (!r.ok) {
          toast.error("Product not added", { description: r.error });
          return;
        }
        toast.success(`${r.product.name} added`, { description: `SKU ${r.product.sku} · ready to bill` });
        onAdded(r.product.id);
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">New product</h2>
        <button type="button" onClick={onClose} className="ring-focus rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Required: name, category, unit and selling price. The rest can come later.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <label className="text-xs text-muted-foreground sm:col-span-2">
          Name *
          <input autoFocus required value={f.name} onChange={set("name")} placeholder="e.g. Haldiram Bhujia 200 g" className={field} />
        </label>
        <label className="text-xs text-muted-foreground">
          Category *
          <select value={f.category} onChange={set("category")} className={field}>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Unit *
          <select value={f.unit} onChange={set("unit")} className={field}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Selling price (₹) *
          <input required inputMode="decimal" value={f.sellingPrice} onChange={set("sellingPrice")} className={`num ${field}`} />
        </label>
        <label className="text-xs text-muted-foreground">
          Cost price (₹)
          <input inputMode="decimal" value={f.purchasePrice} onChange={set("purchasePrice")} className={`num ${field}`} />
        </label>
        <label className="text-xs text-muted-foreground">
          Opening stock
          <input inputMode="numeric" value={f.stock} onChange={set("stock")} className={`num ${field}`} />
        </label>
        <label className="text-xs text-muted-foreground">
          GST slab
          <select value={f.gst} onChange={set("gst")} className={field}>
            {GST.map((g) => (
              <option key={g} value={g}>
                {g}%
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="ring-focus h-10 rounded-md border border-border px-4 text-sm font-semibold">
          Cancel
        </button>
        <button className="ring-focus h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">Add product</button>
      </div>
    </form>
  );
}

function Fig({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="border-r border-border px-4 py-4 first:pl-0 last:border-r-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`num mt-1 text-2xl font-semibold ${warn ? "text-destructive" : ""}`}>{value}</dd>
    </div>
  );
}
