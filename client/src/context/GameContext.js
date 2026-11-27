// client/src/context/GameContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';

const GameContext = createContext(null);
export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
  const socket = useSocket();
  const [gameState, setGameState] = useState(null);
  const [playerTimes, setPlayerTimes] = useState(null);

  const updateGameState = useCallback((newState) => {
    setGameState(newState);
    if (newState && newState.playerTimes) {
      setPlayerTimes(newState.playerTimes);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const match = window.location.pathname.match(/^\/game\/([^/]+)$/);
    if (!match) return;
    const gameId = match[1];

    const handleConnect = () => {
      console.log("CLIENT: Connected, joining game", gameId);
      socket.emit("joinGame", gameId); // always plain string
    };

    if (socket.connected) {
      handleConnect();
    }
    socket.on("connect", handleConnect);

    const handleUpdateGame = (newGameState) => {
      console.log("CLIENT: Received game update", newGameState);
      updateGameState(newGameState);
    };

    const handleTimeUpdate = (timeData) => {
      console.log("CLIENT: Received time update", timeData);
      setPlayerTimes(timeData.playerTimes);
    };

    socket.on("updateGame", handleUpdateGame);
    socket.on("timeUpdate", handleTimeUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("updateGame", handleUpdateGame);
      socket.off("timeUpdate", handleTimeUpdate);
    };
  }, [socket, updateGameState]);

  const value = { gameState, playerTimes, setGameState: updateGameState };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
