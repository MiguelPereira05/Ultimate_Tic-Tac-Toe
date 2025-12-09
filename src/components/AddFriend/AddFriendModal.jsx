import { useState } from 'react'
import { sendFriendRequest } from '../../lib/friendService'
import './AddFriendModal.css'

function AddFriendModal({ onClose, onSuccess }) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!username.trim()) {
      setMessage({ text: 'Please enter a username', type: 'error' })
      return
    }

    setLoading(true)
    setMessage({ text: '', type: '' })

    const result = await sendFriendRequest(username.trim())
    
    setLoading(false)
    
    if (result.success) {
      setMessage({ text: result.message, type: 'success' })
      setUsername('')
      
      // Close modal and refresh after short delay
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } else {
      setMessage({ text: result.message, type: 'error' })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Friend</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-friend-form">
          <div className="form-group">
            <label htmlFor="username">Friend's Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username..."
              disabled={loading}
              autoFocus
            />
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddFriendModal
