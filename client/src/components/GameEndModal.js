import React from 'react';
import './GameEndModal.css';

const GameEndModal = ({ result, currentUser, onRematch, onNewGame, onReview, onClose }) => {
  if (!result) return null;

  // 1. Safe Data Extraction
  const players = result.players || [];
  const myUsername = currentUser?.username;
  
  // Find "Me" and "Opponent"
  let myPlayer = players.find(p => p.username === myUsername);
  let opponent = players.find(p => p.username !== myUsername);

  // Fallback for observers or reload glitches
  if (!myPlayer) {
    myPlayer = players[0];
    opponent = players[1] || { username: "OPPONENT", newElo: "---", change: 0 };
  }

  // 2. Determine Theme & Text
  let theme = "draw";
  let mainTitle = "DRAW";
  let subTitle = "MATCH TERMINATED";

  if (result.winner !== 'D') {
    // Check win condition
    const isWin = (myPlayer.change > 0) || (result.winnerId === myPlayer.id);

    if (isWin) {
      theme = "win";
      mainTitle = "VICTORY";
      subTitle = "OPPONENT NEUTRALIZED";
    } else {
      theme = "loss";
      mainTitle = "DEFEAT";
      subTitle = "SYSTEM FAILURE";
    }
  }

  // Reason mapping
  const reasonText = {
    'timeout': 'TIME EXPIRED',
    'agreement': 'MUTUAL CEASEFIRE',
    'resignation': 'OPPONENT RESIGNED',
    'checkmate': 'TACTICAL MATE' // or 'checkmate'
  }[result.reason] || result.reason.toUpperCase();

  return (
    <div className="modal-backdrop">
      <div className={`modal-terminal ${theme}`}>
        
        {/* --- HEADER BAR WITH CLOSE CROSS --- */}
        <div className="terminal-header">
          <div className="header-title">/// GAME_REPORT_LOG</div>
          <button className="terminal-close-btn" onClick={onClose}>
            [ ✖ ]
          </button>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="terminal-body">
          <div className="status-display">
            <h1 className="glitch-text" data-text={mainTitle}>{mainTitle}</h1>
            <div className="status-reason">{subTitle} :: {reasonText}</div>
          </div>

          <div className="stats-grid">
            {/* MY STATS */}
            <div className="stat-card mine">
              <span className="label">OPERATOR</span>
              <span className="value">{myPlayer.username}</span>
              <div className="elo-readout">
                <span className="elo-current">{myPlayer.newElo}</span>
                <span className={`elo-diff ${myPlayer.change >= 0 ? 'pos' : 'neg'}`}>
                  {myPlayer.change > 0 ? '+' : ''}{myPlayer.change}
                </span>
              </div>
            </div>

            <div className="vs-divider">VS</div>

            {/* OPPONENT STATS */}
            <div className="stat-card opp">
              <span className="label">TARGET</span>
              <span className="value">{opponent.username}</span>
              <div className="elo-readout">
                <span className="elo-current">{opponent.newElo}</span>
                <span className={`elo-diff ${opponent.change >= 0 ? 'pos' : 'neg'}`}>
                  {opponent.change > 0 ? '+' : ''}{opponent.change}
                </span>
              </div>
            </div>
          </div>

          {/* --- ACTION BUTTONS --- */}
          <div className="terminal-actions">
            <button className="action-btn primary" onClick={onNewGame}>
              <span>SEARCH_NEW_TARGET</span>
            </button>
            <div className="sub-actions">
              <button className="action-btn secondary" onClick={onRematch}>REMATCH</button>
              <button className="action-btn secondary" onClick={onReview}>ANALYZE_DATA</button>
            </div>
          </div>
        </div>
        
        {/* Decorative footer line */}
        <div className="terminal-footer">
          SYSTEM_ID: {result.winnerId || "NULL"} | TIMESTAMP: {Date.now()}
        </div>
      </div>
    </div>
  );
};

export default GameEndModal;