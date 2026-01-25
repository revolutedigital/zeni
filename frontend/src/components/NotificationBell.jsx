import { useState, useEffect, useCallback, memo } from 'react'
import { Bell, X, Check, AlertTriangle, TrendingUp, Target, Sparkles } from 'lucide-react'
import { getAlerts, markAlertAsRead } from '../services/api'

/**
 * NotificationBell - Componente de notificações no header
 *
 * Mostra alertas e notificações proativas do sistema:
 * - Alertas de orçamento estourado
 * - Dicas de economia
 * - Progresso de objetivos
 * - Insights da IA
 */

// Mapeia tipos de alerta para ícones e cores
const ALERT_STYLES = {
  budget_exceeded: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
  budget_warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
  },
  goal_progress: {
    icon: Target,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  goal_achieved: {
    icon: Sparkles,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  insight: {
    icon: TrendingUp,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
  tip: {
    icon: Sparkles,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
  },
  default: {
    icon: Bell,
    color: 'text-zeni-muted',
    bgColor: 'bg-zeni-card',
  },
}

// Formata tempo relativo
function formatTimeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

/**
 * NotificationItem - Item individual de notificação
 */
const NotificationItem = memo(function NotificationItem({ alert, onRead }) {
  const style = ALERT_STYLES[alert.type] || ALERT_STYLES.default
  const Icon = style.icon

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-xl transition-all duration-200
        ${alert.read ? 'opacity-60' : 'bg-zeni-card/50'}
        hover:bg-zeni-card
      `}
      role="listitem"
    >
      <div className={`p-2 rounded-lg ${style.bgColor}`}>
        <Icon size={18} className={style.color} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zeni-text line-clamp-2">{alert.message}</p>
        <span className="text-xs text-zeni-muted">{formatTimeAgo(alert.created_at)}</span>
      </div>
      {!alert.read && (
        <button
          onClick={() => onRead(alert.id)}
          className="p-1 rounded-lg hover:bg-zeni-primary/20 text-zeni-muted hover:text-zeni-primary transition-colors"
          aria-label="Marcar como lida"
        >
          <Check size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
})

/**
 * NotificationBell - Sino de notificações com dropdown
 */
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  // Conta alertas não lidos
  const unreadCount = alerts.filter(a => !a.read).length

  // Busca alertas
  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAlerts()
      setAlerts(data.alerts || [])
    } catch (error) {
      // Silently fail - alertas são opcionais
      console.debug('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Busca alertas ao montar e periodicamente
  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000) // A cada 1 minuto
    return () => clearInterval(interval)
  }, [fetchAlerts])

  // Marca alerta como lido
  const handleMarkAsRead = useCallback(async (alertId) => {
    try {
      await markAlertAsRead(alertId)
      setAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, read: true } : a
      ))
    } catch (error) {
      console.debug('Failed to mark alert as read:', error)
    }
  }, [])

  // Marca todos como lidos
  const handleMarkAllAsRead = useCallback(async () => {
    const unreadAlerts = alerts.filter(a => !a.read)
    for (const alert of unreadAlerts) {
      await markAlertAsRead(alert.id).catch(() => {})
    }
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
  }, [alerts])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('.notification-dropdown')) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative notification-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-xl transition-all duration-200
          ${isOpen ? 'bg-zeni-primary/20 text-zeni-primary' : 'text-zeni-muted hover:text-zeni-text hover:bg-zeni-card/50'}
        `}
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden bg-zeni-dark border border-zeni-border rounded-2xl shadow-warm-xl z-50"
          role="dialog"
          aria-label="Painel de notificações"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-zeni-border">
            <h3 className="text-sm font-semibold text-zeni-text">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-zeni-primary hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-zeni-card text-zeni-muted"
                aria-label="Fechar notificações"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-80" role="list">
            {loading && alerts.length === 0 ? (
              <div className="p-4 text-center text-zeni-muted text-sm">
                Carregando...
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto text-zeni-muted/30 mb-2" aria-hidden="true" />
                <p className="text-sm text-zeni-muted">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {alerts.slice(0, 10).map(alert => (
                  <NotificationItem
                    key={alert.id}
                    alert={alert}
                    onRead={handleMarkAsRead}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
