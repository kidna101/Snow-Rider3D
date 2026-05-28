import { getState, setState, clearPendingUnlock } from './progression.js';
import { WORLDS, BIKES } from './world-config.js';
import { isMuted, setMuted } from './audio.js';

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

// ── Mute button ──────────────────────────────────────────────────────────────

export function initMuteButton(onToggle) {
  const btn = $('btn-mute');
  if (!btn) return;
  const s = getState();
  setMuted(s.muted);
  btn.textContent = s.muted ? '🔇' : '🔊';
  btn.addEventListener('click', () => {
    const nowMuted = !isMuted();
    setMuted(nowMuted);
    setState({ muted: nowMuted });
    btn.textContent = nowMuted ? '🔇' : '🔊';
    if (onToggle) onToggle(nowMuted);
  });
}

// ── Game Over ────────────────────────────────────────────────────────────────

export function showGameOver(runDistMetres, bestDistMetres, runCoins = 0) {
  $('go-run-dist').textContent = formatDist(runDistMetres);
  $('go-best-dist').textContent = bestDistMetres > 0 ? formatDist(bestDistMetres) : '—';
  $('go-run-coins').textContent = `${runCoins} 🪙`;
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

  const existingWorldBtn = grid.nextElementSibling;
  if (existingWorldBtn && existingWorldBtn.classList.contains('btn-continue')) {
    existingWorldBtn.remove();
  }
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

  const existingBikeBtn = grid.nextElementSibling;
  if (existingBikeBtn && existingBikeBtn.classList.contains('btn-continue')) {
    existingBikeBtn.remove();
  }
  const btn = document.createElement('button');
  btn.className = 'btn-primary btn-continue';
  btn.textContent = 'Ride! 🚵';
  btn.addEventListener('click', () => onSelect(getState().selectedBike, true));
  grid.after(btn);
}

// ── Market screen ─────────────────────────────────────────────────────────────

let _marketPrevScreen = null;

/**
 * Open the market overlay, recording which screen to return to on close.
 * @param {string} fromScreen  — screen id to return to on close
 */
export function openMarket(fromScreen) {
  _marketPrevScreen = fromScreen;
  renderMarket();
  showScreen('screen-market');
}

function renderMarket() {
  const s = getState();
  $('market-balance').textContent = `${s.totalCoins ?? 0} 🪙`;

  const tabsEl = $('market-tabs');
  const gridEl = $('market-grid');
  tabsEl.innerHTML = '';
  gridEl.innerHTML = '';

  // Only show unlocked bikes
  const unlockedBikeIds = s.unlockedBikes;
  const bikes = Object.values(BIKES).filter(b => unlockedBikeIds.includes(b.id));

  // Default to first bike if no tab selected
  let activeBikeId = bikes[0]?.id;

  function renderColorGrid(bikeId) {
    activeBikeId = bikeId;
    gridEl.innerHTML = '';
    const bike = BIKES[bikeId];
    const s2 = getState();
    const purchased = s2.purchasedColors[bikeId] || [];
    const active    = s2.activeColorSlot[bikeId] || null;

    // "Default" option
    const defaultCard = document.createElement('div');
    defaultCard.className = 'color-swatch-card default-swatch' + (active === null ? ' equipped' : '');
    defaultCard.innerHTML = `
      <div class="swatch-dot" style="background:#888;"></div>
      <div class="swatch-name">Default</div>
      <div class="swatch-cost">Free</div>
      <button class="swatch-btn ${active === null ? 'equipped-label' : 'equip'}">
        ${active === null ? 'Equipped ✓' : 'Equip'}
      </button>`;
    if (active !== null) {
      defaultCard.querySelector('button').addEventListener('click', () => {
        const cur = getState();
        const newSlot = { ...cur.activeColorSlot, [bikeId]: null };
        setState({ activeColorSlot: newSlot });
        renderMarket();
      });
    }
    gridEl.appendChild(defaultCard);

    (bike.shopColors || []).forEach(color => {
      const isPurchased = purchased.includes(color.key);
      const isEquipped  = active === color.key;
      const canAfford   = (s2.totalCoins ?? 0) >= color.cost;

      const card = document.createElement('div');
      card.className = 'color-swatch-card' + (isEquipped ? ' equipped' : '');
      let btnHtml;
      if (isEquipped) {
        btnHtml = `<button class="swatch-btn equipped-label" disabled>Equipped ✓</button>`;
      } else if (isPurchased) {
        btnHtml = `<button class="swatch-btn equip">Equip</button>`;
      } else {
        btnHtml = `<button class="swatch-btn buy" ${canAfford ? '' : 'disabled'}>${color.cost} 🪙 Buy</button>`;
      }

      card.innerHTML = `
        <div class="swatch-dot" style="background:${color.hex};"></div>
        <div class="swatch-name">${color.label}</div>
        <div class="swatch-cost">${isPurchased ? 'Owned' : `${color.cost} 🪙`}</div>
        ${btnHtml}`;

      const btn = card.querySelector('button');
      if (btn && !btn.disabled) {
        btn.addEventListener('click', () => {
          const cur = getState();
          if (!isPurchased) {
            // Buy
            if ((cur.totalCoins ?? 0) < color.cost) return;
            const newPurchased = { ...cur.purchasedColors, [bikeId]: [...(cur.purchasedColors[bikeId] || []), color.key] };
            const newSlot = { ...cur.activeColorSlot, [bikeId]: color.key };
            setState({ totalCoins: cur.totalCoins - color.cost, purchasedColors: newPurchased, activeColorSlot: newSlot });
          } else {
            // Equip
            const newSlot = { ...cur.activeColorSlot, [bikeId]: color.key };
            setState({ activeColorSlot: newSlot });
          }
          renderMarket();
        });
      }

      gridEl.appendChild(card);
    });

    // Update tab active states
    tabsEl.querySelectorAll('.market-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.bikeId === bikeId);
    });

    // Update balance
    $('market-balance').textContent = `${getState().totalCoins ?? 0} 🪙`;
  }

  // Render tabs
  bikes.forEach((bike, i) => {
    const tab = document.createElement('button');
    tab.className = 'market-tab' + (i === 0 ? ' active' : '');
    tab.dataset.bikeId = bike.id;
    tab.textContent = `${bike.icon} ${bike.name}`;
    tab.addEventListener('click', () => renderColorGrid(bike.id));
    tabsEl.appendChild(tab);
  });

  if (bikes.length > 0) renderColorGrid(activeBikeId);
}

/**
 * Close the market and return to the previous screen.
 * Returns the previous screen id so main.js can do any extra work.
 */
export function closeMarket() {
  return _marketPrevScreen;
}

// ── Unlock celebration queue ──────────────────────────────────────────────────

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

    const card = screen.querySelector('.overlay-card');
    card.classList.remove('unlock-card');
    void card.offsetWidth;
    card.classList.add('unlock-card');

    clearPendingUnlock(ev.id);

    setTimeout(() => showNext(index + 1), duration);
  }

  hideAllScreens();
  showNext(0);
}

// ── Gold bag flash ───────────────────────────────────────────────────────────

export function showGoldBagFlash(value) {
  const hud = document.getElementById('hud');
  const span = document.createElement('span');
  span.className = 'gold-flash';
  span.textContent = `+${value} 💰`;
  hud.appendChild(span);
  setTimeout(() => span.remove(), 1600);
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
