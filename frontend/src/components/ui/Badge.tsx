import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'positive' | 'negative' | 'neutral' | 'primary' | 'secondary'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants: Record<string, string> = {
    default:   'bg-white/[0.07] text-slate-300 border-white/[0.1]',
    positive:  'bg-emerald-500/[0.15] text-emerald-400 border-emerald-500/25',
    negative:  'bg-red-500/[0.15] text-red-400 border-red-500/25',
    neutral:   'bg-slate-500/[0.15] text-slate-400 border-slate-500/25',
    primary:   'bg-indigo-500/[0.15] text-indigo-400 border-indigo-500/25',
    secondary: 'bg-violet-500/[0.15] text-violet-400 border-violet-500/25',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
