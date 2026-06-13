import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Smile, PenLine } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { SentimentResult, SarcasmResult } from '@/types'
import { formatConfidence } from '@/lib/utils'
import { useAppStore } from '@/store'

interface SentimentCardProps {
  sentiment: SentimentResult
  sarcasm?: SarcasmResult
  originalText?: string
}

export function SentimentCard({ sentiment, sarcasm, originalText }: SentimentCardProps) {
  const { label, confidence, probabilities } = sentiment
  const openCorrectionPanel = useAppStore(s => s.openCorrectionPanel)

  const Icon = label === 'positive' ? TrendingUp : label === 'negative' ? TrendingDown : Minus
  const variant = label as 'positive' | 'negative' | 'neutral'
  const glowColors: Record<string, string> = {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280',
  }
  const color = glowColors[label] || '#6b7280'

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card glow={variant === 'neutral' ? 'none' : variant}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sentiment</CardTitle>
            <div className="flex items-center gap-2">
              {originalText && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openCorrectionPanel({ text: originalText, modelLabel: label })}
                  title="Correct this prediction"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-slate-400 hover:text-indigo-300 transition-all"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
                >
                  <PenLine size={10} />
                  Correct
                </motion.button>
              )}
              {sarcasm?.detected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  title={`Sarcasm detected (${Math.round(sarcasm.confidence * 100)}% confidence) — sentiment flipped`}
                >
                  <Badge variant="neutral" className="bg-amber-500/20 border-amber-500/40 text-amber-300 cursor-help">
                    <Smile size={11} className="mr-1" />
                    Sarcasm
                  </Badge>
                </motion.div>
              )}
              <Badge variant={variant}>
                <Icon size={12} className="mr-1" />
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeDasharray={`${confidence * 100} ${100 - confidence * 100}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{formatConfidence(confidence)}</span>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-white capitalize">{label}</p>
            <p className="text-sm text-slate-400">Confidence Score</p>
          </div>
        </div>

        <div className="space-y-3">
          {Object.entries(probabilities).map(([key, value]) => (
            <Progress
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={value * 100}
              color={glowColors[key] || '#6b7280'}
              showValue
            />
          ))}
        </div>
      </Card>
    </motion.div>
  )
}
