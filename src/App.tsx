import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useAcceptInvites } from './hooks/useAcceptInvites'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { RecipientDetailPage } from './pages/RecipientDetailPage'

function App() {
  const { user, loading, signUp, signIn, signOut } = useAuth()
  useAcceptInvites(user)

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage user={user} onSignOut={signOut} />} />
        <Route
          path="/recipient/:recipientId"
          element={<RecipientDetailPage user={user} onSignOut={signOut} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
