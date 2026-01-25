import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

/**
 * OfflineIndicator - Indicador de status de conexão
 *
 * Mostra banner quando offline e botão para tentar reconectar
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Esconde banner após 2 segundos quando volta online
      setTimeout(() => setShowBanner(false), 2000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verificar status inicial
    if (!navigator.onLine) {
      setShowBanner(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = async () => {
    setIsReconnecting(true)
    try {
      // Tentar fazer uma requisição simples para verificar conexão
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store'
      })
      if (response.ok) {
        setIsOnline(true)
        setTimeout(() => setShowBanner(false), 1000)
      }
    } catch {
      // Ainda offline
    } finally {
      setIsReconnecting(false)
    }
  }

  if (!showBanner) return null

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50 px-4 py-3
        flex items-center justify-center gap-3
        transition-all duration-300
        ${isOnline
          ? 'bg-green-600 text-white'
          : 'bg-amber-600 text-white'
        }
      `}
      role="alert"
      aria-live="assertive"
    >
      {isOnline ? (
        <>
          <span className="text-sm font-medium">Conexão restaurada!</span>
        </>
      ) : (
        <>
          <WifiOff size={18} aria-hidden="true" />
          <span className="text-sm font-medium">Você está offline</span>
          <button
            onClick={handleRetry}
            disabled={isReconnecting}
            className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isReconnecting ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            {isReconnecting ? 'Verificando...' : 'Tentar novamente'}
          </button>
        </>
      )}
    </div>
  )
}
