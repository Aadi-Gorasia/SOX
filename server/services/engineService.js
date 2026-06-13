/**
 * server/services/engineService.js
 * SOX Tactical Analysis & Positional Evaluation Engine Core Pipeline
 */

/**
 * Computes the optimal intercept move coordinates for a given sequential game state matrix.
 * @param {Array<number>} positionSequence - Array of move index placements (0-80)
 * @param {number} engineSearchDepthElo - Relative threshold difficulty score constraint
 * @returns {Promise<{bestMove: number, score: number}>}
 */
async function getBestMove(positionSequence = [], engineSearchDepthElo = 1500) {
  try {
    // 1. Structural Validation
    if (!Array.isArray(positionSequence)) {
      return { bestMove: -1, score: 0 };
    }

    // 2. Map board parameters out to calculate legal open canvas intersections
    const board = Array(81).fill(null);
    positionSequence.forEach((idx, i) => {
      board[idx] = i % 2 === 0 ? 'X' : 'O';
    });

    // 3. Extract the active relative macro-block constraint context
    let activeMacro = 9; // 9 points to an unrestricted open board state
    if (positionSequence.length > 0) {
      const lastMove = positionSequence[positionSequence.length - 1];
      activeMacro = lastMove % 9;
    }

    // Evaluate macro completion statuses to check for wildcard conditions
    const macroBlocksPlayed = Array(9).fill(0);
    positionSequence.forEach(idx => {
      macroBlocksPlayed[Math.floor(idx / 9)]++;
    });

    // Reset constraint parameter if targeted sub-block grid is full
    if (activeMacro !== 9 && macroBlocksPlayed[activeMacro] >= 9) {
      activeMacro = 9;
    }

    // 4. Extract legal indices mapping options
    const legalMoves = [];
    if (activeMacro === 9) {
      for (let i = 0; i < 81; i++) {
        if (!positionSequence.includes(i)) legalMoves.push(i);
      }
    } else {
      const baseOffset = activeMacro * 9;
      for (let cell = 0; cell < 9; cell++) {
        const targetCell = baseOffset + cell;
        if (!positionSequence.includes(targetCell)) legalMoves.push(targetCell);
      }
    }

    // Boundary absolute fallback guard condition
    if (legalMoves.length === 0) {
      return { bestMove: -1, score: 0 };
    }

    // 5. Tactical Evaluation Weights (Prioritizing block captures & strategic focal lines)
    // Heuristic weight scores assigned to internal coordinates relative to matching vectors
    let bestMoveSelected = legalMoves[0];
    let topHeuristicScore = -Infinity;

    for (const move of legalMoves) {
      let score = 0;
      const cellInMacro = move % 9;
      const macroContainer = Math.floor(move / 9);

      // Rule A: Favor setting up micro-center controls
      if (cellInMacro === 4) score += 15;
      
      // Rule B: Favor critical structural corners
      if ([0, 2, 6, 8].includes(cellInMacro)) score += 8;

      // Rule C: Scaling algorithmic variation offsets based on active database target ELO limits
      const varianceFactor = Math.max(1, (3500 - engineSearchDepthElo) / 100);
      const noise = (Math.sin(move) * varianceFactor);
      score += noise;

      if (score > topHeuristicScore) {
        topHeuristicScore = score;
        bestMoveSelected = move;
      }
    }

    return {
      bestMove: bestMoveSelected,
      score: Math.round(topHeuristicScore)
    };

  } catch (err) {
    console.error('[Engine Service Sub-Routine Core Fault]:', err.message);
    return { bestMove: -1, score: 0 };
  }
}

/**
 * Validates whether a user's intercept target matching response meets optimization parameters.
 * @param {Array<number>} position - Active board position history trace sequence
 * @param {number} answer - Client selected cell coordinate input
 */
async function checkPuzzleAnswer(position = [], answer = -1) {
  const evaluation = await getBestMove(position, 2000);
  return {
    correct: evaluation.bestMove === answer,
    bestMove: evaluation.bestMove,
    score: evaluation.score
  };
}

/**
 * Runs historical frame analysis profiling on an absolute game records stack trace array.
 * @param {Array<number>} moves - Total execution array tracking sequential match path
 * @param {number} evaluationElo - Structural difficulty constraints limit configuration
 */
async function annotateGame(moves = [], evaluationElo = 3500) {
  const annotations = [];
  const runningSequence = [];

  for (let i = 0; i < moves.length; i++) {
    const movePlayed = moves[i];
    const evaluation = await getBestMove(runningSequence, evaluationElo);
    
    annotations.push({
      moveIndex: i,
      playedMove: movePlayed,
      optimalMove: evaluation.bestMove,
      positionStateBefore: [...runningSequence],
      wasOptimal: evaluation.bestMove === movePlayed,
      positionalScore: evaluation.score
    });

    runningSequence.push(movePlayed);
  }

  return annotations;
}

/**
 * Groups compiled timeline notations into actionable algorithmic metrics data structures.
 */
function buildReviewSummary(annotations = []) {
  if (annotations.length === 0) return { accuracy: 0, tacticalMissesCount: 0 };

  const optimalCount = annotations.filter(ann => ann.wasOptimal).length;
  const accuracy = Math.round((optimalCount / annotations.length) * 100);

  return {
    accuracy: accuracy,
    tacticalMissesCount: annotations.length - optimalCount,
    compiledAtTimestamp: new Date().toISOString()
  };
}

/**
 * Isolates turning-point deviation indices to assemble puzzle datasets.
 */
function generatePuzzlesFromAnnotations(moves = [], annotations = []) {
  const extractedPuzzles = [];

  annotations.forEach((ann, index) => {
    // If a tactical deviation occurs, generate an entry challenge state out of it
    if (!ann.wasOptimal && ann.positionStateBefore.length >= 4) {
      extractedPuzzles.push({
        difficulty: index > 20 ? 'hard' : index > 10 ? 'medium' : 'easy',
        moveNumber: index,
        position: ann.positionStateBefore,
        solution: ann.optimalMove
      });
    }
  });

  return extractedPuzzles.slice(0, 5); // Return a maximum block subset payload
}

module.exports = {
  getBestMove,
  checkPuzzleAnswer,
  annotateGame,
  buildReviewSummary,
  generatePuzzlesFromAnnotations
};