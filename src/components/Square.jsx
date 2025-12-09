import './Square.css'

function Square({ value, onSquareClick, isWinningSquare }) {
  return (
    <button 
      className={`square ${isWinningSquare ? 'winning-square' : ''}`} 
      onClick={onSquareClick}
    >
      {value}
    </button>
  )
}

export default Square
