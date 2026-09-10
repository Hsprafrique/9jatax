import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowUpRight, ArrowDownLeft, Search, Filter, Plus, X, Trash2, ArrowLeftRight } from 'lucide-react'
import { format } from 'date-fns'

const PAYMENT_METHODS = ['cash','transfer','card','cheque','pos','other']
const INCOME_CATS = ['Sales','Service fee','Rental income','Commission','Refund received','Other income']
const EXPENSE_CATS = ['Stock / Goods','Rent','Salaries','Transport','Utilities','Equipment','Marketing','Repairs','Tax & Levies','Other']

const empty = () => ({
  type: 'income',
  category: '',
  description: '',
  amount: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  payment_method: 'cash',
  notes: '',
})

export default function Transactions() {
  const { user } = useAuth()
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    // Pull from both invoices (income) and expenses, plus manual transactions
    const [txRes, invRes, expRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('invoices').select('id,invoice_number,customer_name,total,status,issue_date').eq('user_id', user.id).eq('status', 'paid').order('issue_date', { ascending: false }),
      supabase.from('expenses').select('id,description,amount,date,category,vendor').eq('user_id', user.id).order('date', { ascending: false }),
    ])

    // Merge into unified list
    const manual = (txRes.data || []).map(t => ({ ...t, source: 'manual' }))

    const invoiceTxns = (invRes.data || []).map(inv => ({
      id: `inv-${inv.id}`,
      type: 'income',
      category: 'Sales',
      description: `Invoice ${inv.invoice_number}${inv.customer_name ? ` --- ${inv.customer_name}` : ''}`,
      amount: inv.total,
      date: inv.issue_date,
      payment_method: 'transfer',
      source: 'invoice',
      reference_id: inv.id,
    }))

    const expenseTxns = (expRes.data || []).map(exp => ({
      id: `exp-${exp.id}`,
      type: 'expense',
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      date: exp.date,
      payment_method: 'cash',
      source: 'expense',
      reference_id: exp.id,
    }))

    // Merge and sort by date
    const all = [...manual, ...invoiceTxns, ...expenseTxns]
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    setTxns(all)
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: form.type,
      category: form.category || null,
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      date: form.date,
      payment_method: form.payment_method,
      notes: form.notes || null,
    })
    if (error) { console.error('Transaction error:', error); setSaving(false); return }
    await load(); setShowForm(false); setForm(empty()); setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Delete this transaction?')) return
    await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id)
    setTxns(p => p.filter(t => t.id !== id))
  }

  const filtered = txns.filter(t => {
    const matchType = typeFilter === 'all' || t.type === typeFilter
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)

  const methodLabel = { cash: '---- Cash', transfer: '---- Transfer', card: '---- Card', cheque: '---- Cheque', pos: '------- POS', other: '---- Other' }

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-4">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card rounded-2xl p-4 border border-emerald-500/20">
          <p className="text-xs text-white/40 mb-1">Total income</p>
          <p className="text-xl font-bold text-green-bright">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="stat-card rounded-2xl p-4 border border-red-500/20">
          <p className="text-xs text-white/40 mb-1">Total expenses</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="stat-card rounded-2xl p-4 border border-white/10">
          <p className="text-xs text-white/40 mb-1">Net</p>
          <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-bright' : 'text-red-400'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 glass rounded-xl p-1">
          {['all','income','expense'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                ${typeFilter === t
                  ? t === 'income' ? 'bg-[#008751] text-white' : t === 'expense' ? 'bg-red-500 text-white' : 'bg-navy-600 text-white'
                  : 'text-white/40 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="pl-9 pr-3 py-2 bg-white/5 border border-white/12 text-white placeholder-navy-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-40" />
          </div>
          <button onClick={() => { setForm(empty()); setShowForm(true) }} className="btn-primary text-sm px-3 py-2 flex items-center gap-1.5">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Transaction list */}
      <div className="navy-card white-top-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <ArrowLeftRight size={28} className="text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/30">No transactions yet</p>
            <p className="text-xs text-white/20 mt-1">Paid invoices and expenses appear here automatically</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/2 transition-colors">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                  ${t.type === 'income' ? 'bg-[#008751]/15' : 'bg-red-500/15'}`}>
                  {t.type === 'income'
                    ? <ArrowUpRight size={16} className="text-green-bright" />
                    : <ArrowDownLeft size={16} className="text-red-400" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-white/30">{formatDate(t.date)}</span>
                    {t.category && <span className="text-xs text-white/30">-- {t.category}</span>}
                    {t.payment_method && <span className="text-xs text-white/20">{methodLabel[t.payment_method] || t.payment_method}</span>}
                    {t.source !== 'manual' && (
                      <span className="text-xs bg-white/5 text-white/40 px-1.5 py-0.5 rounded-full">{t.source}</span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <p className={`font-mono font-bold text-sm shrink-0 ${t.type === 'income' ? 'text-green-bright' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </p>

                {/* Delete (only manual) */}
                {t.source === 'manual' && (
                  <button onClick={() => remove(t.id)} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="modal-panel rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor:"rgba(255,255,255,0.08)"}}>
              <h2 className="font-semibold text-white">Add transaction</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm(f => ({...f, type: 'income', category: ''}))}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5
                    ${form.type === 'income' ? 'bg-[#008751]/20 border-emerald-500/40 text-green-bright' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                  <ArrowUpRight size={15} /> Income
                </button>
                <button type="button" onClick={() => setForm(f => ({...f, type: 'expense', category: ''}))}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5
                    ${form.type === 'expense' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                  <ArrowDownLeft size={15} /> Expense
                </button>
              </div>

              <div>
                <label className="label-dark">Description *</label>
                <input required value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  placeholder="What is this transaction for?" className="input-dark" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dark">Amount (---) *</label>
                  <input required type="number" min="0" step="0.01" value={form.amount}
                    onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="0" className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Date *</label>
                  <input required type="date" value={form.date}
                    onChange={e => setForm(f => ({...f, date: e.target.value}))} className="input-dark" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dark">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                    className="input-dark bg-black/30">
                    <option value="">Select category</option>
                    {(form.type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Payment method</label>
                  <select value={form.payment_method} onChange={e => setForm(f => ({...f, payment_method: e.target.value}))}
                    className="input-dark bg-black/30">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-dark">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  placeholder="Optional" className="input-dark" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
