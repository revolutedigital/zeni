import { useState, useEffect } from 'react'
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Filter, Search, Check, Circle } from 'lucide-react'
import { getTransactions, getCategories, createTransaction, deleteTransaction } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function Transactions() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [type, setType] = useState('expense')
  const [categoryId, setCategoryId] = useState('')

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  useEffect(() => {
    loadData()
  }, [month, year])

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const catData = await getCategories()
      setCategories(catData)
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      const transData = await getTransactions({ month, year, limit: 500 })
      setTransactions(transData)
    } catch (error) {
      console.error('Erro ao carregar:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor, insira um valor válido maior que zero')
      return
    }

    try {
      await createTransaction({
        amount: parsedAmount,
        description,
        date,
        type,
        category_id: categoryId || null
      })
      setShowModal(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Erro ao criar:', error)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Deletar esta transação?')) return

    try {
      await deleteTransaction(id)
      loadData()
    } catch (error) {
      console.error('Erro ao deletar:', error)
    }
  }

  async function togglePaid(id, currentPaid) {
    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/transactions/${id}/paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paid: !currentPaid })
      })
      if (!res.ok) throw new Error('Falha ao atualizar status')
      setTransactions(prev =>
        prev.map(t => t.id === id ? { ...t, paid: !currentPaid } : t)
      )
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  function resetForm() {
    setAmount('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setType('expense')
    setCategoryId('')
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

  // Filtrar transações
  const filteredTransactions = transactions.filter(t => {
    if (filterCategory && t.category_id !== filterCategory) return false
    if (filterType && t.type !== filterType) return false
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchDesc = t.description?.toLowerCase().includes(search)
      const matchCat = t.category_name?.toLowerCase().includes(search)
      if (!matchDesc && !matchCat) return false
    }
    return true
  })

  // Agrupar por data
  const groupedByDate = filteredTransactions.reduce((groups, t) => {
    const dateKey = t.date
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(t)
    return groups
  }, {})

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a))

  // Totais
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">Transações</h1>

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

          <button
            onClick={() => setShowModal(true)}
            className="bg-zeni-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ml-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nova</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-zeni-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zeni-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar transação..."
              className="w-full bg-zeni-dark border border-slate-600 rounded-lg pl-10 pr-4 py-2"
            />
          </div>

          {/* Filtro por categoria */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
          >
            <option value="">Todas categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Filtro por tipo */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
          >
            <option value="">Todos tipos</option>
            <option value="expense">Despesas</option>
            <option value="income">Receitas</option>
          </select>
        </div>

        {/* Resumo do mês */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-slate-700">
          <div>
            <span className="text-zeni-muted text-sm">Receitas: </span>
            <span className="text-emerald-500 money-sm">{formatMoney(totalIncome)}</span>
          </div>
          <div>
            <span className="text-zeni-muted text-sm">Despesas: </span>
            <span className="text-red-400 money-sm">{formatMoney(totalExpense)}</span>
          </div>
          <div>
            <span className="text-zeni-muted text-sm">Saldo: </span>
            <span className={`money-sm ${totalIncome - totalExpense >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatMoney(totalIncome - totalExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* Lista agrupada por data */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-zeni-muted">Carregando...</div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-zeni-card rounded-xl p-8 text-center">
          <p className="text-zeni-muted">
            {transactions.length === 0
              ? `Nenhuma transação em ${MONTH_NAMES[month - 1]} ${year}`
              : 'Nenhuma transação encontrada com os filtros aplicados'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map(dateKey => (
            <div key={dateKey} className="bg-zeni-card rounded-xl overflow-hidden">
              {/* Header da data */}
              <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
                <span className="font-medium">
                  {new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
                <span className="text-sm text-zeni-muted">
                  {groupedByDate[dateKey].length} transação(ões)
                </span>
              </div>

              {/* Transações do dia */}
              <div className="divide-y divide-slate-700">
                {groupedByDate[dateKey].map((t) => (
                  <div key={t.id} className={`flex items-center justify-between p-4 ${!t.paid ? 'bg-yellow-900/20' : ''}`}>
                    <div className="flex items-center gap-3">
                      {/* Checkbox de pago */}
                      <button
                        onClick={() => togglePaid(t.id, t.paid)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          t.paid
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/20'
                        }`}
                        title={t.paid ? 'Marcar como pendente' : 'Marcar como pago'}
                      >
                        {t.paid ? <Check size={14} /> : <Circle size={14} />}
                      </button>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.category_color || '#9CA3AF' }}
                      />
                      <div>
                        <p className={`font-medium ${!t.paid ? 'text-yellow-200' : ''}`}>
                          {t.description || t.category_name || 'Sem descrição'}
                          {!t.paid && <span className="ml-2 text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded">Pendente</span>}
                        </p>
                        <p className="text-sm text-zeni-muted">{t.category_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`money-sm ${t.type === 'income' ? 'text-emerald-500' : 'text-red-400'} ${!t.paid ? 'opacity-70' : ''}`}>
                        {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                      </span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-zeni-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zeni-card rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h2">Nova transação</h2>
              <button onClick={() => setShowModal(false)} className="text-zeni-muted hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2 rounded-lg transition-colors ${
                    type === 'expense' ? 'bg-red-500 text-white' : 'bg-zeni-dark text-zeni-muted'
                  }`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-2 rounded-lg transition-colors ${
                    type === 'income' ? 'bg-emerald-500 text-white' : 'bg-zeni-dark text-zeni-muted'
                  }`}
                >
                  Receita
                </button>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm text-zeni-muted mb-1">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="0,00"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm text-zeni-muted mb-1">Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                  placeholder="Ex: Compras do mês"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm text-zeni-muted mb-1">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
                >
                  <option value="">Selecione...</option>
                  {categories
                    .filter(c => c.type === type || c.type === 'both')
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  }
                </select>
              </div>

              {/* Data */}
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

              <button
                type="submit"
                className="w-full bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
