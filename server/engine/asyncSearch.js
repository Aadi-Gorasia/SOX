const { Worker } = require('node:worker_threads');
const path = require('node:path');

// Two bounded workers keep CPU analysis away from Socket.IO clocks and moves.
class SearchPool {
  constructor({ size = 2, queueLimit = 32 } = {}) {
    this.size = size; this.queueLimit = queueLimit;
    this.workers = new Set(); this.queue = []; this.closed = false;
  }
  search(state, options = {}) {
    if (this.closed) return Promise.reject(new Error('Engine is closed'));
    if (this.queue.length >= this.queueLimit) return Promise.reject(new Error('Engine is busy; please retry'));
    return new Promise((resolve, reject) => {
      this.queue.push({ state, options, resolve, reject }); this.dispatch();
    });
  }
  createWorker() {
    const worker = new Worker(path.join(__dirname, 'worker.js'));
    const slot = { worker, job: null, timer: null };
    this.workers.add(slot);
    const failed = error => {
      if (!this.workers.delete(slot)) return;
      clearTimeout(slot.timer);
      slot.job?.reject(error); slot.job = null;
      worker.terminate(); this.dispatch();
    };
    worker.on('error', failed);
    worker.on('exit', code => failed(new Error(`Engine worker exited (${code})`)));
    worker.on('message', ({ result, error }) => {
      if (!slot.job) return;
      const job = slot.job; slot.job = null; clearTimeout(slot.timer);
      worker.unref();
      if (error) job.reject(new Error(error)); else job.resolve(result);
      this.dispatch();
    });
    slot.fail = failed; worker.unref(); return slot;
  }
  dispatch() {
    while (!this.closed && this.queue.length) {
      let slot = [...this.workers].find(w => !w.job);
      if (!slot && this.workers.size < this.size) slot = this.createWorker();
      if (!slot) return;
      const job = this.queue.shift(); slot.job = job; slot.worker.ref();
      slot.timer = setTimeout(() => slot.fail(new Error('Engine search timed out')), 12000);
      try { slot.worker.postMessage({ state: job.state, options: job.options }); }
      catch (error) { slot.fail(error); }
    }
  }
  async close() {
    this.closed = true;
    for (const job of this.queue.splice(0)) job.reject(new Error('Engine is closed'));
    const closing = [...this.workers].map(slot => {
      clearTimeout(slot.timer); slot.job?.reject(new Error('Engine is closed'));
      slot.job = null; return slot.worker.terminate();
    });
    this.workers.clear(); await Promise.all(closing);
  }
}
const pool = new SearchPool();
module.exports = { SearchPool, searchAsync: (state, options) => pool.search(state, options) };
