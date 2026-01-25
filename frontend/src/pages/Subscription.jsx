import { useState, useEffect, memo } from 'react'
import { Check, X, Zap, Crown, Star, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

/**
 * Subscription - Página de Planos e Assinatura
 *
 * Mostra os planos disponíveis e permite upgrade
 */

const PLANS = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    period: 'para sempre',
    icon: Star,
    color: 'text-slate-400',
    bgGradient: 'from-slate-700 to-slate-800',
    features: [
      { text: 'Registro de transações ilimitado', included: true },
      { text: 'Chat com a Zeni (30 msgs/dia)', included: true },
      { text: 'Orçamentos básicos', included: true },
      { text: '1 Objetivo financeiro', included: true },
      { text: 'Insights básicos', included: true },
      { text: 'Análises avançadas', included: false },
      { text: 'Alertas proativos', included: false },
      { text: 'Exportação de relatórios', included: false },
      { text: 'Suporte prioritário', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.90,
    period: '/mês',
    icon: Zap,
    color: 'text-zeni-primary',
    bgGradient: 'from-emerald-800 to-emerald-900',
    popular: true,
    features: [
      { text: 'Registro de transações ilimitado', included: true },
      { text: 'Chat ilimitado com a Zeni', included: true },
      { text: 'Orçamentos avançados', included: true },
      { text: 'Objetivos ilimitados', included: true },
      { text: 'Insights personalizados', included: true },
      { text: 'Análises avançadas com IA', included: true },
      { text: 'Alertas proativos', included: true },
      { text: 'Exportação de relatórios', included: true },
      { text: 'Suporte prioritário', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39.90,
    period: '/mês',
    icon: Crown,
    color: 'text-purple-400',
    bgGradient: 'from-purple-800 to-purple-900',
    features: [
      { text: 'Tudo do Premium', included: true },
      { text: 'Chat com modelos avançados', included: true },
      { text: 'Análise de investimentos', included: true },
      { text: 'Projeções financeiras', included: true },
      { text: 'Integração bancária (em breve)', included: true },
      { text: 'API para desenvolvedores', included: true },
      { text: 'Backup automático', included: true },
      { text: 'Suporte prioritário 24/7', included: true },
      { text: 'Acesso antecipado a novidades', included: true },
    ],
  },
]

/**
 * FeatureItem - Item de feature do plano
 */
const FeatureItem = memo(function FeatureItem({ text, included }) {
  return (
    <li className="flex items-start gap-2">
      {included ? (
        <Check size={18} className="text-zeni-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
      ) : (
        <X size={18} className="text-slate-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
      )}
      <span className={included ? 'text-zeni-text' : 'text-slate-500'}>{text}</span>
    </li>
  )
})

/**
 * PlanCard - Card de um plano
 */
const PlanCard = memo(function PlanCard({ plan, currentPlan, onSelect }) {
  const Icon = plan.icon
  const isCurrentPlan = currentPlan === plan.id

  return (
    <div
      className={`
        relative rounded-2xl p-6 transition-all duration-300
        ${plan.popular ? 'ring-2 ring-zeni-primary scale-105 z-10' : 'ring-1 ring-zeni-border'}
        bg-gradient-to-br ${plan.bgGradient}
        ${isCurrentPlan ? 'opacity-75' : 'hover:scale-[1.02]'}
      `}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-zeni-primary text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Sparkles size={12} aria-hidden="true" />
            Mais Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <div className={`inline-flex p-3 rounded-xl bg-black/20 ${plan.color} mb-3`}>
          <Icon size={28} aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold text-zeni-text">{plan.name}</h3>
        <div className="mt-2">
          {plan.price === 0 ? (
            <span className="text-3xl font-bold text-zeni-text">Grátis</span>
          ) : (
            <>
              <span className="text-sm text-zeni-muted">R$</span>
              <span className="text-3xl font-bold text-zeni-text">{plan.price.toFixed(2).replace('.', ',')}</span>
              <span className="text-zeni-muted">{plan.period}</span>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-6 text-sm">
        {plan.features.map((feature, idx) => (
          <FeatureItem key={idx} {...feature} />
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrentPlan}
        className={`
          w-full py-3 px-4 rounded-xl font-medium transition-all duration-200
          ${isCurrentPlan
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
            : plan.popular
              ? 'bg-zeni-primary hover:bg-emerald-600 text-white shadow-glow'
              : 'bg-white/10 hover:bg-white/20 text-zeni-text'
          }
        `}
      >
        {isCurrentPlan ? 'Plano Atual' : plan.price === 0 ? 'Começar Grátis' : 'Assinar Agora'}
      </button>
    </div>
  )
})

/**
 * Subscription Page
 */
export default function Subscription() {
  const { user } = useAuth()
  const [currentPlan, setCurrentPlan] = useState('free')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Pegar plano atual do usuário
    if (user?.subscription_tier) {
      setCurrentPlan(user.subscription_tier)
    }
  }, [user])

  const handleSelectPlan = async (planId) => {
    if (planId === currentPlan) return

    // TODO: Implementar integração com gateway de pagamento
    setLoading(true)
    try {
      // Simular chamada API
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Por enquanto, apenas mostrar alerta
      if (planId !== 'free') {
        alert('Integração com pagamento em desenvolvimento. Em breve você poderá assinar!')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-zeni-text mb-3">
          Escolha seu Plano
        </h1>
        <p className="text-zeni-muted max-w-xl mx-auto">
          Desbloqueie todo o potencial da Zeni para transformar suas finanças pessoais
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentPlan={currentPlan}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-zeni-muted">
          Todos os planos incluem criptografia de ponta a ponta e backup automático.
          <br />
          Cancele a qualquer momento. Sem taxas ocultas.
        </p>
      </div>
    </div>
  )
}
