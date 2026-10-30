import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChevronLeft, CheckCircle2, XCircle, ArrowRight, Loader2, Info } from 'lucide-react';
import SuperBoard from '../components/SuperBoard';
import './PuzzlePage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// --- ROBUST LOGIC HELPERS ---
const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(cells) {
  for (const [a, b, c] of WIN_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
  }
  return cells.filter(c => c !== null).length === 9 ? 'D' : null;
}

function deriveState(sequence = []) {
  const allBoards = Array.from({ length: 9 }, () => Array(9).fill(null));
  const boardWinners = Array(9).fill(null);
  
  sequence.forEach((moveIndex, turn) => {
    if (moveIndex === null || moveIndex === undefined) return;
    const m = Math.floor(moveIndex / 9);
    const c = moveIndex % 9;
    allBoards[m][c] = turn % 2 === 0 ? 'X' : 'O';
  });

  for (let i = 0; i < 9; i++) {
    boardWinners[i] = checkWinner(allBoards[i]);
  }

  let activeBoard = null;
  if (sequence.length > 0) {
    const lastMove = sequence[sequence.length - 1];
    if (lastMove !== null && lastMove !== undefined) {
      const target = lastMove % 9;
      activeBoard = boardWinners[target] ? null : target;
    }
  }

  return { allBoards, boardWinners, activeBoard };
}

// --- OVERLAY COMPONENTS (Using percentages so they never misalign) ---
const CellHighlight = ({ cellIndex, type }) => {
  if (cellIndex === null || cellIndex === undefined) return null;
  const macro = Math.floor(cellIndex / 9);
  const micro = cellIndex % 9;
  const left = (macro % 3) * 33.33 + (micro % 3) * 11.11;
  const top = Math.floor(macro / 3) * 33.33 + Math.floor(micro / 3) * 11.11;

  return (
    <div 
      className={`puzzle-cell-highlight highlight-${type}`} 
      style={{ left: `${left}%`, top: `${top}%` }} 
    />
  );
};

const ArrowOverlay = ({ startCell, targetMacro, type }) => {
  if (startCell === null || targetMacro === null) return null;

  const macro = Math.floor(startCell / 9);
  const micro = startCell % 9;

  // Center of the played micro-cell
  const startX = (macro % 3) * 33.33 + (micro % 3) * 11.11 + 5.55;
  const startY = Math.floor(macro / 3) * 33.33 + Math.floor(micro / 3) * 11.11 + 5.55;

  // Center of the target macro-board
  const endX = (targetMacro % 3) * 33.33 + 16.66;
  const endY = Math.floor(targetMacro / 3) * 33.33 + 16.66;

  return (
    <svg className="puzzle-arrow-layer" viewBox="0 0 100 100">
      <defs>
        <marker id={`arrowhead-${type}`} markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" className={`arrow-head ${type}`} />
        </marker>
      </defs>
      <path
        d={`M ${startX} ${startY} L ${endX} ${endY}`}
        fill="none"
        className={`arrow-path ${type}`}
        markerEnd={`url(#arrowhead-${type})`}
      />
    </svg>
  );
};

export default function PuzzlePage() {
  const { gameId } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [puzzles, setPuzzles] = useState([]);
  const [index, setIndex] = useState(0);
  const [userRating, setUserRating] = useState(1200);
  
  const [result, setResult] = useState(null); 
  const [hoveredCell, setHoveredCell] = useState(null);
  const [optimisticSeq, setOptimisticSeq] = useState([]);

  const loadPuzzle = useCallback(async () => {
    setStatus('loading');
    setError('');
    setResult(null);
    setHoveredCell(null);
    try {
      const url = gameId ? `${API_BASE}/api/games/${gameId}/puzzles` : `${API_BASE}/api/games/puzzle/infinite-generate`;
      const res = await fetch(url, { headers: { 'x-auth-token': token } });
      const data = await res.json();
      if (!res.ok || (!data.puzzle && !data.puzzles)) {
        throw new Error(data.msg || data.error || 'Puzzle generation failed.');
      }
      
      const pzList = gameId ? data.puzzles : [data.puzzle];
      if (!pzList?.length) throw new Error('No puzzles are available for this game yet.');
      setPuzzles(pzList);
      setIndex(0);
      setOptimisticSeq(pzList[0].position || []);
      if (data.userCurrentRating) setUserRating(data.userCurrentRating);
      
      setStatus('ready');
    } catch (e) {
      setError(e.message || 'Unable to load a puzzle.');
      setStatus('error');
    }
  }, [gameId, token]);

  useEffect(() => { if(token) loadPuzzle(); }, [loadPuzzle, token]);

  const handleMove = async (m, c) => {
    if (result || status !== 'ready') return;
    const moveIdx = m * 9 + c;
    const current = puzzles[index];
    setStatus('submitting');
    setOptimisticSeq([...current.position, moveIdx]);

    try {
      const res = await fetch(`${API_BASE}/api/games/puzzle/infinite-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ answer: moveIdx, position: current.position }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Unable to check this move.');
      setResult({ ...data, bestMove: data.bestMove, selected: moveIdx });
      setStatus('ready');
    } catch (e) { 
      setOptimisticSeq(current.position); 
      setError(e.message || 'Unable to submit the move.');
      setStatus('ready');
    }
  };

  const { allBoards, boardWinners, activeBoard } = useMemo(() => deriveState(optimisticSeq), [optimisticSeq]);
  const puzzle = puzzles[index];
  const isX = puzzle?.position.length % 2 === 0;

  if (status === 'loading') {
    return (
      <div className="pz-clean-layout center-all">
        <Loader2 className="pz-spinner" size={40} />
        <p>Loading puzzle...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="pz-clean-layout center-all">
        <XCircle size={40} />
        <p>{error}</p>
        <button className="pz-btn-primary pz-retry-btn" onClick={loadPuzzle}>Try again</button>
      </div>
    );
  }

  return (
    <div className="pz-clean-layout">
      {/* 1. Header Area */}
      <header className="pz-header">
        <button className="pz-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} /> Back
        </button>
        <div className="pz-header-title">Tactical Training</div>
        <div className="pz-rating-badge">
          Elo <span className="font-bold">{userRating}</span>
        </div>
      </header>

      {/* 2. Main Content Layout */}
      <main className="pz-main-content">
        
        {/* LEFT COLUMN: The Board */}
        <div className="pz-board-column">
          <div className="pz-board-wrapper">
            
            {/* Native Highlight Boxes */}
            {result && !result.correct && (
              <>
                <CellHighlight cellIndex={result.selected} type="incorrect" />
                <CellHighlight cellIndex={result.bestMove} type="correct" />
                {/* Arrow explaining why the correct move is good */}
                <ArrowOverlay startCell={result.bestMove} targetMacro={result.bestMove % 9} type="correct" />
              </>
            )}

            {/* Hover Arrow Hint (Only shows before clicking) */}
            {!result && hoveredCell !== null && (
              <ArrowOverlay startCell={hoveredCell} targetMacro={hoveredCell % 9} type="hover" />
            )}

            {puzzle && (
              <SuperBoard
                allBoards={allBoards}
                boardWinners={boardWinners}
                activeBoard={activeBoard}
                isMyTurn={!result && status === 'ready'}
                onPlay={handleMove}
                onHoverCell={(m, c) => setHoveredCell(m === null ? null : m * 9 + c)}
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Feedback & Controls */}
        <div className="pz-sidebar-column">
          {!result ? (
            <div className="pz-panel pz-panel-pending">
              <h2>Your Turn</h2>
              <p className="pz-text-muted mb-4">Find the move that forces the opponent into a closed or disadvantageous sector.</p>
              <div className="pz-difficulty">
                <span>{puzzle?.difficulty || 'Training'}</span>
                <span>{puzzle?.theme || 'Tactical position'}</span>
              </div>
              
              <div className="pz-turn-indicator">
                <span className={`turn-token ${isX ? 'turn-x' : 'turn-o'}`}>{isX ? 'X' : 'O'}</span>
                <span>to move</span>
              </div>

              <div className="pz-hint-box">
                <Info size={16} />
                <span>Hover over squares to see where they send the opponent.</span>
              </div>
              {status === 'submitting' && <p className="pz-submitting">Checking move…</p>}
            </div>
          ) : (
            <div className={`pz-panel pz-panel-result ${result.correct ? 'success' : 'error'}`}>
              <div className="result-header">
                {result.correct ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                <h2>{result.correct ? 'Correct!' : 'Inaccurate'}</h2>
              </div>
              
              <p className="pz-text-muted mb-4">
                {result.correct 
                  ? "Great job! You found the optimal positional advantage." 
                  : "The best move is marked on the board. Notice where it sends the opponent."}
              </p>

              <div className="pz-stat-row">
                <span>Rating Change</span>
                <span className={`stat-delta ${result.delta > 0 ? 'positive' : 'negative'}`}>
                  {result.delta > 0 ? `+${result.delta}` : result.delta}
                </span>
              </div>

              <button className="pz-btn-primary" onClick={loadPuzzle}>
                Next Puzzle <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
