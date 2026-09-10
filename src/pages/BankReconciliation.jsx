import React, { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Upload, CheckCircle, XCircle, Link2, AlertTriangle, FileText, X } from 'lucide-react'
import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())

  // Try to detect column positions
  const dateCol = headers.findIndex(h => h.includes('date') || h.includes('datum'))
  const descCol = headers.findIndex(h => h.includes('desc') || h.includes('narr') || h.includes('detail') || h.includes('remark'))
  const debitCol = headers.findIndex(h => h.includes('debit') || h.includes('dr') || h.includes('withdrawal'))
  const creditCol = headers.findIndex(h => h.includes('credit') || h.includes('cr') || h.includes('deposit'))
  const balanceCol = headers.findIndex(h => h.includes('balance') || h.includes('bal'))
  const amountCol = headers.findIndex(h => h === 'amount' || h === 'value')

  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map(c => c.replace(/"/g, '').trim())
    const rawDebit = parseFloat((cols[debitCol] || '').replace(/[^0-9.-]/g, '')) || 0
    const rawCredit = parseFloat((cols[creditCol] || '').replace(/[^0-9.-]/g, '')) || 0
    const rawAmount = parseFloat((cols[amountCol] || '').replace(/[^0-9.-]/g, '')) || 0

    let debit = rawDebit
    let credit = rawCredit
    if (amountCol >= 0 && !debit && !credit) {
      if (rawAmount < 0) debit = Math.abs(rawAmount)
      else credit = rawAmount
    }

    const rawDate = cols[dateCol] || ''
    let parsedDate = null
    try {
      const d = new Date(rawDate)
      if (!isNaN(d)) parsedDate = d.toISOString().split('T')[0]
    } catch {}

    return {
      _id: i,
      date: parsedDate,
      description: cols[descCol] || `Row ${i + 1}`,
      debit,
      credit,
      balance: parseFloat((cols[balanceCol] || '').replace(/[^0-9.-]/g, '')) || null,
    }
  }).filter(r => r.credit > 0 || r.debit > 0)
}

export default function BankReconciliation() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importId] = useState(() => uuidv4())
  const [step, setStep] = useState('upload') // upload | review | done
  const [stats, setStats] = useState({ matched: 0, unmatched: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  function handleFile(file) {
    if (!file) return
    setError('')
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please upload a CSV file. Most Nigerian banks let you export statements as CSV.')
      return
    }
    setImporting(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result)
        if (parsed.length === 0) {
          setError('Could not read any transactions. Make sure it\'s a CSV with Date, Description, Debit/Credit columns.')
          setImporting(false)
          return
        }
        setRows(parsed.map(r => ({ ...r, status: 'unmatched' })))
        setStats({ matched: 0, unmatched: parsed.length, total: parsed.length })
        setStep('review')
      } catch (err) {
        setError('Could not parse the file. Try exporting as CSV from your bank app.')
      }
      setImporting(false)
    }
    reader.readAsText(file)
  }

  function onDrop(e) {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  function markMatched(id) {
    setRows(p => p.map(r => r._id === id ? { ...r, status: r.status === 'matched' ? 'unmatched' : 'matched' } : r))
    setStats(s => {
      const row = rows.find(r => r._id === id)
      const wasMatched = row?.status === 'matched'
      return { ...s, matched: s.matched + (wasMatched ? -1 : 1), unmatched: s.unmatched + (wasMatched ? 1 : -1) }
    })
  }

  async function saveToLedger() {
    setSaving(true)
    const matchedRows = rows.filter(r => r.status === 'matched')
    const unmatched = rows.filter(r => r.status === 'unmatched')

    // Save all rows to bank_statement_rows
    const payload = rows.map(r => ({
      user_id: user.id,
      import_id: importId,
      date: r.date,
      description: r.description,
      debit: r.debit,
      credit: r.credit,
      balance: r.balance,
      matched: r.status === 'matched',
    }))

    await supabase.from('bank_statement_rows').insert(payload)

    // Auto-create transactions for unmatched credits (income)
    for (const row of unmatched.filter(r => r.credit > 0)) {
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'income',
        description: row.description,
        amount: row.credit,
        date: row.date || format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'transfer',
        notes: 'Imported from bank statement',
      })
    }

    // Auto-create expenses for unmatched debits
    for (const row of unmatched.filter(r => r.debit > 0)) {
      await supabase.from('expenses').insert({
        user_id: user.id,
        description: row.description,
        amount: row.debit,
        date: row.date || format(new Date(), 'yyyy-MM-dd'),
        category: 'other',
        notes: 'Imported from bank statement',
      })
    }

    setSaving(false)
    setStep('done')
  }

  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-5">

      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText size={18} className="text-green-bright" /> Bank Reconciliation
        </h2>
        <p className="text-sm text-white/40 mt-0.5">Upload your bank statement CSV to match and import transactions</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {['Upload', 'Review & Match', 'Done'].map((s, i) => {
          const active = (step === 'upload' && i === 0) || (step === 'review' && i === 1) || (step === 'done' && i === 2)
          const done = (step === 'review' && i === 0) || (step === 'done' && i <= 1)
          return (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                active ? 'bg-[#008751]/20 text-green-bright border border-emerald-500/30' :
                done ? 'text-white/50' : 'text-white/25'}`}>
                {done ? <CheckCircle size={12} /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-xs">{i+1}</span>}
                {s}
              </div>
              {i < 2 && <div className="h-px flex-1 max-w-8" style={{ background: 'rgba(255,255,255,0.1)' }} />}
            </React.Fragment>
          )
        })}
      </div>

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div>
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className="rounded-2xl p-10 text-center transition-all cursor-pointer"
            style={{
              border: `2px dashed ${dragOver ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)'}`,
              background: dragOver ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
            }}
            onClick={() => document.getElementById('csv-input').click()}>
            <Upload size={32} className="mx-auto mb-3 text-green-bright" style={{ opacity: dragOver ? 1 : 0.5 }} />
            <p className="text-white font-medium mb-1">{importing ? 'Reading file...' : 'Drop your bank statement here'}</p>
            <p className="text-sm text-white/40 mb-4">or click to browse -- CSV format only</p>
            <input id="csv-input" type="file" accept=".csv,.txt" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
            <span className="btn-primary text-sm px-5 py-2.5 inline-block">Choose CSV file</span>
          </div>

          {error && (
            <div className="mt-3 rounded-xl px-4 py-3 flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="mt-5 modal-panel white-top-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-3">How to export from your bank</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { bank: 'GTBank', steps: 'Internet banking --- Account Statement --- Download CSV' },
                { bank: 'Access Bank', steps: 'App --- Transaction History --- Export --- CSV' },
                { bank: 'Zenith Bank', steps: 'ALAT app --- Statement --- Email as CSV' },
                { bank: 'First Bank', steps: 'FirstMobile --- Accounts --- Statement --- Download' },
                { bank: 'UBA', steps: 'UBA Mobile --- History --- Export Statement' },
                { bank: 'Kuda', steps: 'Kuda app --- Statement --- Export --- CSV' },
              ].map(b => (
                <div key={b.bank} className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-semibold text-green-bright mb-0.5">{b.bank}</p>
                  <p className="text-xs text-white/40">{b.steps}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Review */}
      {step === 'review' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total rows', value: stats.total, color: 'text-white' },
              { label: 'Total credits', value: formatCurrency(totalCredit), color: 'text-green-bright' },
              { label: 'Total debits', value: formatCurrency(totalDebit), color: 'text-red-400' },
              { label: 'Unmatched', value: stats.unmatched, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="modal-panel white-top-border rounded-xl p-3 text-center">
                <p className="text-xs text-white/40 mb-1">{s.label}</p>
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl px-4 py-3 flex items-start gap-2"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <AlertTriangle size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              Mark rows as <strong>Matched</strong> if they already exist in your 9jaTax records.
              Unmatched rows will be auto-imported as new transactions and expenses.
            </p>
          </div>

          {/* Rows table */}
          <div className="navy-card white-top-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-white/40">Credit</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-white/40">Debit</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-white/40">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {rows.map(row => (
                    <tr key={row._id} className="table-row-hover transition-colors">
                      <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{row.date || '---'}</td>
                      <td className="px-4 py-3 text-white text-xs max-w-xs truncate">{row.description}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-green-bright">
                        {row.credit > 0 ? `+${formatCurrency(row.credit)}` : '---'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-red-400">
                        {row.debit > 0 ? `-${formatCurrency(row.debit)}` : '---'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => markMatched(row._id)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            row.status === 'matched'
                              ? 'bg-[#008751]/20 text-green-bright border-emerald-500/30'
                              : 'text-white/30 border-white/10 hover:border-white/20'
                          }`}>
                          {row.status === 'matched' ? <CheckCircle size={12} className="inline mr-1" /> : null}
                          {row.status === 'matched' ? 'Matched' : 'Mark matched'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep('upload'); setRows([]) }}
              className="btn-secondary flex items-center gap-2 text-sm px-4 py-2.5">
              <X size={15} /> Start over
            </button>
            <button onClick={saveToLedger} disabled={saving}
              className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-50">
              {saving ? 'Importing...' : `Import ${stats.unmatched} unmatched transactions`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Done */}
      {step === 'done' && (
        <div className="modal-panel white-top-border rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-[#008751]/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-bright" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Reconciliation complete!</h3>
          <p className="text-white/40 text-sm mb-6">
            {stats.unmatched} unmatched transactions have been imported into your ledger.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setStep('upload'); setRows([]) }}
              className="btn-secondary text-sm px-5 py-2.5">
              Import another
            </button>
            <a href="/app/transactions" className="btn-primary text-sm px-5 py-2.5">
              View transactions
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
