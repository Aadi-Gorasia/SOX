// client/src/pages/HomePage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import axios from 'axios';
import DisplayBoard from '../components/DisplayBoard';
import './HomePage.css';

// --- Hero Section Component ---
const HeroSection = () => (
  <section className="hero-section">
    <motion.div
      className="hero-content"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
    >
      <h1 className="hero-title">
        The Classic Game,
        <span>Redefined.</span>
      </h1>
      <p className="hero-subtitle">
        Welcome to the next dimension of Tic-Tac-Toe. A nine-board battleground where every move dictates the field of play. Challenge your mind, dominate the board.
      </p>
      <div className="hero-buttons">
        <Link to="/play" className="btn btn-primary btn-large">Find a Match</Link>
        <Link to="/register" className="btn btn-secondary btn-large">Create Account</Link>
      </div>
    </motion.div>
    <motion.div
        className="hero-board-container"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
    >
        <DisplayBoard />
    </motion.div>
  </section>
);


// --- NEW: How to Play Section with Animated Timeline ---
const HowToPlaySection = () => {
    const targetRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start end", "end start"],
    });

    // Animate the vertical line based on scroll progress
    const height = useTransform(scrollYProgress, [0, 0.8], ["0%", "100%"]);

    const ruleVariants = {
        hidden: { opacity: 0, x: -50 },
        visible: { 
            opacity: 1, 
            x: 0,
            transition: { duration: 0.6 }
        }
    };

    return (
        <section ref={targetRef} className="how-to-play-section">
            <div className="section-header">
                <h2>A Game of Wits, Not Luck</h2>
                <p>Three rules separate the novice from the master.</p>
            </div>
            <div className="timeline-container">
                <div className="timeline-line-container">
                    <motion.div className="timeline-line" style={{ height }} />
                </div>
                <div className="timeline-items">
                    <motion.div className="timeline-item" variants={ruleVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}>
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                            <h3><span>01.</span> Control the Flow</h3>
                            <p>Your move in a small grid sends your opponent to the matching large grid. Force their hand.</p>
                        </div>
                    </motion.div>
                    <motion.div className="timeline-item" variants={ruleVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}>
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                            <h3><span>02.</span> Conquer Grids</h3>
                            <p>Win any 3x3 small grid to claim it on the main board. Each victory is a step towards the throne.</p>
                        </div>
                    </motion.div>
                    <motion.div className="timeline-item" variants={ruleVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}>
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                            <h3><span>03.</span> Claim Absolute Victory</h3>
                            <p>Be the first to align three of your claimed grids on the main board and prove your mastery.</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};


// --- Leaderboard Section Component ---
const LeaderboardSection = ({ leaderboard, isLoading, error }) => {
    const renderContent = () => {
        if (isLoading) return <p>Loading leaderboard...</p>;
        if (error) return <p>Could not load leaderboard. Please try again later.</p>;
        if (!leaderboard || leaderboard.length === 0) return <p>Leaderboard is empty.</p>;
        
        return leaderboard.map((player, index) => (
            <div key={player._id} className="leaderboard-item">
                <span className="rank">#{index + 1}</span>
                <span className="username">{player.username}</span>
                <span className="elo">{player.elo}</span>
            </div>
        ));
    };

    return (
        <motion.section 
            className="leaderboard-section"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
        >
            <div className="section-header">
              <h2>Climb the Ranks</h2>
              <p>See how you stack up against the best players on the platform.</p>
            </div>
            <div className="insane-card leaderboard-container">
              <div className="card-content">
                {renderContent()}
              </div>
            </div>
        </motion.section>
    );
};


// --- Footer Component ---
const Footer = () => (
  <footer className="homepage-footer">
    <p>&copy; {new Date().getFullYear()} SOX | A Modern Web Application Project.</p>
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
        setLeaderboard(res.data);
      } catch (err) {
        console.error("Could not fetch leaderboard", err);
        setError("Failed to fetch leaderboard data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="home-page">
      <div className="page-container">
        <HeroSection />
        <HowToPlaySection />
        <LeaderboardSection leaderboard={leaderboard} isLoading={isLoading} error={error} />
      </div>
      <Footer />
    </div>
  );
};

export default HomePage