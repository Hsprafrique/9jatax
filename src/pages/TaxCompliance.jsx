import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import CoatOfArms from '@/components/CoatOfArms'
import { Shield, Plus, X, CheckCircle, AlertCircle, Clock, FileText, Info } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const TAX_TYPES = [
  { value: 'vat', label: 'VAT', desc: 'Value Added Tax', rate: 7.5, color: '#60A5FA', deadline: '21st monthly' },
  { value: 'wht', label: 'WHT', desc: 'Withholding Tax', rate: 5, color: '#FFB020', deadline: '21st monthly' },
  { value: 'paye', label: 'PAYE', desc: 'Pay As You Earn', rate: 7.5, color: '#A78BFA', deadline: '10th monthly' },
  { value: 'cit', label: 'CIT', desc: 'Company Income Tax', rate: 30, color: '#FF6B6B', deadline: 'June 30 annually' },
  { value: 'business_levy', label: 'Business Levy', desc: 'State/LGA levy', rate: 0, color: '#34D399', deadline: 'Annual' },
  { value: 'other', label: 'Other', desc: 'Other obligations', rate: 0, color: '#9CA3AF', deadline: 'Varies' },
]

const STATUS = {
  pending: { color: '#FFB020', bg: 'rgba(255,176,32,0.12)', icon: Clock, label: 'Pending' },
  filed: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', icon: FileText, label: 'Filed' },
  paid: { color: '#00C896', bg: 'rgba(0,200,150,0.12)', icon: CheckCircle, label: 'Paid' },
  overdue: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', icon: AlertCircle, label: 'Overdue' },
}

const empty = () => ({
  tax_type: 'vat', period_start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  period_end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  taxable_amount: '', tax_rate: 7.5, tax_amount: '', status: 'pending',
  filing_deadline: '', payment_ref: '', notes: '',
})

export default function TaxCompliance() {
  const { user, profile } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('overview')
  const [vatSummary, setVatSummary] = useState({ output: 0, input: 0, net: 0 })
  const [taxSettings, setTaxSettings] = useState({ tin: '', rc_number: '', vat_registered: false, vat_rate: 7.5, firs_email: '' })

  useEffect(() => { if (user) { load(); loadVAT() } }, [user])
  useEffect(() => {
    if (profile) setTaxSettings({ tin: profile.tin || '', rc_number: profile.rc_number || '', vat_registered: profile.vat_registered || false, vat_rate: profile.vat_rate || 7.5, firs_email: profile.firs_email || '' })
  }, [profile])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('tax_records').select('*').eq('user_id', user.id).order('period_start', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function loadVAT() {
    const now = new Date()
    const s = startOfMonth(now).toISOString().split('T')[0]
    const e = endOfMonth(now).toISOString().split('T')[0]
    const [invRes, expRes] = await Promise.all([
      supabase.from('invoices').select('total,tax_amount,status').eq('user_id', user.id).gte('issue_date', s).lte('issue_date', e),
      supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', s).lte('date', e),
    ])
    const output = (invRes.data || []).filter(i => i.status === 'paid').reduce((s, i) => s + (i.tax_amount || 0), 0)
    const totalExp = (expRes.data || []).reduce((s, e) => s + (e.amount || 0), 0)
    setVatSummary({ output, input: totalExp * 0.075, net: output - totalExp * 0.075 })
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('tax_records').insert({
      user_id: user.id, tax_type: form.tax_type, period_start: form.period_start,
      period_end: form.period_end, taxable_amount: parseFloat(form.taxable_amount) || 0,
      tax_rate: parseFloat(form.tax_rate) || 0, tax_amount: parseFloat(form.tax_amount) || 0,
      status: form.status, filing_deadline: form.filing_deadline || null,
      payment_ref: form.payment_ref || null, notes: form.notes || null,
    })
    if (error) { console.error(error); setSaving(false); return }
    await load(); setShowForm(false); setForm(empty()); setSaving(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('tax_records').update({ status, ...(status === 'filed' ? { filed_at: new Date().toISOString() } : {}) }).eq('id', id).eq('user_id', user.id)
    setRecords(p => p.map(r => r.id === id ? { ...r, status } : r))
  }

  const pending = records.filter(r => ['pending','overdue'].includes(r.status)).reduce((s, r) => s + (r.tax_amount || 0), 0)
  const paid = records.filter(r => r.status === 'paid').reduce((s, r) => s + (r.tax_amount || 0), 0)

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-5">

      {/* Header with Coat of Arms */}
      <div className="card p-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div style={{ position: 'absolute', right: -20, top: -20, transform: 'rotate(10deg)' }}>
            <CoatOfArms size={200} />
          </div>
        </div>
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <CoatOfArms size={56} />
            <div>
              <h2 className="text-xl font-bold text-white">Tax Compliance</h2>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Federal Inland Revenue Service (FIRS) -- Nigeria
              </p>
              {profile?.tin && (
                <p className="text-xs mt-1 font-mono" style={{ color: '#00C896' }}>TIN: {profile.tin}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(true)} className="btn-secondary text-sm px-3 py-2">Tax settings</button>
            <button onClick={() => { setForm(empty()); setShowForm(true) }} className="btn-primary text-sm px-3 py-2 flex items-center gap-1.5">
              <Plus size={14} /> Record tax
            </button>
          </div>
        </div>
        {!profile?.tin && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,176,32,0.1)', border: '1px solid rgba(255,176,32,0.2)' }}>
            <AlertCircle size={14} style={{ color: '#FFB020' }} className="shrink-0" />
            <p className="text-sm" style={{ color: '#FFB020' }}>Add your TIN and RC Number to stay FIRS compliant.</p>
            <button onClick={() => setShowSettings(true)} className="ml-auto text-xs underline" style={{ color: '#FFB020' }}>Add now</button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tax outstanding', value: formatCurrency(pending), color: '#FF6B6B' },
          { label: 'Total paid', value: formatCurrency(paid), color: '#00C896' },
          { label: 'Total records', value: records.length, color: 'white' },
        ].map(s => (
          <div key={s.label} className="stat-card p-4">
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {['overview','records','vat'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
            style={tab === t ? { background: '#008751', color: 'white' } : { color: 'rgba(255,255,255,0.4)' }}>
            {t === 'vat' ? 'VAT Summary' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {TAX_TYPES.map(tt => {
              const related = records.filter(r => r.tax_type === tt.value)
              const overdue = related.filter(r => r.status === 'overdue').length
              return (
                <div key={tt.value} className="card p-4" style={{ borderColor: `${tt.color}20` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ background: `${tt.color}15`, color: tt.color }}>{tt.label}</span>
                    {overdue > 0 && <span className="pill-red">{overdue} overdue</span>}
                  </div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{tt.desc}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Due: {tt.deadline}</p>
                  <p className="text-sm font-bold mt-2" style={{ color: tt.color }}>{related.length} record{related.length !== 1 ? 's' : ''}</p>
                </div>
              )
            })}
          </div>

          {/* FIRS Calendar */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <CoatOfArms size={32} />
              <h3 className="text-sm font-semibold text-white">FIRS Filing Calendar</h3>
            </div>
            <div className="space-y-0">
              {[
                { label: 'VAT Returns (Form 002)', deadline: '21st of every month', type: 'monthly' },
                { label: 'Withholding Tax (WHT)', deadline: '21st of every month', type: 'monthly' },
                { label: 'PAYE Remittance', deadline: '10th of every month', type: 'monthly' },
                { label: 'Annual Returns (CIT)', deadline: '30th June each year', type: 'annual' },
                { label: 'Audited Accounts', deadline: '30th June each year', type: 'annual' },
              ].map(item => (
                <div key={item.label} className="table-row flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Due: {item.deadline}</p>
                  </div>
                  <span className={item.type === 'monthly' ? 'pill-blue' : 'pill-amber'}>{item.type}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'records' && (
        <div className="card-dark rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}</div>
          ) : records.length === 0 ? (
            <div className="py-14 text-center">
              <Shield size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No tax records yet</p>
              <button onClick={() => setShowForm(true)} className="mt-3 text-sm" style={{ color: '#00C896' }}>Add your first record</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    {['Type','Period','Taxable','Tax amount','Status','Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => {
                    const tt = TAX_TYPES.find(t => t.value === r.tax_type) || TAX_TYPES[5]
                    const ss = STATUS[r.status] || STATUS.pending
                    const Icon = ss.icon
                    return (
                      <tr key={r.id} className="table-row">
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold px-2 py-1 rounded-lg"
                            style={{ background: `${tt.color}15`, color: tt.color }}>{tt.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {formatDate(r.period_start)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {formatCurrency(r.taxable_amount)}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white">{formatCurrency(r.tax_amount)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                            style={{ background: ss.bg, color: ss.color }}>
                            <Icon size={11} />{ss.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                            className="text-xs rounded-lg px-2 py-1 outline-none"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                            {['pending','filed','paid','overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'vat' && (
        <div className="space-y-4">
          <div className="card p-5 flex items-start gap-3">
            <CoatOfArms size={40} />
            <div>
              <p className="text-sm font-semibold text-white">VAT Summary --- {format(new Date(), 'MMMM yyyy')}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                VAT at {profile?.vat_rate || 7.5}% -- Output VAT is charged to customers -- Input VAT is estimated on expenses
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Output VAT (charged)', value: vatSummary.output, color: '#60A5FA', note: 'From paid invoices' },
              { label: 'Input VAT (estimated)', value: vatSummary.input, color: '#00C896', note: '7.5% on expenses' },
              { label: 'Net VAT payable', value: Math.max(0, vatSummary.net), color: vatSummary.net > 0 ? '#FF6B6B' : '#00C896', note: 'Due 21st next month' },
            ].map(s => (
              <div key={s.label} className="stat-card p-4">
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                <p className="text-xl font-bold" style={{ color: s.color }}>{formatCurrency(s.value)}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{s.note}</p>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">How to file VAT with FIRS TaxPro Max</h3>
            {[
              { n: 1, title: 'Login to TaxPro Max', desc: 'Visit taxpromax.firs.gov.ng and log in with your TIN' },
              { n: 2, title: 'Select VAT Return', desc: 'Navigate to Returns > VAT > Monthly VAT Return (Form 002)' },
              { n: 3, title: 'Enter your figures', desc: `Output VAT: ${formatCurrency(vatSummary.output)} -- Input VAT: ${formatCurrency(vatSummary.input)} -- Net: ${formatCurrency(Math.max(0, vatSummary.net))}` },
              { n: 4, title: 'Make payment', desc: 'Pay via Remita or bank before the 21st' },
            ].map(s => (
              <div key={s.n} className="flex gap-3 mb-4 last:mb-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                  style={{ background: 'linear-gradient(135deg, #008751, #006B40)' }}>{s.n}</div>
                <div>
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add tax modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="modal-panel rounded-2xl w-full max-w-md my-4">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="font-semibold text-white">Record tax obligation</h2>
              <button onClick={() => setShowForm(false)} style={{ color: 'rgba(255,255,255,0.3)' }}><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="label-dark">Tax type</label>
                <select value={form.tax_type} onChange={e => { const tt = TAX_TYPES.find(t => t.value === e.target.value); setForm(f => ({ ...f, tax_type: e.target.value, tax_rate: tt?.rate || 0 })) }} className="input-dark">
                  {TAX_TYPES.map(tt => <option key={tt.value} value={tt.value}>{tt.label} - {tt.desc}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label-dark">Period start</label><input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} className="input-dark" /></div>
                <div><label className="label-dark">Period end</label><input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} className="input-dark" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label-dark">Taxable amount</label><input type="number" value={form.taxable_amount} onChange={e => setForm(f => ({ ...f, taxable_amount: e.target.value }))} onBlur={() => setForm(f => ({ ...f, tax_amount: ((parseFloat(f.taxable_amount) || 0) * (parseFloat(f.tax_rate) || 0) / 100).toFixed(2) }))} placeholder="0" className="input-dark" /></div>
                <div><label className="label-dark">Rate (%)</label><input type="number" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} className="input-dark" /></div>
                <div><label className="label-dark">Tax amount</label><input type="number" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} className="input-dark" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label-dark">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-dark">
                    {['pending','filed','paid','overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="label-dark">Filing deadline</label><input type="date" value={form.filing_deadline} onChange={e => setForm(f => ({ ...f, filing_deadline: e.target.value }))} className="input-dark" /></div>
              </div>
              <div><label className="label-dark">Payment reference</label><input value={form.payment_ref} onChange={e => setForm(f => ({ ...f, payment_ref: e.target.value }))} placeholder="FIRS receipt number" className="input-dark" /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm">{saving ? 'Saving...' : 'Save record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="modal-panel rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="font-semibold text-white">Tax settings</h2>
              <button onClick={() => setShowSettings(false)} style={{ color: 'rgba(255,255,255,0.3)' }}><X size={18} /></button>
            </div>
            <form onSubmit={async e => { e.preventDefault(); setSaving(true); await supabase.from('profiles').update(taxSettings).eq('id', user.id); setSaving(false); setShowSettings(false) }} className="p-6 space-y-4">
              <div><label className="label-dark">TIN (Tax ID Number)</label><input value={taxSettings.tin} onChange={e => setTaxSettings(s => ({ ...s, tin: e.target.value }))} placeholder="e.g. 1234567890" className="input-dark" /></div>
              <div><label className="label-dark">CAC / RC Number</label><input value={taxSettings.rc_number} onChange={e => setTaxSettings(s => ({ ...s, rc_number: e.target.value }))} placeholder="e.g. RC 1234567" className="input-dark" /></div>
              <div><label className="label-dark">FIRS email</label><input type="email" value={taxSettings.firs_email} onChange={e => setTaxSettings(s => ({ ...s, firs_email: e.target.value }))} className="input-dark" /></div>
              <div><label className="label-dark">VAT rate (%)</label><input type="number" value={taxSettings.vat_rate} onChange={e => setTaxSettings(s => ({ ...s, vat_rate: parseFloat(e.target.value) }))} className="input-dark" /></div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div><p className="text-sm font-medium text-white">VAT registered</p><p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Show VAT on invoices</p></div>
                <button type="button" onClick={() => setTaxSettings(s => ({ ...s, vat_registered: !s.vat_registered }))}
                  className="w-11 h-6 rounded-full relative transition-colors"
                  style={{ background: taxSettings.vat_registered ? '#008751' : 'rgba(255,255,255,0.15)' }}>
                  <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: taxSettings.vat_registered ? '1.5rem' : '0.25rem' }} />
                </button>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowSettings(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
