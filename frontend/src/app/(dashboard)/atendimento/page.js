'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../../lib/api'
import { useUser } from '../../../hooks/useUser'
import { useRealtime, useTicketMessages } from '../../../hooks/useRealtime'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const CHANNEL_CHIPS = {
  whatsapp:  { label: 'WhatsApp', cls: 'chip chip-wa' },
  instagram: { label: 'Instagram', cls: 'chip chip-ig' },
  webchat:   { label: 'Webchat', cls: 'chip chip-open' },
  telegram:  { label: 'Telegram', cls: 'chip chip-bot' },
}
const STATUS_CHIPS = {
  queue:  { label: 'Na fila', cls: 'chip chip-queue' },
  open:   { label: 'Aberto', cls: 'chip chip-open' },
  bot:    { label: 'Bot', cls: 'chip chip-bot' },
  closed: { label: 'Fechado', cls: 'chip chip-closed' },
}

// ── Sidebar de ticket ──────────────────────────────────────────────────────────
function TicketItem({ ticket, selected, onClick }) {
  const ch = CHANNEL_CHIPS[ticket.channel] || CHANNEL_CHIPS.whatsapp
  const st = STATUS_CHIPS[ticket.status] || STATUS_CHIPS.open
  const relTime = ticket.opened_at
    ? formatDistanceToNow(new Date(ticket.opened_at), { locale: ptBR, addSuffix: false })
    : ''

  return (
    <div onClick={onClick} style={{
      padding: '10px 12px', borderBottom: '1px solid var(--border)',
      cursor: 'pointer', transition: '.1s',
      background: selected ? 'var(--brand-light)' : 'var(--bg2)',
      borderLeft: selected ? '3px solid var(--brand)' : '3px solid transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{ticket.contact_name || ticket.contact_phone}</span>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{relTime}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
        {ticket.last_message || 'Sem mensagens'}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <span className={ch.cls}>{ch.label}</span>
        <span className={st.cls}>{st.label}</span>
      </div>
    </div>
  )
}

// ── Balão de mensagem ──────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isAgent = msg.sender_type === 'agent'
  const isBot   = msg.sender_type === 'bot'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignSelf: isAgent ? 'flex-end' : 'flex-start', maxWidth: '72%', gap: 2 }}>
      {isBot && (
        <span style={{ fontSize: 10, color: 'var(--bot)', fontWeight: 600 }}>🤖 Agente IA</span>
      )}
      {isAgent && msg.sender?.name && (
        <span style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'right' }}>{msg.sender.name}</span>
      )}
      <div className={`bubble ${isAgent ? 'bag' : isBot ? 'bbot' : 'bcu'}`}>
        {msg.content}
      </div>
      <span style={{ fontSize: 10, color: 'var(--text3)', textAlign: isAgent ? 'right' : 'left' }}>
        {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
      </span>
    </div>
  )
}

// ── Painel direito ─────────────────────────────────────────────────────────────
function TicketPanel({ ticket, onClose, onReturnToBot, onAssign }) {
  if (!ticket) return (
    <div style={{ width: 256, borderLeft: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <p style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: 20 }}>Selecione um ticket para ver os detalhes</p>
    </div>
  )

  const duration = ticket.opened_at
    ? formatDistanceToNow(new Date(ticket.opened_at), { locale: ptBR, addSuffix: false })
    : '—'

  return (
    <div style={{ width: 256, borderLeft: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0, overflowY: 'auto' }}>
      <Section label="Contato">
        <strong style={{ fontSize: 14 }}>{ticket.contact_name || ticket.contact_phone}</strong>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{ticket.contact_phone}</p>
      </Section>
      <Section label="Ticket">
        <Row l="Aberto há" v={duration} />
        <Row l="Canal" v={<span className={`chip ${CHANNEL_CHIPS[ticket.channel]?.cls?.split(' ')[1]}`}>{CHANNEL_CHIPS[ticket.channel]?.label}</span>} />
        <Row l="Status" v={<span className={`chip ${STATUS_CHIPS[ticket.status]?.cls?.split(' ')[1]}`}>{STATUS_CHIPS[ticket.status]?.label}</span>} />
        {ticket.assignee && <Row l="Atendente" v={ticket.assignee.name} />}
      </Section>
      <Section label="Ações">
        <ABtn icon="🤖" label="Devolver ao bot" onClick={() => onReturnToBot(ticket.id)} />
        <ABtn icon="👤" label="Atribuir para mim" onClick={() => onAssign(ticket.id)} />
        <ABtn icon="✕" label="Encerrar" danger onClick={() => onClose(ticket.id)} />
      </Section>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  )
}
function Row({ l, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
      <span style={{ color: 'var(--text3)' }}>{l}</span>
      <span style={{ fontWeight: 500 }}>{v}</span>
    </div>
  )
}
function ABtn({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '8px 10px', borderRadius: 8,
      border: `1px solid ${danger ? '#fee2e2' : 'var(--border)'}`,
      background: 'var(--bg2)', cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5,
      color: danger ? 'var(--red)' : 'var(--text1)', fontSize: 12, fontFamily: 'inherit', transition: '.1s'
    }}>{icon} {label}</button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AtendimentoPage() {
  const { user } = useUser()
  const [tickets, setTickets] = useState([])
  const [activeTab, setActiveTab] = useState('mine')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const selectedTicket = tickets.find(t => t.id === selectedId)

  // Carrega tickets
  const loadTickets = useCallback(async () => {
    try {
      const params = {}
      if (activeTab === 'mine' && user) params.assigned_to = user.id
      if (search) params.search = search
      const res = await api.tickets.list(params)
      setTickets(res.data || [])
    } catch (e) { console.error(e) }
  }, [activeTab, search, user])

  useEffect(() => { loadTickets() }, [loadTickets])

  // Realtime
  useRealtime(user?.tenant_id, {
    onTicketChange: () => loadTickets(),
    onNewMessage: (payload) => {
      if (payload.new.ticket_id === selectedId) {
        setMessages(prev => [...prev, payload.new])
      }
    }
  })

  // Carrega mensagens ao selecionar ticket
  useEffect(() => {
    if (!selectedId) return
    api.messages.list(selectedId).then(setMessages).catch(console.error)
  }, [selectedId])

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!input.trim() || !selectedId || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    try {
      const msg = await api.messages.send(selectedId, text)
      setMessages(prev => [...prev, msg])
    } catch (e) { setInput(text) }
    setSending(false)
  }

  async function handleClose(id) {
    if (!confirm('Encerrar este atendimento?')) return
    await api.tickets.close(id)
    loadTickets()
    if (selectedId === id) { setSelectedId(null); setMessages([]) }
  }

  async function handleReturnToBot(id) {
    await api.tickets.returnToBot(id)
    loadTickets()
  }

  async function handleAssign(id) {
    await api.tickets.assign(id)
    loadTickets()
  }

  const filtered = tickets.filter(t =>
    !search || t.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.contact_phone?.includes(search)
  )

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* LEFT: ticket list */}
      <div style={{ width: 272, borderRight: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Atendimentos</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px' }}>
            <span style={{ color: 'var(--text3)' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nome ou número…"
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--text1)', width: '100%', fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>
          {[['mine','Meus'],['all','Todos'],['queue','Na fila']].map(([val, label]) => (
            <button key={val} onClick={() => setActiveTab(val)}
              style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', border: 'none', transition: '.12s',
                background: activeTab === val ? 'var(--brand-light)' : 'transparent',
                color: activeTab === val ? 'var(--brand)' : 'var(--text3)',
                fontWeight: activeTab === val ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p style={{ padding: 20, color: 'var(--text3)', fontSize: 12, textAlign: 'center' }}>Nenhum atendimento</p>
          )}
          {filtered.map(t => (
            <TicketItem key={t.id} ticket={t}
              selected={selectedId === t.id}
              onClick={() => setSelectedId(t.id)} />
          ))}
        </div>
      </div>

      {/* CENTER: chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', minWidth: 0 }}>
        {selectedTicket ? (
          <>
            <div style={{ padding: '11px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {(selectedTicket.contact_name || selectedTicket.contact_phone).slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedTicket.contact_name || selectedTicket.contact_phone}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{selectedTicket.contact_phone} · {CHANNEL_CHIPS[selectedTicket.channel]?.label}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
                <textarea
                  rows={1} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Digite… (Enter para enviar)"
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, resize: 'none', maxHeight: 80, fontFamily: 'inherit', color: 'var(--text1)' }}
                />
                <button onClick={sendMessage} disabled={sending}
                  style={{ width: 34, height: 34, borderRadius: 8, background: sending ? 'var(--border2)' : 'var(--brand)', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  ➤
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Selecione um atendimento para começar</p>
          </div>
        )}
      </div>

      {/* RIGHT: ticket panel */}
      <TicketPanel ticket={selectedTicket} onClose={handleClose} onReturnToBot={handleReturnToBot} onAssign={handleAssign} />
    </div>
  )
}
