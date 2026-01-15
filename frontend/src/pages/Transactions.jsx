import { useState, useEffect } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { getTransactions, getCategories, createTransaction, deleteTransaction } from '../services/api'

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [type, setType] = useState('expense')
  const [categoryId, setCategoryId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [transData, catData] = await Promise.all([
        getTransactions({ limit: 100 }),
        getCategories()
      ])
      setTransactions(transData)
      setCategories(catData)
    } catch (error) {
      console.error('Erro ao carregar:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      await createTransaction({
        amount: parseFloat(amount),
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

  function resetForm() {
    setAmount('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setType('expense')
    setCategoryId('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zeni-muted">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transações</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-zeni-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nova
        </button>
      </div>

      {/* Lista */}
      <div className="bg-zeni-card rounded-xl divide-y divide-slate-700">
        {transactions.length === 0 ? (
          <p className="text-zeni-muted text-center py-8">
            Nenhuma transação ainda
          </p>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: t.category_color || '#9CA3AF' }}
                />
                <div>
                  <p className="font-medium">{t.description || t.category_name || 'Sem descrição'}</p>
                  <p className="text-sm text-zeni-muted">
                    {t.category_name} • {new Date(t.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-500' : 'text-red-400'}`}>
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
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zeni-card rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Nova transação</h2>
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
