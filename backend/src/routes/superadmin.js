const supabase = require('../services/supabase')
const { authenticate } = require('../middleware/auth')

// Middleware: só super_admin pode acessar
async function requireSuperAdmin(request, reply) {
  if (!request.user?.super_admin) {
    return reply.code(403).send({ error: 'Acesso restrito a super admins (AgentIA)' })
  }
}

module.exports = async function superAdminRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', requireSuperAdmin)

  // GET /superadmin/tenants — lista todas as empresas
  fastify.get('/tenants', async (request, reply) => {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, user_count:users(count)')
      .order('created_at', { ascending: false })

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // GET /superadmin/tenants/:id — detalhes de uma empresa
  fastify.get('/tenants/:id', async (request, reply) => {
    const [tenantRes, usersRes, statsRes] = await Promise.all([
      supabase.from('tenants').select('*').eq('id', request.params.id).single(),
      supabase.from('users').select('id, name, email, role, active, super_admin, is_company_admin, created_at')
        .eq('tenant_id', request.params.id).order('name'),
      supabase.from('tickets').select('id', { count: 'exact', head: true })
        .eq('tenant_id', request.params.id),
    ])

    if (tenantRes.error) return reply.code(404).send({ error: 'Empresa não encontrada' })

    return {
      ...tenantRes.data,
      users: usersRes.data || [],
      total_tickets: statsRes.count || 0,
    }
  })

  // POST /superadmin/tenants — cria nova empresa
  fastify.post('/tenants', async (request, reply) => {
    const { name, slug, plan = 'starter', whatsapp_number } = request.body
    if (!name || !slug) return reply.code(400).send({ error: 'nome e slug são obrigatórios' })

    const { data, error } = await supabase
      .from('tenants')
      .insert({ name, slug, plan, whatsapp_number, active: true })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })

  // PATCH /superadmin/tenants/:id — atualiza empresa
  fastify.patch('/tenants/:id', async (request, reply) => {
    const allowed = ['name', 'slug', 'plan', 'whatsapp_number', 'active',
      'n8n_webhook_url', 'n8n_webhook_token', 'timezone',
      'business_hours', 'human_hours', 'welcome_message', 'out_of_hours_message']
    const updates = Object.fromEntries(
      Object.entries(request.body).filter(([k]) => allowed.includes(k))
    )

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', request.params.id)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // DELETE /superadmin/tenants/:id — desativa empresa
  fastify.delete('/tenants/:id', async (request, reply) => {
    const { error } = await supabase
      .from('tenants')
      .update({ active: false })
      .eq('id', request.params.id)

    if (error) return reply.code(500).send({ error: error.message })
    return { ok: true }
  })

  // POST /superadmin/tenants/:id/users — cria usuário em empresa
  fastify.post('/tenants/:id/users', async (request, reply) => {
    const { name, email, password, role = 'agent', is_company_admin = false } = request.body
    if (!name || !email || !password) {
      return reply.code(400).send({ error: 'nome, email e senha são obrigatórios' })
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) return reply.code(400).send({ error: authError.message })

    const { data, error } = await supabase
      .from('users')
      .insert({
        tenant_id: request.params.id,
        supabase_auth_id: authData.user.id,
        name,
        email,
        role,
        is_company_admin,
        active: true,
      })
      .select()
      .single()

    if (error) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return reply.code(500).send({ error: error.message })
    }

    return reply.code(201).send(data)
  })

  // PATCH /superadmin/users/:id/promote — promove/rebaixa a company admin
  fastify.patch('/users/:id/promote', async (request, reply) => {
    const { is_company_admin } = request.body

    const { data, error } = await supabase
      .from('users')
      .update({ is_company_admin: !!is_company_admin })
      .eq('id', request.params.id)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // GET /superadmin/stats — estatísticas globais
  fastify.get('/stats', async (request, reply) => {
    const [tenantsRes, usersRes, ticketsRes] = await Promise.all([
      supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('tickets').select('id', { count: 'exact', head: true })
        .gte('opened_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    ])

    return {
      active_tenants: tenantsRes.count || 0,
      active_users: usersRes.count || 0,
      tickets_last_30d: ticketsRes.count || 0,
    }
  })
}
