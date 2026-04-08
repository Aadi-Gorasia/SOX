// client/src/components/SuperBoard.js
import React from "react";
import { motion } from "framer-motion";
import Board from "./Board";
import { useSocket } from "../context/SocketContext";
import "./SuperBoard.css";

/**
 * WIN CALCULATION (Macro Board)
 * Determines if three sectors have been captured in a row.
 */
function calculateGlobalWinner(boardWinners) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
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

/**
 * VICTORY LINE COMPONENT
 * Renders the animated strike through the winning macro-path.
 */
const VictoryLine = ({ lineIndex, winner }) => {
  const linePaths = [
    "M 0 16.66 L 100 16.66", "M 0 50 L 100 50", "M 0 83.33 L 100 83.33", // Rows
    "M 16.66 0 L 16.66 100", "M 50 0 L 50 100", "M 83.33 0 L 83.33 100", // Cols
    "M 5 5 L 95 95", "M 95 5 L 5 95"                                     // Diagonals
  ];

  return (
    <svg className={`victory-svg ${winner === 'X' ? 'win-path-x' : 'win-path-o'}`} viewBox="0 0 100 100" preserveAspectRatio="none">
      <motion.path
        d={linePaths[lineIndex]}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "circOut" }}
      />
    </svg>
  );
};

const SuperBoard = ({
  allBoards,
  activeBoard,
  boardWinners,
  gameWinner,
  playerToMove,
  gameId
}) => {
  const socket = useSocket();

  /**
   * EXECUTE MOVE PROTOCOL
   * Sends the move data to the backend via socket connection.
   */
  const handlePlay = (boardIndex, cellIndex) => {
    if (!socket) return;
    socket.emit("makeMove", { gameId, boardIndex, cellIndex });
  };

  // Determine if the current client is the authorized actor
  const isMyTurn = socket?.id && socket.id === playerToMove;

  // Check for simulation resolution
  const globalWinInfo = calculateGlobalWinner(boardWinners);

  /**
   * RENDER SECTOR
   * Calculates targeting and turn logic for each of the 9 boards.
   */
  const renderSector = (i) => {
    // 1. TARGET LOGIC: Is this sector where the next move MUST happen?
    // If activeBoard is null, all non-won boards are targets.
    const isTarget = !gameWinner && (activeBoard === null || activeBoard === i) && !boardWinners[i];

    return (
      <Board
        key={i}
        winner={boardWinners[i]}
        squares={allBoards[i]}
        onPlay={(cellIndex) => handlePlay(i, cellIndex)}
        isTurn={isMyTurn}
        isTarget={isTarget} // This triggers the High-Intensity Illumination
      />
    );
  };

  return (
    <div className="super-board-container">
      {/* HUD STATUS BAR */}
      <div className="status-bar">
        {gameWinner ? (
          <span className="text-titanium">SIMULATION_RESOLVED // WINNER_{gameWinner}</span>
        ) : isMyTurn ? (
          <span className="status-active">DATA_INPUT_REQUIRED</span>
        ) : (
          <span>AWAITING_REMOTE_SIGNAL...</span>
        )}
      </div>

      <div className="super-board">
        {/* Render Victory Path if simulation is concluded */}
        {globalWinInfo && gameWinner !== "D" && (
          <VictoryLine lineIndex={globalWinInfo.lineIndex} winner={gameWinner} />
        )}

        {/* Generate the 9 Recursive Sectors */}
        {Array(9).fill(null).map((_, i) => renderSector(i))}
      </div>
    </div>
  );
};

export default SuperBoard;