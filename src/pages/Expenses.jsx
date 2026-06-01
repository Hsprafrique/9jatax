import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Trash2, Search, Printer, X, Receipt } from 'lucide-react'
import { format } from 'date-fns'

const CATEGORIES = [
  { value: 'stock', label: 'Stock / Goods' },
  { value: 'rent', label: 'Rent' },
  { value: 'salaries', label: 'Salaries / Staff' },
  { value: 'transport', label: 'Transport' },
  { value: 'utilities', label: 'Utilities (NEPA/Water)' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'marketing', label: 'Marketing / Advertising' },
  { value: 'repairs', label: 'Repairs & Maintenance' },
  { value: 'tax', label: 'Tax & Levies' },
  { value: 'other', label: 'Other' },
]

function printExpenses(expenses, profile) {
  const win = window.open('', '_blank')
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  win.document.write(`<html><head><title>Expense Report</title>
  <style>body{font-family:Arial,sans-serif;padding:24px;font-size:13px;color:#111}h1{font-size:18px;margin:0 0 4px}
  .meta{color:#666;margin-bottom:20px;font-size:12px}table{width:100%;border-collapse:collapse}
  th{background:#f3f4f6;text-align:left;padding:8px 10px;border-bottom:2px solid #e5e7eb;font-size:12px}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6}.total-row td{font-weight:600;border-top:2px solid #e5e7eb;background:#f9fafb}
  .amount{text-align:right;font-family:monospace}</style></head>
  <body><h1>${profile?.shop_name || '9jaTax'} — Expense Report</h1>
  <div class="meta">Printed ${format(new Date(), 'dd MMM yyyy, h:mm a')} · ${expenses.length} entries</div>
  <table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Vendor</th><th class="amount">Amount</th></tr></thead>
  <tbody>${expenses.map(e => `<tr><td>${formatDate(e.date)}</td><td>${e.description}</td>
  <td>${CATEGORIES.find(c => c.value === e.category)?.label || e.category}</td>
  <td>${e.vendor || '—'}</td><td class="amount">${formatCurrency(e.amount)}</td></tr>`).join('')}
  <tr class="total-row"><td colspan="4">Total</td><td class="amount">${formatCurrency(total)}</td></tr>
  </tbody></table></body></html>`)
  win.document.close(); win.print()
}

const empty = { description: '', category: 'other', amount: '', vendor: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' }

export default function Expenses() {
  const { user, profile } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setExpenses(data || []); setLoading(false)
  }

  function openNew() { setEditing(null); setForm(empty); setShowForm(true) }
  function openEdit(exp) { setEditing(exp); setForm({ ...exp }); setShowForm(true) }
  function close() { setShowForm(false); setEditing(null); setForm(empty) }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const payload = { ...form, amount: parseFloat(form.amount) || 0 }
    if (editing) await supabase.from('expenses').update(payload).eq('id', editing.id).eq('user_id', user.id)
    else await supabase.from('expenses').insert({ ...payload, user_id: user.id })
    await load(); close(); setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id).eq('user_id', user.id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || (e.vendor || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' || e.category === catFilter
    return matchSearch && matchCat
  })
  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0)

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-400">{expenses.length} entries · <span className="text-white font-semibold">{formatCurrency(total)}</span></p>
        <div className="flex gap-2">
          <button onClick={() => printExpenses(filtered, profile)}
            className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5 text-sm">
            <Printer size={15} /> Print
          </button>
          <button onClick={openNew} className="btn-primary text-sm px-3 py-2.5 flex items-center gap-1.5">
            <Plus size={15} /> Add expense
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..."
            className="w-full pl-10 pr-4 py-2.5 bg-navy-900 border border-navy-700 text-white placeholder-navy-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="bg-navy-900 border border-navy-700 text-navy-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="navy-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse bg-navy-700 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt size={32} className="text-navy-600 mx-auto mb-2" />
            <p className="text-sm text-navy-500">No expenses found</p>
            <button onClick={openNew} className="mt-3 text-sm text-emerald-400 hover:text-emerald-300">Add your first expense →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-navy-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-navy-400">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-navy-400">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 hidden md:table-cell">Vendor</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-navy-400">Amount</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(exp => (
                  <tr key={exp.id} onClick={() => openEdit(exp)} className="hover:bg-white/2 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-navy-400 whitespace-nowrap">{formatDate(exp.date)}</td>
                    <td className="px-4 py-3 font-medium text-white">{exp.description}</td>
                    <td className="px-4 py-3 text-navy-400 hidden sm:table-cell">{CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}</td>
                    <td className="px-4 py-3 text-navy-400 hidden md:table-cell">{exp.vendor || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-white">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); remove(exp.id) }} className="text-navy-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-navy-800/50 border-t border-white/10">
                  <td colSpan={4} className="px-4 py-3 text-sm font-medium text-navy-300">Total ({filtered.length} items)</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-white">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="font-semibold text-white">{editing ? 'Edit expense' : 'Add expense'}</h2>
              <button onClick={close} className="text-navy-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="label-dark">Description *</label>
                <input required value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="What was this for?" className="input-dark" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dark">Amount (₦) *</label>
                  <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="0" className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Date *</label>
                  <input required type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="input-dark" />
                </div>
              </div>
              <div>
                <label className="label-dark">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="input-dark bg-navy-900">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-dark">Vendor / Paid to</label>
                <input value={form.vendor} onChange={e => setForm(f => ({...f, vendor: e.target.value}))} placeholder="Who did you pay?" className="input-dark" />
              </div>
              <div>
                <label className="label-dark">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Any extra details..." className="input-dark resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={close} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Save changes' : 'Add expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
