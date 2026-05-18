import { motion } from 'framer-motion'
import { MessageCircle, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export function ResponseCard({ suggestedResponse }: { suggestedResponse: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(suggestedResponse)
    setCopied(true)
    toast.success('Response copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-cyan-400" />
              <CardTitle>AI-Generated Response</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={copied
                ? <Check size={14} className="text-emerald-400" />
                : <Copy size={14} />
              }
              onClick={handleCopy}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </CardHeader>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <p className="text-slate-300 leading-relaxed text-sm italic">"{suggestedResponse}"</p>
        </div>
      </Card>
    </motion.div>
  )
}
