'use client'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import { useUser } from '../../../hooks/useUser'

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: 440, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text3)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)',
  fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }

const emptyForm = { name: '', description: '', price: '', quantity: '', unit: 'un' }

export default function ItensPage() {
  const { user } = useUser()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | 'edit' | 'baixa' | 'entrada' | 'movements'
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [movForm, setMovForm] = useState({ quantity: '', reason: '' })
  const [movements, setMovements] = useState([])
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.is_company_admin

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    setLoading(true)
    const data = await api.items.list().catch(() => [])
    setItems(data)
    setLoading(false)
  }

  function openNew() {
    setForm(emptyForm)
    setSelected(null)
    setModal('new')
  }

  function openEdit(item) {
    setSelected(item)
    setForm({ name: item.name, description: item.description || '', price: item.price, quantity: item.quantity, unit: item.unit || 'un' })
    setModal('edit')
  }

  function openBaixa(item) {
    setSelected(item)
    setMovForm({ quantity: '', reason: '' })
    setModal('baixa')
  }

  function openEntrada(item) {
    setSelected(item)
    setMovForm({ quantity: '', reason: '' })
    setModal('entrada')
  }

  async function openMovements(item) {
    setSelected(item)
    const data = await api.items.movements(item.id).catch(() => [])
    setMovements(data)
    setModal('movements')
  }

  async function saveItem() {
    if (!form.name.trim()) return alert('Nome é obrigatório')
    setSaving(true)
    try {
      const body = { ...form, price: parseFloat(form.price) || 0, quantity: parseInt(form.quantity) || 0 }
      if (modal === 'new') {
        await api.items.create(body)
      } else {
        const { quantity, ...editBody } = body
        await api.items.patch(selected.id, editBody)
      }
      await loadItems()
      setModal(null)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  async function doMovimento(type) {
    const qty = parseInt(movForm.quantity)
    if (!qty || qty <= 0) return alert('Informe uma quantidade válida')
    setSaving(true)
    try {
      if (type === 'baixa') {
        await api.items.baixa(selected.id, { quantity: qty, reason: movForm.reason })
      } else {
        await api.items.entrada(selected.id, { quantity: qty, reason: movForm.reason })
      }
      await loadItems()
      setModal(null)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  async function deleteItem(item) {
    if (!confirm(`Excluir "${item.name}"?`)) return
    await api.items.delete(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>📦 Itens / Produtos</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar item…"
          style={{ ...inputStyle, width: 220 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button onClick={openNew} style={{ padding: '7px 14px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Novo item
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading ? (
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Carregando…</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
            {items.length === 0 ? 'Nenhum item cadastrado.' : 'Nenhum resultado encontrado.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Nome</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Descrição</th>
                <th style={{ textAlign: 'right', padding: '8px 12px' }}>Preço</th>
                <th style={{ textAlign: 'right', padding: '8px 12px' }}>Qtd</th>
                <th style={{ textAlign: 'center', padding: '8px 12px' }}>Status</th>
                <th style={{ padding: '8px 12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: '.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                    {item.price > 0 ? `R$ ${Number(item.price).toFixed(2).replace('.', ',')}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: item.quantity <= 0 ? 'var(--red)' : item.quantity <= 5 ? '#f59e0b' : 'var(--text1)' }}>
                      {item.quantity}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 3 }}>{item.unit}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: item.active ? '#dcfce7' : '#fee2e2', color: item.active ? '#166534' : '#991b1b' }}>
                      {item.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <Btn onClick={() => openMovements(item)} title="Histórico">📋</Btn>
                      <Btn onClick={() => openBaixa(item)} title="Baixa">⬇️</Btn>
                      {isAdmin && <Btn onClick={() => openEntrada(item)} title="Entrada">⬆️</Btn>}
                      {isAdmin && <Btn onClick={() => openEdit(item)} title="Editar">✏️</Btn>}
                      {isAdmin && <Btn onClick={() => deleteItem(item)} title="Excluir" danger>🗑</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {(modal === 'new' || modal === 'edit') && (
        <Modal title={modal === 'new' ? 'Novo item' : `Editar: ${selected?.name}`} onClose={() => setModal(null)}>
          <FormField label="Nome *">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do item" style={inputStyle} />
          </FormField>
          <FormField label="Descrição">
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <FormField label="Preço (R$)">
              <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0,00" style={inputStyle} />
            </FormField>
            {modal === 'new' && (
              <FormField label="Quantidade">
                <input type="number" min="0" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" style={inputStyle} />
              </FormField>
            )}
            <FormField label="Unidade">
              <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="un / kg / m…" style={inputStyle} />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={saveItem} disabled={saving}
              style={{ flex: 1, padding: '10px', background: saving ? 'var(--border2)' : 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Salvando…' : (modal === 'new' ? 'Criar item' : 'Salvar')}
            </button>
            <button onClick={() => setModal(null)} style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>Cancelar</button>
          </div>
        </Modal>
      )}

      {modal === 'baixa' && (
        <Modal title={`Baixa de estoque — ${selected?.name}`} onClose={() => setModal(null)}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Estoque atual: <strong>{selected?.quantity} {selected?.unit}</strong></div>
          <FormField label="Quantidade a baixar">
            <input type="number" min="1" value={movForm.quantity} onChange={e => setMovForm(p => ({ ...p, quantity: e.target.value }))} style={inputStyle} />
          </FormField>
          <FormField label="Motivo (opcional)">
            <input value={movForm.reason} onChange={e => setMovForm(p => ({ ...p, reason: e.target.value }))} placeholder="Ex: venda, uso, quebra…" style={inputStyle} />
          </FormField>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => doMovimento('baixa')} disabled={saving}
              style={{ flex: 1, padding: 10, background: saving ? 'var(--border2)' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Registrando…' : 'Registrar baixa'}
            </button>
            <button onClick={() => setModal(null)} style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>Cancelar</button>
          </div>
        </Modal>
      )}

      {modal === 'entrada' && (
        <Modal title={`Entrada de estoque — ${selected?.name}`} onClose={() => setModal(null)}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Estoque atual: <strong>{selected?.quantity} {selected?.unit}</strong></div>
          <FormField label="Quantidade a adicionar">
            <input type="number" min="1" value={movForm.quantity} onChange={e => setMovForm(p => ({ ...p, quantity: e.target.value }))} style={inputStyle} />
          </FormField>
          <FormField label="Motivo (opcional)">
            <input value={movForm.reason} onChange={e => setMovForm(p => ({ ...p, reason: e.target.value }))} placeholder="Ex: compra, reposição…" style={inputStyle} />
          </FormField>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => doMovimento('entrada')} disabled={saving}
              style={{ flex: 1, padding: 10, background: saving ? 'var(--border2)' : 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Registrando…' : 'Registrar entrada'}
            </button>
            <button onClick={() => setModal(null)} style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>Cancelar</button>
          </div>
        </Modal>
      )}

      {modal === 'movements' && (
        <Modal title={`Histórico — ${selected?.name}`} onClose={() => setModal(null)}>
          {movements.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Nenhuma movimentação registrada.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--text3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Data</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Qtd</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Motivo</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Usuário</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 8px', color: 'var(--text3)' }}>{new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: m.quantity_change < 0 ? '#dc2626' : '#16a34a' }}>
                      {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                    </td>
                    <td style={{ padding: '7px 8px' }}>{m.reason || '—'}</td>
                    <td style={{ padding: '7px 8px', color: 'var(--text3)' }}>{m.creator?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  )
}

function Btn({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg2)', cursor: 'pointer', fontSize: 13, color: danger ? 'var(--red)' : 'var(--text2)', fontFamily: 'inherit' }}>
      {children}
    </button>
  )
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}
