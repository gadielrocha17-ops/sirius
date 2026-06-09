'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSupabase } from '../../lib/supabase'
import { useUser } from '../../hooks/useUser'

export default function DashboardLayout({ children }) {
  const { user, loading } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const saved = localStorage.getItem('sirius-theme') || 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('sirius-theme', next)
  }

  async function handleLogout() {
    await getSupabase().auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text3)', fontSize: 13 }}>Carregando…</div>
      </div>
    )
  }
  if (!user) return null

  const navItems = [
    { href: '/atendimento', icon: '💬', label: 'Atendimento' },
    ...(user.can_see_bot_queue || user.role !== 'agent'
      ? [{ href: '/fila-bot', icon: '🤖', label: 'Fila do Bot' }] : []),
    { href: '/agenda', icon: '📅', label: 'Agenda' },
    { href: '/itens', icon: '📦', label: 'Itens' },
    ...(user.role !== 'agent'
      ? [{ href: '/admin', icon: '👥', label: 'Admin' }] : []),
    { href: '/configuracoes', icon: '⚙️', label: 'Config', adminOnly: true },
    ...(user.super_admin
      ? [{ href: '/superadmin', icon: '🌐', label: 'AgentIA' }] : []),
  ].filter(item => !item.adminOnly || user.role === 'admin')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* TOP NAV */}
      <nav style={{ height: 48, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 6, flexShrink: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
          <SiriusLogo size={26} />
          <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(100deg,#3a2db5,#5B4FF5,#9B8CFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sirius</span>
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
        {navItems.map(item => (
          <button key={item.href}
            onClick={() => router.push(item.href)}
            style={{ padding: '5px 13px', borderRadius: 7, border: '1px solid', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', transition: '.15s',
              borderColor: pathname.startsWith(item.href) ? 'var(--brand)' : 'var(--border)',
              background: pathname.startsWith(item.href) ? 'var(--brand)' : 'var(--bg2)',
              color: pathname.startsWith(item.href) ? '#fff' : 'var(--text2)' }}>
            {item.icon} {item.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggleTheme}
            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer', fontSize: 14 }}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: user.avatar_color || 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
              {user.name?.slice(0,2).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
            <button onClick={handleLogout} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text3)', padding: 0 }}>Sair</button>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {children}
      </div>
    </div>
  )
}

function SiriusLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <defs>
        <linearGradient id="lgnav" x1="0" y1="14" x2="28" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a6ef5"/>
          <stop offset="50%" stopColor="#38bfff"/>
          <stop offset="100%" stopColor="#ffffff"/>
        </linearGradient>
        <filter id="gnav"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d="M14 2C14 2 15.2 10 22 14C15.2 18 14 26 14 26C14 26 12.8 18 6 14C12.8 10 14 2 14 2Z" fill="url(#lgnav)" filter="url(#gnav)"/>
      <circle cx="20" cy="5" r="1.2" fill="#7dd3fc" opacity="0.9"/>
          <circle cx="14" cy="14" r="2.5" fill="white" opacity="0.95" filter="url(#gnav)"/>
    </svg>
    )
}
