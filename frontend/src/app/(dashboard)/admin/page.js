'use client'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'

const TABS = ['Visão Geral','Usuários','Histórico','Filas']

export default function AdminPage() {
  const [tab, setTab] = useState(0)
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [users, setUsers] = useState([])
  const [history, setHistory] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [newUser, setNewUser] = useState({ name:'', email:'', role:'agent', password:'', can_see_bot_queue: false })

  useEffect(() => {
    api.admin.stats().then(setStats).catch(() => {})
    api.admin.agentsStatus().then(setAgents).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 1) api.users.list().then(setUsers).catch(() => {})
    if (tab === 2) api.admin.history({ limit: 50 }).then(r => setHistory(r.data || [])).catch(() => {})
  }, [tab])

  async function saveUser() {
    if (editUser) {
      await api.users.patch(editUser.id, { name: newUser.name, role: newUser.role, can_see_bot_queue: newUser.can_see_bot_queue })
    } else {
      await api.users.create(newUser)
    }
    setShowUserModal(false)
    api.users.list().then(setUsers)
  }

  async function toggleUserActive(u) {
    await api.users.patch(u.id, { active: !u.active })
    api.users.list().then(setUsers)
  }

  const ROLE_BADGES = {
    admin:      { label: 'Admin Master', bg: '#fef3c7', color: '#92400e' },
    supervisor: { label: 'Supervisor',   bg: '#dbeafe', color: '#1e40af' },
    agent:      { label: 'Atendente',    bg: 'var(--bg3)', color: 'var(--text2)' },
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ padding: '0 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 0, flexShrink: 0 }}>
        {TABS.map((t, i) => (
          <div key={t} onClick={() => setTab(i)}
            style={{ padding: '12px 15px', fontSize: 13, cursor: 'pointer', borderBottom: `2px solid ${tab === i ? 'var(--brand)' : 'transparent'}`, color: tab === i ? 'var(--brand)' : 'var(--text3)', fontWeight: tab === i ? 600 : 400, transition: '.15s', whiteSpace: 'nowrap' }}>
            {t}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* TAB 0: Visão Geral */}
        {tab === 0 && stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { icon: '🎫', v: stats.tickets_today, l: 'Tickets hoje' },
                { icon: '📅', v: stats.tickets_closed_today, l: 'Fechados hoje' },
                { icon: '🤖', v: `${stats.bot_resolution_rate}%`, l: 'Resolvidos pelo bot' },
                { icon: '⭐', v: stats.avg_satisfaction ? `${stats.avg_satisfaction}/5` : '—', l: 'Satisfação média' },
              ].map((c,i) => (
                <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{c.v}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{c.l}</div>
                </div>
              ))}
            </div>
            {/* Hourly chart */}
            {stats.hourly_volume?.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Volume por hora (hoje)</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                  {stats.hourly_volume.map(h => {
                    const max = Math.max(...stats.hourly_volume.map(x => x.count))
                    const pct = max ? (h.count / max) * 100 : 0
                    return (
                      <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                          <div style={{ width: '100%', height: `${pct}%`, minHeight: 4, background: 'var(--brand)', borderRadius: '4px 4px 0 0' }} />
                        </div>
                        <span style={{ fontSize: 9, color: 'var(--text3)' }}>{h.hour}h</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Agents */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Equipe online</span>
              </div>
              {agents.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: a.avatar_color || 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{(a.name||'').slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{a.open_tickets} tickets abertos</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: a.status === 'attending' ? '#dbeafe' : '#dcfce7', color: a.status === 'attending' ? '#1e40af' : '#166534' }}>
                    {a.status === 'attending' ? 'Em atendimento' : 'Online'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TAB 1: Usuários */}
        {tab === 1 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Usuários & Profissionais</h3>
              <button onClick={() => { setEditUser(null); setNewUser({ name:'',email:'',role:'agent',password:'',can_see_bot_queue:false }); setShowUserModal(true) }}
                style={{ padding: '7px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                + Novo usuário
              </button>
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Usuário','Perfil','Fila bot','Status',''].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const rb = ROLE_BADGES[u.role] || ROLE_BADGES.agent
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.avatar_color||'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{(u.name||'').slice(0,2).toUpperCase()}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12 }}>{u.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: rb.bg, color: rb.color }}>{rb.label}</span></td>
                        <td style={{ padding: '10px 14px' }}>
                          <div className={`tog ${u.can_see_bot_queue ? 'on' : ''}`} onClick={() => api.users.patch(u.id, { can_see_bot_queue: !u.can_see_bot_queue }).then(() => api.users.list().then(setUsers))} />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: u.active ? '#dcfce7' : 'var(--bg3)', color: u.active ? '#166534' : 'var(--text3)' }}>
                            {u.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditUser(u); setNewUser({ name: u.name, email: u.email, role: u.role, can_see_bot_queue: u.can_see_bot_queue, password: '' }); setShowUserModal(true) }}
                              style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg2)', fontSize: 11, cursor: 'pointer', color: 'var(--text1)', fontFamily: 'inherit' }}>Editar</button>
                            <button onClick={() => toggleUserActive(u)}
                              style={{ padding: '4px 10px', border: '1px solid', borderRadius: 6, background: 'var(--bg2)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', borderColor: u.active ? '#fee2e2' : 'var(--border)', color: u.active ? 'var(--red)' : 'var(--text2)' }}>
                              {u.active ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB 2: Histórico */}
        {tab === 2 && (
          <>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 600 }}>Histórico de atendimentos</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Contato','Canal','Data','Atendente','Duração','Nota',''].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Nenhum histórico encontrado</td></tr>
                  )}
                  {history.map(t => {
                    const dur = t.opened_at && t.closed_at
                      ? Math.round((new Date(t.closed_at) - new Date(t.opened_at)) / 60000) + ' min'
                      : '—'
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}><strong>{t.contact_name||t.contact_phone}</strong></td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>{t.channel}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>{t.opened_at ? new Date(t.opened_at).toLocaleDateString('pt-BR') : '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>{t.assignee?.name || 'Bot'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>{dur}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>{t.satisfaction_score ? '⭐'.repeat(t.satisfaction_score) : '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>
                          <button style={{ padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg2)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Ver</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB 3: Filas placeholder */}
        {tab === 3 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>🔀 Gestão de filas — em breve</div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div onClick={() => setShowUserModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', borderRadius: 14, width: 440, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{editUser ? 'Editar usuário' : 'Novo usuário'}</h3>
              <button onClick={() => setShowUserModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text3)' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Nome completo', key: 'name', full: true },
                ...(!editUser ? [{ label: 'E-mail', key: 'email', type: 'email', full: true }] : []),
                ...(!editUser ? [{ label: 'Senha temporária', key: 'password', type: 'password' }] : []),
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.full ? '1/-1' : undefined }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>{f.label}</label>
                  <input type={f.type || 'text'} value={newUser[f.key]} onChange={e => setNewUser(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>Perfil</label>
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit' }}>
                  <option value="agent">Atendente</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin Master</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <div className={`tog ${newUser.can_see_bot_queue ? 'on' : ''}`} onClick={() => setNewUser(p => ({ ...p, can_see_bot_queue: !p.can_see_bot_queue }))} />
                <span style={{ fontSize: 12 }}>Ver fila do bot</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowUserModal(false)} style={{ padding: '8px 18px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', fontSize: 13, cursor: 'pointer', color: 'var(--text2)', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={saveUser} style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {editUser ? 'Salvar' : 'Criar usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
