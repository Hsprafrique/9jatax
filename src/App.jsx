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

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.png" alt="9jaTax" className="h-12 w-auto animate-pulse" />
        <p className="text-navy-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}

// Redirects logged-in users away from /auth
function AuthRoute() {
  const { user, loading, needsOnboarding } = useAuth()
  if (loading) return <Loader />
  if (user && needsOnboarding) return <Navigate to="/onboarding" replace />
  if (user && !needsOnboarding) return <Navigate to="/app" replace />
  return <AuthPage />
}

// Forces onboarding before app access
function OnboardingRoute() {
  const { user, loading, needsOnboarding } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/auth" replace />
  if (!needsOnboarding) return <Navigate to="/app" replace />
  return <Onboarding />
}

// Protects all /app/* routes
function ProtectedLayout() {
  const { user, loading, needsOnboarding } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/auth" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  return <Layout />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/onboarding" element={<OnboardingRoute />} />
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
