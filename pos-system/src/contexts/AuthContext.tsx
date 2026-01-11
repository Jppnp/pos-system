import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { syncService } from '../services/SyncService'
import { db } from '../lib/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = async () => {
    // Stop sync service
    syncService.stopPeriodicSync()
    syncService.clearSyncData()

    // Clear all local data when user logs out (Requirement 9.6)
    try {
      await db.clearAllData()
    } catch (error) {
      console.error('Error clearing local database:', error)
    }

    // Clear localStorage
    localStorage.clear()
    
    // Clear sessionStorage
    sessionStorage.clear()

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Start sync service when user is authenticated
      if (session?.user) {
        syncService.startPeriodicSync()
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Start/stop sync service based on auth state
      if (session?.user) {
        syncService.startPeriodicSync()
      } else {
        syncService.stopPeriodicSync()
        syncService.clearSyncData()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Set up 8-hour session timeout
  useEffect(() => {
    if (session) {
      const sessionTimeout = 8 * 60 * 60 * 1000 // 8 hours in milliseconds
      const loginTime = new Date(session.user.last_sign_in_at || session.user.created_at).getTime()
      const currentTime = Date.now()
      const timeElapsed = currentTime - loginTime
      
      if (timeElapsed >= sessionTimeout) {
        // Session has expired, logout immediately
        logout()
        return
      }

      // Set timeout for remaining time
      const remainingTime = sessionTimeout - timeElapsed
      const timeoutId = setTimeout(() => {
        logout()
      }, remainingTime)

      return () => clearTimeout(timeoutId)
    }
  }, [session, logout])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    session,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}