import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { isAdmin, getActivePlan, LIMITS } from '@/lib/planGate'
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Plus, ArrowRight, CreditCard, Crown, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-3 py-2.5 text-xs" style={{ border: '1px solid rgba(0,200,120,0.2)' }}>
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {formatCurrency(p.value)}</p>)}
    </div>
  )
}

const STATUS_PILL = {
  paid: 'pill-green', sent: 'pill-blue', draft: 'pill-gray',
  overdue: 'pill-red', cancelled: 'pill-gray',
}

const DONUT_COLORS = ['#00C896','#60A5FA','#FFB020','#A78BFA','#F472B6','#34D399','#FB923C']

function StatCard({ label, value, sub, icon: Icon, color, accent }) {
  return (
    <div className="stat-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none truncate">{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>}
      </div>
      {/* Bottom glow line */}
      <div className="h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}60, ${accent}20, transparent)` }} />
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, subscription } = useAuth()
  const [stats, setStats] = useState({ income: 0, expenses: 0, profit: 0, pending: 0, debtOwed: 0 })
  const [chartData, setChartData] = useState([])
  const [recentInvoices, setRecentInvoices] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [counts, setCounts] = useState({ invoices: 0, products: 0, customers: 0, staff: 0 })
  const [expenseCategories, setExpenseCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const admin = isAdmin(user?.email)
  const plan = getActivePlan(null, subscription)
  const limits = LIMITS[plan] || LIMITS.free

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    const now = new Date()
    const monthStart = startOfMonth(now).toISOString().split('T')[0]
    const monthEnd = endOfMonth(now).toISOString().split('T')[0]

    const [invRes, expRes, prodRes, debtRes, staffRes, custRes, monthInvRes] = await Promise.all([
      supabase.from('invoices').select('status,total,issue_date,customer_name,invoice_number').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('expenses').select('amount,date,category').eq('user_id', user.id),
      supabase.from('products').select('name,stock_qty,low_stock_alert,track_stock').eq('user_id', user.id).eq('is_active', true),
      supabase.from('debts').select('amount,amount_paid,type').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('staff').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_active', true),
      supabase.from('customers').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('invoices').select('id', { count: 'exact' }).eq('user_id', user.id).gte('issue_date', monthStart).lte('issue_date', monthEnd),
    ])

    const invoices = invRes.data || [], expenses = expRes.data || []
    const products = prodRes.data || [], debts = debtRes.data || []

    const income = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
    const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const pending = invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0)
    const debtOwed = debts.filter(d => d.type === 'owed_to_me').reduce((s, d) => s + Math.max(0, (d.amount||0)-(d.amount_paid||0)), 0)

    setStats({ income, expenses: totalExp, profit: income - totalExp, pending, debtOwed })
    setRecentInvoices(invoices.slice(0, 6))
    setLowStock(products.filter(p => p.track_stock && p.stock_qty <= p.low_stock_alert).slice(0, 3))
    setCounts({ invoices: monthInvRes.count || 0, products: products.length, customers: custRes.count || 0, staff: staffRes.count || 0 })

    const catMap = {}
    expenses.forEach(e => { const c = e.category || 'other'; catMap[c] = (catMap[c] || 0) + (e.amount || 0) })
    setExpenseCategories(Object.entries(catMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).sort((a,b) => b.value - a.value))

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      const s = startOfMonth(d).toISOString().split('T')[0]
      const e = endOfMonth(d).toISOString().split('T')[0]
      const inc = invoices.filter(inv => inv.status === 'paid' && inv.issue_date >= s && inv.issue_date <= e).reduce((sum, inv) => sum + (inv.total||0), 0)
      const exp = expenses.filter(ex => ex.date >= s && ex.date <= e).reduce((sum, ex) => sum + (ex.amount||0), 0)
      return { month: format(d, 'MMM'), income: inc, expenses: exp, profit: inc - exp }
    })
    setChartData(months)
    setLoading(false)
  }

  if (loading) return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="stat-card h-28 animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl min-h-screen" style={{background:"transparent"}}>

      {/* Greeting */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="9jaTax" className="h-10 w-auto hidden sm:block" style={{ filter: 'drop-shadow(0 0 12px rgba(0,200,120,0.4))' }} />
          <div>
            <h2 className="text-xl font-bold text-white">
              Good day{profile?.owner_name ? `, ${profile.owner_name.split(' ')[0]}` : ''} <span className="text-gradient-green">--</span>
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {profile?.shop_name} &middot; {format(new Date(), 'EEE, d MMM yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!admin && plan === 'free' && (
            <Link to="/app/subscription"
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
              style={{ background: 'rgba(255,176,32,0.12)', border: '1px solid rgba(255,176,32,0.25)', color: '#FFB020' }}>
              <Crown size={12} /> Upgrade
            </Link>
          )}
          <Link to="/app/invoices" className="btn-primary text-sm px-4 py-2.5 flex items-center gap-1.5">
            <Plus size={15} /> New invoice
          </Link>
        </div>
      </div>

      {/* Usage bars - free only */}
      {!admin && plan === 'free' && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Invoices this month', count: counts.invoices, limit: limits.invoices },
            { label: 'Products', count: counts.products, limit: limits.products },
            { label: 'Customers', count: counts.customers, limit: limits.customers },
          ].map(({ label, count, limit }) => {
            const pct = Math.min(100, (count / limit) * 100)
            const full = pct >= 100, near = pct >= 70
            return (
              <div key={label} className="card p-3"
                style={{ borderColor: full ? 'rgba(255,80,80,0.3)' : near ? 'rgba(255,176,32,0.3)' : 'rgba(0,135,81,0.2)' }}>
                <div className="flex justify-between items-center mb-1.5 gap-1">
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
                  <p className="text-xs font-mono shrink-0" style={{ color: full ? '#FF6B6B' : near ? '#FFB020' : 'rgba(255,255,255,0.4)' }}>{count}/{limit}</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: full ? '#FF6B6B' : near ? '#FFB020' : 'linear-gradient(90deg,#008751,#00C896)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Main stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Income" value={formatCurrency(stats.income)} sub="All paid invoices" icon={TrendingUp} accent="#00C896" />
        <StatCard label="Total Expenses" value={formatCurrency(stats.expenses)} sub="All recorded" icon={TrendingDown} accent="#FF6B6B" />
        <StatCard label="Net Profit" value={formatCurrency(stats.profit)} sub="Income minus expenses" icon={stats.profit >= 0 ? TrendingUp : TrendingDown} accent={stats.profit >= 0 ? '#00C896' : '#FF6B6B'} />
        <StatCard label="Unpaid Invoices" value={formatCurrency(stats.pending)} sub="Awaiting payment" icon={Clock} accent="#FFB020" />
      </div>

      {/* Secondary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Debts Owed" value={formatCurrency(stats.debtOwed)} sub="Active only" icon={CreditCard} accent="#60A5FA" />
        <StatCard label="Active Staff" value={counts.staff} sub="Employees" icon={TrendingUp} accent="#A78BFA" />
        {lowStock.length > 0 ? (
          <div className="col-span-2 card p-4" style={{ borderColor: 'rgba(255,176,32,0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} style={{ color: '#FFB020' }} />
              <span className="text-xs font-bold" style={{ color: '#FFB020' }}>Low stock alert</span>
            </div>
            {lowStock.map(p => (
              <div key={p.name} className="flex justify-between text-xs py-1.5 table-row">
                <span className="text-white truncate pr-2">{p.name}</span>
                <span className="font-mono shrink-0" style={{ color: '#FFB020' }}>{p.stock_qty} left</span>
              </div>
            ))}
            <Link to="/app/inventory" className="text-xs flex items-center gap-1 mt-2" style={{ color: '#00C896' }}>View inventory <ArrowRight size={10} /></Link>
          </div>
        ) : (
          <>
            <div className="stat-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>This month</p>
              <p className="text-2xl font-bold text-white">{counts.invoices}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>invoices created</p>
            </div>
            <div className="stat-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Customers</p>
              <p className="text-2xl font-bold text-white">{counts.customers}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>total records</p>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Income vs Expenses bar */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="text-sm font-bold text-white mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={chartData} barGap={3} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,135,81,0.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" fill="#00C896" radius={[4,4,0,0]} name="Income" maxBarSize={22} />
              <Bar dataKey="expenses" fill="#FF6B6B" radius={[4,4,0,0]} name="Expenses" maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense donut */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-white mb-3">Expense Breakdown</h3>
          {expenseCategories.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>No expenses yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={expenseCategories} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                    dataKey="value" paddingAngle={3}>
                    {expenseCategories.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: '#0d2818', border: '1px solid rgba(0,135,81,0.3)', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {expenseCategories.slice(0, 4).map((e, i) => (
                  <div key={e.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{e.name}</span>
                    </div>
                    <span className="font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{formatCurrency(e.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Profit overview area chart */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-white mb-4">Profit Overview</h3>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C896" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00C896" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,135,81,0.06)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="profit" stroke="#00C896" strokeWidth={2.5} fill="url(#profitFill)" name="Profit" dot={{ fill: '#00C896', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { to: '/app/invoices', label: 'New Invoice', icon: '----' },
          { to: '/app/expenses', label: 'Expense', icon: '----' },
          { to: '/app/inventory', label: 'Stock', icon: '----' },
          { to: '/app/transactions', label: 'Ledger', icon: '------' },
          { to: '/app/payroll', label: 'Payroll', icon: '----' },
          { to: '/app/reports', label: 'Reports', icon: '----' },
          { to: '/app/tax', label: 'Tax', icon: '-------' },
          { to: '/app/credit', label: 'Score', icon: '---' },
        ].map(a => (
          <Link key={a.to} to={a.to}
            className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all group"
            style={{ background: 'rgba(0,135,81,0.07)', border: '1px solid rgba(0,135,81,0.12)' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(0,135,81,0.18)'; e.currentTarget.style.borderColor='rgba(0,200,120,0.3)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.3), 0 0 15px rgba(0,135,81,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(0,135,81,0.07)'; e.currentTarget.style.borderColor='rgba(0,135,81,0.12)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none' }}>
            <span className="text-xl">{a.icon}</span>
            <span className="text-xs text-center leading-tight" style={{ color: 'rgba(255,255,255,0.45)' }}>{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent invoices */}
      <div className="card-dark rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(0,135,81,0.1)' }}>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-5 w-auto opacity-50" />
            <h3 className="text-sm font-bold text-white">Recent Invoices</h3>
          </div>
          <Link to="/app/invoices" className="text-xs flex items-center gap-1" style={{ color: '#00C896' }}>
            View all <ArrowRight size={11} />
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No invoices yet</p>
            <Link to="/app/invoices" className="mt-2 inline-block text-sm" style={{ color: '#00C896' }}>Create your first invoice --</Link>
          </div>
        ) : (
          <div>
            {recentInvoices.map(inv => (
              <div key={inv.invoice_number} className="flex items-center px-5 py-3.5 gap-3 table-row">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: inv.status === 'paid' ? 'rgba(0,200,150,0.12)' : inv.status === 'overdue' ? 'rgba(255,80,80,0.12)' : 'rgba(0,135,81,0.1)' }}>
                  {inv.status === 'paid' ? <ArrowUpRight size={14} style={{ color: '#00C896' }} /> : <ArrowDownLeft size={14} style={{ color: inv.status === 'overdue' ? '#FF6B6B' : '#FFB020' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{inv.customer_name || 'Walk-in'}</p>
                  <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{inv.invoice_number}</p>
                </div>
                <span className={STATUS_PILL[inv.status] || 'pill-gray'}>{inv.status}</span>
                <span className="font-mono text-sm font-bold text-white shrink-0">{formatCurrency(inv.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
