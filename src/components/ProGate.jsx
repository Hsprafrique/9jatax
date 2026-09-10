import React from 'react'
import { Link } from 'react-router-dom'
import { Crown, Lock } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { canAccess, isAdmin } from '@/lib/planGate'

// Wraps any feature --- shows upgrade prompt if not allowed
export function ProGate({ feature, children, fallback }) {
  const { user, subscription } = useAuth()
  const { allowed } = canAccess(feature, { email: user?.email, subscription })

  if (allowed) return children

  if (fallback) return fallback

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Crown size={24} className="text-amber-400" />
      </div>
      <h3 className="font-bold text-white mb-2">Pro feature</h3>
      <p className="text-navy-400 text-sm max-w-xs mb-5">
        Upgrade your plan to unlock this feature and grow your business with 9jaTax Pro.
      </p>
      <Link to="/app/subscription" className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2">
        <Crown size={15} /> Upgrade to Pro
      </Link>
    </div>
  )
}

// Inline lock badge --- shows on buttons/links
export function LockBadge({ feature }) {
  const { user, subscription } = useAuth()
  const { allowed } = canAccess(feature, { email: user?.email, subscription })
  if (allowed) return null
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 bg-amber-500/15 text-amber-400 text-xs px-1.5 py-0.5 rounded-full border border-amber-500/20">
      <Crown size={9} /> Pro
    </span>
  )
}

// Limit warning bar --- shows remaining usage
export function LimitBar({ resource, count, label }) {
  const { user, subscription } = useAuth()
  const { within, limit, remaining } = require('@/lib/planGate').withinLimit(resource, count, { email: user?.email, subscription })

  if (limit === null) return null // unlimited

  const pct = Math.min(100, (count / limit) * 100)
  const isNear = pct >= 70
  const isFull = !within

  return (
    <div className={`glass rounded-xl px-4 py-3 border text-sm ${isFull ? 'border-red-500/30' : isNear ? 'border-amber-500/30' : 'border-white/5'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-navy-300">{label}</span>
        <span className={`font-mono text-xs ${isFull ? 'text-red-400' : isNear ? 'text-amber-400' : 'text-navy-400'}`}>
          {count} / {limit}
        </span>
      </div>
      <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : isNear ? 'bg-amber-400' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }} />
      </div>
      {isFull && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-red-400">Limit reached</p>
          <Link to="/app/subscription" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
            <Crown size={10} /> Upgrade
          </Link>
        </div>
      )}
    </div>
  )
}

// Upgrade prompt banner
export function UpgradeBanner({ message }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-amber-500/20 flex items-start gap-4">
      <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
        <Crown size={18} className="text-amber-400" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white text-sm mb-0.5">Upgrade to Pro</p>
        <p className="text-navy-400 text-xs">{message || 'Unlock all features for your business'}</p>
      </div>
      <Link to="/app/subscription" className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
        Upgrade
      </Link>
    </div>
  )
}
