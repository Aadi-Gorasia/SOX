import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import InteractiveBG from '../components/InteractiveBG';
import './TournamentPage.css';

const TournamentPage = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { tournamentId } = useParams();

  const [queueState, setQueueState] = useState({ current: 0, required: 4 });
  const [bracket, setBracket] = useState(null);
  const [status, setStatus] = useState('IDLE'); // IDLE, QUEUING, ACTIVE

  useEffect(() => {
    if (!socket || !user) return;

    // If navigated here with an ID, we are just viewing/playing a running tournament
    if (tournamentId) {
      socket.emit('requestTournamentState', tournamentId);
      setStatus('ACTIVE');
    }

    // Queue Listeners
    socket.on('tournamentQueueUpdate', (data) => {
      setQueueState(data);
    });

    socket.on('tournamentStarted', (tId) => {
      navigate(`/tournament/${tId}`);
      socket.emit('requestTournamentState', tId);
      setStatus('ACTIVE');
    });

    socket.on('tournamentState', (tData) => {
      setBracket(tData);
      setStatus('ACTIVE');
    });

    return () => {
      socket.off('tournamentQueueUpdate');
      socket.off('tournamentStarted');
      socket.off('tournamentState');
    };
  },[socket, user, tournamentId, navigate]);

  const joinQueue = () => {
    if (!socket || !user) return;
    socket.emit('joinTournamentQueue', { id: user._id, username: user.username });
    setStatus('QUEUING');
  };

  const leaveQueue = () => {
    socket.emit('leaveTournamentQueue');
    setStatus('IDLE');
  };

  // Check if current user has an active game to join
  const getActiveGameId = () => {
    if (!bracket) return null;
    for (let round of bracket.rounds) {
      for (let match of round) {
        if (!match.winner && match.gameId) {
          if (match.p1?.id === user._id || match.p2?.id === user._id) {
            return match.gameId;
          }
        }
      }
    }
    return null;
  };

  const activeGameId = getActiveGameId();

  return (
    <div className="tourney-root">
      <InteractiveBG />
      
      <div className="tourney-wrap">
        
        {/* Header */}
        <div className="tourney-hero">
          <div className="tourney-badge">Elite Series</div>
          <h1 className="tourney-title">Sit & Go Tournament</h1>
          <p style={{ color: 'var(--text-2)' }}>4-Player elimination bracket. Winner takes all.</p>
          
          {status === 'IDLE' && (
            <button className="tourney-action-btn" onClick={joinQueue} style={{ marginTop: '2rem' }}>
              Enter Queue
            </button>
          )}

          {status === 'QUEUING' && (
            <div className="tourney-queue">
              <div className="queue-numbers">
                <span>{queueState.current}</span> / {queueState.required}
              </div>
              <p style={{fontFamily: 'var(--mono)', color: 'var(--text-3)'}}>Waiting for operatives...</p>
              <button className="tourney-action-btn" onClick={leaveQueue} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-1)'}}>
                Leave Queue
              </button>
            </div>
          )}

          {status === 'ACTIVE' && activeGameId && (
            <div style={{ marginTop: '2rem' }}>
              <button className="tourney-action-btn" onClick={() => navigate(`/game/${activeGameId}`)} style={{ animation: 'pulse-ring 1.5s infinite' }}>
                Join Active Match
              </button>
            </div>
          )}
        </div>

        {/* Bracket Render */}
        {status === 'ACTIVE' && bracket && (
          <div className="bracket-container">
            {bracket.rounds.map((round, rIndex) => (
              <div key={rIndex} className="bracket-round">
                <div className="round-title">
                  {rIndex === bracket.rounds.length - 1 ? 'Finals' : `Round ${rIndex + 1}`}
                </div>
                
                {round.map((match, mIndex) => {
                  const isActive = !match.winner && match.p1 && match.p2;
                  
                  return (
                    <div key={mIndex} className={`match-card ${isActive ? 'is-active' : ''}`}>
                      
                      <div className={`match-player ${match.winner?.id === match.p1?.id ? 'is-winner' : match.winner ? 'is-loser' : ''}`}>
                        <span className="player-name">{match.p1?.username || 'TBD'}</span>
                        {match.winner?.id === match.p1?.id && <span style={{fontSize: '12px'}}>WIN</span>}
                      </div>
                      
                      <div className={`match-player ${match.winner?.id === match.p2?.id ? 'is-winner' : match.winner ? 'is-loser' : ''}`}>
                        <span className="player-name">{match.p2?.username || 'TBD'}</span>
                        {match.winner?.id === match.p2?.id && <span style={{fontSize: '12px'}}>WIN</span>}
                      </div>

                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Champion Display */}
            {bracket.status === 'COMPLETED' && (
              <div className="bracket-round" style={{ justifyContent: 'center' }}>
                <div className="round-title" style={{ color: 'var(--accent)' }}>Champion</div>
                <div className="match-card is-active" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div className="player-name" style={{ fontSize: '24px', color: 'var(--accent)' }}>
                    {bracket.rounds[bracket.rounds.length - 1][0].winner?.username}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default TournamentPage;