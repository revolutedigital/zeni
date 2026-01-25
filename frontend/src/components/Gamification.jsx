import { memo, useMemo } from 'react'
import { Flame, Star, Award, Trophy, Target, Zap, Crown, Medal } from 'lucide-react'

/**
 * Gamification Components - Zeni 2026
 *
 * Componentes para engajamento através de gamificação:
 * - StreakBadge: Mostra sequência de dias ativos
 * - AchievementBadge: Conquistas desbloqueadas
 * - ProgressRing: Anel de progresso circular
 * - LevelIndicator: Indicador de nível do usuário
 */

// Configuração de badges de streak
const STREAK_BADGES = [
  { min: 3, icon: Flame, label: '3 Dias', color: 'text-orange-400', bgColor: 'bg-orange-400/20' },
  { min: 7, icon: Flame, label: '1 Semana', color: 'text-orange-500', bgColor: 'bg-orange-500/20' },
  { min: 14, icon: Star, label: '2 Semanas', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  { min: 30, icon: Star, label: '1 Mês', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' },
  { min: 60, icon: Trophy, label: '2 Meses', color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
  { min: 100, icon: Crown, label: '100 Dias', color: 'text-purple-400', bgColor: 'bg-purple-400/20' },
  { min: 365, icon: Crown, label: '1 Ano', color: 'text-purple-500', bgColor: 'bg-purple-500/20' },
]

// Tipos de conquistas
const ACHIEVEMENT_TYPES = {
  first_transaction: {
    icon: Zap,
    title: 'Primeiro Passo',
    description: 'Registrou sua primeira transação',
    color: 'text-blue-400',
  },
  budget_master: {
    icon: Target,
    title: 'Mestre do Orçamento',
    description: 'Ficou dentro do orçamento por 1 mês',
    color: 'text-green-400',
  },
  savings_goal: {
    icon: Trophy,
    title: 'Poupador',
    description: 'Completou seu primeiro objetivo',
    color: 'text-yellow-400',
  },
  consistent_tracker: {
    icon: Flame,
    title: 'Consistente',
    description: 'Registrou transações por 7 dias seguidos',
    color: 'text-orange-400',
  },
  chat_explorer: {
    icon: Star,
    title: 'Explorador',
    description: 'Usou todos os agentes da Zeni',
    color: 'text-purple-400',
  },
  budget_creator: {
    icon: Award,
    title: 'Planejador',
    description: 'Criou orçamentos para 5 categorias',
    color: 'text-emerald-400',
  },
  goal_achiever: {
    icon: Medal,
    title: 'Realizador',
    description: 'Completou 3 objetivos financeiros',
    color: 'text-amber-400',
  },
}

/**
 * StreakBadge - Mostra sequência de dias ativos
 */
export const StreakBadge = memo(function StreakBadge({ days, showLabel = true, size = 'md' }) {
  const currentBadge = useMemo(() => {
    // Encontrar o maior badge conquistado
    return [...STREAK_BADGES]
      .reverse()
      .find(badge => days >= badge.min)
  }, [days])

  if (!currentBadge || days < 3) {
    return null
  }

  const Icon = currentBadge.icon
  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2',
  }
  const iconSizes = { sm: 14, md: 18, lg: 22 }

  return (
    <div
      className={`flex items-center ${sizeClasses[size]} ${currentBadge.bgColor} ${currentBadge.color} px-2.5 py-1 rounded-full`}
      title={`${days} dias consecutivos!`}
      role="status"
      aria-label={`Sequência de ${days} dias`}
    >
      <Icon size={iconSizes[size]} className="animate-pulse" aria-hidden="true" />
      {showLabel && (
        <span className="font-medium">{days} dias</span>
      )}
    </div>
  )
})

/**
 * AchievementBadge - Uma conquista individual
 */
export const AchievementBadge = memo(function AchievementBadge({
  type,
  unlocked = false,
  size = 'md',
  showTooltip = true
}) {
  const achievement = ACHIEVEMENT_TYPES[type]
  if (!achievement) return null

  const Icon = achievement.icon
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }
  const iconSizes = { sm: 16, md: 24, lg: 32 }

  return (
    <div
      className={`
        ${sizeClasses[size]} rounded-full flex items-center justify-center
        transition-all duration-300
        ${unlocked
          ? `bg-gradient-to-br from-zeni-card to-zeni-dark ${achievement.color} shadow-lg`
          : 'bg-slate-800/50 text-slate-600'
        }
      `}
      title={showTooltip ? `${achievement.title}: ${achievement.description}` : undefined}
      role="img"
      aria-label={unlocked ? `Conquista desbloqueada: ${achievement.title}` : `Conquista bloqueada: ${achievement.title}`}
    >
      <Icon size={iconSizes[size]} aria-hidden="true" />
    </div>
  )
})

/**
 * AchievementsRow - Lista de conquistas em linha
 */
export const AchievementsRow = memo(function AchievementsRow({ achievements = [] }) {
  const allAchievements = Object.keys(ACHIEVEMENT_TYPES)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {allAchievements.map(type => (
        <AchievementBadge
          key={type}
          type={type}
          unlocked={achievements.includes(type)}
          size="sm"
        />
      ))}
    </div>
  )
})

/**
 * ProgressRing - Anel de progresso circular
 */
export const ProgressRing = memo(function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 6,
  color = 'stroke-zeni-primary',
  bgColor = 'stroke-slate-700',
  showPercent = true,
  children
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={bgColor}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-500`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showPercent && (
          <span className="text-sm font-bold text-zeni-text">{Math.round(progress)}%</span>
        ))}
      </div>
    </div>
  )
})

/**
 * LevelIndicator - Indicador de nível do usuário
 */
export const LevelIndicator = memo(function LevelIndicator({
  xp = 0,
  level = 1,
  showProgress = true
}) {
  // XP necessário para cada nível (progressão exponencial suave)
  const xpForLevel = (lvl) => Math.floor(100 * Math.pow(1.5, lvl - 1))
  const xpForCurrentLevel = xpForLevel(level)
  const xpForNextLevel = xpForLevel(level + 1)
  const xpInCurrentLevel = xp - xpForCurrentLevel
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel
  const progress = (xpInCurrentLevel / xpNeededForNext) * 100

  const levelTitles = {
    1: 'Iniciante',
    2: 'Aprendiz',
    3: 'Praticante',
    4: 'Conhecedor',
    5: 'Expert',
    6: 'Mestre',
    7: 'Grão-Mestre',
    8: 'Lenda',
    9: 'Mito',
    10: 'Transcendente',
  }

  return (
    <div className="flex items-center gap-3">
      <ProgressRing progress={progress} size={48} strokeWidth={4}>
        <span className="text-sm font-bold text-zeni-primary">{level}</span>
      </ProgressRing>
      {showProgress && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-zeni-text">
            {levelTitles[level] || `Nível ${level}`}
          </span>
          <span className="text-xs text-zeni-muted">
            {xpInCurrentLevel.toLocaleString()} / {xpNeededForNext.toLocaleString()} XP
          </span>
        </div>
      )}
    </div>
  )
})

/**
 * GamificationCard - Card completo com todas as métricas de gamificação
 */
export const GamificationCard = memo(function GamificationCard({
  streak = 0,
  achievements = [],
  xp = 0,
  level = 1
}) {
  return (
    <div className="bg-zeni-card rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <LevelIndicator xp={xp} level={level} />
        <StreakBadge days={streak} />
      </div>

      <div>
        <h4 className="text-xs text-zeni-muted uppercase tracking-wider mb-2">Conquistas</h4>
        <AchievementsRow achievements={achievements} />
      </div>
    </div>
  )
})

export default {
  StreakBadge,
  AchievementBadge,
  AchievementsRow,
  ProgressRing,
  LevelIndicator,
  GamificationCard,
}
