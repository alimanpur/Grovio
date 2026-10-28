import { useState } from 'react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { SectionNav, Section, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'

const inputCls =
  'ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary'

export default function ChangePassword() {
  const [toast, show] = useToast()
  const [form, setForm] = useState({ current: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async (event) => {
    event.preventDefault()
    if (form.new !== form.confirm) {
      setError('New passwords do not match')
      return
    }
    if (form.new.length < 8) {
      setError('Use at least 8 characters')
      return
    }
    try {
      await api.auth.changePassword({ currentPassword: form.current, newPassword: form.new, confirmNewPassword: form.confirm })
      show('Password changed. You will be signed out of other sessions.')
      setForm({ current: '', new: '', confirm: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Store \u00b7 Security</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Change your password</h1>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav sections={[{ id: 'password-form', label: 'Change password' }]} />

        <Section id="password-form" title="Change password" hint="You must know your current password to set a new one. Other sessions will be signed out.">
          <form onSubmit={save} className="max-w-md space-y-4">
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
            <Field label="Current password">
              <input type="password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} className={inputCls} autoComplete="current-password" />
            </Field>
            <Field label="New password">
              <input type="password" required minLength={8} value={form.new} onChange={(e) => setForm({ ...form, new: e.target.value })} className={inputCls} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <input type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className={inputCls} autoComplete="new-password" />
            </Field>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Changing...' : 'Change password'}</Button>
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