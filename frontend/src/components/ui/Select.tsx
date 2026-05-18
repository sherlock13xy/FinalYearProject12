import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      )}
      <select
        className={cn(
          'w-full bg-[#0f0f1a] border border-white/10 rounded-lg px-3 py-2.5 text-white',
          'focus:outline-none focus:border-indigo-500/50',
          'transition-all duration-200',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-[#0f0f1a]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
