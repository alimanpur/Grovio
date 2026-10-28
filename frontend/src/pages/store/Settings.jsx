import { useEffect, useState } from 'react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { SectionNav, Section, DataState, useToast, ToastHost, StatusBadge } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { inr, num } from '@/lib/format.js'

const inputCls =
  'ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary'

const GSTIN_RE = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export default function Settings() {
  const [toast, show] = useToast()
  const profile = useApi(() => api.settings.profile(), { immediate: true })
  const preferences = useApi(() => api.settings.preferences(), { immediate: true })

  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    fssai: '',
    hours: '',
    businessType: '',
    logoUrl: '',
    currency: 'INR',
    timezone: 'IST',
  })
  const [prefForm, setPrefForm] = useState({
    lowStockAlerts: true,
    expiryAlerts: true,
    dailySummary: true,
    soundOnScan: false,
    roundTotals: true,
  })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (profile.data?.store) {
      const store = profile.data.store
      setForm({
        name: store.name ?? '',
        ownerName: store.ownerName ?? '',
        phone: store.phone ?? '',
        email: store.email ?? '',
        address: store.address ?? '',
        gstNumber: store.gstNumber ?? '',
        fssai: store.fssai ?? '',
        hours: store.hours ?? '',
        businessType: store.businessType ?? '',
        logoUrl: store.logoUrl ?? '',
        currency: store.currency ?? 'INR',
        timezone: store.timezone ?? 'IST',
      })
    }
  }, [profile.data])

  useEffect(() => {
    if (preferences.data?.preferences) {
      const prefs = preferences.data.preferences
      setPrefForm({
        lowStockAlerts: prefs.lowStockAlerts ?? true,
        expiryAlerts: prefs.expiryAlerts ?? true,
        dailySummary: prefs.dailySummary ?? true,
        soundOnScan: prefs.soundOnScan ?? false,
        roundTotals: prefs.roundTotals ?? true,
      })
    }
  }, [preferences.data])

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? e.target.checked : (value ?? '') })
    setDirty(true)
  }

  const prefChange = (e) => {
    const { name, type, checked } = e.target
    setPrefForm({ ...prefForm, [name]: type === 'checkbox' ? checked : e.target.value })
    setDirty(true)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await api.settings.saveProfile(form)
      // Preferences are owner-only on the server; a non-owner who reaches this
      // page still gets their profile saved, so a 403 here is not fatal.
      try {
        await api.settings.savePreferences(prefForm)
      } catch (prefErr) {
        if (prefErr?.status !== 403) throw prefErr
      }
      show('Settings saved')
      setDirty(false)
      profile.refresh()
      preferences.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleGstin = (e) => {
    const val = e.target.value.toUpperCase()
    setForm({ ...form, gstNumber: val })
    setDirty(true)
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Store \u00b7 Settings</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Your store profile and preferences</h1>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav sections={[
          { id: 'settings-profile', label: 'Profile' },
          { id: 'settings-preferences', label: 'Preferences' },
        ]} />

        <Section id="settings-profile" title="Store profile" hint="This information appears on invoices and receipts.">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Store name">
              <input required value={form.name} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Owner name">
              <input value={form.ownerName} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={handleChange} className={inputCls} placeholder="+91 99999 99999" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input value={form.address} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="GSTIN">
              <input value={form.gstNumber} onChange={handleGstin} className={inputCls} maxLength={20} />
            </Field>
            <Field label="FSSAI">
              <input value={form.fssai} onChange={handleChange} className={inputCls} maxLength={20} />
            </Field>
            <Field label="Opening hours">
              <input value={form.hours} onChange={handleChange} className={inputCls} placeholder="9 AM \u2013 9 PM" />
            </Field>
            <Field label="Business type">
              <input value={form.businessType} onChange={handleChange} className={inputCls} placeholder="Kirana / Supermarket" />
            </Field>
            <Field label="Logo URL" className="sm:col-span-2">
              <input value={form.logoUrl} onChange={handleChange} className={inputCls} placeholder="https://" />
            </Field>
            <Field label="Currency">
              <input value={form.currency} onChange={handleChange} className={inputCls} maxLength={3} />
            </Field>
            <Field label="Timezone">
              <input value={form.timezone} onChange={handleChange} className={inputCls} />
            </Field>
            <div className="sm:col-span-2 flex items-center justify-between gap-3 border-t border-border pt-4">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</Button>
            </div>
          </form>
        </Section>

        <Section id="settings-preferences" title="Preferences" hint="These affect notifications and behaviour across the store.">
          <form onSubmit={save} className="space-y-4">
            <Field label="Low stock alerts">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prefForm.lowStockAlerts} onChange={prefChange} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm">Notify me when stock falls below minimum</span>
              </label>
            </Field>
            <Field label="Expiry alerts">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prefForm.expiryAlerts} onChange={prefChange} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm">Warn me about products expiring within 30 days</span>
              </label>
            </Field>
            <Field label="Daily summary">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prefForm.dailySummary} onChange={prefChange} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm">Send a daily sales summary notification</span>
              </label>
            </Field>
            <Field label="Sound on scan">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prefForm.soundOnScan} onChange={prefChange} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm">Play a sound when a barcode is scanned at the counter</span>
              </label>
            </Field>
            <Field label="Round totals">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prefForm.roundTotals} onChange={prefChange} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm">Round invoice totals to the nearest rupee</span>
              </label>
            </Field>
            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save preferences'}</Button>
            </div>
          </form>
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