// client/src/components/GameEndModal.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './GameEndModal.css';

const GameEndModal = ({
  result,
  currentUser,
  onNewGame,
  onClose,
  gameId,
}) => {

  // HOOKS MUST ALWAYS BE AT THE TOP
  const navigate = useNavigate();

  // EARLY RETURN AFTER HOOKS
  if (!result) return null;

  // SAFELY EXTRACT PLAYERS
  const players = result.players || result.playerDetails || [];

  const myName = currentUser?.username || 'Player';

  const me =
    players.find((p) => p?.username === myName) ||
    players[0] ||
    {};

  const opp =
    players.find((p) => p?.username !== myName) ||
    players[1] ||
    { username: 'Opponent' };

  // DETERMINE MATCH RESULT
  const isDraw = result.winner === 'D';

  const mySymbol =
    players.indexOf(me) === 0 ? 'X' : 'O';

  const iWon =
    !isDraw &&
    (
      result.winnerId === me.id ||
      result.winner === mySymbol
    );

  // UI STATES
  const statusTitle = isDraw
    ? 'Draw'
    : iWon
      ? 'Victory'
      : 'Defeat';

  const statusTheme = isDraw
    ? 'draw'
    : iWon
      ? 'win'
      : 'loss';

  // END REASONS
  const reasonMap = {
    checkmate: 'Tactical Elimination',
    resignation: 'Opponent Resigned',
    timeout: 'Time Expired',
    agreement: 'Mutual Agreement',
  };

  const displayReason =
    reasonMap[result.reason] ||
    result.reason ||
    'Match Concluded';

  // REVIEW HANDLER
  const handleReview = () => {
    if (gameId) {
      navigate(`/review/${gameId}`);
      return;
    }

    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="end-modal-backdrop">
      <div className={`end-report-frame ${statusTheme}`}>

        {/* BACKGROUND GRID */}
        <div className="end-grid-bg">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="end-grid-cell"
            />
          ))}
        </div>

        <div className="end-content">

          {/* RESULT TITLE */}
          <h1 className="end-outcome-title">
            {statusTitle}
          </h1>

          {/* REASON */}
          <div className="end-reason-tag">
            {displayReason}
          </div>

          {/* PLAYER COMPARISON */}
          <div className="end-stats-comparison">

            {/* CURRENT PLAYER */}
            <div
              className="end-stat-block"
              style={{ textAlign: 'left' }}
            >
              <div className="end-player-name">
                {me.username || 'Unknown'}
              </div>

              <div className="end-elo-delta">
                {me.newElo || me.elo || '—'}

                <span
                  className={
                    me.change >= 0
                      ? 'delta-pos'
                      : 'delta-neg'
                  }
                >
                  {me.change > 0
                    ? ` +${me.change}`
                    : me.change
                      ? ` ${me.change}`
                      : ''}
                </span>
              </div>
            </div>

            {/* VS */}
            <div className="end-vs-divider">
              VS
            </div>

            {/* OPPONENT */}
            <div
              className="end-stat-block"
              style={{ textAlign: 'right' }}
            >
              <div className="end-player-name">
                {opp.username || 'Unknown'}
              </div>

              <div className="end-elo-delta">
                {opp.newElo || opp.elo || '—'}

                <span
                  className={
                    opp.change >= 0
                      ? 'delta-pos'
                      : 'delta-neg'
                  }
                >
                  {opp.change > 0
                    ? ` +${opp.change}`
                    : opp.change
                      ? ` ${opp.change}`
                      : ''}
                </span>
              </div>
            </div>

          </div>

          {/* ACTION BUTTONS */}
          <div className="end-actions">

            <button
              className="end-btn end-btn-primary"
              onClick={onNewGame}
            >
              Find New Match
            </button>

            {gameId && (
              <button
                className="end-btn end-btn-review"
                onClick={handleReview}
              >
                Analyze with SOX Engine
              </button>
            )}

            <button
              className="end-btn end-btn-secondary"
              onClick={onClose}
            >
              Review Board
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

export default GameEndModal;