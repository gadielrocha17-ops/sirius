'use client'
import { useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Bem-vindo de volta</h2>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>Entre com sua conta para acessar a plataforma</p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="seu@email.com"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>Senha</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--bg2)', color: 'var(--text1)', fontFamily: 'inherit' }}
            />
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#991b1b', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '10px', background: loading ? 'var(--border2)' : 'var(--brand)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: '.15s' }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
          Problemas para acessar? Entre em contato com o administrador.
        </p>
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
