import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { AppShell } from "@/components/grovio/AppShell";
import { Meter, PageHead, Panel } from "@/components/grovio/kit";
import { categories, products } from "@/lib/grovio-data";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — Grovio" },
      {
        name: "description",
        content: "The vocabulary of your shop: categories, their share of sales and how each one is moving.",
      },
      { property: "og:title", content: "Categories — Grovio" },
      { property: "og:description", content: "How is my shop organised, and which aisle earns most?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Categories,
});

function Categories() {
  return (
    <AppShell>
      <PageHead
        eyebrow="Stock"
        title="Categories"
        question="How is my shop organised, and which aisle earns most?"
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {categories.map((c) => {
          const items = products.filter((p) => p.category === c.name);
          const Icon = c.movement === "up" ? ArrowUpRight : c.movement === "down" ? ArrowDownRight : Minus;
          return (
            <Panel
              key={c.name}
              title={c.name}
              hint={`${c.products} products · ${c.share}% of sales`}
              action={
                <span
                  className={`grid h-9 w-9 place-items-center rounded-lg ${
                    c.movement === "up"
                      ? "bg-sprout/20 text-sprout-foreground"
                      : c.movement === "down"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              }
            >
              <Meter value={c.share * 3} tone={c.movement === "down" ? "saffron" : "sprout"} />
              <ul className="mt-4 space-y-1.5">
                {items.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="num text-xs text-muted-foreground">
                      {p.stock} {p.unit}
                    </span>
                  </li>
                ))}
                {items.length === 0 ? (
                  <li className="text-sm text-muted-foreground">
                    No products mapped here yet — assign one from the Products page.
                  </li>
                ) : null}
              </ul>
            </Panel>
          );
        })}
      </div>
    </AppShell>
  );
}
