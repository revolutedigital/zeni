import { useState } from 'react'
import { login, register } from '../services/api'

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let result
      if (isRegister) {
        result = await register(name, email, password)
      } else {
        result = await login(email, password)
      }
      onLogin(result.user, result.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-zeni-primary mb-2">Zeni</h1>
          <p className="text-zeni-muted text-base">Suas finanças com inteligência</p>
        </div>

        <div className="bg-zeni-card rounded-xl p-6">
          <h2 className="h2 mb-6">
            {isRegister ? 'Criar conta' : 'Entrar'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm text-zeni-muted mb-1">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                  required={isRegister}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-zeni-muted mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zeni-muted mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Carregando...' : isRegister ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-zeni-primary text-sm hover:underline"
            >
              {isRegister ? 'Já tenho conta' : 'Criar nova conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
