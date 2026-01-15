import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Chat from './pages/Chat'
import Login from './pages/Login'

function App() {
  const [token, setToken] = useState(localStorage.getItem('zeni_token'))
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('zeni_user')
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
    }
  }, [token])

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
    return <Login onLogin={handleLogin} />
  }

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
