import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, X, Trash2, CreditCard, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

const empty = () => ({ type: 'owed_to_me', party_name: '', party_phone: '', amount: '', description: '', due_date: '' })

export default function Debts() {
  const { user } = useAuth()
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('owed_to_me')
  const [showForm, setShowForm] = useState(false)
  const [showPayment, setShowPayment] = useState(null)
  const [form, setForm] = useState(empty())
  const [payAmt, setPayAmt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('debts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setDebts(data || [])
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('debts').insert({ ...form, amount: parseFloat(form.amount), user_id: user.id })
    await load(); setShowForm(false); setForm(empty()); setSaving(false)
  }

  async function recordPayment(e) {
    e.preventDefault(); setSaving(true)
    const amt = parseFloat(payAmt)
    const newPaid = (showPayment.amount_paid || 0) + amt
    const status = newPaid >= showPayment.amount ? 'settled' : newPaid > 0 ? 'partial' : 'active'
    await supabase.from('debts').update({ amount_paid: newPaid, status, updated_at: new Date().toISOString() }).eq('id', showPayment.id).eq('user_id', user.id)
    await supabase.from('debt_payments').insert({ debt_id: showPayment.id, amount: amt })
    await load(); setShowPayment(null); setPayAmt(''); setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Delete this debt record?')) return
    await supabase.from('debts').delete().eq('id', id).eq('user_id', user.id)
    setDebts(p => p.filter(d => d.id !== id))
  }

  const filtered = debts.filter(d => d.type === tab)
  const totalActive = filtered.filter(d => d.status !== 'settled').reduce((s, d) => s + (d.amount - (d.amount_paid || 0)), 0)
  const totalSettled = filtered.filter(d => d.status === 'settled').length

  const statusColor = { active: 'bg-red-500/15 text-red-400', partial: 'bg-amber-500/15 text-amber-400', settled: 'bg-emerald-500/15 text-emerald-400' }

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card rounded-2xl p-4 border border-red-500/20">
          <p className="text-xs text-navy-400 mb-1">{tab === 'owed_to_me' ? 'People owe you' : 'You owe'}</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalActive)}</p>
        </div>
        <div className="stat-card rounded-2xl p-4 border border-emerald-500/20">
          <p className="text-xs text-navy-400 mb-1">Settled</p>
          <p className="text-xl font-bold text-emerald-400">{totalSettled}</p>
        </div>
        <div className="stat-card rounded-2xl p-4 border border-navy-600">
          <p className="text-xs text-navy-400 mb-1">Total records</p>
          <p className="text-xl font-bold text-white">{filtered.length}</p>
        </div>
      </div>

      {/* Tabs + header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 glass rounded-xl p-1">
          <button onClick={() => setTab('owed_to_me')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'owed_to_me' ? 'bg-emerald-500 text-white' : 'text-navy-400 hover:text-white'}`}>
            Owed to me
          </button>
          <button onClick={() => setTab('i_owe')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'i_owe' ? 'bg-red-500 text-white' : 'text-navy-400 hover:text-white'}`}>
            I owe
          </button>
        </div>
        <button onClick={() => { setForm({ ...empty(), type: tab }); setShowForm(true) }}
          className="btn-primary text-sm px-4 py-2.5 flex items-center gap-1.5">
          <Plus size={15} /> Add debt
        </button>
      </div>

      {/* List */}
      <div className="navy-card">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-navy-700 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <CreditCard size={32} className="text-navy-600 mx-auto mb-2" />
            <p className="text-sm text-navy-500">No {tab === 'owed_to_me' ? 'debts owed to you' : 'debts you owe'}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(d => {
              const remaining = d.amount - (d.amount_paid || 0)
              return (
                <div key={d.id} className="flex items-center px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-white text-sm">{d.party_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[d.status]}`}>{d.status}</span>
                    </div>
                    {d.description && <p className="text-xs text-navy-400 truncate">{d.description}</p>}
                    {d.due_date && <p className="text-xs text-navy-500 mt-0.5">Due: {formatDate(d.due_date)}</p>}
                  </div>
                  <div className="text-right mr-4">
                    <p className="font-mono font-bold text-white text-sm">{formatCurrency(remaining)}</p>
                    {d.amount_paid > 0 && <p className="text-xs text-navy-500">of {formatCurrency(d.amount)}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {d.status !== 'settled' && (
                      <button onClick={() => { setShowPayment(d); setPayAmt('') }}
                        className="text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 px-2.5 py-1.5 rounded-lg transition-colors">
                        Pay
                      </button>
                    )}
                    <button onClick={() => remove(d.id)} className="text-navy-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add debt modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="font-semibold text-white">Add debt record</h2>
              <button onClick={() => setShowForm(false)} className="text-navy-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm(f => ({...f, type: 'owed_to_me'}))}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${form.type === 'owed_to_me' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-white/10 text-navy-400 hover:border-white/20'}`}>
                  Owed to me
                </button>
                <button type="button" onClick={() => setForm(f => ({...f, type: 'i_owe'}))}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${form.type === 'i_owe' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'border-white/10 text-navy-400 hover:border-white/20'}`}>
                  I owe
                </button>
              </div>
              <div>
                <label className="label-dark">Person / Business name *</label>
                <input required value={form.party_name} onChange={e => setForm(f => ({...f, party_name: e.target.value}))} placeholder="Who owes / who you owe" className="input-dark" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dark">Amount (₦) *</label>
                  <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="0" className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Due date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} className="input-dark" />
                </div>
              </div>
              <div>
                <label className="label-dark">Phone number</label>
                <input type="tel" value={form.party_phone} onChange={e => setForm(f => ({...f, party_phone: e.target.value}))} placeholder="Optional" className="input-dark" />
              </div>
              <div>
                <label className="label-dark">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="What is this debt for?" className="input-dark" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add debt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="font-semibold text-white">Record payment</h2>
              <button onClick={() => setShowPayment(null)} className="text-navy-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={recordPayment} className="p-6 space-y-4">
              <div className="glass rounded-xl p-3 text-sm">
                <p className="text-navy-400">Party: <span className="text-white font-medium">{showPayment.party_name}</span></p>
                <p className="text-navy-400 mt-1">Remaining: <span className="text-emerald-400 font-bold">{formatCurrency(showPayment.amount - (showPayment.amount_paid || 0))}</span></p>
              </div>
              <div>
                <label className="label-dark">Payment amount (₦) *</label>
                <input required type="number" min="0.01" step="0.01" value={payAmt} onChange={e => setPayAmt(e.target.value)}
                  max={showPayment.amount - (showPayment.amount_paid || 0)} placeholder="0" className="input-dark" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowPayment(null)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Record payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
