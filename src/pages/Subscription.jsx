import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { PLANS, initiateSubscription } from '@/lib/flutterwave'
import { CheckCircle, Zap, Crown, Building2, Loader } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const PLAN_ICONS = { free: Zap, pro: Crown, business: Building2 }
const PLAN_COLORS = {
  free: 'border-white/10',
  pro: 'border-emerald-500/50 glow-green-sm',
  business: 'border-amber-500/30',
}
const PLAN_BADGE = {
  free: null,
  pro: { label: 'Most popular', color: 'bg-[#008751]/15 text-green-bright border-emerald-500/30' },
  business: { label: 'Best value', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
}

export default function Subscription() {
  const { user, profile, refreshSubscription } = useAuth()
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(null)

  useEffect(() => { if (user) fetchSub() }, [user])

  async function fetchSub() {
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
    setSub(data)
    setLoading(false)
  }

  async function handleUpgrade(plan) {
    setUpgrading(plan)
    try {
      await initiateSubscription({
        plan,
        user,
        profile,
        onSuccess: async (response) => {
          const expires = new Date()
          expires.setMonth(expires.getMonth() + 1)

          await supabase.from('subscriptions').upsert({
            user_id: user.id,
            plan,
            status: 'active',
            flw_tx_id: String(response.transaction_id),
            amount_paid: PLANS[plan].price,
            started_at: new Date().toISOString(),
            expires_at: expires.toISOString(),
          })

          await supabase.from('payments').insert({
            user_id: user.id,
            flw_tx_id: String(response.transaction_id),
            flw_ref: response.flw_ref,
            tx_ref: response.txRef,
            amount: PLANS[plan].price,
            currency: 'NGN',
            status: 'successful',
            payment_type: response.payment_type,
            customer_email: user.email,
            meta: response,
          })

          await fetchSub()
          await refreshSubscription()
          setUpgrading(null)
        },
        onClose: () => setUpgrading(null),
      })
    } catch (err) {
      console.error('Upgrade error:', err)
      setUpgrading(null)
    }
  }

  const currentPlan = sub?.plan || 'free'
  const isExpired = sub?.expires_at && new Date(sub.expires_at) < new Date()

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-6">
      {/* Current plan banner */}
      {sub && sub.plan !== 'free' && (
        <div className={`glass-card rounded-2xl p-5 border ${isExpired ? 'border-red-500/30' : 'border-emerald-500/30'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 mb-1">Current plan</p>
              <p className="font-bold text-white text-lg capitalize">{sub.plan} Plan</p>
              {sub.expires_at && (
                <p className={`text-xs mt-0.5 ${isExpired ? 'text-red-400' : 'text-white/40'}`}>
                  {isExpired ? '------ Expired' : '--- Active'} -- {isExpired ? 'Expired' : 'Renews'} {formatDate(sub.expires_at)}
                </p>
              )}
            </div>
            {isExpired && (
              <button onClick={() => handleUpgrade(sub.plan)} className="btn-primary text-sm px-4 py-2">
                Renew now
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-white mb-1">Choose your plan</h2>
        <p className="text-white/40 text-sm">Upgrade to unlock more features for your business</p>
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(PLANS).map(([key, plan]) => {
          const Icon = PLAN_ICONS[key]
          const badge = PLAN_BADGE[key]
          const isCurrent = currentPlan === key && !isExpired
          const isUpgrading = upgrading === key

          return (
            <div key={key} className={`glass-card rounded-2xl p-6 border flex flex-col ${PLAN_COLORS[key]} relative`}>
              {badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full border ${badge.color}`}>
                  {badge.label}
                </div>
              )}

              <div className="mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3
                  ${key === 'free' ? 'bg-white/5' : key === 'pro' ? 'bg-[#008751]/15' : 'bg-amber-500/15'}`}>
                  <Icon size={20} className={key === 'free' ? 'text-white/40' : key === 'pro' ? 'text-green-bright' : 'text-amber-400'} />
                </div>
                <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  {plan.price === 0 ? (
                    <span className="text-2xl font-bold text-white">Free</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-white">---{plan.price.toLocaleString()}</span>
                      <span className="text-white/40 text-sm">/{plan.period}</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle size={14} className={`mt-0.5 shrink-0 ${key === 'pro' ? 'text-green-bright' : key === 'business' ? 'text-amber-400' : 'text-white/30'}`} />
                    <span className="text-white/60">{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full text-center py-2.5 rounded-xl text-sm font-medium bg-[#008751]/10 text-green-bright border border-emerald-500/20">
                  --- Current plan
                </div>
              ) : key === 'free' ? (
                <div className="w-full text-center py-2.5 rounded-xl text-sm font-medium border border-white/10 text-white/30">
                  Downgrade
                </div>
              ) : (
                <button onClick={() => handleUpgrade(key)} disabled={!!upgrading}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2
                    ${key === 'pro' ? 'btn-primary glow-green-sm' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
                  {isUpgrading ? <><Loader size={15} className="animate-spin" /> Processing...</> : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Payment methods note */}
      <div className="glass rounded-xl px-5 py-4 border border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#008751]/10 rounded-lg flex items-center justify-center shrink-0">
          <CheckCircle size={16} className="text-green-bright" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Secure payment via Flutterwave</p>
          <p className="text-xs text-white/40 mt-0.5">Card, bank transfer, USSD -- Cancel anytime -- No hidden fees</p>
        </div>
      </div>
    </div>
  )
}
