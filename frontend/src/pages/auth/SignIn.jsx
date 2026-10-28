import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AuthLayout, Field, inputClass, submitClass } from '@/components/grovio/AuthLayout.jsx'
import { useAuth } from '@/context/AuthContext.jsx'

const roles = [
  { role: 'Owner', blurb: 'Full access, money and reports' },
  { role: 'Manager', blurb: 'Stock, purchases, staff' },
  { role: 'Cashier', blurb: 'Billing counter only' },
]

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const from = location.state?.from

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [role, setRole] = useState('Owner')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setFormError('')
    setFieldErrors({})

    const errs = {}
    if (!identifier.trim()) errs.identifier = 'Enter your work email or phone.'
    if (!password) errs.password = 'Enter your password.'
    if (Object.keys(errs).length) return setFieldErrors(errs)

    setBusy(true)
    try {
      const user = await login(identifier.trim(), password, remember)
      toast.success(`Signed in as ${user.store?.name || 'your store'}`, { description: 'Secure session started.' })
      const dest = !user.store?.onboardingCompleted
        ? '/app/onboarding'
        : from && from !== '/sign-in'
          ? from
          : '/app/today'
      navigate(dest, { replace: true })
    } catch (err) {
      if (err.status === 0) setFormError(err.message)
      else if (err.errors?.identifier) setFieldErrors({ identifier: err.errors.identifier[0] })
      else if (err.errors?.password) setFieldErrors({ password: err.errors.password[0] })
      else setFormError(err.message || 'Sign in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Open your counter"
      subtitle="Sign in to your store. Sessions stay secure and expire after 12 hours of inactivity."
      footer={
        <>
          New to Grovio?{' '}
          <Link
            to="/sign-up"
            className="font-semibold text-primary underline decoration-sprout decoration-2 underline-offset-4"
          >
            Create a store account
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

        <Field label="Work email or phone" error={fieldErrors.identifier}>
          <input
            className={`${inputClass} ${fieldErrors.identifier ? 'border-destructive' : ''}`}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@yourstore.in"
            autoComplete="username"
            required
          />
        </Field>

        <Field
          label="Password"
          error={fieldErrors.password}
          hint={
            <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          }
        >
          <span className="relative block">
            <input
              className={`${inputClass} ${fieldErrors.password ? 'border-destructive' : ''}`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </Field>

        <div>
          <p className="text-xs font-semibold text-ink-soft">Sign in as</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {roles.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => setRole(r.role)}
                aria-pressed={role === r.role}
                className={`ring-focus rounded-lg border p-2.5 text-left transition-all ${
                  role === r.role ? 'border-sprout bg-accent shadow-lift' : 'border-border bg-surface hover:border-sprout/60'
                }`}
              >
                <span className="block text-sm font-semibold">{r.role}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{r.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-[oklch(0.34_0.068_157)]"
          />
          Remember this device for 30 days
        </label>

        <button className={submitClass} disabled={busy}>
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Opening workspace…
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
