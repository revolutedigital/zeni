/**
 * Auth Context - Zeni
 *
 * Gerencia autenticação e estado do usuário globalmente.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('zeni_token'))
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('zeni_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      localStorage.removeItem('zeni_user')
      return null
    }
  })
  const [onboardingCompleted, setOnboardingCompleted] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verifica status do onboarding
  const checkOnboardingStatus = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_URL}/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        // Token inválido
        if (res.status === 401) {
          logout()
          return
        }
        throw new Error('Failed to check onboarding status')
      }

      const data = await res.json()
      setOnboardingCompleted(data.completed)
    } catch (error) {
      if (import.meta.env.MODE !== 'production') {
        console.error('Erro ao verificar onboarding:', error)
      }
      setOnboardingCompleted(true) // Assume completed on error
    } finally {
      setIsLoading(false)
    }
  }, [token])

  // Verifica onboarding ao iniciar
  useEffect(() => {
    checkOnboardingStatus()
  }, [checkOnboardingStatus])

  // Login
  const login = useCallback((userData, authToken) => {
    localStorage.setItem('zeni_token', authToken)
    localStorage.setItem('zeni_user', JSON.stringify(userData))
    setToken(authToken)
    setUser(userData)
    setOnboardingCompleted(null) // Will be checked
    setIsLoading(true)
  }, [])

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('zeni_token')
    localStorage.removeItem('zeni_user')
    setToken(null)
    setUser(null)
    setOnboardingCompleted(null)
  }, [])

  // Atualiza dados do usuário
  const updateUser = useCallback((userData) => {
    localStorage.setItem('zeni_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  // Marca onboarding como completo
  const completeOnboarding = useCallback(() => {
    setOnboardingCompleted(true)
  }, [])

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    isLoading,
    onboardingCompleted,
    login,
    logout,
    updateUser,
    completeOnboarding,
    checkOnboardingStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
