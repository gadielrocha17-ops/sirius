require('dotenv').config()
const fastify = require('fastify')({ logger: true })

// ── Plugins ──────────────────────────────────────────────────────────────────
fastify.register(require('@fastify/cors'), {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
})
fastify.register(require('@fastify/helmet'))
fastify.register(require('@fastify/rate-limit'), {
  max: 200,
  timeWindow: '1 minute',
})

// ── Routes ───────────────────────────────────────────────────────────────────
fastify.register(require('./src/routes/webhook'),      { prefix: '/webhook' })
fastify.register(require('./src/routes/tickets'),      { prefix: '/tickets' })
fastify.register(require('./src/routes/messages'),     { prefix: '/tickets' })
fastify.register(require('./src/routes/users'),        { prefix: '/users' })
fastify.register(require('./src/routes/integrations'), { prefix: '/integrations' })
fastify.register(require('./src/routes/appointments'), { prefix: '/appointments' })
fastify.register(require('./src/routes/admin'),        { prefix: '/admin' })
fastify.register(require('./src/routes/permissions'),  { prefix: '/permissions' })
fastify.register(require('./src/routes/items'),        { prefix: '/items' })
fastify.register(require('./src/routes/superadmin'),   { prefix: '/superadmin' })

// ── Health check ──────────────────────────────────────────────────────────────
fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3001, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
