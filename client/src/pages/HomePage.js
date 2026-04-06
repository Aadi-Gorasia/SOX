import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import DisplayBoard from '../components/DisplayBoard';
import InteractiveBG from '../components/InteractiveBG';
import './HomePage.css';

const HomePage = () => {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/games/leaderboard`);
        setLeaderboard((res.data.leaderboard || res.data || []).slice(0, 5));
      } catch (err) { console.error(err); }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="hp-root">
      <InteractiveBG />
      
      <div className="hp-ui-layer">

        {/* 01. HERO SECTION */}
        <header className="hp-section hp-hero">
          <div className="hp-hero-content">
            <div className="hp-badge hp-mono"><span className="hp-dot"></span> SYSTEM_STABLE_v1.2.0</div>
            <h1 className="hp-title">BATTLE OF <br/><span className="text-crimson">RECURSIVE</span> <br/>LOGIC</h1>
            <p className="hp-desc">The ultimate strategy engine. A nested 9x9 grid where every local move dictates the global future.</p>
            <div className="hp-hero-btns">
              <Link to="/play" className="hp-btn-crimson">PLAY NOW</Link>
              <a href="#rules" className="hp-btn-outline">VIEW_SPECS</a>
            </div>
          </div>
          <div className="hp-hero-visual">
             <div className="hp-monolith-frame">
                <DisplayBoard />
             </div>
          </div>
        </header>

        {/* 02. CORE MECHANICS */}
        <section id="rules" className="hp-section hp-rules">
          <div className="hp-section-header">
            <span className="hp-mono text-sulfur">01 // THE_LOGIC</span>
            <h2 className="hp-section-title">SYSTEM_CORE</h2>
          </div>
          <div className="hp-rules-grid">
            <div className="hp-rule-card">
              <div className="hp-rule-num">01</div>
              <h3>THE NEST</h3>
              <p>9 games in 1. Win a small board to capture a macro-sector on the master grid.</p>
            </div>
            <div className="hp-rule-card active-crimson">
              <div className="hp-rule-num">02</div>
              <h3>FORCED VECTORS</h3>
              <p>Your move in a local grid determines where your opponent must play next globally.</p>
            </div>
            <div className="hp-rule-card active-sulfur">
              <div className="hp-rule-num">03</div>
              <h3>DOMINION</h3>
              <p>Connect three macro-sectors to resolve the simulation and claim victory.</p>
            </div>
          </div>
        </section>

        {/* 03. TACTICAL DEPTH (NEW) */}
        <section className="hp-section hp-depth">
          <div className="hp-depth-grid">
            <div className="hp-depth-text">
              <span className="hp-mono text-crimson">02 // STRATEGY</span>
              <h2 className="hp-section-title">MACRO <br/>DOMINANCE</h2>
              <p className="hp-desc">Mastering the "Throw-away" move. Sometimes, losing a local board is the only way to trap your opponent in a dead corner.</p>
              <ul className="hp-feature-list hp-mono">
                <li>+ CALCULATE 5 MOVES AHEAD</li>
                <li>+ FORCE SECTOR LOCKDOWN</li>
                <li>+ EXPLOIT GRID SYMMETRY</li>
              </ul>
            </div>
              <div className="hp-radar-ui"><img src="/gameplay.png" alt="Radar" height={700}/></div>
          </div>
        </section>

        {/* 04. GLOBAL RANKINGS */}
        <section className="hp-section hp-rankings">
          <div className="hp-section-header">
            <span className="hp-mono text-silver">03 // COMPETITION</span>
            <h2 className="hp-section-title">TOP_OPERATIVES</h2>
          </div>
          <div className="hp-table-container">
            {leaderboard.map((u, i) => (
              <div key={i} className="hp-table-row">
                <span className="hp-table-rank">0{i+1}</span>
                <span className="hp-table-name">{u.username.toUpperCase()}</span>
                <span className="hp-table-elo text-crimson">{u.elo || 1000} <span className="hp-mono text-xs text-steel">ELO</span></span>
              </div>
            ))}
          </div>
        </section>

        {/* 05. SYSTEM SPECS (NEW) */}
        <section className="hp-section hp-specs">
          <div className="hp-specs-grid">
            <div className="hp-spec-item">
              <span className="hp-spec-label">NODES</span>
              <span className="hp-spec-val">10^31</span>
            </div>
            <div className="hp-spec-item">
              <span className="hp-spec-label">LATENCY</span>
              <span className="hp-spec-val">12MS</span>
            </div>
            <div className="hp-spec-item">
              <span className="hp-spec-label">ENGINE</span>
              <span className="hp-spec-val">NEURO_v2</span>
            </div>
            <div className="hp-spec-item">
              <span className="hp-spec-label">PLAYERS</span>
              <span className="hp-spec-val">2.4K</span>
            </div>
          </div>
        </section>

        {/* 06. THE VOID CTA (NEW) */}
        <section className="hp-section hp-cta-void">
          <div className="hp-cta-content">
            <h2 className="hp-cta-title">READY TO ENTER <br/>THE <span className="text-sulfur">SIMULATION?</span></h2>
            <Link to="/play" className="hp-btn-massive">INITIATE_SESSION</Link>
          </div>
        </section>

        {/* FAT ASS FOOTER */}
        <footer className="hp-footer">
          <div className="hp-footer-top">
            <div className="hp-footer-brand">
              <div className="hp-logo-large">ULTI<span className="text-sulfur">TTT</span></div>
              <p className="hp-mono text-steel mt-4">STAY_SHARP_OR_GET_DELETED</p>
            </div>
            <div className="hp-footer-links">
              <div className="hp-footer-col">
                <span className="hp-col-title">PRODUCT</span>
                <Link to="/play">Arena</Link>
                <Link to="/leaderboard">Leaderboard</Link>
                <Link to="/docs">Documentation</Link>
              </div>
              <div className="hp-footer-col">
                <span className="hp-col-title">COMMUNITY</span>
                <a href="#">Discord</a>
                <a href="#">Twitter/X</a>
                <a href="#">GitHub</a>
              </div>
              <div className="hp-footer-col">
                <span className="hp-col-title">LEGAL</span>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">Cookies</a>
              </div>
            </div>
          </div>
          <div className="hp-footer-bottom hp-mono">
            <span>© 2025 SOX_ARCADIA_INDUSTRIES</span>
            <div className="hp-system-load">
              <span>CPU: 12%</span>
              <span>NET: STABLE</span>
              <span className="text-sulfur">REGION: GLOBAL_HUB_01</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;