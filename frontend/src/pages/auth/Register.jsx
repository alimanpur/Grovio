import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AuthLayout, Field, inputClass, submitClass } from '@/components/grovio/AuthLayout.jsx'
import { useAuth } from '@/context/AuthContext.jsx'

const strengthOf = (v) => {
  let s = 0
  if (v.length >= 8) s++
  if (/[A-Z]/.test(v)) s++
  if (/[0-9]/.test(v)) s++
  if (/[^A-Za-z0-9]/.test(v)) s++
  return s
}

const flatten = (errors) => {
  const out = {}
  for (const [key, msgs] of Object.entries(errors || {})) {
    out[key] = Array.isArray(msgs) ? msgs[0] : msgs
  }
  return out
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', storeName: '', phone: '', email: '', password: '' })
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const strength = strengthOf(form.password)
  const labels = ['Too short', 'Weak', 'Fair', 'Strong', 'Excellent']
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setFormError('')
    setFieldErrors({})

    const errs = {}
    if (form.name.trim().length < 2) errs.name = 'Enter the owner name.'
    if (form.storeName.trim().length < 2) errs.storeName = 'Enter your store name.'
    if (form.phone.trim().length < 6) errs.phone = 'Enter a valid mobile number.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid work email.'
    if (form.password.length < 8) errs.password = 'Use at least 8 characters.'
    if (!accepted) errs.accepted = 'You must accept the terms to continue.'
    if (Object.keys(errs).length) return setFieldErrors(errs)

    setBusy(true)
    try {
      await register({
        name: form.name.trim(),
        storeName: form.storeName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      toast.success('Account created', { description: "Let's set your store up." })
      navigate('/app/onboarding', { replace: true })
    } catch (err) {
      if (err.status === 0) setFormError(err.message)
      else if (err.status === 409) setFormError(err.message)
      else setFieldErrors(flatten(err.errors))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Set up your store"
      subtitle="Two minutes now saves an hour every week at the counter."
      footer={
        <>
          Already running Grovio?{' '}
          <Link to="/sign-in" className="font-semibold text-primary underline decoration-sprout decoration-2 underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <Field label="Owner name" error={fieldErrors.name}>
          <input className={`${inputClass} ${fieldErrors.name ? 'border-destructive' : ''}`} value={form.name} onChange={set('name')} placeholder="Your full name" required />
        </Field>
        <Field label="Store name" error={fieldErrors.storeName}>
          <input className={`${inputClass} ${fieldErrors.storeName ? 'border-destructive' : ''}`} value={form.storeName} onChange={set('storeName')} placeholder="Your store name" required />
        </Field>
        <Field label="Mobile number" error={fieldErrors.phone}>
          <input className={`${inputClass} ${fieldErrors.phone ? 'border-destructive' : ''}`} value={form.phone} onChange={set('phone')} placeholder="+91 99999 99999" required />
        </Field>
        <Field label="Work email" error={fieldErrors.email}>
          <input className={`${inputClass} ${fieldErrors.email ? 'border-destructive' : ''}`} type="email" value={form.email} onChange={set('email')} placeholder="you@yourstore.in" required />
        </Field>
        <Field label="Create password" error={fieldErrors.password}>
          <input
            className={`${inputClass} ${fieldErrors.password ? 'border-destructive' : ''}`}
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
          />
        </Field>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < strength ? (strength >= 3 ? 'bg-sprout' : 'bg-saffron') : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">{labels[strength]}</span>
        </div>

        <div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[oklch(0.34_0.068_157)]" />
            I agree to Grovio's terms and understand my store data stays private to my account.
          </label>
          {fieldErrors.accepted ? <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.accepted}</p> : null}
        </div>

        <button className={submitClass} disabled={busy}>
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Creating your store…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Check className="h-4 w-4 text-sprout" /> Create store account
            </span>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
