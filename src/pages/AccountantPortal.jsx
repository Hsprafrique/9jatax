import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatDate } from '@/lib/utils'
import { UserCheck, Plus, X, Copy, Check, Mail, Shield, Eye, BarChart2, Trash2, RefreshCw } from 'lucide-react'

const ACCESS_LEVELS = [
  { value: 'read', label: 'Read only', desc: 'View invoices, expenses, transactions', icon: Eye },
  { value: 'reports', label: 'Reports', desc: 'View + download reports and P&L', icon: BarChart2 },
  { value: 'full', label: 'Full access', desc: 'View, edit, and manage records', icon: Shield },
]

export default function AccountantPortal() {
  const { user, profile } = useAuth()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ accountant_email: '', access_level: 'reports' })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(null)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('accountant_invites')
      .select('*')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
    setInvites(data || [])
    setLoading(false)
  }

  async function invite(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('accountant_invites').insert({
      owner_user_id: user.id,
      accountant_email: form.accountant_email.toLowerCase().trim(),
      access_level: form.access_level,
    })
    if (error) { console.error(error); setSaving(false); return }
    await load()
    setShowForm(false)
    setForm({ accountant_email: '', access_level: 'reports' })
    setSaving(false)
  }

  async function revoke(id) {
    if (!confirm('Revoke this accountant\'s access?')) return
    await supabase.from('accountant_invites').update({ status: 'revoked' }).eq('id', id).eq('owner_user_id', user.id)
    setInvites(p => p.map(i => i.id === id ? { ...i, status: 'revoked' } : i))
  }

  async function remove(id) {
    if (!confirm('Delete this invite?')) return
    await supabase.from('accountant_invites').delete().eq('id', id).eq('owner_user_id', user.id)
    setInvites(p => p.filter(i => i.id !== id))
  }

  function copyLink(token) {
    const link = `${window.location.origin}/accountant/${token}`
    navigator.clipboard.writeText(link)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const STATUS_STYLE = {
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    accepted: 'bg-[#008751]/15 text-green-bright border-emerald-500/20',
    revoked: 'bg-red-500/15 text-red-400 border-red-500/20',
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck size={18} className="text-green-bright" /> Accountant Portal
          </h2>
          <p className="text-sm text-white/40 mt-0.5">
            Invite your accountant or bookkeeper to access your 9jaTax data
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="btn-primary text-sm px-4 py-2.5 flex items-center gap-1.5">
          <Plus size={15} /> Invite accountant
        </button>
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { step: '1', icon: '----', title: 'Send invite', desc: 'Enter your accountant\'s email and choose their access level' },
          { step: '2', icon: '----', title: 'Share link', desc: 'Copy the access link and send it to your accountant via WhatsApp or email' },
          { step: '3', icon: '-------', title: 'They access', desc: 'Your accountant views your data --- you stay in control' },
        ].map(s => (
          <div key={s.step} className="modal-panel white-top-border rounded-2xl p-4 flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#008751]/15 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-green-bright shrink-0">
              {s.step}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{s.title}</p>
              <p className="text-xs text-white/40 mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Access levels */}
      <div className="modal-panel white-top-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Access levels explained</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {ACCESS_LEVELS.map(al => {
            const Icon = al.icon
            return (
              <div key={al.value} className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className="text-green-bright" />
                  <span className="text-sm font-medium text-white">{al.label}</span>
                </div>
                <p className="text-xs text-white/40">{al.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invites list */}
      <div className="navy-card white-top-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold text-white">Active invites</h3>
          <button onClick={load} className="text-white/30 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
          </div>
        ) : invites.length === 0 ? (
          <div className="py-14 text-center">
            <UserCheck size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No accountants invited yet</p>
            <button onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-green-bright hover:text-green-bright">
              Invite your accountant ---
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {invites.map(inv => {
              const al = ACCESS_LEVELS.find(a => a.value === inv.access_level)
              const Icon = al?.icon || Eye
              return (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-4 table-row-hover transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#008751]/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Mail size={15} className="text-green-bright" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{inv.accountant_email}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Icon size={10} /> {al?.label || inv.access_level}
                      </span>
                      <span className="text-xs text-white/25">-- {formatDate(inv.created_at)}</span>
                      {inv.accepted_at && <span className="text-xs text-white/25">-- Accepted {formatDate(inv.accepted_at)}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[inv.status] || ''}`}>
                    {inv.status}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {inv.status !== 'revoked' && (
                      <>
                        <button onClick={() => copyLink(inv.token)}
                          className="text-xs flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                          {copied === inv.token ? <Check size={12} /> : <Copy size={12} />}
                          {copied === inv.token ? 'Copied' : 'Copy link'}
                        </button>
                        <button onClick={() => revoke(inv.id)}
                          className="text-xs px-2 py-1.5 rounded-lg transition-colors"
                          style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)' }}>
                          Revoke
                        </button>
                      </>
                    )}
                    {inv.status === 'revoked' && (
                      <button onClick={() => remove(inv.id)}
                        className="text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="modal-panel rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="font-semibold text-white">Invite accountant</h2>
              <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={invite} className="p-6 space-y-4">
              <div>
                <label className="label-dark">Accountant's email address *</label>
                <input type="email" required value={form.accountant_email}
                  onChange={e => setForm(f => ({ ...f, accountant_email: e.target.value }))}
                  placeholder="accountant@example.com" className="input-dark" />
              </div>
              <div>
                <label className="label-dark">Access level</label>
                <div className="space-y-2">
                  {ACCESS_LEVELS.map(al => {
                    const Icon = al.icon
                    return (
                      <button key={al.value} type="button"
                        onClick={() => setForm(f => ({ ...f, access_level: al.value }))}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                        style={form.access_level === al.value
                          ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Icon size={16} className={form.access_level === al.value ? 'text-green-bright' : 'text-white/30'} />
                        <div>
                          <p className={`text-sm font-medium ${form.access_level === al.value ? 'text-green-bright' : 'text-white'}`}>{al.label}</p>
                          <p className="text-xs text-white/40">{al.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                  {saving ? 'Sending...' : 'Send invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
