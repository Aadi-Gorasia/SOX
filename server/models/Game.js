// server/models/Game.js
const mongoose = require('mongoose');

// ── SOX Engine fields ─────────────────────────────────────────────────────────
// moves: array of { idx: 0-80, side: 0=X 1=O } recorded during gameplay
// annotations: filled by engine after game review
const MoveSchema = new mongoose.Schema({
  idx:  { type: Number, required: true }, // 0-80 macro-major index
  side: { type: Number, required: true }, // 0=X, 1=O
}, { _id: false });

const AnnotationSchema = new mongoose.Schema({
  moveNumber:  { type: Number },
  side:        { type: Number, min: 0, max: 1 },
  idx:         { type: Number },  // move played
  bestMove:    { type: Number },  // engine's preferred move
  playedMove:  { type: Number },
  optimalMove: { type: Number },
  positionStateBefore: { type: [Number], default: undefined },
  wasOptimal:  { type: Boolean },
  quality:     { type: String },
  qualityLabel:{ type: String },
  explanation: { type: String },
  recommendation: { type: String },
  theme:       { type: String },
  positionalScore: { type: Number },
  score:       { type: Number },  // centipawns after move, X-relative
  scoreBefore: { type: Number },  // centipawns before move
  delta:       { type: Number },  // score change (negative = worse for mover)
  regret:      { type: Number },
  brilliant:   { type: Boolean },
  great:       { type: Boolean },
  blunder:     { type: Boolean }, // |delta| > 200
  mistake:     { type: Boolean }, // |delta| > 100
  inaccuracy:  { type: Boolean }, // |delta| > 50
  isEnginePick:{ type: Boolean }, // move matched engine's best
  moveWinsGame: { type: Boolean },
  moveCapturesSector: { type: Boolean },
  createsMacroFork: { type: Boolean },
  mateIn:      { type: Number },  // null or N if forced mate detected
}, { _id: false });

const GameSchema = new mongoose.Schema({
  // ── Existing fields (keep exactly as-is) ────────────────────────────────────
  players:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  winner:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status:      { type: String, enum: ['ONGOING', 'COMPLETED', 'DRAW', 'ABANDONED'], default: 'ONGOING' },
  timeControl: { type: String },
  endDate:     { type: Date },

  // ── SOX Engine fields (new) ──────────────────────────────────────────────────
  moves:       { type: [MoveSchema],      default: [] },
  annotations: { type: [AnnotationSchema], default: [] },
  reviewedAt:  { type: Date, default: null },
  reviewSummary: {
    blunders:    { type: [Number], default: [] }, // move numbers that were blunders
    mistakes:    { type: [Number], default: [] },
    inaccuracies:{ type: [Number], default: [] },
    accuracy:    { type: Number, default: null },  // 0-100 overall accuracy
    tacticalMissesCount: { type: Number, default: 0 },
    compiledAtTimestamp: { type: String, default: null },
    qualityCounts: { type: mongoose.Schema.Types.Mixed, default: {} },
    movesReviewed: { type: Number, default: 0 },
    sideSummaries: { type: mongoose.Schema.Types.Mixed, default: {} },
    brilliantMoves: { type: [Number], default: [] },
    greatMoves: { type: [Number], default: [] },
  },

}, { timestamps: true });

module.exports = mongoose.model('Game', GameSchema);