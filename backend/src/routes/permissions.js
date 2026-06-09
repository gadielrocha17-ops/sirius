const supabase = require('../services/supabase')
const { authenticate, requireAdmin } = require('../middleware/auth')

module.exports = async function permissionRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /permissions — lista perfis do tenant
  fastify.get('/', async (request, reply) => {
    const { data, error } = await supabase
      .from('permission_profiles')
      .select('*')
      .eq('tenant_id', request.tenantId)
      .order('name')

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // GET /permissions/:id
  fastify.get('/:id', async (request, reply) => {
    const { data, error } = await supabase
      .from('permission_profiles')
      .select('*')
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (error) return reply.code(404).send({ error: 'Perfil não encontrado' })
    return data
  })

  // POST /permissions — cria perfil (admin)
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const { name, permissions } = request.body
    if (!name) return reply.code(400).send({ error: 'Nome é obrigatório' })

    const defaultPerms = {
      atendimento: { view: false, edit: false },
      fila_bot:    { view: false, edit: false },
      agenda:      { view: false, edit: false },
      itens:       { view: false, edit: false },
      admin:       { view: false, edit: false },
      config:      { view: false, edit: false },
    }

    const { data, error } = await supabase
      .from('permission_profiles')
      .insert({
        tenant_id: request.tenantId,
        name,
        permissions: permissions || defaultPerms,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })

  // PATCH /permissions/:id — atualiza perfil (admin)
  fastify.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { name, permissions } = request.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (permissions !== undefined) updates.permissions = permissions

    const { data, error } = await supabase
      .from('permission_profiles')
      .update(updates)
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // DELETE /permissions/:id — remove perfil (admin)
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    // Remove vínculo de usuários antes de deletar
    await supabase
      .from('users')
      .update({ permission_profile_id: null })
      .eq('permission_profile_id', request.params.id)
      .eq('tenant_id', request.tenantId)

    const { error } = await supabase
      .from('permission_profiles')
      .delete()
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)

    if (error) return reply.code(500).send({ error: error.message })
    return { ok: true }
  })

  // PATCH /permissions/assign/:userId — atribui perfil a usuário (admin)
  fastify.patch('/assign/:userId', { preHandler: requireAdmin }, async (request, reply) => {
    const { profile_id } = request.body

    const { data, error } = await supabase
      .from('users')
      .update({ permission_profile_id: profile_id || null })
      .eq('id', request.params.userId)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })
}
