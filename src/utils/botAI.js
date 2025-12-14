import { calculateWinner } from './gameLogic'

/**
 * Evaluate a mini-board position
 * Returns a score for the board
 */
function evaluateMiniBoard(board, symbol) {
  // Safety check: ensure board is valid
  if (!board || !Array.isArray(board) || board.length !== 9) {
    console.warn('evaluateMiniBoard: Invalid board', board)
    return 0
  }
  
  const result = calculateWinner(board)
  if (result) {
    return result.winner === symbol ? 100 : -100
  }
  
  // Count potential winning lines
  let score = 0
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6] // diagonals
  ]
  
  lines.forEach(line => {
    const [a, b, c] = line
    const values = [board[a], board[b], board[c]]
    const myCount = values.filter(v => v === symbol).length
    const oppSymbol = symbol === 'X' ? 'O' : 'X'
    const oppCount = values.filter(v => v === oppSymbol).length
    const emptyCount = values.filter(v => v === null).length
    
    if (myCount === 2 && emptyCount === 1) score += 10 // Can win
    if (myCount === 1 && emptyCount === 2) score += 2
    if (oppCount === 2 && emptyCount === 1) score += 15 // Must block
    if (oppCount === 1 && emptyCount === 2) score += 3
  })
  
  return score
}

/**
 * Evaluate the entire game state
 */
function evaluateGameState(boards, miniBoardWinners, botSymbol) {
  // Safety check: ensure valid inputs
  if (!boards || !Array.isArray(boards) || boards.length !== 9) {
    console.warn('evaluateGameState: Invalid boards', boards)
    return 0
  }
  if (!miniBoardWinners || !Array.isArray(miniBoardWinners) || miniBoardWinners.length !== 9) {
    console.warn('evaluateGameState: Invalid miniBoardWinners', miniBoardWinners)
    return 0
  }
  
  let score = 0
  const playerSymbol = botSymbol === 'X' ? 'O' : 'X'
  
  // Evaluate main board
  const mainResult = calculateWinner(miniBoardWinners)
  if (mainResult) {
    return mainResult.winner === botSymbol ? 10000 : -10000
  }
  
  // Count won mini-boards
  const botBoards = miniBoardWinners.filter(w => w === botSymbol).length
  const playerBoards = miniBoardWinners.filter(w => w === playerSymbol).length
  score += (botBoards * 200) - (playerBoards * 200)
  
  // Evaluate each mini-board
  boards.forEach((board, i) => {
    if (board && !miniBoardWinners[i]) {
      score += evaluateMiniBoard(board, botSymbol)
    }
  })
  
  // Bonus for center mini-board
  if (miniBoardWinners[4] === botSymbol) score += 50
  if (miniBoardWinners[4] === playerSymbol) score -= 50
  
  // Bonus for corners
  [0, 2, 6, 8].forEach(i => {
    if (miniBoardWinners[i] === botSymbol) score += 30
    if (miniBoardWinners[i] === playerSymbol) score -= 30
  })
  
  return score
}

/**
 * Get all valid moves for current state
 */
function getValidMoves(boards, miniBoardWinners, activeBoard) {
  // DEBUG: Log entry point
  console.log('🎯 getValidMoves called with:', {
    boards_is_array: Array.isArray(boards),
    boardsLength: boards?.length,
    boardsTypes: boards?.map((b, i) => `${i}: ${Array.isArray(b) ? 'array' : typeof b}`),
    activeBoard,
    miniBoardWinners_is_array: Array.isArray(miniBoardWinners),
    miniBoardWinners_length: miniBoardWinners?.length
  })
  
  const moves = []
  
  if (activeBoard !== null) {
    // Can only play in active board
    const board = boards[activeBoard]
    
    // Safety check: make sure board exists and is not won
    if (board && !miniBoardWinners[activeBoard]) {
      board.forEach((square, index) => {
        if (square === null) {
          moves.push({ boardIndex: activeBoard, squareIndex: index })
        }
      })
    }
    
    // If active board is full/won but specified, allow any board
    if (moves.length === 0) {
      boards.forEach((board, boardIndex) => {
        if (board && !miniBoardWinners[boardIndex]) {
          board.forEach((square, squareIndex) => {
            if (square === null) {
              moves.push({ boardIndex, squareIndex })
            }
          })
        }
      })
    }
  } else {
    // Can play in any available board
    boards.forEach((board, boardIndex) => {
      if (board && !miniBoardWinners[boardIndex]) {
        board.forEach((square, squareIndex) => {
          if (square === null) {
            moves.push({ boardIndex, squareIndex })
          }
        })
      }
    })
  }
  
  return moves
}

/**
 * Simulate a move and return the new state
 */
function simulateMove(boards, miniBoardWinners, move, symbol) {
  // Safety check: validate inputs
  if (!boards || !Array.isArray(boards) || boards.length !== 9) {
    throw new Error('simulateMove: Invalid boards')
  }
  if (!miniBoardWinners || !Array.isArray(miniBoardWinners) || miniBoardWinners.length !== 9) {
    throw new Error('simulateMove: Invalid miniBoardWinners')
  }
  if (!move || move.boardIndex === undefined || move.squareIndex === undefined) {
    throw new Error('simulateMove: Invalid move')
  }
  
  const newBoards = boards.map((board, i) => {
    if (!board || !Array.isArray(board)) {
      console.warn(`⚠️ simulateMove: Board ${i} is invalid, replacing with empty board`, board)
      return Array(9).fill(null) // Fallback to empty board
    }
    return i === move.boardIndex ? [...board] : [...board]
  })
  
  // DEBUG: Log created boards
  console.log('simulateMove created newBoards:', {
    input_boards: boards.map((b, i) => `${i}: ${Array.isArray(b) ? 'arr' : typeof b}`),
    output_boards: newBoards.map((b, i) => `${i}: ${Array.isArray(b) ? 'arr' : typeof b}`)
  })
  
  // Verify the target board exists
  if (!newBoards[move.boardIndex] || !Array.isArray(newBoards[move.boardIndex])) {
    throw new Error(`simulateMove: Board ${move.boardIndex} is invalid`)
  }
  
  newBoards[move.boardIndex][move.squareIndex] = symbol
  
  const newMiniBoardWinners = [...miniBoardWinners]
  const result = calculateWinner(newBoards[move.boardIndex])
  if (result) {
    newMiniBoardWinners[move.boardIndex] = result.winner
  }
  
  // Determine next active board
  let nextActiveBoard = move.squareIndex
  const nextBoard = newBoards[nextActiveBoard]
  
  if (!nextBoard || !Array.isArray(nextBoard)) {
    nextActiveBoard = null
  } else {
    const nextBoardWon = newMiniBoardWinners[nextActiveBoard] !== null
    const nextBoardFull = nextBoard.every(s => s !== null)
    
    if (nextBoardWon || nextBoardFull) {
      nextActiveBoard = null
    }
  }
  
  return { newBoards, newMiniBoardWinners, nextActiveBoard }
}

/**
 * Minimax algorithm with alpha-beta pruning
 */
function minimax(boards, miniBoardWinners, activeBoard, depth, alpha, beta, isMaximizing, botSymbol) {
  const playerSymbol = botSymbol === 'X' ? 'O' : 'X'
  
  // Terminal state or max depth
  if (depth === 0) {
    return evaluateGameState(boards, miniBoardWinners, botSymbol)
  }
  
  const mainResult = calculateWinner(miniBoardWinners)
  if (mainResult) {
    return mainResult.winner === botSymbol ? 10000 - depth : -10000 + depth
  }
  
  const validMoves = getValidMoves(boards, miniBoardWinners, activeBoard)
  if (validMoves.length === 0) {
    return 0 // Draw
  }
  
  if (isMaximizing) {
    let maxEval = -Infinity
    for (const move of validMoves) {
      const { newBoards, newMiniBoardWinners, nextActiveBoard } = 
        simulateMove(boards, miniBoardWinners, move, botSymbol)
      
      const eval_score = minimax(newBoards, newMiniBoardWinners, nextActiveBoard, 
        depth - 1, alpha, beta, false, botSymbol)
      
      maxEval = Math.max(maxEval, eval_score)
      alpha = Math.max(alpha, eval_score)
      if (beta <= alpha) break // Prune
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of validMoves) {
      const { newBoards, newMiniBoardWinners, nextActiveBoard } = 
        simulateMove(boards, miniBoardWinners, move, playerSymbol)
      
      const eval_score = minimax(newBoards, newMiniBoardWinners, nextActiveBoard, 
        depth - 1, alpha, beta, true, botSymbol)
      
      minEval = Math.min(minEval, eval_score)
      beta = Math.min(beta, eval_score)
      if (beta <= alpha) break // Prune
    }
    return minEval
  }
}

/**
 * Find the best move for the bot
 * @param {Array} boards - Current board state
 * @param {Array} miniBoardWinners - Winners of each mini-board
 * @param {number|null} activeBoard - Currently active board
 * @param {string} botSymbol - Bot's symbol ('X' or 'O')
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {Object} Best move {boardIndex, squareIndex}
 */
export function findBestMove(boards, miniBoardWinners, activeBoard, botSymbol, difficulty = 'medium') {
  const validMoves = getValidMoves(boards, miniBoardWinners, activeBoard)
  
  if (validMoves.length === 0) return null
  
  // Easy mode: random move with occasional smart play
  if (difficulty === 'easy') {
    if (Math.random() > 0.3) {
      return validMoves[Math.floor(Math.random() * validMoves.length)]
    }
  }
  
  // Medium mode: shallow search
  const depth = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
  
  let bestMove = validMoves[0]
  let bestScore = -Infinity
  
  // Evaluate each move
  for (const move of validMoves) {
    const { newBoards, newMiniBoardWinners, nextActiveBoard } = 
      simulateMove(boards, miniBoardWinners, move, botSymbol)
    
    const score = minimax(newBoards, newMiniBoardWinners, nextActiveBoard, 
      depth, -Infinity, Infinity, false, botSymbol)
    
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }
  
  return bestMove
}

/**
 * Quick move for immediate response (lower depth)
 */
export function findQuickMove(boards, miniBoardWinners, activeBoard, botSymbol) {
  return findBestMove(boards, miniBoardWinners, activeBoard, botSymbol, 'easy')
}
