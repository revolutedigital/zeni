import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getSummary, getTransactions } from '../services/api'

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  useEffect(() => {
    async function load() {
      try {
        const [summaryData, transactionsData] = await Promise.all([
          getSummary(month, year),
          getTransactions({ limit: 5 })
        ])
        setSummary(summaryData)
        setRecent(transactionsData)
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [month, year])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zeni-muted">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-zeni-muted">
          {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zeni-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="text-emerald-500" size={20} />
            </div>
            <span className="text-zeni-muted text-sm">Receitas</span>
          </div>
          <p className="text-2xl font-bold text-emerald-500">
            {formatMoney(summary?.income || 0)}
          </p>
        </div>

        <div className="bg-zeni-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <TrendingDown className="text-red-500" size={20} />
            </div>
            <span className="text-zeni-muted text-sm">Despesas</span>
          </div>
          <p className="text-2xl font-bold text-red-500">
            {formatMoney(summary?.expenses || 0)}
          </p>
        </div>

        <div className="bg-zeni-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zeni-primary/20 rounded-lg">
              <Wallet className="text-zeni-primary" size={20} />
            </div>
            <span className="text-zeni-muted text-sm">Saldo</span>
          </div>
          <p className={`text-2xl font-bold ${summary?.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatMoney(summary?.balance || 0)}
          </p>
        </div>
      </div>

      {/* Gastos por categoria */}
      {summary?.byCategory?.length > 0 && (
        <div className="bg-zeni-card rounded-xl p-4">
          <h2 className="font-semibold mb-4">Gastos por categoria</h2>
          <div className="space-y-3">
            {summary.byCategory.slice(0, 5).map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="flex-1 text-sm">{cat.name}</span>
                <span className="font-medium">{formatMoney(cat.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas transações */}
      <div className="bg-zeni-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Últimas transações</h2>
          <Link
            to="/transactions"
            className="text-zeni-primary text-sm flex items-center gap-1 hover:underline"
          >
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-zeni-muted text-center py-4">
            Nenhuma transação ainda
          </p>
        ) : (
          <div className="space-y-3">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: t.category_color || '#9CA3AF' }}
                  />
                  <div>
                    <p className="text-sm">{t.description || t.category_name}</p>
                    <p className="text-xs text-zeni-muted">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <span className={`font-medium ${t.type === 'income' ? 'text-emerald-500' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA para chat */}
      <Link
        to="/chat"
        className="block bg-gradient-to-r from-zeni-primary to-emerald-600 rounded-xl p-4 text-center hover:opacity-90 transition-opacity"
      >
        <p className="font-semibold">Converse com a IA</p>
        <p className="text-sm text-emerald-100">Digite "50 mercado" para registrar ou pergunte "como estou?"</p>
      </Link>
    </div>
  )
}
