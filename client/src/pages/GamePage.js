// client/src/pages/GamePage.js (Corrected Prop Passing)
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import SuperBoard from '../components/SuperBoard';
import PlayerHUD from '../components/PlayerHUD';
import MoveHistory from '../components/MoveHistory';
import './GamePage.css';

const GamePage = () => {
  const [gameState, setGameState] = useState(null);
  const socket = useSocket();
  const { gameId } = useParams();

  // This is now the ONLY component listening for game updates.
  useEffect(() => {
    if (!socket || !gameId) return;

    const handleUpdateGame = (newGameState) => {
        if (newGameState && newGameState.id === gameId) {
            setGameState(newGameState);
        }
    };
    
    socket.on('updateGame', handleUpdateGame);
    // You probably don't even need a separate 'timeUpdate' listener if 'updateGame' includes times.
    // If you do, it should also live here and just call setGameState.
    socket.emit('joinGame', gameId);

    return () => {
      socket.off('updateGame', handleUpdateGame);
    };
  }, [socket, gameId]);
  
  useEffect(() => {
    if (!socket || !gameId) return;
    const handleDrawOffer = () => {
      if (window.confirm("Your opponent has offered a draw. Do you accept?")) {
        socket.emit('acceptDraw', gameId);
      } else {
        socket.emit('declineDraw', gameId);
      }
    };
    socket.on('drawOffered', handleDrawOffer);
    return () => socket.off('drawOffered', handleDrawOffer);
  }, [socket, gameId]);


  if (!gameState) {
    return (
        <main className="game-content-container loading">
            <div className="spinner"></div>
        </main>
    );
  }

  const { players, playerDetails, playerToMove, timeControl, playerTimes, allBoards, activeBoard, boardWinners, gameWinner } = gameState;
  
  if (!playerDetails || playerDetails.length < 2) {
    return (
        <main className="game-content-container loading">
            <p>Waiting for opponent...</p>
        </main>
    );
  }

  const [player1, player2] = playerDetails;
  const isPlayer1Turn = playerToMove === players[0];
  const moves = gameState.moves || [];

  return (
    <>
      <main className="game-content-container">
        {/* Pass down ONLY the props SuperBoard needs. No more full gameState object. */}
        <SuperBoard 
          allBoards={allBoards}
          activeBoard={activeBoard}
          boardWinners={boardWinners}
          gameWinner={gameWinner}
          playerToMove={playerToMove}
          players={players}
          gameId={gameId}
        />
      </main>

      <MoveHistory moves={moves} />
      
      <PlayerHUD 
        player1={player1} 
        player2={player2} 
        playerTimes={playerTimes} 
        timeControl={timeControl}
        isPlayer1Turn={isPlayer1Turn}
      />
    </>
  );
};

export default GamePage;