// client/src/pages/HomePage.js
import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import DisplayBoard from '../components/DisplayBoard';
import './HomePage.css';

const LeaderboardItem = ({ player, rank }) => (
    <motion.div className="leaderboard-item" initial={{opacity: 0, x: -20}} whileInView={{opacity: 1, x: 0}} transition={{duration: 0.5, delay: rank * 0.1}}>
        <span className="rank">#{rank + 1}</span>
        <span className="username">{player.username}</span>
        <span className="elo">{player.elo}</span>
    </motion.div>
);

const Footer = () => (
  <footer className="homepage-footer">
    <p>© 2024 SOX | Built for a College Application.</p>
  </footer>
);

const HomePage = () => {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users/leaderboard');
        setLeaderboard(res.data);
      } catch (err) {
        console.error("Could not fetch leaderboard", err);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="homepage-container-cinematic">
      <div className="animated-grid-bg"></div>
      {/* Navbar is now rendered globally by App.js, so it's removed from here */}
      <main className="homepage-main-content">
        <section className="hero-section-cinematic">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Strategy. Evolved.
          </motion.h1>
          <motion.p 
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            The ultimate test of Tic-Tac-Toe mastery. Outthink your opponent on a dynamic, nine-board battlefield.
          </motion.p>
          <motion.div 
            className="hero-buttons"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link to="/play" className="hero-button primary">Play Now</Link>
            <Link to="#how-to-play" className="hero-button">Learn More</Link>
          </motion.div>
        </section>

        <section id="how-to-play" className="info-section">
            <h2>It's Not Just a Game. It's a Duel.</h2>
            <div className="info-cards">
                <motion.div className="info-card" initial={{opacity: 0, y: 50}} whileInView={{opacity: 1, y: 0}} transition={{duration: 0.5}}>
                    <h3>Think Ahead</h3>
                    <p>Each move you make in a small square sends your opponent to the corresponding larger square.</p>
                </motion.div>
                <motion.div className="info-card" initial={{opacity: 0, y: 50}} whileInView={{opacity: 1, y: 0}} transition={{duration: 0.5, delay: 0.2}}>
                    <h3>Conquer Territory</h3>
                    <p>Win a small 3x3 board to claim that square on the main board with your mark.</p>
                </motion.div>
                <motion.div className="info-card" initial={{opacity: 0, y: 50}} whileInView={{opacity: 1, y: 0}} transition={{duration: 0.5, delay: 0.4}}>
                    <h3>Claim Victory</h3>
                    <p>Be the first to align three of your marks on the main board to win the entire game.</p>
                </motion.div>
            </div>
        </section>
        
        <section className="info-section leaderboard-section">
            <h2>Join the Elite</h2>
            <p className="section-subtitle">See how you stack up against the best players on the platform.</p>
            <div className="leaderboard-container">
                {leaderboard.length > 0 ? (
                    leaderboard.map((player, index) => (
                        <LeaderboardItem key={player._id} player={player} rank={index} />
                    ))
                ) : (
                    <p>Loading leaderboard...</p>
                )}
            </div>
        </section>

        <section className="final-cta-section">
            <h2>Ready to Make Your Move?</h2>
            <p>Your first victory is just a few clicks away. Sign up for free and start your journey to the top.</p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/register" className="hero-button primary large">Create Your Account</Link>
            </motion.div>
        </section>
        <Footer />
      </main>
    </div>
  );
};

export default HomePage;