import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Chat from './pages/Chat'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import GoalDetail from './pages/GoalDetail'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import { ToastProvider } from './components/ui/Toast'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [token, setToken] = useState(localStorage.getItem('zeni_token'))
  const [user, setUser] = useState(null)
  const [onboardingCompleted, setOnboardingCompleted] = useState(null)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('zeni_user')
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
      checkOnboardingStatus()
    } else {
      setCheckingOnboarding(false)
    }
  }, [token])

  async function checkOnboardingStatus() {
    try {
      const res = await fetch(`${API_URL}/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setOnboardingCompleted(data.completed)
    } catch (error) {
      console.error('Erro ao verificar onboarding:', error)
      setOnboardingCompleted(true) // Assume completed on error
    } finally {
      setCheckingOnboarding(false)
    }
  }

  const handleLogin = (userData, authToken) => {
    localStorage.setItem('zeni_token', authToken)
    localStorage.setItem('zeni_user', JSON.stringify(userData))
    setToken(authToken)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('zeni_token')
    localStorage.removeItem('zeni_user')
    setToken(null)
    setUser(null)
  }

  if (!token) {
    return (
      <ToastProvider>
        <Login onLogin={handleLogin} />
      </ToastProvider>
    )
  }

  if (checkingOnboarding) {
    return (
      <div className="min-h-screen bg-zeni-dark flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-zeni-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  // Redirecionar para onboarding se não completou
  if (onboardingCompleted === false) {
    return (
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/onboarding" />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/goals/:id" element={<GoalDetail />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/onboarding" element={<Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
