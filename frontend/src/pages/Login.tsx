import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store'
import { loginUser, registerUser } from '@/lib/api'

export default function Login() {
  const navigate = useNavigate()
  const { loginUser: storeLogin } = useAppStore()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      let result
      if (mode === 'login') {
        result = await loginUser(username, password)
      } else {
        result = await registerUser(username, password, email || undefined)
      }
      storeLogin(result.access_token, result.user)
      toast.success(mode === 'login' ? `Welcome back, ${result.user.username}!` : `Account created! Welcome, ${result.user.username}!`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#070711' }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.15]"
          style={{ background: 'radial-gradient(circle, var(--blob-1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, var(--blob-2) 0%, transparent 70%)', filter: 'blur(90px)' }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.10]"
          style={{ background: 'radial-gradient(circle, var(--blob-3) 0%, transparent 70%)', filter: 'blur(100px)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 60%, var(--accent) 100%)',
              boxShadow: '0 0 40px rgba(var(--primary-rgb),0.5)',
            }}
            animate={{ boxShadow: ['0 0 30px rgba(var(--primary-rgb),0.4)', '0 0 50px rgba(var(--primary-rgb),0.7)', '0 0 30px rgba(var(--primary-rgb),0.4)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Brain size={28} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">SentimentIQ</h1>
          <p className="text-sm text-slate-500 mt-1">AI Analytics Platform</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Tab toggle */}
          <div
            className="flex rounded-xl p-1 mb-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize"
                style={mode === m ? {
                  background: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.3), rgba(var(--secondary-rgb),0.25))',
                  color: 'white',
                  border: '1px solid rgba(var(--primary-rgb),0.3)',
                } : { color: '#6b7280' }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(var(--primary-rgb),0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            {/* Email (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(var(--primary-rgb),0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-600 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(var(--primary-rgb),0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-2"
              icon={mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
            >
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          {mode === 'login' && (
            <p className="text-center text-xs text-slate-600 mt-4">
              Default admin: <span className="text-slate-400 font-mono">admin / admin123</span>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
