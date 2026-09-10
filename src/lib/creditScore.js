// ---------------------------------------------------------------------------------------------------------------------------
// 9jaTax Business Credit Score Engine
// Score: 300 --- 850 (modeled on Nigerian credit bureaus)
// ---------------------------------------------------------------------------------------------------------------------------

export const SCORE_GRADES = [
  { min: 750, max: 850, grade: 'A+', label: 'Excellent',   color: '#10b981', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', loan: 'Eligible for up to ---5M+' },
  { min: 700, max: 749, grade: 'A',  label: 'Very Good',   color: '#34d399', bg: 'bg-emerald-400/15', border: 'border-emerald-400/30', loan: 'Eligible for up to ---2M' },
  { min: 650, max: 699, grade: 'B',  label: 'Good',        color: '#3b82f6', bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    loan: 'Eligible for up to ---1M' },
  { min: 600, max: 649, grade: 'C',  label: 'Fair',        color: '#f59e0b', bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   loan: 'Eligible for up to ---500k' },
  { min: 550, max: 599, grade: 'D',  label: 'Below Average', color: '#f97316', bg: 'bg-orange-500/15', border: 'border-orange-500/30', loan: 'Limited loan eligibility' },
  { min: 300, max: 549, grade: 'F',  label: 'Poor',        color: '#ef4444', bg: 'bg-red-500/15',     border: 'border-red-500/30',     loan: 'Not currently eligible' },
]

export function getGrade(score) {
  return SCORE_GRADES.find(g => score >= g.min && score <= g.max) || SCORE_GRADES[SCORE_GRADES.length - 1]
}

// ---------------------------------------------------------------------------------------------------------------------------
// SCORING ALGORITHM
// Total: 850 points max
// ---------------------------------------------------------------------------------------------------------------------------

export function computeCreditScore({
  invoices = [],       // all invoices
  expenses = [],       // all expenses
  taxRecords = [],     // tax compliance records
  staffCount = 0,
  monthsActive = 0,    // how long they've been on 9jaTax
}) {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

  // ------ 1. REVENUE SCORE (0-250) ------------------------------------------------------------------------------------------
  // Based on total paid income in last 6 months
  const recentInvoices = invoices.filter(inv =>
    inv.status === 'paid' && new Date(inv.issue_date) >= sixMonthsAgo
  )
  const totalRevenue = recentInvoices.reduce((s, inv) => s + (inv.total || 0), 0)
  const monthlyAvg = totalRevenue / Math.max(monthsActive, 1)

  let revenueScore = 0
  if (totalRevenue >= 5000000) revenueScore = 250
  else if (totalRevenue >= 2000000) revenueScore = 210
  else if (totalRevenue >= 1000000) revenueScore = 180
  else if (totalRevenue >= 500000) revenueScore = 150
  else if (totalRevenue >= 200000) revenueScore = 110
  else if (totalRevenue >= 50000) revenueScore = 70
  else if (totalRevenue > 0) revenueScore = 40

  // ------ 2. REVENUE CONSISTENCY (0-200) ---------------------------------------------------------------------
  // Reward consistent monthly income, penalize gaps
  const monthsWithIncome = new Set(
    recentInvoices.map(inv => {
      const d = new Date(inv.issue_date)
      return `${d.getFullYear()}-${d.getMonth()}`
    })
  ).size

  const consistencyScore = Math.round((monthsWithIncome / Math.min(6, Math.max(monthsActive, 1))) * 200)

  // ------ 3. EXPENSE MANAGEMENT (0-150) ------------------------------------------------------------------------
  // Profit margin health
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0

  let expenseScore = 0
  if (profitMargin >= 40) expenseScore = 150
  else if (profitMargin >= 25) expenseScore = 120
  else if (profitMargin >= 15) expenseScore = 90
  else if (profitMargin >= 5) expenseScore = 60
  else if (profitMargin >= 0) expenseScore = 30
  else expenseScore = 0  // negative margin

  // ------ 4. TAX COMPLIANCE (0-200) ------------------------------------------------------------------------------------
  const totalTaxRecords = taxRecords.length
  const paidTaxRecords = taxRecords.filter(t => t.status === 'paid').length
  const overdueTax = taxRecords.filter(t => t.status === 'overdue').length

  let taxScore = 0
  if (totalTaxRecords === 0) {
    taxScore = 80  // no records yet --- neutral
  } else {
    const complianceRate = paidTaxRecords / totalTaxRecords
    taxScore = Math.round(complianceRate * 200) - (overdueTax * 20)
    taxScore = Math.max(0, Math.min(200, taxScore))
  }

  // ------ 5. BUSINESS MATURITY (0-50) ------------------------------------------------------------------------------
  let maturityScore = 0
  if (monthsActive >= 12) maturityScore = 50
  else if (monthsActive >= 6) maturityScore = 35
  else if (monthsActive >= 3) maturityScore = 20
  else maturityScore = 10

  // Bonus for having staff
  if (staffCount >= 5) maturityScore = Math.min(50, maturityScore + 10)
  if (staffCount >= 2) maturityScore = Math.min(50, maturityScore + 5)

  // ------ TOTAL ---------------------------------------------------------------------------------------------------------------------------------------------------
  const rawScore = revenueScore + consistencyScore + expenseScore + taxScore + maturityScore
  // Scale to 300-850 range
  const maxRaw = 250 + 200 + 150 + 200 + 50  // 850
  const score = Math.round(300 + ((rawScore / maxRaw) * 550))
  const finalScore = Math.max(300, Math.min(850, score))

  const grade = getGrade(finalScore)

  // ------ RECOMMENDATIONS ---------------------------------------------------------------------------------------------------------------------
  const recommendations = []
  if (revenueScore < 100) recommendations.push({ icon: '----', text: 'Record more sales to boost your revenue score. Aim for ---200k+ monthly income.' })
  if (consistencyScore < 100) recommendations.push({ icon: '----', text: 'Ensure you record income every month --- consistency is rewarded heavily.' })
  if (expenseScore < 90) recommendations.push({ icon: '----', text: `Your profit margin is ${profitMargin.toFixed(0)}%. Aim for 25%+ to improve your score.` })
  if (taxScore < 100) recommendations.push({ icon: '-------', text: 'File and pay your taxes on time. Overdue tax records reduce your score significantly.' })
  if (totalTaxRecords === 0) recommendations.push({ icon: '----', text: 'Add your tax records in the Tax Compliance section to demonstrate compliance.' })
  if (monthsActive < 6) recommendations.push({ icon: '---', text: 'Keep using 9jaTax consistently --- business maturity improves your score over time.' })
  if (recommendations.length === 0) recommendations.push({ icon: '----', text: 'Excellent financial health! Keep maintaining your revenue and tax compliance.' })

  return {
    score: finalScore,
    grade: grade.grade,
    label: grade.label,
    color: grade.color,
    loan: grade.loan,
    breakdown: {
      revenue: { score: revenueScore, max: 250, label: 'Revenue' },
      consistency: { score: consistencyScore, max: 200, label: 'Consistency' },
      expenses: { score: expenseScore, max: 150, label: 'Profit Margin' },
      tax: { score: taxScore, max: 200, label: 'Tax Compliance' },
      maturity: { score: maturityScore, max: 50, label: 'Business Maturity' },
    },
    totalRevenue,
    profitMargin: profitMargin.toFixed(1),
    monthlyAvg,
    recommendations,
  }
}
