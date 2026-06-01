import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Plus, Search, X, Trash2, Users, Phone, Mail } from 'lucide-react'

const emptyForm = () => ({ name: '', phone: '', email: '', address: '' })

export default function Customers() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').eq('user_id', user.id).order('name')
    setCustomers(data || [])
    setLoading(false)
  }

  function openNew() { setEditing(null); setForm(emptyForm()); setShowForm(true) }
  function openEdit(c) { setEditing(c); setForm({ ...c }); setShowForm(true) }
  function close() { setShowForm(false); setEditing(null) }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    if (editing) await supabase.from('customers').update(form).eq('id', editing.id).eq('user_id', user.id)
    else await supabase.from('customers').insert({ ...form, user_id: user.id })
    await load(); close(); setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Delete this customer?')) return
    await supabase.from('customers').delete().eq('id', id).eq('user_id', user.id)
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) || (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-400">{customers.length} customers</p>
        <button onClick={openNew} className="btn-primary text-sm px-4 py-2.5 flex items-center gap-1.5">
          <Plus size={15} /> Add customer
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
          className="w-full pl-10 pr-4 py-2.5 bg-navy-900 border border-navy-700 text-white placeholder-navy-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      <div className="navy-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-navy-700 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="text-navy-600 mx-auto mb-2" />
            <p className="text-sm text-navy-500">No customers yet</p>
            <button onClick={openNew} className="mt-3 text-sm text-emerald-400 hover:text-emerald-300">Add your first customer →</button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(c => (
              <div key={c.id} onClick={() => openEdit(c)} className="flex items-center px-4 py-3.5 hover:bg-white/2 cursor-pointer gap-3 transition-colors">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 font-bold text-sm">{c.name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{c.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.phone && <span className="text-xs text-navy-400 flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                    {c.email && <span className="text-xs text-navy-400 flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); remove(c.id) }} className="text-navy-600 hover:text-red-400 transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="font-semibold text-white">{editing ? 'Edit customer' : 'Add customer'}</h2>
              <button onClick={close} className="text-navy-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="label-dark">Full name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Customer name" className="input-dark" />
              </div>
              <div>
                <label className="label-dark">Phone number</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="080x xxx xxxx" className="input-dark" />
              </div>
              <div>
                <label className="label-dark">Email address</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="Optional" className="input-dark" />
              </div>
              <div>
                <label className="label-dark">Address</label>
                <textarea value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} rows={2} placeholder="Optional" className="input-dark resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={close} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Save' : 'Add customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
