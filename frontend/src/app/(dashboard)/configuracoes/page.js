'use client'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'

const NAV = [
  { icon: '🏢', label: 'Geral' },
  { icon: '📱', label: 'WhatsApp / N8N' },
  { icon: '🤖', label: 'Inteligência Artificial' },
  { icon: '📅', label: 'Agenda' },
  { icon: '🔔', label: 'Notificações' },
  { icon: '🔗', label: 'Webhooks' },
]

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{label}{hint && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', marginLeft: 4 }}>{hint}</span>}</label>
      {children}
    </div>
  )
}
function Input(props) {
  return <input {...props} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit', ...props.style }} />
}
function Textarea(props) {
  return <textarea {...props} rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 80, fontFamily: 'inherit', background: 'var(--bg2)', color: 'var(--text1)', lineHeight: 1.5, ...props.style }} />
}
function Select(props) {
  return <select {...props} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', cursor: 'pointer', fontFamily: 'inherit', ...props.style }} />
}
function SaveBtn({ onClick, label = 'Salvar alterações' }) {
  return <button onClick={onClick} style={{ padding: '9px 22px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>{label}</button>
}
function TestBtn({ onClick, label, result }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={onClick} style={{ padding: '7px 14px', border: '1px solid var(--brand)', borderRadius: 8, background: 'var(--bg2)', color: 'var(--brand)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>{label}</button>
      {result && <span style={{ fontSize: 12, color: result.status === 'ok' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{result.status === 'ok' ? '✓ ' : '✗ '}{result.message}</span>}
    </div>
  )
}

export default function ConfigPage() {
  const [nav, setNav] = useState(0)
  const [tenant, setTenant] = useState(null)
  const [integrations, setIntegrations] = useState([])
  const [testResults, setTestResults] = useState({})
  const [showKey, setShowKey] = useState({})
  const [aiKey, setAiKey] = useState('')
  const [aiModel, setAiModel] = useState('claude-sonnet-4-6')

  useEffect(() => {
    api.admin.tenant().then(setTenant).catch(() => {})
    api.integrations.list().then(setIntegrations).catch(() => {})
  }, [])

  function updateTenant(field, value) {
    setTenant(prev => ({ ...prev, [field]: value }))
  }

  async function saveTenant() {
    const { id, created_at, slug, plan, active, ...rest } = tenant
    await api.admin.patchTenant(rest)
    alert('Configurações salvas!')
  }

  async function testIntegration(id) {
    const res = await api.integrations.test(id)
    setTestResults(prev => ({ ...prev, [id]: res }))
    api.integrations.list().then(setIntegrations)
  }

  async function saveAiKey() {
    const existing = integrations.find(i => i.type === 'anthropic' || i.type === 'openai')
    if (existing) {
      await api.integrations.patch(existing.id, { api_key: aiKey, config_json: { model: aiModel } })
    } else {
      await api.integrations.create({ type: 'anthropic', label: 'Claude (Anthropic)', api_key: aiKey, config_json: { model: aiModel } })
    }
    api.integrations.list().then(setIntegrations)
    alert('API key salva!')
  }

  const n8nIntegration = integrations.find(i => i.type === 'n8n')
  const aiIntegration = integrations.find(i => ['anthropic','openai'].includes(i.type))

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Side nav */}
      <div style={{ width: 178, background: 'var(--bg2)', borderRight: '1px solid var(--border)', padding: '12px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', padding: '4px 8px 8px' }}>Configurações</div>
        {NAV.map((item, i) => {
          const dot = i === 1
            ? (tenant?.n8n_webhook_url ? (n8nIntegration?.last_test_status === 'ok' ? 'var(--green)' : n8nIntegration?.last_test_status === 'error' ? 'var(--red)' : 'var(--border2)') : 'var(--border2)')
            : i === 2
            ? (aiIntegration?.active ? 'var(--green)' : 'var(--border2)')
            : 'transparent'
          return (
            <div key={i} onClick={() => setNav(i)} style={{
              padding: '7px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: '.1s', marginBottom: 2,
              background: nav === i ? 'var(--brand-light)' : 'transparent',
              color: nav === i ? 'var(--brand)' : 'var(--text3)',
              fontWeight: nav === i ? 600 : 400,
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
              {dot !== 'transparent' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, marginLeft: 'auto', flexShrink: 0 }} />}
            </div>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!tenant && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Carregando…</p>}

        {/* 0: Geral */}
        {nav === 0 && tenant && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Geral</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Informações da empresa e comportamento do atendimento</p>
            <Field label="Nome da empresa"><Input value={tenant.name || ''} onChange={e => updateTenant('name', e.target.value)} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Fuso horário">
                <Select value={tenant.timezone || 'America/Sao_Paulo'} onChange={e => updateTenant('timezone', e.target.value)}>
                  <option value="America/Sao_Paulo">América/São Paulo (GMT-3)</option>
                  <option value="America/Manaus">América/Manaus (GMT-4)</option>
                  <option value="America/Belem">América/Belém (GMT-3)</option>
                </Select>
              </Field>
              <Field label="Horário — início">
                <Input type="time" value={tenant.business_hours?.start || '08:00'} onChange={e => updateTenant('business_hours', { ...tenant.business_hours, start: e.target.value })} />
              </Field>
            </div>
            <Field label="Mensagem de boas-vindas"><Textarea value={tenant.welcome_message || ''} onChange={e => updateTenant('welcome_message', e.target.value)} /></Field>
            <Field label="Mensagem fora do horário"><Textarea value={tenant.out_of_hours_message || ''} onChange={e => updateTenant('out_of_hours_message', e.target.value)} /></Field>
            <SaveBtn onClick={saveTenant} />
          </>
        )}

        {/* 1: WhatsApp / N8N */}
        {nav === 1 && tenant && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>WhatsApp / N8N</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Conexão com o N8N e Evolution API</p>
            <Field label="Endereço do seu N8N" hint="(URL do webhook)">
              <div style={{ display: 'flex', gap: 8 }}>
                <Input value={tenant.n8n_webhook_url || ''} placeholder="https://n8n.suaempresa.com/webhook/sirius" onChange={e => updateTenant('n8n_webhook_url', e.target.value)} />
              </div>
            </Field>
            <Field label="Token de autenticação">
              <div style={{ display: 'flex', gap: 8 }}>
                <Input type={showKey.n8n ? 'text' : 'password'} value={tenant.n8n_webhook_token || ''} placeholder="••••••••••••••••" onChange={e => updateTenant('n8n_webhook_token', e.target.value)} />
                <button onClick={() => setShowKey(p => ({ ...p, n8n: !p.n8n }))} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 12, cursor: 'pointer', color: 'var(--text3)', fontFamily: 'inherit', flexShrink: 0 }}>{showKey.n8n ? '🙈' : '👁'}</button>
              </div>
            </Field>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
              <SaveBtn onClick={saveTenant} label="Salvar" />
              <TestBtn onClick={() => testIntegration(n8nIntegration?.id || 'new')} label="Testar conexão" result={testResults[n8nIntegration?.id]} />
            </div>
          </>
        )}

        {/* 2: IA */}
        {nav === 2 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Inteligência Artificial</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Provedor e comportamento do agente</p>
            <Field label="Provedor de IA">
              <Select value="anthropic">
                <option value="anthropic">Claude (Anthropic)</option>
                <option value="openai">GPT-4o (OpenAI)</option>
                <option value="gemini">Gemini (Google)</option>
              </Select>
            </Field>
            <Field label="API Key">
              <div style={{ display: 'flex', gap: 8 }}>
                <Input type={showKey.ai ? 'text' : 'password'} value={aiKey} placeholder={aiIntegration ? '••••••••••••••••••••' : 'sk-ant-...'} onChange={e => setAiKey(e.target.value)} />
                <button onClick={() => setShowKey(p => ({ ...p, ai: !p.ai }))} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 12, cursor: 'pointer', color: 'var(--text3)', fontFamily: 'inherit', flexShrink: 0 }}>{showKey.ai ? '🙈' : '👁'}</button>
              </div>
            </Field>
            <Field label="Modelo">
              <Select value={aiModel} onChange={e => setAiModel(e.target.value)}>
                <option value="claude-sonnet-4-6">claude-sonnet-4-6 (Recomendado)</option>
                <option value="claude-opus-4-6">claude-opus-4-6 (Mais capaz)</option>
                <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (Mais rápido)</option>
              </Select>
            </Field>
            {aiIntegration && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: aiIntegration.active ? '#dcfce7' : '#fee2e2', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: aiIntegration.active ? '#166534' : '#991b1b' }}>
                  {aiIntegration.active ? '✓ IA conectada e funcionando' : '✗ IA com problema de conexão'}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <SaveBtn onClick={saveAiKey} label="Salvar API Key" />
              {aiIntegration && <TestBtn onClick={() => testIntegration(aiIntegration.id)} label="Testar" result={testResults[aiIntegration.id]} />}
            </div>
          </>
        )}

        {/* 3: Agenda */}
        {nav === 3 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Agenda</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Sistema de agendamento integrado ao Sirius</p>
            <Field label="Sistema de agendamento">
              <Select>
                <option>Agenda própria do Sirius (padrão)</option>
                <option>Google Agenda</option>
                <option>Calendly</option>
                <option>Nenhum</option>
              </Select>
            </Field>
            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg3)', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Sincronização com Google Agenda</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Cada profissional pode conectar sua própria conta Google na aba Admin → Usuários.</p>
              <button style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Conectar com Google (OAuth2)</button>
            </div>
            <SaveBtn onClick={() => alert('Configurações salvas!')} />
          </>
        )}

        {/* 4: Notificações */}
        {nav === 4 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Notificações</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Alertas por e-mail e relatórios automáticos</p>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Alertar ticket sem atendente</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Recebe alerta quando ticket aguarda X minutos</div>
                </div>
                <div className="tog on" />
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Alertar após</span>
                <select style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 12, fontFamily: 'inherit' }}>
                  <option>5 minutos</option><option>10 minutos</option><option>15 minutos</option><option>30 minutos</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Relatório diário por e-mail</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Resumo de tickets e satisfação às 20h</div>
              </div>
              <div className="tog" />
            </div>
            <SaveBtn onClick={() => alert('Preferências salvas!')} />
          </>
        )}

        {/* 5: Webhooks */}
        {nav === 5 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Webhooks de saída</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Envio de eventos para sistemas externos</p>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              <p style={{ marginBottom: 12 }}>Nenhum webhook configurado</p>
              <button style={{ padding: '8px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Adicionar webhook</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
