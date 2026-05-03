import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useAcceptInvites } from './hooks/useAcceptInvites'
import { CareRecipientProvider } from './contexts/CareRecipientContext'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { RecipientDetailPage } from './pages/RecipientDetailPage'
import { Onboarding } from './components/Onboarding'

function App() {
  const { user, loading, signUp, signIn, signOut } = useAuth()
  useAcceptInvites(user)
  const [onboarded, setOnboarded] = useState(() =>
    localStorage.getItem('hasCompletedOnboarding') === 'true'
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <BrowserRouter>
        <AuthPage onSignUp={signUp} onSignIn={signIn} />
      </BrowserRouter>
    )
  }

  if (!onboarded) {
    return <Onboarding user={user} onComplete={() => setOnboarded(true)} />
  }

  return (
    <BrowserRouter>
      <CareRecipientProvider user={user}>
        <Routes>
          <Route path="/" element={<HomePage user={user} onSignOut={signOut} />} />
          <Route
            path="/recipient/:recipientId"
            element={<RecipientDetailPage user={user} onSignOut={signOut} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CareRecipientProvider>
    </BrowserRouter>
  )
}

export default App
