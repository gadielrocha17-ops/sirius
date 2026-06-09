/**
 * Serviço de comunicação com o N8N externo.
 * Todas as chamadas partem do backend → N8N via HTTP.
 */

/**
 * Envia um evento de ação ao N8N do tenant.
 * @param {Object} tenant  - objeto tenant com n8n_webhook_url e n8n_webhook_token
 * @param {Object} payload - corpo do evento
 */
async function sendToN8N(tenant, payload) {
  if (!tenant.n8n_webhook_url) {
    console.warn(`[n8n] Tenant ${tenant.id} sem webhook configurado`)
    return
  }

  const headers = { 'Content-Type': 'application/json' }
  if (tenant.n8n_webhook_token) {
    headers['x-sirius-token'] = tenant.n8n_webhook_token
  }

  const res = await fetch(tenant.n8n_webhook_url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tenant_id: tenant.id, ...payload }),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    throw new Error(`N8N retornou ${res.status}: ${await res.text()}`)
  }
  return res.json().catch(() => ({}))
}

/**
 * Envia mensagem de atendente para o cliente via N8N.
 */
async function sendMessage(tenant, sessionId, content, channel = 'whatsapp') {
  return sendToN8N(tenant, { action: 'send_message', session_id: sessionId, content, channel })
}

/**
 * Notifica o N8N que o ticket foi encerrado.
 */
async function closeTicket(tenant, sessionId) {
  return sendToN8N(tenant, { action: 'close', session_id: sessionId })
}

/**
 * Devolve o ticket para o bot.
 */
async function returnToBot(tenant, sessionId) {
  return sendToN8N(tenant, { action: 'return_to_bot', session_id: sessionId })
}

/**
 * Testa a conectividade com o N8N.
 */
async function ping(tenant) {
  return sendToN8N(tenant, { action: 'ping' })
}

module.exports = { sendMessage, closeTicket, returnToBot, ping }
