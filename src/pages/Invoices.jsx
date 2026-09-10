import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency, formatDate, generateInvoiceNumber } from '@/lib/utils'
import { openPaymentModal, generateTxRef, generatePaymentLink } from '@/lib/flutterwave'
import { buildWhatsAppMessage, openWhatsApp, openWhatsAppShare } from '@/lib/whatsapp'
import { isAdmin, getActivePlan, LIMITS, canAccess } from '@/lib/planGate'
import { Plus, Search, Printer, X, Trash2, FileText, Link2, CreditCard, Copy, Check, Crown, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

// In-person payment modal
function CollectPaymentModal({ invoice, profile, onSuccess, onClose }) {
  const { user } = useAuth()
  const [paying, setPaying] = useState(false)
  const [customerEmail, setCustomerEmail] = useState(invoice.customer_name ? `${invoice.customer_name.toLowerCase().replace(/\s+/g,'.')}@customer.com` : '')

  async function handlePay() {
    setPaying(true)
    const txRef = generateTxRef('POS')
    try {
      await openPaymentModal({
        amount: invoice.total,
        currency: 'NGN',
        customerEmail,
        customerName: invoice.customer_name || 'Walk-in customer',
        txRef,
        description: `Payment for ${invoice.invoice_number}`,
        invoiceId: invoice.id,
        onSuccess: async (response) => {
          await supabase.from('payments').insert({
            user_id: user.id,
            invoice_id: invoice.id,
            flw_tx_id: String(response.transaction_id),
            flw_ref: response.flw_ref,
            tx_ref: txRef,
            amount: invoice.total,
            currency: 'NGN',
            status: 'successful',
            payment_type: response.payment_type,
            customer_email: customerEmail,
            customer_name: invoice.customer_name,
            meta: response,
          })
          await supabase.from('invoices').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', invoice.id)
          onSuccess && onSuccess()
          setPaying(false)
        },
        onClose: () => { setPaying(false) },
      })
    } catch { setPaying(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="modal-panel rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor:"rgba(255,255,255,0.08)"}}>
          <h2 className="font-semibold text-white flex items-center gap-2"><CreditCard size={16} className="text-green-bright" /> Collect payment</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="glass rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-white/40">Invoice</span><span className="text-white font-mono">{invoice.invoice_number}</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/40">Customer</span><span className="text-white">{invoice.customer_name || 'Walk-in'}</span></div>
            <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2 mt-2"><span className="text-white/60">Amount due</span><span className="text-green-bright">{formatCurrency(invoice.total)}</span></div>
          </div>
          <div>
            <label className="label-dark">Customer email (for receipt)</label>
            <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="customer@email.com" className="input-dark" />
          </div>
          <button onClick={handlePay} disabled={paying}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 glow-green-sm">
            {paying ? 'Opening payment...' : <><CreditCard size={16} /> Collect {formatCurrency(invoice.total)}</>}
          </button>
          <p className="text-xs text-white/30 text-center">Card -- Bank Transfer -- USSD -- Mobile Money</p>
        </div>
      </div>
    </div>
  )
}

// Payment link modal
function PaymentLinkModal({ invoice, onClose }) {
  const [copied, setCopied] = useState(false)
  const link = invoice.payment_token ? generatePaymentLink(invoice.payment_token) : null

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="modal-panel rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor:"rgba(255,255,255,0.08)"}}>
          <h2 className="font-semibold text-white flex items-center gap-2"><Link2 size={16} className="text-green-bright" /> Payment link</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-white/40 text-sm">Share this link with your customer. They can pay online with card or bank transfer.</p>
          {link ? (
            <div className="glass rounded-xl p-3 flex items-center gap-2 border border-emerald-500/20">
              <p className="text-xs text-green-bright font-mono flex-1 truncate">{link}</p>
              <button onClick={copyLink} className="shrink-0 text-green-bright hover:text-green-bright transition-colors">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-amber-400 glass rounded-xl p-3 border border-amber-500/20">
              Payment token not found. Re-save this invoice to generate a link.
            </p>
          )}
          <button onClick={copyLink} disabled={!link}
            className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
            {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy link</>}
          </button>
          <p className="text-xs text-white/30 text-center">Send via WhatsApp, SMS or email</p>
        </div>
      </div>
    </div>
  )
}

const STATUS_OPTS = ['draft','sent','paid','overdue','cancelled']
const STATUS_COLORS = {
  paid: 'bg-[#008751]/15 text-green-bright',
  sent: 'bg-blue-500/15 text-blue-400',
  draft: 'bg-gray-100 text-white/40',
  overdue: 'bg-red-500/15 text-red-400',
  cancelled: 'bg-gray-100 text-white/30',
}

function printInvoice(inv, items, profile) {
  const win = window.open('', '_blank')
  win.document.write(`
    <html><head><title>Invoice ${inv.invoice_number}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 40px; color: #111; font-size: 13px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
      .shop { font-size: 20px; font-weight: 700; color: #16a34a; }
      .inv-meta { text-align: right; }
      .inv-num { font-size: 16px; font-weight: 600; }
      .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${inv.status === 'paid' ? '#dcfce7' : '#fef9c3'}; color: ${inv.status === 'paid' ? '#15803d' : '#854d0e'}; }
      .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; padding: 16px; background: #f9fafb; border-radius: 8px; }
      .label { font-size: 11px; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }
      .val { font-weight: 500; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #f3f4f6; text-align: left; padding: 10px 12px; font-size: 11px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
      td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
      .num { text-align: right; font-family: monospace; }
      .totals { margin-left: auto; width: 240px; }
      .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
      .grand { font-weight: 700; font-size: 15px; padding-top: 10px; border-top: 2px solid #e5e7eb; border-bottom: none; }
      .notes { margin-top: 24px; padding: 12px 16px; background: #f9fafb; border-radius: 8px; font-size: 12px; color: #6b7280; }
      .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; }
    </style></head>
    <body>
    <div class="header">
      <div>
        <div class="shop">${profile?.shop_name || 'My Shop'}</div>
        ${profile?.phone ? `<div style="color:#6b7280;margin-top:4px">${profile.phone}</div>` : ''}
        ${profile?.address ? `<div style="color:#6b7280">${profile.address}</div>` : ''}
      </div>
      <div class="inv-meta">
        <div class="inv-num">Invoice ${inv.invoice_number}</div>
        <div style="color:#6b7280;margin:4px 0">Date: ${formatDate(inv.issue_date)}</div>
        ${inv.due_date ? `<div style="color:#6b7280">Due: ${formatDate(inv.due_date)}</div>` : ''}
        <div style="margin-top:8px"><span class="status">${inv.status}</span></div>
      </div>
    </div>
    <div class="parties">
      <div>
        <div class="label">Bill to</div>
        <div class="val">${inv.customer_name || 'Walk-in customer'}</div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Total</th>
      </tr></thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td>${it.description}</td>
            <td class="num">${it.qty}</td>
            <td class="num">${formatCurrency(it.unit_price)}</td>
            <td class="num">${formatCurrency(it.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>${formatCurrency(inv.subtotal)}</span></div>
      ${inv.tax_amount > 0 ? `<div class="total-row"><span>Tax (${inv.tax_rate}%)</span><span>${formatCurrency(inv.tax_amount)}</span></div>` : ''}
      <div class="total-row grand"><span>Total</span><span>${formatCurrency(inv.total)}</span></div>
    </div>
    ${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
    <div class="footer">Thank you for your business!</div>
    </body></html>
  `)
  win.document.close()
  win.print()
}

const emptyForm = () => ({
  invoice_number: generateInvoiceNumber(),
  customer_id: '',
  customer_name: '',
  status: 'draft',
  issue_date: format(new Date(), 'yyyy-MM-dd'),
  due_date: '',
  tax_rate: 0,
  notes: '',
})
const emptyItem = () => ({ description: '', qty: 1, unit_price: '', total: 0 })

export default function Invoices() {
  const { user, profile, subscription } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [collectModal, setCollectModal] = useState(null)
  const [linkModal, setLinkModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [items, setItems] = useState([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [limitError, setLimitError] = useState('')

  const admin = isAdmin(user?.email)
  const plan = getActivePlan(null, subscription)
  const monthlyLimit = admin ? null : (LIMITS[plan]?.invoices ?? 10)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const [invRes, custRes, prodRes] = await Promise.all([
      supabase.from('invoices').select('*, invoice_items(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name').eq('user_id', user.id).order('name'),
      supabase.from('products').select('id, name, selling_price').eq('user_id', user.id).eq('is_active', true),
    ])
    setInvoices(invRes.data || [])
    setCustomers(custRes.data || [])
    setProducts(prodRes.data || [])
    setLoading(false)
  }

  function openNew() {
    setLimitError('')
    // Count this month's invoices for limit check
    if (monthlyLimit !== null) {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthCount = invoices.filter(inv => inv.issue_date >= start).length
      if (monthCount >= monthlyLimit) {
        setLimitError(`You've reached your ${monthlyLimit} invoice/month limit on the free plan. Upgrade to Pro for unlimited invoices.`)
        return
      }
    }
    setEditing(null); setForm(emptyForm()); setItems([emptyItem()]); setShowForm(true)
  }

  function openEdit(inv) {
    setEditing(inv)
    setForm({
      invoice_number: inv.invoice_number,
      customer_id: inv.customer_id || '',
      customer_name: inv.customer_name || '',
      status: inv.status,
      issue_date: inv.issue_date,
      due_date: inv.due_date || '',
      tax_rate: inv.tax_rate || 0,
      notes: inv.notes || '',
    })
    setItems(inv.invoice_items?.length ? inv.invoice_items : [emptyItem()])
    setShowForm(true)
  }

  function close() { setShowForm(false); setEditing(null) }

  function updateItem(idx, field, val) {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      if (field === 'qty' || field === 'unit_price') {
        const qty = parseFloat(field === 'qty' ? val : next[idx].qty) || 0
        const price = parseFloat(field === 'unit_price' ? val : next[idx].unit_price) || 0
        next[idx].total = qty * price
      }
      return next
    })
  }

  function addItem() { setItems(p => [...p, emptyItem()]) }
  function removeItem(idx) { setItems(p => p.filter((_, i) => i !== idx)) }

  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0)
  const taxAmt = subtotal * (parseFloat(form.tax_rate) || 0) / 100
  const total = subtotal + taxAmt

  async function save(e) {
    e.preventDefault()
    setSaving(true)

    const invPayload = {
      invoice_number: form.invoice_number,
      customer_id: form.customer_id || null,  // null not empty string
      customer_name: form.customer_name || customers.find(c => c.id === form.customer_id)?.name || '',
      status: form.status,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      tax_rate: parseFloat(form.tax_rate) || 0,
      notes: form.notes || null,
      subtotal,
      tax_amount: taxAmt,
      total,
      updated_at: new Date().toISOString(),
    }

    const validItems = items.filter(i => i.description && i.description.trim())

    if (editing) {
      const { error } = await supabase.from('invoices').update(invPayload).eq('id', editing.id).eq('user_id', user.id)
      if (error) { console.error('Invoice update error:', error); setSaving(false); return }
      await supabase.from('invoice_items').delete().eq('invoice_id', editing.id)
      if (validItems.length) {
        await supabase.from('invoice_items').insert(
          validItems.map(i => ({
            invoice_id: editing.id,
            product_id: i.product_id || null,
            description: i.description,
            qty: parseFloat(i.qty) || 1,
            unit_price: parseFloat(i.unit_price) || 0,
            total: parseFloat(i.total) || 0,
          }))
        )
      }
    } else {
      const { data: inv, error } = await supabase
        .from('invoices')
        .insert({ ...invPayload, user_id: user.id })
        .select()
        .single()
      if (error) { console.error('Invoice insert error:', error); setSaving(false); return }
      if (inv && validItems.length) {
        await supabase.from('invoice_items').insert(
          validItems.map(i => ({
            invoice_id: inv.id,
            product_id: i.product_id || null,
            description: i.description,
            qty: parseFloat(i.qty) || 1,
            unit_price: parseFloat(i.unit_price) || 0,
            total: parseFloat(i.total) || 0,
          }))
        )
      }
    }

    await load()
    close()
    setSaving(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('invoices').update({ status }).eq('id', id).eq('user_id', user.id)
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv))
  }

  async function remove(id) {
    if (!confirm('Delete this invoice?')) return
    await supabase.from('invoices').delete().eq('id', id).eq('user_id', user.id)
    setInvoices(prev => prev.filter(inv => inv.id !== id))
  }

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) || inv.customer_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalValue = filtered.reduce((s, inv) => s + (inv.total || 0), 0)

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-4">
      {/* Limit error */}
      {limitError && (
        <div className="glass-card rounded-xl px-4 py-3 border border-amber-500/30 flex items-start gap-3">
          <Crown size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-300">{limitError}</p>
          </div>
          <Link to="/app/subscription" className="shrink-0 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
            Upgrade
          </Link>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-white/40">{invoices.length} invoices -- <span className="font-medium text-white/60">{formatCurrency(totalValue)}</span>
          {monthlyLimit && <span className="ml-2 text-white/30">-- {(() => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; const cnt = invoices.filter(i => i.issue_date >= start).length; return `${cnt}/${monthlyLimit} this month` })()}</span>}
        </p>
        <button onClick={openNew} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
          <Plus size={15} /> New invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..."
            className="w-full pl-9 pr-3 py-2 border border-white/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-black/30 text-white border-white/8" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...STATUS_OPTS].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                ${statusFilter === s ? 'bg-[#008751] text-white' : 'glass border border-white/10 text-white/40 hover:bg-black/30/50'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="navy-card white-top-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse bg-white/5 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={32} className="text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/30">No invoices found</p>
            <button onClick={openNew} className="mt-3 text-sm text-green-bright font-medium hover:underline">Create your first invoice ---</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-black/30/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Invoice #</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40 hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/40">Total</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-black/30/50">
                    <td className="px-4 py-3 font-mono text-xs text-white/40 cursor-pointer" onClick={() => openEdit(inv)}>{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-medium text-white cursor-pointer" onClick={() => openEdit(inv)}>{inv.customer_name || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-white/40 hidden sm:table-cell cursor-pointer" onClick={() => openEdit(inv)}>{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={inv.status}
                        onChange={e => updateStatus(inv.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:outline-none cursor-pointer ${STATUS_COLORS[inv.status]}`}
                      >
                        {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-white cursor-pointer" onClick={() => openEdit(inv)}>{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && canAccess('payment_links', { email: user?.email, subscription }).allowed && (
                          <button onClick={() => setCollectModal(inv)} title="Collect payment via Flutterwave"
                            className="text-white/30 hover:text-green-bright transition-colors"><CreditCard size={14} /></button>
                        )}
                        {canAccess('payment_links', { email: user?.email, subscription }).allowed && (
                          <button onClick={() => setLinkModal(inv)} title="Get payment link"
                            className="text-white/30 hover:text-blue-400 transition-colors"><Link2 size={14} /></button>
                        )}
                        <button onClick={() => printInvoice(inv, inv.invoice_items || [], profile)} className="text-white/30 hover:text-green-bright transition-colors"><Printer size={14} /></button>
                        <button onClick={() => {
                          const msg = buildWhatsAppMessage({ invoice: inv, items: inv.invoice_items || [], profile })
                          inv.customer_phone ? openWhatsApp(inv.customer_phone, msg) : openWhatsAppShare(msg)
                        }} title="Send via WhatsApp" className="text-white/30 hover:text-green-400 transition-colors">
                          <MessageCircle size={14} />
                        </button>
                        <button onClick={() => remove(inv.id)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="modal-panel rounded-2xl w-full max-w-2xl shadow-xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor:"rgba(255,255,255,0.08)"}}>
              <h2 className="font-semibold text-white">{editing ? 'Edit invoice' : 'New invoice'}</h2>
              <button onClick={close} className="text-white/30 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-5">
              {/* Top row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Invoice number</label>
                  <input value={form.invoice_number} onChange={e => setForm(f => ({...f, invoice_number: e.target.value}))} required
                    className="w-full border border-white/8 input-dark font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
                    className="w-full border border-white/8 input-dark bg-black/30">
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* Customer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Customer</label>
                  <select value={form.customer_id} onChange={e => { const c = customers.find(c => c.id === e.target.value); setForm(f => ({...f, customer_id: e.target.value, customer_name: c?.name || f.customer_name})) }}
                    className="w-full border border-white/8 input-dark bg-black/30">
                    <option value="">Walk-in / Enter below</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Customer name</label>
                  <input value={form.customer_name} onChange={e => setForm(f => ({...f, customer_name: e.target.value}))} placeholder="Or type a name"
                    className="input-dark" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Issue date</label>
                  <input type="date" value={form.issue_date} onChange={e => setForm(f => ({...f, issue_date: e.target.value}))} required
                    className="input-dark" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Due date (optional)</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))}
                    className="input-dark" />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white/60">Items</label>
                  <button type="button" onClick={addItem} className="text-xs text-green-bright font-medium hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-white/30 px-1">
                    <span className="col-span-5">Description</span>
                    <span className="col-span-2">Qty</span>
                    <span className="col-span-3">Unit price</span>
                    <span className="col-span-2 text-right">Total</span>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5 relative">
                        <input
                          list={`prod-list-${idx}`}
                          value={item.description}
                          onChange={e => {
                            const prod = products.find(p => p.name === e.target.value)
                            updateItem(idx, 'description', e.target.value)
                            if (prod) updateItem(idx, 'unit_price', prod.selling_price)
                          }}
                          placeholder="Item or service"
                          className="w-full border border-white/8 input-dark"
                        />
                        <datalist id={`prod-list-${idx}`}>
                          {products.map(p => <option key={p.id} value={p.name} />)}
                        </datalist>
                      </div>
                      <input type="number" min="0" step="0.01" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)}
                        className="col-span-2 border border-white/8 input-dark" />
                      <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                        placeholder="0"
                        className="col-span-3 border border-white/8 input-dark" />
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <span className="text-sm font-mono text-white/60">{formatCurrency(item.total)}</span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="text-white/20 hover:text-red-400 ml-1"><X size={13} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-white/5 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-white/40">
                  <span>Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">Tax (%)</span>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" max="100" step="0.5" value={form.tax_rate} onChange={e => setForm(f => ({...f, tax_rate: e.target.value}))}
                      className="w-16 border border-white/8 input-dark text-center" />
                    <span className="font-mono text-white/60">{formatCurrency(taxAmt)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-base font-semibold text-white pt-1 border-t border-white/5">
                  <span>Total</span><span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Payment instructions, thank you note..."
                  className="input-dark resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={close} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Save changes' : 'Create invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect payment modal */}
      {collectModal && (
        <CollectPaymentModal
          invoice={collectModal}
          profile={profile}
          onSuccess={() => {
            setCollectModal(null)
            load()
          }}
          onClose={() => setCollectModal(null)}
        />
      )}

      {/* Payment link modal */}
      {linkModal && (
        <PaymentLinkModal
          invoice={linkModal}
          onClose={() => setLinkModal(null)}
        />
      )}
    </div>
  )
}
