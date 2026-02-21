// SCENE_CONFIG — 보충 문서 Section 8 기준 정밀 파라미터
export const SCENE_CONFIG = {

  // ═══ 배경 ═══
  background: {
    color: '#080810',
    stars: {
      count: 4000,
      radius: 100,
      depth: 50,
      factor: 4,
      saturation: 0,
      fade: true,
      speed: 0.5,
    },
  },

  // ═══ 안개 ═══
  fog: {
    type: 'exp2' as const,
    density: 0.016,
  },

  // ═══ 항성 ═══
  star: {
    radius: 1.5,
    glowLayers: [
      { radius: 2.0, opacity: 0.2,  color: '#4FC3F7' },
      { radius: 3.0, opacity: 0.08, color: '#4FC3F7' },
      { radius: 4.5, opacity: 0.03, color: '#81D4FA' },
    ],
    lightBeam: {
      height: 24,
      baseRadius: 0.25,
      tipRadius: 0.02,
      opacity: 0.15,
    },
    pointLight: {
      intensity: 3,
      color: '#4FC3F7',
      distance: 60,
      decay: 2,
    },
  },

  // ═══ 궤도 ═══
  orbit: {
    defaultEccentricity: 0.15,
    inclinationRange: [-0.3, 0.3] as [number, number],
    lineOpacity: 0.18,
    lineColor: '#4FC3F7',
  },

  // ═══ 그리드 ═══
  grid: {
    position: [0, -3, 0] as [number, number, number],
    cellSize: 2,
    cellColor: '#1a2a3a',
    sectionSize: 10,
    sectionColor: '#2a4a5a',
    fadeDistance: 35,
  },

  // ═══ 후처리 ═══
  postProcessing: {
    bloom: {
      luminanceThreshold: 0.35,
      luminanceSmoothing: 0.9,
      intensity: 1.8,
      mipmapBlur: true,
      levels: 5,
    },
    vignette: {
      offset: 0.15,
      darkness: 0.85,
    },
    chromaticAberration: {
      offset: [0.0005, 0.0005] as [number, number],
      enabled: true,
    },
    toneMapping: 'ACES_FILMIC',
  },

  // ═══ 카메라 ═══
  camera: {
    default: {
      position: [0, 15, 25] as [number, number, number],
      fov: 60,
    },
    intro: {
      startPosition: [0, 60, 60] as [number, number, number],
      duration: 3.0,
    },
    focusTransition: {
      damping: 0.03,
      offsetHeight: 3,
      offsetDistance: 8,
    },
    orbit: {
      enableDamping: true,
      dampingFactor: 0.05,
      minDistance: 5,
      maxDistance: 50,
      maxPolarAngle: Math.PI / 2.2,
    },
  },

  // ═══ 행성 색상 팔레트 ═══
  colors: [
    '#4FC3F7', '#FF7043', '#66BB6A', '#AB47BC', '#FFA726',
    '#EF5350', '#EC407A', '#26C6DA', '#8D6E63', '#78909C',
    '#FFEE58', '#5C6BC0', '#29B6F6', '#9CCC65', '#FF8A65',
  ],

  // ═══ 애니메이션 ═══
  animation: {
    planetTransition: {
      shrinkDuration: 300,
      moveDuration: 800,
      appearDelay: 400,
      appearDuration: 600,
      spring: { mass: 1.5, tension: 100, friction: 18 },
    },
    panelSlide: { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 },
    staggerDelay: 100,
  },

  // ═══ 성능 ═══
  performance: {
    dpr: [1, 1.5] as [number, number],
    maxPlanets: 15,
    particleLimit: 4000,
    sphereSegments: { close: 64, medium: 32, far: 16 },
    useInstancing: false,
  },
} as const;
