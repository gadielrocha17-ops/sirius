'use client'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import { useUser } from '../../../hooks/useUser'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PROF_COLORS = ['#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#ef4444']

function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
}

export default function AgendaPage() {
  const { user } = useUser()
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [appointments, setAppointments] = useState([])
  const [professionals, setProfessionals] = useState([])
  const [selectedProf, setSelectedProf] = useState('all')
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newAppt, setNewAppt] = useState({ date: '', time: '09:00', service: '', professional_id: '', contact_name: '', contact_phone: '', notes: '' })

  const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8h–18h
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    api.users.list().then(u => {
      const profs = u.filter(p => p.active)
      setProfessionals(profs)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const start = format(weekStart, "yyyy-MM-dd'T'00:00:00")
    const end   = format(addDays(weekStart, 6), "yyyy-MM-dd'T'23:59:59")
    api.appointments.list({ start, end, ...(selectedProf !== 'all' ? { professional_id: selectedProf } : {}) })
      .then(setAppointments).catch(() => {})
  }, [weekStart, selectedProf])

  async function createAppt() {
    const { date, time, ...rest } = newAppt
    const scheduled_at = `${date}T${time}:00`
    const prof = professionals.find(p => p.id === rest.professional_id)
    await api.appointments.create({ ...rest, scheduled_at, professional_name: prof?.name, created_by: 'agent' })
    setShowModal(false)
    // reload
    const start = format(weekStart, "yyyy-MM-dd'T'00:00:00")
    const end   = format(addDays(weekStart, 6), "yyyy-MM-dd'T'23:59:59")
    api.appointments.list({ start, end }).then(setAppointments)
  }

  function apptStyle(appt, dayIdx, profIdx) {
    const start = new Date(appt.scheduled_at)
    const hour = start.getHours()
    const min  = start.getMinutes()
    const topPx = (hour - 8) * 60 + min
    const heightPx = (appt.duration_minutes || 30) - 2
    const color = PROF_COLORS[profIdx % PROF_COLORS.length]
    const lightColor = color + '22'
    return { position: 'absolute', top: topPx, height: heightPx, left: 3, right: 3, borderRadius: 6, padding: '4px 7px', cursor: 'pointer', background: lightColor, borderLeft: `3px solid ${color}`, zIndex: 5, overflow: 'hidden' }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '10px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['‹','›'].map((a,i) => (
            <button key={a} onClick={() => setWeekStart(i === 0 ? subWeeks(weekStart,1) : addWeeks(weekStart,1))}
              style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>{a}</button>
          ))}
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer', fontSize: 11, color: 'var(--text2)' }}>Hoje</button>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 200 }}>
          {format(weekStart, "d 'de' MMMM", { locale: ptBR })} – {format(addDays(weekStart, 6), "d 'de' MMMM, yyyy", { locale: ptBR })}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Filtrar:</span>
          <button onClick={() => setSelectedProf('all')}
            style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${selectedProf === 'all' ? 'var(--brand)' : 'var(--border)'}`, background: selectedProf === 'all' ? 'var(--brand-light)' : 'var(--bg2)', color: selectedProf === 'all' ? 'var(--brand)' : 'var(--text3)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
            Todos
          </button>
          {professionals.map((p, i) => (
            <button key={p.id} onClick={() => setSelectedProf(p.id)}
              style={{ padding: '4px 10px', borderRadius: 20, border: `2px solid ${selectedProf === p.id ? PROF_COLORS[i % PROF_COLORS.length] : 'var(--border)'}`, background: selectedProf === p.id ? PROF_COLORS[i % PROF_COLORS.length] + '22' : 'var(--bg2)', color: selectedProf === p.id ? PROF_COLORS[i % PROF_COLORS.length] : 'var(--text3)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: PROF_COLORS[i % PROF_COLORS.length], display: 'inline-block' }} />
              {p.name.split(' ')[0]}
            </button>
          ))}
          <button onClick={() => setShowModal(true)}
            style={{ padding: '6px 14px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Novo
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Day headers + grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ width: 56, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {weekDays.map(day => {
                const isToday = isSameDay(day, new Date())
                return (
                  <div key={day.toISOString()} style={{ padding: '8px 6px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {format(day, 'EEE', { locale: ptBR }).slice(0,3)}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, marginTop: 1, ...(isToday ? { background: 'var(--brand)', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : {}) }}>
                      {format(day, 'd')}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'flex', flex: 1 }}>
            <div style={{ width: 56, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4, fontSize: 10, color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
                  {h}h
                </div>
              ))}
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {weekDays.map((day, dayIdx) => {
                const dayAppts = appointments.filter(a => isSameDay(new Date(a.scheduled_at), day))
                const isWeekend = dayIdx >= 5
                return (
                  <div key={day.toISOString()} style={{ borderLeft: '1px solid var(--border)', position: 'relative', opacity: isWeekend ? .45 : 1, pointerEvents: isWeekend ? 'none' : 'auto' }}>
                    {HOURS.map(h => (
                      <div key={h} style={{ height: 60, borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => { setNewAppt(p => ({ ...p, date: format(day,'yyyy-MM-dd'), time: `${String(h).padStart(2,'0')}:00` })); setShowModal(true) }}
                      />
                    ))}
                    {dayAppts.map(appt => {
                      const profIdx = professionals.findIndex(p => p.id === appt.professional_id)
                      return (
                        <div key={appt.id} style={apptStyle(appt, dayIdx, profIdx >= 0 ? profIdx : 0)}
                          onClick={e => { e.stopPropagation(); setSelectedAppt(appt) }}>
                          <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.contact_name}</div>
                          <div style={{ fontSize: 10, opacity: .8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.service}</div>
                          {appt.created_by === 'bot' && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: 'rgba(0,0,0,.1)', display: 'inline-block', marginTop: 2 }}>🤖 Bot</span>}
                        </div>
                      )
                    })}
                    {isSameDay(day, new Date()) && (
                      <div style={{ position: 'absolute', left: 0, right: 0, top: (new Date().getHours() - 8) * 60 + new Date().getMinutes(), height: 2, background: 'var(--red)', zIndex: 20, pointerEvents: 'none' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', position: 'absolute', left: -4, top: -3 }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Appointment panel */}
        {selectedAppt && (
          <div style={{ width: 270, borderLeft: '1px solid var(--border)', background: 'var(--bg2)', padding: 16, overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>Agendamento</h4>
              <button onClick={() => setSelectedAppt(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>×</button>
            </div>
            {[
              ['Paciente', selectedAppt.contact_name],
              ['Telefone', selectedAppt.contact_phone],
              ['Serviço', selectedAppt.service],
              ['Profissional', selectedAppt.professional_name],
              ['Data e hora', format(new Date(selectedAppt.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })],
              ['Duração', `${selectedAppt.duration_minutes} min`],
              ['Origem', selectedAppt.created_by === 'bot' ? '🤖 Agendado pelo bot' : '👤 Agendado manualmente'],
            ].map(([l,v]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 13 }}>{v || '—'}</div>
              </div>
            ))}
            {selectedAppt.notes && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Observações</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{selectedAppt.notes}</div>
              </div>
            )}
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={async () => { await api.appointments.cancel(selectedAppt.id); setSelectedAppt(null); const s=format(weekStart,"yyyy-MM-dd'T'00:00:00"); const e=format(addDays(weekStart,6),"yyyy-MM-dd'T'23:59:59"); api.appointments.list({start:s,end:e}).then(setAppointments) }}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #fee2e2', background: 'var(--bg2)', color: 'var(--red)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✕ Cancelar agendamento
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New appointment modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', borderRadius: 14, width: 480, maxHeight: '85vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Novo Agendamento</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text3)' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Paciente', key: 'contact_name', placeholder: 'Nome do cliente', full: true },
                { label: 'Telefone', key: 'contact_phone', placeholder: '+55 11 99999-0000' },
                { label: 'Data', key: 'date', type: 'date' },
                { label: 'Horário', key: 'time', type: 'time' },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.full ? '1/-1' : undefined }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>{f.label}</label>
                  <input type={f.type || 'text'} placeholder={f.placeholder} value={newAppt[f.key]}
                    onChange={e => setNewAppt(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit' }} />
                </div>
              ))}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>Profissional</label>
                <select value={newAppt.professional_id} onChange={e => setNewAppt(p => ({ ...p, professional_id: e.target.value }))}
                  style={{ width: '100%', padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit' }}>
                  <option value="">Selecionar…</option>
                  {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>Serviço</label>
                <input placeholder="Ex: Consulta Geral" value={newAppt.service}
                  onChange={e => setNewAppt(p => ({ ...p, service: e.target.value }))}
                  style={{ width: '100%', padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', fontSize: 13, cursor: 'pointer', color: 'var(--text2)', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={createAppt} style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
