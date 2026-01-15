import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Receipt, MessageCircle, LogOut } from 'lucide-react'

export default function Layout({ children, user, onLogout }) {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transações' },
    { path: '/chat', icon: MessageCircle, label: 'Chat IA' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-zeni-card border-b border-slate-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-zeni-primary">
            Zeni
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-zeni-muted text-sm">{user?.name}</span>
            <button
              onClick={onLogout}
              className="text-zeni-muted hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="bg-zeni-card border-t border-slate-700 px-4 py-2 sticky bottom-0">
        <div className="max-w-6xl mx-auto flex justify-around">
          {navItems.map(({ path, icon: Icon, label }) => {
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
              >
                <Icon size={20} />
                <span className="text-xs">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
