import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

function Login({ onBack, onLoginSuccess }) {
  const { signIn } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

    const { data, error } = await signIn(formData.email, formData.password)
    
    if (error) {
      setError(error)
      setLoading(false)
    } else if (data?.user) {
      const username = data.user.user_metadata?.username || data.user.email.split('@')[0]
      onLoginSuccess(username)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-content">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Login to continue playing</p>
        
        <form className="auth-form" onSubmit={handleSubmit}>
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
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <button className="auth-back-btn" onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  )
}

export default Login
