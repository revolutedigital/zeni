import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import { ToastProvider } from './components/ui/Toast'
import { PageSkeleton } from './components/ui/Skeleton'
import OfflineIndicator from './components/OfflineIndicator'

// Lazy loaded pages - code splitting por rota
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Goals = lazy(() => import('./pages/Goals'))
const GoalDetail = lazy(() => import('./pages/GoalDetail'))
const Chat = lazy(() => import('./pages/Chat'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Subscription = lazy(() => import('./pages/Subscription'))
const Profile = lazy(() => import('./pages/Profile'))

function AppContent() {
  const { isAuthenticated, isLoading, onboardingCompleted, logout, user } = useAuth()

  // Loading inicial (verificando auth/onboarding)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zeni-dark flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-zeni-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  // Não autenticado
  if (!isAuthenticated) {
    return <Login />
  }

  // Onboarding pendente
  if (onboardingCompleted === false) {
    return (
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/onboarding" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    )
  }

  // App principal
  return (
    <BrowserRouter>
      <Layout user={user} onLogout={logout}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/goals/:id" element={<GoalDetail />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/onboarding" element={<Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <OfflineIndicator />
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
