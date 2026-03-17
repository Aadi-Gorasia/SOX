export function getBoardStateAtMove(moves, moveIndex) {
  // 1. Initialize empty board
  const allBoards = Array(9).fill(null).map(() => Array(9).fill(null));
  const boardWinners = Array(9).fill(null);
  
  // 2. Determine how many moves to replay
  // If moveIndex is -1, return empty start board. 
  // If moveIndex is passed, replay up to that index (inclusive).
  const limit = moveIndex === null ? moves.length - 1 : moveIndex;

  let activeBoard = null;

  for (let i = 0; i <= limit; i++) {
    const m = moves[i];
    if (!m) break;

    // Apply Move
    allBoards[m.boardIndex][m.cellIndex] = m.player;

    // Check Small Board Win (Simplified logic)
    if (!boardWinners[m.boardIndex]) {
       const winner = checkSmallBoardWin(allBoards[m.boardIndex]); // You need your win logic here
       if (winner) boardWinners[m.boardIndex] = winner;
    }

    // Determine Next Active Board
    const nextBoardFull = allBoards[m.cellIndex].every(c => c !== null);
    const nextBoardWon = boardWinners[m.cellIndex] !== null;
    
    if (nextBoardFull || nextBoardWon) {
      activeBoard = null; // Can play anywhere
    } else {
      activeBoard = m.cellIndex;
    }
  }

  return { allBoards, boardWinners, activeBoard, lastMove: moves[limit] };
}

// Helper needed inside
function checkSmallBoardWin(squares) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (let line of lines) {
    const [a,b,c] = line;
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
  }
  return null;
}