// client/src/components/SuperBoard.js
import React, { useContext } from 'react'; // We need useContext for AuthContext
import { motion } from 'framer-motion';
import Board from './Board';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext to know who "I" am
import { useSocket } from '../context/SocketContext'; // We only need this to get our socket.id for the turn check
import './SuperBoard.css';

// Helper function can stay, it's pure logic
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] !== 'D' && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], lineIndex: i };
    }
  }
  return null;
}

const VictoryLine = ({ lineIndex }) => {
  const linePaths = [
    "M 0 16.66 L 100 16.66", "M 0 50 L 100 50", "M 0 83.33 L 100 83.33",
    "M 16.66 0 L 16.66 100", "M 50 0 L 50 100", "M 83.33 0 L 83.33 100",
    "M 5 5 L 95 95", "M 95 5 L 5 95"
  ];

  return (
    <svg className="victory-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.path
            d={linePaths[lineIndex]}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
        />
    </svg>
  );
};


// The refactored SuperBoard. Notice it now accepts props.
const SuperBoard = ({ allBoards, activeBoard, boardWinners, gameWinner, playerToMove, players, gameId }) => {
  const socket = useSocket(); // Only used to get our own socket ID
  const { user } = useContext(AuthContext); // Used to determine which player we are

  // This is the function that will be passed up to GamePage
  const handlePlay = (boardIndex, cellIndex) => {
    if (socket) {
      socket.emit('makeMove', { gameId, boardIndex, cellIndex });
    }
  };

  // Logic for determining turn and status text
  const myPlayerIndex = players.findIndex(pId => pId === socket.id);
  const isMyTurn = socket.id === playerToMove;
  const playerMark = myPlayerIndex === 0 ? 'X' : 'O';
  
  let statusText;
  if (gameWinner) {
    if (gameWinner === 'D') {
      statusText = "Game Drawn";
    } else {
      const winnerMark = gameWinner; // 'X' or 'O'
      statusText = (playerMark === winnerMark) ? "You Won!" : "You Lost.";
    }
  } else {
    statusText = isMyTurn ? "Your Turn" : "Opponent's Turn";
  }
  
  const gameWinnerInfo = calculateWinner(boardWinners);

  const renderBoard = (i) => {
    // Determine if this specific small board is active
    const isBoardActive = !gameWinner && isMyTurn && (activeBoard === null || activeBoard === i);
    
    return (
      <Board
        key={i}
        winner={boardWinners[i]}
        squares={allBoards[i]}
        onPlay={(cellIndex) => handlePlay(i, cellIndex)}
        isBoardActive={isBoardActive}
        isPlayable={!gameWinner}
      />
    );
  };

  return (
    // We are removing the outer container and status bars. GamePage will handle that.
    // This component is ONLY the 3x3 grid of boards.
    <div className="super-board">
      {gameWinnerInfo && gameWinner !== 'D' && (
        <VictoryLine lineIndex={gameWinnerInfo.lineIndex} />
      )}
      {Array(9).fill(null).map((_, i) => renderBoard(i))}
    </div>
  );
};

export default SuperBoard;