import MiniBoard from './MiniBoard'
import './Board.css'

function Board({ boards, onPlay, miniBoardWinners, winningBoards, mainWinner, activeBoard }) {
  return (
    <div className="main-board">
      {[0, 1, 2].map(row => (
        <div key={row} className="board-row">
          {[0, 1, 2].map(col => {
            const boardIndex = row * 3 + col
            return (
              <MiniBoard
                key={boardIndex}
                squares={boards[boardIndex]}
                onPlay={onPlay}
                boardIndex={boardIndex}
                isWinningBoard={winningBoards.includes(boardIndex)}
                mainBoardWinner={mainWinner}
                isActive={!mainWinner && (activeBoard === null || activeBoard === boardIndex)}
                isGameOver={!!mainWinner}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default Board
