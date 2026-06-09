'use client'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'

const NAV = [
  { icon: '🏢', label: 'Geral' },
  { icon: '📱', label: 'WhatsApp / N8N' },
  { icon: '🤖', label: 'IA' },
  { icon: '📅', label: 'Agenda' },
  { icon: '🔒', label: 'Permissões' },
  { icon: '🔔', label: 'Notificações' },
  { icon: '🔗', label: 'Webhooks' },
]

const MODULES = [
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'fila_bot',    label: 'Fila do Bot' },
  { key: 'agenda',      label: 'Agenda' },
  { key: 'itens',       label: 'Itens' },
  { key: 'admin',       label: 'Admin' },
  { key: 'config',      label: 'Configurações' },
]

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
        {label}{hint && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', marginLeft: 4 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}
function Input(props) {
  return <input {...props} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit', boxSizing: 'border-box', ...props.style }} />
}
function Textarea(props) {
  return <textarea {...props} rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 80, fontFamily: 'inherit', background: 'var(--bg2)', color: 'var(--text1)', lineHeight: 1.5, boxSizing: 'border-box', ...props.style }} />
}
function Select(props) {
  return <select {...props} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', cursor: 'pointer', fontFamily: 'inherit', ...props.style }} />
}
function SaveBtn({ onClick, label = 'Salvar alterações', disabled }) {
  return <button onClick={onClick} disabled={disabled} style={{ padding: '9px 22px', background: disabled ? 'var(--border2)' : 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 8 }}>{label}</button>
}

const defaultPerms = () => Object.fromEntries(MODULES.map(m => [m.key, { view: false, edit: false }]))

export default function ConfigPage() {
  const [nav, setNav] = useState(0)
  const [tenant, setTenant] = useState(null)
  const [integrations, setIntegrations] = useState([])
  const [testResults, setTestResults] = useState({})
  const [showKey, setShowKey] = useState({})
  const [aiKey, setAiKey] = useState('')
  const [aiModel, setAiModel] = useState('claude-sonnet-4-6')
  const [aiProvider, setAiProvider] = useState('anthropic')

  // Permissions state
  const [profiles, setProfiles] = useState([])
  const [selectedProfile, setSelectedProfile] = useState(null) // null = new
  const [profileForm, setProfileForm] = useState({ name: '', permissions: defaultPerms() })
  const [profSaving, setProfSaving] = useState(false)

  useEffect(() => {
    api.admin.tenant().then(setTenant).catch(() => {})
    api.integrations.list().then(setIntegrations).catch(() => {})
    api.permissions.list().then(setProfiles).catch(() => {})
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
    const existing = integrations.find(i => ['anthropic','openai','deepseek'].includes(i.type))
    if (existing) {
      await api.integrations.patch(existing.id, { api_key: aiKey, config_json: { model: aiModel } })
    } else {
      const labels = { anthropic: 'Claude (Anthropic)', openai: 'GPT-4o (OpenAI)', deepseek: 'DeepSeek' }
      await api.integrations.create({ type: aiProvider, label: labels[aiProvider], api_key: aiKey, config_json: { model: aiModel } })
    }
    api.integrations.list().then(setIntegrations)
    alert('API key salva!')
  }

  function selectProfile(p) {
    setSelectedProfile(p)
    if (p) {
      setProfileForm({ name: p.name, permissions: { ...defaultPerms(), ...p.permissions } })
    } else {
      setProfileForm({ name: '', permissions: defaultPerms() })
    }
  }

  function togglePerm(moduleKey, right) {
    setProfileForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: { ...prev.permissions[moduleKey], [right]: !prev.permissions[moduleKey][right] }
      }
    }))
  }

  async function saveProfile() {
    if (!profileForm.name.trim()) return alert('Informe o nome do perfil')
    setProfSaving(true)
    try {
      if (selectedProfile) {
        await api.permissions.patch(selectedProfile.id, profileForm)
      } else {
        await api.permissions.create(profileForm)
      }
      const updated = await api.permissions.list()
      setProfiles(updated)
      selectProfile(null)
    } catch (e) { alert(e.message) }
    setProfSaving(false)
  }

  async function deleteProfile(id) {
    if (!confirm('Excluir este perfil?')) return
    await api.permissions.delete(id)
    setProfiles(prev => prev.filter(p => p.id !== id))
    if (selectedProfile?.id === id) selectProfile(null)
  }

  const n8nIntegration = integrations.find(i => i.type === 'n8n')
  const aiIntegration = integrations.find(i => ['anthropic','openai','deepseek'].includes(i.type))

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Side nav */}
      <div style={{ width: 178, background: 'var(--bg2)', borderRight: '1px solid var(--border)', padding: '12px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', padding: '4px 8px 8px' }}>Configurações</div>
        {NAV.map((item, i) => (
          <div key={i} onClick={() => setNav(i)} style={{
            padding: '7px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: '.1s', marginBottom: 2,
            background: nav === i ? 'var(--brand-light)' : 'transparent',
            color: nav === i ? 'var(--brand)' : 'var(--text3)',
            fontWeight: nav === i ? 600 : 400,
          }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!tenant && nav !== 4 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Carregando…</p>}

        {/* 0: Geral */}
        {nav === 0 && tenant && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Geral</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Informações da empresa e comportamento do atendimento</p>
            <Field label="Nome da empresa">
              <Input value={tenant.name || ''} onChange={e => updateTenant('name', e.target.value)} />
            </Field>
            <Field label="Fuso horário">
              <Select value={tenant.timezone || 'America/Sao_Paulo'} onChange={e => updateTenant('timezone', e.target.value)}>
                <option value="America/Sao_Paulo">América/São Paulo (GMT-3)</option>
                <option value="America/Manaus">América/Manaus (GMT-4)</option>
                <option value="America/Belem">América/Belém (GMT-3)</option>
              </Select>
            </Field>

            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>⏰ Horário do Bot</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Início">
                  <Input type="time" value={tenant.business_hours?.start || '08:00'} onChange={e => updateTenant('business_hours', { ...tenant.business_hours, start: e.target.value })} />
                </Field>
                <Field label="Fim">
                  <Input type="time" value={tenant.business_hours?.end || '18:00'} onChange={e => updateTenant('business_hours', { ...tenant.business_hours, end: e.target.value })} />
                </Field>
              </div>
            </div>

            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>👤 Horário de Atendimento Humano</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Início">
                  <Input type="time" value={tenant.human_hours?.start || '08:00'} onChange={e => updateTenant('human_hours', { ...(tenant.human_hours || {}), start: e.target.value })} />
                </Field>
                <Field label="Fim">
                  <Input type="time" value={tenant.human_hours?.end || '18:00'} onChange={e => updateTenant('human_hours', { ...(tenant.human_hours || {}), end: e.target.value })} />
                </Field>
              </div>
            </div>

            <Field label="Mensagem de boas-vindas">
              <Textarea value={tenant.welcome_message || ''} onChange={e => updateTenant('welcome_message', e.target.value)} />
            </Field>
            <Field label="Mensagem fora do horário">
              <Textarea value={tenant.out_of_hours_message || ''} onChange={e => updateTenant('out_of_hours_message', e.target.value)} />
            </Field>
            <SaveBtn onClick={saveTenant} />
          </>
        )}

        {/* 1: WhatsApp / N8N */}
        {nav === 1 && tenant && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>WhatsApp / N8N</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Conexão com o N8N e Evolution API</p>
            <Field label="URL do Webhook N8N">
              <Input value={tenant.n8n_webhook_url || ''} placeholder="https://n8n.suaempresa.com/webhook/sirius" onChange={e => updateTenant('n8n_webhook_url', e.target.value)} />
            </Field>
            <Field label="Token de autenticação">
              <div style={{ display: 'flex', gap: 8 }}>
                <Input type={showKey.n8n ? 'text' : 'password'} value={tenant.n8n_webhook_token || ''} placeholder="••••••••••••••••" onChange={e => updateTenant('n8n_webhook_token', e.target.value)} />
                <button onClick={() => setShowKey(p => ({ ...p, n8n: !p.n8n }))} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 12, cursor: 'pointer', color: 'var(--text3)', fontFamily: 'inherit', flexShrink: 0 }}>{showKey.n8n ? '🙈' : '👁'}</button>
              </div>
            </Field>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
              <SaveBtn onClick={saveTenant} label="Salvar" />
              {n8nIntegration && (
                <button onClick={() => testIntegration(n8nIntegration.id)}
                  style={{ padding: '9px 14px', border: '1px solid var(--brand)', borderRadius: 8, background: 'var(--bg2)', color: 'var(--brand)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, marginTop: 8 }}>
                  Testar conexão
                </button>
              )}
            </div>
          </>
        )}

        {/* 2: IA */}
        {nav === 2 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Inteligência Artificial</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Provedor e modelo do agente de IA</p>
            <Field label="Provedor">
              <Select value={aiProvider} onChange={e => { setAiProvider(e.target.value); setAiModel(e.target.value === 'deepseek' ? 'deepseek-chat' : e.target.value === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-6') }}>
                <option value="anthropic">Claude (Anthropic)</option>
                <option value="openai">GPT-4o (OpenAI)</option>
                <option value="deepseek">DeepSeek</option>
              </Select>
            </Field>
            <Field label="Modelo">
              <Select value={aiModel} onChange={e => setAiModel(e.target.value)}>
                {aiProvider === 'anthropic' && <>
                  <option value="claude-sonnet-4-6">claude-sonnet-4-6 (Recomendado)</option>
                  <option value="claude-opus-4-6">claude-opus-4-6 (Mais capaz)</option>
                  <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (Mais rápido)</option>
                </>}
                {aiProvider === 'openai' && <>
                  <option value="gpt-4o">GPT-4o</option>
    0             <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </>}
                {aiProvider === 'deepseek' && <>
                  <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                  <option value="deepseek-reasoner">DeepSeek Reasoner (R1)</option>
                </>}
              </Select>
            </Field>
            <Field label="API Key">
              <div style={{ display: 'flex', gap: 8 }}>
                <Input type={showKey.ai ? 'text' : 'password'} value={aiKey} placeholder={aiIntegration ? '••••••••••••••••' : 'Cole sua API key aqui'} onChange={e => setAiKey(e.target.value)} />
                <button onClick={() => setShowKey(p => ({ ...p, ai: !p.ai }))} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 12, cursor: 'pointer', color: 'var(--text3)', fontFamily: 'inherit', flexShrink: 0 }}>{showKey.ai ? '🙈' : '👁'}</button>
              </div>
            </Field>
            {aiIntegration && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: aiIntegration.active ? '#dcfce7' : '#fee2e2', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: aiIntegration.active ? '#166534' : '#991b1b' }}>
                  {aiIntegration.active ? `✓ IA conectada — ${aiIntegration.type} / ${aiIntegration.config_json?.model || ''}` : '✗ IA com problema de conexão'}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <SaveBtn onClick={saveAiKey} label="Salvar API Key" />
              {aiIntegration && (
                <button onClick={() => testIntegration(aiIntegration.id)}
                  style={{ padding: '9px 14px', border: '1px solid var(--brand)', borderRadius: 8, background: 'var(--bg2)', color: 'var(--brand)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, marginTop: 8 }}>
                  Testar
                </button>
              )}
            </div>
          </>
        )}

        {/* 3: Agenda */}
        {nav === 3 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Agenda</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Sistema de agendamento integrado ao Sirius</p>
            <div style={{ padding: 16, border: '1px solid var(--border)', bo