import { useState, useEffect, useRef } from 'react'
import { Camera, Save, ArrowLeft, Mail, Phone, Calendar, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Avatar from '../components/Avatar'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function resizeImage(file, maxSize = 200) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height

        if (w > h) {
          if (w > maxSize) { h = (h * maxSize) / w; w = maxSize }
        } else {
          if (h > maxSize) { w = (w * maxSize) / h; h = maxSize }
        }

        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setProfile(data)
      setName(data.name || '')
      setPhone(data.phone || '')
      setAvatar(data.avatar || null)
    } catch (err) {
      setError('Erro ao carregar perfil')
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, phone, avatar })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      const updated = await res.json()
      updateUser({ ...user, name: updated.name, email: updated.email, avatar: updated.avatar })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Selecione uma imagem válida')
      return
    }

    try {
      const resized = await resizeImage(file, 200)
      setAvatar(resized)
      setError('')
    } catch {
      setError('Erro ao processar imagem')
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zeni-muted">Carregando...</div>
      </div>
    )
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 hover:bg-zeni-card rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-zeni-muted" />
        </Link>
        <div>
          <h1 className="page-title">Meu Perfil</h1>
          <p className="page-subtitle">Gerencie suas informações</p>
        </div>
      </div>

      {/* Avatar Card */}
      <div className="glass-card rounded-2xl p-6 border border-zeni-border text-center">
        <div className="relative inline-block">
          <Avatar user={{ ...user, avatar }} size="xl" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-colors shadow-lg"
          >
            <Camera size={14} className="text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>
        <h2 className="text-lg font-bold text-zeni-text mt-3">{name || profile.name}</h2>
        <p className="text-sm text-zeni-muted">{profile.email}</p>

        {profile.subscription_tier && profile.subscription_tier !== 'free' && (
          <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
            <Crown size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-400 uppercase">{profile.subscription_tier}</span>
          </div>
        )}
      </div>

      {/* Form Card */}
      <div className="glass-card rounded-2xl p-6 border border-zeni-border space-y-4">
        <div>
          <label className="block text-sm text-zeni-muted mb-1">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-3 text-zeni-text focus:border-emerald-500 focus:outline-none transition-colors"
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label className="block text-sm text-zeni-muted mb-1 flex items-center gap-1">
            <Mail size={14} /> Email
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full bg-zeni-dark/50 border border-slate-700 rounded-lg px-4 py-3 text-zeni-muted cursor-not-allowed"
          />
          <p className="text-xs text-zeni-muted mt-1">O email não pode ser alterado</p>
        </div>

        <div>
          <label className="block text-sm text-zeni-muted mb-1 flex items-center gap-1">
            <Phone size={14} /> Telefone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-3 text-zeni-text focus:border-emerald-500 focus:outline-none transition-colors"
            placeholder="(00) 00000-0000"
          />
        </div>

        {memberSince && (
          <div className="flex items-center gap-2 text-sm text-zeni-muted pt-2 border-t border-slate-700">
            <Calendar size={14} />
            <span>Membro desde {memberSince}</span>
          </div>
        )}
      </div>

      {/* Error/Success */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-sm text-emerald-400">
          Perfil salvo com sucesso!
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        <Save size={18} />
        {saving ? 'Salvando...' : 'Salvar Alterações'}
      </button>
    </div>
  )
}
