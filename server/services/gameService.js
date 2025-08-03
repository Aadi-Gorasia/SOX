// server/services/gameService.js
const Game = require('../models/Game');
async function saveGameResult(gameData) {
  const { playerDetails, gameWinner, timeControl } = gameData;
  const getWinnerId = () => {
    if (gameWinner === 'X') return playerDetails[0].id;
    if (gameWinner === 'O') return playerDetails[1].id;
    return null;
  };
  try {
    const newGame = new Game({
      players: playerDetails.map(p => p.id),
      winner: getWinnerId(),
      status: (gameWinner === 'D') ? 'DRAW' : 'COMPLETED',
      timeControl: `${timeControl.base / 60000}+${timeControl.increment / 1000}`
    });
    await newGame.save();
    console.log(`[Game Service] SUCCESS: Game result saved.`);
  } catch (err) { console.error("---!!!--- ERROR SAVING GAME ---!!!---", err); }
}
module.exports = { saveGameResult };