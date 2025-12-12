import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Board from './Board'
import { calculateWinner } from '../utils/gameLogic'
import { findBestMove } from '../utils/botAI'
import { supabase } from '../lib/supabaseClient'
import { makeMove, endGame, subscribeToGame, requestRematch, respondToRematch } from '../lib/gameService'
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
  const [rematchStatus, setRematchStatus] = useState(null) // null, 'requested', 'waiting'
  const [showDrawOptions, setShowDrawOptions] = useState(false)
  const botMoveInProgress = useRef(false)

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
      
      // Handle rematch status
      if (updatedGame.rematch_requested_by) {
        if (updatedGame.rematch_requested_by === authUser.id) {
          setRematchStatus('waiting')
        } else {
          setRematchStatus('requested')
        }
      }
      
      // Check if game status changed to completed (rematch accepted creates new game)
      if (updatedGame.status === 'completed' && updatedGame.rematch_accepted_new_game_id) {
        // Redirect to new game
        window.location.href = `/?gameId=${updatedGame.rematch_accepted_new_game_id}`
        return
      }
      
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

  // Bot AI for solo games
  useEffect(() => {
    // Only trigger when it becomes bot's turn (xIsNext changes to false)
    if (isMultiplayer || !playWithBot || xIsNext || mainWinner || isBotThinking || botMoveInProgress.current) {
      return
    }
    
    botMoveInProgress.current = true
    let timeoutId
    
    const makeMove = async () => {
      // Set thinking state
      setIsBotThinking(true)
      
      // Delay for UX
      await new Promise(resolve => {
        timeoutId = setTimeout(resolve, 600)
      })
      
      try {
        // Recalculate miniBoardWinners with current boards state
        const currentMiniBoardWinners = boards.map(board => {
          const result = calculateWinner(board)
          return result ? result.winner : null
        })
        
        const bestMove = findBestMove(boards, currentMiniBoardWinners, activeBoard, 'O', 'medium')
        
        if (!bestMove) {
          console.warn('Bot: No valid move found')
          setIsBotThinking(false)
          botMoveInProgress.current = false
          return
        }
        
        const { boardIndex, squareIndex } = bestMove
        
        // Verify square is empty
        if (boards[boardIndex][squareIndex]) {
          console.warn('Bot: Square already occupied')
          setIsBotThinking(false)
          botMoveInProgress.current = false
          return
        }
        
        // Create new boards state
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
        
        // Update all states in batch
        setBoards(nextBoards)
        setActiveBoard(nextBoardWon || nextBoardFull ? null : nextActiveBoard)
        setXIsNext(true)
        setIsBotThinking(false)
        botMoveInProgress.current = false
      } catch (error) {
        console.error('Bot error:', error)
        setIsBotThinking(false)
        botMoveInProgress.current = false
      }
    }
    
    makeMove()
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      botMoveInProgress.current = false
    }
  }, [xIsNext, mainWinner, isMultiplayer, playWithBot])

  async function handlePlay(boardIndex, squareIndex) {
    if (mainWinner) return
    
    // Prevent moves while bot is thinking OR if it's not player's turn
    if (!isMultiplayer && playWithBot && (isBotThinking || !xIsNext)) {
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

  const handleRequestRematch = async () => {
    if (!gameId) return
    const result = await requestRematch(gameId)
    if (result.success) {
      setRematchStatus('waiting')
    }
  }

  const handleAcceptRematch = async () => {
    if (!gameId) return
    const result = await respondToRematch(gameId, true)
    if (result.success && result.newGameId) {
      // Redirect to new game via URL parameter - will trigger for both players via real-time update
      window.location.href = `/?gameId=${result.newGameId}`
    }
  }

  const handleDeclineRematch = async () => {
    if (!gameId) return
    await respondToRematch(gameId, false)
    setRematchStatus(null)
    await handleEndDraw()
  }

  const handleEndDraw = async () => {
    if (!gameId) return
    // End game as draw (no winner)
    await endGame(gameId, null, true)
    setShowDrawOptions(false)
    // Redirect to profile after a moment
    setTimeout(() => {
      onLogout()
    }, 2000)
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
    if (isMultiplayer && !showDrawOptions && rematchStatus === null) {
      setShowDrawOptions(true)
    }
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
        
        {/* Draw options for multiplayer */}
        {isMultiplayer && showDrawOptions && miniBoardWinners.every(w => w !== null) && (
          <div className="draw-options">
            <h3>Game ended in a draw!</h3>
            {rematchStatus === 'waiting' ? (
              <p className="waiting-message">⏳ Waiting for opponent's response...</p>
            ) : rematchStatus === 'requested' ? (
              <div className="rematch-request">
                <p>🎮 {opponentName} wants a rematch!</p>
                <div className="draw-buttons">
                  <button className="accept-rematch-btn" onClick={handleAcceptRematch}>
                    ✓ Accept Rematch
                  </button>
                  <button className="decline-rematch-btn" onClick={handleDeclineRematch}>
                    ✕ Decline
                  </button>
                </div>
              </div>
            ) : (
              <div className="draw-buttons">
                <button className="rematch-btn" onClick={handleRequestRematch}>
                  🔄 Request Rematch
                </button>
                <button className="end-game-btn" onClick={handleEndDraw}>
                  🏁 End Game
                </button>
              </div>
            )}
          </div>
        )}
        
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
