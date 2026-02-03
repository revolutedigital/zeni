import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { TrendingUp, TrendingDown, Wallet, ArrowRight, Target, AlertTriangle, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getSummary, getTransactions, getBudgets, getGoalsSummary, getGoals } from '../services/api'

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Memoized ProgressBar para evitar re-renders
const ProgressBar = memo(function ProgressBar({ percent, color }) {
  const clampedPercent = Math.min(percent, 100)
  const isOver = percent > 100

  return (
    <div className="w-full bg-slate-700 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : ''}`}
        style={{
          width: `${clampedPercent}%`,
          backgroundColor: isOver ? undefined : color
        }}
      />
    </div>
  )
})

// Memoized components para listas
const BudgetItem = memo(function BudgetItem({ budget }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: budget.category_color }}
          />
          {budget.category_name}
        </span>
        <span className={budget.percentUsed > 100 ? 'text-red-400' : ''}>
          {formatMoney(budget.spent)} / {formatMoney(budget.budget)}
        </span>
      </div>
      <ProgressBar percent={budget.percentUsed} color={budget.category_color} />
    </div>
  )
})

const TransactionItem = memo(function TransactionItem({ transaction }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: transaction.category_color || '#9CA3AF' }}
        />
        <div>
          <p className="text-sm">{transaction.description || transaction.category_name}</p>
          <p className="text-xs text-zeni-muted">
            {new Date(transaction.date).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
      <span className={`money-sm ${transaction.type === 'income' ? 'text-emerald-500' : 'text-red-400'}`}>
        {transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount)}
      </span>
    </div>
  )
})

const GoalItem = memo(function GoalItem({ goal }) {
  return (
    <Link
      to={`/goals/${goal.id}`}
      className="block p-3 bg-zeni-dark rounded-lg hover:bg-slate-700 transition-colors"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">{goal.name}</span>
        <span className="text-sm text-zeni-muted">{goal.progressPercent}%</span>
      </div>
      <ProgressBar percent={goal.progressPercent} color="#10B981" />
      <p className="text-xs text-zeni-muted mt-1">
        {formatMoney(goal.currentAmount)} de {formatMoney(goal.targetAmount)}
      </p>
    </Link>
  )
})

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [budgets, setBudgets] = useState([])
  const [goalsSummary, setGoalsSummary] = useState(null)
  const [activeGoals, setActiveGoals] = useState([])
  const [loading, setLoading] = useState(true)

  // Memoized computed values
  const isCurrentMonth = useMemo(() =>
    month === now.getMonth() + 1 && year === now.getFullYear(),
    [month, year, now]
  )

  const { daysInMonth, dayOfMonth, monthProgress } = useMemo(() => {
    const days = new Date(year, month, 0).getDate()
    const day = isCurrentMonth ? now.getDate() : days
    return {
      daysInMonth: days,
      dayOfMonth: day,
      monthProgress: Math.round((day / days) * 100)
    }
  }, [year, month, isCurrentMonth, now])

  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)
      try {
        const [summaryData, transactionsData, budgetsData, goalsData, goalsList] = await Promise.all([
          getSummary(month, year),
          getTransactions({ month, year, limit: 5 }),
          getBudgets(month, year),
          getGoalsSummary().catch(() => null),
          getGoals('active').catch(() => ({ goals: [] }))
        ])
        if (!isMounted) return
        setSummary(summaryData)
        setRecent(transactionsData)
        setBudgets(budgetsData)
        setGoalsSummary(goalsData)
        setActiveGoals(goalsList.goals?.slice(0, 3) || [])
      } catch (error) {
        if (isMounted && process.env.NODE_ENV !== 'production') {
          console.error('Erro ao carregar dashboard:', error)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()

    return () => { isMounted = false }
  }, [month, year])

  // Memoized callbacks para navegação
  const prevMonth = useCallback(() => {
    setMonth(prev => {
      if (prev === 1) {
        setYear(y => y - 1)
        return 12
      }
      return prev - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setMonth(prev => {
      if (prev === 12) {
        setYear(y => y + 1)
        return 1
      }
      return prev + 1
    })
  }, [])

  const goToCurrentMonth = useCallback(() => {
    setMonth(now.getMonth() + 1)
    setYear(now.getFullYear())
  }, [now])

  // Memoized budget calculations
  const { overBudget, totalBudget, totalSpent } = useMemo(() => ({
    overBudget: budgets.filter(b => b.percentUsed > 100),
    totalBudget: budgets.reduce((sum, b) => sum + b.budget, 0),
    totalSpent: budgets.reduce((sum, b) => sum + b.spent, 0)
  }), [budgets])

  return (
    <div className="space-y-6">
      {/* Header com seletor de mês */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          {isCurrentMonth && (
            <p className="page-subtitle">
              Dia {dayOfMonth} de {daysInMonth}
            </p>
          )}
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
            className={`px-4 py-2 rounded-lg font-medium min-w-[160px] text-center transition-colors ${
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
          {/* Alertas */}
          {overBudget.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertTriangle size={20} />
                <span className="font-semibold">{overBudget.length} categoria(s) estourada(s)</span>
              </div>
              <div className="text-sm text-red-300">
                {overBudget.map(b => (
                  <span key={b.category_id} className="mr-3">
                    {b.category_name}: {formatMoney(b.spent)} / {formatMoney(b.budget)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zeni-card rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="text-emerald-500" size={20} />
                </div>
                <span className="text-zeni-muted text-sm">Receitas</span>
              </div>
              <p className="money-lg text-emerald-500">
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
              <p className="money-lg text-red-500">
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
              <p className={`money-lg ${summary?.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatMoney(summary?.balance || 0)}
              </p>
            </div>
          </div>

          {/* Orçamento vs Real */}
          {totalBudget > 0 && (
            <div className="bg-zeni-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target size={20} className="text-zeni-primary" />
                  <h2 className="section-title">Orçamento do Mês</h2>
                </div>
                <span className="text-sm text-zeni-muted">{monthProgress}% do mês</span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Gasto: {formatMoney(totalSpent)}</span>
                  <span>Orçado: {formatMoney(totalBudget)}</span>
                </div>
                <ProgressBar
                  percent={Math.round((totalSpent / totalBudget) * 100)}
                  color="#10B981"
                />
                <p className="text-xs text-zeni-muted mt-1">
                  {totalSpent <= totalBudget
                    ? `Sobram ${formatMoney(totalBudget - totalSpent)}`
                    : `Estourado em ${formatMoney(totalSpent - totalBudget)}`
                  }
                </p>
              </div>

              {/* Top categorias por orçamento */}
              <div className="space-y-3">
                {budgets.slice(0, 5).map((b) => (
                  <BudgetItem key={b.category_id} budget={b} />
                ))}
              </div>

              <Link
                to="/budgets"
                className="block text-center text-zeni-primary text-sm mt-4 hover:underline"
              >
                Ver todos os orçamentos
              </Link>
            </div>
          )}

          {/* Gastos por categoria */}
          {summary?.byCategory?.length > 0 && (
            <div className="bg-zeni-card rounded-xl p-4">
              <h2 className="section-title mb-4">Gastos por categoria</h2>
              <div className="space-y-3">
                {summary.byCategory.slice(0, 6).map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 text-sm">{cat.name}</span>
                    <span className="money-sm">{formatMoney(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimas transações */}
          <div className="bg-zeni-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">
                {isCurrentMonth ? 'Últimas transações' : `Transações de ${MONTH_NAMES[month - 1]}`}
              </h2>
              <Link
                to="/transactions"
                className="text-zeni-primary text-sm flex items-center gap-1 hover:underline"
              >
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>

            {recent.length === 0 ? (
              <p className="text-zeni-muted text-center py-4">
                Nenhuma transação {isCurrentMonth ? 'ainda' : 'neste mês'}
              </p>
            ) : (
              <div className="space-y-3">
                {recent.map((t) => (
                  <TransactionItem key={t.id} transaction={t} />
                ))}
              </div>
            )}
          </div>

          {/* Objetivos */}
          {activeGoals.length > 0 && (
            <div className="bg-zeni-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className="text-yellow-500" />
                  <h2 className="section-title">Meus Objetivos</h2>
                </div>
                <Link
                  to="/goals"
                  className="text-zeni-primary text-sm flex items-center gap-1 hover:underline"
                >
                  Ver todos <ArrowRight size={14} />
                </Link>
              </div>

              {goalsSummary && (
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="bg-zeni-dark rounded-lg p-2">
                    <p className="text-lg font-bold">{goalsSummary.activeCount}</p>
                    <p className="text-xs text-zeni-muted">Ativos</p>
                  </div>
                  <div className="bg-zeni-dark rounded-lg p-2">
                    <p className="text-lg font-bold text-emerald-400">{goalsSummary.overallProgress}%</p>
                    <p className="text-xs text-zeni-muted">Progresso</p>
                  </div>
                  <div className="bg-zeni-dark rounded-lg p-2">
                    <p className="text-lg font-bold">{formatMoney(goalsSummary.totalCurrent)}</p>
                    <p className="text-xs text-zeni-muted">Acumulado</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {activeGoals.map((goal) => (
                  <GoalItem key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          )}

          {/* CTA para chat */}
          <Link
            to="/chat"
            className="block bg-gradient-to-r from-zeni-primary to-emerald-600 rounded-xl p-4 text-center hover:opacity-90 transition-opacity"
          >
            <p className="font-semibold">Converse com a IA</p>
            <p className="text-sm text-emerald-100">Pergunte "como estou?" ou "analise meus gastos"</p>
          </Link>
        </>
      )}
    </div>
  )
}
