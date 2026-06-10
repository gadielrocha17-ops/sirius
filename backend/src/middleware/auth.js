const { createClient } = require('@supabase/supabase-js')

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
)

async function authenticate(request, reply) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Token de autenticacao ausente' })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token)

  if (error || !user) {
    return reply.code(401).send({ error: 'Token invalido ou expirado' })
  }

  const supabase = require('../services/supabase')
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_auth_id', user.id)
    .single()

  if (profileError || !profile) {
    return reply.code(403).send({ error: 'Usuario nao encontrado no sistema' })
  }

  if (!profile.active) {
    return reply.code(403).send({ error: 'Usuario desativado' })
  }

  if (profile.permission_profile_id) {
    const { data: permProfile } = await supabase
      .from('permission_profiles')
      .select('permissions')
      .eq('id', profile.permission_profile_id)
      .single()
    profile.permissions = permProfile?.permissions || {}
  } else {
    profile.permissions = {}
  }

  request.user = profile
  request.tenantId = profile.tenant_id
}

async function requireAdmin(request, reply) {
  if (request.user?.role !== 'admin') {
    return reply.code(403).send({ error: 'Acesso restrito a administradores' })
  }
}

async function requireSupervisor(request, reply) {
  if (!['admin', 'supervisor'].includes(request.user?.role)) {
    return reply.code(403).send({ error: 'Acesso restrito a supervisores e admins' })
  }
}

async function requireSuperAdmin(request, reply) {
  if (!request.user?.super_admin) {
    return reply.code(403).send({ error: 'Acesso restrito a super admins (AgentIA)' })
  }
}

function checkPermission(key) {
  return async function (request, reply) {
    const user = request.user
    if (!user) return reply.code(401).send({ error: 'Nao autenticado' })

    if (user.role === 'admin' || user.super_admin) return

    if (key in user) {
      if (!user[key]) return reply.code(403).send({ error: 'Permissao negada para esta acao' })
      return
    }

    if (key.includes('.')) {
      const [modulo, acao] = key.split('.')
      const perms = user.permissions || {}
      if (!perms[modulo]?.[acao]) return reply.code(403).send({ error: 'Permissao negada para esta acao' })
      return
    }

    const perms = user.permissions || {}
    if (!perms[key]) return reply.code(403).send({ error: 'Permissao negada para esta acao' })
  }
}

module.exports = { authenticate, requireAdmin, requireSupervisor, requireSuperAdmin, checkPermission }
