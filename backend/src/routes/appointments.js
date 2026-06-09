const supabase = require('../services/supabase')
const { authenticate } = require('../middleware/auth')

module.exports = async function appointmentRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /appointments?professional_id=&start=&end=
  fastify.get('/', async (request, reply) => {
    const { professional_id, start, end, status } = request.query

    let query = supabase
      .from('appointments')
      .select('*, professional:users!professional_id(id, name, avatar_color)')
      .eq('tenant_id', request.tenantId)
      .order('scheduled_at')

    if (professional_id) query = query.eq('professional_id', professional_id)
    if (start) query = query.gte('scheduled_at', start)
    if (end) query = query.lte('scheduled_at', end)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // GET /appointments/:id
  fastify.get('/:id', async (request, reply) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, professional:users!professional_id(id, name, avatar_color)')
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (error) return reply.code(404).send({ error: 'Agendamento não encontrado' })
    return data
  })

  // POST /appointments
  fastify.post('/', async (request, reply) => {
    const {
      ticket_id, contact_name, contact_phone,
      professional_id, professional_name, service,
      scheduled_at, duration_minutes = 30, notes,
    } = request.body

    if (!scheduled_at || !service) {
      return reply.code(400).send({ error: 'scheduled_at e service são obrigatórios' })
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        tenant_id: request.tenantId,
        ticket_id,
        contact_name,
        contact_phone,
        professional_id,
        professional_name,
        service,
        scheduled_at,
        duration_minutes,
        notes,
        created_by: 'agent',
        status: 'confirmed',
      })
      .select('*, professional:users!professional_id(id, name, avatar_color)')
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })

  // PATCH /appointments/:id
  fastify.patch('/:id', async (request, reply) => {
    const allowed = ['status', 'scheduled_at', 'service', 'duration_minutes', 'notes', 'professional_id', 'professional_name']
    const updates = Object.fromEntries(
      Object.entries(request.body).filter(([k]) => allowed.includes(k))
    )

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // DELETE /appointments/:id (cancela)
  fastify.delete('/:id', async (request, reply) => {
    await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
    return { ok: true }
  })

  // GET /appointments/availability?professional_id=&date=
  fastify.get('/availability', async (request, reply) => {
    const { professional_id, date } = request.query
    if (!professional_id || !date) {
      return reply.code(400).send({ error: 'professional_id e date são obrigatórios' })
    }

    const start = `${date}T00:00:00`
    const end   = `${date}T23:59:59`

    const { data } = await supabase
      .from('appointments')
      .select('scheduled_at, duration_minutes')
      .eq('tenant_id', request.tenantId)
      .eq('professional_id', professional_id)
      .neq('status', 'cancelled')
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)

    return data || []
  })
}
