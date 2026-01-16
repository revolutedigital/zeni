import { forwardRef } from 'react'

/**
 * Button - Componente de botão do Design System Zeni
 *
 * @param {string} variant - 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} loading - Estado de carregamento
 * @param {boolean} fullWidth - Largura total
 * @param {ReactNode} leftIcon - Ícone à esquerda
 * @param {ReactNode} rightIcon - Ícone à direita
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zeni-dark'

  const variants = {
    primary: 'bg-zeni-primary hover:bg-emerald-600 active:bg-emerald-700 text-white focus-visible:ring-zeni-primary disabled:bg-emerald-800',
    secondary: 'bg-zeni-card hover:bg-slate-600 active:bg-slate-500 text-zeni-text border border-slate-600 focus-visible:ring-slate-500',
    ghost: 'bg-transparent hover:bg-slate-700/50 active:bg-slate-700 text-zeni-muted hover:text-zeni-text',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus-visible:ring-red-500',
    success: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white focus-visible:ring-emerald-500'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2.5'
  }

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20
  }

  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin"
          width={iconSizes[size]}
          height={iconSizes[size]}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : leftIcon ? (
        <span aria-hidden="true">{leftIcon}</span>
      ) : null}

      {loading ? 'Carregando...' : children}

      {!loading && rightIcon && (
        <span aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
