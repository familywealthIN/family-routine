/* eslint-disable no-underscore-dangle */
/* eslint-disable no-undef */
/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable max-len */
workbox.core.setCacheNameDetails({ prefix: 'routine-notes' });

// self.addEventListener('message', function (event) {
//   if (event.data && event.data.type === 'SKIP_WAITING') {
//     self.skipWaiting();
//   }
// });

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});

/**
 * Agent dispatch background sync.
 *
 * The page enqueues a job (src/utils/agentSync.js) before firing an agent's
 * start/end HTTP call and removes it once the call settles. If the page dies
 * mid-flight the job survives here — we re-fire it, record the outcome on the
 * server and tell any reopened client the true result so the "running" badge
 * lands correctly instead of sticking. Chromium/Android only.
 */
const AGENT_DB = 'routine-agent-sync';
const AGENT_STORE = 'jobs';
const AGENT_STALE_MS = 25000;
const RESULT_MAX = 65536;
const ERROR_MAX = 2048;

function agentOpenDb() {
  return new Promise(function (resolve, reject) {
    const req = indexedDB.open(AGENT_DB, 1);
    req.onupgradeneeded = function () {
      const db = req.result;
      if (!db.objectStoreNames.contains(AGENT_STORE)) {
        db.createObjectStore(AGENT_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function agentReq(r) {
  return new Promise(function (resolve, reject) {
    r.addEventListener('success', function () { resolve(r.result); });
    r.addEventListener('error', function () { reject(r.error); });
  });
}

function resolvePhaseStatus(phase, ok, hasEnd) {
  if (!ok) return 'failed';
  if (phase === 'end') return 'finished';
  return hasEnd ? 'listening' : 'finished';
}

function agentGetPending(db) {
  return agentReq(db.transaction(AGENT_STORE, 'readonly').objectStore(AGENT_STORE).getAll())
    .then(function (all) { return (all || []).filter(function (j) { return j && j.status === 'pending'; }); });
}

function agentPut(db, job) {
  const t = db.transaction(AGENT_STORE, 'readwrite');
  t.objectStore(AGENT_STORE).put(job);
  return new Promise(function (resolve, reject) {
    t.oncomplete = resolve; t.onerror = function () { reject(t.error); };
  });
}

function agentRecord(job, outcome) {
  if (!job.graphqlUrl || !job.agentId) return Promise.resolve();
  const query = 'mutation($id:ID!,$status:String!,$lastResultType:String,$lastResultBody:String,$lastError:String,$incrementSuccess:Int,$incrementFailure:Int){recordAgentExecution(id:$id,status:$status,lastResultType:$lastResultType,lastResultBody:$lastResultBody,lastError:$lastError,incrementSuccess:$incrementSuccess,incrementFailure:$incrementFailure){id}}';
  const headers = { 'Content-Type': 'application/json' };
  if (job.token) headers.authorization = `Bearer ${job.token}`;
  return fetch(job.graphqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables: {
        id: job.agentId,
        status: outcome.resolvedStatus,
        lastResultType: outcome.resultType || null,
        lastResultBody: outcome.resultBody || null,
        lastError: outcome.ok ? null : (outcome.error || '').slice(0, ERROR_MAX),
        incrementSuccess: outcome.ok ? 1 : 0,
        incrementFailure: outcome.ok ? 0 : 1,
      },
    }),
  });
}

function agentMarkGoalReady(job) {
  if (!job.graphqlUrl || !job.goalId || !job.goalDate || !job.goalPeriod) return Promise.resolve();
  const query = 'mutation($id:ID!,$date:String!,$period:String!){markGoalItemReady(id:$id,date:$date,period:$period){id status}}';
  const headers = { 'Content-Type': 'application/json' };
  if (job.token) headers.authorization = `Bearer ${job.token}`;
  return fetch(job.graphqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables: { id: job.goalId, date: job.goalDate, period: job.goalPeriod } }),
  });
}

function agentRunJob(db, job, clients) {
  let ok = false; let resultType = null; let resultBody = null; let error = null;
  return fetch(job.url, { method: 'GET' })
    .then(function (res) {
      ok = res.ok;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      resultType = ct.indexOf('html') !== -1 ? 'html' : 'json';
      if (!ok) error = res.statusText || (`HTTP ${res.status}`);
      return res.text();
    })
    .then(function (body) { resultBody = (body || '').slice(0, RESULT_MAX); })
    .catch(function (e) { ok = false; error = (e && e.message) || 'fetch failed'; })
    .then(function () {
      const resolvedStatus = resolvePhaseStatus(job.phase, ok, job.hasEnd);
      const outcome = {
        ok, resolvedStatus, resultType, resultBody, error,
      };
      const post = agentRecord(job, outcome).catch(function () {});
      const ready = (ok && job.phase === 'start') ? agentMarkGoalReady(job).catch(function () {}) : Promise.resolve();
      return Promise.all([post, ready]).then(function () {
        return agentPut(db, { ...job, status: 'done', outcome }).then(function () {
          clients.forEach(function (c) {
            c.postMessage({ type: 'agent-sync-result', taskRef: job.taskRef, resolvedStatus });
          });
        });
      });
    });
}

function agentProcessJobs() {
  let db;
  return agentOpenDb()
    .then(function (d) { db = d; return agentGetPending(db); })
    .then(function (jobs) {
      if (!jobs.length) return null;
      return self.clients.matchAll({ includeUncontrolled: true }).then(function (clients) {
        const pageOpen = clients.length > 0;
        const now = Date.now();
        // Only re-fire jobs the page can't be handling: either no client is
        // open, or the job is old enough that a live page would already have
        // settled it. This keeps the happy path single-execution.
        const due = jobs.filter(function (j) {
          return !pageOpen || (now - (j.createdAt || 0)) > AGENT_STALE_MS;
        });
        const skipped = jobs.length - due.length;
        return due.reduce(function (chain, job) {
          return chain.then(function () { return agentRunJob(db, job, clients).catch(function () {}); });
        }, Promise.resolve()).then(function () {
          // Some jobs were left for a still-open page to finish. Reject so the
          // browser retries this sync later — if that page dies before settling
          // them, a retry (no clients) will pick them up. If the page settled
          // them, the retry finds nothing pending and resolves.
          if (skipped > 0) throw new Error('agent-dispatch: pending jobs remain');
        });
      });
    });
}

self.addEventListener('sync', function (event) {
  if (event.tag === 'agent-dispatch') {
    event.waitUntil(agentProcessJobs());
  }
});
