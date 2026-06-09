const supabase = require('../services/supabase')
const { authenticate, requireAdmin } = require('../middleware/auth')

module.exports = async function userRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /users — lista usuários do tenant
  fastify.get('/', async (request, reply) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, can_see_bot_queue, avatar_color, active, created_at')
      .eq('tenant_id', request.tenantId)
      .order('name')

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // GET /users/online — usuários ativos (para dropdowns)
  fastify.get('/online', async (request, reply) => {
    const { data } = await supabase
      .from('users')
      .select('id, name, avatar_color, role')
      .eq('tenant_id', request.tenantId)
      .eq('active', true)
    return data || []
  })

  // POST /users — cria novo usuário (admin)
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const { name, email, role = 'agent', password, can_see_bot_queue = false, avatar_color } = request.body

    if (!name || !email || !password) {
      return reply.code(400).send({ error: 'nome, email e senha são obrigatórios' })
    }

    // Cria conta no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) return reply.code(400).send({ error: authError.message })

    // Cria perfil na tabela users
    const { data, error } = await supabase
      .from('users')
      .insert({
        tenant_id: request.tenantId,
        supabase_auth_id: authData.user.id,
        name,
        email,
        role,
        can_see_bot_queue,
        avatar_color: avatar_color || '#5B4FF5',
      })
      .select()
      .single()

    if (error) {
      // Limpa auth se insert falhou
      await supabase.auth.admin.deleteUser(authData.user.id)
      return reply.code(500).send({ error: error.message })
    }

    return reply.code(201).send(data)
  })

  // PATCH /users/:id
  fastify.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const allowed = ['name', 'role', 'can_see_bot_queue', 'avatar_color', 'active']
    const updates = Object.fromEntries(
      Object.entries(request.body).filter(([k]) => allowed.includes(k))
    )

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // DELETE /users/:id — desativa (soft delete)
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    if (request.params.id === request.user.id) {
      return reply.code(400).send({ error: 'Você não pode desativar sua própria conta' })
    }

    await supabase
      .from('users')
      .update({ active: false })
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)

    return { ok: true }
  })

  // GET /users/me — perfil do usuário logado
  fastify.get('/me', async (request, reply) => {
    return request.user
  })
}
