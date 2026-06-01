import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Receipt, FileText, Package, Users, Printer,
  Shield, Zap, CheckCircle, Star, ArrowRight, Menu, X,
  BarChart2, UserCheck, CreditCard, Bell, Smartphone, Globe
} from 'lucide-react'

// Animated counter hook
function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return count
}

function AnimatedStat({ value, suffix = '', prefix = '', label, start }) {
  const num = useCountUp(value, 2200, start)
  return (
    <div className="text-center">
      <p className="text-3xl lg:text-4xl font-bold text-white mb-1">
        {prefix}{num.toLocaleString()}{suffix}
      </p>
      <p className="text-navy-300 text-sm">{label}</p>
    </div>
  )
}

function useInView(threshold = 0.2) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

const FEATURES = [
  { icon: TrendingUp, title: 'Income & Sales Tracking', desc: 'Create invoices, record payments and know your revenue in real time.', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { icon: Receipt, title: 'Expense Management', desc: 'Log expenses by category, attach receipts, and print reports instantly.', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { icon: Package, title: 'Inventory Control', desc: 'Track stock levels, get low-stock alerts, and manage reorders.', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { icon: UserCheck, title: 'Staff & Payroll', desc: 'Manage employees, track salaries, and process payroll with one click.', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { icon: CreditCard, title: 'Debt Tracker', desc: 'Track who owes you and who you owe — never lose money to forgotten debts.', color: 'text-red-400', bg: 'bg-red-400/10' },
  { icon: Globe, title: 'Multi-Branch Support', desc: 'Manage multiple shop locations from a single dashboard.', color: 'text-teal-400', bg: 'bg-teal-400/10' },
  { icon: Printer, title: 'Print Anywhere', desc: 'Print professional invoices and expense reports directly from your browser.', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { icon: Bell, title: 'Daily Summaries', desc: 'Get your daily sales and expense summary sent straight to WhatsApp or email.', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { icon: Smartphone, title: 'Mobile First', desc: 'Built to work perfectly on your phone, tablet, and desktop.', color: 'text-pink-400', bg: 'bg-pink-400/10' },
]

const TESTIMONIALS = [
  { name: 'Adaeze Okonkwo', business: 'Adaeze Fashion House, Lagos', text: 'Before 9jaTax I was using notebooks. Now I know my exact profit every single day. Life changing.', stars: 5 },
  { name: 'Emeka Duru', business: 'Duru Electronics, Aba', text: 'The invoice printing alone is worth it. My customers think I have a full accounting system.', stars: 5 },
  { name: 'Fatima Aliyu', business: 'Fatima Provisions, Kano', text: 'Simple enough that I taught my shop assistant in one afternoon. That says everything.', stars: 5 },
]

const HOW = [
  { step: '01', title: 'Create your account', desc: 'Sign up free in under 2 minutes. Add your shop name and you\'re ready.' },
  { step: '02', title: 'Add your products', desc: 'Enter your items with prices. Set up stock tracking for your key products.' },
  { step: '03', title: 'Start recording', desc: 'Log sales, expenses, and manage staff. Everything updates in real time.' },
  { step: '04', title: 'Grow your business', desc: 'Use your dashboard to make smarter decisions. Print reports anytime.' },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [statsRef, statsInView] = useInView(0.3)
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-navy-950 font-sans overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src="/logo.png" alt="9jaTax" className="h-9 w-auto" />

          <div className="hidden md:flex items-center gap-8 text-sm text-navy-300">
            {['Features','How it works','About'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`} className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-navy-300 hover:text-white px-4 py-2 transition-colors">Log in</Link>
            <Link to="/auth?mode=signup" className="btn-primary text-sm px-5 py-2.5 glow-green-sm">
              Get started free
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-navy-300 hover:text-white">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden glass border-t border-white/5 px-4 py-4 space-y-2">
            {['Features','How it works','About'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`} onClick={() => setMenuOpen(false)} className="block text-sm text-navy-300 py-2 hover:text-white">{l}</a>
            ))}
            <div className="flex gap-3 pt-3 border-t border-white/10">
              <Link to="/auth" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm font-medium border border-white/20 text-white py-2.5 rounded-xl">Log in</Link>
              <Link to="/auth?mode=signup" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm font-semibold bg-emerald-500 text-white py-2.5 rounded-xl">Sign up free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-navy-gradient" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay:'1.5s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-navy-800/30 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-20 lg:py-32 grid lg:grid-cols-2 gap-16 items-center w-full">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm font-medium text-emerald-400 mb-6 glow-green-sm">
              <Zap size={14} /> Built for Nigerian small businesses
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="text-white">Manage your </span>
              <span className="text-gradient">business</span>
              <br />
              <span className="text-white">like a </span>
              <span className="text-gradient">pro.</span>
            </h1>
            <p className="text-navy-300 text-lg lg:text-xl mb-8 leading-relaxed">
              Track income, expenses, inventory, staff and debts — all in one place. Print invoices, manage multiple shops, and know your profit every day.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link to="/auth?mode=signup" className="btn-primary flex items-center justify-center gap-2 text-base glow-green">
                Start free today <ArrowRight size={18} />
              </Link>
              <a href="#features" className="btn-secondary flex items-center justify-center gap-2 text-base">
                See all features
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm text-navy-400">
              {['Free to start', 'No credit card', 'Works on mobile'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-400" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Hero dashboard card */}
          <div className="hidden lg:block animate-fade-up" style={{animationDelay:'0.2s'}}>
            <div className="glass-card rounded-3xl p-6 glow-green-sm animate-float">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-navy-400 text-xs mb-0.5">Welcome back</p>
                  <p className="text-white font-semibold">Ade's Store 👋</p>
                </div>
                <img src="/logo.png" alt="9jaTax" className="h-7 w-auto opacity-80" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Total Income', value: '₦248,000', color: 'text-emerald-400', icon: '📈' },
                  { label: 'Expenses', value: '₦91,500', color: 'text-red-400', icon: '📉' },
                  { label: 'Net Profit', value: '₦156,500', color: 'text-emerald-400', icon: '💰' },
                  { label: 'Unpaid', value: '₦32,000', color: 'text-amber-400', icon: '⏳' },
                ].map(s => (
                  <div key={s.label} className="stat-card p-3 rounded-xl">
                    <p className="text-navy-400 text-xs mb-1">{s.icon} {s.label}</p>
                    <p className={`font-bold text-base ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="glass rounded-xl p-3 mb-3">
                <p className="text-navy-400 text-xs mb-2">Recent sales</p>
                {[
                  { name: 'Chisom Eze', amt: '₦15,000', status: 'paid' },
                  { name: 'Walk-in customer', amt: '₦4,500', status: 'paid' },
                  { name: 'Bello Stores', amt: '₦32,000', status: 'pending' },
                ].map(inv => (
                  <div key={inv.name} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-sm text-navy-200">{inv.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{inv.status}</span>
                      <span className="text-sm font-mono text-white">{inv.amt}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <p className="text-xs text-navy-300">2 low stock alerts · 1 debt due today</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ANIMATED STATS */}
      <section ref={statsRef} className="py-16 bg-navy-900 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatedStat value={500} suffix="+" label="Active shop owners" start={statsInView} />
            <AnimatedStat value={2} prefix="₦" suffix="B+" label="Transactions tracked" start={statsInView} />
            <AnimatedStat value={6} label="African currencies" start={statsInView} />
            <AnimatedStat value={100} suffix="%" label="Free to start" start={statsInView} />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-navy-950">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-emerald-400 mb-4">
              <Zap size={13} /> Everything in one place
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">All the tools your shop needs</h2>
            <p className="text-navy-400 text-lg max-w-xl mx-auto">Built around how Nigerian businesses actually work — not how accountants think you should.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className="glass-card rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 cursor-default group"
                style={{animationDelay:`${i*0.05}s`}}>
                <div className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon size={20} className={f.color} />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-navy-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-navy-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Up and running in minutes</h2>
            <p className="text-navy-400 text-lg">If you can use WhatsApp, you can use 9jaTax.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            {HOW.map((s, i) => (
              <div key={s.step} className="relative text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center font-bold text-lg mx-auto mb-5 glow-green-sm">
                  {s.step}
                </div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-navy-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-navy-950">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-3">Loved by shop owners</h2>
            <p className="text-navy-400">Real results from real Nigerian businesses</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="glass-card rounded-2xl p-6 hover:border-emerald-500/20 transition-all">
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_, i) => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-navy-200 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <span className="text-emerald-400 font-bold text-sm">{t.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-navy-400 text-xs">{t.business}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">About the creator</h2>
            <p className="text-navy-400">The person behind 9jaTax</p>
          </div>
          <div className="glass-card rounded-3xl p-8 lg:p-10 flex flex-col md:flex-row items-center gap-10">
            <div className="shrink-0">
              <div className="w-40 h-40 lg:w-48 lg:h-48 rounded-2xl overflow-hidden border-2 border-emerald-500/30 glow-green-sm">
                <img src="/founder.jpg" alt="Founder" className="w-full h-full object-cover object-top" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4 border border-emerald-500/20">
                <Shield size={13} /> HSPR Technologies
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Built with Nigerian businesses in mind</h3>
              <p className="text-navy-300 leading-relaxed mb-4">
                9jaTax was built because most accounting tools are too complex, too expensive, or simply not designed for how small businesses in Nigeria actually operate. The goal was to give every shop owner the same visibility that big companies have — without the complexity.
              </p>
              <p className="text-navy-400 leading-relaxed text-sm">
                From a provisions store in Lagos to a fashion boutique in Abuja — 9jaTax is for every business owner tired of guessing their profit at month-end.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <img src="/logo.png" alt="9jaTax" className="h-7 w-auto" />
                <div>
                  <p className="text-sm font-semibold text-white">HSPR Technologies</p>
                  <p className="text-xs text-navy-400">Product & Technology</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-navy-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <img src="/logo.png" alt="9jaTax" className="h-14 w-auto mx-auto mb-6" />
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to take control?
          </h2>
          <p className="text-navy-400 text-lg mb-8">
            Join hundreds of Nigerian shop owners who manage their business with 9jaTax. Free to start, no card needed.
          </p>
          <Link to="/auth?mode=signup" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4 glow-green">
            Create your free account <ArrowRight size={18} />
          </Link>
          <p className="text-navy-500 text-sm mt-4">Takes less than 2 minutes</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-navy-900 border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            <img src="/logo.png" alt="9jaTax" className="h-8 w-auto" />
            <p className="text-sm text-navy-400 text-center">
              © {year} 9jaTax. A product of{' '}
              <span className="text-emerald-400 font-medium">HSPR Technologies</span>.
              All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-navy-400">
              <Link to="/auth" className="hover:text-white transition-colors">Log in</Link>
              <Link to="/auth?mode=signup" className="hover:text-white transition-colors">Sign up</Link>
              <a href="#about" className="hover:text-white transition-colors">About</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
