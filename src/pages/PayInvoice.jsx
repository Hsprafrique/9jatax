import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { openPaymentModal, generateTxRef } from '@/lib/flutterwave'
import { CheckCircle, AlertCircle, Loader, CreditCard } from 'lucide-react'

export default function PayInvoice() {
  const { token } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  useEffect(() => { fetchInvoice() }, [token])

  async function fetchInvoice() {
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('payment_token', token)
      .single()

    if (invErr || !inv) { setError('Invoice not found or link has expired.'); setLoading(false); return }

    if (inv.status === 'paid') { setPaid(true); setInvoice(inv); setLoading(false); return }

    // Get shop profile
    const { data: prof } = await supabase.from('profiles').select('shop_name,owner_name,phone,address,logo_url').eq('id', inv.user_id).single()

    setInvoice(inv)
    setItems(inv.invoice_items || [])
    setProfile(prof)
    if (inv.customer_name) setCustomerName(inv.customer_name)
    setLoading(false)
  }

  async function handlePay(e) {
    e.preventDefault()
    if (!customerEmail) return
    setPaying(true)

    const txRef = generateTxRef('PAY')

    try {
      const result = await openPaymentModal({
        amount: invoice.total,
        currency: 'NGN',
        customerEmail,
        customerName,
        customerPhone,
        txRef,
        description: `Payment for ${invoice.invoice_number} --- ${profile?.shop_name || '9jaTax'}`,
        invoiceId: invoice.id,
        onSuccess: async (response) => {
          await supabase.from('payments').insert({
            user_id: invoice.user_id,
            invoice_id: invoice.id,
            flw_tx_id: String(response.transaction_id),
            flw_ref: response.flw_ref,
            tx_ref: txRef,
            amount: invoice.total,
            currency: 'NGN',
            status: 'successful',
            payment_type: response.payment_type,
            customer_email: customerEmail,
            customer_name: customerName,
            meta: response,
          })
          await supabase.from('invoices')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', invoice.id)
          setPaid(true)
          setPaying(false)
        },
        onClose: () => setPaying(false),
      })
      if (result && !result.success && !result.closed) {
        setPaying(false)
      }
    } catch (err) {
      setError('Payment failed to load. Check your internet and try again.')
      setPaying(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <img src="/logo.png" alt="9jaTax" className="h-10 w-auto animate-pulse" />
        <p className="text-white/40 text-sm">Loading invoice...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
        <h2 className="text-white font-semibold mb-2">Invoice not found</h2>
        <p className="text-white/40 text-sm">{error}</p>
      </div>
    </div>
  )

  if (paid) return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-[#008751]/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4 glow-green-sm">
          <CheckCircle size={32} className="text-green-bright" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Payment successful!</h2>
        <p className="text-white/40 text-sm mb-4">
          {invoice?.invoice_number} --- {profile?.shop_name || '9jaTax'}
        </p>
        <p className="text-2xl font-bold text-green-bright mb-6">{formatCurrency(invoice?.total)}</p>
        <p className="text-xs text-white/30">Thank you for your payment. A confirmation has been sent to the merchant.</p>
        <img src="/logo.png" alt="9jaTax" className="h-7 w-auto mx-auto mt-6 opacity-50" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-navy-950 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="9jaTax" className="h-9 w-auto mx-auto mb-4" />
          <h1 className="text-white font-bold text-xl">{profile?.shop_name || 'Invoice Payment'}</h1>
          {profile?.phone && <p className="text-white/40 text-sm">{profile.phone}</p>}
          {profile?.address && <p className="text-white/40 text-xs mt-0.5">{profile.address}</p>}
        </div>

        {/* Invoice summary */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-white/40 mb-0.5">Invoice</p>
              <p className="font-mono font-bold text-white">{invoice.invoice_number}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium
              ${invoice.status === 'paid' ? 'bg-[#008751]/15 text-green-bright' :
                invoice.status === 'overdue' ? 'bg-red-500/15 text-red-400' :
                'bg-blue-500/15 text-blue-400'}`}>
              {invoice.status}
            </span>
          </div>
          {invoice.customer_name && (
            <div className="mb-4 pb-4 border-b" style={{borderColor:"rgba(255,255,255,0.08)"}}>
              <p className="text-xs text-white/40 mb-0.5">Billed to</p>
              <p className="text-white font-medium text-sm">{invoice.customer_name}</p>
            </div>
          )}

          {/* Line items */}
          <div className="space-y-2 mb-4">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-white/75 truncate">{item.description}</p>
                  <p className="text-white/30 text-xs">Qty: {item.qty} -- {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="font-mono text-white ml-4">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <div className="flex justify-between text-sm text-white/40">
              <span>Subtotal</span><span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-sm text-white/40">
                <span>Tax ({invoice.tax_rate}%)</span><span className="font-mono">{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-white/10">
              <span>Total</span><span className="font-mono text-green-bright">{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {invoice.due_date && (
            <p className="text-xs text-white/30 mt-3">Due: {formatDate(invoice.due_date)}</p>
          )}
          {invoice.notes && (
            <p className="text-xs text-white/40 mt-2 italic">{invoice.notes}</p>
          )}
        </div>

        {/* Payment form */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-green-bright" /> Pay now
          </h2>
          <form onSubmit={handlePay} className="space-y-3">
            <div>
              <label className="label-dark">Your name</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Full name" className="input-dark" />
            </div>
            <div>
              <label className="label-dark">Email address *</label>
              <input type="email" required value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                placeholder="you@example.com" className="input-dark" />
              <p className="text-xs text-white/30 mt-1">Receipt will be sent here</p>
            </div>
            <div>
              <label className="label-dark">Phone number</label>
              <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                placeholder="080x xxx xxxx" className="input-dark" />
            </div>
            <button type="submit" disabled={paying || !customerEmail}
              className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base disabled:opacity-50 glow-green mt-2">
              {paying ? <><Loader size={18} className="animate-spin" /> Processing...</> : <>
                <CreditCard size={18} /> Pay {formatCurrency(invoice.total)}
              </>}
            </button>
          </form>
          <div className="flex items-center justify-center gap-2 mt-4">
            <img src="https://checkout.flutterwave.com/flutterwave-logo.svg" alt="Flutterwave" className="h-5 opacity-50" onError={e => e.target.style.display='none'} />
            <p className="text-xs text-white/20">Secured by Flutterwave -- Card, Bank Transfer, USSD</p>
          </div>
        </div>
      </div>
    </div>
  )
}
