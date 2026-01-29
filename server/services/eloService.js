const User = require('../models/User');

const getKFactor = (elo) => {
  if (elo < 1000) return 32;
  if (elo < 2000) return 24;
  return 16;
};

const getExpectedScore = (ratingA, ratingB) => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

function getPotentialChanges(eloA, eloB) {
  const kA = getKFactor(eloA);
  const expectedScoreA = getExpectedScore(eloA, eloB);

  // Calculate potential points
  const winDelta = Math.round(kA * (1 - expectedScoreA));
  const lossDelta = Math.round(kA * (0 - expectedScoreA));
  const drawDelta = Math.round(kA * (0.5 - expectedScoreA));

  return { win: winDelta, loss: lossDelta, draw: drawDelta };
}

async function updateEloAndStats(winnerId, loserId, isDraw = false) {
  try {
    const [p1, p2] = await Promise.all([User.findById(winnerId), User.findById(loserId)]);
    if (!p1 || !p2) return null;

    const p1Stakes = getPotentialChanges(p1.elo, p2.elo);
    const p2Stakes = getPotentialChanges(p2.elo, p1.elo);

    let p1Change, p2Change;

    if (isDraw) {
      p1Change = p1Stakes.draw;
      p2Change = p2Stakes.draw;
      p1.draws++; p2.draws++;
    } else {
      p1Change = p1Stakes.win;
      p2Change = p2Stakes.loss;
      p1.wins++; p2.losses++;
    }

    p1.elo += p1Change;
    p2.elo += p2Change;

    await Promise.all([p1.save(), p2.save()]);

    return {
      p1: { id: p1._id, newElo: p1.elo, change: p1Change },
      p2: { id: p2._id, newElo: p2.elo, change: p2Change }
    };
  } catch (err) {
    console.error('[ELO] Error:', err);
    return null;
  }
}

module.exports = { updateEloAndStats, getPotentialChanges };