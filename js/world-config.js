// Pure data — no THREE import. Colours are hex strings; Three.js converts them.

export const WORLDS = {
  mountain: {
    id: 'mountain',
    name: 'Mountain / Alpine',
    icon: '🏔️',
    desc: 'Snow-capped peaks, pine trees, blue sky',
    locked: false,
    lockDesc: null,
    // Sky / fog
    skyColor: '#87ceeb',
    fogColor: '#c8e0f0',
    fogNear: 30,
    fogFar: 90,
    // Terrain
    groundColor: '#ddeeff',
    groundRoughness: 0.9,
    // Ambient + directional light
    ambientColor: '#8ab4cc',
    ambientIntensity: 0.6,
    sunColor: '#fff8e8',
    sunIntensity: 1.1,
    sunPosition: [8, 14, -6],
    // Obstacles
    obstacles: [
      { type: 'tree',  color: '#2d6a3f', trunkColor: '#5c3a1e', w: 0.6, h: 2.2, d: 0.6 },
      { type: 'rock',  color: '#8a9ab0', w: 1.0, h: 0.7, d: 1.0 },
      { type: 'log',   color: '#6b4226', w: 1.8, h: 0.4, d: 0.5 },
    ],
    // Collectibles
    collectible: { color: '#fffde0', emissive: '#e0c800', label: '⭐', geom: 'star' },
    // Decorative strip colours (trees in the distance)
    treeline: '#1a4d2e',
  },
  illawarra: {
    id: 'illawarra',
    name: 'Illawarra Coastal Forest',
    icon: '🌿',
    desc: 'Sandstone escarpment, scribbly gums, Pacific ocean glimpses',
    locked: true,
    lockDesc: 'Ride 2 km total to unlock',
    // Sky / fog
    skyColor: '#c8dce8',
    fogColor: '#b0ccd8',
    fogNear: 28,
    fogFar: 85,
    // Terrain
    groundColor: '#8b7355',
    groundRoughness: 1.0,
    // Lights
    ambientColor: '#b0c8b8',
    ambientIntensity: 0.55,
    sunColor: '#ffe8c0',
    sunIntensity: 1.0,
    sunPosition: [10, 12, -4],
    // Obstacles
    obstacles: [
      { type: 'gum',   color: '#7a9e7e', trunkColor: '#c8c0a0', w: 0.5, h: 2.6, d: 0.5 },
      { type: 'rock',  color: '#b8a88a', w: 1.1, h: 0.65, d: 1.0 },
      { type: 'log',   color: '#8b6540', w: 2.0, h: 0.38, d: 0.5 },
    ],
    // Collectibles
    collectible: { color: '#ffcc66', emissive: '#dd7700', label: '🌸', geom: 'sphere' },
    treeline: '#3d6e52',
  },
};

export const BIKES = {
  mountain: {
    id: 'mountain',
    name: 'Mountain Bike',
    icon: '🚵',
    desc: 'Rugged and fast',
    locked: false,
    lockDesc: null,
    modelFile: 'bike.glb',
    tint: null,             // no colour override
  },
  cruiser: {
    id: 'cruiser',
    name: 'Cruiser Bike',
    icon: '🚲',
    desc: 'Relaxed, wide tyres',
    locked: true,
    lockDesc: 'Collect 20 items to unlock',
    modelFile: 'bike.glb',  // same mesh, different tint until a separate model is sourced
    tint: '#f4a261',        // warm orange tint on the frame material
  },
};

export const PROGRESSION = {
  COLLECTIBLE_THRESHOLD: 20,    // items needed to unlock cruiser
  DISTANCE_THRESHOLD:    2000,  // metres (cumulative) to unlock Illawarra
};
