import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { AppShell } from '@/components/grovio/AppShell.jsx'
import { PageHead, Panel, EmptyState } from '@/components/grovio/kit.jsx'
import { SectionNav, Section, DataState, Confirm, StatusBadge, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'
import { num } from '@/lib/format.js'

const inputCls =
  'ring-focus mt-1 block h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary'

const BLANK = { name: '', description: '' }

export default function Categories() {
  const categories = useApi(() => api.categories.list(), { immediate: true })
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, show] = useToast()

  // Product counts come with the category list from the server.
  const items = categories.data?.items || []
  const totals = useMemo(() => {
    const totalItems = items.reduce((sum, c) => sum + (c.products || 0), 0)
    return { categories: items.length, totalItems }
  }, [items])

  const reset = () => {
    setForm(BLANK)
    setEditing(null)
    setError(null)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await api.categories.update(editing.id, form)
        show(`${form.name} updated`)
      } else {
        await api.categories.create(form)
        show(`${form.name} added`)
        reset()
      }
      categories.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!removeTarget) return
    setBusy(true)
    try {
      await api.categories.remove(removeTarget.id)
      show(`${removeTarget.name} removed. Its products are now uncategorised.`)
      setRemoveTarget(null)
      categories.refresh()
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <PageHead
        eyebrow="Stock · Organisation"
        title="Categories"
        question="Group your catalogue the way customers ask for it, so billing and reports stay readable."
        actions={
          <Button size="sm" onClick={() => document.getElementById('category-form')?.scrollIntoView({ behavior: 'smooth' })}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New category
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        <SectionNav sections={[{ id: 'categories-list', label: 'All categories', count: items.length }, { id: 'category-form', label: editing ? 'Edit' : 'Add category' }]} />

        <Section
          id="categories-list"
          title="All categories"
          hint="Deleting a category keeps its products — they simply become uncategorised."
          action={<p className="text-xs text-muted-foreground">{num(totals.categories)} categories · {num(totals.totalItems)} products</p>}
        >
          <div className="panel p-0">
            <DataState
              loading={categories.loading}
              error={categories.error}
              onRetry={categories.refresh}
              skeleton={<div className="p-6"><DataState.Skeleton rows={5} /></div>}
              empty={
                <div className="p-6">
                  <EmptyState
                    title="No categories yet"
                    body="Start with the sections you already arrange: dairy, staples, snacks, toiletries."
                    action={
                      <Button size="sm" onClick={() => document.getElementById('category-form')?.scrollIntoView({ behavior: 'smooth' })}>
                        <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                        Add the first one
                      </Button>
                    }
                  />
                </div>
              }
            >
              <ul className="divide-y divide-border">
                {items.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{c.name}</h3>
                        {c.archived ? <StatusBadge tone="muted">Archived</StatusBadge> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.description || 'No description'} · {num(c.products || 0)} product{c.products === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(c)
                          setForm({ name: c.name, description: c.description || '' })
                          document.getElementById('category-form')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        aria-label={`Edit ${c.name}`}
                        className="ring-focus grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(c)}
                        aria-label={`Delete ${c.name}`}
                        className="ring-focus grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </DataState>
          </div>
        </Section>

        <Section id="category-form" title={editing ? `Edit ${editing.name}` : 'Add category'} hint="Names must be unique within your store.">
          <Panel title={editing ? 'Edit category' : 'New category'} className="max-w-2xl">
            {error ? (
              <p role="alert" className="mb-4 flex items-center gap-2 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                {error}
              </p>
            ) : null}
            <form onSubmit={save} className="grid gap-4">
              <label className="text-xs text-muted-foreground">
                Name
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="Staples"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Description
                <textarea
                  rows={3}
                  maxLength={400}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="ring-focus mt-1 block w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Optional — helps your team know what belongs here."
                />
              </label>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                {editing ? (
                  <Button type="button" variant="outline" size="sm" onClick={reset}>
                    Cancel edit
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add category'}
                </Button>
              </div>
            </form>
          </Panel>
        </Section>
      </div>

      <Confirm
        open={Boolean(removeTarget)}
        title={`Delete ${removeTarget?.name}?`}
        body={
          removeTarget?.products
            ? `${removeTarget.products} product(s) will move to "Uncategorised". Past bills and reports keep their category name.`
            : 'This category has no products, so it will simply be removed.'
        }
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoveTarget(null)}
      />
      <ToastHost toast={toast} />
    </AppShell>
  )
}
