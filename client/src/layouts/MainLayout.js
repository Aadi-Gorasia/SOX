// client/src/layouts/MainLayout.js
import React from 'react';
import Sidebar from '../components/Sidebar';
import PlayerInfo from '../components/PlayerInfo';
import './MainLayout.css'; // We will create this file next

const MainLayout = ({ children, isGame = false }) => {
  return (
    <div className={`main-layout-container ${isGame ? 'game-view' : 'dashboard-view'}`}>
      <Sidebar />
      <main className="main-content-area">
        {children}
      </main>
      {isGame && (
        <>
          <div className="timestamps-panel">
            <h3>Time Stamps</h3>
          </div>
          <footer className="footer-bar">
            <PlayerInfo />
          </footer>
        </>
      )}
    </div>
  );
};

export default MainLayout;