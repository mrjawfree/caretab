import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'

function App() {
  const { user, loading, signUp, signIn, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onSignUp={signUp} onSignIn={signIn} />
  }

  return <HomePage user={user} onSignOut={signOut} />
}

export default App
