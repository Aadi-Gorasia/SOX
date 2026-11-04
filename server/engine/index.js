const { evaluateState } = require('./evaluation');
const { searchPosition } = require('./search');
const state = require('./state');

module.exports = { ...state, evaluateState, searchPosition };
