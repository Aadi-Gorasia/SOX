// server/services/gameService.js
const Game = require('../models/Game');

// ─── saveGameResult ───────────────────────────────────────────────────────────
// Called by GameManager when a game ends.
// gameData now accepts an optional `moves` array: [{ idx, side }, ...]
async function saveGameResult(gameData) {
  const { playerDetails, gameWinner, timeControl, moves = [] } = gameData;

  const getWinnerId = () => {
    if (gameWinner === 'X') return playerDetails[0].id;
    if (gameWinner === 'O') return playerDetails[1].id;
    return null;
  };

  try {
    const newGame = new Game({
      players:     playerDetails.map(p => p.id),
      winner:      getWinnerId(),
      status:      gameWinner === 'D' ? 'DRAW' : 'COMPLETED',
      timeControl: `${timeControl.base / 60000}+${timeControl.increment / 1000}`,
      moves,       // ← NEW: persist move history for engine review
      endDate:     new Date(),
    });

    await newGame.save();
    console.log(`[Game Service] SUCCESS: Game saved. ID=${newGame._id} moves=${moves.length}`);
    return newGame._id; // return ID so caller can pass it to the client
  } catch (err) {
    console.error('---!!!--- ERROR SAVING GAME ---!!!---', err);
    return null;
  }
}

module.exports = { saveGameResult };