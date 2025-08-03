// client/src/components/SuperBoard.js
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import Board from './Board';
import { motion } from 'framer-motion';
import './SuperBoard.css';

// Helper function to determine the winner and the winning line's index
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

// This is the new, dedicated component for rendering the animated SVG line.
const VictoryLine = ({ lineIndex }) => {
  const linePaths = [
    "M 0 16.66 L 100 16.66", "M 0 50 L 100 50", "M 0 83.33 L 100 83.33", // Horizontal
    "M 16.66 0 L 16.66 100", "M 50 0 L 50 100", "M 83.33 0 L 83.33 100", // Vertical
    "M 5 5 L 95 95",       // Diagonal TL-BR (inset)
    "M 95 5 L 5 95"        // Diagonal TR-BL (inset)
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


const SuperBoard = () => {
  const socket = useSocket();
  const { gameState, setGameState } = useGame();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');

  useEffect(() => {
    if (socket && gameId) {
      socket.emit('joinGame', gameId);
    }
    return () => {
      setGameState(null);
    };
  }, [socket, gameId, setGameState]);

  const handlePlay = (boardIndex, cellIndex) => {
    if (socket) {
      socket.emit('makeMove', { gameId, boardIndex, cellIndex });
    }
  };

  if (!gameState) {
    return <div className="loading-text">Waiting for game data...</div>;
  }

  const { allBoards, boardWinners, playerToMove, players, gameWinner } = gameState;
  const isMyTurn = socket.id === playerToMove;
  const playerMark = players.indexOf(socket.id) === 0 ? 'X' : 'O';
  
  let statusText;
  if (gameWinner) {
    if (gameWinner === 'D') {
      statusText = "Game Drawn";
    } else {
      statusText = (playerMark === gameWinner) ? "You Won!" : "You Lost.";
    }
  } else {
    statusText = isMyTurn ? "Your Turn" : "Opponent's Turn";
  }
  
  const gameWinnerInfo = calculateWinner(boardWinners);

  const renderBoard = (i) => {
    const isBoardActive = !gameWinner && isMyTurn && (gameState.activeBoard === null || gameState.activeBoard === i);
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
    <div className="super-board-container">
      <div className="status-bar">{statusText}</div>
      <div className="super-board">
        {gameWinnerInfo && gameWinner !== 'D' && (
          <VictoryLine lineIndex={gameWinnerInfo.lineIndex} />
        )}
        {Array(9).fill(null).map((_, i) => renderBoard(i))}
      </div>
      <div className="game-actions">
        { !gameWinner && <button onClick={() => { if(window.confirm('Are you sure you want to resign?')) { socket.emit('resign', {gameId}) } }} className="resign-button">Resign</button> }
      </div>
    </div>
  );
};

export default SuperBoard;