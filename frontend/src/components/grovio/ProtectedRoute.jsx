import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Restoring your workspace…</p>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children }) {
  const { status, isAuthenticated, onboardingCompleted } = useAuth()
  const location = useLocation()

  // 1) Wait for authentication to hydrate — never flash or redirect early.
  if (status === 'loading') return <Splash />

  // 2) Unauthenticated → sign-in, remembering where they were headed.
  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />
  }

  // 3) Route into onboarding until the store profile is complete.
  if (!onboardingCompleted && location.pathname !== '/app/onboarding') {
    return <Navigate to="/app/onboarding" replace />
  }

  // 4) Authenticated + onboarded → render the protected content.
  return children
}
