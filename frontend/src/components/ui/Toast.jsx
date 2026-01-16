import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import ZeniMascot from '../ZeniMascot'

// Contexto do Toast
const ToastContext = createContext(null)

/**
 * ToastProvider - Provider para sistema de toasts
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({
    message,
    type = 'info',
    duration = 4000,
    withMascot = false
  }) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type, withMascot }])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Helpers
  const success = (message, options = {}) => addToast({ message, type: 'success', ...options })
  const error = (message, options = {}) => addToast({ message, type: 'error', ...options })
  const warning = (message, options = {}) => addToast({ message, type: 'warning', ...options })
  const info = (message, options = {}) => addToast({ message, type: 'info', ...options })
  const zeni = (message, options = {}) => addToast({ message, type: 'success', withMascot: true, ...options })

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info, zeni }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

/**
 * useToast - Hook para usar toasts
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider')
  }
  return context
}

/**
 * ToastContainer - Container dos toasts
 */
function ToastContainer({ toasts, onClose }) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full"
      role="region"
      aria-label="Notificações"
    >
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  )
}

/**
 * Toast - Componente individual de toast
 */
function Toast({ message, type, withMascot, onClose }) {
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-emerald-500/10 border-emerald-500/30',
      textColor: 'text-emerald-400',
      mascotVariant: 'happy'
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-500/10 border-red-500/30',
      textColor: 'text-red-400',
      mascotVariant: 'worried'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-500/10 border-amber-500/30',
      textColor: 'text-amber-400',
      mascotVariant: 'worried'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-500/10 border-blue-500/30',
      textColor: 'text-blue-400',
      mascotVariant: 'default'
    }
  }

  const { icon: Icon, bgColor, textColor, mascotVariant } = config[type]

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm
        ${bgColor}
        toast-enter
      `}
      role="alert"
    >
      {withMascot ? (
        <ZeniMascot variant={mascotVariant} size="sm" />
      ) : (
        <Icon size={20} className={textColor} aria-hidden="true" />
      )}

      <p className="flex-1 text-sm text-zeni-text">{message}</p>

      <button
        onClick={onClose}
        className="text-zeni-muted hover:text-zeni-text transition-colors"
        aria-label="Fechar notificação"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

export default Toast
