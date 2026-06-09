'use client'
import { useEffect, useRef } from 'react'
import { getSupabase } from '../lib/supabase'

/**
 * Hook para Supabase Realtime.
 * Assina mudanças em tickets e mensagens do tenant.
 *
 * @param {string} tenantId
 * @param {{ onTicketChange, onNewMessage }} callbacks
 */
export function useRealtime(tenantId, { onTicketChange, onNewMessage } = {}) {
  const subRef = useRef(null)

  useEffect(() => {
    if (!tenantId) return

    const supabase = getSupabase()

    const channel = supabase
      .channel(`sirius-${tenantId}`)
      // Mudanças em tickets (status, assigned_to)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `tenant_id=eq.${tenantId}` },
        (payload) => onTicketChange?.(payload)
      )
      // Novas mensagens
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `tenant_id=eq.${tenantId}` },
        (payload) => onNewMessage?.(payload)
      )
      .subscribe()

    subRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId]) // eslint-disable-line
}

/**
 * Hook simplificado para escutar apenas mensagens de um ticket específico.
 */
export function useTicketMessages(ticketId, onMessage) {
  useEffect(() => {
    if (!ticketId) return
    const supabase = getSupabase()

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `ticket_id=eq.${ticketId}` },
        (payload) => onMessage?.(payload.new)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ticketId]) // eslint-disable-line
}
