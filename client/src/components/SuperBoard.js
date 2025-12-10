// client/src/components/SuperBoard.js
import React, { useContext } from "react";
import { motion } from "framer-motion";
import Board from "./Board";
import { AuthContext } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import "./SuperBoard.css";

// Pure helper – checks the 3x3 macro-board winners
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],      // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8],      // columns
    [0, 4, 8], [2, 4, 6]                  // diagonals
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
    "M 0 16.66 L 100 16.66", // row 1
    "M 0 50 L 100 50",       // row 2
    "M 0 83.33 L 100 83.33", // row 3
    "M 16.66 0 L 16.66 100", // col 1
    "M 50 0 L 50 100",       // col 2
    "M 83.33 0 L 83.33 100", // col 3
    "M 5 5 L 95 95",         // diag \
    "M 95 5 L 5 95"          // diag /
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
  const { user } = useContext(AuthContext); // not used right now, but kept in case you show names later

  const handlePlay = (boardIndex, cellIndex) => {
    if (!socket) return;
    socket.emit("makeMove", { gameId, boardIndex, cellIndex });
  };

  const myPlayerIndex = players.findIndex((pId) => pId === socket?.id);
  const isMyTurn = socket?.id && socket.id === playerToMove;
  const playerMark = myPlayerIndex === 0 ? "X" : "O";

  // statusText is currently not rendered here, GamePage owns HUD/status
  let statusText;
  if (gameWinner) {
    if (gameWinner === "D") statusText = "Game Drawn";
    else statusText = playerMark === gameWinner ? "You Won!" : "You Lost.";
  } else {
    statusText = isMyTurn ? "Your Turn" : "Opponent's Turn";
  }

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
