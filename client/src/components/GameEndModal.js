// client/src/components/GameEndModal.js
import React from 'react';
import './GameEndModal.css';

/**
 * GAME END MODAL
 * A high-fidelity tactical report displayed upon simulation resolution.
 */
const GameEndModal = ({ result, currentUser, onNewGame, onClose }) => {
  // 1. SAFETY GATE: If no result data, return null to prevent crashes
  if (!result) return null;

  // 2. DATA EXTRACTION with Fallbacks
  const players = result.players || result.playerDetails || [];
  const myName = currentUser?.username || "OPERATIVE";
  
  // Find me and my opponent in the results array
  const me = players.find(p => p?.username === myName) || players[0] || {};
  const opp = players.find(p => p?.username !== myName) || players[1] || { username: "ANON_OPPONENT" };

  // 3. WIN/LOSS LOGIC
  const isDraw = result.winner === 'D';
  // Check if I am the winner by ID or by symbol
  const iWon = !isDraw && (result.winnerId === me.id || result.winner === (players.indexOf(me) === 0 ? 'X' : 'O'));

  const statusTitle = isDraw ? "STALEMATE" : iWon ? "VICTORY" : "DEFEAT";
  const statusTheme = isDraw ? "draw" : iWon ? "win" : "loss";

  // 4. REASON MAPPING
  const reasonMap = {
    'checkmate': 'TACTICAL_ELIMINATION',
    'resignation': 'OPPONENT_ABORTED',
    'timeout': 'TEMPORAL_EXPIRE',
    'agreement': 'MUTUAL_CEASEFIRE'
  };
  const displayReason = reasonMap[result.reason] || result.reason?.toUpperCase() || "SIM_TERMINATED";

  return (
    <div className="pp-modal-backdrop">
      <div className={`pp-report-frame ${statusTheme}`}>
        {/* CORNER ACCENTS */}
        <div className="corner-tl"></div><div className="corner-tr"></div>
        <div className="corner-bl"></div><div className="corner-br"></div>

        <header className="pp-report-header">
          <span className="hp-mono text-sulfur">// FINAL_SESSION_REPORT</span>
          <button className="pp-close-x" onClick={onClose}>[×]</button>
        </header>

        <div className="pp-report-body">
          <div className="pp-outcome-zone">
            <h1 className="Archivo pp-outcome-title">{statusTitle}</h1>
            <div className="hp-mono pp-reason-tag">{displayReason}</div>
          </div>

          <div className="pp-stats-comparison">
            {/* LOCAL OPERATIVE */}
            <div className="pp-stat-block">
              <span className="hp-mono text-silver text-xs">OPERATIVE</span>
              <div className="Archivo text-2xl">{(me.username || "UNKNOWN").toUpperCase()}</div>
              <div className="pp-elo-delta hp-mono">
                {me.newElo || me.elo} 
                <span className={me.change >= 0 ? "text-sulfur" : "text-crimson"}>
                   {me.change > 0 ? ` +${me.change}` : ` ${me.change || ''}`}
                </span>
              </div>
            </div>

            <div className="pp-vs-divider hp-mono">VS</div>

            {/* TARGET OPERATIVE */}
            <div className="pp-stat-block text-right">
              <span className="hp-mono text-silver text-xs">TARGET</span>
              <div className="Archivo text-2xl">{(opp.username || "UNKNOWN").toUpperCase()}</div>
              <div className="pp-elo-delta hp-mono">
                {opp.newElo || opp.elo} 
                <span className={opp.change >= 0 ? "text-sulfur" : "text-crimson"}>
                   {opp.change > 0 ? ` +${opp.change}` : ` ${opp.change || ''}`}
                </span>
              </div>
            </div>
          </div>

          <div className="pp-report-actions">
            <button className="pp-btn-report primary Archivo" onClick={onNewGame}>
              INITIATE_NEW_SIMULATION
            </button>
            <button className="pp-btn-report secondary hp-mono" onClick={onClose}>
              REVIEW_BATTLEFIELD
            </button>
          </div>
        </div>

        <footer className="pp-report-footer hp-mono">
          TIMESTAMP: {new Date().toISOString()} // ID: {result.id || "NULL"}
        </footer>
      </div>
    </div>
  );
};

export default GameEndModal;