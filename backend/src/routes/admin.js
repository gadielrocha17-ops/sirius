const supabase = require('../services/supabase')
const { authenticate, requireAdmin } = require('../middleware/auth')

module.exports = async function adminRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', requireAdmin)

  // GET /admin/stats — métricas do dashboard
  fastify.get('/stats', async (request, reply) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const [ticketsToday, closedToday, botResolved, satisfactionAvg, hourlyVolume] =
      await Promise.all([
        // Total tickets abertos hoje
        supabase.from('tickets').select('id', { count: 'exact', head: true })
          .eq('tenant_id', request.tenantId).gte('opened_at', todayISO),

        // Fechados hoje
        supabase.from('tickets').select('id', { count: 'exact', head: true })
          .eq('tenant_id', request.tenantId).eq('status', 'closed').gte('closed_at', todayISO),

        // Resolvidos pelo bot (nunca escalados — status bot ao fechar)
        supabase.from('tickets').select('id', { count: 'exact', head: true })
          .eq('tenant_id', request.tenantId).eq('status', 'closed')
          .is('assigned_to', null).gte('closed_at', todayISO),

        // Satisfação média dos últimos 30 dias
        supabase.from('tickets').select('satisfaction_score')
          .eq('tenant_id', request.tenantId).not('satisfaction_score', 'is', null)
          .gte('closed_at', new Date(Date.now() - 30 * 86400000).toISOString()),

        // Volume por hora (hoje)
        supabase.rpc('tickets_by_hour', { p_tenant_id: request.tenantId, p_date: today.toISOString().split('T')[0] })
          .catch(() => ({ data: [] })),
      ])

    const scores = satisfactionAvg.data?.map(r => r.satisfaction_score) || []
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null

    return {
      tickets_today: ticketsToday.count || 0,
      tickets_closed_today: closedToday.count || 0,
      bot_resolved_today: botResolved.count || 0,
      bot_resolution_rate: ticketsToday.count
        ? Math.round(((botResolved.count || 0) / ticketsToday.count) * 100) : 0,
      avg_satisfaction: avgScore ? Number(avgScore) : null,
      satisfaction_count: scores.length,
      hourly_volume: hourlyVolume.data || [],
    }
  })

  // GET /admin/history — histórico paginado
  fastify.get('/history', async (request, reply) => {
    const { search, start, end, status = 'closed', page = 1, limit = 50 } = request.query

    let query = supabase
      .from('tickets')
      .select(`
        id, contact_name, contact_phone, channel, status,
        opened_at, closed_at, satisfaction_score,
        assignee:users!assigned_to(name)
      `, { count: 'exact' })
      .eq('tenant_id', request.tenantId)
      .order('opened_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status !== 'all') query = query.eq('status', status)
    if (search) query = query.or(`contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%`)
    if (start) query = query.gte('opened_at', start)
    if (end) query = query.lte('opened_at', end)

    const { data, count, error } = await query
    if (error) return reply.code(500).send({ error: error.message })
    return { data, total: count, page: Number(page), limit: Number(limit) }
  })

  // GET /admin/tenant — dados do tenant
  fastify.get('/tenant', async (request, reply) => {
    const { data } = await supabase
      .from('tenants')
      .select('id, name, slug, plan, timezone, business_hours, welcome_message, out_of_hours_message, whatsapp_number, n8n_webhook_url, active')
      .eq('id', request.tenantId)
      .single()
    return data
  })

  // PATCH /admin/tenant — atualiza configurações do tenant
  fastify.patch('/tenant', async (request, reply) => {
    const allowed = [
      'name', 'timezone', 'business_hours', 'welcome_message',
      'out_of_hours_message', 'whatsapp_number', 'n8n_webhook_url', 'n8n_webhook_token',
    ]
    const updates = Object.fromEntries(
      Object.entries(request.body).filter(([k]) => allowed.includes(k))
    )

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', request.tenantId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // GET /admin/agents-status — atendentes online e seus tickets
  fastify.get('/agents-status', async (request, reply) => {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, avatar_color, role')
      .eq('tenant_id', request.tenantId)
      .eq('active', true)

    if (!users?.length) return []

    // Conta tickets abertos por atendente
    const { data: openTickets } = await supabase
      .from('tickets')
      .select('assigned_to')
      .eq('tenant_id', request.tenantId)
      .eq('status', 'open')

    const ticketCount = {}
    openTickets?.forEach(t => {
      if (t.assigned_to) ticketCount[t.assigned_to] = (ticketCount[t.assigned_to] || 0) + 1
    })

    return users.map(u => ({
      ...u,
      open_tickets: ticketCount[u.id] || 0,
      status: ticketCount[u.id] > 0 ? 'attending' : 'online',
    }))
  })
}
