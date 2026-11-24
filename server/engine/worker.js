const { parentPort } = require('node:worker_threads');
const { searchPosition } = require('./search');
parentPort.on('message', ({ state, options }) => {
  try { parentPort.postMessage({ result: searchPosition(state, options) }); }
  catch (error) { parentPort.postMessage({ error: error.message }); }
});
