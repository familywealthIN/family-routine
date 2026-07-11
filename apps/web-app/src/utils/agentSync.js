/**
 * Agent dispatch background-sync bridge (page side).
 *
 * Problem: an agent's start/end event is an HTTP call fired from the page. If
 * the tab/app is closed while that call is in flight, its outcome is lost and
 * the "running" badge would stick (see agentStore's hydrate un-stick for the
 * universal fallback).
 *
 * This module is the progressive enhancement: before the page fires the call it
 * enqueues a job in IndexedDB and registers a Background Sync. On the happy path
 * the page completes the call and `settleAgentJob` removes the job, so the
 * Service Worker never touches it. Only if the page dies mid-flight does the job
 * survive — the SW then re-fires it, records the result on the server and
 * messages any reopened client with the true outcome.
 *
 * Support: Background Sync is Chromium/Android only (no iOS Safari / iOS
 * Capacitor / Firefox). Callers must treat it as best-effort and always keep the
 * page-side flow working on its own.
 */

const DB_NAME = 'routine-agent-sync';
const STORE = 'jobs';
const SYNC_TAG = 'agent-dispatch';

export function bgSyncSupported() {
  return typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && typeof window !== 'undefined'
    && 'SyncManager' in window;
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then((r) => { result = r; }).catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.addEventListener('success', () => resolve(req.result));
    req.addEventListener('error', () => reject(req.error));
  });
}

/**
 * Persist a pending job and register a background sync. Returns the job id (or
 * null when unsupported / on any failure — the caller keeps working regardless).
 */
export async function enqueueAgentJob(job) {
  // Need an active worker controlling this page, otherwise serviceWorker.ready
  // never resolves (e.g. local dev where the SW isn't registered) and the job
  // would linger. No controller → cleanly skip; the page-side flow still runs.
  if (!bgSyncSupported() || !navigator.serviceWorker.controller) return null;
  try {
    const db = await openDb();
    await tx(db, 'readwrite', (store) => store.put({ ...job, status: 'pending' }));
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.sync && typeof reg.sync.register === 'function') {
      await reg.sync.register(SYNC_TAG);
    }
    return job.id;
  } catch (e) {
    return null;
  }
}

/** The page handled the dispatch itself — drop the job so the SW won't re-fire it. */
export async function settleAgentJob(id) {
  if (!id) return;
  try {
    const db = await openDb();
    await tx(db, 'readwrite', (store) => store.delete(id));
  } catch (e) {
    // best-effort
  }
}

/**
 * Read (and remove) jobs the SW completed while the page was closed, so the
 * caller can reconcile badges on load. Returns [] when unsupported/empty.
 */
export async function drainDoneJobs() {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const db = await openDb();
    const done = await tx(db, 'readonly', async (store) => {
      const all = await reqToPromise(store.getAll());
      return (all || []).filter((j) => j && j.status === 'done');
    });
    if (done.length) {
      await tx(db, 'readwrite', (store) => { done.forEach((j) => store.delete(j.id)); });
    }
    return done;
  } catch (e) {
    return [];
  }
}

/**
 * Subscribe to live "the SW finished a dispatch" messages. Returns an
 * unsubscribe function.
 */
export function onSyncResult(cb) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};
  const handler = (event) => {
    const data = event && event.data;
    if (data && data.type === 'agent-sync-result') cb(data);
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}

export { SYNC_TAG, DB_NAME, STORE };
