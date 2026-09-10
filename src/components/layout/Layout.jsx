import React, { useState } from 'react'
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import {
  LayoutDashboard, Receipt, FileText, Package, Users,
  Settings, LogOut, Menu, X, UserCheck, CreditCard,
  GitBranch, Crown, BarChart2, ArrowLeftRight, Shield,
  Award, FileSpreadsheet, DollarSign
} from 'lucide-react'

const NAV_GROUPS = [
  { label: 'Core', items: [
    { to: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/app/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { to: '/app/invoices', icon: FileText, label: 'Sales & Invoices' },
    { to: '/app/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/app/inventory', icon: Package, label: 'Inventory' },
    { to: '/app/customers', icon: Users, label: 'Customers' },
  ]},
  { label: 'People & Money', items: [
    { to: '/app/payroll', icon: DollarSign, label: 'Payroll & PAYE' },
    { to: '/app/staff', icon: UserCheck, label: 'Staff' },
    { to: '/app/debts', icon: CreditCard, label: 'Debt Tracker' },
    { to: '/app/branches', icon: GitBranch, label: 'Branches' },
  ]},
  { label: 'Finance & Tax', items: [
    { to: '/app/reports', icon: BarChart2, label: 'Reports' },
    { to: '/app/tax', icon: Shield, label: 'Tax Compliance' },
    { to: '/app/reconcile', icon: FileSpreadsheet, label: 'Bank Reconcile' },
    { to: '/app/credit', icon: Award, label: 'Credit Score' },
    { to: '/app/accountant', icon: UserCheck, label: 'Accountant Portal' },
  ]},
]

const TITLES = {
  '/app': 'Dashboard', '/app/transactions': 'Transactions',
  '/app/invoices': 'Sales & Invoices', '/app/expenses': 'Expenses',
  '/app/inventory': 'Inventory', '/app/customers': 'Customers',
  '/app/payroll': 'Payroll & PAYE', '/app/staff': 'Staff',
  '/app/debts': 'Debt Tracker', '/app/branches': 'Branches',
  '/app/reports': 'Reports', '/app/tax': 'Tax Compliance',
  '/app/reconcile': 'Bank Reconciliation', '/app/credit': 'Credit Score',
  '/app/accountant': 'Accountant Portal', '/app/settings': 'Settings',
  '/app/subscription': 'Subscription',
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const year = new Date().getFullYear()

  return (
    <div className="flex min-h-screen" style={{background:"radial-gradient(ellipse 80% 50% at 10% -10%, rgba(0,180,90,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 90% 110%, rgba(0,120,60,0.12) 0%, transparent 55%), #0f2318"}}>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-60 z-30 flex flex-col
        transition-transform duration-250 lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `} style={{
        background: 'linear-gradient(175deg, #1a3d28 0%, #122b1c 50%, #0d2018 100%)',
        borderRight: '1px solid rgba(0,135,81,0.2)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      }}>

        {/* Flag stripe */}
        <div className="ng-flag-stripe" />

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4"
          style={{ borderBottom: '1px solid rgba(0,135,81,0.12)' }}>
          <img src="/logo.png" alt="9jaTax" className="h-9 w-auto" style={{ filter: 'drop-shadow(0 0 8px rgba(0,200,120,0.3))' }} />
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Shop pill */}
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(0,135,81,0.1)', border: '1px solid rgba(0,135,81,0.2)' }}>
          <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Active shop</p>
          <p className="text-sm font-semibold text-white truncate mt-0.5">{profile?.shop_name || 'My Shop'}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-xs font-bold uppercase tracking-widest"
                style={{ color: 'rgba(0,200,120,0.4)' }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink key={item.to} to={item.to} end={item.exact}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
                    <item.icon size={15} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 space-y-0.5" style={{ borderTop: '1px solid rgba(0,135,81,0.12)' }}>
          <NavLink to="/app/subscription" onClick={() => setOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            style={{ color: '#FFB020' }}>
            <Crown size={15} /><span>Subscription</span>
          </NavLink>
          <NavLink to="/app/settings" onClick={() => setOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
            <Settings size={15} /><span>Settings</span>
          </NavLink>
          <button onClick={signOut} className="nav-item w-full text-left"
            style={{ color: 'rgba(255,100,100,0.6)' }}
            onMouseEnter={e => { e.currentTarget.style.color='#ff6b6b'; e.currentTarget.style.background='rgba(255,50,50,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color='rgba(255,100,100,0.6)'; e.currentTarget.style.background='transparent' }}>
            <LogOut size={15} /><span>Sign out</span>
          </button>
        </div>

        <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(0,135,81,0.08)' }}>
          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.12)' }}>
            &copy; {year} <span style={{ color: 'rgba(0,200,120,0.4)' }}>HSPR Technologies</span>
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-14 flex items-center gap-3 px-4 shrink-0 sticky top-0 z-10"
          style={{
            background: 'rgba(15,35,22,0.9)',
            backdropFilter: 'blur(24px) saturate(180%)',
            borderBottom: '1px solid rgba(0,135,81,0.15)',
            boxShadow: '0 1px 0 rgba(0,200,120,0.05) inset',
          }}>

          <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-xl"
            style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(0,135,81,0.1)', border: '1px solid rgba(0,135,81,0.2)' }}>
            <Menu size={17} />
          </button>

          {/* Logo on mobile */}
          <Link to="/app" className="lg:hidden">
            <img src="/logo.png" alt="9jaTax" className="h-7 w-auto" />
          </Link>

          {/* Page title */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00C896', boxShadow: '0 0 6px rgba(0,200,150,0.8)' }} />
            <h1 className="font-semibold text-white text-sm">{TITLES[pathname] || '9jaTax'}</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <p className="hidden sm:block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {profile?.shop_name}
            </p>
            {/* Avatar with logo feel */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
              style={{
                background: 'linear-gradient(135deg, #008751, #006B40)',
                boxShadow: '0 0 12px rgba(0,135,81,0.4), 0 0 0 2px rgba(0,200,120,0.2)',
              }}>
              {(profile?.owner_name || profile?.shop_name || 'U')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto" style={{background:"transparent"}}>
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="px-6 py-2 flex items-center justify-center gap-4"
          style={{ borderTop: '1px solid rgba(0,135,81,0.1)', background: 'rgba(0,0,0,0.2)' }}>
          <img src="/logo.png" alt="9jaTax" className="h-5 w-auto opacity-40" />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
            &copy; {year} HSPR Technologies Ltd &middot; Made in Nigeria
          </p>
        </footer>
      </div>
    </div>
  )
}
