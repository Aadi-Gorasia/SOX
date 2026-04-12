// client/src/components/GameEndModal.js
import React from 'react';
import './GameEndModal.css';

const GameEndModal = ({ result, currentUser, onNewGame, onClose }) => {
  if (!result) return null;

  const players = result.players || result.playerDetails ||[];
  const myName = currentUser?.username || "Player";
  
  const me = players.find(p => p?.username === myName) || players[0] || {};
  const opp = players.find(p => p?.username !== myName) || players[1] || { username: "Opponent" };

  const isDraw = result.winner === 'D';
  const iWon = !isDraw && (result.winnerId === me.id || result.winner === (players.indexOf(me) === 0 ? 'X' : 'O'));

  const statusTitle = isDraw ? "Draw" : iWon ? "Victory" : "Defeat";
  const statusTheme = isDraw ? "draw" : iWon ? "win" : "loss";

  const reasonMap = {
    'checkmate': 'Tactical Elimination',
    'resignation': 'Opponent Resigned',
    'timeout': 'Time Expired',
    'agreement': 'Mutual Agreement'
  };
  const displayReason = reasonMap[result.reason] || result.reason || "Match Concluded";

  return (
    <div className="end-modal-backdrop">
      <div className={`end-report-frame ${statusTheme}`}>
        
        {/* Background Grid Accent */}
        <div className="end-grid-bg">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="end-grid-cell" />
          ))}
        </div>

        <div className="end-content">
          <h1 className="end-outcome-title">{statusTitle}</h1>
          <div className="end-reason-tag">{displayReason}</div>

          <div className="end-stats-comparison">
            <div className="end-stat-block" style={{ textAlign: 'left' }}>
              <div className="end-player-name">{me.username || "Unknown"}</div>
              <div className="end-elo-delta">
                {me.newElo || me.elo} 
                <span className={me.change >= 0 ? "delta-pos" : "delta-neg"}>
                   {me.change > 0 ? ` +${me.change}` : ` ${me.change || ''}`}
                </span>
              </div>
            </div>

            <div className="end-vs-divider">VS</div>

            <div className="end-stat-block" style={{ textAlign: 'right' }}>
              <div className="end-player-name">{opp.username || "Unknown"}</div>
              <div className="end-elo-delta">
                {opp.newElo || opp.elo} 
                <span className={opp.change >= 0 ? "delta-pos" : "delta-neg"}>
                   {opp.change > 0 ? ` +${opp.change}` : ` ${opp.change || ''}`}
                </span>
              </div>
            </div>
          </div>

          <div className="end-actions">
            <button className="end-btn end-btn-primary" onClick={onNewGame}>
              Find New Match
            </button>
            <button className="end-btn end-btn-secondary" onClick={onClose}>
              Review Board
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GameEndModal;