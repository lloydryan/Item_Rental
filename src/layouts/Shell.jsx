import { useState } from 'react'
import { BadgeCheck, ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { navItems } from '../constants'
import { roleAccess, roles } from '../roles'
import { Button } from '../components/Button'

export function Shell({ currentUser, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const allowed = roleAccess[currentUser.role]
  const visibleNav = navItems.filter((item) => allowed.includes(item.key))
  const currentPage = navItems.find((item) => location.pathname.startsWith(item.path))?.label || 'Workspace'

  const navigation = (
    <>
      <div className={`flex h-17 items-center border-b border-white/10 ${collapsed ? 'justify-center px-3' : 'gap-3 px-5'}`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><BadgeCheck className="size-5" /></span>
        {!collapsed && <div className="min-w-0"><strong className="block text-sm font-bold text-sidebar-foreground">LR Event Rental</strong><span className="block text-xs text-sidebar-muted">Operations workspace</span></div>}
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Main navigation">
        {!collapsed && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-sidebar-muted/70">Workspace</p>}
        <div className="grid gap-1">
          {visibleNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.key}
                to={item.path}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `relative flex min-h-10 items-center rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive ? 'bg-primary/10 text-sidebar-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary-accent' : 'text-sidebar-muted hover:bg-white/6 hover:text-sidebar-foreground'}`}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </div>
      </nav>
      <div className="border-t border-white/10 p-3">
        {!collapsed && <div className="mb-3 flex items-center gap-3 rounded-lg px-2 py-2"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{currentUser.name.charAt(0).toUpperCase()}</span><div className="min-w-0"><strong className="block truncate text-sm text-sidebar-foreground">{currentUser.name}</strong><span className="block truncate text-xs text-sidebar-muted">{roles[currentUser.role]}</span></div></div>}
        <button className={`flex min-h-10 w-full items-center rounded-lg text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/6 hover:text-sidebar-foreground ${collapsed ? 'justify-center' : 'gap-3 px-3'}`} type="button" title={collapsed ? 'Sign out' : undefined} onClick={onLogout}><LogOut className="size-[18px]" />{!collapsed && 'Sign out'}</button>
      </div>
    </>
  )

  return (
    <div className={`min-h-screen bg-background lg:grid ${collapsed ? 'lg:grid-cols-[4.75rem_1fr]' : 'lg:grid-cols-[16.5rem_1fr]'}`}>
      <aside className="sticky top-0 hidden h-screen flex-col bg-sidebar lg:flex">{navigation}</aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-17 items-center justify-between border-b bg-card/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button className="lg:hidden" variant="ghost" size="icon" type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></Button>
            <Button className="hidden lg:inline-flex" variant="ghost" size="icon" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}</Button>
            <div><p className="text-xs font-medium text-muted-foreground">Operations</p><strong className="block text-sm font-semibold text-foreground">{currentPage}</strong></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:inline-flex"><span className="size-2 rounded-full bg-success-indicator" aria-hidden="true" />Live data</span>
            <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary ring-1 ring-primary-border" title={currentUser.name}>{currentUser.name.charAt(0).toUpperCase()}</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-40 lg:hidden"><button className="absolute inset-0 bg-sidebar/55" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /><aside className="relative flex h-full w-[min(18rem,86vw)] flex-col bg-sidebar shadow-2xl"><button className="absolute right-3 top-3 z-10 rounded-lg p-2 text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X className="size-5" /></button>{navigation}</aside></div>}
    </div>
  )
}
