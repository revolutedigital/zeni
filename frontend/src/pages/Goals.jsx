import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Target, Plus, X, ChevronRight, Trophy, Clock, AlertTriangle } from 'lucide-react'

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
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function ProgressBar({ percent, color = '#10B981' }) {
  const clampedPercent = Math.min(percent, 100)
  return (
    <div className="w-full bg-slate-700 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${clampedPercent}%`, backgroundColor: color }}
      />
    </div>
  )
}

function ViabilityBadge({ score }) {
  if (score === null || score === undefined) return null

  let color, text
  if (score >= 80) {
    color = 'bg-emerald-500/20 text-emerald-400'
    text = 'Fácil'
  } else if (score >= 60) {
    color = 'bg-yellow-500/20 text-yellow-400'
    text = 'Médio'
  } else if (score >= 40) {
    color = 'bg-orange-500/20 text-orange-400'
    text = 'Difícil'
  } else {
    color = 'bg-red-500/20 text-red-400'
    text = 'Muito difícil'
  }

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${color}`}>
      {text} ({score}%)
    </span>
  )
}

function GoalCard({ goal }) {
  const isCompleted = goal.status === 'completed'
  const isPaused = goal.status === 'paused'

  return (
    <Link
      to={`/goals/${goal.id}`}
      className="block bg-zeni-card rounded-xl p-4 hover:bg-slate-700/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isCompleted ? 'bg-emerald-500/20' : isPaused ? 'bg-slate-500/20' : 'bg-zeni-primary/20'
          }`}>
            {isCompleted ? (
              <Trophy size={20} className="text-emerald-400" />
            ) : (
              <Target size={20} className="text-zeni-primary" />
            )}
          </div>
          <div>
            <h3 className="font-medium">{goal.name}</h3>
            {goal.deadline && (
              <p className="text-sm text-zeni-muted flex items-center gap-1">
                <Clock size={12} />
                {formatDate(goal.deadline)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ViabilityBadge score={goal.viabilityScore} />
          <ChevronRight size={20} className="text-zeni-muted" />
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-zeni-muted">
            {formatMoney(goal.currentAmount)} de {formatMoney(goal.targetAmount)}
          </span>
          <span className={isCompleted ? 'text-emerald-400' : 'text-white'}>
            {goal.progressPercent}%
          </span>
        </div>
        <ProgressBar
          percent={goal.progressPercent}
          color={isCompleted ? '#10B981' : '#10B981'}
        />
      </div>

      {goal.monthlyContribution && !isCompleted && (
        <p className="text-sm text-zeni-muted">
          Contribuição sugerida: {formatMoney(goal.monthlyContribution)}/mês
        </p>
      )}

      {isPaused && (
        <p className="text-sm text-yellow-400 mt-2 flex items-center gap-1">
          <AlertTriangle size={14} />
          Objetivo pausado
        </p>
      )}
    </Link>
  )
}

function CreateGoalModal({ show, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [category, setCategory] = useState('savings')
  const [priority, setPriority] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const closeTimerRef = React.useRef(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const categories = [
    { value: 'savings', label: 'Reserva/Poupança' },
    { value: 'travel', label: 'Viagem' },
    { value: 'purchase', label: 'Compra (carro, casa, etc)' },
    { value: 'debt', label: 'Quitar dívida' },
    { value: 'investment', label: 'Investimento' },
    { value: 'education', label: 'Educação' },
    { value: 'other', label: 'Outro' }
  ]

  async function handleSubmit(e) {
    e.preventDefault()

    const parsedAmount = parseFloat(targetAmount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor, insira um valor alvo válido maior que zero')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          targetAmount: parsedAmount,
          deadline: deadline || null,
          category,
          priority,
          analyzeNow: true
        })
      })

      if (!res.ok) throw new Error('Falha ao criar objetivo')
      const result = await res.json()

      if (result.success) {
        setAnalysis(result.analysis)
        // Mostrar análise por 3 segundos antes de fechar
        closeTimerRef.current = setTimeout(() => {
          onCreated()
          resetForm()
        }, 3000)
      }
    } catch (error) {
      console.error('Erro ao criar objetivo:', error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setName('')
    setTargetAmount('')
    setDeadline('')
    setCategory('savings')
    setPriority('medium')
    setAnalysis(null)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-zeni-card rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Novo Objetivo</h2>
          <button onClick={() => { onClose(); resetForm(); }} className="text-zeni-muted hover:text-white">
            <X size={24} />
          </button>
        </div>

        {analysis ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                analysis.viabilityScore >= 60 ? 'bg-emerald-500/20' : 'bg-yellow-500/20'
              }`}>
                <Target size={32} className={
                  analysis.viabilityScore >= 60 ? 'text-emerald-400' : 'text-yellow-400'
                } />
              </div>
              <h3 className="text-lg font-bold mb-2">Objetivo criado!</h3>
              <ViabilityBadge score={analysis.viabilityScore} />
            </div>

            <p className="text-zeni-muted text-sm text-center">
              {analysis.recommendation}
            </p>

            <div className="bg-zeni-dark rounded-lg p-3">
              <p className="text-sm text-zeni-muted">Contribuição sugerida</p>
              <p className="text-lg font-bold text-emerald-400">
                {formatMoney(analysis.monthlyContributionSuggested)}/mês
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zeni-muted mb-1">Nome do objetivo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                placeholder="Ex: Viagem para Europa"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zeni-muted mb-1">Valor alvo (R$)</label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                placeholder="15000"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zeni-muted mb-1">Prazo (opcional)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm text-zeni-muted mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
              >
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zeni-muted mb-1">Prioridade</label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      priority === p
                        ? 'bg-zeni-primary text-white'
                        : 'bg-zeni-dark hover:bg-slate-700'
                    }`}
                  >
                    {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : 'Alta'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !name || !targetAmount}
              className="w-full bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Analisando...
                </>
              ) : (
                <>
                  <Target size={20} />
                  Criar e Analisar
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    let isMounted = true

    async function loadGoals() {
      setLoading(true)
      try {
        const token = localStorage.getItem('zeni_token')
        const res = await fetch(`${API_URL}/goals?status=${filter}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (isMounted) setGoals(data.goals || [])
      } catch (error) {
        if (isMounted && process.env.NODE_ENV !== 'production') {
          console.error('Erro ao carregar objetivos:', error)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    async function loadSummary() {
      try {
        const token = localStorage.getItem('zeni_token')
        const res = await fetch(`${API_URL}/goals/summary/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (isMounted) setSummary(data)
      } catch (error) {
        if (isMounted && process.env.NODE_ENV !== 'production') {
          console.error('Erro ao carregar resumo:', error)
        }
      }
    }

    loadGoals()
    loadSummary()

    return () => { isMounted = false }
  }, [filter])

  async function handleRefresh() {
    const token = localStorage.getItem('zeni_token')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/goals?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setGoals(data.goals || [])
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Erro ao carregar objetivos:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Objetivos</h1>
          <p className="page-subtitle">Acompanhe suas metas financeiras</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-zeni-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Objetivo
        </button>
      </div>

      {/* Resumo */}
      {summary && summary.activeCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zeni-card rounded-xl p-4">
            <p className="text-zeni-muted text-sm">Objetivos ativos</p>
            <p className="text-2xl font-bold">{summary.activeCount}</p>
          </div>
          <div className="bg-zeni-card rounded-xl p-4">
            <p className="text-zeni-muted text-sm">Progresso total</p>
            <p className="text-2xl font-bold text-emerald-400">{summary.overallProgress}%</p>
          </div>
          <div className="bg-zeni-card rounded-xl p-4">
            <p className="text-zeni-muted text-sm">Total acumulado</p>
            <p className="text-xl font-bold">{formatMoney(summary.totalCurrent)}</p>
          </div>
          <div className="bg-zeni-card rounded-xl p-4">
            <p className="text-zeni-muted text-sm">Compromisso mensal</p>
            <p className="text-xl font-bold text-yellow-400">
              {formatMoney(summary.totalMonthlyCommitment)}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {['active', 'completed', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === f
                ? 'bg-zeni-primary text-white'
                : 'bg-zeni-card hover:bg-slate-700'
            }`}
          >
            {f === 'active' ? 'Ativos' : f === 'completed' ? 'Concluídos' : 'Todos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-zeni-muted">Carregando...</div>
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12">
          <Target size={48} className="mx-auto mb-4 text-zeni-muted opacity-50" />
          <p className="text-zeni-muted">
            {filter === 'active'
              ? 'Nenhum objetivo ativo'
              : filter === 'completed'
              ? 'Nenhum objetivo concluído ainda'
              : 'Nenhum objetivo encontrado'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-zeni-primary hover:underline"
          >
            Criar primeiro objetivo
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <CreateGoalModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          setShowModal(false)
          loadGoals()
          loadSummary()
        }}
      />
    </div>
  )
}
