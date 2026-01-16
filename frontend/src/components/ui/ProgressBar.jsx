/**
 * ProgressBar - Componente de barra de progresso do Design System Zeni
 *
 * @param {number} value - Valor atual (0-100+)
 * @param {number} max - Valor máximo (default: 100)
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} color - Cor da barra (hex ou classe tailwind)
 * @param {boolean} showLabel - Mostrar porcentagem
 * @param {boolean} animated - Animação de stripe
 */
export default function ProgressBar({
  value = 0,
  max = 100,
  size = 'md',
  color,
  showLabel = false,
  animated = false,
  className = '',
  ariaLabel,
  ...props
}) {
  const percent = Math.round((value / max) * 100)
  const displayPercent = Math.min(percent, 100)
  const isOver = percent > 100

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  }

  // Determinar cor baseada no estado
  const getColor = () => {
    if (color) return color
    if (isOver) return '#EF4444' // Vermelho
    if (percent > 80) return '#FBBF24' // Amarelo
    return '#10B981' // Verde
  }

  return (
    <div className={`w-full ${className}`} {...props}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-zeni-muted">Progresso</span>
          <span className={`text-sm font-medium ${isOver ? 'text-red-400' : 'text-zeni-text'}`}>
            {percent}%
          </span>
        </div>
      )}

      <div
        className={`w-full bg-slate-700 rounded-full overflow-hidden ${sizes[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel || `${percent}% completo`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            animated ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer' : ''
          }`}
          style={{
            width: `${displayPercent}%`,
            backgroundColor: getColor()
          }}
        />
      </div>
    </div>
  )
}

/**
 * ProgressCircle - Versão circular do ProgressBar
 */
export function ProgressCircle({
  value = 0,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color,
  showLabel = true,
  className = '',
  ...props
}) {
  const percent = Math.round((value / max) * 100)
  const isOver = percent > 100

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference

  const getColor = () => {
    if (color) return color
    if (isOver) return '#EF4444'
    if (percent > 80) return '#FBBF24'
    return '#10B981'
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      {...props}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <span className={`absolute text-xs font-medium ${isOver ? 'text-red-400' : 'text-zeni-text'}`}>
          {percent}%
        </span>
      )}
    </div>
  )
}
