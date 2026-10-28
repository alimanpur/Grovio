import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Cloud,
  Compass,
  Database,
  FlaskConical,
  GraduationCap,
  Heart,
  Layers,
  Lightbulb,
  Mic,
  Quote,
  Receipt,
  RefreshCw,
  Scan,
  ShieldCheck,
  Sparkles,
  Sprout,
  Truck,
  Users,
  Wand2,
} from 'lucide-react'
import { GrovioMark } from '@/components/grovio/AppShell.jsx'
import { Divider, Reveal, ScrollProgress, StorySection } from '@/components/grovio/story.jsx'

const mission = [
  { icon: Wand2, title: 'Simplify Retail Operations', body: 'Technology should reduce effort instead of increasing complexity.' },
  { icon: Sprout, title: 'Empower Small Businesses', body: 'Modern retail software should be accessible to every grocery store, regardless of size.' },
  { icon: Compass, title: 'Build With Purpose', body: 'Every feature in Grovio exists to solve a real business problem.' },
  { icon: Heart, title: 'Grow Together', body: 'As businesses grow, Grovio should grow with them through scalable features and continuous innovation.' },
]

const different = [
  { icon: Receipt, title: 'Unified Billing', body: 'Generate professional invoices with automatic calculations and printable receipts.' },
  { icon: Boxes, title: 'Inventory Intelligence', body: 'Track products, monitor stock levels and receive timely inventory alerts.' },
  { icon: Truck, title: 'Purchase Management', body: 'Manage suppliers, purchase history and stock updates from one place.' },
  { icon: Users, title: 'Customer Management', body: 'Maintain customer history, transactions and business relationships.' },
  { icon: BarChart3, title: 'Business Insights', body: 'Understand sales performance through meaningful reports and analytics.' },
  { icon: FlaskConical, title: 'Future Ready', body: 'Designed with future technologies like AI invoice reading, voice billing and smart inventory prediction in mind.' },
]

const philosophy = [
  { k: 'One Platform', v: 'Everything connected.' },
  { k: 'One Workflow', v: 'Everything simplified.' },
  { k: 'One Source of Truth', v: 'Every transaction updates the business automatically.' },
  { k: 'One Better Business', v: 'Technology that helps people focus on customers rather than paperwork.' },
]

const team = [
  { name: 'Aliasger Manpurwala', role: 'Project Lead', initials: 'AM', skills: ['Frontend Development', 'Product Design', 'UI/UX', 'Product Strategy'], quote: "We believe great software disappears behind the user's workflow." },
  { name: 'Kanishk Desai', role: 'Backend Engineering', initials: 'KD', skills: ['Backend Development', 'Database Design', 'API Development', 'Authentication'], quote: 'A strong foundation creates reliable software.' },
  { name: 'Madhur Vyas', role: 'Research & Experience', initials: 'MV', skills: ['Research', 'User Experience', 'Testing', 'Documentation', 'Product Research'], quote: 'Technology should solve real-world problems through thoughtful design.' },
]

const journey = [
  'Research & Problem Identification',
  'User Research',
  'Product Planning',
  'Wireframes',
  'UI/UX Design',
  'Frontend Development',
  'Backend Development',
  'Testing',
  'Project Presentation',
]

const stack = [
  { label: 'Frontend', items: ['React', 'Vite', 'Tailwind CSS'], icon: Layers },
  { label: 'Backend', items: ['Node.js', 'Express.js'], icon: Database },
  { label: 'Database', items: ['MongoDB'], icon: Database },
  { label: 'Authentication', items: ['JWT'], icon: ShieldCheck },
  { label: 'Future Integrations', items: ['OCR', 'Artificial Intelligence', 'Barcode Scanner', 'Cloud Backup', 'Analytics'], icon: Sparkles },
]

const shipped = [
  'Professional Billing',
  'Inventory Management',
  'Purchase Management',
  'Customer Management',
  'Reports',
  'Invoice Generation',
]

const soon = [
  { label: 'AI Invoice Reader', icon: Wand2 },
  { label: 'Voice Billing', icon: Mic },
  { label: 'Smart Inventory Forecasting', icon: BarChart3 },
  { label: 'Barcode Scanner', icon: Scan },
  { label: 'WhatsApp Invoice', icon: Receipt },
  { label: 'Cloud Backup', icon: Cloud },
  { label: 'Offline Mode', icon: RefreshCw },
  { label: 'Multi Store Support', icon: Boxes },
  { label: 'Customer Loyalty', icon: Heart },
  { label: 'Mobile Application', icon: Sparkles },
]

const values = [
  { icon: Lightbulb, title: 'Innovation', body: 'Create meaningful solutions.' },
  { icon: Compass, title: 'Simplicity', body: 'Keep every workflow easy to understand.' },
  { icon: ShieldCheck, title: 'Reliability', body: 'Build software users can trust every day.' },
  { icon: RefreshCw, title: 'Continuous Improvement', body: 'Always learn. Always improve.' },
]

const academic = [
  { label: 'Project', lines: ['Semester V Mini Project'] },
  { label: 'Department', lines: ['Bachelor of Technology', 'Computer Science and Engineering'] },
  { label: 'Institution', lines: ['IPS Academy, Institute of Engineering & Science'] },
  { label: 'University', lines: ['Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)'] },
  { label: 'Academic Session', lines: ['2026–2027'] },
  { label: 'Guide', lines: ['Prof. ______________________'] },
]

export default function StoryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgress />

      {/* Slim story header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-10">
          <GrovioMark />
          <Link
            to="/app/today"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to workspace
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-accent), transparent 70%)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-32 top-40 h-[30rem] w-[30rem] rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-saffron), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-28 pt-24 sm:pt-32 lg:px-10">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-sprout" />
              The Grovio Story
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="display mt-8 text-[3.2rem] leading-[0.95] tracking-tight sm:text-[5.2rem]">GROVIO</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-3xl text-xl leading-snug text-ink-soft sm:text-[2rem]">
              The Operating System for Modern Grocery Stores
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 grid gap-6 border-l-2 border-sprout/60 pl-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              <p>
                Grovio is a modern retail operating system built to simplify the everyday operations of small and
                medium grocery stores.
              </p>
              <p>
                Instead of managing billing, inventory, suppliers and business records across different notebooks and
                disconnected software, Grovio brings everything together into one intelligent and easy-to-use platform.
              </p>
              <p className="text-foreground">
                Our goal is simple: help grocery store owners spend less time managing operations and more time growing
                their business.
              </p>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-12 flex flex-wrap items-center gap-3">
              <Link
                to="/app/today"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Open the workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#story"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                Read our story
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* OUR STORY */}
      <StorySection id="story" eyebrow="Our Story" title="Why We Built Grovio" lede="It started with a counter, a calculator and a register that never quite added up.">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {[
              'During our research, we observed that many local grocery stores still rely on handwritten registers, calculators and manual inventory management.',
              'These traditional methods often lead to billing errors, inventory mismatches, delayed business decisions and unnecessary paperwork.',
              'While enterprise retail software already exists, it is often expensive, difficult to use and filled with features that small grocery businesses rarely need.',
              'We wanted to build something different.',
              'Instead of creating another billing application, we envisioned a complete Retail Operating System that is affordable, intuitive and designed specifically for neighbourhood grocery stores.',
            ].map((p, i) => (
              <Reveal key={p} delay={i * 70}>
                <p className={i === 3 ? 'text-foreground' : undefined}>{p}</p>
              </Reveal>
            ))}
            <Reveal delay={400}>
              <p className="display text-2xl text-foreground sm:text-3xl">That vision became Grovio.</p>
            </Reveal>
          </div>

          <Reveal delay={180}>
            <div className="panel relative overflow-hidden p-8">
              <p className="eyebrow">Before Grovio</p>
              <div className="mt-5 grid gap-3">
                {['Paper register for daily sales', 'Calculator for every bill', 'Stock counted from memory', 'Supplier dues on loose slips'].map((t) => (
                  <div
                    key={t}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-clay" />
                    {t}
                  </div>
                ))}
              </div>
              <div className="my-7 h-px bg-border" />
              <p className="eyebrow">With Grovio</p>
              <div className="mt-5 grid gap-3">
                {['One tap invoices, GST ready', 'Live stock with expiry alerts', 'Supplier ledger always current', 'Insights the moment a sale happens'].map((t) => (
                  <div key={t} className="flex items-center gap-3 rounded-xl bg-accent/60 px-4 py-3 text-sm text-accent-foreground">
                    <BadgeCheck className="h-4 w-4 text-sprout-foreground" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </StorySection>

      <Divider />

      {/* MISSION */}
      <StorySection eyebrow="Our Mission" title="Four commitments we design against" lede="Every decision in Grovio is measured against these four ideas.">
        <div className="grid gap-6 sm:grid-cols-2">
          {mission.map((m, i) => (
            <Reveal key={m.title} delay={i * 90}>
              <article className="panel group h-full p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-float">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground transition-transform duration-500 group-hover:rotate-6">
                  <m.icon className="h-5 w-5" />
                </span>
                <h3 className="display mt-6 text-xl">{m.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </StorySection>

      {/* DIFFERENT */}
      <section className="bg-surface-2/60 py-4">
        <StorySection eyebrow="What Makes Grovio Different" title="One platform for every counter decision">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {different.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <article className="panel h-full p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-float">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-6 text-base font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </StorySection>
      </section>

      {/* PHILOSOPHY */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-28 sm:py-36 lg:px-10">
          <Reveal>
            <p className="eyebrow text-primary-foreground/60">Product Philosophy</p>
            <h2 className="display mt-3 max-w-2xl text-[2rem] leading-tight sm:text-[2.9rem]">Four sentences that shape the whole product</h2>
          </Reveal>
          <div className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-primary-foreground/15 sm:grid-cols-2">
            {philosophy.map((p, i) => (
              <Reveal key={p.k} delay={i * 100}>
                <div className="h-full bg-primary p-9 transition-colors duration-500 hover:bg-primary-foreground/5">
                  <p className="num text-xs font-semibold text-primary-foreground/50">0{i + 1}</p>
                  <h3 className="display mt-4 text-2xl sm:text-[1.8rem]">{p.k}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">{p.v}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <StorySection eyebrow="Meet the Team" title="Designed & Developed by Trinity Tech" lede="Three Minds. One Vision. Building the Future of Retail." align="center">
        <div className="grid gap-6 lg:grid-cols-3">
          {team.map((m, i) => (
            <Reveal key={m.name} delay={i * 120}>
              <article className="panel flex h-full flex-col p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-float">
                <div className="flex items-center gap-4">
                  <span className="display grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-lg text-foreground">
                    {m.initials}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">{m.name}</h3>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-sprout-foreground">{m.role}</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {m.skills.map((s) => (
                    <span key={s} className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>
                <blockquote className="mt-7 flex-1 rounded-2xl bg-surface-2/70 p-5 text-sm italic leading-relaxed text-foreground">
                  <Quote className="mb-2 h-4 w-4 text-saffron" />
                  {m.quote}
                </blockquote>
              </article>
            </Reveal>
          ))}
        </div>
      </StorySection>

      <Divider />

      {/* JOURNEY */}
      <StorySection eyebrow="Our Development Journey" title="From a question at the counter to a shipped product">
        <div className="relative">
          <div className="absolute left-0 right-0 top-[1.35rem] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
          <div className="flex gap-6 overflow-x-auto pb-6 lg:gap-8">
            {journey.map((step, i) => (
              <Reveal key={step} delay={i * 70} className="min-w-[13rem] flex-1">
                <div className="relative">
                  <span className="num relative z-10 grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-xs font-semibold">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-6 text-sm font-semibold leading-snug">{step}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{i === journey.length - 1 ? 'Complete' : 'Milestone'}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </StorySection>

      {/* STACK */}
      <section className="bg-surface-2/60 py-4">
        <StorySection eyebrow="Technology Stack" title="Built on a deliberate, modern foundation">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stack.map((s, i) => (
              <Reveal key={s.label} delay={(i % 3) * 90}>
                <article className="panel h-full p-7">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <s.icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em]">{s.label}</h3>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {s.items.map((it) => (
                      <span key={it} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                        {it}
                      </span>
                    ))}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </StorySection>
      </section>

      {/* ROADMAP */}
      <StorySection eyebrow="Project Roadmap" title="What is live, and what comes next">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <article className="panel h-full p-8">
              <div className="flex items-center justify-between">
                <h3 className="display text-2xl">Current Release</h3>
                <span className="rounded-full bg-sprout/20 px-3 py-1 text-[11px] font-semibold text-sprout-foreground">Live</span>
              </div>
              <div className="mt-7 grid gap-3">
                {shipped.map((s) => (
                  <div key={s} className="flex items-center gap-3 rounded-xl bg-accent/50 px-4 py-3 text-sm text-accent-foreground">
                    <BadgeCheck className="h-4 w-4" />
                    {s}
                  </div>
                ))}
              </div>
            </article>
          </Reveal>
          <Reveal delay={120}>
            <article className="panel h-full p-8">
              <div className="flex items-center justify-between">
                <h3 className="display text-2xl">Coming Soon</h3>
                <span className="rounded-full bg-saffron/25 px-3 py-1 text-[11px] font-semibold text-saffron-foreground">In the lab</span>
              </div>
              <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
                {soon.map((s) => (
                  <div key={s.label} className="flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-3 text-[13px] transition-colors hover:bg-secondary">
                    <s.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="leading-snug">{s.label}</span>
                  </div>
                ))}
              </div>
            </article>
          </Reveal>
        </div>
      </StorySection>

      {/* ACADEMIC */}
      <section className="bg-surface-2/60 py-4">
        <StorySection eyebrow="Academic Information" title="Where Grovio was built">
          <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {academic.map((a, i) => (
              <Reveal key={a.label} delay={(i % 3) * 80}>
                <div className="h-full bg-card p-7">
                  <p className="eyebrow flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {a.label}
                  </p>
                  <div className="mt-3 grid gap-1">
                    {a.lines.map((l) => (
                      <p key={l} className="text-sm font-medium leading-snug">{l}</p>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </StorySection>
      </section>

      {/* VALUES */}
      <StorySection eyebrow="Our Values" title="How we work, every single day">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 90}>
              <article className="panel h-full p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-float">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-saffron/25 text-saffron-foreground">
                  <v.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-6 text-base font-semibold tracking-tight">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </StorySection>

      {/* THANK YOU */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          className="pointer-events-none absolute -bottom-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-sprout), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-6 py-32 text-center sm:py-40 lg:px-10">
          <Reveal>
            <Sprout className="mx-auto h-8 w-8 text-primary-foreground/70" />
            <h2 className="display mt-8 text-[2.6rem] leading-tight sm:text-[3.6rem]">Thank You</h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-8 grid gap-6 text-base leading-relaxed text-primary-foreground/80 sm:text-lg">
              <p>Thank you for exploring Grovio.</p>
              <p>
                We believe technology should empower local businesses, simplify everyday work and create opportunities
                for sustainable growth.
              </p>
              <p className="text-primary-foreground">
                Grovio is not just a semester project. It is our vision of how modern grocery stores can embrace
                digital transformation through thoughtful engineering, user-centered design and practical innovation.
              </p>
            </div>
          </Reveal>
          <Reveal delay={220}>
            <Link
              to="/app/today"
              className="mt-12 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
            >
              Enter Grovio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <GrovioMark />
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">Designed &amp; Developed by</p>
              <p className="display mt-1 text-xl">Trinity Tech</p>
            </div>
            <div>
              <p className="eyebrow">Members</p>
              <div className="mt-3 grid gap-1.5 text-sm">
                {team.map((m) => (
                  <p key={m.name}>{m.name}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">Version</p>
              <p className="num mt-3 text-sm">Grovio v1.0</p>
            </div>
            <div>
              <p className="eyebrow">Tagline</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">From Counter to Insight — One Platform. Every Operation.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
