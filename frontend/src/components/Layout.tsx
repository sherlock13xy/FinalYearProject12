import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { CorrectionPanel } from './CorrectionPanel'
import { BackendStatus } from './BackendStatus'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

export default function Layout() {
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#070711' }}>

      {/* Aurora background layer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Blob 1 — top-left */}
        <div
          className="aurora-blob-1 absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.18]"
          style={{ background: 'radial-gradient(circle, var(--blob-1) 0%, transparent 70%)', filter: 'blur(80px)' }}
        />
        {/* Blob 2 — top-right */}
        <div
          className="aurora-blob-2 absolute -top-16 right-0 w-[520px] h-[520px] rounded-full opacity-[0.14]"
          style={{ background: 'radial-gradient(circle, var(--blob-2) 0%, transparent 70%)', filter: 'blur(90px)' }}
        />
        {/* Blob 3 — bottom-right */}
        <div
          className="aurora-blob-3 absolute bottom-0 -right-24 w-[440px] h-[440px] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, var(--blob-3) 0%, transparent 70%)', filter: 'blur(80px)' }}
        />
        {/* Blob 4 — bottom-center */}
        <div
          className="aurora-blob-4 absolute -bottom-24 left-1/4 w-[380px] h-[380px] rounded-full opacity-[0.09]"
          style={{ background: 'radial-gradient(circle, var(--blob-4) 0%, transparent 70%)', filter: 'blur(100px)' }}
        />
        {/* Subtle grid */}
        <div className="bg-grid-pattern absolute inset-0 opacity-100" />
      </div>

      <Sidebar />
      <CorrectionPanel />

      <main className={cn(
        'flex-1 overflow-auto transition-all duration-300 relative z-10',
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      )}>
        {/* Global status bar */}
        <div className="sticky top-0 z-30 flex justify-end px-6 py-3 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(7,7,17,0.9) 60%, transparent)' }}>
          <div className="pointer-events-auto">
            <BackendStatus />
          </div>
        </div>

        <div className="min-h-full px-6 pb-6 -mt-2">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
