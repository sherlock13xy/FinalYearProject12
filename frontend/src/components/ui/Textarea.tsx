import { cn } from '@/lib/utils'
import React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  characterCount?: boolean
  maxLength?: number
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, characterCount, maxLength, className, value, ...props }, ref) => {
    const charCount = typeof value === 'string' ? value.length : 0
    return (
      <div className="w-full">
        {label && (
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-medium text-slate-300">{label}</label>
            {characterCount && (
              <span className={cn(
                'text-xs',
                maxLength && charCount > maxLength * 0.9 ? 'text-yellow-400' : 'text-slate-500'
              )}>
                {charCount}{maxLength && `/${maxLength}`}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={cn(
            'w-full rounded-xl px-4 py-3 text-white placeholder:text-slate-600',
            'focus:outline-none transition-all duration-200 resize-none',
            error && 'border-red-500/50',
            className
          )}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(8px)',
          }}
          onFocus={e => {
            e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
          }}
          onBlur={e => {
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
