import { calculateWinner } from './gameLogic'

/**
 * Find the best move for the bot in ultimate tic-tac-toe
 * @param {Array<Array>} boards - 9x9 game state (9 mini-boards with 9 squares each)
 * @param {number|null} activeBoard - The board the bot must play in (-1/null if any board)
 * @param {string} botSymbol - 'X' or 'O'
 * @returns {object} { boardIndex, squareIndex } - The best move
 */
export function findBestMove(boards, activeBoard, botSymbol) {
  const playerSymbol = botSymbol === 'X' ? 'O' : 'X'
  
  // Get all valid moves for the current state
  const validMoves = getValidMoves(boards, activeBoard)
  
  if (validMoves.length === 0) {
    return null // No valid moves available
  }

  // Evaluate each move using minimax
  let bestScore = -Infinity
  let bestMove = validMoves[0]

  for (const move of validMoves) {
    const { boardIndex, squareIndex } = move
    const score = evaluateMove(
      boards,
      boardIndex,
      squareIndex,
      botSymbol,
      playerSymbol,
      activeBoard,
      0,
      true
    )

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

/**
 * Get all valid moves for the current game state
 */
function getValidMoves(boards, activeBoard) {
  const validMoves = []

  if (activeBoard === null || activeBoard === -1) {
    // Can play in any non-won board
    for (let boardIdx = 0; boardIdx < 9; boardIdx++) {
      const board = boards[boardIdx]
      if (isBoardWonOrFull(board)) {
        continue // Skip won or full boards
      }
      for (let squareIdx = 0; squareIdx < 9; squareIdx++) {
        if (board[squareIdx] === null) {
          validMoves.push({ boardIndex: boardIdx, squareIndex: squareIdx })
        }
      }
    }
  } else {
    // Must play in the active board
    const board = boards[activeBoard]
    
    // If active board is won or full, can play anywhere
    if (isBoardWonOrFull(board)) {
      for (let boardIdx = 0; boardIdx < 9; boardIdx++) {
        const b = boards[boardIdx]
        if (isBoardWonOrFull(b)) {
          continue
        }
        for (let squareIdx = 0; squareIdx < 9; squareIdx++) {
          if (b[squareIdx] === null) {
            validMoves.push({ boardIndex: boardIdx, squareIndex: squareIdx })
          }
        }
      }
    } else {
      // Play in the required board
      for (let squareIdx = 0; squareIdx < 9; squareIdx++) {
        if (board[squareIdx] === null) {
          validMoves.push({ boardIndex: activeBoard, squareIndex: squareIdx })
        }
      }
    }
  }

  return validMoves
}

/**
 * Check if a mini-board is won or completely full
 */
function isBoardWonOrFull(board) {
  const result = calculateWinner(board)
  if (result) return true // Board is won

  // Check if full
  return board.every(square => square !== null)
}

/**
 * Minimax algorithm with alpha-beta pruning
 */
function evaluateMove(
  boards,
  boardIndex,
  squareIndex,
  botSymbol,
  playerSymbol,
  activeBoard,
  depth,
  isMaximizing
) {
  // Make the move
  const newBoards = boards.map((board, idx) => {
    if (idx === boardIndex) {
      return board.map((square, sqIdx) =>
        sqIdx === squareIndex ? (isMaximizing ? botSymbol : playerSymbol) : square
      )
    }
    return board
  })

  // Determine next active board
  const nextActiveBoard = newBoards[boardIndex][squareIndex] === null ? squareIndex : -1

  // Check win conditions
  const mainGridWinner = getMainGridWinner(newBoards)
  if (mainGridWinner === botSymbol) {
    return 1000 - depth // Bot wins (prefer faster wins)
  }
  if (mainGridWinner === playerSymbol) {
    return -1000 + depth // Player wins (accept later losses)
  }

  // Check for draw (all mini-boards are won/full, no winner)
  if (isBoardFull(newBoards)) {
    return 0 // Draw
  }

  // Limit depth for performance
  if (depth >= 3) {
    return evaluatePosition(newBoards, botSymbol, playerSymbol)
  }

  const nextValidMoves = getValidMoves(newBoards, nextActiveBoard)
  if (nextValidMoves.length === 0) {
    return 0 // No moves available
  }

  if (isMaximizing) {
    let maxScore = -Infinity
    for (const move of nextValidMoves) {
      const score = evaluateMove(
        newBoards,
        move.boardIndex,
        move.squareIndex,
        botSymbol,
        playerSymbol,
        nextActiveBoard,
        depth + 1,
        false
      )
      maxScore = Math.max(score, maxScore)
    }
    return maxScore
  } else {
    let minScore = Infinity
    for (const move of nextValidMoves) {
      const score = evaluateMove(
        newBoards,
        move.boardIndex,
        move.squareIndex,
        botSymbol,
        playerSymbol,
        nextActiveBoard,
        depth + 1,
        true
      )
      minScore = Math.min(score, minScore)
    }
    return minScore
  }
}

/**
 * Get the winner of the main 3x3 grid
 */
function getMainGridWinner(boards) {
  // Create a 3x3 grid showing who won each mini-board
  const mainGrid = Array(9).fill(null)
  
  for (let i = 0; i < 9; i++) {
    const board = boards[i]
    const winner = calculateWinner(board)
    if (winner) {
      mainGrid[i] = winner.winner
    }
  }

  // Check for winner in main grid
  const result = calculateWinner(mainGrid)
  return result ? result.winner : null
}

/**
 * Check if all mini-boards are won or full (game over)
 */
function isBoardFull(boards) {
  return boards.every(board => isBoardWonOrFull(board))
}

/**
 * Evaluate the current position without further lookahead
 * Used at depth limit to estimate board strength
 */
function evaluatePosition(boards, botSymbol, playerSymbol) {
  let score = 0

  // Evaluate each mini-board
  for (let i = 0; i < 9; i++) {
    const board = boards[i]
    const boardScore = evaluateBoard(board, botSymbol, playerSymbol)
    
    // Center boards (4) are more valuable
    const centerBoards = [1, 3, 4, 5, 7]
    const isCenterBoard = centerBoards.includes(i)
    score += boardScore * (isCenterBoard ? 1.5 : 1)
  }

  // Evaluate main grid potential
  const mainGridScore = evaluateMainGrid(boards, botSymbol, playerSymbol)
  score += mainGridScore * 2

  return score
}

/**
 * Evaluate a single mini-board
 */
function evaluateBoard(board, botSymbol, playerSymbol) {
  const result = calculateWinner(board)
  
  if (result && result.winner === botSymbol) return 100
  if (result && result.winner === playerSymbol) return -100
  if (board.every(s => s !== null)) return 0 // Full board, no winner

  let score = 0

  // Check rows, columns, diagonals for potential wins
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]

  for (const line of lines) {
    const [a, b, c] = line
    const symbols = [board[a], board[b], board[c]]
    
    const botCount = symbols.filter(s => s === botSymbol).length
    const playerCount = symbols.filter(s => s === playerSymbol).length
    const empty = symbols.filter(s => s === null).length

    // Two in a row with one empty = winning opportunity or threat
    if (botCount === 2 && empty === 1) score += 50
    if (playerCount === 2 && empty === 1) score -= 50

    // One in a row = potential
    if (botCount === 1 && empty === 2) score += 5
    if (playerCount === 1 && empty === 2) score -= 5
  }

  return score
}

/**
 * Evaluate the main 3x3 grid potential
 */
function evaluateMainGrid(boards, botSymbol, playerSymbol) {
  const mainGrid = Array(9).fill(null)
  
  for (let i = 0; i < 9; i++) {
    const board = boards[i]
    const winner = calculateWinner(board)
    if (winner) {
      mainGrid[i] = winner.winner
    }
  }

  let score = 0
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]

  for (const line of lines) {
    const [a, b, c] = line
    const symbols = [mainGrid[a], mainGrid[b], mainGrid[c]]
    
    const botCount = symbols.filter(s => s === botSymbol).length
    const playerCount = symbols.filter(s => s === playerSymbol).length
    const empty = symbols.filter(s => s === null).length

    if (botCount === 2 && empty === 1) score += 200
    if (playerCount === 2 && empty === 1) score -= 200

    if (botCount === 1 && empty === 2) score += 10
    if (playerCount === 1 && empty === 2) score -= 10
  }

  return score
}
