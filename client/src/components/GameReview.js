import React, { useState, useEffect } from 'react';

// Stub for AI Analysis
const mockAIAnalysis = [
  "Opening principle: Control the center.",
  "Excellent placement forcing opponent to top-right.",
  "Blunder! You gave up the middle board.",
  "Solid defense."
];

const GameReview = ({ moves, onExit }) => {
  const [step, setStep] = useState(0);
  const [analysis, setAnalysis] = useState("");

  useEffect(() => {
    // In a real app, you would fetch analysis from an endpoint here
    // e.g., POST /api/analyze { boardState }
    setAnalysis(mockAIAnalysis[step % mockAIAnalysis.length] || "Analyzing...");
  }, [step]);

  // Hook into your Board component here, passing 'step' as the 'moveIndex'
  // to your board reconstruction function.

  return (
    <div className="game-review-panel">
      <div className="review-header">
        <h2>Game Review 🧠</h2>
        <button onClick={onExit}>Exit Review</button>
      </div>
      
      <div className="ai-feedback">
        <div className="ai-avatar">🤖</div>
        <div className="ai-text">
          <strong>Move {step + 1}:</strong> {analysis}
        </div>
      </div>

      <div className="review-controls">
        <button onClick={() => setStep(Math.max(0, step-1))} disabled={step===0}>Prev</button>
        <span>{step} / {moves.length}</span>
        <button onClick={() => setStep(Math.min(moves.length, step+1))} disabled={step===moves.length}>Next</button>
      </div>
    </div>
  );
};

export default GameReview;