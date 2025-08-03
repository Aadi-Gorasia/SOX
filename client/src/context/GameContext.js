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
    const handleUpdateGame = (newGameState) => {
      console.log('CLIENT: Received full game update');
      updateGameState(newGameState);
    };
    const handleTimeUpdate = (timeData) => {
      // console.log('CLIENT: Received time update');
      setPlayerTimes(timeData.playerTimes);
    };
    socket.on('updateGame', handleUpdateGame);
    socket.on('timeUpdate', handleTimeUpdate);
    return () => {
      socket.off('updateGame', handleUpdateGame);
      socket.off('timeUpdate', handleTimeUpdate);
    };
  }, [socket, updateGameState]);
  
  const value = { gameState, playerTimes, setGameState: updateGameState };
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};