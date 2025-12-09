import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sign up with email and password
  const signUp = async (email, password, username) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
          emailRedirectTo: window.location.origin
        }
      })
      
      if (error) throw error
      
      // If user was created, try to create profile manually as fallback
      if (data?.user) {
        try {
          // Try to insert profile (trigger should handle this, but this is a fallback)
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, username: username }])
            .select()
            .single()
          
          // Ignore duplicate key errors (trigger already created it)
          if (profileError && !profileError.message.includes('duplicate')) {
            console.warn('Profile creation warning:', profileError)
          }
        } catch (profileErr) {
          console.warn('Profile creation failed:', profileErr)
        }
      }
      
      // Check if email confirmation is required
      if (data?.user && !data.session) {
        return { 
          data, 
          error: null, 
          message: 'Please check your email to confirm your account' 
        }
      }
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  }

  // Password reset
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
