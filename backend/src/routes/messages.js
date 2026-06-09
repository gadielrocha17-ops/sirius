const supabase = require('../services/supabase')
const { authenticate } = require('../middleware/auth')
const n8n = require('../services/n8n')

module.exports = async function messageRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /tickets/:id/messages
  fastify.get('/:id/messages', async (request, reply) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:users!sender_id(id, name, avatar_color)')
      .eq('ticket_id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .order('sent_at', { ascending: true })

    if (error) return reply.code(500).send({ error: error.message })

    // Marca mensagens como lidas
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('ticket_id', request.params.id)
      .eq('read', false)
      .neq('sender_type', 'agent')

    return data
  })

  // POST /tickets/:id/messages — atendente envia mensagem
  fastify.post('/:id/messages', async (request, reply) => {
    const { content, media_url, media_type } = request.body
    if (!content?.trim() && !media_url) {
      return reply.code(400).send({ error: 'Conteúdo ou mídia obrigatórios' })
    }

    // Verifica se o ticket pertence ao tenant e está aberto
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, tenant:tenants(*)')
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .in('status', ['open', 'queue'])
      .single()

    if (!ticket) {
      return reply.code(404).send({ error: 'Ticket não encontrado ou já encerrado' })
    }

    // Persiste a mensagem
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticket.id,
        tenant_id: request.tenantId,
        sender_type: 'agent',
        sender_id: request.user.id,
        content: content || '',
        media_url,
        media_type,
      })
      .select('*, sender:users!sender_id(id, name, avatar_color)')
      .single()

    if (error) return reply.code(500).send({ error: error.message })

    // Se ticket estava na fila, abre automaticamente
    if (ticket.status === 'queue') {
      await supabase
        .from('tickets')
        .update({ status: 'open', assigned_to: request.user.id })
        .eq('id', ticket.id)
    }

    // Envia ao N8N (e daí ao WhatsApp/Instagram do cliente)
    try {
      await n8n.sendMessage(
        ticket.tenant,
        ticket.n8n_session_id,
        content,
        ticket.channel
      )
    } catch (e) {
      fastify.log.error(`Erro ao enviar mensagem via N8N para ticket ${ticket.id}: ${e.message}`)
      // Não falha — mensagem já foi salva, N8N pode ter problema pontual
    }

    return reply.code(201).send(message)
  })
}
