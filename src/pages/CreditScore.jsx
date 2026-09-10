import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { computeCreditScore, getGrade } from '@/lib/creditScore'
import { formatCurrency } from '@/lib/utils'
import CoatOfArms from '@/components/CoatOfArms'
import { RefreshCw, Award, Lock, TrendingUp, Shield, Info } from 'lucide-react'
import { format, differenceInMonths } from 'date-fns'

function ScoreRing({ score, color, size = 180 }) {
  const r = 70, circ = 2 * Math.PI * r
  const [disp, setDisp] = useState(300)
  useEffect(() => {
    let cur = 300; const step = (score - 300) / 60
    const t = setInterval(() => { cur += step; if (cur >= score) { setDisp(score); clearInterval(t) } else setDisp(Math.round(cur)) }, 16)
    return () => clearInterval(t)
  }, [score])
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - ((disp - 300) / 550) * circ}
          style={{ transition: 'stroke-dashoffset 0.05s linear', filter: `drop-shadow(0 0 10px ${color}80)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{disp}</span>
        <span className="text-xs mt-0.5" style={{ color }}>/ 850</span>
      </div>
    </div>
  )
}

export default function CreditScore() {
  const { user, profile } = useAuth()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [lastComputed, setLastComputed] = useState(null)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('credit_scores').select('*').eq('user_id', user.id).order('computed_at', { ascending: false }).limit(1).maybeSingle()
    if (data) {
      setResult({ score: data.score, grade: data.grade, ...getGrade(data.score), breakdown: { revenue: { score: data.revenue_score, max: 250, label: 'Revenue' }, consistency: { score: data.consistency_score, max: 200, label: 'Consistency' }, expenses: { score: data.expense_score, max: 150, label: 'Profit Margin' }, tax: { score: data.tax_score, max: 200, label: 'Tax Compliance' }, maturity: { score: data.growth_score, max: 50, label: 'Business Maturity' } }, recommendations: data.recommendations || [] })
      setLastComputed(data.computed_at)
    }
    setLoading(false)
  }

  async function compute() {
    setComputing(true)
    const [invRes, expRes, taxRes, staffRes] = await Promise.all([
      supabase.from('invoices').select('status,total,issue_date').eq('user_id', user.id),
      supabase.from('expenses').select('amount,date,category').eq('user_id', user.id),
      supabase.from('tax_records').select('status,tax_amount').eq('user_id', user.id),
      supabase.from('staff').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_active', true),
    ])
    const monthsActive = profile?.created_at ? Math.max(1, differenceInMonths(new Date(), new Date(profile.created_at))) : 1
    const score = computeCreditScore({ invoices: invRes.data || [], expenses: expRes.data || [], taxRecords: taxRes.data || [], staffCount: staffRes.count || 0, monthsActive })
    await supabase.from('credit_scores').insert({ user_id: user.id, score: score.score, grade: score.grade, revenue_score: score.breakdown.revenue.score, consistency_score: score.breakdown.consistency.score, expense_score: score.breakdown.expenses.score, tax_score: score.breakdown.tax.score, growth_score: score.breakdown.maturity.score, summary: `${score.label} - ${score.loan}`, recommendations: score.recommendations })
    setResult(score); setLastComputed(new Date().toISOString()); setComputing(false)
  }

  const gradeInfo = result ? getGrade(result.score) : null
  const COLORS = ['#00C896','#60A5FA','#FFB020','#A78BFA','#F472B6']

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-5">

      {/* Header with Coat of Arms */}
      <div className="card p-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
          <CoatOfArms size={180} />
        </div>
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <CoatOfArms size={56} />
            <div>
              <h2 className="text-xl font-bold text-white">Business Credit Score</h2>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Based on your 9jaTax financial activity
              </p>
              {lastComputed && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Last updated {format(new Date(lastComputed), 'dd MMM yyyy')}</p>}
            </div>
          </div>
          <button onClick={compute} disabled={computing} className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
            <RefreshCw size={14} className={computing ? 'animate-spin' : ''} />
            {computing ? 'Computing...' : result ? 'Refresh' : 'Compute score'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <RefreshCw size={24} className="animate-spin" style={{ color: '#008751' }} />
        </div>
      ) : !result ? (
        <div className="card p-10 text-center">
          <CoatOfArms size={80} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold text-white mb-2">No score yet</h3>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Your score is built from invoices, expenses, tax records and business history.</p>
          <button onClick={compute} disabled={computing} className="btn-primary px-8 py-3 mx-auto flex items-center gap-2">
            <Award size={16} />{computing ? 'Computing...' : 'Compute my score'}
          </button>
        </div>
      ) : (
        <>
          {/* Main score */}
          <div className="card p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex flex-col items-center gap-3 shrink-0">
                <ScoreRing score={result.score} color={gradeInfo?.color || '#008751'} size={180} />
                <div className="text-center">
                  <span className="text-2xl font-bold" style={{ color: gradeInfo?.color }}>{result.grade}</span>
                  <span className="text-white font-semibold ml-2">{gradeInfo?.label}</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-4">
                {/* Loan eligibility */}
                <div className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: `${gradeInfo?.color}15`, border: `1px solid ${gradeInfo?.color}30` }}>
                  <CoatOfArms size={36} />
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Loan eligibility estimate</p>
                    <p className="font-semibold text-white">{gradeInfo?.loan}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Based on your 9jaTax activity</p>
                  </div>
                </div>

                {/* Score scale */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex justify-between text-xs mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    <span>300 Poor</span><span>550 Fair</span><span>700 Good</span><span>850 Excellent</span>
                  </div>
                  <div className="h-3 rounded-full relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${((result.score-300)/550)*100}%`, background: 'linear-gradient(90deg,#FF4444,#FFB020,#60A5FA,#008751)', boxShadow: `0 0 12px ${gradeInfo?.color}80` }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Revenue (6mo)', value: formatCurrency(result.totalRevenue || 0) },
                    { label: 'Profit margin', value: `${result.profitMargin || 0}%` },
                    { label: 'Monthly avg', value: formatCurrency(result.monthlyAvg || 0) },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.label}</p>
                      <p className="text-sm font-bold text-white">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown + Recommendations */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Shield size={14} style={{ color: '#008751' }} /> Score breakdown</h3>
              <div className="space-y-4">
                {Object.values(result.breakdown).map((item, i) => {
                  const pct = Math.min(100, Math.round((item.score / item.max) * 100))
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                        <span className="font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.score}/{item.max}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: COLORS[i], boxShadow: `0 0 8px ${COLORS[i]}60` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp size={14} style={{ color: '#008751' }} /> How to improve</h3>
              <div className="space-y-3">
                {(result.recommendations || []).map((r, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="text-lg shrink-0">{r.icon}</span>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lender partners */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CoatOfArms size={36} />
                <h3 className="text-sm font-semibold text-white">Loan partners</h3>
              </div>
              <span className="pill-amber">Coming soon</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['Carbon','FairMoney','Moove','Renmoney'].map(l => (
                <div key={l} className="rounded-xl p-4 text-center relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(13,13,13,0.7)', backdropFilter: 'blur(4px)' }}>
                    <Lock size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-center mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {result.score >= 650 ? `Your ${result.grade} score qualifies you for partner loans launching soon.` : 'Improve your score to unlock loan access when we launch.'}
            </p>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Info size={13} className="shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.2)' }}>
              The 9jaTax Business Credit Score is an internal indicator based on your platform activity. It is not a formal credit bureau score and does not affect your official credit history. Loan eligibility estimates are indicative only and subject to lender approval. HSPR Technologies Ltd is not a financial institution.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
