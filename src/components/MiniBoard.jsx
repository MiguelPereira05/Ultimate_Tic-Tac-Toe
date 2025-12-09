import MiniSquare from './MiniSquare'
import { calculateWinner } from '../utils/gameLogic'
import './MiniBoard.css'

function MiniBoard({ squares, onPlay, boardIndex, isWinningBoard, mainBoardWinner, isActive, isGameOver }) {
  const result = calculateWinner(squares)
  const winner = result ? result.winner : null
  const winningLine = result ? result.line : []
  
  const isBoardComplete = winner || squares.every(square => square !== null)

  function handleClick(squareIndex) {
    if (squares[squareIndex] || winner || mainBoardWinner) {
      return
    }
    onPlay(boardIndex, squareIndex)
  }

  // If this mini-board has a winner, show it large
  if (winner) {
    return (
      <div className={`mini-board won ${isWinningBoard ? 'winning-board' : ''} ${isActive ? 'active' : 'inactive'} ${isGameOver ? 'game-over' : ''}`}>
        <div className="mini-board-winner">{winner}</div>
      </div>
    )
  }

  return (
    <div className={`mini-board ${isBoardComplete ? 'complete' : ''} ${isWinningBoard ? 'winning-board' : ''} ${isActive ? 'active' : 'inactive'} ${isGameOver ? 'game-over' : ''}`}>
      <div className="mini-board-grid">
        {[0, 1, 2].map(row => (
          <div key={row} className="mini-board-row">
            {[0, 1, 2].map(col => {
              const i = row * 3 + col
              return (
                <MiniSquare
                  key={i}
                  value={squares[i]}
                  onClick={() => handleClick(i)}
                  isWinningSquare={winningLine.includes(i)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default MiniBoard
