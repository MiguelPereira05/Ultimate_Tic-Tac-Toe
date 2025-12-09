import './Rules.css'

function Rules({ onBack }) {
  return (
    <div className="rules-container">
      <div className="rules-content">
        <h1 className="rules-title">How to Play Ultimate Tic-Tac-Toe</h1>
        
        <div className="rules-sections">
          <section className="rule-section">
            <h2>🎯 Objective</h2>
            <p>Win three mini-boards in a row (horizontally, vertically, or diagonally) on the main 3×3 grid to win the game!</p>
          </section>

          <section className="rule-section">
            <h2>🎮 Basic Rules</h2>
            <ol>
              <li>Each of the 9 squares contains its own mini tic-tac-toe game</li>
              <li>Players alternate turns placing X's and O's</li>
              <li>Win a mini-board by getting 3 in a row within that square</li>
              <li>Once a mini-board is won, it displays the winner's symbol</li>
            </ol>
          </section>

          <section className="rule-section special">
            <h2>⚡ Special Rule: Move Direction</h2>
            <p className="highlight">
              <strong>Your move determines where your opponent plays next!</strong>
            </p>
            <p>When you play in a specific position within a mini-board (positions 0-8), your opponent must play their next move in the mini-board that corresponds to that position on the main grid.</p>
            <div className="example">
              <p><strong>Example:</strong> If you play in the bottom-center square (position 7) of any mini-board, your opponent must play somewhere in mini-board 7 (bottom-center of the main board).</p>
            </div>
            <p><em>Note: If the required board is already won or full, your opponent can play on any available board.</em></p>
          </section>

          <section className="rule-section">
            <h2>♻️ Draw Rule</h2>
            <p>If a mini-board ends in a draw (all 9 squares filled with no winner), that board automatically resets and becomes playable again!</p>
          </section>

          <section className="rule-section">
            <h2>🏆 Winning</h2>
            <p>The first player to win three mini-boards in a row on the main grid wins the entire game. Winning boards are highlighted with a green glow!</p>
          </section>

          <section className="rule-section">
            <h2>💡 Strategy Tips</h2>
            <ul>
              <li>Plan ahead - think about where your move will send your opponent</li>
              <li>Try to control multiple mini-boards simultaneously</li>
              <li>Don't let your opponent trap you in unfavorable boards</li>
              <li>Watch for opportunities to force your opponent into already-won boards</li>
            </ul>
          </section>
        </div>

        <button className="back-button" onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  )
}

export default Rules
