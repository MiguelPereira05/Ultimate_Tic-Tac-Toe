import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getUserProfile, ensureUserProfile, updateUserProfile } from '../../lib/profileService'
import { getFriends, getPendingRequests, acceptFriendRequest, rejectFriendRequest, removeFriend } from '../../lib/friendService'
import { getPendingInvitations, getActiveGames, acceptGameInvitation, declineGameInvitation, createGameChallenge, getUserStats } from '../../lib/gameService'
import AddFriendModal from '../AddFriend/AddFriendModal'
import './Profile.css'

function Profile({ user, onStartGame, onLogout, onJoinGame }) {
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [gameInvitations, setGameInvitations] = useState([])
  const [activeGames, setActiveGames] = useState([])
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [stats, setStats] = useState({ gamesPlayed: 0, wins: 0, losses: 0, winRate: 0 })
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')

  useEffect(() => {
    loadProfile()
    loadFriends()
    loadPendingRequests()
    loadGameInvitations()
    loadActiveGames()
    loadStats()
  }, [authUser])

  const loadProfile = async () => {
    if (authUser) {
      // Ensure profile exists with current username
      const username = authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User'
      const { data } = await ensureUserProfile(authUser.id, username)
      
      if (data) {
        setProfile(data)
      }
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    const friendsList = await getFriends()
    setFriends(friendsList)
  }

  const loadPendingRequests = async () => {
    const requests = await getPendingRequests()
    setPendingRequests(requests)
  }

  const loadStats = async () => {
    if (authUser) {
      const result = await getUserStats(authUser.id)
      if (result.success) {
        setStats(result.stats)
      }
    }
  }

  const loadGameInvitations = async () => {
    const invitations = await getPendingInvitations()
    setGameInvitations(invitations)
  }

  const loadActiveGames = async () => {
    const games = await getActiveGames()
    setActiveGames(games)
  }

  const handleChallengePlayer = async (friendId) => {
    setActionLoading(`challenge-${friendId}`)
    const result = await createGameChallenge(friendId)
    if (result.success) {
      alert(result.message)
    } else {
      alert(result.message)
    }
    setActionLoading(null)
  }

  const handleAcceptInvitation = async (gameId) => {
    setActionLoading(`game-${gameId}`)
    const result = await acceptGameInvitation(gameId)
    if (result.success) {
      await loadGameInvitations()
      await loadActiveGames()
    }
    setActionLoading(null)
  }

  const handleDeclineInvitation = async (gameId) => {
    setActionLoading(`game-${gameId}`)
    const result = await declineGameInvitation(gameId)
    if (result.success) {
      await loadGameInvitations()
    }
    setActionLoading(null)
  }

  const handleAcceptRequest = async (requestId) => {
    setActionLoading(requestId)
    const result = await acceptFriendRequest(requestId)
    if (result.success) {
      await loadFriends()
      await loadPendingRequests()
    }
    setActionLoading(null)
  }

  const handleRejectRequest = async (requestId) => {
    setActionLoading(requestId)
    const result = await rejectFriendRequest(requestId)
    if (result.success) {
      await loadPendingRequests()
    }
    setActionLoading(null)
  }

  const handleRemoveFriend = async (friendshipId) => {
    if (confirm('Are you sure you want to remove this friend?')) {
      const result = await removeFriend(friendshipId)
      if (result.success) {
        await loadFriends()
      }
    }
  }

  const handleAddFriendSuccess = () => {
    loadFriends()
    loadPendingRequests()
  }

  const handleEditUsername = () => {
    setNewUsername(profile?.username || user.username)
    setIsEditingUsername(true)
    setUsernameError('')
  }

  const handleCancelEdit = () => {
    setIsEditingUsername(false)
    setNewUsername('')
    setUsernameError('')
  }

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      setUsernameError('Username cannot be empty')
      return
    }

    if (newUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      return
    }

    if (newUsername.length > 20) {
      setUsernameError('Username must be less than 20 characters')
      return
    }

    setActionLoading('save-username')
    const result = await updateUserProfile(authUser.id, { username: newUsername.trim() })
    
    if (result.error) {
      if (result.error.includes('duplicate') || result.error.includes('unique')) {
        setUsernameError('This username is already taken')
      } else {
        setUsernameError('Failed to update username')
      }
      setActionLoading(null)
      return
    }

    // Update local state
    setProfile({ ...profile, username: newUsername.trim() })
    setIsEditingUsername(false)
    setNewUsername('')
    setUsernameError('')
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-user-info">
          <div className="profile-avatar">
            {(profile?.username || user.username).charAt(0).toUpperCase()}
          </div>
          <div className="profile-details">
            {isEditingUsername ? (
              <div className="username-edit">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  className="username-input"
                  maxLength="20"
                />
                <div className="username-edit-actions">
                  <button 
                    className="save-username-btn"
                    onClick={handleSaveUsername}
                    disabled={actionLoading === 'save-username'}
                  >
                    {actionLoading === 'save-username' ? '...' : '✓'}
                  </button>
                  <button 
                    className="cancel-username-btn"
                    onClick={handleCancelEdit}
                    disabled={actionLoading === 'save-username'}
                  >
                    ✕
                  </button>
                </div>
                {usernameError && <p className="username-error">{usernameError}</p>}
              </div>
            ) : (
              <div className="username-display">
                <h1>{profile?.username || user.username}</h1>
                <button className="edit-username-btn" onClick={handleEditUsername} title="Edit username">
                  ✏️
                </button>
              </div>
            )}
            <p className="profile-email">{authUser?.email}</p>
            {user.isGuest && <span className="guest-badge">Guest</span>}
          </div>
        </div>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn primary" onClick={onStartGame}>
              <span className="btn-icon">🎮</span>
              <span>Start Game</span>
            </button>
            <button className="action-btn secondary" onClick={() => setShowAddFriend(true)}>
              <span className="btn-icon">👥</span>
              <span>Add Friend</span>
            </button>
          </div>
        </div>

        {gameInvitations.length > 0 && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Game Invitations</h2>
              <span className="badge">{gameInvitations.length}</span>
            </div>
            <div className="requests-list">
              {gameInvitations.map((invitation) => (
                <div key={invitation.gameId} className="request-item">
                  <div className="request-avatar">
                    🎮
                  </div>
                  <div className="request-info">
                    <div className="request-username">{invitation.challengerName} challenges you!</div>
                    <div className="request-time">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      className="accept-btn"
                      onClick={() => handleAcceptInvitation(invitation.gameId)}
                      disabled={actionLoading === `game-${invitation.gameId}`}
                    >
                      ✓
                    </button>
                    <button 
                      className="reject-btn"
                      onClick={() => handleDeclineInvitation(invitation.gameId)}
                      disabled={actionLoading === `game-${invitation.gameId}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeGames.length > 0 && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Active Games</h2>
              <span className="badge">{activeGames.length}</span>
            </div>
            <div className="requests-list">
              {activeGames.map((game) => (
                <div key={game.gameId} className="request-item">
                  <div className="request-avatar">
                    {game.opponentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="request-info">
                    <div className="request-username">vs {game.opponentName}</div>
                    <div className="request-time">
                      {game.myTurn ? '🟢 Your turn' : '⏳ Waiting...'}
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      className="accept-btn"
                      onClick={() => onJoinGame(game.gameId)}
                      style={{ width: 'auto', padding: '0 12px' }}
                    >
                      Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingRequests.length > 0 && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Friend Requests</h2>
              <span className="badge">{pendingRequests.length}</span>
            </div>
            <div className="requests-list">
              {pendingRequests.map((request) => (
                <div key={request.id} className="request-item">
                  <div className="request-avatar">
                    {request.profiles?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="request-info">
                    <div className="request-username">{request.profiles?.username || 'Unknown'}</div>
                    <div className="request-time">
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      className="accept-btn"
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={actionLoading === request.id}
                    >
                      ✓
                    </button>
                    <button 
                      className="reject-btn"
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={actionLoading === request.id}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="profile-section">
          <div className="section-header">
            <h2>Friends</h2>
            <button className="add-friend-btn" onClick={() => setShowAddFriend(true)}>
              + Add Friend
            </button>
          </div>
          <div className="friends-list">
            {friends.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">👋</span>
                <p>No friends yet</p>
                <p className="empty-subtitle">Add friends to play together!</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="friend-item">
                  <div className="friend-avatar">
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-info">
                    <div className="friend-username">{friend.username}</div>
                    <div className="friend-since">
                      Friends since {new Date(friend.since).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="friend-actions">
                    <button 
                      className="challenge-btn"
                      onClick={() => handleChallengePlayer(friend.friendId)}
                      disabled={actionLoading === `challenge-${friend.friendId}`}
                      title="Challenge to a game"
                    >
                      ⚔️
                    </button>
                    <button 
                      className="remove-friend-btn"
                      onClick={() => handleRemoveFriend(friend.id)}
                      title="Remove friend"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="profile-section">
          <h2>Game Stats</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.gamesPlayed}</div>
              <div className="stat-label">Games Played</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.wins}</div>
              <div className="stat-label">Wins</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.losses}</div>
              <div className="stat-label">Losses</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.winRate}%</div>
              <div className="stat-label">Win Rate</div>
            </div>
          </div>
        </div>
      </div>

      {showAddFriend && (
        <AddFriendModal 
          onClose={() => setShowAddFriend(false)}
          onSuccess={handleAddFriendSuccess}
        />
      )}
    </div>
  )
}

export default Profile
