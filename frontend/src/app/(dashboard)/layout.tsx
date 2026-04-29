'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated, getUser, clearAuth } from '@/lib/auth'
import {
  LayoutDashboard, Users, Phone, Megaphone,
  BarChart3, LogOut, Menu, X, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/numbers', label: 'Números', icon: Phone },
  { href: '/campaigns', label: 'Campanhas', icon: Megaphone },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    setUser(getUser())
  }, [router])

  function handleLogout() {
    clearAuth()
    router.push('/login')
  }

  const Sidebar = ({ mobile = false }) => (
    <aside className={cn(
      'flex flex-col h-full',
      mobile ? 'w-full' : 'w-[220px] min-w-[220px]'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[var(--border)]">
        <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
          <Zap size={13} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold tracking-tight">Startflow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-[var(--surface-3)] text-foreground font-medium'
                  : 'text-[var(--foreground-2)] hover:text-foreground hover:bg-[var(--surface-2)]'
              )}
            >
              <Icon size={15} strokeWidth={active ? 2.5 : 2} />
              {label}
              {active && <div className="ml-auto w-1 h-1 rounded-full bg-emerald-500" />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-6 h-6 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-xs font-medium text-emerald-400">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.name || 'Usuário'}</div>
            <div className="text-[10px] text-[var(--muted)] truncate capitalize">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[var(--muted)] hover:text-[var(--foreground-2)] transition-colors"
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col bg-[var(--surface)] border-r border-[var(--border)]">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[220px] bg-[var(--surface)] border-r border-[var(--border)]">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
          <button onClick={() => setMobileOpen(true)} className="text-[var(--foreground-2)]">
            <Menu size={18} />
          </button>
          <span className="text-sm font-semibold">Startflow</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
