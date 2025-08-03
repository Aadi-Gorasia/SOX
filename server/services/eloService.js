// server/services/eloService.js
const eloRating = require('elo-rating');
const User = require('../models/User');
async function updateEloAndStats(player1Id, player2Id, isDraw = false) {
  try {
    const [player1, player2] = await Promise.all([ User.findById(player1Id), User.findById(player2Id) ]);
    if (!player1 || !player2) { console.error('[ELO Service] Could not find one or both players.'); return; }
    const averageElo = (player1.elo + player2.elo) / 2;
    let kFactor;
    if (averageElo < 1000) { kFactor = 10; }
    else if (averageElo < 1500) { kFactor = 8; }
    else { kFactor = 3; }
    const { playerRating, opponentRating } = eloRating.calculate(player1.elo, player2.elo, !isDraw, kFactor);
    if (isDraw) {
      await Promise.all([
        User.findByIdAndUpdate(player1Id, { $set: { elo: Math.round(playerRating) }, $inc: { draws: 1 } }),
        User.findByIdAndUpdate(player2Id, { $set: { elo: Math.round(opponentRating) }, $inc: { draws: 1 } })
      ]);
    } else {
      await Promise.all([
        User.findByIdAndUpdate(player1Id, { $set: { elo: Math.round(playerRating) }, $inc: { wins: 1 } }),
        User.findByIdAndUpdate(player2Id, { $set: { elo: Math.round(opponentRating) }, $inc: { losses: 1 } })
      ]);
    }
  } catch (err) { console.error('Error updating ELO:', err); }
}
module.exports = { updateEloAndStats };