import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Check, Bell, MessageSquare, Mail } from 'lucide-react'

export default function Settings() {
  const { profile, updateProfile, user } = useAuth()
  const [form, setForm] = useState({ shop_name: '', owner_name: '', phone: '', address: '', currency: 'NGN', whatsapp: '', summary_email: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) setForm({
      shop_name: profile.shop_name || '',
      owner_name: profile.owner_name || '',
      phone: profile.phone || '',
      address: profile.address || '',
      currency: profile.currency || 'NGN',
      whatsapp: profile.whatsapp || '',
      summary_email: profile.summary_email || '',
    })
  }, [profile])

  async function save(e) {
    e.preventDefault(); setSaving(true)
    await updateProfile(form)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const f = (field) => ({ value: form[field], onChange: e => setForm(p => ({ ...p, [field]: e.target.value })) })

  return (
    <div className="p-4 lg:p-6 max-w-xl space-y-5">

      {/* Shop profile */}
      <div className="navy-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white">Shop profile</h2>
          <p className="text-sm text-navy-400 mt-0.5">This info appears on your invoices and receipts</p>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          <div>
            <label className="label-dark">Shop name</label>
            <input {...f('shop_name')} placeholder="e.g. Ade's Grocery Store" className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Owner / Contact name</label>
            <input {...f('owner_name')} placeholder="Your name" className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Phone number</label>
            <input type="tel" {...f('phone')} placeholder="080x xxx xxxx" className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Shop address</label>
            <textarea {...f('address')} rows={2} placeholder="Shop address (appears on invoices)" className="input-dark resize-none" />
          </div>
          <div>
            <label className="label-dark">Currency</label>
            <select {...f('currency')} className="input-dark bg-navy-900">
              <option value="NGN">NGN — Nigerian Naira (₦)</option>
              <option value="GHS">GHS — Ghanaian Cedi (₵)</option>
              <option value="KES">KES — Kenyan Shilling (KSh)</option>
              <option value="ZAR">ZAR — South African Rand (R)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="GBP">GBP — British Pound (£)</option>
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full btn-primary py-3 disabled:opacity-50 flex items-center justify-center gap-2">
            {saved ? <><Check size={15} /> Saved!</> : saving ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      </div>

      {/* Daily summary */}
      <div className="navy-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white flex items-center gap-2"><Bell size={16} className="text-emerald-400" /> Daily summary</h2>
          <p className="text-sm text-navy-400 mt-0.5">Get your daily sales summary delivered automatically</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-dark flex items-center gap-1.5"><MessageSquare size={13} className="text-emerald-400" /> WhatsApp number</label>
            <input type="tel" {...f('whatsapp')} placeholder="+2348012345678 (with country code)" className="input-dark" />
            <p className="text-xs text-navy-500 mt-1">Include country code. You'll receive a daily summary message.</p>
          </div>
          <div>
            <label className="label-dark flex items-center gap-1.5"><Mail size={13} className="text-blue-400" /> Summary email</label>
            <input type="email" {...f('summary_email')} placeholder="your@email.com" className="input-dark" />
            <p className="text-xs text-navy-500 mt-1">Daily income, expenses and profit emailed at midnight.</p>
          </div>
          <div className="glass rounded-xl px-4 py-3 border border-amber-500/20">
            <p className="text-xs text-amber-400 font-medium mb-0.5">Coming soon</p>
            <p className="text-xs text-navy-400">Automatic WhatsApp and email summaries are being activated. Save your number now and you'll be first to receive it.</p>
          </div>
          <button onClick={save} disabled={saving} className="w-full btn-primary py-3 disabled:opacity-50 flex items-center justify-center gap-2">
            {saved ? <><Check size={15} /> Saved!</> : saving ? 'Saving...' : 'Save notification settings'}
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="navy-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white">Account</h2>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <p className="text-xs text-navy-500 mb-0.5">Email address</p>
            <p className="text-sm text-navy-200">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-navy-500 mb-0.5">Member since</p>
            <p className="text-sm text-navy-200">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-navy-600 pb-2">
        <p>9jaTax · A product of HSPR Technologies · v2.0.0</p>
      </div>
    </div>
  )
}
