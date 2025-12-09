import { supabase } from './supabaseClient'

/**
 * Send a friend request to a user by their username
 * @param {string} targetUsername - The username to send request to
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export async function sendFriendRequest(targetUsername) {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, message: 'You must be logged in' }
    }

    // Find the target user by username
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', targetUsername)
      .maybeSingle()

    console.log('Username search:', { targetUsername, targetProfile, profileError })

    if (profileError) {
      console.error('Error finding user:', profileError)
      return { success: false, message: 'Error searching for user' }
    }

    if (!targetProfile) {
      return { success: false, message: 'User not found' }
    }

    // Check if trying to add yourself
    if (targetProfile.id === user.id) {
      return { success: false, message: 'You cannot add yourself as a friend' }
    }

    // Check if friendship already exists (in either direction)
    const { data: existingFriendship, error: checkError } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${user.id})`)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing friendship:', checkError)
      return { success: false, message: 'Error checking friendship status' }
    }

    if (existingFriendship) {
      if (existingFriendship.status === 'pending') {
        // Check if current user sent the request or received it
        if (existingFriendship.user_id === user.id) {
          return { success: false, message: 'Friend request already sent' }
        } else {
          return { success: false, message: 'This user has already sent you a friend request. Check your pending requests!' }
        }
      } else if (existingFriendship.status === 'accepted') {
        return { success: false, message: 'You are already friends' }
      } else if (existingFriendship.status === 'rejected') {
        return { success: false, message: 'Friend request was previously rejected' }
      }
    }

    // Send the friend request
    const { data, error } = await supabase
      .from('friends')
      .insert([
        {
          user_id: user.id,
          friend_id: targetProfile.id,
          status: 'pending'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error sending friend request:', error)
      return { success: false, message: 'Failed to send friend request' }
    }

    return { 
      success: true, 
      message: `Friend request sent to ${targetProfile.username}!`,
      data 
    }
  } catch (error) {
    console.error('Error in sendFriendRequest:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

/**
 * Get all pending friend requests (received by current user)
 * @returns {Promise<Array>} Array of pending requests with sender info
 */
export async function getPendingRequests() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return []
    }

    // Get friend requests
    const { data: requests, error } = await supabase
      .from('friends')
      .select('id, user_id, created_at')
      .eq('friend_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending requests:', error)
      return []
    }

    if (!requests || requests.length === 0) {
      return []
    }

    // Get profile info for each sender
    const userIds = requests.map(r => r.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)

    // Combine data
    const result = requests.map(request => {
      const profile = profiles?.find(p => p.id === request.user_id)
      return {
        ...request,
        profiles: profile || { username: 'Unknown', id: request.user_id }
      }
    })

    return result
  } catch (error) {
    console.error('Error in getPendingRequests:', error)
    return []
  }
}

/**
 * Get all accepted friends for current user
 * @returns {Promise<Array>} Array of friends with their info
 */
export async function getFriends() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return []
    }

    // Get friendships where current user is either user_id or friend_id
    const { data: friendships, error } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, created_at')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching friends:', error)
      return []
    }

    if (!friendships || friendships.length === 0) {
      return []
    }

    // Get the friend IDs (not current user)
    const friendIds = friendships.map(f => 
      f.user_id === user.id ? f.friend_id : f.user_id
    )

    // Get profile info for all friends
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', friendIds)

    // Combine data
    const friends = friendships.map(friendship => {
      const friendId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id
      const profile = profiles?.find(p => p.id === friendId)
      
      return {
        id: friendship.id,
        friendId: friendId,
        username: profile?.username || 'Unknown',
        since: friendship.created_at
      }
    })

    return friends
  } catch (error) {
    console.error('Error in getFriends:', error)
    return []
  }
}

/**
 * Accept a friend request
 * @param {string} requestId - The ID of the friend request
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function acceptFriendRequest(requestId) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, message: 'You must be logged in' }
    }

    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .eq('friend_id', user.id) // Ensure user can only accept requests sent to them

    if (error) {
      console.error('Error accepting friend request:', error)
      return { success: false, message: 'Failed to accept friend request' }
    }

    return { success: true, message: 'Friend request accepted!' }
  } catch (error) {
    console.error('Error in acceptFriendRequest:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

/**
 * Reject a friend request
 * @param {string} requestId - The ID of the friend request
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function rejectFriendRequest(requestId) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, message: 'You must be logged in' }
    }

    const { error } = await supabase
      .from('friends')
      .update({ status: 'rejected' })
      .eq('id', requestId)
      .eq('friend_id', user.id)

    if (error) {
      console.error('Error rejecting friend request:', error)
      return { success: false, message: 'Failed to reject friend request' }
    }

    return { success: true, message: 'Friend request rejected' }
  } catch (error) {
    console.error('Error in rejectFriendRequest:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

/**
 * Remove a friend (delete friendship)
 * @param {string} friendshipId - The ID of the friendship to remove
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function removeFriend(friendshipId) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, message: 'You must be logged in' }
    }

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    if (error) {
      console.error('Error removing friend:', error)
      return { success: false, message: 'Failed to remove friend' }
    }

    return { success: true, message: 'Friend removed' }
  } catch (error) {
    console.error('Error in removeFriend:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}
