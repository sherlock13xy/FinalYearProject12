import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, MessageSquare, FileText, Clock,
  Settings, ChevronRight, Brain, Link2, BookOpen, LogOut, User as UserIcon, Flag,
  Wifi, WifiOff, RefreshCw, ShieldCheck,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { getReportStats, checkHealth } from '@/lib/api'

const NAV_ITEMS = [
  { path: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { path: '/analyze',      label: 'Single Analysis', icon: MessageSquare },
  { path: '/bulk',         label: 'Bulk Analysis',   icon: FileText },
  { path: '/url-analysis', label: 'URL Analysis',    icon: Link2 },
  { path: '/history',      label: 'History',         icon: Clock },
  { path: '/settings',     label: 'Settings',        icon: Settings },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, user, logoutUser, pendingReportCount, setPendingReportCount } = useAppStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking')
  const [backendLoading, setBackendLoading] = useState(false)

  const checkBackend = useCallback(async () => {
    setBackendLoading(true)
    try {
      await checkHealth()
      setBackendStatus('connected')
    } catch {
      setBackendStatus('offline')
    } finally {
      setBackendLoading(false)
    }
  }, [])

  useEffect(() => {
    checkBackend()
    const id = setInterval(checkBackend, 30000)
    return () => clearInterval(id)
  }, [checkBackend])

  useEffect(() => {
    if (!isAdmin) return
    getReportStats().then(s => setPendingReportCount(s.pending)).catch(() => {})
    const id = setInterval(() => {
      getReportStats().then(s => setPendingReportCount(s.pending)).catch(() => {})
    }, 15000)
    return () => clearInterval(id)
  }, [isAdmin])

  const handleLogout = () => {
    logoutUser()
    navigate('/login', { replace: true })
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full z-50 flex flex-col"
      style={{
        background: 'rgba(7, 7, 17, 0.85)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '4px 0 32px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex flex-col h-full overflow-hidden">

        {/* Logo */}
        <div className="flex items-center gap-3 p-4 h-16 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <motion.div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 60%, var(--accent) 100%)',
              boxShadow: '0 0 20px rgba(var(--primary-rgb),0.5), 0 0 40px rgba(var(--secondary-rgb),0.2)',
            }}
            animate={{ boxShadow: ['0 0 20px rgba(var(--primary-rgb),0.4)', '0 0 30px rgba(var(--primary-rgb),0.7)', '0 0 20px rgba(var(--primary-rgb),0.4)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Brain size={18} className="text-white" />
          </motion.div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col leading-tight overflow-hidden"
              >
                <span className="font-bold text-sm text-white whitespace-nowrap tracking-wide">SentimentIQ</span>
                <span className="text-[10px] whitespace-nowrap" style={{
                  background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>AI Analytics Platform</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden',
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              )}
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.2) 0%, rgba(var(--secondary-rgb),0.15) 100%)',
                border: '1px solid rgba(var(--primary-rgb),0.3)',
                boxShadow: '0 0 16px rgba(var(--primary-rgb),0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
              } : { border: '1px solid transparent' }}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
                      style={{ background: 'linear-gradient(180deg, var(--primary), var(--secondary))' }} />
                  )}
                  <div className={cn('absolute inset-0 rounded-xl transition-opacity duration-200', isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-100')}
                    style={{ background: 'rgba(255,255,255,0.04)' }} />
                  <Icon size={17} className="flex-shrink-0 relative z-10 transition-colors duration-200"
                    style={isActive ? { color: 'var(--primary)' } : {}} />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                        className="text-sm font-medium whitespace-nowrap overflow-hidden relative z-10">
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}

          {/* Divider */}
          <div className="mx-1 my-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Admin Overview — admin only */}
          {isAdmin && (
            <NavLink to="/admin"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden',
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              )}
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.2) 0%, rgba(var(--secondary-rgb),0.15) 100%)',
                border: '1px solid rgba(var(--primary-rgb),0.3)',
              } : { border: '1px solid transparent' }}
            >
              {({ isActive }) => (<>
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full" style={{ background: 'linear-gradient(180deg, var(--primary), var(--secondary))' }} />}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <ShieldCheck size={17} className="flex-shrink-0 relative z-10" style={isActive ? { color: 'var(--primary)' } : { color: '#818cf8' }} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden relative z-10">
                      Admin Overview
                    </motion.span>
                  )}
                </AnimatePresence>
              </>)}
            </NavLink>
          )}

          {/* Training Data — admin only */}
          {isAdmin && (
            <NavLink to="/training-data"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden',
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              )}
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.2) 0%, rgba(var(--secondary-rgb),0.15) 100%)',
                border: '1px solid rgba(var(--primary-rgb),0.3)',
              } : { border: '1px solid transparent' }}
            >
              {({ isActive }) => (<>
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full" style={{ background: 'linear-gradient(180deg, var(--primary), var(--secondary))' }} />}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <BookOpen size={17} className="flex-shrink-0 relative z-10" style={isActive ? { color: 'var(--primary)' } : { color: '#818cf8' }} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden relative z-10">
                      Training Data
                    </motion.span>
                  )}
                </AnimatePresence>
              </>)}
            </NavLink>
          )}

          {/* User Reports — admin only */}
          {isAdmin && (
            <NavLink to="/user-reports"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden',
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              )}
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.2) 0%, rgba(var(--secondary-rgb),0.15) 100%)',
                border: '1px solid rgba(var(--primary-rgb),0.3)',
              } : { border: '1px solid transparent' }}
            >
              {({ isActive }) => (<>
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full" style={{ background: 'linear-gradient(180deg, var(--primary), var(--secondary))' }} />}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <Flag size={17} className="flex-shrink-0 relative z-10" style={isActive ? { color: 'var(--primary)' } : { color: '#f87171' }} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                      className="flex items-center gap-2 text-sm font-medium whitespace-nowrap overflow-hidden relative z-10">
                      User Reports
                      {pendingReportCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                          style={{ background: 'rgba(239,68,68,0.25)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>
                          {pendingReportCount}
                        </span>
                      )}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>)}
            </NavLink>
          )}
        </nav>

        {/* User info + logout */}
        <div className="px-2 pb-2 flex-shrink-0 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <AnimatePresence>
            {!sidebarCollapsed && user && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-3 py-2.5 mt-2"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isAdmin ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))' : 'rgba(255,255,255,0.08)',
                    border: isAdmin ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                  <UserIcon size={13} style={{ color: isAdmin ? '#a5b4fc' : '#94a3b8' }} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">{user.username}</p>
                  <p className="text-[10px] capitalize" style={{ color: isAdmin ? '#a5b4fc' : '#64748b' }}>{user.role}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden text-slate-500 hover:text-red-400"
            style={{ border: '1px solid transparent' }}
            title="Logout"
          >
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: 'rgba(239,68,68,0.06)' }} />
            <LogOut size={17} className="flex-shrink-0 relative z-10" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden relative z-10">
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Backend Status */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 rounded-xl p-3"
            style={{
              background: backendStatus === 'connected'
                ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%)'
                : backendStatus === 'offline'
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%)'
                  : 'rgba(255,255,255,0.04)',
              border: backendStatus === 'connected'
                ? '1px solid rgba(16,185,129,0.25)'
                : backendStatus === 'offline'
                  ? '1px solid rgba(239,68,68,0.25)'
                  : '1px solid rgba(255,255,255,0.08)',
            }}>
            {backendStatus === 'offline'
              ? <WifiOff size={13} className="text-red-400 flex-shrink-0" />
              : <Wifi size={13} className={cn('flex-shrink-0', backendStatus === 'connected' ? 'text-emerald-400' : 'text-slate-500 animate-pulse')} />
            }
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  className="flex-1 overflow-hidden"
                >
                  <p className={cn('text-xs font-semibold whitespace-nowrap', backendStatus === 'connected' ? 'text-emerald-400' : backendStatus === 'offline' ? 'text-red-400' : 'text-slate-500')}>
                    {backendStatus === 'connected' ? 'Backend Connected' : backendStatus === 'offline' ? 'Backend Offline' : 'Checking...'}
                  </p>
                  <p className="text-[10px] text-slate-600 whitespace-nowrap">API server status</p>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={checkBackend}
              disabled={backendLoading}
              title="Refresh connection"
              className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={12} className={backendLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <motion.button
        onClick={toggleSidebar}
        whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}
        className="absolute -right-4 top-[50px] w-8 h-8 rounded-full flex items-center justify-center z-10"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 0 20px rgba(var(--primary-rgb),0.6), 0 4px 16px rgba(0,0,0,0.5)',
        }}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <motion.div animate={{ rotate: sidebarCollapsed ? 0 : 180 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
          <ChevronRight size={14} className="text-white" />
        </motion.div>
      </motion.button>
    </motion.aside>
  )
}
