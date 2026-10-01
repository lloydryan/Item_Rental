import { useState } from 'react'
import { BadgeCheck, ChevronLeft, ChevronRight, LogOut, Menu, UserRound, X } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { navItems } from '../constants'
import { roleAccess, roles } from '../roles'
import { Button } from '../components/Button'

export function Shell({ state, currentUser, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const allowed = roleAccess[currentUser.role]
  const visibleNav = navItems.filter((item) => allowed.includes(item.key))
  const navGroups = [...new Set(visibleNav.map((item) => item.group))]
  const currentPage = location.pathname.startsWith('/profile') ? 'My profile' : navItems.find((item) => location.pathname.startsWith(item.path))?.label || 'Workspace'
  const activeMaintenanceJobs = (state.inventoryMovements || []).filter((movement) => movement.status === 'In Progress').length

  const navigation = (
    <>
      <div className={`flex h-17 items-center border-b border-white/8 ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'}`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"><BadgeCheck className="size-5" /></span>
        {!collapsed && <div className="min-w-0"><strong className="block truncate text-[13px] font-semibold tracking-tight text-sidebar-foreground">LR Event Rental</strong><span className="block truncate text-[11px] text-sidebar-muted">Operations workspace</span></div>}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <div className="grid gap-5">
          {navGroups.map((group) => <section key={group}>{!collapsed && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted/55">{group}</p>}<div className="grid gap-0.5">{visibleNav.filter((item) => item.group === group).map((item) => {
            const Icon = item.icon
            const notificationCount = item.key === 'maintenance' ? activeMaintenanceJobs : 0
            return (
              <NavLink
                key={item.key}
                to={item.path}
                title={collapsed ? `${item.label}${notificationCount ? ` (${notificationCount} active job${notificationCount === 1 ? '' : 's'})` : ''}` : undefined}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `relative flex min-h-10 items-center rounded-lg text-[13px] font-medium transition-colors duration-150 ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive ? 'bg-primary/15 text-sidebar-foreground before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary-accent' : 'text-sidebar-muted hover:bg-white/6 hover:text-sidebar-foreground'}`}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                {notificationCount > 0 && <span className={`${collapsed ? 'absolute -right-0.5 top-0 min-w-4 px-1 text-[9px]' : 'min-w-5 px-1.5 text-[10px]'} grid h-5 shrink-0 place-items-center rounded-full bg-warning-indicator font-bold leading-none tabular-nums text-sidebar`} aria-label={`${notificationCount} active job${notificationCount === 1 ? '' : 's'}`}>{notificationCount}</span>}
              </NavLink>
            )
          })}</div></section>)}
        </div>
      </nav>
      <div className="border-t border-white/8 p-3">
        <NavLink to="/profile" onClick={() => setMobileOpen(false)} title={collapsed ? 'My profile' : undefined} className={({ isActive }) => `mb-1 flex min-h-10 items-center rounded-lg transition-colors ${collapsed ? 'justify-center' : 'gap-3 px-2 py-2'} ${isActive ? 'bg-primary/10 text-sidebar-foreground' : 'text-sidebar-muted hover:bg-white/6 hover:text-sidebar-foreground'}`}>
          {collapsed ? <UserRound className="size-[18px]" /> : <><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{currentUser.name.charAt(0).toUpperCase()}</span><div className="min-w-0"><strong className="block truncate text-sm text-sidebar-foreground">{currentUser.name}</strong><span className="block truncate text-xs text-sidebar-muted">{roles[currentUser.role]}</span></div></>}
        </NavLink>
        <button className={`flex min-h-10 w-full items-center rounded-lg text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/6 hover:text-sidebar-foreground ${collapsed ? 'justify-center' : 'gap-3 px-3'}`} type="button" title={collapsed ? 'Sign out' : undefined} onClick={onLogout}><LogOut className="size-[18px]" />{!collapsed && 'Sign out'}</button>
      </div>
    </>
  )

  return (
    <div className={`min-h-screen bg-background lg:grid ${collapsed ? 'lg:grid-cols-[4.75rem_1fr]' : 'lg:grid-cols-[16.5rem_1fr]'}`}>
      <aside className="sticky top-0 hidden h-screen flex-col bg-sidebar lg:flex">{navigation}</aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border-subtle bg-card/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button className="lg:hidden" variant="ghost" size="icon" type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></Button>
            <Button className="hidden lg:inline-flex" variant="ghost" size="icon" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}</Button>
            <div><p className="text-[11px] font-medium text-muted-foreground">Operations <span className="px-1 text-subtle-foreground">/</span></p><strong className="block text-[13px] font-semibold text-foreground">{currentPage}</strong></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:inline-flex"><span className="size-2 rounded-full bg-success-indicator" aria-hidden="true" />Live data</span>
            <NavLink to="/profile" className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary ring-1 ring-primary-border transition hover:bg-primary/15 focus:outline-none focus:ring-3 focus:ring-primary-border" aria-label="Open my profile" title={currentUser.name}>{currentUser.name.charAt(0).toUpperCase()}</NavLink>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:px-8 lg:py-7">{children}</main>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-40 lg:hidden"><button className="absolute inset-0 bg-sidebar/55" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /><aside className="relative flex h-full w-[min(18rem,86vw)] flex-col bg-sidebar shadow-lg"><button className="absolute right-3 top-3 z-10 rounded-lg p-2 text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X className="size-5" /></button>{navigation}</aside></div>}
    </div>
  )
}
