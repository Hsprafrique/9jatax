import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, X, Trash2, UserCheck, Phone, DollarSign, CheckCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const emptyStaff = () => ({ name: '', role: 'staff', phone: '', email: '', salary: '', salary_type: 'monthly', hire_date: format(new Date(), 'yyyy-MM-dd') })

export default function Staff() {
  const { user } = useAuth()
  const [staff, setStaff] = useState([])
  const [payroll, setPayroll] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('staff')
  const [showForm, setShowForm] = useState(false)
  const [showPayroll, setShowPayroll] = useState(null)
  const [form, setForm] = useState(emptyStaff())
  const [payrollForm, setPayrollForm] = useState({ bonuses: '0', deductions: '0', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const [staffRes, payRes] = await Promise.all([
      supabase.from('staff').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
      supabase.from('payroll').select('*, staff(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])
    setStaff(staffRes.data || [])
    setPayroll(payRes.data || [])
    setLoading(false)
  }

  async function saveStaff(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('staff').insert({ ...form, salary: parseFloat(form.salary) || 0, user_id: user.id })
    await load(); setShowForm(false); setForm(emptyStaff()); setSaving(false)
  }

  async function processPayroll(e) {
    e.preventDefault(); setSaving(true)
    const base = showPayroll.salary
    const bonuses = parseFloat(payrollForm.bonuses) || 0
    const deductions = parseFloat(payrollForm.deductions) || 0
    const net_pay = base + bonuses - deductions
    const now = new Date()
    await supabase.from('payroll').insert({
      user_id: user.id,
      staff_id: showPayroll.id,
      period_start: startOfMonth(now).toISOString().split('T')[0],
      period_end: endOfMonth(now).toISOString().split('T')[0],
      base_salary: base,
      bonuses, deductions, net_pay,
      status: 'paid',
      paid_at: new Date().toISOString(),
      notes: payrollForm.notes,
    })
    await load(); setShowPayroll(null); setPayrollForm({ bonuses: '0', deductions: '0', notes: '' }); setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Remove this staff member?')) return
    await supabase.from('staff').update({ is_active: false }).eq('id', id).eq('user_id', user.id)
    setStaff(p => p.filter(s => s.id !== id))
  }

  const totalPayroll = staff.reduce((s, m) => s + (m.salary || 0), 0)

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card rounded-2xl p-4 border border-blue-500/20">
          <p className="text-xs text-navy-400 mb-1">Active staff</p>
          <p className="text-2xl font-bold text-white">{staff.length}</p>
        </div>
        <div className="stat-card rounded-2xl p-4 border border-emerald-500/20">
          <p className="text-xs text-navy-400 mb-1">Monthly payroll</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalPayroll)}</p>
        </div>
        <div className="stat-card rounded-2xl p-4 border border-navy-600">
          <p className="text-xs text-navy-400 mb-1">Payroll records</p>
          <p className="text-2xl font-bold text-white">{payroll.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 glass rounded-xl p-1">
          <button onClick={() => setTab('staff')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'staff' ? 'bg-emerald-500 text-white' : 'text-navy-400 hover:text-white'}`}>Staff</button>
          <button onClick={() => setTab('payroll')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'payroll' ? 'bg-emerald-500 text-white' : 'text-navy-400 hover:text-white'}`}>Payroll history</button>
        </div>
        {tab === 'staff' && (
          <button onClick={() => { setForm(emptyStaff()); setShowForm(true) }} className="btn-primary text-sm px-4 py-2.5 flex items-center gap-1.5">
            <Plus size={15} /> Add staff
          </button>
        )}
      </div>

      {/* Staff list */}
      {tab === 'staff' && (
        <div className="navy-card">
          {loading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-navy-700 rounded-xl" />)}</div>
          ) : staff.length === 0 ? (
            <div className="py-14 text-center">
              <UserCheck size={32} className="text-navy-600 mx-auto mb-2" />
              <p className="text-sm text-navy-500">No staff members yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {staff.map(s => (
                <div key={s.id} className="flex items-center px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0 mr-3">
                    <span className="text-emerald-400 font-bold text-sm">{s.name[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{s.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-navy-500 capitalize">{s.role}</span>
                      {s.phone && <span className="text-xs text-navy-500 flex items-center gap-1"><Phone size={10} />{s.phone}</span>}
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <p className="font-mono font-semibold text-white text-sm">{formatCurrency(s.salary)}</p>
                    <p className="text-xs text-navy-500 capitalize">/{s.salary_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowPayroll(s)}
                      className="text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 px-2.5 py-1.5 rounded-lg transition-colors">
                      Pay
                    </button>
                    <button onClick={() => remove(s.id)} className="text-navy-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payroll history */}
      {tab === 'payroll' && (
        <div className="navy-card">
          {payroll.length === 0 ? (
            <div className="py-14 text-center">
              <DollarSign size={32} className="text-navy-600 mx-auto mb-2" />
              <p className="text-sm text-navy-500">No payroll records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-navy-800/50">
                    <th className="text-left px-5 py-3 text-xs font-medium text-navy-400">Staff</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-navy-400 hidden sm:table-cell">Period</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-navy-400">Base</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-navy-400 hidden md:table-cell">Bonus</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-navy-400 hidden md:table-cell">Deduct</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-navy-400">Net pay</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-navy-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payroll.map(p => (
                    <tr key={p.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 font-medium text-white">{p.staff?.name || '—'}</td>
                      <td className="px-5 py-3 text-navy-400 hidden sm:table-cell text-xs">{formatDate(p.period_start)} – {formatDate(p.period_end)}</td>
                      <td className="px-5 py-3 text-right font-mono text-navy-300">{formatCurrency(p.base_salary)}</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-400 hidden md:table-cell">+{formatCurrency(p.bonuses)}</td>
                      <td className="px-5 py-3 text-right font-mono text-red-400 hidden md:table-cell">-{formatCurrency(p.deductions)}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-white">{formatCurrency(p.net_pay)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add staff modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="font-semibold text-white">Add staff member</h2>
              <button onClick={() => setShowForm(false)} className="text-navy-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={saveStaff} className="p-6 space-y-4">
              <div>
                <label className="label-dark">Full name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Staff member name" className="input-dark" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dark">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} className="input-dark bg-navy-900">
                    {['staff','manager','cashier','driver','security','cleaner','other'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="080x..." className="input-dark" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dark">Salary (₦)</label>
                  <input type="number" min="0" value={form.salary} onChange={e => setForm(f => ({...f, salary: e.target.value}))} placeholder="0" className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Pay frequency</label>
                  <select value={form.salary_type} onChange={e => setForm(f => ({...f, salary_type: e.target.value}))} className="input-dark bg-navy-900">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-dark">Hire date</label>
                <input type="date" value={form.hire_date} onChange={e => setForm(f => ({...f, hire_date: e.target.value}))} className="input-dark" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process payroll modal */}
      {showPayroll && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="font-semibold text-white">Process payment</h2>
              <button onClick={() => setShowPayroll(null)} className="text-navy-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={processPayroll} className="p-6 space-y-4">
              <div className="glass rounded-xl p-3 text-sm space-y-1">
                <p className="text-navy-400">Staff: <span className="text-white font-medium">{showPayroll.name}</span></p>
                <p className="text-navy-400">Base salary: <span className="text-emerald-400 font-bold">{formatCurrency(showPayroll.salary)}/{showPayroll.salary_type}</span></p>
                <p className="text-navy-400">Period: <span className="text-white">{format(startOfMonth(new Date()), 'MMM d')} – {format(endOfMonth(new Date()), 'MMM d, yyyy')}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dark">Bonus (₦)</label>
                  <input type="number" min="0" value={payrollForm.bonuses} onChange={e => setPayrollForm(f => ({...f, bonuses: e.target.value}))} className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Deductions (₦)</label>
                  <input type="number" min="0" value={payrollForm.deductions} onChange={e => setPayrollForm(f => ({...f, deductions: e.target.value}))} className="input-dark" />
                </div>
              </div>
              <div className="glass rounded-xl p-3 flex justify-between items-center">
                <span className="text-navy-400 text-sm">Net pay</span>
                <span className="text-emerald-400 font-bold text-lg font-mono">
                  {formatCurrency((showPayroll.salary) + (parseFloat(payrollForm.bonuses)||0) - (parseFloat(payrollForm.deductions)||0))}
                </span>
              </div>
              <div>
                <label className="label-dark">Notes</label>
                <input value={payrollForm.notes} onChange={e => setPayrollForm(f => ({...f, notes: e.target.value}))} placeholder="Optional" className="input-dark" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowPayroll(null)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                  {saving ? 'Processing...' : 'Confirm & pay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
