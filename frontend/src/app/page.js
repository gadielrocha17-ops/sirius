'use client'
import { useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState('login') // 'login' | 'forgot'
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha inválidos. Tente novamente.')
      setLoading(false)
    } else {
      router.push('/atendimento')
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setForgotLoading(true)
    const supabase = getSupabase()
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setForgotLoading(false)
    setForgotSent(true)
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
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <SiriusLogo size={32} />
          <span style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(100deg,#3a2db5,#5B4FF5,#9B8CFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Sirius
          </span>
        </div>

        {view === 'login' ? (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Bem-vindo de volta</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>Entre com sua conta para acessar a plataforma</p>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="seu@email.com" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Senha</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" style={inputStyle} />
              </div>

              <div style={{ textAlign: 'right', marginBottom: 18 }}>
                <button type="button" onClick={() => { setView('forgot'); setError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Esqueci a senha
                </button>
              </div>

              {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#991b1b', marginBottom: 14 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: 10, background: loading ? 'var(--border2)' : 'var(--brand)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'Entrando\u2026' : 'Entrar'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Recuperar senha</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>

            {forgotSent ? (
              <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#065f46', marginBottom: 20 }}>
                \u2705 Link enviado! Verifique sua caixa de entrada.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>E-mail</label>
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
                    placeholder="seu@email.com" style={inputStyle} />
                </div>
                <button type="submit" disabled={forgotLoading}
                  style={{ width: '100%', padding: 10, background: forgotLoading ? 'var(--border2)' : 'var(--brand)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: forgotLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {forgotLoading ? 'Enviando\u2026' : 'Enviar link'}
                </button>
              </form>
            )}

            <button onClick={() => { setView('login'); setForgotSent(false); setForgotEmail('') }}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', marginTop: 16, padding: 0, fontFamily: 'inherit' }}>
              \u2190 Voltar ao login
            </button>
          </>
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
