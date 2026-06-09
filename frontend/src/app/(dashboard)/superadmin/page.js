'use client'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import { useUser } from '../../../hooks/useUser'
import { useRouter } from 'next/navigation'

const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit', boxSizing: 'border-box' }

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: 460, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text3)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FF({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

export default function SuperAdminPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [tenantDetail, setTenantDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [modal, setModal] = useState(null) // 'newTenant' | 'newUser'
  const [tenantForm, setTenantForm] = useState({ name: '', slug: '', plan: 'starter', whatsapp_number: '' })
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'agent', is_company_admin: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userLoading && user && !user.super_admin) router.push('/atendimento')
  }, [user, userLoading])

  useEffect(() => {
    if (user?.super_admin) {
      Promise.all([
        api.superadmin.stats(),
        api.superadmin.tenants(),
      ]).then(([s, t]) => {
        setStats(s)
        setTenants(t)
        setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [user])

  async function loadTenantDetail(id) {
    setDetailLoading(true)
    const data = await api.superadmin.getTenant(id).catch(() => null)
    setTenantDetail(data)
    setDetailLoading(false)
  }

  function selectTenant(t) {
    setSelectedTenant(t)
    loadTenantDetail(t.id)
  }

  async function createTenant() {
    if (!tenantForm.name.trim() || !tenantForm.slug.trim()) return alert('Nome e slug obrigatórios')
    setSaving(true)
    try {
      await api.superadmin.createTenant(tenantForm)
      const updated = await api.superadmin.tenants()
      setTenants(updated)
      setModal(null)
      setTenantForm({ name: '', slug: '', plan: 'starter', whatsapp_number: '' })
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  async function createUser() {
    if (!userForm.name || !userForm.email || !userForm.password) return alert('Preencha todos os campos')
    setSaving(true)
    try {
      await api.superadmin.createUser(selectedTenant.id, userForm)
      await loadTenantDetail(selectedTenant.id)
      setModal(null)
      setUserForm({ name: '', email: '', password: '', role: 'agent', is_company_admin: false })
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  async function toggleTenantActive(tenant) {
    await api.superadmin.patchTenant(tenant.id, { active: !tenant.active })
    setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, active: !t.active } : t))
    if (tenantDetail?.id === tenant.id) setTenantDetail(prev => ({ ...prev, active: !prev.active }))
  }

  async function promoteUser(userId, current) {
    await api.superadmin.promote(userId, { is_company_admin: !current })
    await loadTenantDetail(selectedTenant.id)
  }

  if (userLoading || loading) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>Carregando…</div>
  }

  if (!user?.super_admin) return null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>🌐 AgentIA — Painel Super Admin</span>
          {stats && (
            <div style={{ display: 'flex', gap: 16, marginLeft: 16 }}>
              <Stat label="Empresas ativas" value={stats.active_tenants} />
              <Stat label="Usuários ativos" value={stats.active_users} />
              <Stat label="Tickets (30d)" value={stats.tickets_last_30d} />
            </div>
          )}
          <button onClick={() => setModal('newTenant')} style={{ marginLeft: 'auto', padding: '7px 14px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Nova empresa
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr', overflow: 'hidden' }}>
        {/* Tenant list */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', padding: '4px 8px 8px' }}>
            Empresas ({tenants.length})
          </div>
          {tenants.map(t => (
            <div key={t.id} onClick={() => selectTenant(t)} style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
              background: selectedTenant?.id === t.id ? 'var(--brand-light)' : 'var(--bg3)',
              border: `1px solid ${selectedTenant?.id === t.id ? 'var(--brand)' : 'var(--border)'}`,
              transition: '.1s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: selectedTenant?.id === t.id ? 'var(--brand)' : 'var(--text1)' }}>{t.name}</span>
                <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: t.active ? '#dcfce7' : '#fee2e2', color: t.active ? '#166534' : '#991b1b' }}>
                  {t.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                {t.slug} · {t.plan}
              </div>
            </div>
          ))}
        </div>

        {/* Tenant detail */}
        <div style={{ overflowY: 'auto', padding: 20 }}>
          {!selectedTenant ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
              Selecione uma empresa para ver os detalhes
            </div>
          ) : detailLoading ? (
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>Carregando…</div>
          ) : tenantDetail ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{tenantDetail.name}</h3>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    slug: {tenantDetail.slug} · plano: {tenantDetail.plan} · {tenantDetail.total_tickets} tickets totais
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setModal('newUser')}
                    style={{ padding: '7px 12px', border: '1px solid var(--brand)', borderRadius: 8, background: 'var(--bg2)', color: 'var(--brand)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    + Usuário
                  </button>
                  <button onClick={() => toggleTenantActive(tenantDetail)}
                    style={{ padding: '7px 12px', border: `1px solid ${tenantDetail.active ? '#dc2626' : '#16a34a'}`, borderRadius: 8, background: 'var(--bg2)', color: tenantDetail.active ? '#dc2626' : '#16a34a', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    {tenantDetail.active ? 'Desativar empresa' : 'Reativar empresa'}
                  </button>
                </div>
              </div>

              {/* Users */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>
                Usuários ({tenantDetail.users?.length || 0})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                    <th style={{ textAlign: 'left', padding: '6px 10px' }}>Nome</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px' }}>E-mail</th>
                    <th style={{ textAlign: 'center', padding: '6px 10px' }}>Role</th>
                    <th style={{ textAlign: 'center', padding: '6px 10px' }}>Adm. master</th>
                    <th style={{ textAlign: 'center', padding: '6px 10px' }}>Status</th>
                    <th style={{ padding: '6px 10px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tenantDetail.users?.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--text3)' }}>{u.email}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: u.role === 'admin' ? '#ede9fe' : 'var(--bg3)', color: u.role === 'admin' ? '#6d28d9' : 'var(--text3)' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <button onClick={() => promoteUser(u.id, u.is_company_admin)}
                          style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            background: u.is_company_admin ? '#dcfce7' : 'var(--bg3)', color: u.is_company_admin ? '#166534' : 'var(--text3)' }}>
                          {u.is_company_admin ? '✓ Sim' : 'Promover'}
                        </button>
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: u.active ? '#dcfce7' : '#fee2e2', color: u.active ? '#166534' : '#991b1b' }}>
                          {u.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px' }}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      </div>

      {/* Modal: Nova empresa */}
      {modal === 'newTenant' && (
        <Modal title="Nova empresa" onClose={() => setModal(null)}>
          <FF label="Nome da empresa *">
            <input value={tenantForm.name} onChange={e => setTenantForm(p => ({ ...p, name: e.target.value }))} placeholder="Empresa XYZ" style={inputStyle} />
          </FF>
          <FF label="Slug (identificador único) *">
            <input value={tenantForm.slug} onChange={e => setTenantForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="empresa-xyz" style={inputStyle} />
          </FF>
          <FF label="Plano">
            <select value={tenantForm.plan} onChange={e => setTenantForm(p => ({ ...p, plan: e.target.value }))} style={inputStyle}>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
            </select>
          </FF>
          <FF label="WhatsApp (opcional)">
            <input value={tenantForm.whatsapp_number} onChange={e => setTenantForm(p => ({ ...p, whatsapp_number: e.target.value }))} placeholder="+55 11 99999-9999" style={inputStyle} />
          </FF>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={createTenant} disabled={saving}
              style={{ flex: 1, padding: 10, background: saving ? 'var(--border2)' : 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Criando…' : 'Criar empresa'}
            </button>
            <button onClick={() => setModal(null)} style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal: Novo usuário */}
      {modal === 'newUser' && (
        <Modal title={`Novo usuário — ${selectedTenant?.name}`} onClose={() => setModal(null)}>
          <FF label="Nome *">
            <input value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" style={inputStyle} />
          </FF>
          <FF label="E-mail *">
            <input type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} placeholder="usuario@empresa.com" style={inputStyle} />
          </FF>
          <FF label="Senha inicial *">
            <input type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" style={inputStyle} />
          </FF>
          <FF label="Perfil">
            <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
              <option value="agent">Agente</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </FF>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input type="checkbox" id="isAdmin" checked={userForm.is_company_admin} onChange={e => setUserForm(p => ({ ...p, is_company_admin: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--brand)' }} />
            <label htmlFor="isAdmin" style={{ fontSize: 13, cursor: 'pointer' }}>Definir como administrador master da empresa</label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={createUser} disabled={saving}
              style={{ flex: 1, padding: 10, background: saving ? 'var(--border2)' : 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Criando…' : 'Criar usuário'}
            </button>
            <button onClick={() => setModal(null)} style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand)' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</div>
    </div>
  )
}
