import { getSupabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function getToken() {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

async function request(method, path, body) {
  const token = await getToken()
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Erro ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  delete: (path)         => request('DELETE', path),

  // Atalhos semânticos
  tickets:      { list: (q) => request('GET', `/tickets?${new URLSearchParams(q || {})}`),
                  get:  (id) => request('GET', `/tickets/${id}`),
                  patch: (id, b) => request('PATCH', `/tickets/${id}`, b),
                  assign: (id, userId) => request('POST', `/tickets/${id}/assign`, { user_id: userId }),
                  returnToBot: (id) => request('POST', `/tickets/${id}/return-to-bot`),
                  close: (id) => request('POST', `/tickets/${id}/close`) },

  messages:     { list: (ticketId) => request('GET', `/tickets/${ticketId}/messages`),
                  send: (ticketId, content) => request('POST', `/tickets/${ticketId}/messages`, { content }) },

  users:        { list: () => request('GET', '/users'),
                  me:   () => request('GET', '/users/me'),
                  create: (b) => request('POST', '/users', b),
                  patch:  (id, b) => request('PATCH', `/users/${id}`, b),
                  delete: (id) => request('DELETE', `/users/${id}`) },

  admin:        { stats: () => request('GET', '/admin/stats'),
                  history: (q) => request('GET', `/admin/history?${new URLSearchParams(q || {})}`),
                  tenant: () => request('GET', '/admin/tenant'),
                  patchTenant: (b) => request('PATCH', '/admin/tenant', b),
                  agentsStatus: () => request('GET', '/admin/agents-status') },

  integrations: { list: () => request('GET', '/integrations'),
                  create: (b) => request('POST', '/integrations', b),
                  patch: (id, b) => request('PATCH', `/integrations/${id}`, b),
                  delete: (id) => request('DELETE', `/integrations/${id}`),
                  test: (id) => request('POST', `/integrations/${id}/test`) },

  appointments: { list: (q) => request('GET', `/appointments?${new URLSearchParams(q || {})}`),
                  create: (b) => request('POST', '/appointments', b),
                  patch: (id, b) => request('PATCH', `/appointments/${id}`, b),
                  cancel: (id) => request('DELETE', `/appointments/${id}`) },
}
