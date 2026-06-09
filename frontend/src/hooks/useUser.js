'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { getSupabase } from '../lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sirius-production-1017.up.railway.app'

async function fetchProfile(token) {
  const res = await fetch(API_URL + '/users/me', {
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error('not found')
  return res.json()
}

export const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token) {
        try {
          const profile = await fetchProfile(session.access_token)
          setUser(profile)
        } catch (_) {}
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        try {
          const profile = await fetchProfile(session.access_token)
          setUser(profile)
        } catch (_) {}
      }
      if (event === 'SIGNED_OUT') setUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <UserContext.Provider value={{ user, loading, setUser }}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}
