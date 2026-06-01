import React, { useState } from 'react'
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import {
  LayoutDashboard, Receipt, FileText, Package,
  Users, Settings, LogOut, Menu, X,
  UserCheck, CreditCard, GitBranch
} from 'lucide-react'

const NAV = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/app/invoices', icon: FileText, label: 'Sales & Invoices' },
  { to: '/app/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/app/inventory', icon: Package, label: 'Inventory' },
  { to: '/app/customers', icon: Users, label: 'Customers' },
  { to: '/app/staff', icon: UserCheck, label: 'Staff & Payroll' },
  { to: '/app/debts', icon: CreditCard, label: 'Debt Tracker' },
  { to: '/app/branches', icon: GitBranch, label: 'Branches' },
]

const PAGE_TITLES = {
  '/app': 'Dashboard', '/app/invoices': 'Sales & Invoices',
  '/app/expenses': 'Expenses', '/app/inventory': 'Inventory',
  '/app/customers': 'Customers', '/app/staff': 'Staff & Payroll',
  '/app/debts': 'Debt Tracker', '/app/branches': 'Branches',
  '/app/settings': 'Settings',
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || '9jaTax'
  const year = new Date().getFullYear()

  return (
    <div className="flex min-h-screen bg-navy-950">
      {open && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-navy-900 border-r border-white/5 z-30 flex flex-col
        transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
          <img src="/logo.png" alt="9jaTax" className="h-8 w-auto" />
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-navy-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Shop info */}
        <div className="px-4 py-3 border-b border-white/5 mx-3 mt-3 glass rounded-xl">
          <p className="text-xs text-navy-500 mb-0.5">Active shop</p>
          <p className="text-sm font-semibold text-white truncate">{profile?.shop_name || 'My Shop'}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-navy-400 hover:bg-white/5 hover:text-white'
                }`
              }>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-white/5 space-y-0.5">
          <NavLink to="/app/settings" onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-navy-400 hover:bg-white/5 hover:text-white'}`
            }>
            <Settings size={17} /> Settings
          </NavLink>
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <LogOut size={17} /> Log out
          </button>
        </div>

        <div className="px-4 py-3 border-t border-white/5">
          <p className="text-xs text-navy-600 text-center">© {year} <span className="text-emerald-500/70">HSPR Technologies</span></p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-navy-900 border-b border-white/5 flex items-center gap-3 px-4 shrink-0">
          <button onClick={() => setOpen(true)} className="lg:hidden text-navy-400 hover:text-white p-1">
            <Menu size={20} />
          </button>
          <h1 className="font-semibold text-white text-base">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-navy-400">{profile?.shop_name || 'My Shop'}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-xs">
                {(profile?.owner_name || profile?.shop_name || 'U')[0].toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-navy-950">
          <Outlet />
        </main>

        <footer className="border-t border-white/5 bg-navy-900 px-6 py-2.5">
          <p className="text-xs text-navy-600 text-center">
            © {year} 9jaTax · A product of <span className="text-emerald-500/70 font-medium">HSPR Technologies</span> · All rights reserved
          </p>
        </footer>
      </div>
    </div>
  )
}
