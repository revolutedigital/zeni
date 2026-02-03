import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Receipt, MessageCircle, LogOut, Trophy, Wallet } from 'lucide-react'
import ZeniMascot from './ZeniMascot'
import NotificationBell from './NotificationBell'

/**
 * Layout - Chat-Centric Navigation 2026
 *
 * Navegação reorganizada com Chat como item central destacado
 */
export default function Layout({ children, user, onLogout }) {
  const location = useLocation()

  // Navegação Chat-Centric: Chat no centro e destacado
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Home', ariaLabel: 'Ir para Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Extrato', ariaLabel: 'Ver transações' },
    { path: '/chat', icon: MessageCircle, label: 'Zeni', ariaLabel: 'Conversar com a Zeni', isMain: true },
    { path: '/budgets', icon: Wallet, label: 'Orçamentos', ariaLabel: 'Gerenciar orçamentos' },
    { path: '/goals', icon: Trophy, label: 'Objetivos', ariaLabel: 'Ver objetivos' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip Link para acessibilidade */}
      <a href="#main-content" className="skip-link">
        Pular para conteúdo principal
      </a>

      {/* Header - Glassmorphism 2026 */}
      <header
        className="glass-card border-b border-zeni-border px-4 py-3 sticky top-0 z-40"
        role="banner"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/chat"
            className="flex items-center gap-2 group"
            aria-label="Zeni - Ir para chat"
          >
            <div className="transition-transform duration-200 group-hover:scale-110">
              <ZeniMascot variant="icon" size="sm" animated animation="breathe" />
            </div>
            <span className="text-xl font-bold gradient-primary-text">Zeni</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-zeni-muted text-sm hidden sm:block" aria-label={`Usuário: ${user?.name}`}>
              {user?.name}
            </span>
            <NotificationBell />
            <button
              onClick={onLogout}
              className="text-zeni-muted hover:text-red-400 transition-all duration-200 p-2 rounded-xl hover:bg-red-400/10 btn-press"
              aria-label="Sair da conta"
              title="Sair"
            >
              <LogOut size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        id="main-content"
        className="flex-1 p-4"
        role="main"
        tabIndex={-1}
      >
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom nav - Chat-Centric 2026 */}
      <nav
        className="glass-card border-t border-zeni-border px-4 py-2 sticky bottom-0 z-40"
        role="navigation"
        aria-label="Navegação principal"
      >
        <div className="max-w-6xl mx-auto flex justify-around items-end">
          {navItems.map(({ path, icon: Icon, label, ariaLabel, isMain }) => {
            const isActive = location.pathname === path

            // Chat central destacado
            if (isMain) {
              return (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex flex-col items-center gap-1 -mt-6
                    transition-all duration-200
                    ${isActive ? 'scale-110' : 'hover:scale-105'}
                  `}
                  aria-label={ariaLabel}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center overflow-hidden
                    gradient-primary shadow-glow
                    ${isActive ? 'shadow-glow-lg' : ''}
                    transition-all duration-200
                  `}>
                    <ZeniMascot variant="icon" size="md" />
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-zeni-primary' : 'text-zeni-muted'}`}>
                    {label}
                  </span>
                </Link>
              )
            }

            return (
              <Link
                key={path}
                to={path}
                className={`
                  flex flex-col items-center gap-1 px-3 py-2 rounded-xl
                  transition-all duration-200 btn-press
                  ${isActive
                    ? 'text-zeni-primary bg-zeni-primary/10'
                    : 'text-zeni-muted hover:text-zeni-text hover:bg-zeni-card/50'
                  }
                `}
                aria-label={ariaLabel}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                <span className="text-xs">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Live region para anúncios de screen reader */}
      <div
        id="live-announcer"
        className="live-region"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  )
}
