import React, { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) {
          if (error.message?.includes('Invalid login') || error.message?.includes('invalid_credentials')) setError('Wrong email or password.')
          else if (error.message?.includes('Email not confirmed')) setError('Please confirm your email first — check your inbox.')
          else setError(error.message || 'Login failed. Try again.')
        }
      } else {
        if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return }
        const { error } = await signUp(email, password)
        if (error) {
          if (error.message?.includes('already registered')) setError('This email already has an account. Try logging in.')
          else setError(error.message || 'Signup failed. Try again.')
        } else {
          setSuccess('Account created! Check your email to confirm, then log in.')
          setMode('login')
        }
      }
    } catch {
      setError('Connection error. Check your internet and try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-navy-gradient flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden border-r border-white/5">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl" />
        </div>
        <Link to="/" className="relative">
          <img src="/logo.png" alt="9jaTax" className="h-10 w-auto" />
        </Link>
        <div className="relative">
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Your business,<br />fully in control.
          </h1>
          <p className="text-navy-300 text-lg mb-8">Track income, expenses, staff, inventory and debts — all from one dashboard.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Sales & Invoices', icon: '📈' },
              { label: 'Expense tracking', icon: '🧾' },
              { label: 'Inventory alerts', icon: '📦' },
              { label: 'Staff & Payroll', icon: '👥' },
              { label: 'Debt tracker', icon: '💳' },
              { label: 'Print receipts', icon: '🖨️' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 glass rounded-xl px-3 py-2.5">
                <span>{item.icon}</span>
                <span className="text-sm text-navy-200 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-navy-500 text-sm relative">A product of HSPR Technologies</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-navy-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft size={14} /> Back to home
          </Link>
          <div className="lg:hidden mb-8">
            <img src="/logo.png" alt="9jaTax" className="h-9 w-auto" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-navy-400 text-sm mb-7">
            {mode === 'login' ? 'Log in to your dashboard' : 'Start managing your business for free'}
          </p>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
          {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl px-4 py-3 mb-4">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-dark">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="input-dark" />
            </div>
            <div>
              <label className="label-dark">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="input-dark" />
              {mode === 'signup' && <p className="text-xs text-navy-500 mt-1">At least 6 characters</p>}
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50 glow-green-sm mt-2">
              {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create free account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-navy-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
              className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
              {mode === 'login' ? 'Sign up free' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
