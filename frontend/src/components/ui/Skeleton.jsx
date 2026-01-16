/**
 * Skeleton - Componente de loading skeleton do Design System Zeni
 *
 * @param {string} variant - 'text' | 'circular' | 'rectangular'
 * @param {string|number} width - Largura
 * @param {string|number} height - Altura
 */
export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  ...props
}) {
  const baseStyles = 'bg-slate-700 animate-pulse'

  const variants = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={style}
      aria-hidden="true"
      {...props}
    />
  )
}

/**
 * SkeletonCard - Skeleton para cards
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-zeni-card rounded-xl p-4 ${className}`}>
      <Skeleton variant="text" width="60%" className="mb-2" />
      <Skeleton variant="text" width="100%" className="mb-2" />
      <Skeleton variant="text" width="80%" />
    </div>
  )
}

/**
 * SkeletonTransaction - Skeleton para linha de transação
 */
export function SkeletonTransaction() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton variant="text" width="50%" className="mb-1" />
        <Skeleton variant="text" width="30%" height={12} />
      </div>
      <Skeleton variant="text" width={80} />
    </div>
  )
}

/**
 * SkeletonDashboard - Skeleton para dashboard
 */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" width={150} height={40} />
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Lista */}
      <div className="bg-zeni-card rounded-xl">
        {[1, 2, 3, 4, 5].map(i => (
          <SkeletonTransaction key={i} />
        ))}
      </div>
    </div>
  )
}
