import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, MessageSquare, FileText, Clock,
  Settings, ChevronRight, Brain, Sparkles, Link2
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { path: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { path: '/analyze',      label: 'Single Analysis', icon: MessageSquare },
  { path: '/bulk',         label: 'Bulk Analysis',   icon: FileText },
  { path: '/url-analysis', label: 'URL Analysis',    icon: Link2 },
  { path: '/history',      label: 'History',         icon: Clock },
  { path: '/settings',     label: 'Settings',        icon: Settings },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

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
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
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
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col leading-tight overflow-hidden"
              >
                <span className="font-bold text-sm text-white whitespace-nowrap tracking-wide">SentimentIQ</span>
                <span className="text-[10px] whitespace-nowrap" style={{
                  background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  AI Analytics Platform
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden',
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.2) 0%, rgba(var(--secondary-rgb),0.15) 100%)',
                border: '1px solid rgba(var(--primary-rgb),0.3)',
                boxShadow: '0 0 16px rgba(var(--primary-rgb),0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
              } : {
                border: '1px solid transparent',
              }}
            >
              {({ isActive }) => (
                <>
                  {/* Active left accent bar */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
                      style={{ background: 'linear-gradient(180deg, var(--primary), var(--secondary))' }}
                    />
                  )}

                  {/* Hover bg */}
                  <div className={cn(
                    'absolute inset-0 rounded-xl transition-opacity duration-200',
                    isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                  )}
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  />

                  <Icon
                    size={17}
                    className="flex-shrink-0 relative z-10 transition-colors duration-200"
                    style={isActive ? { color: 'var(--primary)' } : {}}
                  />

                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-sm font-medium whitespace-nowrap overflow-hidden relative z-10"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Badge */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="p-3 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="flex items-center gap-2 rounded-xl p-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              >
                <Sparkles size={13} className="text-indigo-400 flex-shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-indigo-300 whitespace-nowrap">AI Powered</p>
                  <p className="text-[10px] text-slate-500 whitespace-nowrap">BERT + Logistic Regression</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle Button */}
      <motion.button
        onClick={toggleSidebar}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        className="absolute -right-4 top-[50px] w-8 h-8 rounded-full flex items-center justify-center z-10"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 0 20px rgba(var(--primary-rgb),0.6), 0 4px 16px rgba(0,0,0,0.5)',
        }}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <motion.div
          animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <ChevronRight size={14} className="text-white" />
        </motion.div>
      </motion.button>
    </motion.aside>
  )
}
