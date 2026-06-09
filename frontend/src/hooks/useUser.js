'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { getSupabase } from '../lib/supabase'
import { api } from '../lib/api'

export const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        try {
          const profile = await api.users.me()
          setUser(profile)
        } catch (_) {}
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          const profile = await api.users.me()
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
