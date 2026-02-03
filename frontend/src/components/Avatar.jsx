import { User } from 'lucide-react'

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

export default function Avatar({ user, size = 'sm', className = '' }) {
  const sizeClass = sizes[size] || sizes.sm

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || 'Avatar'}
        className={`${sizeClass} rounded-full object-cover border border-emerald-500/30 ${className}`}
      />
    )
  }

  const initial = user?.name?.charAt(0)?.toUpperCase()

  return (
    <div
      className={`${sizeClass} rounded-full bg-emerald-700 flex items-center justify-center border border-emerald-500/30 ${className}`}
    >
      {initial ? (
        <span className="font-bold text-emerald-100">{initial}</span>
      ) : (
        <User className="text-emerald-100" size={16} />
      )}
    </div>
  )
}
