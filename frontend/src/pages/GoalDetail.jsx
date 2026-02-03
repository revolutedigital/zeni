import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Target, ChevronLeft, Plus, Trash2, RefreshCw, Edit2, Check, X,
  Trophy, Clock, AlertTriangle, TrendingUp, Calendar, DollarSign
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR')
}

function ProgressBar({ percent, color = '#10B981', height = 'h-3' }) {
  const clampedPercent = Math.min(percent, 100)
  return (
    <div className={`w-full bg-slate-700 rounded-full ${height}`}>
      <div
        className={`${height} rounded-full transition-all`}
        style={{ width: `${clampedPercent}%`, backgroundColor: color }}
      />
    </div>
  )
}

function ViabilityMeter({ score, level }) {
  if (score === null || score === undefined) return null

  let color, bgColor
  if (score >= 80) {
    color = '#10B981'
    bgColor = 'bg-emerald-500/20'
  } else if (score >= 60) {
    color = '#EAB308'
    bgColor = 'bg-yellow-500/20'
  } else if (score >= 40) {
    color = '#F97316'
    bgColor = 'bg-orange-500/20'
  } else {
    color = '#EF4444'
    bgColor = 'bg-red-500/20'
  }

  const levelText = {
    easy: 'Fácil',
    medium: 'Médio',
    hard: 'Difícil',
    very_hard: 'Muito Difícil'
  }

  return (
    <div className={`${bgColor} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-zeni-muted">Viabilidade</span>
        <span className="font-bold" style={{ color }}>{score}%</span>
      </div>
      <ProgressBar percent={score} color={color} height="h-2" />
      <p className="text-sm mt-2" style={{ color }}>
        {levelText[level] || 'Calculando...'}
      </p>
    </div>
  )
}

function ContributionModal({ show, onClose, onSubmit, loading }) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ amount: parseFloat(amount), date, note })
    setAmount('')
    setNote('')
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-zeni-card rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Nova Contribuição</h2>
          <button onClick={onClose} className="text-zeni-muted hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zeni-muted mb-1">Valor (R$)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
              placeholder="500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-zeni-muted mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-zeni-muted mb-1">Observação (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
              placeholder="Ex: Bônus do trabalho"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Adicionar Contribuição'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function GoalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [goal, setGoal] = useState(null)
  const [contributions, setContributions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [contributionLoading, setContributionLoading] = useState(false)

  useEffect(() => {
    loadGoal()
  }, [id])

  async function loadGoal() {
    setLoading(true)
    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Falha ao carregar objetivo')
      const data = await res.json()
      setGoal(data.goal || null)
      setContributions(data.contributions || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error('Erro ao carregar objetivo:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleContribute(data) {
    setContributionLoading(true)
    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/goals/${id}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Falha ao contribuir')
      setShowContributeModal(false)
      loadGoal()
    } catch (error) {
      console.error('Erro ao contribuir:', error)
    } finally {
      setContributionLoading(false)
    }
  }

  async function handleReanalyze() {
    setAnalyzing(true)
    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/goals/${id}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Falha ao reanalisar')
      loadGoal()
    } catch (error) {
      console.error('Erro ao reanalisar:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este objetivo?')) return

    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/goals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Falha ao excluir')
      navigate('/goals')
    } catch (error) {
      console.error('Erro ao excluir:', error)
    }
  }

  async function handleDeleteContribution(contributionId) {
    if (!confirm('Remover esta contribuição?')) return

    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/goals/${id}/contributions/${contributionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Falha ao remover contribuição')
      loadGoal()
    } catch (error) {
      console.error('Erro ao remover contribuição:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zeni-muted">Carregando...</div>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="text-center py-12">
        <p className="text-zeni-muted">Objetivo não encontrado</p>
        <Link to="/goals" className="text-zeni-primary hover:underline mt-4 inline-block">
          Voltar para objetivos
        </Link>
      </div>
    )
  }

  const isCompleted = goal.status === 'completed'
  const actionPlan = goal.actionPlan || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/goals"
          className="p-2 hover:bg-zeni-card rounded-lg transition-colors"
        >
          <ChevronLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title flex items-center gap-2">
            {isCompleted && <Trophy size={24} className="text-emerald-400" />}
            {goal.name}
          </h1>
          {goal.deadline && (
            <p className="text-zeni-muted flex items-center gap-1">
              <Clock size={14} />
              Prazo: {formatDate(goal.deadline)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReanalyze}
            disabled={analyzing}
            className="p-2 hover:bg-zeni-card rounded-lg transition-colors"
            title="Reanalisar viabilidade"
          >
            <RefreshCw size={20} className={analyzing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
            title="Excluir objetivo"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Progresso principal */}
      <div className="bg-zeni-card rounded-xl p-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-zeni-muted text-sm">Progresso</p>
            <p className="text-3xl font-bold">
              {formatMoney(goal.currentAmount)}
              <span className="text-lg text-zeni-muted font-normal">
                {' '}de {formatMoney(goal.targetAmount)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>
              {goal.progressPercent}%
            </p>
          </div>
        </div>
        <ProgressBar percent={goal.progressPercent} height="h-4" />

        {stats?.remaining > 0 && (
          <p className="text-zeni-muted text-sm mt-3">
            Faltam {formatMoney(stats.remaining)}
            {stats.monthsToComplete && ` (aproximadamente ${stats.monthsToComplete} meses)`}
          </p>
        )}

        {isCompleted && (
          <div className="mt-4 p-3 bg-emerald-500/20 rounded-lg text-emerald-400 text-center">
            <Trophy size={24} className="inline mr-2" />
            Objetivo alcançado!
          </div>
        )}
      </div>

      {/* Grid de informações */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zeni-card rounded-xl p-4">
          <p className="text-zeni-muted text-sm">Contribuições</p>
          <p className="text-xl font-bold">{stats?.totalContributions || 0}</p>
        </div>
        <div className="bg-zeni-card rounded-xl p-4">
          <p className="text-zeni-muted text-sm">Média por contribuição</p>
          <p className="text-xl font-bold">{formatMoney(stats?.avgContribution || 0)}</p>
        </div>
        <div className="bg-zeni-card rounded-xl p-4">
          <p className="text-zeni-muted text-sm">Sugestão mensal</p>
          <p className="text-xl font-bold text-emerald-400">
            {formatMoney(goal.monthlyContribution || 0)}
          </p>
        </div>
        <div className="bg-zeni-card rounded-xl p-4">
          <p className="text-zeni-muted text-sm">Prioridade</p>
          <p className="text-xl font-bold capitalize">
            {goal.priority === 'high' ? 'Alta' : goal.priority === 'medium' ? 'Média' : 'Baixa'}
          </p>
        </div>
      </div>

      {/* Viabilidade e Plano de Ação */}
      {actionPlan.viabilityScore !== undefined && (
        <div className="grid md:grid-cols-2 gap-4">
          <ViabilityMeter
            score={actionPlan.viabilityScore}
            level={actionPlan.viabilityLevel}
          />

          <div className="bg-zeni-card rounded-xl p-4">
            <h3 className="font-medium mb-2">Análise</h3>
            <p className="text-sm text-zeni-muted">
              {actionPlan.recommendation || 'Nenhuma recomendação disponível'}
            </p>
          </div>
        </div>
      )}

      {/* Plano de Ação */}
      {actionPlan.actionPlan?.length > 0 && (
        <div className="bg-zeni-card rounded-xl p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-zeni-primary" />
            Plano de Ação
          </h3>
          <div className="space-y-3">
            {actionPlan.actionPlan.map((action, index) => (
              <div key={index} className="flex gap-3 p-3 bg-zeni-dark rounded-lg">
                <div className="w-6 h-6 rounded-full bg-zeni-primary/20 text-zeni-primary flex items-center justify-center text-sm font-bold">
                  {action.order || index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{action.action}</p>
                  {action.impact && (
                    <p className="text-sm text-zeni-muted">{action.impact}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contribuições */}
      <div className="bg-zeni-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <DollarSign size={20} className="text-zeni-primary" />
            Contribuições
          </h3>
          <button
            onClick={() => setShowContributeModal(true)}
            className="bg-zeni-primary hover:bg-emerald-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 text-sm"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        {contributions.length === 0 ? (
          <p className="text-zeni-muted text-center py-4">
            Nenhuma contribuição registrada
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {contributions.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-zeni-dark rounded-lg"
              >
                <div>
                  <p className="font-medium text-emerald-400">
                    + {formatMoney(c.amount)}
                  </p>
                  <p className="text-sm text-zeni-muted">
                    {formatDate(c.date)}
                    {c.note && ` • ${c.note}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteContribution(c.id)}
                  className="p-1 hover:bg-red-500/20 text-zeni-muted hover:text-red-400 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ContributionModal
        show={showContributeModal}
        onClose={() => setShowContributeModal(false)}
        onSubmit={handleContribute}
        loading={contributionLoading}
      />
    </div>
  )
}
