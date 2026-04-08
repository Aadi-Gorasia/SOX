// client/src/components/PlayerHUD.js
import React, { useMemo } from "react";
import "./PlayerHUD.css";

/**
 * PLAYER HUD COMPONENT
 * 
 * @param {Object} player - The user data object (username, elo, etc.)
 * @param {number} time - Remaining simulation time in milliseconds.
 * @param {boolean} isActive - Is it currently this player's turn?
 * @param {string} symbol - 'X' or 'O'.
 * @param {number} baseTime - The starting time of the match (for bar calculation).
 */
const PlayerHUD = ({ 
  player = {}, 
  time = 0, 
  isActive = false, 
  symbol = "X", 
  baseTime = 600000 
}) => {
  
  /**
   * CHRONO FORMATTER
   * Converts MS into a tactical readout.
   * Logic: If time > 10s, show MM:SS. If time < 10s, show SS.T (Tenths).
   */
  const formatTacticalClock = (ms) => {
    const totalSeconds = Math.max(0, ms / 1000);
    
    // High-Precision Mode (Under 10 seconds)
    if (totalSeconds < 10 && totalSeconds > 0) {
      const seconds = Math.floor(totalSeconds);
      const tenths = Math.floor((ms % 1000) / 100);
      return `${seconds}.${tenths}`;
    }

    // Standard Mode
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /**
   * BIOMETRIC CALCULATION
   * Determines the width of the Vital Bar.
   */
  const vitalsPercentage = useMemo(() => {
    const rawPct = (time / baseTime) * 100;
    return Math.max(0, Math.min(100, rawPct));
  }, [time, baseTime]);

  // Critical State: 15 Seconds remaining
  const isEmergency = time < 15000 && time > 0;

  return (
    <div className={`hud-player ${isActive ? "active" : ""} ${isEmergency ? "low-time" : ""}`}>
      {/* DECORATIVE TERMINAL STRINGS */}
      <div className="hud-decoration-left">UPLINK_STABLE // NO_BREACH</div>
      
      {/* IDENTITY LAYER */}
      <header className="hud-player-header">
        <div className="hud-user-info">
          <span className="hud-name">{player.username || "UNKNOWN_OPERATIVE"}</span>
          <span className="hud-elo hp-mono">ELO_RATING // {player.elo ?? 1000}</span>
        </div>
        <div className={`hud-symbol-indicator ${symbol.toLowerCase()}`}>
          {symbol}
        </div>
      </header>

      {/* CHRONO LAYER */}
      <div className="hud-timer-zone">
        <div className="hud-clock hp-mono">
          {formatTacticalClock(time)}
        </div>
        
        {/* THE VITAL BAR (Visual representation of simulation time) */}
        <div className="hud-vitals">
          <div 
            className="vital-fill" 
            style={{ 
              width: `${vitalsPercentage}%`,
              // The bar color is handled by the .active and .low-time classes in CSS
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerHUD;