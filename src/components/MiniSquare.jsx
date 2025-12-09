import './MiniSquare.css'

function MiniSquare({ value, onClick, isWinningSquare }) {
  return (
    <button 
      className={`mini-square ${isWinningSquare ? 'mini-winning-square' : ''}`} 
      onClick={onClick}
      disabled={value !== null}
    >
      {value}
    </button>
  )
}

export default MiniSquare
