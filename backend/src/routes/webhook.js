const supabase = require('../services/supabase')

/**
 * POST /webhook/n8n
 * Recebe eventos do N8N (message, escalate, close, satisfaction).
 * Autenticado via x-webhook-token no header.
 */
module.exports = async function webhookRoutes(fastify) {
  // Rate limit específico para webhook: 100 req/min por IP
  fastify.register(require('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute',
  })

  fastify.post('/n8n', async (request, reply) => {
    const { event, tenant_id, session_id, contact_phone, contact_name,
            channel = 'whatsapp', content, media_url, media_type, score } = request.body

    if (!tenant_id || !event) {
      return reply.code(400).send({ error: 'tenant_id e event são obrigatórios' })
    }

    // Valida token do tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, n8n_webhook_token, active')
      .eq('id', tenant_id)
      .single()

    if (!tenant || !tenant.active) {
      return reply.code(404).send({ error: 'Tenant não encontrado ou inativo' })
    }

    const receivedToken = request.headers['x-webhook-token']
    if (tenant.n8n_webhook_token && receivedToken !== tenant.n8n_webhook_token) {
      return reply.code(401).send({ error: 'Token de webhook inválido' })
    }

    // ── EVENT HANDLERS ────────────────────────────────────────────────────────

    if (event === 'message') {
      // Busca ou cria ticket
      let { data: ticket } = await supabase
        .from('tickets')
        .select('id, status')
        .eq('tenant_id', tenant_id)
        .eq('contact_phone', contact_phone)
        .in('status', ['bot', 'queue', 'open'])
        .order('opened_at', { ascending: false })
        .limit(1)
        .single()

      if (!ticket) {
        const { data: newTicket, error } = await supabase
          .from('tickets')
          .insert({
            tenant_id,
            contact_phone,
            contact_name: contact_name || contact_phone,
            channel,
            status: 'bot',
            n8n_session_id: session_id,
          })
          .select()
          .single()
        if (error) return reply.code(500).send({ error: error.message })
        ticket = newTicket
      }

      // Determina sender_type com base no conteúdo
      // O N8N envia sender_type explicitamente ou inferimos por role
      const sender_type = request.body.sender_type || 'bot'

      await supabase.from('messages').insert({
        ticket_id: ticket.id,
        tenant_id,
        sender_type,
        content: content || '',
        media_url,
        media_type,
      })

      return reply.send({ ok: true, ticket_id: ticket.id })
    }

    if (event === 'customer_message') {
      // Mensagem enviada pelo cliente (capturada pelo N8N)
      let { data: ticket } = await supabase
        .from('tickets')
        .select('id, status')
        .eq('tenant_id', tenant_id)
        .eq('contact_phone', contact_phone)
        .in('status', ['bot', 'queue', 'open'])
        .order('opened_at', { ascending: false })
        .limit(1)
        .single()

      if (!ticket) {
        const { data: newTicket } = await supabase
          .from('tickets')
          .insert({
            tenant_id, contact_phone,
            contact_name: contact_name || contact_phone,
            channel, status: 'bot', n8n_session_id: session_id,
          })
          .select().single()
        ticket = newTicket
      } else if (contact_name) {
        // Atualiza nome se vier preenchido
        await supabase.from('tickets').update({ contact_name }).eq('id', ticket.id)
      }

      await supabase.from('messages').insert({
        ticket_id: ticket.id, tenant_id,
        sender_type: 'customer',
        content: content || '',
        media_url, media_type,
      })

      return reply.send({ ok: true, ticket_id: ticket.id })
    }

    if (event === 'escalate') {
      // Bot não conseguiu resolver — coloca na fila humana
      const { data: ticket } = await supabase
        .from('tickets')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('n8n_session_id', session_id)
        .neq('status', 'closed')
        .single()

      if (!ticket) return reply.code(404).send({ error: 'Ticket não encontrado' })

      await supabase
        .from('tickets')
        .update({ status: 'queue' })
        .eq('id', ticket.id)

      // Insere mensagem de sistema
      await supabase.from('messages').insert({
        ticket_id: ticket.id, tenant_id,
        sender_type: 'bot',
        content: '↑ Conversa escalada para atendimento humano',
      })

      return reply.send({ ok: true })
    }

    if (event === 'close') {
      const { data: ticket } = await supabase
        .from('tickets')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('n8n_session_id', session_id)
        .neq('status', 'closed')
        .single()

      if (!ticket) return reply.code(404).send({ error: 'Ticket não encontrado' })

      await supabase
        .from('tickets')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', ticket.id)

      return reply.send({ ok: true })
    }

    if (event === 'satisfaction') {
      if (!score || score < 1 || score > 5) {
        return reply.code(400).send({ error: 'Score deve ser entre 1 e 5' })
      }

      const { data: ticket } = await supabase
        .from('tickets')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('n8n_session_id', session_id)
        .single()

      if (!ticket) return reply.code(404).send({ error: 'Ticket não encontrado' })

      await supabase
        .from('tickets')
        .update({ satisfaction_score: score })
        .eq('id', ticket.id)

      return reply.send({ ok: true })
    }

    return reply.code(400).send({ error: `Evento desconhecido: ${event}` })
  })
}
