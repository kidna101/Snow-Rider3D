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
    // Obstacles — GLB-backed for the Alpine world
    obstacles: [
      { glbKey: 'pine',        collidable: true,  targetH: 4.0 },
      { glbKey: 'rockMedium',  collidable: true,  targetH: 1.5 },
      { glbKey: 'rocks',       collidable: true,  targetH: 1.2 },
      { glbKey: 'grass',       collidable: false, targetH: 0.5 },
      { glbKey: 'flowerGroup', collidable: false, targetH: 0.4 },
    ],
    // Edge obstacles (collidable, themed for mountain)
    edgeObstacles: [
      { type: 'rock',  color: '#7a8da0', w: 2.5, h: 2.0, d: 2.5 },
      { type: 'tree',  color: '#1a4d2e', trunkColor: '#4a2e14', w: 1.6, h: 6.0, d: 1.6 },
    ],
    // Side scenery config (non-collidable backdrop)
    sideScenery: {
      treeSizes: [{ h: 5, w: 1.2 }, { h: 7, w: 1.8 }, { h: 4, w: 1.0 }],
      treeColor: '#1a4d2e',
      trunkColor: '#4a2e14',
      rockColor: '#7a8da0',
    },
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
      { type: 'gum',   color: '#7a9e7e', trunkColor: '#c8c0a0', w: 1.2, h: 5.5, d: 1.2 },
      { type: 'rock',  color: '#b8a88a', w: 2.4, h: 1.4, d: 2.0 },
      { type: 'log',   color: '#8b6540', w: 3.8, h: 0.65, d: 0.8 },
    ],
    // Edge obstacles (collidable, themed for Illawarra)
    edgeObstacles: [
      { type: 'rock',  color: '#c8a878', w: 2.5, h: 2.0, d: 2.5 },
      { type: 'gum',   color: '#5a8060', trunkColor: '#b0a080', w: 1.4, h: 5.5, d: 1.4 },
    ],
    // Side scenery config (non-collidable backdrop)
    sideScenery: {
      treeSizes: [{ h: 5.5, w: 1.2 }, { h: 8, w: 2.0 }, { h: 4.5, w: 1.0 }],
      treeColor: '#5a8060',
      trunkColor: '#b0a080',
      rockColor: '#c8a878',
    },
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
