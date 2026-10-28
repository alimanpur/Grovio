import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { AuthLayout, Field, inputClass, submitClass } from '@/components/grovio/AuthLayout.jsx'
import { authApi } from '@/lib/api.js'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const match = a.length >= 8 && a === b

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      await authApi.resetPassword({ token, password: a, confirmPassword: b })
      toast.success('Password updated', { description: 'Sign in with your new password.' })
      navigate('/sign-in', { replace: true })
    } catch (err) {
      if (err.status === 0) setError(err.message)
      else setError(err.message || 'Could not update your password. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Secure link verified"
      title="Set a new password"
      subtitle="Choose something you'll remember at a busy counter — but not your shop's phone number."
      footer={
        <Link to="/sign-in" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!token ? (
        <div className="panel flex gap-3 p-4" role="alert">
          <ShieldCheck className="h-5 w-5 shrink-0 text-saffron" />
          <div>
            <p className="text-sm font-semibold">This reset link is invalid or has expired.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Request a new one from the{' '}
              <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
                forgot password
              </Link>{' '}
              page, then open the fresh link.
            </p>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit} noValidate>
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Field label="New password">
            <input className={inputClass} type="password" value={a} onChange={(e) => setA(e.target.value)} autoComplete="new-password" required />
          </Field>
          <Field label="Confirm new password">
            <input className={inputClass} type="password" value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" required />
          </Field>
          <p className={`flex items-center gap-2 text-xs ${match ? 'text-sprout-foreground' : 'text-muted-foreground'}`}>
            <ShieldCheck className="h-4 w-4" />
            {match ? 'Passwords match and meet the minimum length.' : 'Minimum 8 characters, both fields must match.'}
          </p>
          <button className={submitClass} disabled={!match || busy}>
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Updating…
              </span>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
