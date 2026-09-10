// ---------------------------------------------------------------------------------------------------------------------------
// 9jaTax --- WhatsApp Invoice Sender
// Uses WhatsApp Web API (wa.me) --- no extra API needed
// ---------------------------------------------------------------------------------------------------------------------------

import { generatePaymentLink } from '@/lib/flutterwave'
import { formatCurrency, formatDate } from '@/lib/utils'

export function buildWhatsAppMessage({ invoice, items = [], profile, includePaymentLink = true }) {
  const shopName = profile?.shop_name || '9jaTax'
  const phone = profile?.phone || ''
  const paymentLink = invoice.payment_token ? generatePaymentLink(invoice.payment_token) : null

  const itemLines = items.length > 0
    ? items.map(i => `  --- ${i.description} -- ${i.qty} = ${formatCurrency(i.total)}`).join('\n')
    : ''

  const message = [
    `*Invoice from ${shopName}*`,
    `---------------------------------------------------`,
    `---- Invoice: *${invoice.invoice_number}*`,
    `---- Date: ${formatDate(invoice.issue_date)}`,
    invoice.due_date ? `--- Due: ${formatDate(invoice.due_date)}` : null,
    ``,
    itemLines ? `*Items:*\n${itemLines}\n` : null,
    `---------------------------------------------------`,
    invoice.subtotal !== invoice.total ? `Subtotal: ${formatCurrency(invoice.subtotal)}` : null,
    invoice.tax_amount > 0 ? `VAT (${invoice.tax_rate}%): ${formatCurrency(invoice.tax_amount)}` : null,
    `*Total: ${formatCurrency(invoice.total)}*`,
    ``,
    includePaymentLink && paymentLink
      ? [`---- *Pay online:*`, paymentLink].join('\n')
      : null,
    ``,
    phone ? `---- ${phone}` : null,
    `_Powered by 9jaTax_`,
  ].filter(line => line !== null).join('\n')

  return message
}

export function openWhatsApp(phone, message) {
  // Clean phone number
  let cleaned = phone.replace(/\D/g, '')
  // Add Nigeria country code if not present
  if (cleaned.startsWith('0')) cleaned = '234' + cleaned.slice(1)
  if (!cleaned.startsWith('234') && cleaned.length === 10) cleaned = '234' + cleaned

  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

export function openWhatsAppShare(message) {
  // Share without a specific number (user picks contact)
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}
