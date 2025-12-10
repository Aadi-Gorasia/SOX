// client/components/PlayerHUD.js
import React, { useMemo } from "react";
import "./PlayerHUD.css";

/**
 * PlayerHUD
 * props:
 *   - player { username, elo, avatar? }
 *   - time in ms (number)
 *   - isActive boolean
 *   - side: "left" | "right"
 */
export default function PlayerHUD({ player = {}, time = 0, isActive = false, side = "left" }) {
  // clamp and format
  const seconds = Math.max(0, Math.floor((time % 60000) / 1000));
  const minutes = Math.max(0, Math.floor(time / 60000));
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // bar percent: time is assumed relative to a default (e.g., 5 minutes -> 300000ms)
  // If you have real clock length, pass it in. Here we use 5 minutes baseline for visual.
  const pct = useMemo(() => {
    const baseline = 5 * 60 * 1000;
    return Math.max(2, Math.min(100, Math.round((time / baseline) * 100)));
  }, [time]);

  return (
    <div className={`hud-player ${side} ${isActive ? "active" : ""}`}>
      <div className="player-meta">
        <div className="player-name">{player.username || "Player"}</div>
        <div className="player-elo">PWR: {player.elo ?? 0}</div>
      </div>

      <div className="hud-timer-capsule">
        <div className="capsule-bar-outer">
          <div className="capsule-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="capsule-time">{timeStr}</div>
      </div>
    </div>
  );
}
