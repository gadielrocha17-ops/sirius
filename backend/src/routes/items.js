const supabase = require('../services/supabase')
const { authenticate, requireAdmin } = require('../middleware/auth')

module.exports = async function itemRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /items — lista itens do tenant
  fastify.get('/', async (request, reply) => {
    const { search, active } = request.query

    let query = supabase
      .from('items')
      .select('*')
      .eq('tenant_id', request.tenantId)
      .order('name')

    if (active !== undefined) query = query.eq('active', active === 'true')
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // GET /items/:id
  fastify.get('/:id', async (request, reply) => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (error) return reply.code(404).send({ error: 'Item não encontrado' })
    return data
  })

  // GET /items/:id/movements — histórico de movimentações
  fastify.get('/:id/movements', async (request, reply) => {
    const { data, error } = await supabase
      .from('item_movements')
      .select(`
        id, quantity_change, reason, created_at,
        creator:users!created_by(name)
      `)
      .eq('item_id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // POST /items — cria item (admin)
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const { name, description, price = 0, quantity = 0, unit = 'un' } = request.body
    if (!name) return reply.code(400).send({ error: 'Nome é obrigatório' })

    const { data, error } = await supabase
      .from('items')
      .insert({
        tenant_id: request.tenantId,
        name,
        description,
        price,
        quantity,
        unit,
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })

  // PATCH /items/:id — atualiza item (admin)
  fastify.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const allowed = ['name', 'description', 'price', 'unit', 'active']
    const updates = Object.fromEntries(
      Object.entries(request.body).filter(([k]) => allowed.includes(k))
    )

    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // POST /items/:id/baixa — registra baixa de estoque
  fastify.post('/:id/baixa', async (request, reply) => {
    const { quantity, reason } = request.body
    if (!quantity || quantity <= 0) {
      return reply.code(400).send({ error: 'Quantidade deve ser maior que zero' })
    }

    // Verifica estoque atual
    const { data: item, error: itemErr } = await supabase
      .from('items')
      .select('quantity')
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (itemErr || !item) return reply.code(404).send({ error: 'Item não encontrado' })
    if (item.quantity < quantity) {
      return reply.code(400).send({ error: `Estoque insuficiente. Disponível: ${item.quantity}` })
    }

    // Registra movimentação (negativa)
    await supabase.from('item_movements').insert({
      item_id: request.params.id,
      tenant_id: request.tenantId,
      quantity_change: -quantity,
      reason: reason || 'Baixa manual',
      created_by: request.user.id,
    })

    // Atualiza quantidade
    const { data, error } = await supabase
      .from('items')
      .update({ quantity: item.quantity - quantity })
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // POST /items/:id/entrada — adiciona estoque (admin)
  fastify.post('/:id/entrada', { preHandler: requireAdmin }, async (request, reply) => {
    const { quantity, reason } = request.body
    if (!quantity || quantity <= 0) {
      return reply.code(400).send({ error: 'Quantidade deve ser maior que zero' })
    }

    const { data: item, error: itemErr } = await supabase
      .from('items')
      .select('quantity')
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (itemErr || !item) return reply.code(404).send({ error: 'Item não encontrado' })

    await supabase.from('item_movements').insert({
      item_id: request.params.id,
      tenant_id: request.tenantId,
      quantity_change: quantity,
      reason: reason || 'Entrada de estoque',
      created_by: request.user.id,
    })

    const { data, error } = await supabase
      .from('items')
      .update({ quantity: item.quantity + quantity })
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // DELETE /items/:id — remove item (admin)
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)

    if (error) return reply.code(500).send({ error: error.message })
    return { ok: true }
  })
}
