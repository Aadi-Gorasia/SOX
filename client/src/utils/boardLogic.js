// src/utils/boardLogic.js

function checkSmallBoardWin(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

export function getBoardStateAtMove(moves, targetIndex) {
  // 1. Initialize fresh board
  const allBoards = Array(9).fill(null).map(() => Array(9).fill(null));
  const boardWinners = Array(9).fill(null);
  
  // If targetIndex is -1, return empty board
  if (targetIndex < 0) {
    return { allBoards, boardWinners, activeBoard: null };
  }

  // 2. Replay moves up to targetIndex
  let activeBoard = null;

  for (let i = 0; i <= targetIndex; i++) {
    const m = moves[i];
    if (!m) break;

    // Apply move
    allBoards[m.boardIndex][m.cellIndex] = m.player;

    // Check if this move won the small board
    if (!boardWinners[m.boardIndex]) {
       const win = checkSmallBoardWin(allBoards[m.boardIndex]);
       if (win) boardWinners[m.boardIndex] = win;
    }

    // Determine next active board
    const nextBoardIndex = m.cellIndex;
    const isNextBoardFull = allBoards[nextBoardIndex].every(c => c !== null);
    const isNextBoardWon = boardWinners[nextBoardIndex] !== null;

    if (isNextBoardFull || isNextBoardWon) {
      activeBoard = null; // Can move anywhere
    } else {
      activeBoard = nextBoardIndex;
    }
  }

  return { allBoards, boardWinners, activeBoard };
}