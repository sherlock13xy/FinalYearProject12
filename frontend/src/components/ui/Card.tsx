import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'primary' | 'positive' | 'negative' | 'violet' | 'cyan' | 'none'
  onClick?: () => void
}

const GLOW_STYLES: Record<string, React.CSSProperties> = {
  primary:  { boxShadow: '0 0 0 1px rgba(99,102,241,0.25),  0 0 40px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.07)' },
  positive: { boxShadow: '0 0 0 1px rgba(16,185,129,0.25),  0 0 40px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.07)' },
  negative: { boxShadow: '0 0 0 1px rgba(239,68,68,0.25),   0 0 40px rgba(239,68,68,0.12),  inset 0 1px 0 rgba(255,255,255,0.07)' },
  violet:   { boxShadow: '0 0 0 1px rgba(139,92,246,0.25),  0 0 40px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.07)' },
  cyan:     { boxShadow: '0 0 0 1px rgba(6,182,212,0.25),   0 0 40px rgba(6,182,212,0.12),  inset 0 1px 0 rgba(255,255,255,0.07)' },
  none:     { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.25)' },
}

export function Card({ children, className, glow = 'none', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card p-6 transition-all duration-300',
        onClick && 'cursor-pointer hover:scale-[1.01]',
        className
      )}
      style={GLOW_STYLES[glow]}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-base font-semibold text-slate-200 tracking-wide', className)}>
      {children}
    </h3>
  )
}
