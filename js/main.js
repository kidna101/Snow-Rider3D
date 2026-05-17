import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getState, setState, recordRunEnd, drainPendingUnlocks } from './progression.js';
import { WORLDS, BIKES } from './world-config.js';
import {
  showScreen, hideAllScreens, showHUD, hideHUD,
  renderWorldGrid, renderBikeGrid,
  showUnlockQueue, showGameOver, updateHUD,
} from './ui.js';

// ── Constants ────────────────────────────────────────────────────────────────
const BIKE_X_LIMIT    = 3.8;        // metres left/right
const STEER_SPEED     = 5.5;        // m/s lateral
const BASE_SPEED      = 8;          // m/s forward at start
const ACCEL           = 0.4;        // m/s² speed increase
const MAX_SPEED       = 28;
const SEG_LENGTH      = 20;         // terrain segment depth
const SEG_COUNT       = 6;          // number of pooled segments
const LANE_WIDTH      = 8;          // terrain half-width each side
const OBSTACLE_EVERY  = 12;         // metres between obstacle spawns
const COLLECT_EVERY   = 8;          // metres between collectible spawns
const COLLECT_SIZE    = 0.55;       // collision half-extent
const OBS_SIZE        = 0.55;       // collision half-extent

// ── Three.js setup ───────────────────────────────────────────────────────────
const canvas   = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
camera.position.set(0, 6, 13);
camera.lookAt(0, 0, -2);

// ── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ── Lights ───────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x8ab4cc, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff8e8, 1.1);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far  = 60;
sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -20;
sunLight.shadow.camera.right = sunLight.shadow.camera.top  =  20;
scene.add(sunLight);

// ── Terrain pool ─────────────────────────────────────────────────────────────
const terrainMat  = new THREE.MeshLambertMaterial({ color: 0xddeeff });
const terrainGeo  = new THREE.PlaneGeometry(LANE_WIDTH * 2, SEG_LENGTH, 4, 8);
terrainGeo.rotateX(-Math.PI / 2);

const segments = [];
for (let i = 0; i < SEG_COUNT; i++) {
  const mesh = new THREE.Mesh(terrainGeo, terrainMat.clone());
  mesh.receiveShadow = true;
  mesh.position.z = -i * SEG_LENGTH;
  scene.add(mesh);
  segments.push(mesh);
}

// Treeline (decorative backdrop)
function makeTreeline(color) {
  const geo = new THREE.PlaneGeometry(100, 14);
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.7 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 7, -85);
  return mesh;
}
let treelineMesh = makeTreeline(0x1a4d2e);
scene.add(treelineMesh);

// ── Bike model ───────────────────────────────────────────────────────────────
let bikeRoot = null;
let bikeLoaded = false;
const loader = new GLTFLoader();

function loadBike(bikeId, onReady) {
  const cfg = BIKES[bikeId];
  if (bikeRoot) { scene.remove(bikeRoot); bikeRoot = null; }
  bikeLoaded = false;

  loader.load(
    cfg.modelFile,
    (gltf) => {
      bikeRoot = gltf.scene;

      // Scale & position: sit the bike on the ground facing camera
      const box = new THREE.Box3().setFromObject(bikeRoot);
      const size = box.getSize(new THREE.Vector3());
      const targetH = 1.2;
      const scale = targetH / size.y;
      bikeRoot.scale.setScalar(scale);
      bikeRoot.position.set(0, 0, 2);

      // Re-measure after scale
      const box2 = new THREE.Box3().setFromObject(bikeRoot);
      const min2  = box2.min;
      bikeRoot.position.y -= min2.y; // sit on ground

      // Face away from camera (toward the hill)
      bikeRoot.rotation.y = Math.PI;

      // Optional tint
      if (cfg.tint) {
        const tintColor = new THREE.Color(cfg.tint);
        bikeRoot.traverse(child => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => {
              if (m.name && m.name.toLowerCase().includes('frame')) {
                m.color.lerp(tintColor, 0.6);
              }
            });
          }
        });
      }

      bikeRoot.traverse(c => { if (c.isMesh) { c.castShadow = true; } });
      scene.add(bikeRoot);
      bikeLoaded = true;
      if (onReady) onReady();
    },
    undefined,
    (err) => {
      console.error('Bike load error', err);
      // Fallback: simple box bike
      bikeRoot = buildFallbackBike();
      scene.add(bikeRoot);
      bikeLoaded = true;
      if (onReady) onReady();
    }
  );
}

function buildFallbackBike() {
  const root = new THREE.Group();
  // Frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.7, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x2255cc })
  );
  frame.position.set(0, 0.7, 0);
  // Wheels
  const wheelGeo = new THREE.TorusGeometry(0.35, 0.08, 8, 16);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  [-0.55, 0.55].forEach(zOff => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.y = Math.PI / 2;
    w.position.set(0, 0.35, zOff);
    root.add(w);
  });
  root.add(frame);
  root.position.set(0, 0, 2);
  root.castShadow = true;
  return root;
}

// ── Obstacle pool ────────────────────────────────────────────────────────────
const obstaclePool = [];
const activeObstacles = []; // { mesh, box }

function getObstacleMesh(cfg) {
  // Try pool
  const pooled = obstaclePool.pop();
  if (pooled) {
    applyObstacleConfig(pooled, cfg);
    return pooled;
  }
  const mesh = buildObstacleMesh(cfg);
  return mesh;
}

function buildObstacleMesh(cfg) {
  const root = new THREE.Group();
  if (cfg.type === 'tree' || cfg.type === 'gum') {
    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, cfg.h * 0.4, 7),
      new THREE.MeshLambertMaterial({ color: cfg.trunkColor || 0x5c3a1e })
    );
    trunk.position.y = cfg.h * 0.2;
    // Canopy
    const canopy = new THREE.Mesh(
      cfg.type === 'gum'
        ? new THREE.SphereGeometry(cfg.w * 1.2, 7, 7)
        : new THREE.ConeGeometry(cfg.w, cfg.h * 0.65, 7),
      new THREE.MeshLambertMaterial({ color: cfg.color })
    );
    canopy.position.y = cfg.h * (cfg.type === 'gum' ? 0.65 : 0.72);
    root.add(trunk, canopy);
  } else if (cfg.type === 'rock') {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(cfg.w * 0.6, 0),
      new THREE.MeshLambertMaterial({ color: cfg.color })
    );
    rock.position.y = cfg.h * 0.4;
    rock.rotation.y = Math.random() * Math.PI;
    root.add(rock);
  } else { // log
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.h * 0.5, cfg.h * 0.5, cfg.w, 8),
      new THREE.MeshLambertMaterial({ color: cfg.color })
    );
    log.rotation.z = Math.PI / 2;
    log.position.y = cfg.h * 0.5;
    root.add(log);
  }
  root.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return root;
}

function applyObstacleConfig(mesh, cfg) {
  // Reuse mesh — just move it; colour stays close enough
}

function returnObstacle(mesh) {
  scene.remove(mesh);
  obstaclePool.push(mesh);
}

// ── Collectible pool ─────────────────────────────────────────────────────────
const collectiblePool = [];
const activeCollectibles = []; // { mesh, box, collected }
let collectMat = new THREE.MeshLambertMaterial({ color: 0xfffde0, emissive: 0xe0c800, emissiveIntensity: 0.6 });
let collectGeo = new THREE.OctahedronGeometry(COLLECT_SIZE, 0);

function spawnCollectible(z, worldCfg) {
  const x = (Math.random() - 0.5) * (LANE_WIDTH * 1.5);
  let mesh = collectiblePool.pop();
  if (!mesh) {
    mesh = new THREE.Mesh(collectGeo.clone(), collectMat.clone());
    mesh.castShadow = true;
  }
  mesh.material.color.set(worldCfg.collectible.color);
  mesh.material.emissive.set(worldCfg.collectible.emissive);
  mesh.position.set(x, 0.55, z);
  mesh.visible = true;
  scene.add(mesh);

  const box = new THREE.Box3().setFromCenterAndSize(
    mesh.position.clone(),
    new THREE.Vector3(COLLECT_SIZE * 2, COLLECT_SIZE * 2, COLLECT_SIZE * 2)
  );
  activeCollectibles.push({ mesh, box, collected: false });
}

function returnCollectible(item) {
  scene.remove(item.mesh);
  item.mesh.visible = false;
  collectiblePool.push(item.mesh);
}

// ── Game state ───────────────────────────────────────────────────────────────
let gameRunning    = false;
let speed          = BASE_SPEED;
let scrollZ        = 0;       // how far the world has scrolled (m)
let runDist        = 0;       // this run distance (m)
let runCollected   = 0;
let nextObstacleZ  = OBSTACLE_EVERY;
let nextCollectZ   = COLLECT_EVERY;
let crashed        = false;

// Input
const keys = { left: false, right: false };

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keys.left  = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

// Pause delta on tab-hide
let lastTime = 0;
let paused   = false;
document.addEventListener('visibilitychange', () => { paused = document.hidden; });

// ── Apply world visuals ───────────────────────────────────────────────────────
function applyWorld(worldId) {
  const w = WORLDS[worldId];

  scene.background = new THREE.Color(w.skyColor);
  scene.fog = new THREE.Fog(w.fogColor, w.fogNear, w.fogFar);

  const groundColor = new THREE.Color(w.groundColor);
  segments.forEach(s => s.material.color.set(groundColor));

  ambientLight.color.set(w.ambientColor);
  ambientLight.intensity = w.ambientIntensity;

  sunLight.color.set(w.sunColor);
  sunLight.intensity = w.sunIntensity;
  sunLight.position.set(...w.sunPosition);

  if (treelineMesh) scene.remove(treelineMesh);
  treelineMesh = makeTreeline(w.treeline);
  scene.add(treelineMesh);
}

// ── Spawn helpers ────────────────────────────────────────────────────────────
let currentWorldCfg = WORLDS.mountain;

function spawnObstacle(z) {
  const obsConfigs = currentWorldCfg.obstacles;
  const cfg = obsConfigs[Math.floor(Math.random() * obsConfigs.length)];
  const x   = (Math.random() - 0.5) * (LANE_WIDTH * 1.6);
  const mesh = buildObstacleMesh(cfg);
  mesh.position.set(x, 0, z);
  scene.add(mesh);

  const size = new THREE.Vector3(cfg.w, cfg.h, cfg.d);
  const box  = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(x, cfg.h / 2, z),
    size
  );
  activeObstacles.push({ mesh, box });
}

// ── Collision ────────────────────────────────────────────────────────────────
const bikeBox = new THREE.Box3();

function checkCollisions() {
  if (!bikeRoot) return;
  bikeBox.setFromObject(bikeRoot);

  for (const obs of activeObstacles) {
    if (bikeBox.intersectsBox(obs.box)) { triggerCrash(); return; }
  }

  for (const col of activeCollectibles) {
    if (!col.collected && bikeBox.intersectsBox(col.box)) {
      col.collected = true;
      col.mesh.visible = false;
      runCollected++;
      updateHUD(runDist, runCollected);
    }
  }
}

// ── Crash ────────────────────────────────────────────────────────────────────
function triggerCrash() {
  if (crashed) return;
  crashed     = true;
  gameRunning = false;

  if (bikeRoot) {
    bikeRoot.rotation.z = Math.PI / 3;
    bikeRoot.position.y += 0.5;
  }

  setTimeout(() => {
    const events = recordRunEnd(runDist, runCollected);
    const s = getState();
    hideHUD();
    clearObstacles();
    clearCollectibles();

    if (events.length) {
      showUnlockQueue(events, () => showGameOver(runDist, s.bestDistance));
    } else {
      showGameOver(runDist, s.bestDistance);
    }
  }, 600);
}

function clearObstacles() {
  activeObstacles.forEach(o => scene.remove(o.mesh));
  activeObstacles.length = 0;
}

function clearCollectibles() {
  activeCollectibles.forEach(c => scene.remove(c.mesh));
  activeCollectibles.length = 0;
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function resetRun() {
  crashed        = false;
  speed          = BASE_SPEED;
  scrollZ        = 0;
  runDist        = 0;
  runCollected   = 0;
  nextObstacleZ  = OBSTACLE_EVERY;
  nextCollectZ   = COLLECT_EVERY;

  if (bikeRoot) {
    bikeRoot.position.set(0, 0, 2);
    bikeRoot.rotation.z = 0;
    bikeRoot.rotation.y = Math.PI;
    // Re-seat on ground
    const box = new THREE.Box3().setFromObject(bikeRoot);
    bikeRoot.position.y -= box.min.y;
  }

  // Reset terrain segments
  segments.forEach((seg, i) => { seg.position.z = -i * SEG_LENGTH; });

  clearObstacles();
  clearCollectibles();
  updateHUD(0, 0);
}

function startRun() {
  const s = getState();
  currentWorldCfg = WORLDS[s.selectedWorld];
  applyWorld(s.selectedWorld);

  loadBike(s.selectedBike, () => {
    resetRun();
    gameRunning = true;
    hideAllScreens();
    showHUD();
    lastTime = performance.now();
  });
}

let animId;
function gameLoop(now) {
  animId = requestAnimationFrame(gameLoop);

  if (paused || !gameRunning || !bikeLoaded) {
    renderer.render(scene, camera);
    lastTime = now;
    return;
  }

  let dt = Math.min((now - lastTime) / 1000, 0.1); // cap at 100 ms
  lastTime = now;

  // ── Steering ──
  if (bikeRoot) {
    if (keys.left)  bikeRoot.position.x = Math.max(-BIKE_X_LIMIT, bikeRoot.position.x - STEER_SPEED * dt);
    if (keys.right) bikeRoot.position.x = Math.min( BIKE_X_LIMIT, bikeRoot.position.x + STEER_SPEED * dt);
    // Lean
    const targetLean = (keys.right ? -0.25 : keys.left ? 0.25 : 0);
    bikeRoot.rotation.z += (targetLean - bikeRoot.rotation.z) * 8 * dt;
  }

  // ── Scroll world ──
  const travel = speed * dt;
  scrollZ    += travel;
  runDist    += travel;
  speed       = Math.min(MAX_SPEED, speed + ACCEL * dt);

  // Terrain loop
  segments.forEach(seg => {
    seg.position.z += travel;
    if (seg.position.z > camera.position.z + SEG_LENGTH) {
      seg.position.z -= SEG_COUNT * SEG_LENGTH;
    }
  });

  // Obstacles scroll
  activeObstacles.forEach(o => {
    o.mesh.position.z += travel;
    o.box.translate(new THREE.Vector3(0, 0, travel));
  });
  // Prune obstacles past camera
  for (let i = activeObstacles.length - 1; i >= 0; i--) {
    if (activeObstacles[i].mesh.position.z > camera.position.z + 5) {
      scene.remove(activeObstacles[i].mesh);
      activeObstacles.splice(i, 1);
    }
  }

  // Collectibles scroll
  activeCollectibles.forEach(c => {
    c.mesh.position.z += travel;
    c.box.translate(new THREE.Vector3(0, 0, travel));
    // Rotate for visual flair
    c.mesh.rotation.y += dt * 2;
  });
  for (let i = activeCollectibles.length - 1; i >= 0; i--) {
    const c = activeCollectibles[i];
    if (c.mesh.position.z > camera.position.z + 5 || c.collected) {
      scene.remove(c.mesh);
      activeCollectibles.splice(i, 1);
    }
  }

  // Spawn new obstacles/collectibles
  while (scrollZ >= nextObstacleZ) {
    spawnObstacle(-(SEG_COUNT * SEG_LENGTH - 5));
    nextObstacleZ += OBSTACLE_EVERY - Math.min(6, Math.floor(runDist / 200));
  }
  while (scrollZ >= nextCollectZ) {
    spawnCollectible(-(SEG_COUNT * SEG_LENGTH - 8), currentWorldCfg);
    nextCollectZ += COLLECT_EVERY;
  }

  checkCollisions();
  updateHUD(runDist, runCollected);

  renderer.render(scene, camera);
}

// ── UI wiring ─────────────────────────────────────────────────────────────────

// Start screen — any key or tap
function startScreenListener(e) {
  if (e.type === 'keydown' || e.type === 'pointerdown') {
    window.removeEventListener('keydown', startScreenListener);
    window.removeEventListener('pointerdown', startScreenListener);
    goToWorldSelect();
  }
}

function goToWorldSelect() {
  renderWorldGrid((worldId, confirmed) => {
    if (confirmed) goToBikeSelect();
  });
  showScreen('screen-world');
}

function goToBikeSelect() {
  renderBikeGrid((bikeId, confirmed) => {
    if (confirmed) startRun();
  });
  showScreen('screen-bike');
}

// Back button
document.getElementById('btn-back-world').addEventListener('click', goToWorldSelect);

// Game over buttons
document.getElementById('btn-play-again').addEventListener('click', startRun);
document.getElementById('btn-change-world').addEventListener('click', goToWorldSelect);

// ── Boot ──────────────────────────────────────────────────────────────────────

// Show pending unlocks from previous crash, then start screen
const pending = drainPendingUnlocks();
if (pending.length) {
  showUnlockQueue(pending, () => showStartScreen());
} else {
  showStartScreen();
}

function showStartScreen() {
  showScreen('screen-start');
  window.addEventListener('keydown', startScreenListener);
  window.addEventListener('pointerdown', startScreenListener);
}

// Prime the scene
applyWorld('mountain');
animId = requestAnimationFrame(gameLoop);
