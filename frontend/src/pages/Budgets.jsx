import { useState, useEffect } from 'react'
import { Target, Plus, X, Edit2, Check } from 'lucide-react'
import { getBudgets, getCategories } from '../services/api'

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function ProgressBar({ percent, color }) {
  const clampedPercent = Math.min(percent, 100)
  const isOver = percent > 100

  return (
    <div className="w-full bg-slate-700 rounded-full h-3">
      <div
        className={`h-3 rounded-full transition-all ${isOver ? 'bg-red-500' : ''}`}
        style={{
          width: `${clampedPercent}%`,
          backgroundColor: isOver ? undefined : color
        }}
      />
    </div>
  )
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [amount, setAmount] = useState('')

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [budgetsData, categoriesData] = await Promise.all([
        getBudgets(month, year),
        getCategories('expense')
      ])
      setBudgets(budgetsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Erro ao carregar:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!selectedCategory || !amount) return

    try {
      const token = localStorage.getItem('zeni_token')
      await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category_id: selectedCategory,
          amount: parseFloat(amount),
          month,
          year
        })
      })
      setShowModal(false)
      setSelectedCategory('')
      setAmount('')
      loadData()
    } catch (error) {
      console.error('Erro ao salvar:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zeni-muted">Carregando...</div>
      </div>
    )
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b.budget, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const totalRemaining = totalBudget - totalSpent

  // Categorias sem orçamento
  const budgetedCategoryIds = budgets.map(b => b.category_id)
  const unbugdetedCategories = categories.filter(c => !budgetedCategoryIds.includes(c.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-zeni-muted">
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-zeni-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Novo
        </button>
      </div>

      {/* Resumo */}
      <div className="bg-zeni-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Target size={20} className="text-zeni-primary" />
          <h2 className="font-semibold">Resumo do Mês</h2>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-zeni-muted text-sm">Orçado</p>
            <p className="text-xl font-bold">{formatMoney(totalBudget)}</p>
          </div>
          <div>
            <p className="text-zeni-muted text-sm">Gasto</p>
            <p className="text-xl font-bold text-red-400">{formatMoney(totalSpent)}</p>
          </div>
          <div>
            <p className="text-zeni-muted text-sm">Restante</p>
            <p className={`text-xl font-bold ${totalRemaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatMoney(totalRemaining)}
            </p>
          </div>
        </div>

        <ProgressBar
          percent={Math.round((totalSpent / totalBudget) * 100) || 0}
          color="#10B981"
        />
      </div>

      {/* Lista de orçamentos */}
      <div className="space-y-3">
        {budgets.map((b) => (
          <div key={b.id} className="bg-zeni-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: b.category_color }}
                />
                <span className="font-medium">{b.category_name}</span>
              </div>
              <span className={`text-sm ${b.percentUsed > 100 ? 'text-red-400' : 'text-zeni-muted'}`}>
                {b.percentUsed}%
              </span>
            </div>

            <ProgressBar percent={b.percentUsed} color={b.category_color} />

            <div className="flex justify-between mt-2 text-sm">
              <span className="text-zeni-muted">
                Gasto: <span className="text-white">{formatMoney(b.spent)}</span>
              </span>
              <span className="text-zeni-muted">
                Orçado: <span className="text-white">{formatMoney(b.budget)}</span>
              </span>
            </div>

            {b.remaining < 0 && (
              <p className="text-red-400 text-sm mt-2">
                Estourado em {formatMoney(Math.abs(b.remaining))}
              </p>
            )}
          </div>
        ))}
      </div>

      {budgets.length === 0 && (
        <div className="text-center py-8 text-zeni-muted">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum orçamento definido</p>
          <p className="text-sm">Clique em "Novo" para criar</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zeni-card rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Novo Orçamento</h2>
              <button onClick={() => setShowModal(false)} className="text-zeni-muted hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zeni-muted mb-1">Categoria</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                >
                  <option value="">Selecione...</option>
                  {unbugdetedCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zeni-muted mb-1">Valor mensal</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="0,00"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!selectedCategory || !amount}
                className="w-full bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
