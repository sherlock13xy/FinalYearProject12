import { motion } from 'framer-motion'
import { Target } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { IntentResult } from '@/types'
import { capitalize, formatConfidence } from '@/lib/utils'

const INTENT_COLORS: Record<string, string> = {
  complaint: '#ef4444',
  appreciation: '#10b981',
  inquiry: '#06b6d4',
  request: '#6366f1',
  suggestion: '#f59e0b',
  feedback: '#8b5cf6',
  threat: '#f97316',
  praise: '#10b981',
  neutral: '#6b7280',
}

interface IntentCardProps {
  intent: IntentResult
}

export function IntentCard({ intent }: IntentCardProps) {
  const color = INTENT_COLORS[intent.label] || '#6b7280'

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Intent</CardTitle>
            <span className="text-xs text-slate-400">Classification</span>
          </div>
        </CardHeader>

        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${color}20`, border: `1px solid ${color}40` }}
          >
            <Target size={22} style={{ color }} />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{capitalize(intent.label)}</p>
            <p className="text-sm text-slate-400">{formatConfidence(intent.confidence)} confidence</p>
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(intent.scores)
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
                      backgroundColor: INTENT_COLORS[key] || '#6b7280',
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
