import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Clock3, RotateCw } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './GamesHistoryPage.css';

const PAGE_SIZE = 20;

function getResult(game, currentUserId) {
  if (game.status === 'DRAW') return { label: 'Draw', tone: 'draw' };
  const winnerId = game.winner?._id ?? game.winner?.id ?? game.winner;
  return String(winnerId) === String(currentUserId)
    ? { label: 'Win', tone: 'win' }
    : { label: 'Loss', tone: 'loss' };
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
}

export default function GamesHistoryPage() {
  const { user } = useContext(AuthContext);
  const [games, setGames] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadGames = useCallback(async (startAt, append) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/games/history`,
        { params: { limit: PAGE_SIZE, offset: startAt } }
      );
      const nextGames = Array.isArray(response.data)
        ? response.data
        : response.data?.games;
      if (!Array.isArray(nextGames)) throw new Error('The game history response was invalid.');
      setGames(current => append ? [...current, ...nextGames] : nextGames);
      setOffset(startAt + nextGames.length);
      setHasMore(nextGames.length === PAGE_SIZE);
    } catch (loadError) {
      console.error('[Game history] Unable to load games:', loadError);
      setError(loadError.response?.data?.msg || 'Could not load your past games. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadGames(0, false);
  }, [loadGames]);

  return (
    <main className="games-history-page">
      <div className="games-history-wrap">
        <header className="games-history-header">
          <Link className="games-history-back" to="/dashboard">
            <ArrowLeft size={16} /> Arena
          </Link>
          <span className="games-history-brand">SOX <b>ARCHIVE</b></span>
          <span className="games-history-user">{user?.username}</span>
        </header>

        <section className="games-history-intro">
          <span className="games-history-eyebrow">YOUR MATCH RECORD</span>
          <h1>Past games</h1>
          <p>Open any completed match to replay every move and run its game review.</p>
        </section>

        <section className="games-history-card" aria-label="Past games">
          <div className="games-history-card__head">
            <div>
              <span className="games-history-eyebrow">ARCHIVE</span>
              <h2>Game history <span>{games.length}{hasMore ? '+' : ''}</span></h2>
            </div>
            <Clock3 size={18} />
          </div>

          {loading ? (
            <div className="games-history-state"><span className="games-history-spinner" /> Loading your games…</div>
          ) : error && games.length === 0 ? (
            <div className="games-history-state games-history-state--error" role="alert">
              <p>{error}</p>
              <button onClick={() => loadGames(0, false)}><RotateCw size={14} /> Try again</button>
            </div>
          ) : games.length === 0 ? (
            <div className="games-history-state">
              <p>No completed games yet. Your matches will show up here.</p>
              <Link to="/play">Find a game <ChevronRight size={15} /></Link>
            </div>
          ) : (
            <div className="games-history-list">
              {games.map(game => {
                const result = getResult(game, user?._id ?? user?.id);
                const opponent = game.players?.find(player =>
                  String(player._id ?? player.id) !== String(user?._id ?? user?.id)
                );
                const moveCount = game.moves?.length ?? 0;
                return (
                  <article className="games-history-row" key={game._id}>
                    <span className={`games-history-result games-history-result--${result.tone}`}>
                      {result.label}
                    </span>
                    <div className="games-history-opponent">
                      <strong>vs {opponent?.username || 'Unknown opponent'}</strong>
                      <span>{formatDate(game.endDate || game.createdAt)}</span>
                    </div>
                    <div className="games-history-details">
                      <span>{game.timeControl || '—'}</span>
                      <span>{moveCount} {moveCount === 1 ? 'move' : 'moves'}</span>
                    </div>
                    <Link className="games-history-review" to={`/review/${game._id}`}>
                      Review game <ChevronRight size={15} />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && hasMore && games.length > 0 && (
            <div className="games-history-more">
              {error && <span role="alert">{error}</span>}
              <button
                onClick={() => loadGames(offset, true)}
                disabled={loadingMore}
              >
                {loadingMore ? <><span className="games-history-spinner" /> Loading…</> : 'Load older games'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
