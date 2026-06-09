'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../lib/api'
import { useUser } from '../../../hooks/useUser'
import { useRealtime } from '../../../hooks/useRealtime'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

const CHANNEL_CHIPS = {
  whatsapp:  { label: 'WhatsApp', cls: 'chip chip-wa' },
  instagram: { label: 'Instagram', cls: 'chip chip-ig' },
  webchat:   { label: 'Webchat', cls: 'chip chip-open' },
}

export default function FilaBotPage() {
  const { user } = useUser()
  const router = useRouter()
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({ active: 0, scheduled: 0, waiting: 0, rate: 0 })

  const load = useCallback(async () => {
    try {
      const res = await api.tickets.list({ status: 'bot' })
      const data = res.data || []
      setTickets(data)
      setStats({
        active: data.length,
        waiting: data.filter(t => /* sem msg recente */ false).length,
        scheduled: 0, // preenchido via admin stats
        rate: 76, // placeholder — usar admin/stats em produção
      })
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { load() }, [load])

  useRealtime(user?.tenant_id, { onTicketChange: load, onNewMessage: load })

  async function assumir(ticketId) {
    await api.tickets.assign(ticketId, user.id)
    router.push('/atendimento')
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Fila do Bot</h2>
        <div style={{ padding: '3px 10px', background: '#dcfce7', color: '#166534', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s infinite', display: 'inline-block' }} />
          Ao vivo
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { v: tickets.length, l: 'Conversas com bot agora', color: 'var(--bot)' },
          { v: stats.scheduled, l: 'Agendamentos feitos hoje', color: 'var(--green)' },
          { v: tickets.filter(t => t.status === 'queue').length, l: 'Aguardando resposta', color: 'var(--orange)' },
          { v: `${stats.rate}%`, l: 'Resolvidos sem humano', color: 'var(--brand)' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color, marginBottom: 2 }}>{c.v}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.l}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600 }}>Conversas ativas com o agente IA</h3>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Atualizado em tempo real</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Contato','Canal','Última mensagem','Tempo','Status',''].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Nenhuma conversa ativa no bot</td></tr>
            )}
            {tickets.map(t => {
              const ch = CHANNEL_CHIPS[t.channel] || CHANNEL_CHIPS.whatsapp
              const age = t.opened_at
                ? formatDistanceToNow(new Date(t.opened_at), { locale: ptBR, addSuffix: false })
                : '—'
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>
                    <strong>{t.contact_name || t.contact_phone}</strong><br />
                    <span style={{ color: 'var(--text3)', fontSize: 10 }}>{t.contact_phone}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}><span className={ch.cls}>{ch.label}</span></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text2)' }}>
                    {t.last_message || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text3)' }}>{age}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: 'var(--green)', fontSize: 11, fontWeight: 600 }}>● Ativo</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => assumir(t.id)}
                      style={{ padding: '4px 12px', borderRadius: 6, background: 'var(--brand)', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                      Assumir
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
