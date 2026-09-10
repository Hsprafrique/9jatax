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
          else if (error.message?.includes('Email not confirmed')) setError('Please confirm your email first --- check your inbox.')
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
    <div className="min-h-screen flex" style={{ background: 'radial-gradient(ellipse 80% 50% at 10% -10%, rgba(0,180,90,0.18) 0%, transparent 60%), #0f2318' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ borderRight: '1px solid rgba(0,200,110,0.15)', background: 'linear-gradient(160deg, rgba(0,120,60,0.3) 0%, rgba(10,40,22,0.95) 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,230,130,0.4), transparent)' }} />
        <div className="absolute top-1/4 left-0 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(0,180,90,0.08)' }} />
        <div className="absolute bottom-1/4 right-0 w-60 h-60 rounded-full blur-3xl" style={{ background: 'rgba(0,220,120,0.06)' }} />
        <Link to="/" className="relative">
          <img src="/logo.png" alt="9jaTax" className="h-11 w-auto" style={{ filter: 'drop-shadow(0 0 12px rgba(0,200,120,0.4))' }} />
        </Link>
        <div className="relative">
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Smart Bookkeeping.<br /><span className="text-gradient-green">Stress-Free Taxes.</span>
          </h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>The all-in-one platform for Nigerian businesses and accountants.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Sales & Invoices', icon: 'SF' },
              { label: 'Expense Tracking', icon: 'ET' },
              { label: 'PAYE & Payroll', icon: 'PP' },
              { label: 'Tax Compliance', icon: 'TC' },
              { label: 'Credit Score', icon: 'CS' },
              { label: 'Bank Reconcile', icon: 'BR' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(0,180,90,0.12)', border: '1px solid rgba(0,200,110,0.2)' }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(0,200,110,0.2)', color: '#00d88a' }}>{item.icon[0]}</div>
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs relative" style={{ color: 'rgba(255,255,255,0.25)' }}>HSPR Technologies Ltd - Made in Nigeria</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}>
            <ArrowLeft size={14} /> Back to home
          </Link>
          <div className="lg:hidden mb-8">
            <img src="/logo.png" alt="9jaTax" className="h-9 w-auto" style={{ filter: 'drop-shadow(0 0 8px rgba(0,200,120,0.4))' }} />
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {mode === 'login' ? 'Log in to your 9jaTax dashboard' : 'Start managing your business for free'}
          </p>

          {error && (
            <div className="text-sm rounded-xl px-4 py-3 mb-4"
              style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)', color: '#ff8080' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm rounded-xl px-4 py-3 mb-4"
              style={{ background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.25)', color: '#00d88a' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-dark">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required className="input-dark" />
            </div>
            <div>
              <label className="label-dark">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters" required minLength={6} className="input-dark" />
              {mode === 'signup' && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>At least 6 characters</p>}
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3.5 justify-center text-base glow-green-sm mt-2">
              {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create free account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
              className="font-semibold transition-colors" style={{ color: '#00d88a' }}
              onMouseEnter={e => e.currentTarget.style.color='#00ff9a'}
              onMouseLeave={e => e.currentTarget.style.color='#00d88a'}>
              {mode === 'login' ? 'Sign up free' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
