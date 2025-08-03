// server/models/Game.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const GameSchema = new Schema({
  players: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['COMPLETED', 'DRAW'], required: true },
  endDate: { type: Date, default: Date.now },
  timeControl: { type: String, required: true }
});
module.exports = mongoose.model('Game', GameSchema);