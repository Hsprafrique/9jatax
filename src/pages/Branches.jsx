import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Plus, X, Trash2, GitBranch, MapPin, Phone, Star } from 'lucide-react'

const empty = () => ({ name: '', address: '', phone: '', is_default: false })

export default function Branches() {
  const { user } = useAuth()
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('branches').select('*').eq('user_id', user.id).order('created_at')
    setBranches(data || [])
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    if (form.is_default) {
      await supabase.from('branches').update({ is_default: false }).eq('user_id', user.id)
    }
    await supabase.from('branches').insert({ ...form, user_id: user.id })
    await load(); setShowForm(false); setForm(empty()); setSaving(false)
  }

  async function setDefault(id) {
    await supabase.from('branches').update({ is_default: false }).eq('user_id', user.id)
    await supabase.from('branches').update({ is_default: true }).eq('id', id).eq('user_id', user.id)
    await load()
  }

  async function remove(id) {
    if (!confirm('Delete this branch?')) return
    await supabase.from('branches').delete().eq('id', id).eq('user_id', user.id)
    setBranches(p => p.filter(b => b.id !== id))
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-400">{branches.length} branch{branches.length !== 1 ? 'es' : ''}</p>
        <button onClick={() => { setForm(empty()); setShowForm(true) }} className="btn-primary text-sm px-4 py-2.5 flex items-center gap-1.5">
          <Plus size={15} /> Add branch
        </button>
      </div>

      {/* Info banner */}
      <div className="glass rounded-xl px-4 py-3 border border-emerald-500/20 text-sm text-navy-300">
        <span className="text-emerald-400 font-medium">Multi-branch:</span> Add your shop locations here. When creating invoices or recording expenses, you can tag them to a specific branch for separate reporting.
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          [1,2].map(i => <div key={i} className="navy-card h-40 animate-pulse rounded-2xl" />)
        ) : branches.length === 0 ? (
          <div className="md:col-span-2 navy-card py-16 text-center rounded-2xl">
            <GitBranch size={32} className="text-navy-600 mx-auto mb-2" />
            <p className="text-sm text-navy-500">No branches yet</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-emerald-400 hover:text-emerald-300">Add your first branch →</button>
          </div>
        ) : (
          branches.map(b => (
            <div key={b.id} className={`navy-card rounded-2xl p-5 border ${b.is_default ? 'border-emerald-500/30' : 'border-white/5'} hover:border-emerald-500/20 transition-all`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{b.name}</h3>
                    {b.is_default && (
                      <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> Default
                      </span>
                    )}
                  </div>
                  {b.address && <p className="text-xs text-navy-400 mt-1 flex items-center gap-1"><MapPin size={10} />{b.address}</p>}
                  {b.phone && <p className="text-xs text-navy-400 mt-0.5 flex items-center gap-1"><Phone size={10} />{b.phone}</p>}
                </div>
                <button onClick={() => remove(b.id)} className="text-navy-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              {!b.is_default && (
                <button onClick={() => setDefault(b.id)} className="text-xs text-navy-400 hover:text-emerald-400 transition-colors flex items-center gap-1 mt-2">
                  <Star size={11} /> Set as default
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="font-semibold text-white">Add branch</h2>
              <button onClick={() => setShowForm(false)} className="text-navy-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="label-dark">Branch name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Lagos Island Branch" className="input-dark" />
              </div>
              <div>
                <label className="label-dark">Address</label>
                <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} placeholder="Branch address" className="input-dark" />
              </div>
              <div>
                <label className="label-dark">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="Branch contact number" className="input-dark" />
              </div>
              <div className="flex items-center justify-between p-3 glass rounded-xl border border-white/5">
                <div>
                  <p className="text-sm font-medium text-white">Set as default branch</p>
                  <p className="text-xs text-navy-400">New transactions tagged here by default</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({...f, is_default: !f.is_default}))}
                  className={`w-10 h-6 rounded-full transition-colors ${form.is_default ? 'bg-emerald-500' : 'bg-navy-600'}`}>
                  <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${form.is_default ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
