import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  color?: string
  className?: string
  label?: string
  showValue?: boolean
}

export function Progress({ value, color = '#6366f1', className, label, showValue }: ProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showValue && <span className="text-xs text-slate-300 font-medium">{Math.round(value)}%</span>}
        </div>
      )}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
