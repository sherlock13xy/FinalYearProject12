import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden'

  const variants: Record<string, string> = {
    primary:   'text-white border border-indigo-500/40',
    secondary: 'text-white border border-violet-500/40',
    outline:   'text-slate-200 hover:text-white border border-white/12 hover:border-white/25 bg-white/[0.04] hover:bg-white/[0.08]',
    ghost:     'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.06]',
    danger:    'text-white border border-red-500/40',
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
      boxShadow: '0 0 20px rgba(var(--primary-rgb),0.35), 0 4px 12px rgba(0,0,0,0.3)',
    },
    secondary: {
      background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)',
      boxShadow: '0 0 20px rgba(var(--secondary-rgb),0.35), 0 4px 12px rgba(0,0,0,0.3)',
    },
    outline: {},
    ghost:   {},
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      boxShadow: '0 0 20px rgba(239,68,68,0.3), 0 4px 12px rgba(0,0,0,0.3)',
    },
  }

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      style={variantStyles[variant]}
    >
      {/* Shine overlay for gradient buttons */}
      {(variant === 'primary' || variant === 'secondary' || variant === 'danger') && (
        <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
        {children}
      </span>
    </button>
  )
}
