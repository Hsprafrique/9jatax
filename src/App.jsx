import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import Layout from '@/components/layout/Layout'
import LandingPage from '@/pages/LandingPage'
import AuthPage from '@/pages/AuthPage'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
import Expenses from '@/pages/Expenses'
import Invoices from '@/pages/Invoices'
import Inventory from '@/pages/Inventory'
import Customers from '@/pages/Customers'
import Staff from '@/pages/Staff'
import Debts from '@/pages/Debts'
import Branches from '@/pages/Branches'
import Settings from '@/pages/Settings'
import Subscription from '@/pages/Subscription'
import PayInvoice from '@/pages/PayInvoice'
import Transactions from '@/pages/Transactions'
import Reports from '@/pages/Reports'
import TaxCompliance from '@/pages/TaxCompliance'
import CreditScore from '@/pages/CreditScore'
import AccountantPortal from '@/pages/AccountantPortal'
import BankReconciliation from '@/pages/BankReconciliation'
import Payroll from '@/pages/Payroll'
import Terms from '@/pages/Terms'
import Privacy from '@/pages/Privacy'

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f2318' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#008751,#006B40)', boxShadow: '0 0 30px rgba(0,135,81,0.3)' }}>
          <span className="text-white font-bold text-lg">9T</span>
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading 9jaTax...</p>
      </div>
    </div>
  )
}

function AuthRoute() {
  const { user, loading, needsOnboarding } = useAuth()
  if (loading) return <Loader />
  if (user && needsOnboarding) return <Navigate to="/onboarding" replace />
  if (user) return <Navigate to="/app" replace />
  return <AuthPage />
}

function OnboardingRoute() {
  const { user, loading, needsOnboarding } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/auth" replace />
  if (!needsOnboarding) return <Navigate to="/app" replace />
  return <Onboarding />
}

function ProtectedLayout() {
  const { user, loading, needsOnboarding } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/auth" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  return <Layout />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/onboarding" element={<OnboardingRoute />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/pay/:token" element={<PayInvoice />} />
          <Route path="/app" element={<ProtectedLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="customers" element={<Customers />} />
            <Route path="staff" element={<Staff />} />
            <Route path="debts" element={<Debts />} />
            <Route path="branches" element={<Branches />} />
            <Route path="settings" element={<Settings />} />
            <Route path="subscription" element={<Subscription />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="reports" element={<Reports />} />
            <Route path="tax" element={<TaxCompliance />} />
            <Route path="credit" element={<CreditScore />} />
            <Route path="accountant" element={<AccountantPortal />} />
            <Route path="reconcile" element={<BankReconciliation />} />
            <Route path="payroll" element={<Payroll />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
