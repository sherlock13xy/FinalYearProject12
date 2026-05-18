import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmotionResult } from '@/types'
import { getEmotionColor, formatConfidence } from '@/lib/utils'

interface EmotionCardProps {
  emotion: EmotionResult
}

export function EmotionCard({ emotion }: EmotionCardProps) {
  const color = getEmotionColor(emotion.label)
  const sortedScores = Object.entries(emotion.scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Emotion</CardTitle>
            <span className="text-xs text-slate-400">Detected</span>
          </div>
        </CardHeader>

        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${color}20`, border: `1px solid ${color}40` }}
          >
            <Heart size={22} style={{ color }} />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{emotion.label}</p>
            <p className="text-sm text-slate-400">{formatConfidence(emotion.confidence)} confidence</p>
          </div>
        </div>

        <div className="space-y-2">
          {sortedScores.map(([key, score]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-24 flex-shrink-0">{key}</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${score * 100}%`,
                    backgroundColor: getEmotionColor(key),
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
