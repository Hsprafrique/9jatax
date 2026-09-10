// ---------------------------------------------------------------------------------------------------------------------------
// 9jaTax --- Nigerian PAYE Calculator
// Based on FIRS Personal Income Tax Act (PITA) 2024
// ---------------------------------------------------------------------------------------------------------------------------

// Nigerian tax bands (annual)
const TAX_BANDS = [
  { limit: 300000,    rate: 0.07 },  // First ---300,000 @ 7%
  { limit: 300000,    rate: 0.11 },  // Next ---300,000 @ 11%
  { limit: 500000,    rate: 0.15 },  // Next ---500,000 @ 15%
  { limit: 500000,    rate: 0.19 },  // Next ---500,000 @ 19%
  { limit: 1600000,   rate: 0.21 },  // Next ---1,600,000 @ 21%
  { limit: Infinity,  rate: 0.24 },  // Above ---3,200,000 @ 24%
]

// Consolidated Relief Allowance --- higher of ---200,000 or 1% of gross + 20% of gross
function getConsolidatedRelief(annualGross) {
  const onePercent = annualGross * 0.01
  const baseRelief = Math.max(200000, onePercent)
  const twentyPercent = annualGross * 0.20
  return baseRelief + twentyPercent
}

// Pension contribution --- 8% of gross (employee), capped based on reg
function getPensionContribution(annualGross) {
  return annualGross * 0.08
}

// Calculate annual PAYE tax
export function calculateAnnualPAYE(annualGross) {
  const pension = getPensionContribution(annualGross)
  const relief = getConsolidatedRelief(annualGross)
  const taxableIncome = Math.max(0, annualGross - pension - relief)

  let tax = 0
  let remaining = taxableIncome

  for (const band of TAX_BANDS) {
    if (remaining <= 0) break
    const taxable = band.limit === Infinity ? remaining : Math.min(remaining, band.limit)
    tax += taxable * band.rate
    remaining -= taxable
  }

  return {
    annualGross,
    pension,
    relief,
    taxableIncome,
    annualTax: Math.round(tax),
    effectiveRate: taxableIncome > 0 ? ((tax / taxableIncome) * 100).toFixed(1) : 0,
  }
}

// Monthly breakdown
export function calculateMonthlyPAYE(monthlySalary) {
  const annualGross = monthlySalary * 12
  const annual = calculateAnnualPAYE(annualGross)
  return {
    monthlyGross: monthlySalary,
    monthlyPension: Math.round(annual.pension / 12),
    monthlyPAYE: Math.round(annual.annualTax / 12),
    monthlyNet: Math.round(monthlySalary - (annual.pension / 12) - (annual.annualTax / 12)),
    annualGross,
    annualPAYE: annual.annualTax,
    annualPension: Math.round(annual.pension),
    taxableIncome: annual.taxableIncome,
    effectiveRate: annual.effectiveRate,
  }
}

// Payroll summary for all staff
export function calculatePayrollRun(staffList) {
  return staffList.map(s => {
    const monthly = s.salary_type === 'monthly' ? s.salary
      : s.salary_type === 'weekly' ? s.salary * 4
      : s.salary * 22 // daily

    const paye = calculateMonthlyPAYE(monthly)
    return {
      ...s,
      gross: paye.monthlyGross,
      paye: paye.monthlyPAYE,
      pension: paye.monthlyPension,
      net: paye.monthlyNet,
      effective_rate: paye.effectiveRate,
    }
  })
}
