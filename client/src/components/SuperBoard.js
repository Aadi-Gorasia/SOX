// client/src/components/SuperBoard.js
import React from "react";
import { motion } from "framer-motion";
import Board from "./Board";
import { useSocket } from "../context/SocketContext";
import "./SuperBoard.css";

function calculateGlobalWinner(boardWinners) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (
      boardWinners[a] && 
      boardWinners[a] !== "D" &&
      boardWinners[a] === boardWinners[b] && 
      boardWinners[a] === boardWinners[c]
    ) {
      return { winner: boardWinners[a], lineIndex: i };
    }
  }
  return null;
}

const VictoryLine = ({ lineIndex, winner }) => {
  const linePaths = [
    "M 0 16.66 L 100 16.66", "M 0 50 L 100 50", "M 0 83.33 L 100 83.33", // Rows
    "M 16.66 0 L 16.66 100", "M 50 0 L 50 100", "M 83.33 0 L 83.33 100", // Columns
    "M 5 5 L 95 95", "M 95 5 L 5 95"                                     // Diagonals
  ];

  return (
    <svg 
      className={`victory-svg ${winner === 'X' ? 'win-path-x' : 'win-path-o'}`} 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
    >
      <motion.path
        d={linePaths[lineIndex]}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "circOut" }}
      />
    </svg>
  );
};

const SuperBoard = ({ allBoards, activeBoard, boardWinners, gameWinner, isMyTurn, gameId, onPlay }) => {
  const socket = useSocket();

  const handlePlay = (boardIndex, cellIndex) => {
    if (!isMyTurn || gameWinner) return;

    // ─── LOCAL INTERCEPT ROUTE (PUZZLES & SANDBOX) ───
    if (onPlay) {
      onPlay(boardIndex, cellIndex);
      return;
    }

    // ─── LIVE STREAM ROUTE (MULTIPLAYER SOCKETS) ───
    if (!socket) {
      console.warn("[SuperBoard] Action blocked: Socket layer disconnected.");
      return;
    }
    socket.emit("makeMove", { gameId, boardIndex, cellIndex });
  };

  const globalWinInfo = calculateGlobalWinner(boardWinners);

  const renderSector = (i) => {
    // Ultimate Tic-Tac-Toe targeting rules mapping boundary logic
    const isTarget = !gameWinner && (activeBoard === null || activeBoard === i) && !boardWinners[i];
    
    return (
      <Board
        key={i}
        winner={boardWinners[i]}
        squares={allBoards[i]}
        onPlay={(cellIndex) => handlePlay(i, cellIndex)}
        isTurn={isMyTurn}
        isTarget={isTarget}
      />
    );
  };

  return (
    <div className="super-board-container">
      <div className={`status-bar ${isMyTurn && !gameWinner ? 'status-active' : ''}`}>
        {gameWinner ? (
          <span style={{ color: 'var(--text-1)' }}>
            {gameWinner === 'D' ? 'Simulation Terminated // Draw Matrix' : `Simulation Resolved // Winner: ${gameWinner}`}
          </span>
        ) : isMyTurn ? (
          <span>Your Move — Intercept Target Vector</span>
        ) : (
          <span>Awaiting Opponent Link Stream...</span>
        )}
      </div>

      <div className="super-board">
        {globalWinInfo && gameWinner !== "D" && (
          <VictoryLine lineIndex={globalWinInfo.lineIndex} winner={gameWinner} />
        )}
        {Array(9).fill(null).map((_, i) => renderSector(i))}
      </div>
    </div>
  );
};

export default SuperBoard;