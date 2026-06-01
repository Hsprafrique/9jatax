import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'

// Generic hook factory
function useTable(table) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const list = useCallback(async (filters = {}, orderBy = 'created_at', desc = true) => {
    if (!user) return []
    setLoading(true)
    let q = supabase.from(table).select('*').eq('user_id', user.id)
    Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v) })
    q = q.order(orderBy, { ascending: !desc })
    const { data, error } = await q
    setLoading(false)
    if (error) { setError(error); return [] }
    return data || []
  }, [user, table])

  const create = useCallback(async (record) => {
    const { data, error } = await supabase
      .from(table)
      .insert({ ...record, user_id: user.id })
      .select()
      .single()
    return { data, error }
  }, [user, table])

  const update = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    return { data, error }
  }, [user, table])

  const remove = useCallback(async (id) => {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    return { error }
  }, [user, table])

  return { list, create, update, remove, loading, error }
}

export const useExpenses = () => useTable('expenses')
export const useProducts = () => useTable('products')
export const useCustomers = () => useTable('customers')

// Invoices need special handling (line items)
export function useInvoices() {
  const { user } = useAuth()
  const base = useTable('invoices')

  const listWithItems = useCallback(async () => {
    if (!user) return []
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) return []
    return data || []
  }, [user])

  const createWithItems = useCallback(async (invoice, items) => {
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({ ...invoice, user_id: user.id })
      .select()
      .single()
    if (invErr) return { error: invErr }

    if (items?.length) {
      const { error: itemErr } = await supabase
        .from('invoice_items')
        .insert(items.map(item => ({ ...item, invoice_id: inv.id })))
      if (itemErr) return { error: itemErr }
    }
    return { data: inv }
  }, [user])

  const updateWithItems = useCallback(async (id, invoice, items) => {
    const { error: invErr } = await supabase
      .from('invoices')
      .update(invoice)
      .eq('id', id)
      .eq('user_id', user.id)
    if (invErr) return { error: invErr }

    // Replace all line items
    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    if (items?.length) {
      await supabase.from('invoice_items').insert(
        items.map(item => ({ ...item, invoice_id: id }))
      )
    }
    return { error: null }
  }, [user])

  return { ...base, listWithItems, createWithItems, updateWithItems }
}

// Dashboard stats
export function useDashboardStats() {
  const { user } = useAuth()

  const fetch = useCallback(async () => {
    if (!user) return null
    const [invRes, expRes, prodRes] = await Promise.all([
      supabase.from('invoices').select('status, total').eq('user_id', user.id),
      supabase.from('expenses').select('amount, date').eq('user_id', user.id),
      supabase.from('products').select('stock_qty, low_stock_alert, track_stock, name').eq('user_id', user.id).eq('is_active', true),
    ])

    const invoices = invRes.data || []
    const expenses = expRes.data || []
    const products = prodRes.data || []

    const income = invoices
      .filter(i => i.status === 'paid')
      .reduce((s, i) => s + (i.total || 0), 0)

    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)

    const pending = invoices
      .filter(i => ['sent', 'overdue'].includes(i.status))
      .reduce((s, i) => s + (i.total || 0), 0)

    const lowStock = products.filter(
      p => p.track_stock && p.stock_qty <= p.low_stock_alert
    )

    // Last 6 months chart data
    const now = new Date()
    const chartData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const label = d.toLocaleString('en', { month: 'short' })
      const monthIncome = invoices
        .filter(inv => {
          if (inv.status !== 'paid') return false
          // simple month match not stored here — skip for now
          return false
        })
        .reduce((s, inv) => s + inv.total, 0)
      return { month: label, income: monthIncome, expenses: 0 }
    })

    return { income, totalExpenses, pending, lowStock, profit: income - totalExpenses, chartData }
  }, [user])

  return { fetch }
}
