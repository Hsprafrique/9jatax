// ---------------------------------------------------------------------------------------------------------------------------
// 9jaTax --- Plan Gate System
// ---------------------------------------------------------------------------------------------------------------------------

// Admin emails --- always get full access free
const ADMIN_EMAILS = ['samuelivere92@gmail.com']

export function isAdmin(email) {
  return ADMIN_EMAILS.includes((email || '').toLowerCase().trim())
}

// Plan limits
export const LIMITS = {
  free: {
    invoices: 10,      // per month
    products: 30,
    customers: 20,
  },
  pro: {
    invoices: null,
    products: null,
    customers: null,
  },
  business: {
    invoices: null,
    products: null,
    customers: null,
  },
}

// Features locked per plan
// true = available, false = locked
export const FEATURES = {
  free: {
    invoices: true,           // but capped at 10/month
    expenses: true,
    inventory: true,          // but capped at 30 products
    customers: true,          // but capped at 20
    staff_payroll: true,      // available on all plans
    debt_tracker: true,       // available on all plans
    branches: true,           // available on all plans
    payment_links: false,     // PRO+
    whatsapp_summary: false,  // PRO+
    email_summary: false,     // PRO+
    advanced_reports: false,  // PRO+
    export_csv: false,        // PRO+
  },
  pro: {
    invoices: true,
    expenses: true,
    inventory: true,
    customers: true,
    staff_payroll: true,
    debt_tracker: true,
    branches: true,
    payment_links: true,
    whatsapp_summary: true,
    email_summary: true,
    advanced_reports: true,
    export_csv: true,
  },
  business: {
    invoices: true,
    expenses: true,
    inventory: true,
    customers: true,
    staff_payroll: true,
    debt_tracker: true,
    branches: true,
    payment_links: true,
    whatsapp_summary: true,
    email_summary: true,
    advanced_reports: true,
    export_csv: true,
  },
}

// Main access checker
export function canAccess(feature, { email, plan, subscription } = {}) {
  // Admin always has full access
  if (isAdmin(email)) return { allowed: true, reason: null }

  const activePlan = getActivePlan(plan, subscription)
  const planFeatures = FEATURES[activePlan] || FEATURES.free
  const allowed = planFeatures[feature] !== false

  if (!allowed) {
    return {
      allowed: false,
      reason: `This feature requires a Pro or Business plan.`,
      upgrade: true,
    }
  }
  return { allowed: true, reason: null }
}

// Check if user is within limits
export function withinLimit(resource, count, { email, plan, subscription } = {}) {
  if (isAdmin(email)) return { within: true, limit: null, remaining: null }

  const activePlan = getActivePlan(plan, subscription)
  const limits = LIMITS[activePlan] || LIMITS.free
  const limit = limits[resource]

  if (limit === null) return { within: true, limit: null, remaining: null }

  const within = count < limit
  return {
    within,
    limit,
    remaining: Math.max(0, limit - count),
    upgrade: !within,
  }
}

// Determine active plan from subscription
export function getActivePlan(plan, subscription) {
  if (!subscription) return 'free'
  if (subscription.status !== 'active') return 'free'
  if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) return 'free'
  return subscription.plan || 'free'
}

// Hook-friendly checker --- pass the auth context values
export function usePlanAccess({ user, profile, subscription }) {
  const email = user?.email
  const admin = isAdmin(email)
  const plan = getActivePlan(null, subscription)

  return {
    isAdmin: admin,
    plan,
    can: (feature) => canAccess(feature, { email, subscription }),
    within: (resource, count) => withinLimit(resource, count, { email, subscription }),
    isPro: admin || ['pro', 'business'].includes(plan),
    isBusiness: admin || plan === 'business',
  }
}
