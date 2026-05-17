import { PROGRESSION } from './world-config.js';

const KEY = 'brGame_v1';
const CURRENT_VERSION = 1;

const DEFAULT_STATE = {
  version: CURRENT_VERSION,
  totalDistance: 0,       // cumulative metres across all runs
  totalCollectibles: 0,   // cumulative count across all runs
  bestDistance: 0,        // single-run best, metres
  unlockedWorlds: ['mountain'],
  unlockedBikes:  ['mountain'],
  selectedWorld: 'mountain',
  selectedBike:  'mountain',
  pendingUnlockIds: [],   // celebrations that haven't been shown yet
};

function migrateState(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STATE };
  // Future migrations go here as version increments.
  // For now, just backfill any missing keys.
  return { ...DEFAULT_STATE, ...raw, version: CURRENT_VERSION };
}

export function getState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return migrateState(raw);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function setState(partial) {
  try {
    const current = getState();
    const next = { ...current, ...partial };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    // Quota or private-browsing — silently continue.
    return { ...getState(), ...partial };
  }
}

/**
 * Called at run-end with the run's totals.
 * Returns an array of unlock-event objects that were newly triggered this call.
 * Each event is also pushed into pendingUnlockIds (survives crash/reload).
 *
 * Unlock event shape: { id, type, title, body }
 *   type: 'bike' | 'world'
 */
export function recordRunEnd(runDistanceMetres, runCollectibles) {
  const s = getState();

  const newTotalDist  = s.totalDistance + runDistanceMetres;
  const newTotalItems = s.totalCollectibles + runCollectibles;
  const newBest       = Math.max(s.bestDistance, runDistanceMetres);

  const newWorlds  = [...s.unlockedWorlds];
  const newBikes   = [...s.unlockedBikes];
  const newEvents  = [];
  const pending    = [...s.pendingUnlockIds];

  // Check Illawarra unlock
  if (
    !newWorlds.includes('illawarra') &&
    newTotalDist >= PROGRESSION.DISTANCE_THRESHOLD
  ) {
    newWorlds.push('illawarra');
    const ev = {
      id:    'unlock_illawarra',
      type:  'world',
      title: 'Illawarra Unlocked!',
      body:  'You\'ve ridden 2 km total — the Illawarra Coastal Forest is now open.',
    };
    newEvents.push(ev);
    if (!pending.includes(ev.id)) pending.push(ev.id);
  }

  // Check cruiser unlock
  if (
    !newBikes.includes('cruiser') &&
    newTotalItems >= PROGRESSION.COLLECTIBLE_THRESHOLD
  ) {
    newBikes.push('cruiser');
    const ev = {
      id:    'unlock_cruiser',
      type:  'bike',
      title: 'Cruiser Unlocked!',
      body:  'You\'ve collected 20 items — the Cruiser Bike is yours.',
    };
    newEvents.push(ev);
    if (!pending.includes(ev.id)) pending.push(ev.id);
  }

  setState({
    totalDistance:    newTotalDist,
    totalCollectibles: newTotalItems,
    bestDistance:     newBest,
    unlockedWorlds:   newWorlds,
    unlockedBikes:    newBikes,
    pendingUnlockIds: pending,
  });

  return newEvents;
}

/** Mark a pending unlock as shown. */
export function clearPendingUnlock(id) {
  const s = getState();
  setState({ pendingUnlockIds: s.pendingUnlockIds.filter(x => x !== id) });
}

/** Returns and clears all pending unlock events (for restoring after crash). */
export function drainPendingUnlocks() {
  const s = getState();
  if (!s.pendingUnlockIds.length) return [];

  // Reconstruct event objects from their IDs
  const KNOWN_EVENTS = {
    unlock_illawarra: {
      id: 'unlock_illawarra', type: 'world',
      title: 'Illawarra Unlocked!',
      body: 'You\'ve ridden 2 km total — the Illawarra Coastal Forest is now open.',
    },
    unlock_cruiser: {
      id: 'unlock_cruiser', type: 'bike',
      title: 'Cruiser Unlocked!',
      body: 'You\'ve collected 20 items — the Cruiser Bike is yours.',
    },
  };

  const events = s.pendingUnlockIds.map(id => KNOWN_EVENTS[id]).filter(Boolean);
  setState({ pendingUnlockIds: [] });
  return events;
}
