// client/src/pages/HomePage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import DisplayBoard from '../components/DisplayBoard';
import './HomePage.css';

// --- Hero Section: "INSERT COIN" ---
const HeroSection = () => (
  <section className="hero-section">
    <div className="hero-content">
      <h1 className="hero-title">
        ULTIMATE
        <span>TIC-TAC-TOE</span>
      </h1>
      <p className="hero-subtitle">
        9 BOARDS. 1 VICTOR. This ain't your grandpa&apos;s X&apos;s and O&apos;s. Prepare for a
        strategic showdown where every move warps the battlefield.
      </p>
      <div className="hero-buttons">
        <Link to="/play" className="btn btn-primary btn-large">
          PLAY NOW
        </Link>
        <Link to="/register" className="btn btn-secondary btn-large">
          SIGN UP
        </Link>
      </div>
    </div>
    <div className="hero-board-container">
      <DisplayBoard />
    </div>
  </section>
);

// --- Game Rules Section ---
const GameRulesSection = () => (
  <section className="game-rules-section">
    <div className="section-header">
      <h2>STRATEGY GUIDE</h2>
      <p>Memorize the rules. Master the board.</p>
    </div>
    <div className="rules-grid">
      <div className="insane-card rule-card">
        <div className="card-content">
          <h3>
            <span>01.</span> DICTATE PLAY
          </h3>
          <p>Your move in any small grid forces your opponent into the corresponding large grid. Trap them.</p>
        </div>
      </div>
      <div className="insane-card rule-card">
        <div className="card-content">
          <h3>
            <span>02.</span> CONQUER GRIDS
          </h3>
          <p>Win a small 3x3 grid to claim that square on the main board. Each victory is a strategic asset.</p>
        </div>
      </div>
      <div className="insane-card rule-card">
        <div className="card-content">
          <h3>
            <span>03.</span> TOTAL DOMINATION
          </h3>
          <p>Be the first to align three captured grids on the main board. Claim your place as the champion.</p>
        </div>
      </div>
    </div>
  </section>
);

// --- Battlefield Section (unused for now, but kept for future) ---
const BattlefieldSection = () => (
  <section className="battlefield-section">
    <div className="section-header">
      <h2>KNOW YOUR BATTLEFIELD</h2>
      <p>The 9x9 grid is your arena. Study it.</p>
    </div>
    <div className="insane-card battlefield-display">
      <DisplayBoard />
    </div>
  </section>
);

// --- High Scores Section ---
const HighScoresSection = ({ leaderboard, isLoading, error }) => {
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

  const renderContent = () => {
    if (isLoading) {
      return <p className="loading-text">LOADING HIGH SCORES...</p>;
    }

    if (error) {
      return <p className="error-text">NETWORK ERROR: CANNOT LOAD SCORES.</p>;
    }

    if (!Array.isArray(leaderboard)) {
      // Defensive: if backend sends object/string instead of array, don’t crash UI
      return <p className="error-text">DATA ERROR: LEADERBOARD FORMAT INVALID.</p>;
    }

    if (safeLeaderboard.length === 0) {
      return <p>NO SCORES RECORDED. BE THE FIRST!</p>;
    }

    // Shows top 5
    return safeLeaderboard.slice(0, 5).map((player, index) => (
      <div key={player._id || player.username || index} className="high-scores-item">
        <span className="rank">#{index + 1}</span>
        <span className="username">{String(player.username || 'UNKNOWN').toUpperCase()}</span>
        <span className="elo">{player.elo ?? '—'}</span>
      </div>
    ));
  };

  return (
    <section className="high-scores-section">
      <div className="section-header">
        <h2>HIGH SCORES</h2>
        <p>Think you&apos;re the best? Prove it.</p>
      </div>
      <div className="insane-card high-scores-container">
        <div className="card-header">
          <span>RANK</span>
          <span>PLAYER</span>
          <span>SCORE</span>
        </div>
        <div className="card-content">{renderContent()}</div>
      </div>
    </section>
  );
};

// --- Final Call to Action Section ---
const CtaSection = () => (
  <section className="cta-section">
    <h2>ENTER THE ARENA</h2>
    <p>Your next challenge awaits. Are you ready?</p>
    <Link to="/play" className="btn btn-primary btn-large">
      FIND A MATCH
    </Link>
  </section>
);

// --- Footer Component ---
const Footer = () => (
  <footer className="homepage-footer">
    <p>&copy; {new Date().getFullYear()} SOX ARCADE DIVISION | GAME ON</p>
  </footer>
);

// --- Main HomePage Component ---
const HomePage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get('/api/users/leaderboard');

        const data = res.data;

        // Normalize API response into an array so UI never dies on .slice().map
        let normalized = [];
        if (Array.isArray(data)) {
          normalized = data;
        } else if (data && Array.isArray(data.leaderboard)) {
          normalized = data.leaderboard;
        } else if (data && Array.isArray(data.users)) {
          normalized = data.users;
        } else {
          console.warn('Unexpected leaderboard response shape:', data);
        }

        setLeaderboard(normalized);
      } catch (err) {
        console.error('Could not fetch leaderboard', err);
        setError('Failed to fetch leaderboard data.');
        setLeaderboard([]); // keep it as an array
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="home-page">
      {/* LiveBackground is global in App.js now */}
      <div className="page-container">
        <HeroSection />
        <GameRulesSection />
        {/* BattlefieldSection can be re-enabled if you want that section visible */}
        {/* <BattlefieldSection /> */}
        <HighScoresSection
          leaderboard={leaderboard}
          isLoading={isLoading}
          error={error}
        />
        <CtaSection />
      </div>
      <Footer />
    </div>
  );
};

export default HomePage;
