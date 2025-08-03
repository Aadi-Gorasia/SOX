const SuperBoard = () => {
  const socket = useSocket();
  const { gameState } = useGame();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');

  useEffect(() => { /* ... same as before ... */ }, [socket, gameId]);

  const handlePlay = (boardIndex, cellIndex) => { /* ... same as before ... */ };

  // --- NEW: Resign Handler ---
  const handleResign = () => {
    if (socket && gameId && !gameState.gameWinner) {
      if (window.confirm("Are you sure you want to resign?")) {
        socket.emit('resign', { gameId });
      }
    }
  };
  // --------------------------

  if (!gameState) { /* ... same as before ... */ }

  const { allBoards, boardWinners, playerToMove, players, gameWinner } = gameState;
  const isMyTurn = socket.id === playerToMove;
  const playerMark = players.indexOf(socket.id) === 0 ? 'X' : 'O';
  
  let statusText;
  if (gameWinner) { /* ... same as before ... */ }
  else { statusText = isMyTurn ? "Your Turn" : "Opponent's Turn"; }

  const renderBoard = (i) => { /* ... same as before ... */ };

  return (
    <div className="super-board-container">
       <div className="status-bar">
          <div className="status">{statusText} (You are {playerMark})</div>
       </div>
      <div className="super-board">
        {Array(9).fill(null).map((_, i) => renderBoard(i))}
      </div>
      {/* --- NEW: Resign Button --- */}
      <div className="game-actions">
        { !gameWinner && <button onClick={handleResign} className="resign-button">Resign</button> }
      </div>
      {/* ------------------------- */}
    </div>
  );
};

export default SuperBoard;