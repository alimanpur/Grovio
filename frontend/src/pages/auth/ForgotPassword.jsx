import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { AuthLayout, Field, inputClass, submitClass } from '@/components/grovio/AuthLayout.jsx'
import { authApi } from '@/lib/api.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError('Enter a valid email address.')
    }
    setBusy(true)
    try {
      // Response is intentionally generic — it never confirms whether an
      // account exists. In development it may include a test reset token.
      const res = await authApi.forgotPassword(email.trim())
      setDevToken(res?.data?.devResetToken || '')
      setSent(true)
    } catch (err) {
      setError(err.status === 0 ? err.message : 'Could not process the request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title={sent ? 'Check your inbox' : 'Forgot your password?'}
      subtitle={
        sent
          ? "If an account exists for that address, a secure reset link is on its way. It expires in 30 minutes and can only be used once."
          : "Enter the email registered to your store. We'll send a one-time reset link."
      }
      footer={
        <Link to="/sign-in" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="animate-pop panel flex gap-3 p-4">
          <MailCheck className="h-5 w-5 shrink-0 text-sprout" />
          <div>
            <p className="text-sm font-semibold">Reset link requested for {email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Didn't get it? Check spam, or{' '}
              <button
                onClick={() => {
                  setSent(false)
                  setDevToken('')
                }}
                className="font-semibold text-primary hover:underline"
              >
                try another address
              </button>
              .
            </p>
            {devToken ? (
              <div className="mt-3 rounded-lg border border-saffron/40 bg-saffron/10 p-2.5 text-xs text-saffron-foreground">
                <p className="font-semibold">Email isn't configured (development)</p>
                <p className="mt-0.5 leading-relaxed">
                  Test the flow using this link:
                </p>
                <Link
                  to={`/reset-password?token=${devToken}`}
                  className="mt-1 inline-block text-xs font-semibold text-primary underline decoration-sprout decoration-2 underline-offset-4"
                >
                  Open the reset screen
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit} noValidate>
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Field label="Registered email">
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourstore.in"
              required
            />
          </Field>
          <button className={submitClass} disabled={busy}>
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Sending link…
              </span>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
