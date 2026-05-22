import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'member' | 'trainer'

export type AuthUser = {
  user: User
  role: UserRole
  memberId: string | null   // set if role = 'member'
  trainerId: string | null  // set if role = 'trainer'
}

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; data: AuthUser }
  | { status: 'unauthenticated' }

type AuthContextValue = {
  authState: AuthState
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAdmin: boolean
  isMember: boolean
  isTrainer: boolean
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetchAuthUser = async (user: User): Promise<AuthUser> => {
  // Fetch role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: UserRole = (profile?.role as UserRole) ?? 'member'

  // Fetch memberId if role is member
  let memberId: string | null = null
  if (role === 'member') {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    memberId = member ? String(member.id) : null
  }

  // Fetch trainerId if role is trainer
  let trainerId: string | null = null
  if (role === 'trainer') {
    const { data: trainer } = await supabase
      .from('trainers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    trainerId = trainer ? String(trainer.id) : null
  }

  return { user, role, memberId, trainerId }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleSession = async (session: Session | null) => {
    if (!session?.user) {
      setAuthState({ status: 'unauthenticated' })
      return
    }

    try {
      const data = await fetchAuthUser(session.user)
      setAuthState({ status: 'authenticated', data })
    } catch {
      setAuthState({ status: 'unauthenticated' })
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setAuthState({ status: 'unauthenticated' })
  }

  const role = authState.status === 'authenticated' ? authState.data.role : null

  return (
    <AuthContext.Provider value={{
      authState,
      signIn,
      signOut,
      isAdmin: role === 'admin',
      isMember: role === 'member',
      isTrainer: role === 'trainer',
    }}>
      {children}
    </AuthContext.Provider>
  )
}
