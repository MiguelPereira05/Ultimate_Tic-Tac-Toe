import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Board from './Board'
import { calculateWinner } from '../utils/gameLogic'
import { findBestMove } from '../utils/botAI'
import { supabase } from '../lib/supabaseClient'
import { makeMove, endGame, subscribeToGame } from '../lib/gameService'
import './Game.css'

function Game({ user, onLogout, gameId }) {
  // Each of the 9 main squares contains its own 9-square mini-game
  // State is an array of 9 mini-boards, each with 9 squares
  const initialState = Array(9).fill(null).map(() => Array(9).fill(null))
  const { user: authUser } = useAuth()
  const [boards, setBoards] = useState(initialState)
  const [xIsNext, setXIsNext] = useState(true)
  const [activeBoard, setActiveBoard] = useState(null) // null means any board can be played
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [gameData, setGameData] = useState(null)
  const [mySymbol, setMySymbol] = useState(null)
  const [opponentName, setOpponentName] = useState('')
  const [loading, setLoading] = useState(true)
  const [isBotThinking, setIsBotThinking] = useState(false)
  const [playWithBot, setPlayWithBot] = useState(true) // Enable bot for solo games

  // Load multiplayer game if gameId is provided
  useEffect(() => {
    if (gameId && authUser) {
      loadMultiplayerGame()
    } else {
      // Solo game
      setIsMultiplayer(false)
      setLoading(false)
    }
  }, [gameId, authUser])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!gameId || !isMultiplayer) return

    const channel = subscribeToGame(gameId, (payload) => {
      console.log('Game update received:', payload)
      const updatedGame = payload.new
      
      if (updatedGame.game_state) {
        setBoards(updatedGame.game_state.boards)
        setActiveBoard(updatedGame.game_state.activeBoard)
        
        const miniBoardWinners = updatedGame.game_state.boards.map(board => {
          const result = calculateWinner(board)
          return result ? result.winner : null
        })
        
        const mainResult = calculateWinner(miniBoardWinners)
        if (mainResult && updatedGame.status === 'active') {
          // Game just ended, update status
          const winnerId = updatedGame.player_x_id === authUser.id && mainResult.winner === 'X' ? authUser.id :
                          updatedGame.player_o_id === authUser.id && mainResult.winner === 'O' ? authUser.id :
                          updatedGame.player_x_id === authUser.id ? updatedGame.player_o_id : updatedGame.player_x_id
          endGame(gameId, winnerId)
        }
      }
      
      setXIsNext(updatedGame.current_turn === 'X')
      setGameData(updatedGame)
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, isMultiplayer, authUser])

  async function loadMultiplayerGame() {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()

      if (error) throw error

      setGameData(data)
      setIsMultiplayer(true)
      
      // Determine my symbol
      const iAmPlayerX = data.player_x_id === authUser.id
      setMySymbol(iAmPlayerX ? 'X' : 'O')
      
      // Get opponent name
      const opponentId = iAmPlayerX ? data.player_o_id : data.player_x_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', opponentId)
        .single()
      
      setOpponentName(profile?.username || 'Opponent')
      
      // Load game state
      if (data.game_state && data.game_state.boards) {
        setBoards(data.game_state.boards)
        setActiveBoard(data.game_state.activeBoard)
      }
      
      setXIsNext(data.current_turn === 'X')
      setLoading(false)
    } catch (error) {
      console.error('Error loading game:', error)
      setLoading(false)
    }
  }

  // Calculate the winner of each mini-board
  const miniBoardWinners = boards.map(board => {
    const result = calculateWinner(board)
    return result ? result.winner : null
  })

  // Calculate the main game winner based on mini-board winners
  const mainResult = calculateWinner(miniBoardWinners)
  const mainWinner = mainResult ? mainResult.winner : null
  const winningBoards = mainResult ? mainResult.line : []

  // Bot AI for solo games - simplified and more reliable
  useEffect(() => {
    let isMounted = true
    
    const executeBotMove = async () => {
      // Safety checks
      if (isMultiplayer || !playWithBot || xIsNext || mainWinner || isBotThinking) {
        return
      }
      
      setIsBotThinking(true)
      
      // Delay for UX
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (!isMounted) {
        setIsBotThinking(false)
        return
      }
      
      try {
        const bestMove = findBestMove(boards, miniBoardWinners, activeBoard, 'O', 'medium')
        
        if (bestMove) {
          const { boardIndex, squareIndex } = bestMove
          
          // Make move directly without calling handlePlay to avoid conflicts
          const nextBoards = boards.map((board, i) => 
            i === boardIndex ? [...board] : [...board]
          )
          
          nextBoards[boardIndex][squareIndex] = 'O'
          
          // Check for draw and reset
          const result = calculateWinner(nextBoards[boardIndex])
          const isDraw = !result && nextBoards[boardIndex].every(square => square !== null)
          if (isDraw) {
            nextBoards[boardIndex] = Array(9).fill(null)
          }
          
          // Determine next active board
          const nextActiveBoard = squareIndex
          const nextBoardResult = calculateWinner(nextBoards[nextActiveBoard])
          const nextBoardWon = nextBoardResult !== null
          const nextBoardFull = nextBoards[nextActiveBoard].every(square => square !== null)
          
          setBoards(nextBoards)
          setActiveBoard(nextBoardWon || nextBoardFull ? null : nextActiveBoard)
          setXIsNext(true) // Player's turn
        }
      } catch (error) {
        console.error('Bot error:', error)
      } finally {
        if (isMounted) {
          setIsBotThinking(false)
        }
      }
    }
    
    executeBotMove()
    
    return () => {
      isMounted = false
    }
  }, [boards, xIsNext, mainWinner, isMultiplayer])

  async function handlePlay(boardIndex, squareIndex) {
    if (mainWinner) return
    
    // Prevent moves while bot is thinking
    if (!isMultiplayer && playWithBot && isBotThinking) {
      return
    }
    
    // Solo game: prevent playing on bot's turn
    if (!isMultiplayer && playWithBot && !xIsNext) {
      return
    }
    
    // Multiplayer: check if it's my turn
    if (isMultiplayer) {
      const isMyTurn = (mySymbol === 'X' && xIsNext) || (mySymbol === 'O' && !xIsNext)
      if (!isMyTurn) {
        alert("It's not your turn!")
        return
      }
    }
    
    // Check if this board can be played (only if it's the active board or any board is allowed)
    if (activeBoard !== null && activeBoard !== boardIndex) return

    const nextBoards = boards.map((board, i) => 
      i === boardIndex ? [...board] : [...board]
    )
    
    nextBoards[boardIndex][squareIndex] = xIsNext ? 'X' : 'O'
    
    // Check if this mini-board is now in a draw state
    const result = calculateWinner(nextBoards[boardIndex])
    const isDraw = !result && nextBoards[boardIndex].every(square => square !== null)
    
    // If it's a draw, reset that mini-board
    if (isDraw) {
      nextBoards[boardIndex] = Array(9).fill(null)
    }
    
    // Determine next active board based on the square that was just played
    // The next player must play in the board corresponding to the square index
    const nextActiveBoard = squareIndex
    
    // Check if the next board is available (not won and not full)
    const nextBoardResult = calculateWinner(nextBoards[nextActiveBoard])
    const nextBoardWon = nextBoardResult !== null
    const nextBoardFull = nextBoards[nextActiveBoard].every(square => square !== null)
    
    // If the target board is won or full, allow play on any available board
    if (nextBoardWon || nextBoardFull) {
      setActiveBoard(null)
    } else {
      setActiveBoard(nextActiveBoard)
    }
    
    setBoards(nextBoards)
    setXIsNext(!xIsNext)
    
    // Multiplayer: send move to server
    if (isMultiplayer && gameId) {
      const newGameState = {
        boards: nextBoards,
        activeBoard: nextBoardWon || nextBoardFull ? null : nextActiveBoard,
        miniBoardWinners: nextBoards.map(board => {
          const result = calculateWinner(board)
          return result ? result.winner : null
        })
      }
      
      const nextTurn = xIsNext ? 'O' : 'X'
      await makeMove(gameId, boardIndex, squareIndex, newGameState, nextTurn)
      
      // Check if game ended
      const newMiniBoardWinners = newGameState.miniBoardWinners
      const newMainResult = calculateWinner(newMiniBoardWinners)
      if (newMainResult) {
        const winnerId = newMainResult.winner === mySymbol ? authUser.id : 
                        (gameData.player_x_id === authUser.id ? gameData.player_o_id : gameData.player_x_id)
        await endGame(gameId, winnerId)
      }
    }
  }

  function resetGame() {
    if (isMultiplayer) {
      alert('Cannot reset multiplayer game. Please exit and start a new game.')
      return
    }
    setBoards(initialState)
    setXIsNext(true)
    setActiveBoard(null)
  }

  if (loading) {
    return (
      <div className="game">
        <div className="game-board">
          <div className="status">Loading game...</div>
        </div>
      </div>
    )
  }

  let status
  if (mainWinner) {
    if (isMultiplayer) {
      const iWon = mainWinner === mySymbol
      status = iWon ? '🎉 You Won!' : '😔 You Lost'
    } else {
      if (playWithBot) {
        status = mainWinner === 'X' ? '🎉 You Won!' : '😔 Bot Won!'
      } else {
        status = 'Winner: ' + mainWinner
      }
    }
  } else if (miniBoardWinners.every(winner => winner !== null)) {
    status = 'Draw!'
  } else {
    if (isMultiplayer) {
      const isMyTurn = (mySymbol === 'X' && xIsNext) || (mySymbol === 'O' && !xIsNext)
      status = isMyTurn ? '🟢 Your turn' : `⏳ ${opponentName}'s turn`
    } else {
      if (playWithBot) {
        if (isBotThinking) {
          status = '🤖 Bot is thinking...'
        } else {
          status = xIsNext ? '🟢 Your turn' : '🤖 Bot\'s turn'
        }
      } else {
        status = 'Next player: ' + (xIsNext ? 'X' : 'O')
      }
    }
  }

  return (
    <div className="game">
      <div className="game-header">
        <div className="user-info">
          {isMultiplayer ? (
            <>
              <span className="username">You: {user.username} ({mySymbol})</span>
              <span className="versus">vs</span>
              <span className="username">{opponentName} ({mySymbol === 'X' ? 'O' : 'X'})</span>
            </>
          ) : playWithBot ? (
            <>
              <span className="username">👤 {user.username} (X)</span>
              <span className="versus">vs</span>
              <span className="username">🤖 Bot (O)</span>
            </>
          ) : (
            <>
              <span className="username">👤 {user.username}</span>
              {user.isGuest && <span className="guest-badge">Guest</span>}
            </>
          )}
        </div>
        <button className="logout-button" onClick={onLogout}>
          Exit Game
        </button>
      </div>
      
      <div className="game-board">
        <h1>Ultimate Tic-Tac-Toe</h1>
        <div className="status">{status}</div>
        <Board 
          boards={boards} 
          onPlay={handlePlay}
          miniBoardWinners={miniBoardWinners}
          winningBoards={winningBoards}
          mainWinner={mainWinner}
          activeBoard={activeBoard}
        />
        {!isMultiplayer && (
          <button className="reset-button" onClick={resetGame}>
            New Game
          </button>
        )}
      </div>
    </div>
  )
}

export default Game
