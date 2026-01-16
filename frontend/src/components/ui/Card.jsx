import { forwardRef } from 'react'

/**
 * Card - Componente de card do Design System Zeni
 *
 * @param {string} variant - 'default' | 'elevated' | 'outlined' | 'interactive'
 * @param {string} padding - 'none' | 'sm' | 'md' | 'lg'
 */
const Card = forwardRef(({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  as: Component = 'div',
  ...props
}, ref) => {
  const baseStyles = 'rounded-xl'

  const variants = {
    default: 'bg-zeni-card',
    elevated: 'bg-zeni-card shadow-lg shadow-black/20',
    outlined: 'bg-zeni-card border border-slate-700',
    interactive: 'bg-zeni-card border border-slate-700 hover:border-zeni-primary/50 hover:bg-slate-700/30 transition-all cursor-pointer'
  }

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  return (
    <Component
      ref={ref}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${paddings[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </Component>
  )
})

Card.displayName = 'Card'

/**
 * CardHeader - Cabeçalho do Card
 */
export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
)

/**
 * CardTitle - Título do Card
 */
export const CardTitle = ({ children, className = '', as: Component = 'h3', ...props }) => (
  <Component className={`text-lg font-semibold text-zeni-text ${className}`} {...props}>
    {children}
  </Component>
)

/**
 * CardDescription - Descrição do Card
 */
export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`text-sm text-zeni-muted mt-1 ${className}`} {...props}>
    {children}
  </p>
)

/**
 * CardContent - Conteúdo do Card
 */
export const CardContent = ({ children, className = '', ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
)

/**
 * CardFooter - Rodapé do Card
 */
export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`mt-4 pt-4 border-t border-slate-700 ${className}`} {...props}>
    {children}
  </div>
)

export default Card
