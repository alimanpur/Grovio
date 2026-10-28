import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageSquare, Phone, Search } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { SectionNav, Section, DataState, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'

export default function Help() {
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ subject: '', message: '' })
  const [toast, show] = useToast()

  const faqs = [
    {
      q: 'How do I add a new product?',
      a: 'Go to Stock \u2192 Products, click "New product", fill in the name, price, and stock, then save.',
    },
    {
      q: 'Can I bill on credit?',
      a: 'Yes. At the counter, choose "Credit" as the payment method and select or create a customer.',
    },
    {
      q: 'How do I record a return?',
      a: 'Go to Counter \u2192 Returns, pick the original bill, choose the items and quantities, then save.',
    },
    {
      q: 'How do I see what I owe a supplier?',
      a: 'Go to Stock \u2192 Suppliers \u2192 Outstanding. It shows the total owed per supplier.',
    },
    {
      q: 'How do I change the GST rate on a product?',
      a: 'Edit the product in Stock \u2192 Products. The GST rate dropdown shows the slabs configured in Settings \u2192 Taxes.',
    },
    {
      q: 'How do I export my data?',
      a: 'Go to Store \u2192 Backup, click "Download backup". It downloads a complete JSON of your store.',
    },
    {
      q: 'Can I have multiple users?',
      a: 'Yes. Go to Store \u2192 Users, click "Add person" and choose their role (Cashier, Manager, Owner).',
    },
    {
      q: 'How do I print an invoice?',
      a: 'Open any bill in Bills, click Print. You can also print from the Billing screen after saving.',
    },
    {
      q: 'What does "round totals" do?',
      a: 'It rounds the final invoice total to the nearest rupee. Enable it in Settings \u2192 Preferences.',
    },
  ]

  const submit = async (e) => {
    e.preventDefault()
    try {
      // In a real app this would POST to an API endpoint
      show('Message sent. We\'ll get back to you soon.')
      setForm({ subject: '', message: '' })
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = faqs.filter((f) =>
    `${f.q} ${f.a}`.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Store \u00b7 Help</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Need a hand?</h1>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav sections={[
          { id: 'help-faqs', label: 'FAQs' },
          { id: 'help-contact', label: 'Contact us' },
        ]} />

        <Section id="help-faqs" title="Frequently asked questions" hint="Search for an answer or browse the list.">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help articles..."
              className="ring-focus h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <DataState loading={false} error={null} skeleton={<div className="mt-4"><DataState.Skeleton rows={5} /></div>}>
            {filtered.length === 0 ? (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">No results for \u201c{query}\u201d. Try a different search term.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {filtered.map((f) => (
                  <details key={f.q} className="group rounded-md border border-border bg-surface p-4">
                    <summary className="flex items-center gap-2 cursor-pointer list-none">
                      <span className="text-sm font-semibold">{f.q}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground group-open:rotate-180 transition-transform">\u25bc</span>
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            )}
          </DataState>
        </Section>

        <Section id="help-contact" title="Still need help?" hint="We're a small team and we read every message.">
          <form onSubmit={submit} className="max-w-xl space-y-4">
            <Field label="Subject">
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="ring-focus mt-1 h-10 w-full rounded-md border border-input bg-surface px-3 text-sm">
                <option value="">Choose a topic</option>
                <option value="bug">Bug report</option>
                <option value="feature">Feature request</option>
                <option value="billing">Billing question</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Email">
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="your@email.com" />
            </Field>
            <Field label="Message">
              <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="ring-focus mt-1 block w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Tell us what happened or what you need..." />
            </Field>
            <Button type="submit" className="w-full" disabled={sending}>{sending ? 'Sending...' : 'Send message'}</Button>
          </form>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link to="mailto:support@grovio.example.com" className="panel p-4 flex items-center gap-3 hover:bg-accent transition-colors">
              <Mail className="h-5 w-5 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-semibold">Email us</p>
                <p className="text-xs text-muted-foreground">support@grovio.example.com</p>
              </div>
            </Link>
            <Link to="tel:+918000000000" className="panel p-4 flex items-center gap-3 hover:bg-accent transition-colors">
              <Phone className="h-5 w-5 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-semibold">Call us</p>
                <p className="text-xs text-muted-foreground">1800-XXX-XXXX (Mon\u2013Fri, 9\u20136)</p>
              </div>
            </Link>
            <Link to="https://chat.grovio.example.com" className="panel p-4 flex items-center gap-3 hover:bg-accent transition-colors">
              <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-semibold">Live chat</p>
                <p className="text-xs text-muted-foreground">Mon\u2013Fri, 9\u20136</p>
              </div>
            </Link>
          </div>
        </Section>
      </div>

      <ToastHost toast={toast} />
    </AppShell>
  )
}

function Field({ label, children }) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  )
}

const inputCls =
  'ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary'