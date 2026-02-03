import { useState, useEffect } from 'react'
import { Target, Plus, X, Edit2, Check, ChevronLeft, ChevronRight, Copy, Trash2 } from 'lucide-react'
import { getBudgets, getCategories } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || '/api'

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

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function Budgets() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editAmount, setEditAmount] = useState('')

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  useEffect(() => {
    loadData()
  }, [month, year])

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const categoriesData = await getCategories('expense')
      setCategories(categoriesData)
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      const budgetsData = await getBudgets(month, year)
      setBudgets(budgetsData)
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
      const res = await fetch(`${API_URL}/budgets`, {
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
      if (!res.ok) throw new Error('Falha ao salvar orçamento')
      setShowModal(false)
      setSelectedCategory('')
      setAmount('')
      loadData()
    } catch (error) {
      console.error('Erro ao salvar:', error)
    }
  }

  async function handleUpdate(budgetId, categoryId) {
    if (!editAmount) return

    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category_id: categoryId,
          amount: parseFloat(editAmount),
          month,
          year
        })
      })
      if (!res.ok) throw new Error('Falha ao atualizar orçamento')
      setEditingId(null)
      setEditAmount('')
      loadData()
    } catch (error) {
      console.error('Erro ao atualizar:', error)
    }
  }

  async function handleDelete(budgetId) {
    if (!confirm('Remover este orçamento?')) return

    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/budgets/${budgetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Falha ao deletar orçamento')
      loadData()
    } catch (error) {
      console.error('Erro ao deletar:', error)
    }
  }

  async function copyFromPreviousMonth() {
    // Calcular mês anterior
    let prevMonth = month - 1
    let prevYear = year
    if (prevMonth === 0) {
      prevMonth = 12
      prevYear = year - 1
    }

    try {
      // Buscar orçamentos do mês anterior
      const prevBudgets = await getBudgets(prevMonth, prevYear)

      if (prevBudgets.length === 0) {
        alert(`Não há orçamentos em ${MONTH_NAMES[prevMonth - 1]} ${prevYear}`)
        return
      }

      // Copiar cada orçamento
      const token = localStorage.getItem('zeni_token')
      for (const b of prevBudgets) {
        await fetch(`${API_URL}/budgets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            category_id: b.category_id,
            amount: b.budget,
            month,
            year
          })
        })
      }

      loadData()
    } catch (error) {
      console.error('Erro ao copiar:', error)
    }
  }

  function prevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  function goToCurrentMonth() {
    setMonth(now.getMonth() + 1)
    setYear(now.getFullYear())
  }

  function startEditing(budget) {
    setEditingId(budget.id)
    setEditAmount(budget.budget.toString())
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b.budget, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const totalRemaining = totalBudget - totalSpent

  // Categorias sem orçamento
  const budgetedCategoryIds = budgets.map(b => b.category_id)
  const unbudgetedCategories = categories.filter(c => !budgetedCategoryIds.includes(c.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Orçamentos</h1>
          <p className="page-subtitle">Defina metas de gastos por categoria</p>
        </div>

        {/* Seletor de mês */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-zeni-card rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={goToCurrentMonth}
            className={`px-4 py-2 rounded-lg font-medium min-w-[140px] text-center transition-colors ${
              isCurrentMonth ? 'bg-zeni-primary text-white' : 'bg-zeni-card hover:bg-slate-700'
            }`}
          >
            {MONTH_NAMES[month - 1]} {year}
          </button>

          <button
            onClick={nextMonth}
            className="p-2 hover:bg-zeni-card rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-zeni-muted">Carregando...</div>
        </div>
      ) : (
        <>
          {/* Ações */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="bg-zeni-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Novo Orçamento
            </button>

            {budgets.length === 0 && (
              <button
                onClick={copyFromPreviousMonth}
                className="bg-zeni-card hover:bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Copy size={20} />
                Copiar do mês anterior
              </button>
            )}
          </div>

          {/* Resumo */}
          {totalBudget > 0 && (
            <div className="bg-zeni-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Target size={20} className="text-zeni-primary" />
                <h2 className="section-title">Resumo de {MONTH_NAMES[month - 1]}</h2>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-zeni-muted text-sm">Orçado</p>
                  <p className="money-md">{formatMoney(totalBudget)}</p>
                </div>
                <div>
                  <p className="text-zeni-muted text-sm">Gasto</p>
                  <p className="money-md text-red-400">{formatMoney(totalSpent)}</p>
                </div>
                <div>
                  <p className="text-zeni-muted text-sm">Restante</p>
                  <p className={`money-md ${totalRemaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatMoney(totalRemaining)}
                  </p>
                </div>
              </div>

              <ProgressBar
                percent={Math.round((totalSpent / totalBudget) * 100) || 0}
                color="#10B981"
              />
              <p className="text-xs text-zeni-muted mt-2">
                {Math.round((totalSpent / totalBudget) * 100) || 0}% do orçamento utilizado
              </p>
            </div>
          )}

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

                  <div className="flex items-center gap-2">
                    {editingId === b.id ? (
                      <>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-24 bg-zeni-dark border border-slate-600 rounded px-2 py-1 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdate(b.id, b.category_id)}
                          className="text-emerald-500 hover:text-emerald-400"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-zeni-muted hover:text-white"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`text-sm ${b.percentUsed > 100 ? 'text-red-400' : 'text-zeni-muted'}`}>
                          {b.percentUsed}%
                        </span>
                        <button
                          onClick={() => startEditing(b)}
                          className="text-zeni-muted hover:text-white"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="text-zeni-muted hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
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
                {b.remaining > 0 && b.percentUsed < 100 && (
                  <p className="text-emerald-400 text-sm mt-2">
                    Sobram {formatMoney(b.remaining)}
                  </p>
                )}
              </div>
            ))}
          </div>

          {budgets.length === 0 && (
            <div className="text-center py-8 text-zeni-muted">
              <Target size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhum orçamento definido para {MONTH_NAMES[month - 1]}</p>
              <p className="text-sm mt-2">
                Clique em "Novo Orçamento" ou "Copiar do mês anterior"
              </p>
            </div>
          )}

          {/* Categorias sem orçamento */}
          {unbudgetedCategories.length > 0 && budgets.length > 0 && (
            <div className="bg-zeni-card rounded-xl p-4">
              <h3 className="h4 text-zeni-muted mb-3">Categorias sem orçamento</h3>
              <div className="flex flex-wrap gap-2">
                {unbudgetedCategories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCategory(c.id)
                      setShowModal(true)
                    }}
                    className="flex items-center gap-2 px-3 py-1 bg-zeni-dark rounded-full text-sm hover:bg-slate-700 transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                    <Plus size={14} className="text-zeni-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zeni-card rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h2">
                Novo Orçamento - {MONTH_NAMES[month - 1]} {year}
              </h2>
              <button onClick={() => {
                setShowModal(false)
                setSelectedCategory('')
                setAmount('')
              }} className="text-zeni-muted hover:text-white">
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
                  {unbudgetedCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zeni-muted mb-1">Valor mensal (R$)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="Ex: 500"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!selectedCategory || !amount}
                className="w-full bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Salvar Orçamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
