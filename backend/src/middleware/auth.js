const { createClient } = require('@supabase/supabase-js')

// Client anon para verificar tokens vindos do frontend
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
)

/**
 * Middleware de autenticação via JWT do Supabase.
 * Injeta req.user e req.tenantId em cada request autenticado.
 */
async function authenticate(request, reply) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Token de autenticação ausente' })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token)

  if (error || !user) {
    return reply.code(401).send({ error: 'Token inválido ou expirado' })
  }

  // Busca o perfil do usuário no banco
  const supabase = require('../services/supabase')
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_auth_id', user.id)
    .single()

  if (profileError || !profile) {
    return reply.code(403).send({ error: 'Usuário não encontrado no sistema' })
  }

  if (!profile.active) {
    return reply.code(403).send({ error: 'Usuário desativado' })
  }

  request.user = profile
  request.tenantId = profile.tenant_id
}

/**
 * Garante que o usuário tem role=admin.
 */
async function requireAdmin(request, reply) {
  if (request.user?.role !== 'admin') {
    return reply.code(403).send({ error: 'Acesso restrito a administradores' })
  }
}

/**
 * Garante que o usuário tem role=admin ou supervisor.
 */
async function requireSupervisor(request, reply) {
  if (!['admin', 'supervisor'].includes(request.user?.role)) {
    return reply.code(403).send({ error: 'Acesso restrito a supervisores e admins' })
  }
}

module.exports = { authenticate, requireAdmin, requireSupervisor }
