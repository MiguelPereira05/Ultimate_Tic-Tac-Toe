import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import Game from './components/Game'
import LandingPage from './components/LandingPage/landing'
import Rules from './components/Rules'
import Login from './components/Login'
import SignUp from './components/SignUp'
import Profile from './components/Profile/Profile'
import './App.css'

function App() {
  const { user: authUser, signOut } = useAuth()
  const [currentView, setCurrentView] = useState('landing')
  const [user, setUser] = useState(null)
  const [currentGameId, setCurrentGameId] = useState(null)
  const [confirmationMessage, setConfirmationMessage] = useState('')

  // Handle email confirmation and game ID from URL on page load
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const urlParams = new URLSearchParams(window.location.search)
    const type = hashParams.get('type')
    const gameIdFromUrl = urlParams.get('gameId')
    
    if (type === 'signup') {
      setConfirmationMessage('Email confirmed! You can now log in.')
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname)
      // Redirect to login after a moment
      setTimeout(() => {
        setCurrentView('login')
        setConfirmationMessage('')
      }, 2000)
    }
    
    // If there's a gameId in URL and user is authenticated, join that game
    if (gameIdFromUrl && authUser) {
      setCurrentGameId(gameIdFromUrl)
      setCurrentView('game')
      // Clear the URL parameter
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [authUser])

  // Check if user is authenticated
  useEffect(() => {
    if (authUser) {
      const username = authUser.user_metadata?.username || authUser.email.split('@')[0]
      setUser({ username, isGuest: false, authUser })
      
      // Only redirect to profile if we're on landing/login/signup pages
      if (currentView === 'landing' || currentView === 'login' || currentView === 'signup') {
        setCurrentView('profile')
      }
    }
  }, [authUser])

  const handleLogin = () => {
    setCurrentView('login')
  }

  const handleSignUp = () => {
    setCurrentView('signup')
  }

  const handleViewRules = () => {
    setCurrentView('rules')
  }

  const handlePlayAsGuest = () => {
    setUser({ username: 'Guest', isGuest: true })
    setCurrentView('game')
  }

  const handleBackToLanding = () => {
    setCurrentView('landing')
  }

  const handleLoginSuccess = (username) => {
    setUser({ username, isGuest: false })
    setCurrentView('profile')
  }

  const handleSignUpSuccess = (username) => {
    setUser({ username, isGuest: false })
    setCurrentView('profile')
  }

  const handleStartGame = () => {
    setCurrentGameId(null) // Solo game
    setCurrentView('game')
  }

  const handleJoinGame = (gameId) => {
    setCurrentGameId(gameId) // Multiplayer game
    setCurrentView('game')
  }

  const handleExitGame = () => {
    setCurrentGameId(null)
    if (user && !user.isGuest) {
      setCurrentView('profile')
    } else {
      setCurrentView('landing')
    }
  }

  const handleLogout = async () => {
    if (user && !user.isGuest) {
      await signOut()
    }
    setUser(null)
    setCurrentView('landing')
  }

  return (
    <>
      {confirmationMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--success, #10b981)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontWeight: '500'
        }}>
          {confirmationMessage}
        </div>
      )}
      
      {currentView === 'landing' && (
        <LandingPage 
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          onViewRules={handleViewRules}
          onPlayAsGuest={handlePlayAsGuest}
        />
      )}

      {currentView === 'rules' && (
        <Rules onBack={handleBackToLanding} />
      )}

      {currentView === 'login' && (
        <Login 
          onBack={handleBackToLanding}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentView === 'signup' && (
        <SignUp 
          onBack={handleBackToLanding}
          onSignUpSuccess={handleSignUpSuccess}
        />
      )}

      {currentView === 'profile' && user && !user.isGuest && (
        <Profile 
          user={user} 
          onStartGame={handleStartGame}
          onJoinGame={handleJoinGame}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'game' && user && (
        <Game user={user} onLogout={handleExitGame} gameId={currentGameId} />
      )}
    </>
  )
}

export default App
