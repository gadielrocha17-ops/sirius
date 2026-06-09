const supabase = require('../services/supabase')
const { authenticate, requireAdmin } = require('../middleware/auth')
const { encrypt, decrypt } = require('../services/encryption')
const n8n = require('../services/n8n')

module.exports = async function integrationRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /integrations
  fastify.get('/', async (request, reply) => {
    const { data } = await supabase
      .from('integrations')
      .select('id, type, label, active, last_tested_at, last_test_status, last_test_message, created_at')
      .eq('tenant_id', request.tenantId)
    // Nunca retorna a api_key_encrypted
    return data || []
  })

  // POST /integrations
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const { type, label, api_key, config_json } = request.body
    if (!type) return reply.code(400).send({ error: 'type é obrigatório' })

    const payload = {
      tenant_id: request.tenantId,
      type,
      label: label || type,
      config_json: config_json || {},
    }
    if (api_key) payload.api_key_encrypted = encrypt(api_key)

    const { data, error } = await supabase
      .from('integrations')
      .insert(payload)
      .select('id, type, label, active, created_at')
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(201).send(data)
  })

  // PATCH /integrations/:id
  fastify.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { label, api_key, config_json, active } = request.body
    const updates = {}
    if (label !== undefined) updates.label = label
    if (config_json !== undefined) updates.config_json = config_json
    if (active !== undefined) updates.active = active
    if (api_key) updates.api_key_encrypted = encrypt(api_key)

    const { data, error } = await supabase
      .from('integrations')
      .update(updates)
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .select('id, type, label, active')
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return data
  })

  // DELETE /integrations/:id
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    await supabase
      .from('integrations')
      .delete()
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
    return { ok: true }
  })

  // POST /integrations/:id/test — testa a conexão
  fastify.post('/:id/test', { preHandler: requireAdmin }, async (request, reply) => {
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', request.params.id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (!integration) return reply.code(404).send({ error: 'Integração não encontrada' })

    let testStatus = 'error'
    let testMessage = ''
    const apiKey = integration.api_key_encrypted ? decrypt(integration.api_key_encrypted) : null

    try {
      if (integration.type === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
        })
        testStatus = res.ok ? 'ok' : 'error'
        testMessage = res.ok ? 'Conexão com Anthropic OK' : `Erro ${res.status}`
      }

      else if (integration.type === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
        })
        testStatus = res.ok ? 'ok' : 'error'
        testMessage = res.ok ? 'Conexão com OpenAI OK' : `Erro ${res.status}`
      }

      else if (integration.type === 'n8n') {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('n8n_webhook_url, n8n_webhook_token')
          .eq('id', request.tenantId)
          .single()
        await n8n.ping(tenant)
        testStatus = 'ok'
        testMessage = 'N8N respondeu ao ping'
      }

      else {
        testMessage = `Tipo "${integration.type}" sem teste automático implementado`
        testStatus = 'ok'
      }
    } catch (err) {
      testStatus = 'error'
      testMessage = err.message
    }

    // Salva resultado
    await supabase
      .from('integrations')
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: testStatus,
        last_test_message: testMessage,
        active: testStatus === 'ok',
      })
      .eq('id', integration.id)

    return { status: testStatus, message: testMessage }
  })
}
