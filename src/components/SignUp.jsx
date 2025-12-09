import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { checkUsernameAvailability } from '../lib/profileService'
import './Login.css'

function SignUp({ onBack, onSignUpSuccess }) {
  const { signUp } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // Basic validation
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    // Check if username is available
    setCheckingUsername(true)
    const { available, error: usernameError } = await checkUsernameAvailability(formData.username)
    setCheckingUsername(false)

    if (!available) {
      setError(usernameError || 'Username is already taken. Please choose another.')
      setLoading(false)
      return
    }

    const { data, error, message } = await signUp(formData.email, formData.password, formData.username)
    
    if (error) {
      setError(error)
      setLoading(false)
    } else if (data?.user) {
      setLoading(false)
      
      // Check if user has a session (auto-confirmed) or needs email confirmation
      if (data.session) {
        // User is auto-confirmed and logged in
        setSuccess(true)
        setTimeout(() => {
          onSignUpSuccess(formData.username)
        }, 1500)
      } else {
        // Email confirmation required
        setError(message || 'Please check your email to confirm your account before logging in.')
      }
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-content">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join the ultimate tic-tac-toe community</p>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a unique username (min 3 chars)"
              required
              disabled={loading}
              minLength={3}
            />
            {checkingUsername && <small className="checking-text">Checking availability...</small>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min 6 characters)"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">Account created! Check your email to verify.</div>}

          <button type="submit" className="auth-submit-btn" disabled={loading || checkingUsername}>
            {loading ? 'Creating Account...' : checkingUsername ? 'Checking...' : 'Create Account'}
          </button>
        </form>

        <button className="auth-back-btn" onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  )
}

export default SignUp
