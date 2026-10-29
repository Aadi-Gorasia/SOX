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
  idx:         { type: Number },  // move played
  bestMove:    { type: Number },  // engine's preferred move
  score:       { type: Number },  // centipawns after move, X-relative
  scoreBefore: { type: Number },  // centipawns before move
  delta:       { type: Number },  // score change (negative = worse for mover)
  blunder:     { type: Boolean }, // |delta| > 200
  mistake:     { type: Boolean }, // |delta| > 100
  inaccuracy:  { type: Boolean }, // |delta| > 50
  isEnginePick:{ type: Boolean }, // move matched engine's best
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
  },

}, { timestamps: true });

module.exports = mongoose.model('Game', GameSchema);