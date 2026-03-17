// client/src/components/SuperBoard.js
import React from "react";
import { motion } from "framer-motion";
import Board from "./Board";
import { useSocket } from "../context/SocketContext";
import "./SuperBoard.css";

// Pure helper – checks the 3x3 macro-board winners
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (
      squares[a] &&
      squares[a] !== "D" &&
      squares[a] === squares[b] &&
      squares[a] === squares[c]
    ) {
      return { winner: squares[a], lineIndex: i };
    }
  }
  return null;
}

const VictoryLine = ({ lineIndex }) => {
  const linePaths = [
    "M 0 16.66 L 100 16.66",
    "M 0 50 L 100 50",
    "M 0 83.33 L 100 83.33",
    "M 16.66 0 L 16.66 100",
    "M 50 0 L 50 100",
    "M 83.33 0 L 83.33 100",
    "M 5 5 L 95 95",
    "M 95 5 L 5 95"
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

const SuperBoard = ({
  allBoards,
  activeBoard,
  boardWinners,
  gameWinner,
  playerToMove,
  players,
  gameId
}) => {
  const socket = useSocket();

  const handlePlay = (boardIndex, cellIndex) => {
    if (!socket) return;
    socket.emit("makeMove", { gameId, boardIndex, cellIndex });
  };

  const isMyTurn = socket?.id && socket.id === playerToMove;

  const gameWinnerInfo = calculateWinner(boardWinners);

  const renderBoard = (i) => {
    const isBoardActive =
      !gameWinner && isMyTurn && (activeBoard === null || activeBoard === i);

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
    <div className="super-board">
      {gameWinnerInfo && gameWinner !== "D" && (
        <VictoryLine lineIndex={gameWinnerInfo.lineIndex} />
      )}

      {Array(9)
        .fill(null)
        .map((_, i) => renderBoard(i))}
    </div>
  );
};

export default SuperBoard;
