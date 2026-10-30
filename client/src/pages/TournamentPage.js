import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import InteractiveBG from '../components/InteractiveBG';
import './TournamentPage.css';

function playerId(player) {
  return String(player?.id ?? player?._id ?? '');
}

const TournamentPage = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { tournamentId } = useParams();

  const [queueState, setQueueState] = useState({ current: 0, required: 4 });
  const [bracket, setBracket] = useState(null);
  const [status, setStatus] = useState('IDLE'); // IDLE, QUEUING, ACTIVE
  const [stateLoaded, setStateLoaded] = useState(false);
  const statusRef = useRef(status);

  const updateStatus = nextStatus => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  };

  useEffect(() => {
    if (!socket || !user) return;

    const onQueueUpdate = data => {
      setQueueState(data);
    };

    const onTournamentStarted = tId => {
      updateStatus('ACTIVE');
      navigate(`/tournament/${tId}`);
      socket.emit('requestTournamentState', tId);
    };

    const onTournamentState = tData => {
      setBracket(tData);
      setStateLoaded(true);
      updateStatus('ACTIVE');
    };

    socket.on('tournamentQueueUpdate', onQueueUpdate);
    socket.on('tournamentStarted', onTournamentStarted);
    socket.on('tournamentState', onTournamentState);

    if (tournamentId) {
      setStateLoaded(false);
      updateStatus('ACTIVE');
      socket.emit('requestTournamentState', tournamentId);
    }

    return () => {
      socket.off('tournamentQueueUpdate', onQueueUpdate);
      socket.off('tournamentStarted', onTournamentStarted);
      socket.off('tournamentState', onTournamentState);
    };
  }, [socket, user, tournamentId, navigate]);

  useEffect(() => () => {
    if (statusRef.current === 'QUEUING') {
      socket?.emit('leaveTournamentQueue');
    }
  }, [socket]);

  const joinQueue = () => {
    if (!socket || !user) return;
    socket.emit('joinTournamentQueue', { id: user._id, username: user.username });
    updateStatus('QUEUING');
  };

  const leaveQueue = () => {
    socket?.emit('leaveTournamentQueue');
    updateStatus('IDLE');
  };

  const activeGameId = bracket?.rounds?.flat().find(match =>
    !match.winner && match.gameId &&
    [match.p1, match.p2].some(player => playerId(player) === playerId(user))
  )?.gameId;
  const champion = bracket?.rounds?.at(-1)?.[0]?.winner;

  return (
    <div className="tourney-root">
      <InteractiveBG />
      
      <div className="tourney-wrap">
        <header className="tourney-page-header">
          <button className="tourney-back-btn" onClick={() => navigate('/dashboard')}>
            <span aria-hidden="true">←</span> Dashboard
          </button>
          <span className="tourney-header-mark">SOX / COMPETITIVE</span>
        </header>

        <div className="tourney-hero">
          <div className="tourney-badge">Four-player · Sit &amp; go</div>
          <h1 className="tourney-title">Tournament arena</h1>
          <p className="tourney-description">
            Two semifinals. One final. Enter the queue and compete for the title.
          </p>
          
          {status === 'IDLE' && (
            <button className="tourney-action-btn" onClick={joinQueue}>
              Enter tournament queue <span aria-hidden="true">→</span>
            </button>
          )}

          {status === 'QUEUING' && (
            <div className="tourney-queue">
              <div className="queue-progress" aria-live="polite">
                <div className="queue-numbers">
                  <span>{queueState.current}</span><span className="queue-divider">/</span>{queueState.required}
                </div>
                <div className="queue-progress-track">
                  <span style={{ width: `${Math.min(100, (queueState.current / queueState.required) * 100)}%` }} />
                </div>
              </div>
              <p className="tourney-queue-caption">Players in queue</p>
              <button className="tourney-action-btn tourney-action-btn--secondary" onClick={leaveQueue}>
                Leave queue
              </button>
            </div>
          )}

          {status === 'ACTIVE' && activeGameId && (
            <div className="tourney-active-action">
              <button className="tourney-action-btn" onClick={() => navigate(`/game/${activeGameId}`)}>
                Join your active match <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>

        {status === 'ACTIVE' && !stateLoaded && (
          <div className="tourney-empty-state" role="status">Loading tournament bracket…</div>
        )}

        {status === 'ACTIVE' && stateLoaded && bracket && (
          <>
            <div className="bracket-heading">
              <div>
                <span className="tourney-section-kicker">LIVE BRACKET</span>
                <h2>{bracket.status === 'COMPLETED' ? 'Tournament complete' : 'Tournament in progress'}</h2>
              </div>
              <span className={`bracket-status ${bracket.status === 'COMPLETED' ? 'is-complete' : ''}`}>
                {bracket.status === 'COMPLETED' ? 'COMPLETE' : 'LIVE'}
              </span>
            </div>
            <div className="bracket-container">
            {bracket.rounds.map((round, rIndex) => (
              <div key={rIndex} className="bracket-round">
                <div className="round-title">
                  <span>0{rIndex + 1}</span>
                  {rIndex === bracket.rounds.length - 1 ? 'Final' : 'Semifinals'}
                </div>
                
                {round.map((match, mIndex) => {
                  const isActive = !match.winner && match.p1 && match.p2;
                  const isMyMatch = activeGameId === match.gameId;
                  
                  return (
                    <article key={match.id || mIndex} className={`match-card ${isActive ? 'is-active' : ''} ${isMyMatch ? 'is-mine' : ''}`}>
                      <div className="match-card-heading">
                        <span>Match {mIndex + 1}</span>
                        <span>{match.winner ? 'FINAL' : isActive ? 'IN PLAY' : 'UP NEXT'}</span>
                      </div>
                      
                      {[match.p1, match.p2].map((player, playerIndex) => {
                        const isWinner = player && playerId(match.winner) === playerId(player);
                        const isLoser = Boolean(match.winner && player && !isWinner);
                        return (
                          <div key={playerIndex} className={`match-player ${isWinner ? 'is-winner' : ''} ${isLoser ? 'is-loser' : ''}`}>
                            <span className="match-player-symbol">{playerIndex === 0 ? 'X' : 'O'}</span>
                            <span className="player-name">{player?.username || 'Waiting for player'}</span>
                            {isWinner && <span className="winner-tag">WINNER</span>}
                          </div>
                        );
                      })}

                    </article>
                  );
                })}
              </div>
            ))}
            
            {champion && (
              <section className="tourney-champion">
                <span className="tourney-section-kicker">CHAMPION</span>
                <strong>{champion.username}</strong>
                <span>TOURNAMENT WINNER</span>
              </section>
            )}
            </div>
          </>
        )}

        {status === 'ACTIVE' && stateLoaded && !bracket && (
          <div className="tourney-empty-state">
            Tournament state isn’t available yet. Try refreshing this page.
          </div>
        )}

      </div>
    </div>
  );
};

export default TournamentPage;