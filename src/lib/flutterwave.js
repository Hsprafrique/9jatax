// 9jaTax - Flutterwave Integration
const FLW_PUBLIC_KEY = import.meta.env.VITE_FLW_PUBLIC_KEY
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

export function generateTxRef(prefix = 'INV') {
  return `9jatax-${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`
}

export function generatePaymentLink(paymentToken) {
  return `${APP_URL}/pay/${paymentToken}`
}

function loadFLWScript() {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) { resolve(); return }
    const existing = document.querySelector('script[src*="checkout.flutterwave.com"]')
    if (existing) { existing.onload = resolve; return }
    const script = document.createElement('script')
    script.src = 'https://checkout.flutterwave.com/v3.js'
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Failed to load Flutterwave'))
    document.head.appendChild(script)
  })
}

export async function openPaymentModal({
  amount, currency = 'NGN', customerEmail, customerName,
  customerPhone = '', txRef, description, invoiceId, onSuccess, onClose,
}) {
  if (!FLW_PUBLIC_KEY || FLW_PUBLIC_KEY === 'undefined') {
    alert('Flutterwave public key is missing. Add VITE_FLW_PUBLIC_KEY to your .env file and restart the server.')
    onClose && onClose()
    return { success: false }
  }
  try {
    await loadFLWScript()
  } catch {
    alert('Could not load Flutterwave. Check your internet connection.')
    onClose && onClose()
    return { success: false }
  }
  if (!window.FlutterwaveCheckout) {
    alert('Flutterwave failed to initialize. Try refreshing the page.')
    onClose && onClose()
    return { success: false }
  }
  return new Promise((resolve) => {
    window.FlutterwaveCheckout({
      public_key: FLW_PUBLIC_KEY,
      tx_ref: txRef || generateTxRef(),
      amount: Number(amount),
      currency,
      payment_options: 'card, banktransfer, ussd, mobilemoney, account',
      customer: {
        email: customerEmail || 'customer@9jatax.com',
        phone_number: customerPhone,
        name: customerName || 'Customer',
      },
      customizations: {
        title: '9jaTax',
        description: description || 'Invoice Payment',
        logo: `${APP_URL}/logo.png`,
      },
      meta: { invoice_id: invoiceId || null, source: '9jatax' },
      callback: (response) => {
        if (response.status === 'successful' || response.status === 'completed') {
          onSuccess && onSuccess(response)
          resolve({ success: true, response })
        } else {
          resolve({ success: false, response })
        }
      },
      onclose: () => {
        onClose && onClose()
        resolve({ success: false, closed: true })
      },
    })
  })
}

export const PLANS = {
  free: {
    name: 'Free', price: 0, currency: 'NGN',
    features: ['10 invoices/month','30 products','20 customers','Expense tracking','Inventory','Staff & debt tracker','Print invoices'],
  },
  pro: {
    name: 'Pro', price: 5000, currency: 'NGN', period: 'month',
    features: ['Unlimited invoices','Unlimited products','Unlimited customers','Flutterwave payment links','In-person card collection','Daily WhatsApp summaries','Advanced reports & CSV export','Priority support'],
  },
  business: {
    name: 'Business', price: 12000, currency: 'NGN', period: 'month',
    features: ['Everything in Pro','Unlimited branches','Unlimited staff','Custom invoice branding','Dedicated account manager'],
  },
}

export async function initiateSubscription({ plan, user, profile, onSuccess, onClose }) {
  const planConfig = PLANS[plan]
  if (!planConfig || planConfig.price === 0) return
  const txRef = generateTxRef('SUB')
  return openPaymentModal({
    amount: planConfig.price,
    currency: planConfig.currency,
    customerEmail: user.email,
    customerName: profile?.owner_name || profile?.shop_name || 'User',
    txRef,
    description: `9jaTax ${planConfig.name} Plan - Monthly`,
    onSuccess: (response) => onSuccess && onSuccess({ ...response, txRef, plan }),
    onClose,
  })
}
