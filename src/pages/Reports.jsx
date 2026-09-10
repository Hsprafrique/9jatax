import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { isAdmin, getActivePlan, canAccess } from '@/lib/planGate'
import { Link } from 'react-router-dom'
import { Download, Crown, TrendingUp, TrendingDown, FileText, Calendar } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-xl px-3 py-2 text-xs border border-white/10">
      <p className="text-white/60 mb-1 font-medium">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {formatCurrency(p.value)}</p>)}
    </div>
  )
}

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-xl px-3 py-2 text-xs border border-white/10">
      <p className="text-white font-medium">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }}>{formatCurrency(payload[0].value)}</p>
      <p className="text-white/40">{payload[0].payload.pct}% of total</p>
    </div>
  )
}

export default function Reports() {
  const { user, subscription } = useAuth()
  const admin = isAdmin(user?.email)
  const canExport = admin || canAccess('export_csv', { email: user?.email, subscription }).allowed

  const [period, setPeriod] = useState('this_month')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    income: 0, expenses: 0, profit: 0, invoiceCount: 0, paidCount: 0,
    monthlyTrend: [], expenseByCategory: [], incomeByMonth: [], topCustomers: []
  })

  useEffect(() => { if (user) load() }, [user, period])

  function getDateRange() {
    const now = new Date()
    switch (period) {
      case 'this_month': return { start: startOfMonth(now).toISOString().split('T')[0], end: endOfMonth(now).toISOString().split('T')[0], label: format(now, 'MMMM yyyy') }
      case 'last_month': { const d = subMonths(now, 1); return { start: startOfMonth(d).toISOString().split('T')[0], end: endOfMonth(d).toISOString().split('T')[0], label: format(d, 'MMMM yyyy') } }
      case 'this_year': return { start: startOfYear(now).toISOString().split('T')[0], end: endOfYear(now).toISOString().split('T')[0], label: `Year ${format(now, 'yyyy')}` }
      case 'last_6': { const d = subMonths(now, 6); return { start: d.toISOString().split('T')[0], end: now.toISOString().split('T')[0], label: 'Last 6 months' } }
      default: return { start: startOfMonth(now).toISOString().split('T')[0], end: endOfMonth(now).toISOString().split('T')[0], label: 'This month' }
    }
  }

  async function load() {
    setLoading(true)
    const { start, end } = getDateRange()

    const [invRes, expRes] = await Promise.all([
      supabase.from('invoices').select('status,total,issue_date,customer_name').eq('user_id', user.id).gte('issue_date', start).lte('issue_date', end),
      supabase.from('expenses').select('amount,date,category,description').eq('user_id', user.id).gte('date', start).lte('date', end),
    ])

    const invoices = invRes.data || []
    const expenses = expRes.data || []

    const income = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
    const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0)

    // Expense by category
    const catMap = {}
    expenses.forEach(e => {
      const cat = e.category || 'other'
      catMap[cat] = (catMap[cat] || 0) + (e.amount || 0)
    })
    const expenseByCategory = Object.entries(catMap)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value)
      .map((item, i) => ({ ...item, fill: COLORS[i % COLORS.length], pct: totalExp > 0 ? Math.round((item.value / totalExp) * 100) : 0 }))

    // Monthly trend --- always 6 months
    const now = new Date()
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      const s = startOfMonth(d).toISOString().split('T')[0]
      const e = endOfMonth(d).toISOString().split('T')[0]
      const inc = invoices.filter(inv => inv.status === 'paid' && inv.issue_date >= s && inv.issue_date <= e).reduce((sum, inv) => sum + (inv.total || 0), 0)
      const exp = expenses.filter(ex => ex.date >= s && ex.date <= e).reduce((sum, ex) => sum + (ex.amount || 0), 0)
      return { month: format(d, 'MMM'), income: inc, expenses: exp, profit: inc - exp }
    })

    // Top customers
    const custMap = {}
    invoices.filter(i => i.status === 'paid').forEach(inv => {
      const name = inv.customer_name || 'Walk-in'
      custMap[name] = (custMap[name] || 0) + (inv.total || 0)
    })
    const topCustomers = Object.entries(custMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }))

    setData({
      income, expenses: totalExp, profit: income - totalExp,
      invoiceCount: invoices.length,
      paidCount: invoices.filter(i => i.status === 'paid').length,
      monthlyTrend, expenseByCategory, topCustomers,
    })
    setLoading(false)
  }

  function exportCSV() {
    if (!canExport) return
    const { start, end, label } = getDateRange()
    const rows = [
      ['9jaTax Report ---', label],
      [''],
      ['SUMMARY'],
      ['Total Income', data.income],
      ['Total Expenses', data.expenses],
      ['Net Profit', data.profit],
      ['Invoices', data.invoiceCount],
      ['Paid Invoices', data.paidCount],
      [''],
      ['EXPENSE BREAKDOWN'],
      ['Category', 'Amount'],
      ...data.expenseByCategory.map(e => [e.name, e.value]),
      [''],
      ['TOP CUSTOMERS'],
      ['Customer', 'Total Paid'],
      ...data.topCustomers.map(c => [c.name, c.total]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `9jaTax-Report-${label.replace(/ /g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const { label } = getDateRange()

  return (
    <div className="p-4 lg:p-6 max-w-6xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Financial Reports</h2>
          <p className="text-sm text-white/40">{label}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex gap-1 glass rounded-xl p-1">
            {[
              { value: 'this_month', label: 'This month' },
              { value: 'last_month', label: 'Last month' },
              { value: 'last_6', label: '6 months' },
              { value: 'this_year', label: 'This year' },
            ].map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                  ${period === p.value ? 'bg-[#008751] text-white' : 'text-white/40 hover:text-white'}`}>
                {p.label}
              </button>
            ))}
          </div>
          {/* Export */}
          {canExport ? (
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 text-sm border border-emerald-500/30 text-green-bright px-3 py-2 rounded-xl hover:bg-[#008751]/10 transition-colors">
              <Download size={15} /> Export CSV
            </button>
          ) : (
            <Link to="/app/subscription"
              className="flex items-center gap-1.5 text-xs border border-amber-500/20 text-amber-400 px-3 py-2 rounded-xl hover:bg-amber-500/10 transition-colors">
              <Crown size={13} /> Upgrade to export
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="stat-card rounded-2xl h-24 animate-pulse border border-white/5" />)}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total income', value: formatCurrency(data.income), color: 'text-green-bright', border: 'border-emerald-500/20' },
              { label: 'Total expenses', value: formatCurrency(data.expenses), color: 'text-red-400', border: 'border-red-500/20' },
              { label: 'Net profit', value: formatCurrency(data.profit), color: data.profit >= 0 ? 'text-green-bright' : 'text-red-400', border: 'border-white/10' },
              { label: 'Invoices paid', value: `${data.paidCount} / ${data.invoiceCount}`, color: 'text-blue-400', border: 'border-blue-500/20' },
            ].map(s => (
              <div key={s.label} className={`stat-card rounded-2xl p-4 border ${s.border}`}>
                <p className="text-xs text-white/40 mb-2">{s.label}</p>
                <p className={`text-xl font-bold truncate ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* P&L Trend + Expense Donut */}
          <div className="grid lg:grid-cols-2 gap-4">

            {/* Profit trend --- line chart */}
            <div className="navy-card white-top-border p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 section-header">
                <TrendingUp size={15} className="text-green-bright" /> Profit trend --- last 6 months
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.monthlyTrend} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4a6280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#4a6280' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#profitGrad)" name="Profit" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Expense donut */}
            <div className="navy-card white-top-border p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 section-header">
                <TrendingDown size={15} className="text-red-400" /> Expense breakdown
              </h3>
              {data.expenseByCategory.length === 0 ? (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-white/30 text-sm">No expenses in this period</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.expenseByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      dataKey="value" nameKey="name" paddingAngle={2}>
                      {data.expenseByCategory.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {/* Legend */}
              <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                {data.expenseByCategory.slice(0, 6).map(e => (
                  <div key={e.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: e.fill }} />
                      <span className="text-white/60 truncate">{e.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-white/30">{e.pct}%</span>
                      <span className="text-white font-mono">{formatCurrency(e.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Income vs Expenses bar + Top customers */}
          <div className="grid lg:grid-cols-2 gap-4">

            {/* Bar chart */}
            <div className="navy-card white-top-border p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Income vs Expenses by month</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.monthlyTrend} barGap={3} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4a6280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#4a6280' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" fill="#10b981" radius={[3,3,0,0]} name="Income" maxBarSize={22} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[3,3,0,0]} name="Expenses" maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top customers */}
            <div className="navy-card white-top-border p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 section-header">
                <FileText size={15} className="text-blue-400" /> Top customers by revenue
              </h3>
              {data.topCustomers.length === 0 ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-white/30 text-sm">No paid invoices in this period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topCustomers.map((c, i) => {
                    const maxVal = data.topCustomers[0]?.total || 1
                    const pct = Math.round((c.total / maxVal) * 100)
                    return (
                      <div key={c.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-white/75 truncate pr-2">{c.name}</span>
                          <span className="text-white font-mono shrink-0">{formatCurrency(c.total)}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-[#008751] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* P&L Statement table */}
          <div className="navy-card white-top-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Profit & Loss Statement</h3>
              <span className="text-xs text-white/40">{label}</span>
            </div>
            <div className="divide-y divide-white/5">
              <div className="flex justify-between px-5 py-3">
                <span className="text-sm text-white/60 font-medium">INCOME</span>
              </div>
              <div className="flex justify-between px-5 py-3">
                <span className="text-sm text-white/40 pl-4">Total sales revenue</span>
                <span className="text-sm font-mono text-green-bright">{formatCurrency(data.income)}</span>
              </div>
              <div className="flex justify-between px-5 py-3 bg-[#008751]/5">
                <span className="text-sm font-semibold text-white">Gross Income</span>
                <span className="text-sm font-bold font-mono text-green-bright">{formatCurrency(data.income)}</span>
              </div>
              <div className="flex justify-between px-5 py-3">
                <span className="text-sm text-white/60 font-medium">EXPENSES</span>
              </div>
              {data.expenseByCategory.map(e => (
                <div key={e.name} className="flex justify-between px-5 py-2.5">
                  <span className="text-sm text-white/40 pl-4">{e.name}</span>
                  <span className="text-sm font-mono text-red-400">{formatCurrency(e.value)}</span>
                </div>
              ))}
              <div className="flex justify-between px-5 py-3 bg-red-500/5">
                <span className="text-sm font-semibold text-white">Total Expenses</span>
                <span className="text-sm font-bold font-mono text-red-400">{formatCurrency(data.expenses)}</span>
              </div>
              <div className={`flex justify-between px-5 py-4 ${data.profit >= 0 ? 'bg-[#008751]/10' : 'bg-red-500/10'}`}>
                <span className="font-bold text-white">NET PROFIT / (LOSS)</span>
                <span className={`font-bold font-mono text-lg ${data.profit >= 0 ? 'text-green-bright' : 'text-red-400'}`}>
                  {data.profit < 0 ? `(${formatCurrency(Math.abs(data.profit))})` : formatCurrency(data.profit)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
