import { getState, setState, clearPendingUnlock } from './progression.js';
import { WORLDS, BIKES } from './world-config.js';

// ── Screen helpers ──────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

export function showScreen(id) {
  document.querySelectorAll('.overlay').forEach(el => {
    el.classList.toggle('hidden', el.id !== id);
  });
}

export function hideAllScreens() {
  document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
}

export function showHUD() { $('hud').classList.remove('hidden'); }
export function hideHUD() { $('hud').classList.add('hidden'); }

// ── HUD ─────────────────────────────────────────────────────────────────────

export function updateHUD(distMetres, collectibles) {
  $('hud-dist').textContent = formatDist(distMetres);
  $('hud-collectibles').textContent = `⭐ ${collectibles}`;
}

// ── Game Over ────────────────────────────────────────────────────────────────

export function showGameOver(runDistMetres, bestDistMetres) {
  $('go-run-dist').textContent = formatDist(runDistMetres);
  $('go-best-dist').textContent = bestDistMetres > 0 ? formatDist(bestDistMetres) : '—';
  showScreen('screen-gameover');
}

// ── World grid ───────────────────────────────────────────────────────────────

export function renderWorldGrid(onSelect) {
  const s = getState();
  const grid = $('world-grid');
  grid.innerHTML = '';

  Object.values(WORLDS).forEach(world => {
    const unlocked = s.unlockedWorlds.includes(world.id);
    const selected = s.selectedWorld === world.id;
    const card = document.createElement('div');
    card.className = 'selector-card' +
      (selected ? ' selected' : '') +
      (unlocked ? '' : ' locked');

    // Progress toward unlock
    let progressHtml = '';
    if (!unlocked && world.id === 'illawarra') {
      const pct = Math.min(100, Math.round((s.totalDistance / 2000) * 100));
      progressHtml = `
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>`;
    }

    card.innerHTML = `
      <div class="card-icon">${world.icon}</div>
      <div class="card-name">${world.name}</div>
      <div class="card-desc">${world.desc}</div>
      ${!unlocked ? `<span class="lock-label">🔒 ${world.lockDesc}</span>${progressHtml}` : ''}
    `;

    card.addEventListener('click', () => {
      if (!unlocked) { shake(card); return; }
      setState({ selectedWorld: world.id });
      document.querySelectorAll('#world-grid .selector-card').forEach(c =>
        c.classList.remove('selected')
      );
      card.classList.add('selected');
      onSelect(world.id);
    });

    grid.appendChild(card);
  });

  // Continue button
  const btn = document.createElement('button');
  btn.className = 'btn-primary btn-continue';
  btn.textContent = 'Choose Bike →';
  btn.addEventListener('click', () => onSelect(getState().selectedWorld, true));
  grid.after(btn);
}

// ── Bike grid ────────────────────────────────────────────────────────────────

export function renderBikeGrid(onSelect) {
  const s = getState();
  const grid = $('bike-grid');
  grid.innerHTML = '';

  Object.values(BIKES).forEach(bike => {
    const unlocked = s.unlockedBikes.includes(bike.id);
    const selected = s.selectedBike === bike.id;
    const card = document.createElement('div');
    card.className = 'selector-card' +
      (selected ? ' selected' : '') +
      (unlocked ? '' : ' locked');

    let progressHtml = '';
    if (!unlocked && bike.id === 'cruiser') {
      const pct = Math.min(100, Math.round((s.totalCollectibles / 20) * 100));
      progressHtml = `
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>`;
    }

    card.innerHTML = `
      <div class="card-icon">${bike.icon}</div>
      <div class="card-name">${bike.name}</div>
      <div class="card-desc">${bike.desc}</div>
      ${!unlocked ? `<span class="lock-label">🔒 ${bike.lockDesc}</span>${progressHtml}` : ''}
    `;

    card.addEventListener('click', () => {
      if (!unlocked) { shake(card); return; }
      setState({ selectedBike: bike.id });
      document.querySelectorAll('#bike-grid .selector-card').forEach(c =>
        c.classList.remove('selected')
      );
      card.classList.add('selected');
      onSelect(bike.id);
    });

    grid.appendChild(card);
  });

  // Start button
  const btn = document.createElement('button');
  btn.className = 'btn-primary btn-continue';
  btn.textContent = 'Ride! 🚵';
  btn.addEventListener('click', () => onSelect(getState().selectedBike, true));
  grid.after(btn);
}

// ── Unlock celebration queue ──────────────────────────────────────────────────

/**
 * Shows each unlock event one at a time.
 * First event shows for 2 s; subsequent events in same call show for 3 s.
 * onDone is called after all events have been displayed.
 */
export function showUnlockQueue(events, onDone) {
  if (!events.length) { onDone(); return; }

  const screen = $('screen-unlock');
  const title  = $('unlock-title');
  const body   = $('unlock-body');

  function showNext(index) {
    if (index >= events.length) {
      screen.classList.add('hidden');
      onDone();
      return;
    }

    const ev       = events[index];
    const duration = index === 0 ? 2000 : 3000;

    title.textContent = ev.title;
    body.textContent  = ev.body;
    screen.classList.remove('hidden');

    // Restart pop-in animation
    const card = screen.querySelector('.overlay-card');
    card.classList.remove('unlock-card');
    void card.offsetWidth; // force reflow
    card.classList.add('unlock-card');

    clearPendingUnlock(ev.id);

    setTimeout(() => showNext(index + 1), duration);
  }

  hideAllScreens();
  showNext(0);
}

// ── Shake ────────────────────────────────────────────────────────────────────

function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
}

// ── Formatting ───────────────────────────────────────────────────────────────

function formatDist(m) {
  if (m >= 1000) return (m / 1000).toFixed(2) + ' km';
  return Math.round(m) + ' m';
}
