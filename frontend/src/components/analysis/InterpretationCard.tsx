import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export function InterpretationCard({ interpretation }: { interpretation: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-400" />
            <CardTitle>Contextual Interpretation</CardTitle>
          </div>
        </CardHeader>
        <p className="text-slate-300 leading-relaxed text-sm">{interpretation}</p>
      </Card>
    </motion.div>
  )
}
