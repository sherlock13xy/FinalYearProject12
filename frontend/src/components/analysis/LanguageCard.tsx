import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface LanguageCardProps {
  detectedLanguage: string
  languageCode: string
  translatedText: string
  isTranslation: boolean
  originalText: string
}

export function LanguageCard({
  detectedLanguage,
  languageCode,
  translatedText,
  isTranslation,
}: LanguageCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-cyan-400" />
              <CardTitle>Language Detection</CardTitle>
            </div>
            <Badge variant="primary">{languageCode.toUpperCase()}</Badge>
          </div>
        </CardHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Detected Language</p>
            <p className="text-xl font-bold text-white">{detectedLanguage}</p>
          </div>

          {isTranslation && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
              <p className="text-xs text-indigo-400 mb-1 font-medium">Translation to English</p>
              <p className="text-sm text-slate-300">{translatedText}</p>
            </div>
          )}

          {!isTranslation && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-xs text-emerald-400 font-medium">
                ✓ English detected — no translation needed
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
