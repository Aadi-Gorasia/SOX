// client/src/components/PlayerHUD.js
import React, { useMemo } from "react";
import "./PlayerHUD.css";

const PlayerHUD = ({ player = {}, time = 0, isActive = false, symbol = "X", baseTime = 600000 }) => {
  
  const formatTacticalClock = (ms) => {
    const totalSeconds = Math.max(0, ms / 1000);
    if (totalSeconds < 10 && totalSeconds > 0) {
      const seconds = Math.floor(totalSeconds);
      const tenths = Math.floor((ms % 1000) / 100);
      return `${seconds}.${tenths}`;
    }
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const vitalsPercentage = useMemo(() => {
    const rawPct = (time / baseTime) * 100;
    return Math.max(0, Math.min(100, rawPct));
  }, [time, baseTime]);

  const isEmergency = time < 15000 && time > 0;

  return (
    <div className={`hud-player ${isActive ? "active" : ""} ${isEmergency ? "low-time" : ""}`}>
      <header className="hud-player-header">
        <div className="hud-user-info">
          <span className="hud-name">{player.username || "Unknown"}</span>
          <span className="hud-elo">ELO: {player.elo ?? 1000}</span>
        </div>
        <div className={`hud-symbol-indicator ${symbol.toLowerCase()}`}>{symbol}</div>
      </header>

      <div className="hud-timer-zone">
        <div className="hud-clock">{formatTacticalClock(time)}</div>
        <div className="hud-vitals">
          <div className="vital-fill" style={{ width: `${vitalsPercentage}%` }} />
        </div>
      </div>
    </div>
  );
};

export default PlayerHUD;