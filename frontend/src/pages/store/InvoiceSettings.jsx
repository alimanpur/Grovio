import { useEffect, useState } from 'react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { SectionNav, Section, DataState, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Field } from '@/components/grovio/settings-kit.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'

const inputCls =
  'ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary'

export default function InvoiceSettings() {
  const [toast, show] = useToast()
  const settings = useApi(() => api.settings.invoice(), { immediate: true })
  const [form, setForm] = useState({ prefix: '', terms: '', footerNote: '', showQr: true, showBarcode: false, upiId: '' })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (settings.data?.settings) {
      setForm(settings.data.settings)
    }
  }, [settings.data])

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await api.settings.saveInvoice(form)
      show('Invoice settings saved')
      setDirty(false)
      settings.refresh()
      } catch (err) {
      show(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? e.target.checked : value })
    setDirty(true)
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Store \u00b7 Invoice</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">What your invoices look like</h1>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav sections={[{ id: 'invoice-form', label: 'Invoice settings' }]} />

        <Section id="invoice-form" title="Invoice settings" hint="Changes apply to new invoices immediately.">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Prefix">
              <input required maxLength={5} value={form.prefix} onChange={handleChange} className={inputCls} placeholder="GRV" />
            </Field>
            <Field label="UPI ID">
              <input value={form.upiId} onChange={handleChange} className={inputCls} placeholder="store@upi" />
            </Field>
            <Field label="Show QR code">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.showQr} onChange={handleChange} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm">Display UPI QR on invoices</span>
              </label>
            </Field>
            <Field label="Show barcode">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.showBarcode} onChange={handleChange} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm">Display invoice barcode</span>
              </label>
            </Field>
            <Field label="Terms & conditions" className="sm:col-span-2">
              <textarea rows={4} value={form.terms} onChange={handleChange} className={inputCls.replace('h-10', 'h-24')} placeholder="Payment terms, return policy, etc." />
            </Field>
            <Field label="Footer note" className="sm:col-span-2">
              <textarea rows={2} value={form.footerNote} onChange={handleChange} className={inputCls} placeholder="Thank you for your business!" />
            </Field>
            <div className="sm:col-span-2 flex items-center justify-between gap-3 border-t border-border pt-4">
              {dirty ? <span className="text-xs text-muted-foreground">Unsaved changes</span> : null}
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Saving...' : 'Save settings'}
              </Button>
            </div>
          </form>
        </Section>
      </div>

      <ToastHost toast={toast} />
    </AppShell>
  )
}