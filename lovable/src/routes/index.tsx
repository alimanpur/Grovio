import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowDown, ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGrovioScroll } from "@/components/grovio/gv-motion";
import { Wordmark, StoreStage, TodayDay, V, sceneCopy } from "@/components/grovio/gv-scenes";
import "@/components/grovio/gv.css";

const description =
  "Grovio is the operating system for modern grocery stores: billing, inventory, purchasing, suppliers and business insights, connected in one workspace.";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GROVIO — The Operating System for Modern Grocery Stores" },
      { name: "description", content: description },
      { property: "og:title", content: "Run the store. Not the paperwork. — GROVIO" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GrovioLanding,
});

const pulseLog = [
  { time: "10:42", title: "Low stock detected", note: "Bread — 8 remaining. Reorder point is 10.", tone: "warn" },
  { time: "11:18", title: "Purchase received", note: "24 loaves from Local bakery. Shelf now 32." },
  { time: "13:32", title: "Sales milestone", note: "₹10,000 reached before lunch closed." },
  { time: "16:47", title: "Invoice generated", note: "INV-00248 · ₹137 · paid by UPI." },
];
const future = [
  ["Smarter forecasting", "Anticipate what each shelf will need next week."],
  ["Intelligent purchasing", "Orders drafted from stock, thresholds and supplier history."],
  ["Invoice intelligence", "Supplier bills read and reconciled with fewer checks."],
  ["New workflows", "Faster ways to bill and record at a busy counter."],
  ["Multi-store operations", "Several stores, one view of stock and sales."],
];
const words = [
  { w: "SELL.", c: "w-sell" },
  { w: "TRACK.", c: "w-track" },
  { w: "RESTOCK.", c: "w-restock" },
  { w: "UNDERSTAND.", c: "w-understand" },
  { w: "REPEAT BETTER.", c: "w-repeat" },
];

function GrovioLanding() {
  const root = useGrovioScroll();
  const [menu, setMenu] = useState(false);
  return (
    <div className="gv" ref={root}>
      <a href="#system" className="sr-only focus:not-sr-only">
        Skip to the product story
      </a>
      <header className="gv-nav">
        <Link to="/" aria-label="Grovio homepage" className="gv-in gv-in-1">
          <Wordmark />
        </Link>
        <nav className="gv-links gv-in gv-in-5" aria-label="Main navigation">
          <a href="#system">Product</a>
          <a href="#today">How it works</a>
          <a href="#future">Future</a>
        </nav>
        <div className="gv-actions gv-in gv-in-5">
          <Link to="/sign-in">Sign in</Link>
          <Button asChild size="sm">
            <Link to="/register">
              Get started <ArrowRight size={13} />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="gv-menu"
            aria-expanded={menu}
            aria-controls="gv-mobile-nav"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <X size={17} /> : <Menu size={17} />}
          </Button>
        </div>
        {menu && (
          <nav id="gv-mobile-nav" className="gv-mobile" aria-label="Mobile navigation">
            {[
              ["Product", "#system"],
              ["How it works", "#today"],
              ["Future", "#future"],
            ].map(([n, h]) => (
              <a key={h} href={h} onClick={() => setMenu(false)}>
                {n}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main>
        {/* HERO — editorial composition */}
        <section className="gv-hero" aria-labelledby="hero-title">
          <p className="gv-folio gv-in gv-in-1">
            <span>No. 01</span>
            <span>The operating system for modern grocery stores</span>
          </p>
          <h1 id="hero-title" className="gv-headline">
            <span className="gv-l1">
              <span>RUN THE STORE.</span>
            </span>
            <span className="gv-l2">
              <span>NOT THE PAPERWORK.</span>
            </span>
          </h1>
          <div className="gv-ledger" aria-hidden="true">
            <span className="gv-ledger-rule" />
            {["09:00 Open", "Counter", "Shelf", "Supplier", "Insight", "20:00 Close"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="gv-hero-foot">
            <p className="gv-hero-desc gv-in gv-in-4">
              Billing, inventory, purchasing, suppliers and business insights — connected in one
              workspace.
            </p>
            <div className="gv-ctas gv-in gv-in-5">
              <Button asChild size="lg">
                <Link to="/register">
                  Start with Grovio <ArrowRight size={15} />
                </Link>
              </Button>
              <a href="#system" className="gv-text-link">
                Explore the system <ArrowDown size={14} />
              </a>
            </div>
            <figure className="gv-slip gv-in-slip" aria-label="Illustrative receipt">
              <figcaption>INV-00241 · 10:42</figcaption>
              <p>
                <span>Milk</span>
                <b>₹62</b>
              </p>
              <p>
                <span>Bread</span>
                <b>₹45</b>
              </p>
              <p>
                <span>Biscuits</span>
                <b>₹30</b>
              </p>
              <p className="gv-slip-total">
                <span>Total</span>
                <b>₹137</b>
              </p>
            </figure>
          </div>
        </section>

        {/* SIGNATURE — the store changes form */}
        <section id="system" className="sg" data-pin="5" data-rest="0" data-scene="0" aria-label="How one store becomes one system">
          <div className="sg-sticky">
            <aside className="sg-copy">
              <p className="sg-index">
                <V v={["01", "02", "03", "04", "05"]} /> <span>/ 05</span>
              </p>
              <ol className="sg-steps" aria-hidden="true">
                {sceneCopy.map((s, i) => (
                  <li key={s.k} className={`step step${i}`}>
                    {s.k}
                  </li>
                ))}
              </ol>
              <div className="sg-titles">
                {sceneCopy.map((s, i) => (
                  <div key={s.k} className={`sg-t sg-t${i}`}>
                    <h2>
                      <span>{s.t[0]}</span>
                      <span>{s.t[1]}</span>
                    </h2>
                    <p>{s.d}</p>
                  </div>
                ))}
              </div>
              <span className="sg-progress" aria-hidden="true">
                <span />
              </span>
            </aside>
            <StoreStage />
          </div>
        </section>
        <section className="sg-mobile" aria-label="How one store becomes one system">
          {sceneCopy.map((s, i) => (
            <article key={s.k} className="sg-m rv">
              <p className="sg-index">
                0{i + 1} <span>/ {s.k}</span>
              </p>
              <h2>
                {s.t[0]} {s.t[1]}
              </h2>
              <p>{s.d}</p>
              <StoreStage scene={i} />
            </article>
          ))}
        </section>

        {/* INTERLUDE — typography only */}
        <section className="il" aria-label="The rhythm of a store">
          {words.map(({ w, c }) => (
            <p key={w} className={`il-w ${c} rv`}>
              <span>{w}</span>
            </p>
          ))}
        </section>

        {/* TODAY — a day unfolds */}
        <section id="today" className="gv-today">
          <div className="gv-sec-head rv">
            <p className="gv-folio">
              <span>No. 03</span>
              <span>Today</span>
            </p>
            <h2 className="gv-h2">
              START THE DAY KNOWING
              <br />
              <em>WHAT NEEDS YOUR ATTENTION.</em>
            </h2>
          </div>
          <TodayDay />
        </section>

        {/* PULSE — vertical ledger */}
        <section className="pl" aria-labelledby="pulse-title">
          <div className="pl-head rv">
            <p className="gv-folio">
              <span>No. 04</span>
              <span>Pulse</span>
            </p>
            <h2 id="pulse-title" className="gv-h2">
              THE STORE SPEAKS.
              <br />
              <em>GROVIO LISTENS.</em>
            </h2>
            <p className="pl-note">One quiet stream of what happened. Illustrative activity.</p>
          </div>
          <ol className="pl-log">
            {pulseLog.map((e) => (
              <li key={e.time} className={`pl-e rv ${e.tone === "warn" ? "pl-warn" : ""}`}>
                <time>{e.time}</time>
                <div>
                  <h3>{e.title}</h3>
                  <p>{e.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ANALYTICS — the data moves */}
        <section className="an" aria-labelledby="an-title">
          <div className="an-head rv">
            <h2 id="an-title" className="gv-h2">
              STOP GUESSING
              <br />
              <em>HOW THE STORE IS DOING.</em>
            </h2>
            <p>
              See what sells, what moves, what slows down and where the money goes — from today’s
              counter to tomorrow’s decision.
            </p>
          </div>
          <figure className="an-chart rv" aria-label="Illustrative cumulative sales for one day, rising to ₹18,420">
            <div className="an-total">
              <span>Today’s sales · illustrative</span>
              <strong>₹18,420</strong>
              <small>86 bills · ↗ 12.4% vs yesterday</small>
            </div>
            <svg viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true">
              {[80, 180, 280, 380].map((y) => (
                <line key={y} x1="0" x2="1200" y1={y} y2={y} className="an-grid" />
              ))}
              <path className="an-area" d="M0 400 L180 380 L300 290 L380 270 L540 240 L760 150 L1200 40 L1200 400 Z" />
              <path className="an-line" pathLength={1} d="M0 400 L180 380 L300 290 L380 270 L540 240 L760 150 L1200 40" />
            </svg>
            {[
              { x: "25%", y: "69%", t: "10:42", v: "₹6,240", d: "Morning rush" },
              { x: "45%", y: "57%", t: "13:32", v: "₹10,000", d: "Lunch peak" },
              { x: "63%", y: "36%", t: "17:30", v: "₹14,200", d: "Evening top-up" },
              { x: "97%", y: "10%", t: "20:00", v: "₹18,420", d: "Close" },
            ].map((p, i) => (
              <span key={p.t} className="an-pt" style={{ left: p.x, top: p.y, transitionDelay: `${1.2 + i * 0.25}s` }}>
                <i />
                <b>{p.v}</b>
                <small>
                  {p.t} · {p.d}
                </small>
              </span>
            ))}
            <div className="an-axis">
              <span>09:00</span>
              <span>12:00</span>
              <span>15:00</span>
              <span>18:00</span>
              <span>20:00</span>
            </div>
          </figure>
        </section>

        {/* FUTURE LAB — a new atmosphere */}
        <section id="future" className="fl" aria-labelledby="fl-title">
          <div className="fl-head rv">
            <p className="gv-folio">
              <span>No. 06</span>
              <span>Future Lab · Planned directions, not yet available</span>
            </p>
            <h2 id="fl-title" className="gv-h2">
              BUILT FOR THE STORE
              <br />
              <em>YOU’LL RUN TOMORROW.</em>
            </h2>
          </div>
          <ol className="fl-row">
            {future.map(([t, d], i) => (
              <li key={t} className="fl-item rv" style={{ transitionDelay: `${i * 0.12}s` }}>
                <span>0{i + 1} · Future direction</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FINAL — the forms resolve */}
        <section className="fn" aria-labelledby="fn-title">
          <div className="fn-forms rv" aria-hidden="true">
            <span className="fn-f fn-receipt">
              <i>Receipt</i>₹137
            </span>
            <span className="fn-f fn-shelf">
              <i>Shelf</i>Bread · 8
            </span>
            <span className="fn-f fn-order">
              <i>Order</i>+24 loaves
            </span>
            <span className="fn-f fn-chart">
              <i>Insight</i>₹18,420
            </span>
          </div>
          <div className="fn-statement rv">
            <h2 id="fn-title">
              <span>YOUR STORE.</span>
              <span>YOUR NUMBERS.</span>
              <span className="fn-one">ONE GROVIO.</span>
            </h2>
            <div className="gv-ctas">
              <Button asChild size="lg">
                <Link to="/register">
                  Start with Grovio <ArrowRight size={15} />
                </Link>
              </Button>
              <Link to="/today" className="gv-text-link">
                Explore the product <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="gv-foot">
        <Wordmark />
        <p>From Counter to Insight — One Platform. Every Operation.</p>
        <nav aria-label="Footer navigation">
          <a href="#system">Product</a>
          <a href="#today">How it works</a>
          <a href="#future">Future Lab</a>
          <Link to="/sign-in">Sign in</Link>
          <Link to="/register">Get started</Link>
          <Link to="/story">The Grovio story</Link>
        </nav>
        <small>© 2026 Grovio</small>
      </footer>
    </div>
  );
}
