import { Check, Package, ReceiptText, Truck, ChartLine, Wallet, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

/* Shared illustrative data. Bread starts the day at 9, the 10:42 bill sells one
   (8, below its reorder point of 10), the bakery delivers 24 (32), and the day
   closes at 19. Cumulative sales: ₹6,240 → ₹7,980 → ₹10,000 → ₹18,420. */

export function Wordmark() {
  return (
    <span className="gv-mark">
      <Sprout aria-hidden="true" />
      GROVIO<i>.</i>
    </span>
  );
}

/** Shows the value matching the current scene of the nearest [data-scene] ancestor. */
export function V({ v }: { v: (string | number)[] }) {
  return (
    <>
      {v.map((x, i) => (
        <span key={i} className={`v v${i}`}>
          {x}
        </span>
      ))}
    </>
  );
}

const items = [
  { k: "rice", name: "Rice", unit: "5 kg bag", qty: "", price: "", stock: 82, w: 82 },
  { k: "milk", name: "Milk", unit: "1 L", qty: "1 × 62", price: "₹62", stock: 14, w: 40 },
  { k: "bread", name: "Bread", unit: "400 g", qty: "1 × 45", price: "₹45", stock: 8, w: 22 },
  { k: "biscuits", name: "Biscuits", unit: "Pack", qty: "1 × 30", price: "₹30", stock: 36, w: 58 },
];
export const sceneCopy = [
  { k: "Counter", t: ["A bill,", "line by line."], d: "Three items, one total. The receipt is the first record of the day." },
  { k: "Shelf", t: ["The receipt", "becomes stock."], d: "The same lines reorganise into shelf counts. Bread slips below its reorder point." },
  { k: "Supplier", t: ["A low shelf", "becomes an order."], d: "Current stock, the threshold and a suggested purchase — in one line of sight." },
  { k: "Business", t: ["The rows", "become a chart."], d: "Every bill and every delivery adds up to a picture of the day." },
  { k: "System", t: ["One store.", "One system."], d: "Billing, stock, purchases, suppliers, customers, payments and reports — coordinated." },
];
const systems = ["Billing", "Inventory", "Purchases", "Suppliers", "Customers", "Payments", "Reports", "GST"];

/** One composition that changes form across five scenes. */
export function StoreStage({ scene }: { scene?: number }) {
  return (
    <div className="st" {...(scene !== undefined ? { "data-scene": String(scene) } : {})}>
      <div className="st-head">
        <V v={["Counter · INV-00241 · Walk-in", "Stock · On the shelf", "Purchases · Suggested reorder", "Insights · Today’s sales", "Grovio · Your store"]} />
        <span className="st-tag">Illustrative</span>
      </div>
      <div className="st-canvas">
        {items.map((it) => (
          <div key={it.k} className={cn("st-row", `r-${it.k}`)}>
            <span className="st-name">
              {it.name}
              <small>{it.unit}</small>
            </span>
            <span className="st-qty">{it.qty}</span>
            <span className="st-price">{it.price}</span>
            <span className="st-stock">
              <span className="st-bar">
                <span style={{ transform: `scaleX(${it.w / 100})` }} />
              </span>
              <b>{it.stock}</b> units
            </span>
            {it.k === "bread" && <span className="st-flag">Below reorder point · 10</span>}
          </div>
        ))}
        <div className="st-total">
          <span>Total · paid by UPI</span>
          <strong>₹137</strong>
        </div>
        <div className="st-flow">
          <div>
            <small>Source</small>
            <strong>Local bakery</strong>
            <span>Preferred supplier</span>
          </div>
          <div className="st-flow-line">
            <span>24 loaves</span>
          </div>
          <div>
            <small>Shelf</small>
            <strong>
              8 <i>→</i> 32
            </strong>
            <span>Reorder at 10 · Suggested 24</span>
          </div>
          <p className="st-ready">
            <Check size={14} /> Purchase order prepared
          </p>
        </div>
        <svg className="st-chart" viewBox="0 0 800 360" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength={1} d="M0 350 L150 330 L260 250 L330 236 L470 210 L620 120 L800 40" />
        </svg>
        <div className="st-labels">
          <span style={{ left: "32%", top: "64%" }}>10:42 · ₹6,240</span>
          <span style={{ left: "57%", top: "52%" }}>13:32 · ₹10,000</span>
          <span style={{ left: "84%", top: "16%" }}>20:00 · ₹18,420</span>
        </div>
        <div className="st-system">
          {systems.map((s, i) => (
            <span key={s} style={{ transitionDelay: `${i * 60}ms` }}>
              <em>0{i + 1}</em>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const pulse = [
  { Icon: Package, t: "Low stock detected", d: "Bread — 8 remaining, reorder point 10" },
  { Icon: Truck, t: "Purchase received", d: "24 loaves from Local bakery" },
  { Icon: ChartLine, t: "Sales milestone", d: "₹10,000 reached" },
  { Icon: ReceiptText, t: "Day closed", d: "86 bills · ₹18,420" },
];

/** Today: the same workspace, five moments of one day. */
export function TodayDay() {
  return (
    <div className="td" data-pin="5" data-rest="4" data-scene="4">
      <div className="td-sticky">
        <div className="td-clock" aria-hidden="true">
          <V v={["09:00", "10:42", "11:18", "13:32", "20:00"]} />
          <small>
            <V v={["Morning overview", "A sale is recorded", "Stock changes", "Pulse speaks up", "End of day"]} />
          </small>
        </div>
        <div className="td-ui">
          <div className="td-top">
            <span>Today · Sharma Provision Store</span>
            <span className="st-tag">Illustrative day</span>
          </div>
          <h3>
            <V
              v={[
                "Good morning, Ramesh. 2 things need your attention.",
                "Bill INV-00241 completed. Bread is now low.",
                "The bakery delivery is on the shelf.",
                "₹10,000 before lunch is over.",
                "A good day, Ramesh. Here’s how it went.",
              ]}
            />
          </h3>
          <div className="td-metrics">
            <div>
              <span>Sales</span>
              <strong>
                <V v={["₹0", "₹6,240", "₹7,980", "₹10,000", "₹18,420"]} />
              </strong>
            </div>
            <div>
              <span>Bills</span>
              <strong>
                <V v={[0, 31, 39, 52, 86]} />
              </strong>
            </div>
            <div className="td-bread">
              <span>Bread on shelf</span>
              <strong>
                <V v={[9, 8, 32, 27, 19]} />
              </strong>
              <small>
                <V v={["1 above reorder point", "Below reorder point", "Restocked +24", "Healthy", "14 sold today"]} />
              </small>
            </div>
          </div>
          <div className="td-lower">
            <div className="td-attn">
              <p className="td-label">Needs attention</p>
              <p className="td-a1">
                <Package size={15} />
                <span>
                  <V v={["Bread close to reorder point", "Bread below reorder point", "Bread restocked", "Bread restocked", "Bread restocked"]} />
                </span>
              </p>
              <p>
                <Wallet size={15} />
                <span>
                  <V v={["Payment to follow up · ₹1,240", "Payment to follow up · ₹1,240", "Payment to follow up · ₹1,240", "Payment to follow up · ₹1,240", "Payment collected · ₹1,240"]} />
                </span>
              </p>
            </div>
            <ol className="td-pulse" aria-label="Pulse">
              <p className="td-label">Pulse</p>
              {pulse.map(({ Icon, t, d }, i) => (
                <li key={t} className={`ev ev${i + 1}`}>
                  <Icon size={14} />
                  <span>
                    <strong>{t}</strong>
                    {d}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
