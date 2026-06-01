import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Plus, ArrowRight, CreditCard, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

function StatCard({ label, value, sub, icon: Icon, color = 'emerald', trend }) {
  const colors = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  }
  const c = colors[color]
  return (
    <div className={`stat-card rounded-2xl p-5 border ${c.border} hover:border-opacity-50 transition-all duration-300 hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-navy-400">{label}</p>
        <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center`}>
          <Icon size={17} className={c.text} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {sub && <p className="text-xs text-navy-500">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div className="glass-card rounded-xl px-4 py-3 text-xs">
      <p className="text-navy-300 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
  return null
}

const STATUS_COLORS = {
  paid: 'bg-emerald-500/15 text-emerald-400',
  sent: 'bg-blue-500/15 text-blue-400',
  draft: 'bg-navy-700 text-navy-400',
  overdue: 'bg-red-500/15 text-red-400',
  cancelled: 'bg-navy-700 text-navy-500',
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({ income: 0, expenses: 0, profit: 0, pending: 0, debtOwed: 0 })
  const [chartData, setChartData] = useState([])
  const [recentInvoices, setRecentInvoices] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [staffCount, setStaffCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    const [invRes, expRes, prodRes, debtRes, staffRes] = await Promise.all([
      supabase.from('invoices').select('status,total,issue_date,customer_name,invoice_number').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('expenses').select('amount,date').eq('user_id', user.id),
      supabase.from('products').select('name,stock_qty,low_stock_alert,track_stock').eq('user_id', user.id).eq('is_active', true),
      supabase.from('debts').select('amount,amount_paid,type').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('staff').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_active', true),
    ])

    const invoices = invRes.data || []
    const expenses = expRes.data || []
    const products = prodRes.data || []
    const debts = debtRes.data || []

    const income = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const pending = invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0)
    const debtOwed = debts.filter(d => d.type === 'owed_to_me').reduce((s, d) => s + (d.amount - d.amount_paid), 0)

    setStats({ income, expenses: totalExpenses, profit: income - totalExpenses, pending, debtOwed })
    setRecentInvoices(invoices.slice(0, 6))
    setLowStock(products.filter(p => p.track_stock && p.stock_qty <= p.low_stock_alert))
    setStaffCount(staffRes.count || 0)

    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      const start = startOfMonth(d).toISOString().split('T')[0]
      const end = endOfMonth(d).toISOString().split('T')[0]
      const inc = invoices.filter(inv => inv.status === 'paid' && inv.issue_date >= start && inv.issue_date <= end).reduce((s, inv) => s + (inv.total || 0), 0)
      const exp = expenses.filter(e => e.date >= start && e.date <= end).reduce((s, e) => s + (e.amount || 0), 0)
      return { month: format(d, 'MMM'), income: inc, expenses: exp }
    })
    setChartData(months)
    setLoading(false)
  }

  if (loading) return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="stat-card rounded-2xl h-28 animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            Good day{profile?.owner_name ? `, ${profile.owner_name.split(' ')[0]}` : ''} 👋
          </h2>
          <p className="text-sm text-navy-400 mt-0.5">{profile?.shop_name || 'Your shop'} · {format(new Date(), 'EEEE, d MMM yyyy')}</p>
        </div>
        <Link to="/app/invoices" className="btn-primary text-sm px-4 py-2.5 hidden sm:flex items-center gap-1.5">
          <Plus size={15} /> New invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Total income" value={formatCurrency(stats.income)} sub="All paid invoices" icon={TrendingUp} color="emerald" />
        <StatCard label="Total expenses" value={formatCurrency(stats.expenses)} sub="All recorded" icon={TrendingDown} color="red" />
        <StatCard label="Net profit" value={formatCurrency(stats.profit)} sub="Income minus expenses" icon={TrendingUp} color={stats.profit >= 0 ? 'emerald' : 'red'} />
        <StatCard label="Unpaid invoices" value={formatCurrency(stats.pending)} sub="Awaiting payment" icon={Clock} color="amber" />
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <div className="stat-card rounded-2xl p-4 border border-blue-500/20">
          <p className="text-xs text-navy-400 mb-1">Active staff</p>
          <p className="text-2xl font-bold text-white">{staffCount}</p>
          <Link to="/app/staff" className="text-xs text-blue-400 hover:text-blue-300 mt-1 flex items-center gap-1">Manage <ArrowRight size={11} /></Link>
        </div>
        <div className="stat-card rounded-2xl p-4 border border-red-500/20">
          <p className="text-xs text-navy-400 mb-1">Debts owed to you</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(stats.debtOwed)}</p>
          <Link to="/app/debts" className="text-xs text-red-400 hover:text-red-300 mt-1 flex items-center gap-1">Track debts <ArrowRight size={11} /></Link>
        </div>
        {lowStock.length > 0 && (
          <div className="stat-card rounded-2xl p-4 border border-amber-500/20">
            <p className="text-xs text-navy-400 mb-1 flex items-center gap-1"><AlertTriangle size={11} className="text-amber-400" /> Low stock alerts</p>
            <p className="text-2xl font-bold text-amber-400">{lowStock.length}</p>
            <Link to="/app/inventory" className="text-xs text-amber-400 hover:text-amber-300 mt-1 flex items-center gap-1">View inventory <ArrowRight size={11} /></Link>
          </div>
        )}
      </div>

      {/* Chart + sidebar */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 navy-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Income vs Expenses — 6 months</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4a5568' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#4a5568' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" fill="#10b981" radius={[4,4,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4,4,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="navy-card p-5">
          <p className="text-sm font-semibold text-white mb-4">Quick actions</p>
          <div className="space-y-2">
            {[
              { to: '/app/invoices', label: 'New invoice', icon: '📄' },
              { to: '/app/expenses', label: 'Add expense', icon: '🧾' },
              { to: '/app/inventory', label: 'Update stock', icon: '📦' },
              { to: '/app/debts', label: 'Record a debt', icon: '💳' },
              { to: '/app/staff', label: 'Add staff', icon: '👤' },
            ].map(a => (
              <Link key={a.to} to={a.to}
                className="flex items-center justify-between p-3 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 hover:border-emerald-500/20 text-sm text-navy-300 hover:text-white transition-all group">
                <span className="flex items-center gap-2.5">{a.icon} {a.label}</span>
                <ArrowRight size={13} className="text-navy-600 group-hover:text-emerald-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent invoices */}
      <div className="navy-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">Recent invoices</h3>
          <Link to="/app/invoices" className="text-xs text-emerald-400 font-medium hover:text-emerald-300 flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-navy-500">No invoices yet</p>
            <Link to="/app/invoices" className="mt-2 inline-block text-sm text-emerald-400 font-medium hover:text-emerald-300">Create your first invoice →</Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentInvoices.map(inv => (
              <div key={inv.invoice_number} className="flex items-center px-5 py-3.5 text-sm hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{inv.customer_name || 'Walk-in customer'}</p>
                  <p className="text-xs text-navy-500 font-mono">{inv.invoice_number}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full mr-4 ${STATUS_COLORS[inv.status] || 'bg-navy-700 text-navy-400'}`}>
                  {inv.status}
                </span>
                <span className="font-mono text-sm font-semibold text-white">{formatCurrency(inv.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
