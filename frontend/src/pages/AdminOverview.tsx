import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, ShieldCheck, User as UserIcon, Database,
  Trash2, RefreshCw, AlertTriangle, BarChart2, FileText, Flag,
  Search, Ban, Unlock, UserX, Check, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getAdminStats, clearAnalysisRecords, clearAllData, restrictUser, deleteUser } from '@/lib/api'
import { AdminStats } from '@/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { useAppStore } from '@/store'

export default function AdminOverview() {
  const currentUser = useAppStore(s => s.user)

  const [stats, setStats]               = useState<AdminStats | null>(null)
  const [loading, setLoading]           = useState(true)
  const [clearing, setClearing]         = useState<'analysis' | 'all' | null>(null)
  const [confirmClear, setConfirmClear] = useState<'analysis' | 'all' | null>(null)

  const [searchQuery, setSearchQuery]   = useState('')
  const [restrictingId, setRestrictingId] = useState<string | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setStats(await getAdminStats())
    } catch {
      toast.error('Failed to load admin stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleClear = async (type: 'analysis' | 'all') => {
    setClearing(type)
    setConfirmClear(null)
    try {
      if (type === 'analysis') {
        const r = await clearAnalysisRecords()
        toast.success(`Cleared ${r.deleted} analysis records`)
      } else {
        const r = await clearAllData()
        toast.success(`Cleared ${r.deleted} records (${r.analysis} analyses, ${r.corrections} corrections, ${r.reports} reports)`)
      }
      await load()
    } catch {
      toast.error('Clear operation failed')
    } finally {
      setClearing(null)
    }
  }

  const handleRestrict = async (userId: string, username: string) => {
    setRestrictingId(userId)
    try {
      const res = await restrictUser(userId)
      toast.success(res.is_active ? `${username} unrestricted` : `${username} restricted`)
      setStats(prev => {
        if (!prev) return prev
        return {
          ...prev,
          users: {
            ...prev.users,
            list: prev.users.list.map(u =>
              u.id === userId ? { ...u, is_active: res.is_active } : u
            ),
          },
        }
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update user')
    } finally {
      setRestrictingId(null)
    }
  }

  const handleDelete = async (userId: string, username: string) => {
    setDeletingId(userId)
    setConfirmDeleteId(null)
    try {
      await deleteUser(userId)
      toast.success(`Deleted ${username}`)
      setStats(prev => {
        if (!prev) return prev
        const newList = prev.users.list.filter(u => u.id !== userId)
        const admins = newList.filter(u => u.role === 'admin').length
        return {
          ...prev,
          users: {
            total: newList.length,
            admins,
            regular_users: newList.length - admins,
            list: newList,
          },
        }
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    if (!stats) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return stats.users.list
    return stats.users.list.filter(u => u.username.toLowerCase().includes(q))
  }, [stats, searchQuery])

  const storage = stats?.storage
  const usagePct = storage?.usage_pct ?? 0
  const gaugeColor =
    usagePct >= 85 ? '#ef4444' :
    usagePct >= 60 ? '#f59e0b' :
    '#10b981'

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4 pt-4"
      >
        <div>
          <h1 className="text-3xl font-bold mb-1 gradient-text">Admin Overview</h1>
          <p className="text-slate-500">User management and storage control</p>
        </div>
        <Button
          variant="ghost" size="sm"
          icon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />}
          onClick={load} disabled={loading}
        >
          Refresh
        </Button>
      </motion.div>

      {/* KPI Row */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : stats && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Users',      value: stats.users.total,               icon: Users,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
            { label: 'Admins',           value: stats.users.admins,              icon: ShieldCheck, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Regular Users',    value: stats.users.regular_users,       icon: UserIcon,  color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
            { label: 'Analysis Records', value: stats.storage.analysis_records,  icon: BarChart2, color: 'text-amber-400',   bg: 'bg-amber-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="py-4">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon size={20} className={color} />
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Storage + Users Row */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-1 xl:grid-cols-2 gap-6"
        >
          {/* Storage Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database size={15} className="text-slate-400" />
                  Backend Storage
                </CardTitle>
                <span className={`text-sm font-bold ${usagePct >= 85 ? 'text-red-400' : usagePct >= 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {usagePct}%
                </span>
              </div>
            </CardHeader>

            <div className="mb-5">
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: gaugeColor, boxShadow: `0 0 10px ${gaugeColor}60` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>0 MB</span>
                <span>{storage!.limit_mb} MB limit</span>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {[
                { label: 'DB File Size',      value: `${storage!.db_size_mb} MB`,                   icon: Database,  color: '#6366f1' },
                { label: 'Analysis Records',  value: storage!.analysis_records.toLocaleString(),    icon: BarChart2, color: '#10b981' },
                { label: 'Correction Entries',value: storage!.correction_entries.toLocaleString(),  icon: FileText,  color: '#8b5cf6' },
                { label: 'User Reports',      value: storage!.user_reports.toLocaleString(),        icon: Flag,      color: '#f59e0b' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <Icon size={13} style={{ color }} />
                    <span className="text-xs text-slate-400">{label}</span>
                  </div>
                  <span className="text-xs font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>

            {confirmClear ? (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
                  <AlertTriangle size={13} />
                  {confirmClear === 'analysis'
                    ? 'Delete all analysis records? This cannot be undone.'
                    : 'Delete ALL data (analyses, corrections, reports)? This cannot be undone.'}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="danger" size="sm"
                    loading={clearing !== null}
                    onClick={() => handleClear(confirmClear)}
                  >
                    Yes, Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmClear(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline" size="sm"
                  icon={<Trash2 size={13} />}
                  onClick={() => setConfirmClear('analysis')}
                  disabled={clearing !== null || storage!.analysis_records === 0}
                >
                  Clear Analysis Data
                </Button>
                <Button
                  variant="danger" size="sm"
                  icon={<Trash2 size={13} />}
                  onClick={() => setConfirmClear('all')}
                  disabled={clearing !== null || storage!.total_records === 0}
                >
                  Clear All Data
                </Button>
              </div>
            )}
          </Card>

          {/* Users Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={15} className="text-slate-400" />
                Registered Users
                <span className="ml-auto text-xs font-normal text-slate-500">{filteredUsers.length} shown</span>
              </CardTitle>
            </CardHeader>

            {/* Search */}
            <div className="relative mb-3">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by username…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* User list */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">
                  {searchQuery ? 'No users match your search.' : 'No users found.'}
                </p>
              ) : (
                <AnimatePresence initial={false}>
                  {filteredUsers.map(user => {
                    const isSelf = user.id === currentUser?.id
                    const isRestricting = restrictingId === user.id
                    const isDeleting = deletingId === user.id
                    const confirmingDelete = confirmDeleteId === user.id

                    return (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                          !user.is_active
                            ? 'bg-red-500/5 border-red-500/20 opacity-60'
                            : 'bg-white/3 border-white/5'
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          user.role === 'admin' ? 'bg-indigo-500/20' : 'bg-white/8'
                        }`}>
                          {user.role === 'admin'
                            ? <ShieldCheck size={13} className="text-indigo-400" />
                            : <UserIcon size={13} className="text-slate-400" />
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${!user.is_active ? 'text-slate-400' : 'text-white'}`}>
                            {user.username}
                            {isSelf && <span className="ml-1.5 text-[9px] text-indigo-400 font-semibold">(you)</span>}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {user.email ?? 'No email'} · {user.created_at ? formatDate(user.created_at) : '—'}
                          </p>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!user.is_active && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                              Restricted
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            user.role === 'admin'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-white/8 text-slate-400 border border-white/10'
                          }`}>
                            {user.role}
                          </span>
                        </div>

                        {/* Actions */}
                        {!isSelf && !confirmingDelete && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Restrict toggle */}
                            <button
                              onClick={() => handleRestrict(user.id, user.username)}
                              disabled={isRestricting || isDeleting}
                              title={user.is_active ? 'Restrict user' : 'Unrestrict user'}
                              className={`p-1.5 rounded-md transition-all disabled:opacity-40 ${
                                user.is_active
                                  ? 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'
                                  : 'text-amber-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                            >
                              {isRestricting
                                ? <RefreshCw size={12} className="animate-spin" />
                                : user.is_active ? <Ban size={12} /> : <Unlock size={12} />
                              }
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setConfirmDeleteId(user.id)}
                              disabled={isRestricting || isDeleting}
                              title="Delete user"
                              className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                            >
                              {isDeleting
                                ? <RefreshCw size={12} className="animate-spin" />
                                : <UserX size={12} />
                              }
                            </button>
                          </div>
                        )}

                        {/* Delete confirmation inline */}
                        {confirmingDelete && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-red-400 font-medium">Delete?</span>
                            <button
                              onClick={() => handleDelete(user.id, user.username)}
                              className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-all"
                              title="Confirm delete"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1.5 rounded-md text-slate-400 hover:bg-white/5 transition-all"
                              title="Cancel"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
