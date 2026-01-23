import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, Target, Sparkles, GripVertical } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Componente de passo do wizard
function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i < currentStep
              ? 'w-8 bg-zeni-primary'
              : i === currentStep
              ? 'w-8 bg-emerald-400'
              : 'w-2 bg-slate-600'
          }`}
        />
      ))}
    </div>
  )
}

// Passo 1: Momento financeiro
function Step1({ data, onChange, onNext }) {
  const options = [
    {
      value: 'starting',
      emoji: '🌱',
      title: 'Começando a organizar',
      description: 'Quero ter controle dos meus gastos'
    },
    {
      value: 'optimizing',
      emoji: '📊',
      title: 'Já tenho controle, quero otimizar',
      description: 'Busco melhorar minha gestão financeira'
    },
    {
      value: 'goal_focused',
      emoji: '🎯',
      title: 'Tenho um objetivo específico',
      description: 'Quero juntar para algo importante'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Qual seu momento financeiro?</h1>
        <p className="text-zeni-muted">Isso nos ajuda a personalizar sua experiência</p>
      </div>

      <div className="space-y-3">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange({ moment: opt.value })}
            className={`w-full p-4 rounded-xl text-left transition-all ${
              data.moment === opt.value
                ? 'bg-zeni-primary/20 border-2 border-zeni-primary'
                : 'bg-zeni-card hover:bg-slate-700 border-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{opt.emoji}</span>
              <div>
                <p className="font-medium">{opt.title}</p>
                <p className="text-sm text-zeni-muted">{opt.description}</p>
              </div>
              {data.moment === opt.value && (
                <Check className="ml-auto text-zeni-primary" size={24} />
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!data.moment}
        className="w-full bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        Continuar
        <ChevronRight size={20} />
      </button>
    </div>
  )
}

// Passo 2: Renda e gastos fixos
function Step2({ data, onChange, onNext, onBack }) {
  const fixedCategories = [
    { key: 'housing', label: 'Moradia (aluguel, condomínio)', placeholder: '1500' },
    { key: 'transport', label: 'Transporte fixo (parcela, combustível)', placeholder: '500' },
    { key: 'health', label: 'Saúde (plano, academia)', placeholder: '300' },
    { key: 'education', label: 'Educação (escola, cursos)', placeholder: '200' },
    { key: 'debts', label: 'Dívidas/Financiamentos', placeholder: '0' }
  ]

  const totalFixed = Object.values(data.fixedExpenses || {}).reduce(
    (sum, val) => sum + (parseFloat(val) || 0), 0
  )
  const available = (parseFloat(data.monthlyIncome) || 0) - totalFixed

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Sua renda e gastos fixos</h1>
        <p className="text-zeni-muted">Vamos calcular quanto sobra para gastos variáveis</p>
      </div>

      <div>
        <label className="block text-sm text-zeni-muted mb-1">Renda mensal líquida</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zeni-muted">R$</span>
          <input
            type="number"
            value={data.monthlyIncome || ''}
            onChange={(e) => onChange({ monthlyIncome: e.target.value })}
            className="w-full bg-zeni-card border border-slate-600 rounded-lg pl-12 pr-4 py-3 text-lg"
            placeholder="5000"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Gastos fixos mensais</h3>
        {fixedCategories.map(cat => (
          <div key={cat.key} className="flex items-center gap-3">
            <label className="flex-1 text-sm text-zeni-muted">{cat.label}</label>
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zeni-muted text-sm">R$</span>
              <input
                type="number"
                value={data.fixedExpenses?.[cat.key] || ''}
                onChange={(e) => onChange({
                  fixedExpenses: {
                    ...data.fixedExpenses,
                    [cat.key]: e.target.value
                  }
                })}
                className="w-full bg-zeni-card border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm"
                placeholder={cat.placeholder}
              />
            </div>
          </div>
        ))}
      </div>

      {data.monthlyIncome && (
        <div className="bg-zeni-card rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-zeni-muted">Renda</span>
            <span className="font-medium">{formatMoney(parseFloat(data.monthlyIncome) || 0)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-zeni-muted">Gastos fixos</span>
            <span className="font-medium text-red-400">- {formatMoney(totalFixed)}</span>
          </div>
          <hr className="border-slate-600 my-2" />
          <div className="flex justify-between">
            <span className="font-medium">Disponível para variáveis</span>
            <span className={`font-bold ${available >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatMoney(available)}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-zeni-card hover:bg-slate-700 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft size={20} />
          Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!data.monthlyIncome || parseFloat(data.monthlyIncome) <= 0}
          className="flex-1 bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Continuar
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}

// Passo 3: Prioridades
function Step3({ data, onChange, onNext, onBack }) {
  const priorities = [
    { key: 'security', emoji: '🛡️', label: 'Segurança', description: 'Reserva de emergência' },
    { key: 'achievements', emoji: '🏆', label: 'Conquistas', description: 'Casa, carro, viagem' },
    { key: 'growth', emoji: '📈', label: 'Crescimento', description: 'Investimentos' },
    { key: 'quality_of_life', emoji: '✨', label: 'Qualidade de vida', description: 'Lazer, experiências' }
  ]

  const selected = data.priorities || []

  function togglePriority(key) {
    const newSelected = selected.includes(key)
      ? selected.filter(k => k !== key)
      : [...selected, key]
    onChange({ priorities: newSelected })
  }

  function moveUp(index) {
    if (index === 0) return
    const newSelected = [...selected]
    ;[newSelected[index - 1], newSelected[index]] = [newSelected[index], newSelected[index - 1]]
    onChange({ priorities: newSelected })
  }

  function moveDown(index) {
    if (index === selected.length - 1) return
    const newSelected = [...selected]
    ;[newSelected[index], newSelected[index + 1]] = [newSelected[index + 1], newSelected[index]]
    onChange({ priorities: newSelected })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Suas prioridades financeiras</h1>
        <p className="text-zeni-muted">Selecione e ordene do mais para o menos importante</p>
      </div>

      <div className="space-y-3">
        {priorities.map(p => {
          const isSelected = selected.includes(p.key)
          const index = selected.indexOf(p.key)

          return (
            <div
              key={p.key}
              className={`p-4 rounded-xl transition-all ${
                isSelected
                  ? 'bg-zeni-primary/20 border-2 border-zeni-primary'
                  : 'bg-zeni-card hover:bg-slate-700 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-4">
                {isSelected && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="text-zeni-muted hover:text-white disabled:opacity-30"
                    >
                      <ChevronLeft size={16} className="rotate-90" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === selected.length - 1}
                      className="text-zeni-muted hover:text-white disabled:opacity-30"
                    >
                      <ChevronRight size={16} className="rotate-90" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => togglePriority(p.key)}
                  className="flex-1 flex items-center gap-4 text-left"
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <p className="font-medium">{p.label}</p>
                    <p className="text-sm text-zeni-muted">{p.description}</p>
                  </div>
                  {isSelected && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="bg-zeni-primary text-white text-sm px-2 py-1 rounded-full">
                        #{index + 1}
                      </span>
                      <Check className="text-zeni-primary" size={20} />
                    </div>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-zeni-card hover:bg-slate-700 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft size={20} />
          Voltar
        </button>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex-1 bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Continuar
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}

// Passo 4: Orçamentos sugeridos
function Step4({ data, onChange, onNext, onBack, suggestions, loading }) {
  const budgets = data.budgets || suggestions || []

  function updateBudget(categoryId, amount) {
    const newBudgets = budgets.map(b =>
      b.categoryId === categoryId ? { ...b, amount: parseFloat(amount) || 0 } : b
    )
    onChange({ budgets: newBudgets })
  }

  const total = budgets.reduce((sum, b) => sum + (b.amount || 0), 0)
  const available = data.availableForVariable || 0

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Orçamento sugerido</h1>
        <p className="text-zeni-muted">
          <Sparkles size={16} className="inline mr-1" />
          Baseado nas suas respostas
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-zeni-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zeni-muted">Calculando sugestões...</p>
        </div>
      ) : (
        <>
          <div className="bg-zeni-card rounded-xl p-4 mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-zeni-muted">Total orçado</span>
              <span className={`font-bold ${total <= available ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatMoney(total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zeni-muted">Disponível</span>
              <span className="font-medium">{formatMoney(available)}</span>
            </div>
            {total > available && (
              <p className="text-red-400 text-sm mt-2">
                ⚠️ Orçamento acima do disponível em {formatMoney(total - available)}
              </p>
            )}
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {budgets.map(b => (
              <div key={b.categoryId} className="flex items-center gap-3 bg-zeni-card p-3 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{b.categoryName}</p>
                  <p className="text-sm text-zeni-muted">{b.percentage}% do disponível</p>
                </div>
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zeni-muted text-sm">R$</span>
                  <input
                    type="number"
                    value={b.amount || ''}
                    onChange={(e) => updateBudget(b.categoryId, e.target.value)}
                    className="w-full bg-zeni-dark border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-zeni-card hover:bg-slate-700 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft size={20} />
          Voltar
        </button>
        <button
          onClick={onNext}
          disabled={loading || budgets.length === 0}
          className="flex-1 bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Continuar
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}

// Passo 5: Objetivo (opcional)
function Step5({ data, onChange, onComplete, onBack, completing }) {
  const [createGoal, setCreateGoal] = useState(false)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Tem algum objetivo?</h1>
        <p className="text-zeni-muted">Opcional: defina uma meta para começar</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setCreateGoal(false)}
          className={`w-full p-4 rounded-xl text-left transition-all ${
            !createGoal
              ? 'bg-zeni-primary/20 border-2 border-zeni-primary'
              : 'bg-zeni-card hover:bg-slate-700 border-2 border-transparent'
          }`}
        >
          <div className="flex items-center gap-4">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="font-medium">Só quero começar</p>
              <p className="text-sm text-zeni-muted">Crio objetivos depois</p>
            </div>
            {!createGoal && <Check className="ml-auto text-zeni-primary" size={24} />}
          </div>
        </button>

        <button
          onClick={() => setCreateGoal(true)}
          className={`w-full p-4 rounded-xl text-left transition-all ${
            createGoal
              ? 'bg-zeni-primary/20 border-2 border-zeni-primary'
              : 'bg-zeni-card hover:bg-slate-700 border-2 border-transparent'
          }`}
        >
          <div className="flex items-center gap-4">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-medium">Quero criar um objetivo agora</p>
              <p className="text-sm text-zeni-muted">Viagem, carro, reserva...</p>
            </div>
            {createGoal && <Check className="ml-auto text-zeni-primary" size={24} />}
          </div>
        </button>
      </div>

      {createGoal && (
        <div className="space-y-4 bg-zeni-card rounded-xl p-4">
          <div>
            <label className="block text-sm text-zeni-muted mb-1">Nome do objetivo</label>
            <input
              type="text"
              value={data.goal?.name || ''}
              onChange={(e) => onChange({ goal: { ...data.goal, name: e.target.value } })}
              className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
              placeholder="Ex: Viagem para Europa"
            />
          </div>
          <div>
            <label className="block text-sm text-zeni-muted mb-1">Valor alvo (R$)</label>
            <input
              type="number"
              value={data.goal?.targetAmount || ''}
              onChange={(e) => onChange({ goal: { ...data.goal, targetAmount: e.target.value } })}
              className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
              placeholder="15000"
            />
          </div>
          <div>
            <label className="block text-sm text-zeni-muted mb-1">Prazo (opcional)</label>
            <input
              type="date"
              value={data.goal?.deadline || ''}
              onChange={(e) => onChange({ goal: { ...data.goal, deadline: e.target.value } })}
              className="w-full bg-zeni-dark border border-slate-600 rounded-lg px-4 py-2"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-zeni-card hover:bg-slate-700 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft size={20} />
          Voltar
        </button>
        <button
          onClick={() => onComplete(createGoal)}
          disabled={completing || (createGoal && (!data.goal?.name || !data.goal?.targetAmount))}
          className="flex-1 bg-zeni-primary hover:bg-emerald-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {completing ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Finalizando...
            </>
          ) : (
            <>
              Concluir
              <Check size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    moment: '',
    monthlyIncome: '',
    fixedExpenses: {},
    priorities: [],
    budgets: [],
    availableForVariable: 0,
    goal: null
  })
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [completing, setCompleting] = useState(false)

  function updateData(updates) {
    setData(prev => ({ ...prev, ...updates }))
  }

  async function saveStep(stepNum, stepData) {
    try {
      const token = localStorage.getItem('zeni_token')
      await fetch(`${API_URL}/onboarding/step/${stepNum}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(stepData)
      })
    } catch (error) {
      console.error('Erro ao salvar passo:', error)
    }
  }

  async function loadSuggestions() {
    setLoadingSuggestions(true)
    try {
      const token = localStorage.getItem('zeni_token')
      const res = await fetch(`${API_URL}/onboarding/suggested-budgets`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await res.json()
      setSuggestions(result.suggestions || [])
      updateData({
        budgets: result.suggestions || [],
        availableForVariable: result.availableForVariable || 0
      })
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  async function handleNext() {
    if (step === 0) {
      await saveStep(1, { moment: data.moment })
    } else if (step === 1) {
      await saveStep(2, {
        monthlyIncome: parseFloat(data.monthlyIncome),
        fixedExpenses: data.fixedExpenses
      })
    } else if (step === 2) {
      await saveStep(3, { priorities: data.priorities })
      loadSuggestions()
    } else if (step === 3) {
      await saveStep(4, { budgets: data.budgets })
    }
    setStep(step + 1)
  }

  async function handleComplete(createGoal) {
    setCompleting(true)
    try {
      const token = localStorage.getItem('zeni_token')

      // Salvar passo 5
      await fetch(`${API_URL}/onboarding/step/5`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          createGoal,
          goal: createGoal ? {
            name: data.goal?.name,
            targetAmount: parseFloat(data.goal?.targetAmount),
            deadline: data.goal?.deadline || null,
            priority: 'high',
            category: 'savings'
          } : null
        })
      })

      // Finalizar onboarding
      await fetch(`${API_URL}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      // Redirecionar para dashboard
      navigate('/')
    } catch (error) {
      console.error('Erro ao finalizar:', error)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zeni-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-zeni-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target size={32} className="text-white" />
          </div>
          <h2 className="text-zeni-primary font-bold text-xl">Zeni</h2>
        </div>

        <StepIndicator currentStep={step} totalSteps={5} />

        <div className="bg-zeni-card/50 rounded-2xl p-6">
          {step === 0 && (
            <Step1 data={data} onChange={updateData} onNext={handleNext} />
          )}
          {step === 1 && (
            <Step2
              data={data}
              onChange={updateData}
              onNext={handleNext}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <Step3
              data={data}
              onChange={updateData}
              onNext={handleNext}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step4
              data={data}
              onChange={updateData}
              onNext={handleNext}
              onBack={() => setStep(2)}
              suggestions={suggestions}
              loading={loadingSuggestions}
            />
          )}
          {step === 4 && (
            <Step5
              data={data}
              onChange={updateData}
              onComplete={handleComplete}
              onBack={() => setStep(3)}
              completing={completing}
            />
          )}
        </div>

        <p className="text-center text-zeni-muted text-sm mt-4">
          Você pode ajustar tudo isso depois nas configurações
        </p>
      </div>
    </div>
  )
}
