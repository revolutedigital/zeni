/**
 * Badge - Componente de badge/tag do Design System Zeni
 *
 * @param {string} variant - 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
 * @param {string} size - 'sm' | 'md'
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full'

  const variants = {
    default: 'bg-slate-700 text-zeni-text',
    success: 'bg-emerald-400/20 text-emerald-400',
    warning: 'bg-amber-400/20 text-amber-400',
    danger: 'bg-red-400/20 text-red-400',
    info: 'bg-blue-400/20 text-blue-400',
    purple: 'bg-purple-400/20 text-purple-400'
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  }

  return (
    <span
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  )
}
