import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { isAdmin, getActivePlan, LIMITS } from '@/lib/planGate'
import { Plus, Search, X, Trash2, Package, AlertTriangle, Crown } from 'lucide-react'

const UNIT_GROUPS = [
  { group: 'Count', units: [
    { value: 'piece', label: 'Piece', symbol: 'pcs' },
    { value: 'dozen', label: 'Dozen', symbol: 'doz' },
    { value: 'pair', label: 'Pair', symbol: 'pr' },
    { value: 'set', label: 'Set', symbol: 'set' },
    { value: 'carton', label: 'Carton', symbol: 'ctn' },
    { value: 'pack', label: 'Pack', symbol: 'pk' },
    { value: 'bundle', label: 'Bundle', symbol: 'bndl' },
    { value: 'roll', label: 'Roll', symbol: 'roll' },
    { value: 'box', label: 'Box', symbol: 'box' },
    { value: 'sachet', label: 'Sachet', symbol: 'scht' },
  ]},
  { group: 'Weight', units: [
    { value: 'kg', label: 'Kilogram', symbol: 'kg' },
    { value: 'g', label: 'Gram', symbol: 'g' },
    { value: 'tonne', label: 'Tonne', symbol: 't' },
    { value: 'lb', label: 'Pound', symbol: 'lb' },
    { value: 'bag_50kg', label: 'Bag (50kg)', symbol: '50kg bag' },
    { value: 'bag_25kg', label: 'Bag (25kg)', symbol: '25kg bag' },
  ]},
  { group: 'Volume', units: [
    { value: 'litre', label: 'Litre', symbol: 'L' },
    { value: 'ml', label: 'Millilitre', symbol: 'mL' },
    { value: 'cl', label: 'Centilitre', symbol: 'cL' },
    { value: 'gallon', label: 'Gallon', symbol: 'gal' },
    { value: 'bottle', label: 'Bottle', symbol: 'btl' },
    { value: 'keg', label: 'Keg', symbol: 'keg' },
  ]},
  { group: 'Length / Area', units: [
    { value: 'metre', label: 'Metre', symbol: 'm' },
    { value: 'cm', label: 'Centimetre', symbol: 'cm' },
    { value: 'yard', label: 'Yard', symbol: 'yd' },
    { value: 'sqm', label: 'Sq. Metre', symbol: 'm--' },
    { value: 'sqft', label: 'Sq. Foot', symbol: 'ft--' },
  ]},
  { group: 'Services', units: [
    { value: 'hour', label: 'Hour', symbol: 'hr' },
    { value: 'day', label: 'Day', symbol: 'day' },
    { value: 'job', label: 'Job / Service', symbol: 'job' },
  ]},
]

const ALL_UNITS = UNIT_GROUPS.flatMap(g => g.units)
function getUnit(value) { return ALL_UNITS.find(u => u.value === value) || { value, label: value, symbol: value } }

function UnitSelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = getUnit(value)

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="input-dark text-left flex items-center justify-between w-full">
        <span>
          <span className="text-white">{selected.label}</span>
          <span className="text-white/40 ml-2 text-xs font-mono">({selected.symbol})</span>
        </span>
        <span className="text-white/30 text-xs ml-2">{open ? '---' : '---'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/4 border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto scrollbar-thin">
          {UNIT_GROUPS.map(group => (
            <div key={group.group}>
              <div className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider bg-black/30/80 sticky top-0 border-b" style={{borderColor:"rgba(255,255,255,0.08)"}}>
                {group.group}
              </div>
              {group.units.map(unit => (
                <button key={unit.value} type="button"
                  onClick={() => { onChange(unit.value); setOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors hover:bg-white/5
                    ${value === unit.value ? 'bg-[#008751]/15 text-green-bright' : 'text-white/75'}`}>
                  <span>{unit.label}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-lg ${value === unit.value ? 'bg-[#008751]/20 text-green-bright' : 'bg-white/5 text-white/40'}`}>
                    {unit.symbol}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const emptyForm = () => ({
  name: '', description: '', selling_price: '', cost_price: '',
  sku: '', unit: 'piece', unit_size: '', track_stock: false,
  stock_qty: 0, low_stock_alert: 5, is_active: true
})

export default function Inventory() {
  const { user, subscription } = useAuth()
  const admin = isAdmin(user?.email)
  const plan = getActivePlan(null, subscription)
  const prodLimit = admin ? null : (LIMITS[plan]?.products ?? 30)
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

  function openNew() {
    if (prodLimit !== null && products.length >= prodLimit) {
      alert(`You've reached your ${prodLimit} product limit on the free plan. Upgrade to Pro for unlimited products.`)
      return
    }
    setEditing(null); setForm(emptyForm()); setShowForm(true)
  }
  function openEdit(p) { setEditing(p); setForm({ ...p, selling_price: p.selling_price || '', cost_price: p.cost_price || '', unit_size: p.unit_size || '' }); setShowForm(true) }
  function close() { setShowForm(false); setEditing(null) }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const payload = {
      name: form.name,
      description: form.description || null,
      selling_price: parseFloat(form.selling_price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      sku: form.sku || null,
      unit: form.unit || 'piece',
      unit_size: form.unit_size || null,
      track_stock: form.track_stock,
      stock_qty: parseFloat(form.stock_qty) || 0,
      low_stock_alert: parseFloat(form.low_stock_alert) || 5,
      is_active: true,
    }
    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id).eq('user_id', user.id)
      if (error) { console.error('Product update error:', error); setSaving(false); return }
    } else {
      const { error } = await supabase.from('products').insert({ ...payload, user_id: user.id })
      if (error) { console.error('Product insert error:', error); setSaving(false); return }
    }
    await load(); close(); setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Remove this product?')) return
    await supabase.from('products').update({ is_active: false }).eq('id', id).eq('user_id', user.id)
    setProducts(p => p.filter(x => x.id !== id))
  }

  async function applyStock(e) {
    e.preventDefault()
    const qty = parseFloat(stockAdjust.qty); if (!qty) return
    const newQty = stockAdjust.type === 'in' ? stockModal.stock_qty + qty
      : stockAdjust.type === 'out' ? Math.max(0, stockModal.stock_qty - qty) : qty
    await supabase.from('products').update({ stock_qty: newQty }).eq('id', stockModal.id).eq('user_id', user.id)
    await supabase.from('stock_movements').insert({ user_id: user.id, product_id: stockModal.id, type: stockAdjust.type, qty, note: stockAdjust.note })
    setProducts(p => p.map(x => x.id === stockModal.id ? { ...x, stock_qty: newQty } : x))
    setStockModal(null); setStockAdjust({ type: 'in', qty: '', note: '' })
  }

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()))
  const lowStockCount = products.filter(p => p.track_stock && p.stock_qty <= p.low_stock_alert).length
  const totalValue = products.reduce((s, p) => s + (p.stock_qty * (p.cost_price || 0)), 0)

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card rounded-2xl p-4 border border-blue-500/20">
          <p className="text-xs text-white/40 mb-1">Total products</p>
          <p className="text-2xl font-bold text-white">{products.length}</p>
        </div>
        <div className="stat-card rounded-2xl p-4 border border-emerald-500/20">
          <p className="text-xs text-white/40 mb-1">Stock value</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalValue)}</p>
        </div>
        <div className={`stat-card rounded-2xl p-4 ${lowStockCount > 0 ? 'border border-amber-500/30' : 'border border-white/8'}`}>
          <p className="text-xs text-white/40 mb-1">Low stock</p>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>{lowStockCount}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/12 text-white placeholder-navy-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={openNew} className="btn-primary text-sm px-4 py-2.5 flex items-center gap-1.5 ml-auto">
          <Plus size={15} /> Add product
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-white/4 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="navy-card white-top-border rounded-2xl py-16 text-center">
          <Package size={32} className="text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/30">No products yet</p>
          <button onClick={openNew} className="mt-3 text-sm text-green-bright hover:text-green-bright">Add your first product ---</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(p => {
            const isLow = p.track_stock && p.stock_qty <= p.low_stock_alert
            const unit = getUnit(p.unit)
            return (
              <div key={p.id} className={`glass-card rounded-2xl p-4 hover:border-emerald-500/20 transition-all ${isLow ? 'border-amber-500/30' : 'border-white/5'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{p.name}</p>
                    {p.sku && <p className="text-xs text-white/30 font-mono">{p.sku}</p>}
                  </div>
                  {isLow && <AlertTriangle size={14} className="text-amber-400 shrink-0 ml-1 mt-0.5" />}
                </div>
                <p className="text-lg font-bold text-green-bright">{formatCurrency(p.selling_price)}</p>
                {p.cost_price > 0 && <p className="text-xs text-white/30">Cost: {formatCurrency(p.cost_price)}</p>}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-xs bg-white/5 text-white/60 px-2 py-0.5 rounded-full font-mono">{unit.symbol}</span>
                  {p.unit_size && <span className="text-xs text-white/40">{p.unit_size}</span>}
                </div>
                {p.track_stock && (
                  <div className={`mt-2 text-xs font-medium px-2 py-1 rounded-lg inline-flex items-center gap-1
                    ${isLow ? 'bg-amber-500/15 text-amber-400' : 'bg-[#008751]/10 text-green-bright'}`}>
                    {p.stock_qty} {unit.symbol} in stock
                  </div>
                )}
                <div className="mt-3 flex gap-1.5">
                  <button onClick={() => openEdit(p)} className="flex-1 text-xs border border-white/10 text-white/60 py-1.5 rounded-lg hover:bg-white/5 transition-colors">Edit</button>
                  {p.track_stock && (
                    <button onClick={() => { setStockModal(p); setStockAdjust({ type: 'in', qty: '', note: '' }) }}
                      className="flex-1 text-xs bg-[#008751]/10 text-green-bright py-1.5 rounded-lg hover:bg-[#008751]/20 transition-colors">Stock</button>
                  )}
                  <button onClick={() => remove(p.id)} className="p-1.5 text-white/20 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="modal-panel rounded-2xl w-full max-w-md shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor:"rgba(255,255,255,0.08)"}}>
              <h2 className="font-semibold text-white">{editing ? 'Edit product' : 'Add product'}</h2>
              <button onClick={close} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="label-dark">Product name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Indomie noodles" className="input-dark" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dark">Selling price (---)</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setForm(f => ({...f, selling_price: e.target.value}))} placeholder="0" className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Cost price (---)</label>
                  <input type="number" min="0" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({...f, cost_price: e.target.value}))} placeholder="0" className="input-dark" />
                </div>
              </div>

              {/* Unit dropdown */}
              <div>
                <label className="label-dark">Unit of measurement</label>
                <UnitSelector value={form.unit} onChange={val => setForm(f => ({...f, unit: val}))} />
                <p className="text-xs text-white/30 mt-1">How this product is measured or sold</p>
              </div>

              {/* Unit size / specification */}
              <div>
                <label className="label-dark">Size / Specification <span className="text-white/20 font-normal">(optional)</span></label>
                <input value={form.unit_size} onChange={e => setForm(f => ({...f, unit_size: e.target.value}))}
                  placeholder={
                    ['kg','g','tonne','lb'].includes(form.unit) ? 'e.g. 25kg per bag' :
                    ['litre','ml','bottle'].includes(form.unit) ? 'e.g. 1.5L per bottle' :
                    form.unit === 'carton' ? 'e.g. 12 units per carton' :
                    'e.g. size, weight, variant, colour'
                  }
                  className="input-dark" />
                <p className="text-xs text-white/30 mt-1">Shown on product card and invoice line items</p>
              </div>

              <div>
                <label className="label-dark">SKU / Product code <span className="text-white/20 font-normal">(optional)</span></label>
                <input value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} placeholder="e.g. NDL-001" className="input-dark" />
              </div>

              {/* Stock toggle */}
              <div className="flex items-center justify-between p-3 glass rounded-xl border border-white/5">
                <div>
                  <p className="text-sm font-medium text-white">Track stock quantity</p>
                  <p className="text-xs text-white/40">Get low-stock alerts</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({...f, track_stock: !f.track_stock}))}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.track_stock ? 'bg-[#008751]' : 'bg-navy-600'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.track_stock ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {form.track_stock && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-dark">Current stock <span className="text-white/30 font-mono text-xs">({getUnit(form.unit).symbol})</span></label>
                    <input type="number" min="0" step="0.01" value={form.stock_qty} onChange={e => setForm(f => ({...f, stock_qty: e.target.value}))} className="input-dark" />
                  </div>
                  <div>
                    <label className="label-dark">Alert below <span className="text-white/30 font-mono text-xs">({getUnit(form.unit).symbol})</span></label>
                    <input type="number" min="0" step="1" value={form.low_stock_alert} onChange={e => setForm(f => ({...f, low_stock_alert: e.target.value}))} className="input-dark" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={close} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
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
          <div className="modal-panel rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor:"rgba(255,255,255,0.08)"}}>
              <div>
                <h2 className="font-semibold text-white">Adjust stock</h2>
                <p className="text-xs text-white/40 mt-0.5">{stockModal.name} -- currently <span className="text-green-bright font-medium">{stockModal.stock_qty} {getUnit(stockModal.unit).symbol}</span></p>
              </div>
              <button onClick={() => setStockModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={applyStock} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[['in','Stock in'],['out','Stock out'],['adjustment','Set to']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setStockAdjust(s => ({...s, type: val}))}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-all
                      ${stockAdjust.type === val ? 'bg-[#008751]/20 border-emerald-500/40 text-green-bright' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <label className="label-dark">Quantity <span className="text-white/30 font-mono text-xs">({getUnit(stockModal.unit).symbol})</span></label>
                <div className="flex gap-2">
                  <input required type="number" min="0" step="0.01" value={stockAdjust.qty}
                    onChange={e => setStockAdjust(s => ({...s, qty: e.target.value}))} placeholder="0" className="input-dark flex-1" />
                  <span className="bg-white/4 border border-white/8 text-white/60 text-sm font-mono px-3 rounded-xl flex items-center">
                    {getUnit(stockModal.unit).symbol}
                  </span>
                </div>
              </div>

              {stockAdjust.qty && (
                <div className="glass rounded-xl px-4 py-2.5 flex items-center justify-between text-sm border border-emerald-500/20">
                  <span className="text-white/40">New quantity</span>
                  <span className="text-green-bright font-bold font-mono">
                    {stockAdjust.type === 'in'
                      ? (stockModal.stock_qty + parseFloat(stockAdjust.qty || 0)).toFixed(2)
                      : stockAdjust.type === 'out'
                      ? Math.max(0, stockModal.stock_qty - parseFloat(stockAdjust.qty || 0)).toFixed(2)
                      : parseFloat(stockAdjust.qty || 0).toFixed(2)
                    } {getUnit(stockModal.unit).symbol}
                  </span>
                </div>
              )}

              <div>
                <label className="label-dark">Note <span className="text-white/20 font-normal">(optional)</span></label>
                <input value={stockAdjust.note} onChange={e => setStockAdjust(s => ({...s, note: e.target.value}))} placeholder="Reason for adjustment" className="input-dark" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStockModal(null)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
