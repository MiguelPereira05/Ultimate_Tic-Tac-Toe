import './landing.css'

function LandingPage({ onLogin, onSignUp, onViewRules, onPlayAsGuest }) {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1 className="landing-title">Ultimate Tic-Tac-Toe</h1>
        <p className="landing-subtitle">Master the game within a game</p>
        
        <div className="landing-buttons">
          <button className="landing-btn primary" onClick={onLogin}>
            Login
          </button>
          <button className="landing-btn secondary" onClick={onSignUp}>
            Create Account
          </button>
          <button className="landing-btn tertiary" onClick={onViewRules}>
            View Rules
          </button>
          <button className="landing-btn ghost" onClick={onPlayAsGuest}>
            Play as Guest
          </button>
        </div>
        
        <div className="landing-features">
          <div className="feature">
            <div className="feature-icon">🎮</div>
            <h3>Strategic Gameplay</h3>
            <p>Every move determines where your opponent plays next</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🏆</div>
            <h3>Win 3 Boards</h3>
            <p>Win three mini-boards in a row to claim victory</p>
          </div>
          <div className="feature">
            <div className="feature-icon">♻️</div>
            <h3>Dynamic Boards</h3>
            <p>Drawn boards reset, keeping the game active</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
