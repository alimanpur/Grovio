import { useEffect, useState } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { SectionNav, Section, DataState, StatusBadge, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { inr, num, fmtDate, relTime } from '@/lib/format.js'

const ROLES = ['Cashier', 'Manager', 'Owner']
const ACCESS = {
  Owner: 'Everything, including store settings and backup',
  Manager: 'Counter, Stock and Insights \u2014 not store settings',
  Cashier: 'Counter only: billing, returns and payments',
}

export default function Users() {
  const [toast, show] = useToast()
  const team = useApi((q) => api.team.list(q), { sync: true })

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Cashier' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const items = team.data?.items || []

  const startAdd = () => {
    setForm({ name: '', email: '', password: '', role: 'Cashier' })
    setFormError(null)
    setAdding(true)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await api.team.create({ ...form, password: form.password })
      show(`${form.name} added as ${form.role}`)
      setForm({ name: '', email: '', password: '', role: 'Cashier' })
      setAdding(false)
      team.refresh()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!removeTarget) return
    setBusy(true)
    try {
      await api.team.setStatus(removeTarget.id, 'disabled')
      show(`${removeTarget.name} disabled and signed out`)
      setRemoveTarget(null)
      team.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const changeRole = async (id, role) => {
    try {
      await api.team.update(id, { role })
      show(`Role updated to ${role}`)
      team.refresh()
    } catch (err) {
      show(err.message, 'error')
    }
  }

  const toggleStatus = async (user) => {
    try {
      await api.team.setStatus(user.id, user.status === 'active' ? 'disabled' : 'active')
      show(`${user.name} ${user.status === 'active' ? 'disabled' : 'enabled'}`)
      team.refresh()
    } catch (err) {
      show(err.message, 'error')
    }
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Store \u00b7 Team</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Who can do what in the store?</h1>
        </div>
        <Button onClick={startAdd}>
          <UserPlus className="h-4 w-4" aria-hidden /> Add person
        </Button>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav sections={[{ id: 'team-list', label: 'Team members', count: items.length }, { id: 'team-form', label: adding ? 'Add person' : 'Add person' }]} />

        <Section id="team-list" title="Team members" hint="Only the owner can change roles or disable people." action={
          <Button size="sm" onClick={startAdd}>
            <UserPlus className="mr-1.5 h-4 w-4" aria-hidden /> Add person
          </Button>
        }>
          <DataState
            loading={team.loading}
            error={team.error}
            onRetry={team.refresh}
            skeleton={<div className="p-6"><DataState.Skeleton rows={6} /></div>}
            empty={
              <div className="p-6">
                <p className="text-sm text-muted-foreground">No team members yet. The owner is the first member.</p>
              </div>
            }
          >
            <div className="panel p-0">
              <ul className="divide-y divide-border">
                {items.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{u.name}</h3>
                        {u.isOwner ? <StatusBadge tone="ink">Owner</StatusBadge> : <StatusBadge tone="muted">{u.role}</StatusBadge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!u.isOwner ? (
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className="ring-focus h-9 rounded-md border border-input bg-surface px-2 text-sm"
                        >
                          {ROLES.filter((r) => r !== 'Owner').map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge tone="ink">Owner</StatusBadge>
                      )}
                      <span className="text-xs text-muted-foreground hidden sm:inline">{ACCESS[u.role]}</span>
                      <span className="text-xs text-muted-foreground">{u.lastLoginAt ? relTime(u.lastLoginAt) : 'Never'}</span>
                      {!u.isOwner ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleStatus(u)}
                            aria-label={u.status === 'active' ? 'Disable' : 'Enable'}
                            className="ring-focus text-xs font-semibold hover:underline"
                          >
                            {u.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => setRemoveTarget(u)}
                            aria-label={`Remove ${u.name}`}
                            className="ring-focus text-xs font-semibold text-destructive hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </DataState>
        </Section>

        <Section id="team-form" title={adding ? 'Add person' : 'Add person'} hint="An invitation email is not sent yet; the person signs in with the email and password you set.">
          {adding ? (
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-3 sm:items-end">
              <Field label="Name">
                <input
                  autoFocus
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Role">
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
                  {ROLES.filter((r) => r !== 'Owner').map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Password" className="sm:col-span-2">
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                  placeholder="At least 8 characters"
                />
              </Field>
              {formError ? <div className="sm:col-span-2 text-xs text-destructive">{formError}</div> : null}
              <div className="sm:col-span-3 flex gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(false); setForm({ name: '', email: '', password: '', role: 'Cashier' }) }}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Adding\u2026' : 'Add person'}
                </Button>
              </div>
            </form>
          ) : (
            <Button size="sm" onClick={startAdd}>
              <UserPlus className="mr-1.5 h-4 w-4" aria-hidden /> Add person
            </Button>
          )}
        </Section>
      </div>

      <div
        role="dialog"
        aria-modal="true"
        className={removeTarget ? 'fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4' : 'hidden'}
      >
        {removeTarget && (
          <div className="animate-pop w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-panel">
            <h2 className="text-lg font-semibold">Remove {removeTarget?.name}?</h2>
            <p className="mt-2 text-sm text-muted-foreground">They will be disabled and signed out immediately. Their past bills and adjustments stay in the record.</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setRemoveTarget(null)}>Cancel</Button>
              <Button type="button" size="sm" disabled={busy} onClick={remove}>
                {busy ? 'Working\u2026' : 'Remove'}
              </Button>
            </div>
          </div>
        )}
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