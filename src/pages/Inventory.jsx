import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, X, Trash2, Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'

const UNITS = ['piece','kg','litre','carton','bag','bottle','roll','dozen','pack','metre','set']

const emptyForm = () => ({
  name: '', description: '', selling_price: '', cost_price: '',
  sku: '', unit: 'piece', track_stock: false, stock_qty: 0,
  low_stock_alert: 5, is_active: true
})

export default function Inventory() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [stockModal, setStockModal] = useState(null)
  const [stockAdjust, setStockAdjust] = useState({ type: 'in', qty: '', note: '' })

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').eq('user_id', user.id).eq('is_active', true).order('name')
    setProducts(data || [])
    setLoading(false)
  }

  function openNew() { setEditing(null); setForm(emptyForm()); setShowForm(true) }
  function openEdit(p) { setEditing(p); setForm({ ...p, selling_price: p.selling_price || '', cost_price: p.cost_price || '' }); setShowForm(true) }
  function close() { setShowForm(false); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      selling_price: parseFloat(form.selling_price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      stock_qty: parseFloat(form.stock_qty) || 0,
      low_stock_alert: parseFloat(form.low_stock_alert) || 5,
    }
    if (editing) {
      await supabase.from('products').update(payload).eq('id', editing.id).eq('user_id', user.id)
    } else {
      await supabase.from('products').insert({ ...payload, user_id: user.id })
    }
    await load()
    close()
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Remove this product?')) return
    await supabase.from('products').update({ is_active: false }).eq('id', id).eq('user_id', user.id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function applyStockAdjust(e) {
    e.preventDefault()
    const qty = parseFloat(stockAdjust.qty)
    if (!qty) return

    const newQty = stockAdjust.type === 'in'
      ? stockModal.stock_qty + qty
      : stockAdjust.type === 'out'
      ? Math.max(0, stockModal.stock_qty - qty)
      : qty

    await supabase.from('products').update({ stock_qty: newQty }).eq('id', stockModal.id).eq('user_id', user.id)
    await supabase.from('stock_movements').insert({
      user_id: user.id,
      product_id: stockModal.id,
      type: stockAdjust.type,
      qty,
      note: stockAdjust.note,
    })

    setProducts(prev => prev.map(p => p.id === stockModal.id ? { ...p, stock_qty: newQty } : p))
    setStockModal(null)
    setStockAdjust({ type: 'in', qty: '', note: '' })
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = products.filter(p => p.track_stock && p.stock_qty <= p.low_stock_alert).length
  const totalValue = products.reduce((s, p) => s + (p.stock_qty * p.cost_price), 0)

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="navy-card rounded-2xl p-4">
          <p className="text-xs text-navy-400 mb-1">Total products</p>
          <p className="text-xl font-semibold text-white">{products.length}</p>
        </div>
        <div className="navy-card rounded-2xl p-4">
          <p className="text-xs text-navy-400 mb-1">Stock value</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(totalValue)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${lowStockCount > 0 ? 'bg-amber-50 border-amber-500/30' : 'bg-white border-white/5'}`}>
          <p className="text-xs text-navy-400 mb-1">Low stock</p>
          <p className={`text-xl font-semibold ${lowStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>{lowStockCount}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 border border-navy-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-emerald-600 transition-colors ml-3">
          <Plus size={15} /> Add product
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-36 navy-card rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="navy-card rounded-2xl py-16 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-navy-500">No products yet</p>
          <button onClick={openNew} className="mt-3 text-sm text-emerald-400 font-medium hover:underline">Add your first product →</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(p => {
            const isLow = p.track_stock && p.stock_qty <= p.low_stock_alert
            return (
              <div key={p.id} className={`glass-card rounded-2xl p-4 cursor-pointer hover:border-emerald-500/20 transition-all ${isLow ? 'border-amber-500/30' : 'border-white/5'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate text-sm">{p.name}</p>
                    {p.sku && <p className="text-xs text-navy-500 font-mono">{p.sku}</p>}
                  </div>
                  {isLow && <AlertTriangle size={14} className="text-amber-500 shrink-0 ml-1" />}
                </div>

                <p className="text-lg font-semibold text-emerald-400">{formatCurrency(p.selling_price)}</p>
                {p.cost_price > 0 && <p className="text-xs text-navy-500">Cost: {formatCurrency(p.cost_price)}</p>}

                {p.track_stock && (
                  <div className={`mt-2 text-xs font-medium px-2 py-1 rounded-lg inline-block ${isLow ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {p.stock_qty} {p.unit} in stock
                  </div>
                )}

                <div className="mt-3 flex gap-1.5">
                  <button onClick={() => openEdit(p)} className="flex-1 text-xs border border-white/5 text-gray-600 py-1.5 rounded-lg hover:bg-navy-900/50">Edit</button>
                  {p.track_stock && (
                    <button onClick={() => { setStockModal(p); setStockAdjust({ type: 'in', qty: '', note: '' }) }}
                      className="flex-1 text-xs bg-brand-50 text-brand-700 py-1.5 rounded-lg hover:bg-brand-100">Stock</button>
                  )}
                  <button onClick={() => remove(p.id)} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md shadow-xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="font-semibold text-white">{editing ? 'Edit product' : 'Add product'}</h2>
              <button onClick={close} className="text-navy-500 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Product name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Indomie noodles (carton)"
                  className="input-dark" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Selling price (₦)</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setForm(f => ({...f, selling_price: e.target.value}))} placeholder="0"
                    className="input-dark" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Cost price (₦)</label>
                  <input type="number" min="0" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({...f, cost_price: e.target.value}))} placeholder="0"
                    className="input-dark" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">SKU / Code</label>
                  <input value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} placeholder="Optional"
                    className="input-dark" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}
                    className="w-full border border-navy-700 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Track stock toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-900/50 border border-white/5">
                <div>
                  <p className="text-sm font-medium text-navy-300">Track stock quantity</p>
                  <p className="text-xs text-navy-500">Get low-stock alerts</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({...f, track_stock: !f.track_stock}))}
                  className={`w-10 h-6 rounded-full transition-colors ${form.track_stock ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${form.track_stock ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {form.track_stock && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-1">Current stock</label>
                    <input type="number" min="0" step="0.01" value={form.stock_qty} onChange={e => setForm(f => ({...f, stock_qty: e.target.value}))}
                      className="input-dark" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-1">Low stock alert at</label>
                    <input type="number" min="0" step="1" value={form.low_stock_alert} onChange={e => setForm(f => ({...f, low_stock_alert: e.target.value}))}
                      className="input-dark" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={close} className="flex-1 border border-navy-700 text-navy-300 font-medium py-2 rounded-lg text-sm hover:bg-navy-900/50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Save changes' : 'Add product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock adjustment modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h2 className="font-semibold text-white">Adjust stock</h2>
                <p className="text-xs text-navy-500 mt-0.5">{stockModal.name} · currently {stockModal.stock_qty} {stockModal.unit}</p>
              </div>
              <button onClick={() => setStockModal(null)} className="text-navy-500 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={applyStockAdjust} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[['in','Stock in'],['out','Stock out'],['adjustment','Set to']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setStockAdjust(s => ({...s, type: val}))}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors
                      ${stockAdjust.type === val ? 'bg-emerald-500 text-white border-brand-600' : 'border-navy-700 text-gray-600 hover:bg-navy-900/50'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Quantity</label>
                <input type="number" required min="0" step="0.01" value={stockAdjust.qty} onChange={e => setStockAdjust(s => ({...s, qty: e.target.value}))}
                  placeholder="How many?"
                  className="input-dark" />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Note (optional)</label>
                <input value={stockAdjust.note} onChange={e => setStockAdjust(s => ({...s, note: e.target.value}))}
                  placeholder="Why the adjustment?"
                  className="input-dark" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStockModal(null)} className="flex-1 border border-navy-700 text-navy-300 font-medium py-2 rounded-lg text-sm hover:bg-navy-900/50">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm hover:bg-emerald-600">Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
