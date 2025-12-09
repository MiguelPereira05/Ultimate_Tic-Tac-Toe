import { supabase } from './supabaseClient'

// Check if username is available
export const checkUsernameAvailability = async (username) => {
  try {
    const { data, error, count } = await supabase
      .from('profiles')
      .select('username', { count: 'exact', head: false })
      .ilike('username', username)

    // If table doesn't exist, return error
    if (error) {
      console.error('Error checking username:', error)
      // Table might not exist yet
      if (error.code === '42P01' || error.message.includes('relation "public.profiles" does not exist')) {
        return { 
          available: false, 
          error: 'Profiles table not set up. Please run the SQL setup in Supabase Dashboard.' 
        }
      }
      return { available: false, error: error.message }
    }

    // Check if any results were found
    if (data && data.length > 0) {
      return { available: false, error: 'Username is already taken' }
    }

    // Username is available
    return { available: true, error: null }
  } catch (err) {
    console.error('Exception checking username:', err)
    return { available: false, error: err.message }
  }
}

// Create user profile manually (fallback if trigger doesn't work)
export const createUserProfile = async (userId, username) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ id: userId, username: username }])
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error.message }
  }
}

// Get user profile by user ID
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error.message }
  }
}

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error.message }
  }
}

// Ensure user profile exists (create or update)
export const ensureUserProfile = async (userId, username) => {
  try {
    // First check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (existing) {
      // Update username if different
      if (existing.username !== username) {
        const { data, error } = await supabase
          .from('profiles')
          .update({ username })
          .eq('id', userId)
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      }
      return { data: existing, error: null }
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ id: userId, username }])
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    }
  } catch (error) {
    console.error('Error ensuring profile:', error)
    return { data: null, error: error.message }
  }
}
