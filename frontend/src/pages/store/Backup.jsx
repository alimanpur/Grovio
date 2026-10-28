import { useEffect, useState } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'
import AppShell from '@/components/grovio/AppShell.jsx'
import { SectionNav, Section, DataState, useToast, ToastHost } from '@/components/grovio/page-kit.jsx'
import { Button } from '@/components/ui/button.jsx'
import { api } from '@/lib/api.js'
import { useApi } from '@/lib/useApi.js'

export default function Backup() {
  const [toast, show] = useToast()
  const preview = useApi(() => api.backup.preview(), { immediate: true })
  const [file, setFile] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = (f) => {
    if (!f) return
    if (f.size > 8 * 1024 * 1024) {
      show('File must be smaller than 8 MB', 'error')
      return
    }
    setFile(f)
    setError(null)
  }

  const restore = async () => {
    if (!file) return
    setRestoring(true)
    setError(null)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      await api.backup.restore(backup)
      show('Backup restored. Your store now matches the uploaded file.')
      setFile(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setRestoring(false)
    }
  }

  const download = async () => {
    try {
      await api.backup.download()
    } catch (err) {
      show(err.message, 'error')
    }
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Store \u00b7 Backup</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-[2.4rem]">Export or restore your store data</h1>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <SectionNav sections={[
          { id: 'backup-export', label: 'Export backup' },
          { id: 'backup-restore', label: 'Restore backup' },
        ]} />

        <Section id="backup-export" title="Export backup" hint="A complete JSON snapshot of your store. Keep it safe \u2014 it contains customer and sales data.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel p-6 text-center">
              <Download className="mx-auto h-12 w-12 text-primary" aria-hidden />
              <p className="mt-3 text-sm font-semibold">Complete backup</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {preview.data?.counts ? `Products: ${preview.data.counts.products}, Bills: ${preview.data.counts.bills}, Customers: ${preview.data.counts.customers}` : 'Ready to export'}
              </p>
              <Button onClick={download} className="mt-4 w-full" disabled={!preview.data}>
                <Download className="mr-1.5 h-4 w-4" aria-hidden /> Download backup
              </Button>
            </div>
            <div className="panel p-6">
              <p className="eyebrow">What's included</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {preview.data?.counts ? [
                  <li key="products">Products: {preview.data.counts.products}</li>,
                  <li key="categories">Categories: {preview.data.counts.categories}</li>,
                  <li key="suppliers">Suppliers: {preview.data.counts.suppliers}</li>,
                  <li key="purchases">Purchases: {preview.data.counts.purchases}</li>,
                  <li key="bills">Bills: {preview.data.counts.bills}</li>,
                  <li key="returns">Returns: {preview.data.counts.returns}</li>,
                  <li key="payments">Payments: {preview.data.counts.payments}</li>,
                  <li key="customers">Customers: {preview.data.counts.customers}</li>,
                  <li key="adjustments">Adjustments: {preview.data.counts.adjustments}</li>,
                ] : <li>Loading...</li>}
              </ul>
            </div>
          </div>
        </Section>

        <Section id="backup-restore" title="Restore backup" hint="This will replace ALL data in this store with the backup. Only the store owner can do this.">
          <div className="panel p-6">
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-surface-2/50 px-6 py-12 text-center">
              <Upload className="h-10 w-10 text-primary" aria-hidden />
              <p className="text-sm font-semibold">Choose a backup file</p>
              <p className="text-xs text-muted-foreground">JSON export from Grovio \u00b7 up to 8 MB</p>
              <input type="file" accept=".json" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
              <Button variant="outline" onClick={() => document.querySelector('input[type=file]')?.click()}>
                Choose file
              </Button>
            </div>
            {file ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/40 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <RotateCcw className="h-4 w-4 text-primary" aria-hidden />
                  {file.name}
                </p>
                <Button onClick={restore} disabled={restoring} className="ml-auto">
                  {restoring ? 'Restoring...' : 'Restore this backup'}
                </Button>
              </div>
            ) : null}
            {error ? <p role="alert" className="mt-3 text-xs text-destructive">{error}</p> : null}
            <p className="mt-3 text-xs text-muted-foreground">
              Restoring a backup is irreversible. The current data will be completely replaced.
            </p>
          </div>
        </Section>
      </div>

      <ToastHost toast={toast} />
    </AppShell>
  )
}