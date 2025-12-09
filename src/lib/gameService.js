import { supabase } from './supabaseClient'

/**
 * Create a new game challenge
 * @param {string} opponentId - The user ID of the opponent
 * @returns {Promise<{success: boolean, message: string, gameId?: string}>}
 */
export async function createGameChallenge(opponentId) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, message: 'You must be logged in' }
    }

    if (opponentId === user.id) {
      return { success: false, message: 'You cannot challenge yourself' }
    }

    // Initialize empty game state
    const initialState = {
      boards: Array(9).fill(null).map(() => Array(9).fill(null)),
      activeBoard: null,
      miniBoardWinners: Array(9).fill(null)
    }

    const { data, error } = await supabase
      .from('games')
      .insert([{
        player_x_id: user.id,
        player_o_id: opponentId,
        current_turn: 'X',
        game_state: initialState,
        status: 'pending'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating game:', error)
      return { success: false, message: 'Failed to create game challenge' }
    }

    return { success: true, message: 'Challenge sent!', gameId: data.id }
  } catch (error) {
    console.error('Error in createGameChallenge:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

/**
 * Get pending game invitations for current user
 * @returns {Promise<Array>}
 */
export async function getPendingInvitations() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return []
    }

    const { data: games, error } = await supabase
      .from('games')
      .select('id, player_x_id, created_at')
      .eq('player_o_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return []
    }

    if (!games || games.length === 0) {
      return []
    }

    // Get challenger profiles
    const playerIds = games.map(g => g.player_x_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', playerIds)

    // Combine data
    return games.map(game => {
      const profile = profiles?.find(p => p.id === game.player_x_id)
      return {
        gameId: game.id,
        challengerId: game.player_x_id,
        challengerName: profile?.username || 'Unknown',
        createdAt: game.created_at
      }
    })
  } catch (error) {
    console.error('Error in getPendingInvitations:', error)
    return []
  }
}

/**
 * Get active games for current user
 * @returns {Promise<Array>}
 */
export async function getActiveGames() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return []
    }

    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .or(`player_x_id.eq.${user.id},player_o_id.eq.${user.id}`)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching active games:', error)
      return []
    }

    if (!games || games.length === 0) {
      return []
    }

    // Get opponent profiles
    const opponentIds = games.map(g => 
      g.player_x_id === user.id ? g.player_o_id : g.player_x_id
    )
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', opponentIds)

    // Combine data
    return games.map(game => {
      const isPlayerX = game.player_x_id === user.id
      const opponentId = isPlayerX ? game.player_o_id : game.player_x_id
      const profile = profiles?.find(p => p.id === opponentId)
      const myTurn = (isPlayerX && game.current_turn === 'X') || (!isPlayerX && game.current_turn === 'O')

      return {
        gameId: game.id,
        opponentId,
        opponentName: profile?.username || 'Unknown',
        mySymbol: isPlayerX ? 'X' : 'O',
        opponentSymbol: isPlayerX ? 'O' : 'X',
        myTurn,
        currentTurn: game.current_turn,
        gameState: game.game_state,
        updatedAt: game.updated_at
      }
    })
  } catch (error) {
    console.error('Error in getActiveGames:', error)
    return []
  }
}

/**
 * Accept a game invitation
 * @param {string} gameId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function acceptGameInvitation(gameId) {
  try {
    const { error } = await supabase
      .from('games')
      .update({ status: 'active' })
      .eq('id', gameId)

    if (error) {
      console.error('Error accepting invitation:', error)
      return { success: false, message: 'Failed to accept invitation' }
    }

    return { success: true, message: 'Game started!' }
  } catch (error) {
    console.error('Error in acceptGameInvitation:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

/**
 * Decline a game invitation
 * @param {string} gameId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function declineGameInvitation(gameId) {
  try {
    const { error } = await supabase
      .from('games')
      .update({ status: 'cancelled' })
      .eq('id', gameId)

    if (error) {
      console.error('Error declining invitation:', error)
      return { success: false, message: 'Failed to decline invitation' }
    }

    return { success: true, message: 'Invitation declined' }
  } catch (error) {
    console.error('Error in declineGameInvitation:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

/**
 * Make a move in a game
 * @param {string} gameId
 * @param {number} boardIndex
 * @param {number} squareIndex
 * @param {object} newGameState
 * @param {string} nextTurn
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function makeMove(gameId, boardIndex, squareIndex, newGameState, nextTurn) {
  try {
    const { error } = await supabase
      .from('games')
      .update({ 
        game_state: newGameState,
        current_turn: nextTurn,
        last_move_at: new Date().toISOString()
      })
      .eq('id', gameId)

    if (error) {
      console.error('Error making move:', error)
      return { success: false, message: 'Failed to make move' }
    }

    return { success: true, message: 'Move made' }
  } catch (error) {
    console.error('Error in makeMove:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

/**
 * End a game with a winner
 * @param {string} gameId
 * @param {string} winnerId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function endGame(gameId, winnerId) {
  try {
    const { error } = await supabase
      .from('games')
      .update({ 
        status: 'completed',
        winner_id: winnerId
      })
      .eq('id', gameId)

    if (error) {
      console.error('Error ending game:', error)
      return { success: false, message: 'Failed to end game' }
    }

    return { success: true, message: 'Game ended' }
  } catch (error) {
    console.error('Error in endGame:', error)
    return { success: false, message: 'An unexpected error occurred' }
  }
}

/**
 * Get user game statistics
 * @param {string} userId
 * @returns {Promise<{success: boolean, stats: object}>}
 */
export async function getUserStats(userId) {
  try {
    // Get all completed games where user participated
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'completed')
      .or(`player_x_id.eq.${userId},player_o_id.eq.${userId}`)

    if (error) {
      console.error('Error fetching user stats:', error)
      return { success: false, stats: null }
    }

    const gamesPlayed = games.length
    const wins = games.filter(game => game.winner_id === userId).length
    const losses = games.filter(game => game.winner_id && game.winner_id !== userId).length
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0

    return {
      success: true,
      stats: {
        gamesPlayed,
        wins,
        losses,
        winRate
      }
    }
  } catch (error) {
    console.error('Error in getUserStats:', error)
    return { success: false, stats: null }
  }
}

/**
 * Subscribe to game updates
 * @param {string} gameId
 * @param {function} callback
 * @returns {object} subscription
 */
export function subscribeToGame(gameId, callback) {
  return supabase
    .channel(`game:${gameId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'games',
      filter: `id=eq.${gameId}`
    }, callback)
    .subscribe()
}
