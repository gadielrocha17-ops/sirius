const supabase = require('../services/supabase')
const { authenticate } = require('../middleware/auth')
const n8n = require('../services/n8n')

module.exports = async function ticketRoutes(fastify) {
  // Todas as rotas exigem autenticação
  fastify.addHook('preHandler', authenticate)

  // GET /tickets — lista com filtros
  fastify.get('/', async (request, reply) => {
    const { status, assigned_to, page = 1, limit = 40, search } = request.query
    let query = supabase
      .from('tickets')
      .select(`
        id, contact_phone, contact_name, channel, status,
        assigned_to, opened_at, closed_at, satisfaction_score, metadata,
        assignee:users!assigned_to(id, name, avatar_color)
      `, { count: 'exact' })
      .eq('tenant_id', request.tenantId)
      .order('opened_at', { ascending: true })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)
    if (assigned_to) query = query.eq('assigned_to', assigned_to)
    if (search) query = query.or(`contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%`)

    const { data, error, count } = await query
    if (error) return reply.code(500).send({ error: error.message })
    return { data, total: count, page: Number(page), limit: Number(limit) }
  })

  // GET /tickets/:id
  fastify.get('/:id', async (request, reply) => {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        assignee:users!assigned_to(id, name, avatar_color),
        next_appointment:appointments(id, service, scheduled_at, professional_name, status)
      `)
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (error) return reply.code(404).send({ error: 'Ticket não encontrado' })
    return data
  })

  // PATCH /tickets/:id — atualiza status, assigned_to, metadata
  fastify.patch('/:id', async (request, reply) => {
    const allowed = ['status', 'assigned_to', 'metadata']
    const updates = Object.fromEntries(
      Object.entries(request.body).filter(([k]) => allowed.includes(k))
    )
    if (!Object.keys(updates).length) {
      return reply.code(400).send({ error: 'Nenhum campo válido para atualizar' })
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // POST /tickets/:id/assign — atribui ao usuário logado ou a outro
  fastify.post('/:id/assign', async (request, reply) => {
    const assignTo = request.body?.user_id || request.user.id

    const { data, error } = await supabase
      .from('tickets')
      .update({ status: 'open', assigned_to: assignTo })
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // POST /tickets/:id/return-to-bot
  fastify.post('/:id/return-to-bot', async (request, reply) => {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, tenant:tenants(*)')
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (!ticket) return reply.code(404).send({ error: 'Ticket não encontrado' })

    await supabase
      .from('tickets')
      .update({ status: 'bot', assigned_to: null })
      .eq('id', ticket.id)

    await supabase.from('messages').insert({
      ticket_id: ticket.id, tenant_id: request.tenantId,
      sender_type: 'bot',
      content: '↓ Conversa devolvida ao agente IA',
    })

    // Notifica N8N
    try {
      await n8n.returnToBot(ticket.tenant, ticket.n8n_session_id)
    } catch (e) {
      fastify.log.warn(`N8N indisponível ao devolver ticket ${ticket.id}: ${e.message}`)
    }

    return { ok: true }
  })

  // POST /tickets/:id/close
  fastify.post('/:id/close', async (request, reply) => {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, tenant:tenants(*)')
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (!ticket) return reply.code(404).send({ error: 'Ticket não encontrado' })

    await supabase
      .from('tickets')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', ticket.id)

    // Notifica N8N para disparar pesquisa de satisfação
    try {
      await n8n.closeTicket(ticket.tenant, ticket.n8n_session_id)
    } catch (e) {
      fastify.log.warn(`N8N indisponível ao fechar ticket ${ticket.id}: ${e.message}`)
    }

    return { ok: true }
  })
}
