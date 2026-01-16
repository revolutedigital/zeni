import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Receipt, MessageCircle, LogOut, Target } from 'lucide-react'
import ZeniMascot from './ZeniMascot'

export default function Layout({ children, user, onLogout }) {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', ariaLabel: 'Ir para Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transações', ariaLabel: 'Ver transações' },
    { path: '/budgets', icon: Target, label: 'Orçamentos', ariaLabel: 'Gerenciar orçamentos' },
    { path: '/chat', icon: MessageCircle, label: 'Chat IA', ariaLabel: 'Conversar com a Zeni' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip Link para acessibilidade */}
      <a href="#main-content" className="skip-link">
        Pular para conteúdo principal
      </a>

      {/* Header */}
      <header
        className="bg-zeni-card border-b border-slate-700 px-4 py-3"
        role="banner"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2"
            aria-label="Zeni - Ir para página inicial"
          >
            <ZeniMascot variant="icon" size="sm" />
            <span className="text-xl font-bold text-zeni-primary">Zeni</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-zeni-muted text-sm" aria-label={`Usuário: ${user?.name}`}>
              {user?.name}
            </span>
            <button
              onClick={onLogout}
              className="text-zeni-muted hover:text-red-400 transition-colors p-2 rounded-lg"
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

      {/* Bottom nav (mobile) */}
      <nav
        className="bg-zeni-card border-t border-slate-700 px-4 py-2 sticky bottom-0"
        role="navigation"
        aria-label="Navegação principal"
      >
        <div className="max-w-6xl mx-auto flex justify-around">
          {navItems.map(({ path, icon: Icon, label, ariaLabel }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-zeni-primary bg-zeni-primary/10'
                    : 'text-zeni-muted hover:text-zeni-text'
                }`}
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
