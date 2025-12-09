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
