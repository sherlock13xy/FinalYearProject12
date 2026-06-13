import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { checkHealth } from '@/lib/api'
import { Button } from '@/components/ui/Button'

type Status = 'checking' | 'connected' | 'offline'

export function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking')
  const [loading, setLoading] = useState(false)

  const check = useCallback(async () => {
    setLoading(true)
    try {
      await checkHealth()
      setStatus('connected')
    } catch {
      setStatus('offline')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { check() }, [check])

  const pillStyle =
    status === 'connected'
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      : status === 'offline'
        ? 'bg-red-500/10 border-red-500/30 text-red-400'
        : 'bg-gray-500/10 border-gray-500/30 text-gray-400'

  const label =
    status === 'connected' ? 'Backend Connected'
    : status === 'offline'  ? 'Backend Offline'
    : 'Checking...'

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${pillStyle}`}>
        {status === 'offline'
          ? <WifiOff size={12} />
          : <Wifi size={12} className={status === 'checking' ? 'animate-pulse' : ''} />
        }
        {label}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={check}
        loading={loading}
        icon={<RefreshCw size={13} />}
      >
        Refresh
      </Button>
    </div>
  )
}
