import { forwardRef } from 'react'

/**
 * Input - Componente de input do Design System Zeni
 *
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} state - 'default' | 'error' | 'success'
 * @param {string} label - Label do input
 * @param {string} helperText - Texto de ajuda
 * @param {ReactNode} leftIcon - Ícone à esquerda
 * @param {ReactNode} rightIcon - Ícone à direita
 */
const Input = forwardRef(({
  label,
  helperText,
  error,
  size = 'md',
  state = 'default',
  leftIcon,
  rightIcon,
  className = '',
  id,
  required,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  const helperId = `${inputId}-helper`

  const baseStyles = 'w-full bg-zeni-dark border rounded-lg transition-all duration-200 text-zeni-text placeholder:text-zeni-muted'

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-4 py-3 text-lg'
  }

  const states = {
    default: 'border-slate-600 focus:border-zeni-primary focus:ring-2 focus:ring-zeni-primary/20',
    error: 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
    success: 'border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  }

  const currentState = error ? 'error' : state

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-zeni-muted mb-1.5"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zeni-muted">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          className={`
            ${baseStyles}
            ${sizes[size]}
            ${states[currentState]}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${className}
          `}
          aria-invalid={currentState === 'error'}
          aria-describedby={helperText || error ? helperId : undefined}
          required={required}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zeni-muted">
            {rightIcon}
          </div>
        )}
      </div>

      {(helperText || error) && (
        <p
          id={helperId}
          className={`mt-1.5 text-sm ${
            currentState === 'error' ? 'text-red-400' : 'text-zeni-muted'
          }`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
