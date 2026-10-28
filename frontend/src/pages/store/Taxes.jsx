import { useEffect, useState } from 'react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { SectionNav, Section, DataState, useToast, ToastHost, StatusBadge } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { inr } from '@/lib/format.js'

const GST_OPTIONS = [0, 5, 12, 18, 28]

export default function Taxes() {
  const [toast, show] = useToast()
  const taxes = useApi(() => api.settings.taxes(), { immediate: true })
  const [form, setForm] = useState({ taxes: [] })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (taxes.data?.taxes) setForm({ taxes: taxes.data.taxes.map((t) => ({ ...t })) })
  }, [taxes.data])

  const add = () => {
    setForm({ taxes: [...form.taxes, { rate: 0, label: '', enabled: true }] })
    setDirty(true)
  }

  const remove = (i) => {
    if (form.taxes.length <= 1) return
    setForm({ taxes: form.taxes.filter((_, idx) => idx !== i) })
    setDirty(true)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await api.settings.saveTaxes({ taxes: form.taxes })
      show('GST slabs saved. New bills will use these rates.')
      setDirty(false)
      taxes.refresh()
      } catch (err) {
      show(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (i, field, value) => {
    setForm({
      taxes: form.taxes.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)),
    })
    setDirty(true)
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Store \u00b7 GST</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">GST slabs for new bills</h1>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav sections={[{ id: 'taxes-form', label: 'GST slabs' }]} />

        <Section id="taxes-form" title="GST slabs" hint="Only the slabs marked \u2018enabled\u2019 can be chosen when creating a product. Changing slabs does not rewrite historical bills.">
          <form onSubmit={save} className="space-y-4">
            {form.taxes.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 border rounded-md bg-surface p-3">
                <label className="text-xs text-muted-foreground">Rate</label>
                <select
                  value={t.rate}
                  onChange={(e) => handleChange(i, 'rate', Number(e.target.value))}
                  className="ring-focus h-10 w-20 rounded-md border border-input bg-surface px-2 text-sm"
                >
                  {GST_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
                <label className="text-xs text-muted-foreground">Label</label>
                <input
                  value={t.label}
                  onChange={(e) => handleChange(i, 'label', e.target.value)}
                  className="ring-focus flex-1 h-10 rounded-md border border-input bg-surface px-3 text-sm"
                  placeholder="Optional \u2014 e.g. Food, Textiles"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={t.enabled} onChange={(e) => handleChange(i, 'enabled', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                  Enabled
                </label>
                {form.taxes.length > 1 ? (
                  <button type="button" onClick={() => remove(i)} className="ring-focus h-8 w-8 rounded-md border border-border hover:bg-muted" aria-label="Remove slab">
                    \u00d7
                  </button>
                ) : null}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={add}>Add slab</Button>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              {dirty ? <span className="text-xs text-muted-foreground">Unsaved changes</span> : null}
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save slabs'}</Button>
            </div>
          </form>
        </Section>
      </div>

      <ToastHost toast={toast} />
    </AppShell>
  )
}