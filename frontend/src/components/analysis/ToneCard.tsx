import { motion } from 'framer-motion'
import { Radio } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ToneResult } from '@/types'
import { capitalize } from '@/lib/utils'

const TONE_COLORS: Record<string, string> = {
  professional: '#6366f1',
  casual: '#06b6d4',
  sarcastic: '#f59e0b',
  aggressive: '#ef4444',
  critical: '#f97316',
  appreciative: '#10b981',
  formal: '#8b5cf6',
  informal: '#ec4899',
  neutral: '#6b7280',
  urgent: '#ef4444',
  empathetic: '#10b981',
}

interface ToneCardProps {
  tone: ToneResult
}

export function ToneCard({ tone }: ToneCardProps) {
  const color = TONE_COLORS[tone.label] || '#6b7280'
  const intensityPct = Math.round(tone.intensity * 100)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tone</CardTitle>
            <span className="text-xs text-slate-400">Analysis</span>
          </div>
        </CardHeader>

        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${color}20`, border: `1px solid ${color}40` }}
          >
            <Radio size={22} style={{ color }} />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{capitalize(tone.label)}</p>
            <p className="text-sm text-slate-400">Intensity: {intensityPct}%</p>
          </div>
        </div>

        {/* Intensity Meter */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Low</span>
            <span>Intensity Meter</span>
            <span>High</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${intensityPct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(tone.scores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([key, score]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-24 flex-shrink-0">{capitalize(key)}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${score * 100}%`,
                      backgroundColor: TONE_COLORS[key] || '#6b7280',
                    }}
                  />
                </div>
                <span className="text-xs text-slate-300 w-10 text-right">{Math.round(score * 100)}%</span>
              </div>
            ))}
        </div>
      </Card>
    </motion.div>
  )
}
