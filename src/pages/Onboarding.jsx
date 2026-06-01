import React, { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowRight, ArrowLeft, Building2, MapPin, Phone, User, Briefcase } from 'lucide-react'

const BUSINESS_TYPES = [
  { value: 'provisions', label: 'Provisions / Grocery', icon: '🛒' },
  { value: 'fashion', label: 'Fashion / Clothing', icon: '👗' },
  { value: 'electronics', label: 'Electronics', icon: '📱' },
  { value: 'food', label: 'Food / Restaurant', icon: '🍽️' },
  { value: 'pharmacy', label: 'Pharmacy / Chemist', icon: '💊' },
  { value: 'hardware', label: 'Hardware / Building', icon: '🔨' },
  { value: 'beauty', label: 'Beauty / Cosmetics', icon: '💄' },
  { value: 'auto', label: 'Auto Parts / Mechanic', icon: '🚗' },
  { value: 'printing', label: 'Printing / Stationery', icon: '🖨️' },
  { value: 'agriculture', label: 'Agriculture / Farm', icon: '🌾' },
  { value: 'services', label: 'Services / Consulting', icon: '💼' },
  { value: 'other', label: 'Other Business', icon: '🏪' },
]

const STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT - Abuja','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
  'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau',
  'Rivers','Sokoto','Taraba','Yobe','Zamfara'
]

const STEPS = ['Business type', 'Shop details', 'Contact info', 'All set!']

export default function Onboarding() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    business_type: '',
    shop_name: '',
    owner_name: '',
    address: '',
    state: '',
    phone: '',
    currency: 'NGN',
  })

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function finish() {
    setSaving(true)
    await updateProfile({ ...form, onboarding_done: true })
    navigate('/app')
  }

  function canNext() {
    if (step === 0) return !!form.business_type
    if (step === 1) return form.shop_name.trim().length > 0
    if (step === 2) return form.phone.trim().length > 0
    return true
  }

  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center p-4">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="9jaTax" className="h-10 w-auto" />
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i < step ? 'bg-emerald-500 text-white' :
                    i === step ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' :
                    'bg-navy-800 border border-white/10 text-navy-500'}`}>
                  {i < step ? <CheckCircle size={14} /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-1 transition-all ${i < step ? 'bg-emerald-500' : 'bg-white/10'}`}
                    style={{ width: '40px' }} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {STEPS.map((s, i) => (
              <span key={s} className={`text-xs ${i === step ? 'text-emerald-400 font-medium' : 'text-navy-500'}`}
                style={{ width: '80px', textAlign: i === 0 ? 'left' : i === STEPS.length - 1 ? 'right' : 'center' }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-6 lg:p-8">

          {/* STEP 0 — Business type */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">What type of business do you run?</h2>
              <p className="text-navy-400 text-sm mb-6">We'll set up 9jaTax to match your business</p>
              <div className="grid grid-cols-3 gap-2">
                {BUSINESS_TYPES.map(bt => (
                  <button key={bt.value} type="button"
                    onClick={() => set('business_type', bt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all
                      ${form.business_type === bt.value
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                        : 'border-white/10 text-navy-400 hover:border-white/20 hover:text-white bg-white/2'
                      }`}>
                    <span className="text-xl">{bt.icon}</span>
                    <span className="text-xs font-medium leading-tight">{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 — Shop details */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Tell us about your shop</h2>
              <p className="text-navy-400 text-sm mb-6">This appears on your invoices and receipts</p>
              <div className="space-y-4">
                <div>
                  <label className="label-dark flex items-center gap-1.5">
                    <Building2 size={13} className="text-emerald-400" /> Shop / Business name *
                  </label>
                  <input
                    value={form.shop_name}
                    onChange={e => set('shop_name', e.target.value)}
                    placeholder="e.g. Ade's Grocery Store"
                    className="input-dark"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label-dark flex items-center gap-1.5">
                    <User size={13} className="text-emerald-400" /> Your name
                  </label>
                  <input
                    value={form.owner_name}
                    onChange={e => set('owner_name', e.target.value)}
                    placeholder="Owner / Manager name"
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="label-dark flex items-center gap-1.5">
                    <MapPin size={13} className="text-emerald-400" /> State
                  </label>
                  <select value={form.state} onChange={e => set('state', e.target.value)} className="input-dark bg-navy-900">
                    <option value="">Select your state</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Shop address</label>
                  <textarea
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="Full shop address"
                    rows={2}
                    className="input-dark resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Contact + currency */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Contact & currency</h2>
              <p className="text-navy-400 text-sm mb-6">How customers reach you, and your preferred currency</p>
              <div className="space-y-4">
                <div>
                  <label className="label-dark flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-400" /> Phone number *
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="080x xxx xxxx"
                    className="input-dark"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label-dark">Currency</label>
                  <select value={form.currency} onChange={e => set('currency', e.target.value)} className="input-dark bg-navy-900">
                    <option value="NGN">NGN — Nigerian Naira (₦)</option>
                    <option value="GHS">GHS — Ghanaian Cedi (₵)</option>
                    <option value="KES">KES — Kenyan Shilling (KSh)</option>
                    <option value="ZAR">ZAR — South African Rand (R)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>

                {/* Summary preview */}
                <div className="glass rounded-xl p-4 border border-emerald-500/20 mt-2">
                  <p className="text-xs text-navy-400 mb-3 font-medium uppercase tracking-wide">Your invoice header preview</p>
                  <p className="font-bold text-white">{form.shop_name || 'Your Shop Name'}</p>
                  {form.owner_name && <p className="text-sm text-navy-300">{form.owner_name}</p>}
                  {form.phone && <p className="text-sm text-navy-400">{form.phone}</p>}
                  {form.address && <p className="text-sm text-navy-400 mt-0.5">{form.address}</p>}
                  {form.state && <p className="text-sm text-navy-400">{form.state}, Nigeria</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Done */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-5 glow-green-sm">
                <CheckCircle size={36} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">You're all set! 🎉</h2>
              <p className="text-navy-400 mb-2">
                Welcome to 9jaTax, <span className="text-white font-medium">{form.owner_name || form.shop_name}</span>.
              </p>
              <p className="text-navy-500 text-sm mb-6">
                Your account is ready. Start by adding your first product or creating an invoice.
              </p>
              <div className="glass rounded-xl p-4 text-left space-y-2 mb-6">
                <p className="text-xs text-navy-400 font-medium uppercase tracking-wide mb-2">What's next</p>
                {[
                  { icon: '📦', text: 'Add your products to inventory' },
                  { icon: '📄', text: 'Create your first invoice' },
                  { icon: '🧾', text: 'Log your expenses' },
                  { icon: '👥', text: 'Add your staff members' },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-2.5 text-sm text-navy-300">
                    <span>{item.icon}</span> {item.text}
                  </div>
                ))}
              </div>
              <button onClick={finish} disabled={saving}
                className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 glow-green">
                {saving ? 'Setting up...' : <>Go to my dashboard <ArrowRight size={18} /></>}
              </button>
            </div>
          )}

          {/* Navigation buttons */}
          {step < 3 && (
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)}
                  className="btn-secondary flex items-center gap-1.5 px-4 py-2.5 text-sm">
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              <button
                onClick={() => step === 2 ? setStep(3) : setStep(s => s + 1)}
                disabled={!canNext()}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm disabled:opacity-40">
                {step === 2 ? 'Finish setup' : 'Continue'} <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-navy-600 mt-5">
          © {new Date().getFullYear()} 9jaTax · HSPR Technologies
        </p>
      </div>
    </div>
  )
}
