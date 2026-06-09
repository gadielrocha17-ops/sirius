'use client'
import { useState, useEffect } from 'react'
import { getSupabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase injects the session from the URL hash after redirect
    const supabase = getSupabase()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setLoading(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/'), 3000)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, outline: 'none',
    background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit',
    boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
    textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 380, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <SiriusLogo size={32} />
          <span style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(100deg,#3a2db5,#5B4FF5,#9B8CFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Sirius
          </span>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Nova senha</h2>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>
          Defina uma nova senha para sua conta.
        </p>

        {success ? (
          <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#065f46' }}>
            ✅ Senha atualizada com sucesso! Redirecionando para o login…
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>
            Aguardando validação do link…
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nova senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Mínimo 6 caracteres" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Confirmar senha</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                placeholder="Repita a senha" style={inputStyle} />
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#991b1b', marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: 10, background: loading ? 'var(--border2)' : 'var(--brand)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function SiriusLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <defs>
        <linearGradient id="lg1" x1="0" y1="14" x2="28" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a6ef5"/>
          <stop offset="50%" stopColor="#38bfff"/>
          <stop offset="100%" stopColor="#ffffff"/>
        </linearGradient>
        <filter id="glow2"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d="M14 2C14 2 15.2 10 22 14C15.2 18 14 26 14 26C14 26 12.8 18 6 14C12.8 10 14 2 14 2Z" fill="url(#lg1)" filter="url(#glow2)"/>
      <circle cx="20" cy="5" r="1.2" fill="#7dd3fc" opacity="0.9"/>
      <circle cx="24" cy="9" r="0.8" fill="#bae6fd" opacity="0.7"/>
      <circle cx="6" cy="7" r="0.8" fill="#60a5fa" opacity="0.6"/>
      <circle cx="14" cy="14" r="2.5" fill="white" opacity="0.95" filter="url(#glow2)"/>
    </svg>
  )
}
