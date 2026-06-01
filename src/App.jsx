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

function ProtectedRoute({ children }) {
  const { user, loading, needsOnboarding } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.png" alt="9jaTax" className="h-12 w-auto animate-pulse" />
        <p className="text-navy-400 text-sm">Loading your dashboard...</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/auth" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  return children
}

function AppRoutes() {
  const { user, loading, needsOnboarding } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950">
      <img src="/logo.png" alt="9jaTax" className="h-12 w-auto animate-pulse" />
    </div>
  )

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={user && !needsOnboarding ? <Navigate to="/app" replace /> : user && needsOnboarding ? <Navigate to="/onboarding" replace /> : <AuthPage />} />

      {/* Onboarding — only for logged in users who haven't completed it */}
      <Route path="/onboarding" element={
        !user ? <Navigate to="/auth" replace /> :
        !needsOnboarding ? <Navigate to="/app" replace /> :
        <Onboarding />
      } />

      {/* App — protected */}
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
