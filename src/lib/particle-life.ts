/**
 * Particle Life System
 *
 * Note: This is "AI slop". I haven't touched this code once myself, except
 * for writing this message and I don't intend to. I was fully satisfied with
 * the outcome here. My goal was the creative endeavour.
 *
 * An artificial life simulation where particles interact based on attraction/repulsion rules,
 * creating emergent organic behaviors. The system cycles through introduction messages, then
 * enters an infinite particle life mode with evolving behavior patterns.
 *
 * ## Animation Flow:
 *
 * 1. **Introduction Sequence** (one-time, ~141s total):
 *    - HOLDING (3s): Show first message "Hi there, I am Matthias"
 *    - DISSOLVING (2s) → PARTICLE_LIFE (10s) → FORMING (3s)
 *    - HOLDING (8s): Show "software developer"
 *    - ... repeats for all 7 introduction messages ...
 *
 * 2. **Infinite Particle Life** (after all messages shown):
 *    - PARTICLE_LIFE mode runs forever (20s cycles)
 *    - New attraction matrix generated every 20s for variety
 *    - Creates endless evolving organic patterns
 *
 * ## Particle Life Physics:
 *
 * - Each particle has a "type" (0-11) corresponding to a vibrant color
 * - An attraction matrix defines how each type feels about every other type
 *   - Positive values = attraction, negative = repulsion
 *   - Example: Red particles might chase blue but flee from green
 * - Matrix presets: planets, snakes, chaos, balanced, spirals, clusters
 * - Creates emergent behaviors: chasing, fleeing, orbiting, clustering
 *
 * ## Text Formation System:
 *
 * - Renders text to offscreen canvas at 2x resolution for crisp sampling
 * - Font size scales responsively (32-80px) based on viewport
 * - Samples pixel positions with adaptive density (2-3px based on font size)
 * - Each particle gets random formation speed (0.5x-1.5x) for organic arrival
 * - Forces blend smoothly: particle life → formation → holding
 *
 * ## Mouse/Touch Interaction:
 *
 * - During PARTICLE_LIFE mode, mouse/touch creates repulsion bubble (120px radius)
 * - Particles scatter away from cursor with quadratic falloff
 * - Touch events allow scrolling during non-particle-life phases
 *
 * ## Performance Optimizations:
 *
 * - **Spatial Partitioning**: Canvas divided into 80×80px grid cells
 * - Particles only check neighbors in 3×3 surrounding cells
 * - Reduces force calculations from O(n²) to ~O(n)
 * - ~10x performance improvement, better battery life
 *
 * ## Physics Update Loop:
 *
 * For each particle:
 *   1. Build spatial grid organizing particles by position
 *   2. Get nearby particles from surrounding cells
 *   3. Calculate pairwise forces: F = attraction × (1 - d/range) × strength
 *   4. Apply mouse repulsion force (if active)
 *   5. Apply formation force (if forming/holding text)
 *   6. Sum all forces: F_total = Σ F_i
 *   7. Update velocity: v = v × friction + F_total × dt
 *   8. Cap velocity to MAX_SPEED
 *   9. Update position: pos = pos + v × dt
 *  10. Wrap around edges (toroidal topology)
 */

// =============================================================================
// Types
// =============================================================================

export interface ParticleLife {
  x: number;                    // Current X position in canvas coordinates
  y: number;                    // Current Y position in canvas coordinates
  vx: number;                   // Velocity X component
  vy: number;                   // Velocity Y component
  type: number;                 // Color type (0-11, maps to COLORS array)
  targetX?: number;             // Target X position when forming text
  targetY?: number;             // Target Y position when forming text
  formationSpeed?: number;      // Speed multiplier for text formation (0.5-1.5, creates organic arrival)
}


// =============================================================================
// Constants
// =============================================================================

// Particle types and their vibrant colors (Tailwind 500 series)
const PARTICLE_TYPES = 12;
const COLORS = [
  { r: 239, g: 68, b: 68 },      // red-500
  { r: 251, g: 146, b: 60 },     // orange-500
  { r: 234, g: 179, b: 8 },      // yellow-500
  { r: 132, g: 204, b: 22 },     // lime-500
  { r: 34, g: 197, b: 94 },      // green-500
  { r: 16, g: 185, b: 129 },     // emerald-500
  { r: 20, g: 184, b: 166 },     // teal-500
  { r: 6, g: 182, b: 212 },      // cyan-500
  { r: 59, g: 130, b: 246 },     // blue-500
  { r: 99, g: 102, b: 241 },     // indigo-500
  { r: 168, g: 85, b: 247 },     // purple-500
  { r: 236, g: 72, b: 153 },     // pink-500
];

// Physics constants
const FORCE_RANGE = 80;             // Interaction radius: particles sense neighbors within 80px
const FRICTION = 0.88;              // Velocity damping per frame (0-1, higher = less friction)
const MAX_FORCE = 180;              // Maximum force magnitude for particle life interactions
const MAX_SPEED = 150;              // Velocity cap (prevents particles from moving too fast)
const REPULSION_RANGE = 8;          // Close-range repulsion to prevent particle overlap
const PARTICLE_COUNT = 2000;        // Base particle count for desktop
const PARTICLE_COUNT_MOBILE = 1000; // Reduced particle count for mobile performance
const PARTICLE_RADIUS = 1.5;        // Visual size of each particle

// Mouse/touch interaction
const MOUSE_REPULSION_RANGE = 120;     // Radius of mouse repulsion bubble
const MOUSE_REPULSION_STRENGTH = 800;  // Force strength (particles scatter from cursor)

// Spatial partitioning optimization
const CELL_SIZE = FORCE_RANGE;      // Grid cell size matches force range for optimal partitioning


// Index of "and creative\nthings." message where balloon animation plays
const CREATIVE_MESSAGE_INDEX = 4;

// Balloon animation constants
const BALLOON = {
  // Timing
  riseDuration: 4,              // How long the balloon rises (seconds)

  // Envelope (the balloon chute - solid filled)
  envelopeWidth: 70,            // Width of balloon envelope (wider)
  envelopeHeight: 75,           // Height of balloon envelope (taller)
  envelopeOpeningRatio: 0.2,    // Width of opening at bottom relative to full width (narrow for angled ropes)

  // Basket (solid filled rectangle with rounded corners)
  basketWidth: 20,              // Width of basket (smaller)
  basketHeight: 12,             // Height of basket (smaller)
  basketGap: 18,                // Gap between envelope bottom and basket top (for ropes)
  basketCornerRadius: 3,        // Rounded corner radius for basket
  ropeExtendIntoEnvelope: 15,   // How far ropes extend up into the envelope

  // Movement
  riseDistance: 0.4,            // Rise to 40% from dot position toward top

  // Particle density for filling shapes
  fillDensity: 3,               // Pixels between particles when filling
} as const;

// Animation timing (in seconds)
const TIMING = {
  explosion: 2,                 // Initial burst from center (unused - starts in HOLDING)
  particleLife: 10,             // Chaotic particle life between messages
  particleLifeInfinite: 20,     // Particle life cycle after all messages
  forming: 3,                   // Particles transitioning to form text
  holding: 8,                   // Particles holding text shape
  holdingFirst: 3,              // First message hold
  holdingCreative: 6,           // Hold time before balloon starts for "creative" message
  balloonRising: BALLOON.riseDuration, // Balloon rises from "i" dot
  dissolving: 2,                // Text dissolving back to chaos
} as const;

// Introduction messages (shown once in sequence)
const MESSAGES = [
  "Hi there,\nI am Matthias",
  "a software\ndeveloper,",
  "a bikepacker\n🚲",
  "who likes\nBadminton 🏸",
  "and creative\nthings.",
  "These are\nmy notes.",
  "Enjoy!"
];

// Responsive font sizing
const getResponsiveFontSize = (canvasWidth: number, canvasHeight: number): number => {
  // Base font size on viewport dimensions
  // Mobile: smaller font, Desktop: larger font
  const minSize = 32;  // Minimum font size for very small screens (increased for crispness)
  const maxSize = 80;  // Maximum font size for large screens (increased for crispness)

  // Use the smaller dimension to ensure text fits
  const smallerDimension = Math.min(canvasWidth, canvasHeight);

  // Scale font size: 10% of smaller dimension, clamped between min and max
  const scaledSize = smallerDimension * 0.1;
  return Math.max(minSize, Math.min(maxSize, scaledSize));
};

// Get responsive sample density - sample more densely for better quality
const getResponsiveSampleDensity = (fontSize: number): number => {
  // Smaller fonts need denser sampling for crispness
  // Larger fonts can use sparser sampling
  if (fontSize < 40) return 2.5;  // Moderate density for small text (mobile)
  if (fontSize < 60) return 3;    // Standard density for medium text
  return 3.5;  // Slightly sparser for large text
};

// Animation phases
enum AnimationMode {
  EXPLOSION = 'EXPLOSION',       // Particles explode from center (unused in current flow)
  PARTICLE_LIFE = 'PARTICLE_LIFE', // Chaotic particle life with attraction/repulsion
  FORMING = 'FORMING',           // Particles moving to form text
  HOLDING = 'HOLDING',           // Particles holding text shape
  BALLOON_RISING = 'BALLOON_RISING', // Hot air balloon rises from "i" dot in "creative"
  DISSOLVING = 'DISSOLVING',     // Text dissolving/exploding outward
}

// =============================================================================
// Particle Life System
// =============================================================================

export function createParticleLifeSystem(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const particles: ParticleLife[] = [];
  let animationId: number | null = null;
  let lastTime = 0;

  // Animation state
  let currentMode: AnimationMode = AnimationMode.EXPLOSION;
  let modeStartTime = 0;
  let animationStartTime = 0; // Track when entire animation sequence began
  let pausedTime = 0; // Accumulated time while paused (tab hidden)
  let lastPauseStart = 0; // When the current pause started
  let isPaused = false; // Whether animation is currently paused
  let textTargets: Array<{ x: number; y: number; type: number }> = [];
  let currentMessageIndex = 0;
  let isFirstMessage = true;
  let simWidth = 0;
  let simHeight = 0;
  let dpr = 1;

  // Mouse/touch interaction state
  let mouseX: number | null = null;
  let mouseY: number | null = null;
  let isMouseActive = false;

  // Spatial partitioning grid (pre-allocated to reduce churn)
  let grid: ParticleLife[][] = [];
  let gridCols = 0;
  let gridRows = 0;
  let gridSize = 0;

  // Balloon animation state
  let balloonParticles: Set<ParticleLife> = new Set(); // Particles forming the balloon
  let balloonStartY = 0;          // Y position where balloon starts (the "i" dot)
  let balloonCenterX = 0;         // X position of balloon center
  let iDotTargets: Array<{ x: number; y: number; type: number }> = []; // Original "i" dot targets
  let cachedBalloonOffsets: Array<{ dx: number; dy: number }> = []; // Cached balloon shape as offsets from center

  /**
   * Generate random attraction matrix defining particle behavior
   *
   * The matrix creates the "personality" of the particle system.
   * Matrix[i][j] = how much particle type i is attracted to type j
   * - Positive values (0 to 1): attraction
   * - Negative values (-1 to 0): repulsion
   *
   * Different presets create distinct emergent behaviors:
   * - planets: Orbital systems with satellites
   * - snakes: Chasing chains (type N chases N+1)
   * - chaos: Maximum variety with extreme values
   * - balanced: Gentle, stable interactions
   * - spirals: Rotational forces create spiral patterns
   * - clusters: Grouping behavior with self-attraction
   */
  const generateAttractionMatrix = (): number[][] => {
    const presets = [
      'random',
      'planets',      // Orbital systems with satellites
      'snakes',       // Long chains that chase each other
      'chaos',        // Complete mayhem
      'balanced',     // Stable, gentle interactions
      'spirals',      // Rotating spiral formations
      'clusters',     // Grouping behavior
    ];

    const preset = presets[Math.floor(Math.random() * presets.length)];
    const matrix: number[][] = [];

    for (let i = 0; i < PARTICLE_TYPES; i++) {
      matrix[i] = [];
    }

    switch (preset) {
      case 'planets':
        // Create orbital systems - some types strongly attract, others orbit
        for (let i = 0; i < PARTICLE_TYPES; i++) {
          for (let j = 0; j < PARTICLE_TYPES; j++) {
            if (i === j) {
              matrix[i][j] = -0.5; // Self-repulsion prevents clumping
            } else if (Math.abs(i - j) === 1) {
              matrix[i][j] = 0.8; // Adjacent types attract strongly (creates orbits)
            } else {
              matrix[i][j] = -0.2; // Others weakly repel
            }
          }
        }
        break;

      case 'snakes':
        // Create chasing behavior - each type chases the next
        for (let i = 0; i < PARTICLE_TYPES; i++) {
          for (let j = 0; j < PARTICLE_TYPES; j++) {
            if (i === j) {
              matrix[i][j] = -0.3;
            } else if ((i + 1) % PARTICLE_TYPES === j) {
              matrix[i][j] = 0.9; // Chase the next type
            } else if ((j + 1) % PARTICLE_TYPES === i) {
              matrix[i][j] = -0.7; // Flee from the previous type
            } else {
              matrix[i][j] = 0;
            }
          }
        }
        break;

      case 'chaos':
        // Maximum variety - extreme values
        for (let i = 0; i < PARTICLE_TYPES; i++) {
          for (let j = 0; j < PARTICLE_TYPES; j++) {
            matrix[i][j] = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5);
          }
        }
        break;

      case 'balanced':
        // Gentle, stable interactions
        for (let i = 0; i < PARTICLE_TYPES; i++) {
          for (let j = 0; j < PARTICLE_TYPES; j++) {
            matrix[i][j] = (Math.random() - 0.5) * 0.6; // Smaller range
          }
        }
        break;

      case 'spirals':
        // Rotational forces create spirals
        for (let i = 0; i < PARTICLE_TYPES; i++) {
          for (let j = 0; j < PARTICLE_TYPES; j++) {
            const diff = (j - i + PARTICLE_TYPES) % PARTICLE_TYPES;
            if (diff < PARTICLE_TYPES / 2) {
              matrix[i][j] = 0.6 * (1 - diff / (PARTICLE_TYPES / 2));
            } else {
              matrix[i][j] = -0.4;
            }
          }
        }
        break;

      case 'clusters':
        // Create stable clusters
        for (let i = 0; i < PARTICLE_TYPES; i++) {
          for (let j = 0; j < PARTICLE_TYPES; j++) {
            if (i === j) {
              matrix[i][j] = 0.5; // Same type attracts
            } else if (Math.abs(i - j) <= 2) {
              matrix[i][j] = 0.3; // Similar types weakly attract
            } else {
              matrix[i][j] = -0.4; // Others repel
            }
          }
        }
        break;

      case 'random':
      default:
        // Classic random
        for (let i = 0; i < PARTICLE_TYPES; i++) {
          for (let j = 0; j < PARTICLE_TYPES; j++) {
            matrix[i][j] = Math.random() * 2 - 1;
          }
        }
        break;
    }

    return matrix;
  };

  let attractionMatrix = generateAttractionMatrix();

  // =============================================================================
  // Canvas Management
  // =============================================================================

  /**
   * Resize canvas and regenerate text if needed
   *
   * Updates canvas dimensions and device pixel ratio for crisp rendering.
   * If size changes significantly during text display, regenerates text targets
   * to maintain proper sizing (important for mobile orientation changes).
   */
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const oldWidth = simWidth;
    const oldHeight = simHeight;
    simWidth = rect.width;
    simHeight = rect.height;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(simWidth * dpr));
    canvas.height = Math.max(1, Math.floor(simHeight * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Recalculate grid dimensions and ensure grid allocation
    gridCols = Math.max(1, Math.ceil(simWidth / CELL_SIZE));
    gridRows = Math.max(1, Math.ceil(simHeight / CELL_SIZE));
    const nextSize = gridCols * gridRows;
    if (nextSize !== gridSize) {
      grid = Array.from({ length: nextSize }, () => []);
      gridSize = nextSize;
    }

    // If size changed significantly, regenerate text targets for current message
    // This keeps text crisp and properly sized on orientation changes
    const sizeChanged = Math.abs(oldWidth - simWidth) > 50 || Math.abs(oldHeight - simHeight) > 50;
    if (sizeChanged && (currentMode === AnimationMode.FORMING || currentMode === AnimationMode.HOLDING)) {
      generateTextTargets(MESSAGES[currentMessageIndex]);
      assignTargetsToParticles();
    }
  };


  /**
   * Get elapsed time in current animation mode (in seconds)
   */
  const getModeElapsedTime = (now: number): number => {
    return (now - modeStartTime) / 1000;
  };

  /**
   * Get duration for a given animation mode
   * Returns null for modes with no fixed duration
   */
  const getModeDuration = (mode: AnimationMode): number | null => {
    switch (mode) {
      case AnimationMode.EXPLOSION:
        return TIMING.explosion;
      case AnimationMode.PARTICLE_LIFE:
        // During intro: 10s, after all messages: 20s for infinite mode
        return currentMessageIndex >= MESSAGES.length ? TIMING.particleLifeInfinite : TIMING.particleLife;
      case AnimationMode.FORMING:
        return TIMING.forming;
      case AnimationMode.HOLDING:
        if (isFirstMessage) return TIMING.holdingFirst;
        // Shorter hold for creative message before balloon
        if (currentMessageIndex === CREATIVE_MESSAGE_INDEX) return TIMING.holdingCreative;
        return TIMING.holding;
      case AnimationMode.BALLOON_RISING:
        return TIMING.balloonRising;
      case AnimationMode.DISSOLVING:
        return TIMING.dissolving;
      default:
        return null;
    }
  };

  /**
   * Enter a new animation mode
   *
   * Handles mode-specific setup:
   * - FORMING: Generate text targets and assign to particles
   * - PARTICLE_LIFE: Generate new attraction matrix (during message sequence)
   * - BALLOON_RISING: Set up balloon animation for "creative things" message
   */
  const enterMode = (mode: AnimationMode, now: number) => {
    currentMode = mode;
    modeStartTime = now;

    if (mode === AnimationMode.FORMING && currentMessageIndex < MESSAGES.length) {
      generateTextTargets(MESSAGES[currentMessageIndex]);
      assignTargetsToParticles();
    }

    if (mode === AnimationMode.PARTICLE_LIFE) {
      // Generate new attraction matrix for variety
      attractionMatrix = generateAttractionMatrix();
      // Clear balloon state when entering particle life
      balloonParticles.clear();
    }

    if (mode === AnimationMode.BALLOON_RISING) {
      // Set up balloon animation
      setupBalloonAnimation();
    }
  };

  /**
   * Check if current mode should advance and transition to next mode
   *
   * Flow logic:
   * - Messages 0-6: HOLDING → DISSOLVING → PARTICLE_LIFE → FORMING → HOLDING (next message)
   * - After message 6: DISSOLVING → PARTICLE_LIFE (infinite with matrix regeneration every 20s)
   */
  const advanceMode = (now: number) => {
    const duration = getModeDuration(currentMode);
    if (duration === null) return;
    const elapsed = getModeElapsedTime(now);
    if (elapsed < duration) return;

    let nextMode: AnimationMode | null = null;

    switch (currentMode) {
      case AnimationMode.EXPLOSION:
        nextMode = AnimationMode.PARTICLE_LIFE;
        break;
      case AnimationMode.PARTICLE_LIFE:
        if (currentMessageIndex < MESSAGES.length) {
          // Still have messages to show - transition to forming the next message
          nextMode = AnimationMode.FORMING;
        } else {
          // All messages shown - stay in particle life forever
          // Just regenerate matrix and reset timer (don't change mode)
          attractionMatrix = generateAttractionMatrix();
          modeStartTime = now;
          // Explicitly do NOT set nextMode - stay in PARTICLE_LIFE
          nextMode = null;
        }
        break;
      case AnimationMode.FORMING:
        nextMode = AnimationMode.HOLDING;
        break;
      case AnimationMode.HOLDING:
        // Special case: "creative things" message triggers balloon animation
        if (currentMessageIndex === CREATIVE_MESSAGE_INDEX) {
          nextMode = AnimationMode.BALLOON_RISING;
          isFirstMessage = false;
        } else if (currentMessageIndex < MESSAGES.length - 1) {
          // More messages to show
          nextMode = AnimationMode.DISSOLVING;
          isFirstMessage = false;
        } else {
          // Last message - go to infinite particle life after dissolving
          nextMode = AnimationMode.DISSOLVING;
          isFirstMessage = false;
        }
        break;
      case AnimationMode.BALLOON_RISING:
        // After balloon finishes rising, dissolve everything
        nextMode = AnimationMode.DISSOLVING;
        break;
      case AnimationMode.DISSOLVING:
        // Increment message index and check if we're done with all messages
        currentMessageIndex = currentMessageIndex + 1;
        if (currentMessageIndex < MESSAGES.length) {
          // More messages to show
          nextMode = AnimationMode.PARTICLE_LIFE;
        } else {
          // All messages shown - enter infinite particle life mode
          nextMode = AnimationMode.PARTICLE_LIFE;
        }
        break;
    }

    if (nextMode) {
      enterMode(nextMode, now);
    }
  };

  // =============================================================================
  // Particle Creation
  // =============================================================================

  /**
   * Spawn a new particle at random position with random velocity
   * @param type - Optional particle type (0-11), random if not specified
   */
  const spawnParticle = (type?: number): ParticleLife => {
    const x = Math.random() * simWidth;
    const y = Math.random() * simHeight;

    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      type: type !== undefined ? type : Math.floor(Math.random() * PARTICLE_TYPES),
    };
  };


  // =============================================================================
  // Spatial Partitioning (Performance Optimization)
  // =============================================================================

  /**
   * Build spatial partitioning grid for current frame
   *
   * Divides canvas into cells and assigns each particle to its cell.
   * This allows O(n) neighbor lookups instead of O(n²) checks.
   */
  const buildGrid = () => {
    if (gridSize === 0) return;
    for (const cell of grid) cell.length = 0;

    for (const p of particles) {
      const cellX = ((Math.floor(p.x / CELL_SIZE) % gridCols) + gridCols) % gridCols;
      const cellY = ((Math.floor(p.y / CELL_SIZE) % gridRows) + gridRows) % gridRows;
      const idx = cellY * gridCols + cellX;
      grid[idx].push(p);
    }
  };

  /**
   * Iterate through nearby particles in a 3×3 grid around the given particle
   * Only checks particles in neighboring cells, not the entire simulation
   */
  const forEachNearbyParticle = (p: ParticleLife, fn: (other: ParticleLife) => void) => {
    const cellX = ((Math.floor(p.x / CELL_SIZE) % gridCols) + gridCols) % gridCols;
    const cellY = ((Math.floor(p.y / CELL_SIZE) % gridRows) + gridRows) % gridRows;

    // Check 3x3 grid of cells around particle
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = (cellX + dx + gridCols) % gridCols;
        const y = (cellY + dy + gridRows) % gridRows;
        const idx = y * gridCols + x;
        for (const other of grid[idx]) {
          fn(other);
        }
      }
    }
  };

  // =============================================================================
  // Force Calculations (Core Physics)
  // =============================================================================

  /**
   * Calculate attraction/repulsion force between two particles
   *
   * This is the CORE of particle life behavior!
   *
   * Force formula:
   * 1. Very close (< 8px): Strong repulsion to prevent overlap
   * 2. Within range (< 80px): F = attraction[i][j] × (1 - d/range) × strength
   * 3. Far away (> 80px): No interaction
   *
   * Force magnitude sketch (signed):
   *   ^
   *   |  repulse     attract/repel (linear)        0
   *   |   /\               \                       |
   *   |  /  \               \                      |
   *   +--|---|----------------\--------------------+--> d
   *      r0  |                 R
   *          r0 = REPULSION_RANGE, R = FORCE_RANGE
   *
   * @returns Force vector {fx, fy} to apply to p1
   */
  const calculateForce = (p1: ParticleLife, p2: ParticleLife): { fx: number; fy: number } => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < 0.01) return { fx: 0, fy: 0 };
    if (distSq > FORCE_RANGE * FORCE_RANGE) return { fx: 0, fy: 0 };

    const dist = Math.sqrt(distSq);

    // REPULSION: Very close particles always repel (prevents clustering/overlap)
    if (dist < REPULSION_RANGE) {
      const repulsionForce = (REPULSION_RANGE - dist) / REPULSION_RANGE * 50;
      return {
        fx: -(dx / dist) * repulsionForce,
        fy: -(dy / dist) * repulsionForce,
      };
    }

    // ATTRACTION/REPULSION: Look up how p1's type feels about p2's type
    const attraction = attractionMatrix[p1.type][p2.type];

    // Linear falloff: force decreases with distance
    // F = attraction × (1 - d/range) × strength
    const forceMagnitude = attraction * (1 - dist / FORCE_RANGE) * MAX_FORCE;

    // Normalize direction and apply magnitude
    return {
      fx: (dx / dist) * forceMagnitude,
      fy: (dy / dist) * forceMagnitude,
    };
  };


  // =============================================================================
  // Text Formation
  // =============================================================================

  /**
   * Fisher-Yates shuffle algorithm (in-place)
   * Randomizes array order to prevent clustering artifacts
   */
  const shuffleInPlace = <T>(items: T[]): T[] => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };

  /**
   * Generate particle target positions by rendering text to offscreen canvas
   *
   * Process:
   * 1. Render text at 2x resolution for quality
   * 2. Sample pixel positions where text is visible (alpha > 128)
   * 3. Assign random particle types for colorful text
   * 4. Scale back to actual canvas coordinates
   * 5. Shuffle to prevent clustering
   */
  const generateTextTargets = (text: string) => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Set up canvas for text rendering at higher resolution for better quality
    // Use fixed 2x scale, independent of device pixel ratio
    const renderScale = 2;
    const canvasWidth = Math.floor(simWidth * renderScale);
    const canvasHeight = Math.floor(simHeight * renderScale);

    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;

    // Get responsive font size based on canvas dimensions
    const fontSize = getResponsiveFontSize(simWidth, simHeight);
    const sampleDensity = getResponsiveSampleDensity(fontSize);

    // Configure text style (matching the site font)
    tempCtx.font = `bold ${Math.floor(fontSize * renderScale)}px "Source Serif Pro", serif`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = 'white';

    // Enable better text rendering
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';

    // Draw text centered on canvas
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const lines = text.split('\n');
    const lineHeight = Math.floor(fontSize * renderScale * 1.3);
    const totalHeight = lines.length * lineHeight;
    const startY = centerY - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      tempCtx.fillText(line, centerX, startY + i * lineHeight);
    });

    // Sample pixels from the text
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const samples: Array<{ x: number; y: number; type: number }> = [];

    const step = sampleDensity * renderScale;
    for (let y = 0; y < tempCanvas.height; y += step) {
      for (let x = 0; x < tempCanvas.width; x += step) {
        const idx = (y * tempCanvas.width + x) * 4;
        const alpha = imageData.data[idx + 3];

        // If pixel is part of the text (has alpha > 0)
        if (alpha > 128) {
          // Assign random particle type for colorful text
          const type = Math.floor(Math.random() * PARTICLE_TYPES);
          // Scale back to actual canvas coordinates
          samples.push({
            x: x / renderScale,
            y: y / renderScale,
            type
          });
        }
      }
    }

    // Shuffle in place to avoid clustering
    shuffleInPlace(samples);
    textTargets = samples;
  };

  /**
   * Assign text formation targets to all particles
   *
   * Distributes target positions cyclically if there are more particles than targets.
   * Each particle also gets a random formation speed for organic arrival timing.
   * Particle colors are preserved (not overwritten) for smooth transitions.
   */
  const assignTargetsToParticles = (targets: Array<{ x: number; y: number; type: number }> = textTargets) => {
    if (targets.length === 0) return;

    // Assign targets to particles (reuse targets if more particles than targets)
    for (let i = 0; i < particles.length; i++) {
      const target = targets[i % targets.length];
      particles[i].targetX = target.x;
      particles[i].targetY = target.y;
      // Assign random speed for organic formation (0.5x to 1.5x base speed)
      particles[i].formationSpeed = 0.5 + Math.random();
    }
  };

  // =============================================================================
  // Balloon Animation (for "creative things" message)
  // =============================================================================

  /**
   * Find the "i" dot position in "creative" by looking for an isolated cluster
   * above the main text body. The dot is typically a small cluster of particles
   * above the letter stem.
   */
  const findIDotPosition = (): { x: number; y: number; targets: Array<{ x: number; y: number; type: number }> } | null => {
    if (textTargets.length === 0) return null;

    // For "and creative\nthings." the "i" in "creative" is on the first line
    // Find the vertical center of line 1 (top line)
    const sortedByY = [...textTargets].sort((a, b) => a.y - b.y);
    const minY = sortedByY[0].y;
    const maxY = sortedByY[sortedByY.length - 1].y;
    const midY = (minY + maxY) / 2;

    // Get only first line particles (above mid point)
    const firstLineTargets = textTargets.filter(t => t.y < midY);
    if (firstLineTargets.length === 0) return null;

    // Find x-range of first line
    const sortedByX = [...firstLineTargets].sort((a, b) => a.x - b.x);
    const lineMinX = sortedByX[0].x;
    const lineMaxX = sortedByX[sortedByX.length - 1].x;
    const lineWidth = lineMaxX - lineMinX;

    // The "i" in "creative" is roughly at position 8 out of 12 characters ("and creat[i]ve")
    // But "and " is 4 chars, so "i" is at position 4 in "creative" which is 8 chars
    // Estimate: about 65-75% across the first line
    const iApproxX = lineMinX + lineWidth * 0.68;

    // Find the topmost particles near the estimated "i" position (the dot)
    // The dot should be above the baseline of letters
    const firstLineMinY = Math.min(...firstLineTargets.map(t => t.y));
    const firstLineMaxY = Math.max(...firstLineTargets.map(t => t.y));
    const lineHeight = firstLineMaxY - firstLineMinY;

    // Look for particles in the top 30% of the line height, near the "i" x position
    const dotCandidates = firstLineTargets.filter(t => {
      const isNearTop = t.y < firstLineMinY + lineHeight * 0.35;
      const isNearIPosition = Math.abs(t.x - iApproxX) < lineWidth * 0.08;
      return isNearTop && isNearIPosition;
    });

    if (dotCandidates.length === 0) {
      // Fallback: just use topmost particles near center-right of first line
      const fallbackCandidates = firstLineTargets
        .filter(t => t.x > lineMinX + lineWidth * 0.5 && t.x < lineMinX + lineWidth * 0.85)
        .sort((a, b) => a.y - b.y)
        .slice(0, 20);

      if (fallbackCandidates.length === 0) return null;

      const avgX = fallbackCandidates.reduce((s, t) => s + t.x, 0) / fallbackCandidates.length;
      const avgY = fallbackCandidates.reduce((s, t) => s + t.y, 0) / fallbackCandidates.length;
      return { x: avgX, y: avgY, targets: fallbackCandidates };
    }

    // Calculate center of the dot cluster
    const avgX = dotCandidates.reduce((s, t) => s + t.x, 0) / dotCandidates.length;
    const avgY = dotCandidates.reduce((s, t) => s + t.y, 0) / dotCandidates.length;

    return { x: avgX, y: avgY, targets: dotCandidates };
  };

  /**
   * Draw a hot air balloon shape to an offscreen canvas and return it.
   * The balloon is drawn at the center of the canvas.
   */
  const drawBalloonToCanvas = (
    width: number,
    height: number,
    envelopePulse: number,
    basketPulse: number
  ): { canvas: HTMLCanvasElement; envCenterY: number; totalHeight: number } => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;

    // Canvas size with some padding
    const padding = 20;
    tempCanvas.width = width + padding * 2;
    tempCanvas.height = height + padding * 2;

    const centerX = tempCanvas.width / 2;

    // Dimensions with pulse applied
    const envWidth = BALLOON.envelopeWidth * envelopePulse;
    const envHeight = BALLOON.envelopeHeight * envelopePulse;
    const basketW = BALLOON.basketWidth * basketPulse;
    const basketH = BALLOON.basketHeight * basketPulse;
    const gap = BALLOON.basketGap;

    // Position envelope at top, basket below
    const envCenterY = padding + envHeight / 2;
    const envBottom = envCenterY + envHeight / 2;
    const basketTop = envBottom + gap;
    const basketCenterY = basketTop + basketH / 2;

    tempCtx.fillStyle = 'white';
    tempCtx.strokeStyle = 'white';
    tempCtx.lineWidth = 3;

    // Draw envelope - a rounder balloon shape (more circular, less egg-like)
    // Use an ellipse for the main body, then taper at the bottom
    const envTop = envCenterY - envHeight / 2;

    tempCtx.beginPath();
    // Draw as ellipse for top 80%, then taper to narrow opening
    const taperStartY = envCenterY + envHeight * 0.25; // where taper begins
    const openingWidth = envWidth * BALLOON.envelopeOpeningRatio;

    // Start at bottom center-left of opening
    tempCtx.moveTo(centerX - openingWidth / 2, envBottom);

    // Left side: go up from opening, curve out to full width, then curve to top
    tempCtx.quadraticCurveTo(
      centerX - envWidth / 2, taperStartY,  // control: full width at taper point
      centerX - envWidth / 2, envCenterY    // end: left side at center height
    );
    tempCtx.quadraticCurveTo(
      centerX - envWidth / 2, envTop,       // control: left side at top
      centerX, envTop                        // end: top center
    );

    // Right side: mirror
    tempCtx.quadraticCurveTo(
      centerX + envWidth / 2, envTop,       // control: right side at top
      centerX + envWidth / 2, envCenterY    // end: right side at center height
    );
    tempCtx.quadraticCurveTo(
      centerX + envWidth / 2, taperStartY,  // control: full width at taper point
      centerX + openingWidth / 2, envBottom // end: bottom center-right of opening
    );

    tempCtx.closePath();
    tempCtx.fill();

    // Draw ropes: \ on left, / on right
    // They start inside the envelope (wider apart) and go down to basket (closer together)
    const ropeTopY = envBottom - BALLOON.ropeExtendIntoEnvelope;
    const ropeTopHalfWidth = 18;  // how far apart ropes are at the top
    const ropeBottomHalfWidth = basketW / 2;  // ropes connect to basket edges

    tempCtx.beginPath();
    // Left rope: \ (top-left to bottom-right direction)
    tempCtx.moveTo(centerX - ropeTopHalfWidth, ropeTopY);
    tempCtx.lineTo(centerX - ropeBottomHalfWidth, basketTop);
    tempCtx.stroke();

    tempCtx.beginPath();
    // Right rope: / (top-right to bottom-left direction)
    tempCtx.moveTo(centerX + ropeTopHalfWidth, ropeTopY);
    tempCtx.lineTo(centerX + ropeBottomHalfWidth, basketTop);
    tempCtx.stroke();

    // Draw basket (rounded rectangle)
    tempCtx.beginPath();
    tempCtx.roundRect(
      centerX - basketW / 2,
      basketTop,
      basketW,
      basketH,
      BALLOON.basketCornerRadius
    );
    tempCtx.fill();

    const totalHeight = basketTop + basketH + padding;

    return { canvas: tempCanvas, envCenterY, totalHeight };
  };

  /**
   * Generate balloon shape targets by drawing to canvas and sampling pixels.
   * Same technique as generateTextTargets.
   */
  const generateBalloonTargets = (
    centerX: number,
    centerY: number,
    _elapsed: number
  ): Array<{ x: number; y: number }> => {
    // Estimate total dimensions
    const totalWidth = BALLOON.envelopeWidth + 40;
    const totalHeight = BALLOON.envelopeHeight + BALLOON.basketGap + BALLOON.basketHeight + 40;

    // Draw balloon to offscreen canvas (no pulsing for now)
    const { canvas: tempCanvas, envCenterY } = drawBalloonToCanvas(
      totalWidth,
      totalHeight,
      1, // envelopePulse = 1 (no pulse)
      1  // basketPulse = 1 (no pulse)
    );

    const tempCtx = tempCanvas.getContext('2d')!;
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Sample pixels where balloon is drawn
    const targets: Array<{ x: number; y: number }> = [];
    const density = BALLOON.fillDensity;

    for (let py = 0; py < tempCanvas.height; py += density) {
      for (let px = 0; px < tempCanvas.width; px += density) {
        const idx = (py * tempCanvas.width + px) * 4;
        const alpha = imageData.data[idx + 3];

        if (alpha > 128) {
          // Map canvas coordinates to world coordinates
          // Canvas center maps to (centerX, centerY) where centerY is the envelope center
          const worldX = centerX + (px - tempCanvas.width / 2);
          const worldY = centerY + (py - envCenterY);

          targets.push({ x: worldX, y: worldY });
        }
      }
    }

    return targets;
  };

  /**
   * Set up balloon animation: find "i" dot, recruit particles, prepare targets
   */
  const setupBalloonAnimation = () => {
    const dotInfo = findIDotPosition();
    if (!dotInfo) return;

    balloonCenterX = dotInfo.x;
    balloonStartY = dotInfo.y;
    iDotTargets = dotInfo.targets;

    // Generate balloon shape ONCE and cache as offsets from center
    // This prevents particle position flickering during flight
    const balloonTargets = generateBalloonTargets(0, 0, 0); // Generate at origin
    cachedBalloonOffsets = balloonTargets.map(t => ({ dx: t.x, dy: t.y }));

    const balloonSize = Math.max(150, cachedBalloonOffsets.length);

    // Sort particles by distance to dot center - recruit nearest ones
    const sortedByDistance = [...particles].sort((a, b) => {
      const distA = Math.hypot(a.x - balloonCenterX, a.y - balloonStartY);
      const distB = Math.hypot(b.x - balloonCenterX, b.y - balloonStartY);
      return distA - distB;
    });

    balloonParticles.clear();
    for (let i = 0; i < Math.min(balloonSize, sortedByDistance.length); i++) {
      balloonParticles.add(sortedByDistance[i]);
    }

    // Assign initial targets and lock in formation speeds
    const balloonArray = Array.from(balloonParticles);
    for (let i = 0; i < balloonArray.length; i++) {
      const p = balloonArray[i];
      p.formationSpeed = 0.8 + Math.random() * 0.4;
    }
  };

  /**
   * Update balloon particle targets based on current rise progress
   */
  const updateBalloonTargets = (elapsed: number) => {
    if (balloonParticles.size === 0 || cachedBalloonOffsets.length === 0) return;

    // Calculate rise progress (0 to 1)
    const riseProgress = Math.min(1, elapsed / TIMING.balloonRising);

    // Ease out for smooth deceleration at top
    const easedProgress = 1 - Math.pow(1 - riseProgress, 3);

    // Calculate current balloon center Y (rises from dot toward top)
    const riseAmount = balloonStartY * BALLOON.riseDistance * easedProgress;
    const currentY = balloonStartY - riseAmount;

    // Apply cached offsets to current position (no regeneration = no flickering)
    const balloonArray = Array.from(balloonParticles);
    for (let i = 0; i < balloonArray.length; i++) {
      const offset = cachedBalloonOffsets[i % cachedBalloonOffsets.length];
      const p = balloonArray[i];
      p.targetX = balloonCenterX + offset.dx;
      p.targetY = currentY + offset.dy;
    }
  };

  type ModeForces = {
    formation: (elapsed: number) => number;
    particleLife: (elapsed: number, formationStrength: number) => number;
    explosion: boolean;
  };

  const modeForces: Record<AnimationMode, ModeForces> = {
    [AnimationMode.EXPLOSION]: {
      formation: () => 0,
      particleLife: () => 0,
      explosion: true,
    },
    [AnimationMode.PARTICLE_LIFE]: {
      formation: () => 0,
      particleLife: () => 1,
      explosion: false,
    },
    [AnimationMode.FORMING]: {
      formation: (elapsed) => {
        const formProgress = elapsed / TIMING.forming;
        const eased = Math.min(1, formProgress * formProgress);
        return Math.max(0, eased);
      },
      particleLife: (_elapsed, formationStrength) => 1 - formationStrength,
      explosion: false,
    },
    [AnimationMode.HOLDING]: {
      formation: () => 1,
      particleLife: () => 0,
      explosion: false,
    },
    [AnimationMode.BALLOON_RISING]: {
      formation: () => 1, // Keep text formed, balloon particles get special handling
      particleLife: () => 0,
      explosion: false,
    },
    [AnimationMode.DISSOLVING]: {
      formation: (elapsed) => Math.max(0, 1 - elapsed / TIMING.dissolving),
      particleLife: () => 0,
      explosion: true,
    },
  };

  /**
   * Calculate explosion force (radial outward from center or text position)
   * Used during EXPLOSION and DISSOLVING modes
   */
  const getExplosionForce = (p: ParticleLife, elapsed: number): { fx: number; fy: number } => {
    if (currentMode === AnimationMode.EXPLOSION) {
      // Burst from center (unused in current flow)
      const centerX = simWidth / 2;
      const centerY = simHeight / 2;
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) return { fx: 0, fy: 0 };

      const progress = elapsed / TIMING.explosion;
      const strength = 3000 * (1 - progress);

      return {
        fx: (dx / dist) * strength,
        fy: (dy / dist) * strength,
      };
    }

    if (currentMode === AnimationMode.DISSOLVING) {
      // Scatter from text positions (creates directional explosion effect)
      if (p.targetX === undefined || p.targetY === undefined) {
        return { fx: 0, fy: 0 };
      }

      const dx = p.x - p.targetX;
      const dy = p.y - p.targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) {
        // Already at target: push in random direction
        const angle = Math.random() * Math.PI * 2;
        return {
          fx: Math.cos(angle) * 6000,
          fy: Math.sin(angle) * 6000,
        };
      }

      const progress = elapsed / TIMING.dissolving;
      const strength = 6000 * Math.max(0, 1 - progress);

      return {
        fx: (dx / dist) * strength,
        fy: (dy / dist) * strength,
      };
    }

    return { fx: 0, fy: 0 };
  };

  /**
   * Calculate particle life forces (attraction/repulsion from nearby particles)
   * @param strength - Multiplier for blending with other forces (0-1)
   */
  const getParticleLifeForce = (p: ParticleLife, strength: number): { fx: number; fy: number } => {
    if (strength <= 0) return { fx: 0, fy: 0 };

    let totalFx = 0;
    let totalFy = 0;

    forEachNearbyParticle(p, (other) => {
      if (other === p) return;
      const { fx, fy } = calculateForce(p, other);
      totalFx += fx;
      totalFy += fy;
    });

    return { fx: totalFx * strength, fy: totalFy * strength };
  };

  /**
   * Calculate text formation force (attraction to target position)
   * @param strength - 0 during particle life, ramps up during FORMING, 1 during HOLDING
   */
  const getFormationForce = (p: ParticleLife, strength: number): { fx: number; fy: number } => {
    if (strength <= 0 || p.targetX === undefined || p.targetY === undefined) {
      return { fx: 0, fy: 0 };
    }

    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 1) return { fx: 0, fy: 0 };

    const speedMultiplier = p.formationSpeed || 1.0;
    const attractionForce = 2500 * strength * speedMultiplier;

    return {
      fx: (dx / dist) * attractionForce,
      fy: (dy / dist) * attractionForce,
    };
  };

  /**
   * Calculate mouse/touch repulsion force
   * Only active during PARTICLE_LIFE mode to avoid interfering with text formation
   */
  const getMouseRepulsionForce = (p: ParticleLife): { fx: number; fy: number } => {
    if (!isMouseActive || mouseX === null || mouseY === null || currentMode !== AnimationMode.PARTICLE_LIFE) {
      return { fx: 0, fy: 0 };
    }

    const dx = p.x - mouseX;
    const dy = p.y - mouseY;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist > MOUSE_REPULSION_RANGE || dist < 0.1) {
      return { fx: 0, fy: 0 };
    }

    // Quadratic falloff: stronger repulsion when closer
    const falloff = 1 - (dist / MOUSE_REPULSION_RANGE);
    const forceMagnitude = MOUSE_REPULSION_STRENGTH * falloff * falloff;

    return {
      fx: (dx / dist) * forceMagnitude,
      fy: (dy / dist) * forceMagnitude,
    };
  };


  // =============================================================================
  // Physics Update Loop
  // =============================================================================

  /**
   * Update a single particle's physics for one frame
   *
   * Combines multiple forces based on current animation mode:
   * - Particle life forces (neighbor interactions)
   * - Explosion forces (mode-specific)
   * - Formation forces (text attraction)
   * - Mouse repulsion forces
   *
   * Then applies friction, velocity cap, and position update with edge wrapping.
   */
  const updateParticle = (p: ParticleLife, dt: number, now: number) => {
    let totalFx = 0;
    let totalFy = 0;

    const elapsed = getModeElapsedTime(now);
    const forces = modeForces[currentMode];
    const formationStrength = forces.formation(elapsed);
    const particleLifeStrength = forces.particleLife(elapsed, formationStrength);

    // 1. Particle life force (attraction/repulsion from neighbors)
    if (particleLifeStrength > 0) {
      const { fx, fy } = getParticleLifeForce(p, particleLifeStrength);
      totalFx += fx;
      totalFy += fy;
    }

    // 2. Explosion force (radial burst)
    if (forces.explosion) {
      const explosionForce = getExplosionForce(p, elapsed);
      totalFx += explosionForce.fx;
      totalFy += explosionForce.fy;
    }

    // 3. Formation force (attraction to text position)
    if (formationStrength > 0) {
      const formationForce = getFormationForce(p, formationStrength);
      totalFx += formationForce.fx;
      totalFy += formationForce.fy;
    }

    // 4. Mouse/touch repulsion force
    const mouseForce = getMouseRepulsionForce(p);
    totalFx += mouseForce.fx;
    totalFy += mouseForce.fy;

    // Apply total force to velocity (F = ma, mass = 1)
    p.vx += totalFx * dt;
    p.vy += totalFy * dt;

    // Apply friction (damping)
    p.vx *= FRICTION;
    p.vy *= FRICTION;

    // Clamp velocity to maximum speed
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      p.vx *= scale;
      p.vy *= scale;
    }

    // Update position
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Toroidal wrapping: particles exiting one edge appear on opposite edge
    if (p.x < 0) p.x += simWidth;
    if (p.x > simWidth) p.x -= simWidth;
    if (p.y < 0) p.y += simHeight;
    if (p.y > simHeight) p.y -= simHeight;
  };

  // =============================================================================
  // Rendering
  // =============================================================================

  /**
   * Draw a single particle as a colored circle
   */
  const drawParticle = (p: ParticleLife, now: number) => {
    let drawX = p.x;
    let drawY = p.y;

    // Add subtle jitter during first message hold
    if (currentMode === AnimationMode.HOLDING && isFirstMessage) {
      const elapsed = getModeElapsedTime(now);
      if (elapsed > 1.0) {
        const adjustedElapsed = elapsed - 1.0;
        const adjustedDuration = TIMING.holdingFirst - 1.0;
        const progress = Math.min(1, adjustedElapsed / adjustedDuration);
        const jitterStrength = progress * progress * 2; // Max 2px offset

        // Use target position as seed for consistent jitter per particle
        const seedX = p.targetX || p.x;
        const seedY = p.targetY || p.y;
        const seed = Math.abs(Math.sin(seedX * 12.9898 + seedY * 78.233));
        const time = adjustedElapsed * (3 + seed * 2);

        drawX += Math.sin(time * 5) * jitterStrength;
        drawY += Math.cos(time * 7) * jitterStrength;
      }
    }

    const color = COLORS[p.type];
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.beginPath();
    ctx.arc(drawX, drawY, PARTICLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  };

  // =============================================================================
  // Main Animation Loop
  // =============================================================================

  /**
   * Main render loop - runs every frame via requestAnimationFrame
   *
   * 1. Handle pause/resume
   * 2. Check for mode transitions
   * 3. Clear canvas
   * 4. Build spatial grid
   * 5. Update all particles
   * 6. Draw all particles
   */
  const render = (now: DOMHighResTimeStamp) => {

    if (document.hidden) {
      if (!isPaused) {
        isPaused = true;
        lastPauseStart = now;
      }
      animationId = requestAnimationFrame(render);
      return;
    }

    // If we were paused and now resuming, accumulate the paused time
    if (isPaused) {
      const pausedDuration = now - lastPauseStart;
      pausedTime += pausedDuration;
      modeStartTime += pausedDuration;
      animationStartTime += pausedDuration;
      lastTime += pausedDuration;
      isPaused = false;
    }

    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    advanceMode(now);

    // Update balloon targets during balloon rising animation
    if (currentMode === AnimationMode.BALLOON_RISING) {
      const elapsed = getModeElapsedTime(now);
      updateBalloonTargets(elapsed);
    }

    ctx.clearRect(0, 0, simWidth, simHeight);

    buildGrid();

    for (const p of particles) {
      updateParticle(p, dt, now);
    }

    for (const p of particles) {
      drawParticle(p, now);
    }

    animationId = requestAnimationFrame(render);
  };

  // =============================================================================
  // Public API
  // =============================================================================

  /**
   * Track mouse position in canvas coordinates
   */
  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (simWidth / rect.width);
    mouseY = (e.clientY - rect.top) * (simHeight / rect.height);
    isMouseActive = true;
  };

  const handleMouseLeave = () => {
    isMouseActive = false;
    mouseX = null;
    mouseY = null;
  };

  /**
   * Track touch position in canvas coordinates
   * Only during PARTICLE_LIFE to avoid interfering with scroll gestures
   */
  const handleTouchMove = (e: TouchEvent) => {
    if (currentMode === AnimationMode.PARTICLE_LIFE && e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      mouseX = (touch.clientX - rect.left) * (simWidth / rect.width);
      mouseY = (touch.clientY - rect.top) * (simHeight / rect.height);
      isMouseActive = true;
    }
  };

  const handleTouchEnd = () => {
    isMouseActive = false;
    mouseX = null;
    mouseY = null;
  };

  /**
   * Handle page visibility changes to pause/resume animation timing
   * Note: We need performance.now() here since this runs outside RAF callback
   */
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Tab hidden - mark as paused and record when
      isPaused = true;
      lastPauseStart = performance.now();
    }
    // When tab becomes visible again, the render loop will handle resuming
  };

  /**
   * Start the particle system
   *
   * 1. Set up event listeners for mouse/touch interaction
   * 2. Generate first message text targets
   * 3. Spawn particles at target positions (starts in formed text state)
   * 4. Enter HOLDING mode for first message
   * 5. Start animation loop
   */
  const start = () => {
    // Set up interaction handlers first
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Wait for layout to settle before measuring canvas and generating text
    requestAnimationFrame(() => {
      resize();

      // Double-check we have valid dimensions
      if (simWidth === 0 || simHeight === 0) {
        // Try one more time after another frame
        requestAnimationFrame(() => {
          resize();
          initializeParticles();
        });
      } else {
        initializeParticles();
      }
    });
  };

  const initializeParticles = () => {
    // Generate first message
    generateTextTargets(MESSAGES[0]);

    particles.length = 0;
    if (textTargets.length === 0) return;

    // Use fewer particles on mobile for better performance
    const isMobile = simWidth < 768;
    const baseCount = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT;

    // Ensure good text density: use base count or 1.2x target count
    const particleCount = Math.max(baseCount, textTargets.length * 1.2);

    // Spawn particles already in text formation (first message shows immediately)
    for (let i = 0; i < particleCount; i++) {
      const target = textTargets[i % textTargets.length];
      const p = spawnParticle(target.type);
      p.x = target.x;
      p.y = target.y;
      p.vx = 0;
      p.vy = 0;
      p.targetX = target.x;
      p.targetY = target.y;
      p.formationSpeed = 0.5 + Math.random();
      particles.push(p);
    }

    // Start in HOLDING mode showing first message
    // Note: Need performance.now() here to initialize timing before first RAF callback
    const now = performance.now();
    lastTime = now;
    animationStartTime = now; // Track when entire animation begins
    currentMessageIndex = 0;
    isFirstMessage = true;
    enterMode(AnimationMode.HOLDING, now);

    requestAnimationFrame(render);
  };

  /**
   * Stop the particle system and clean up
   */
  const stop = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Clean up event listeners
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    canvas.removeEventListener('touchcancel', handleTouchEnd);
    document.removeEventListener('visibilitychange', handleVisibilityChange);

    ctx.clearRect(0, 0, simWidth, simHeight);
  };

  /**
   * Get current overall progress (0-1) across all 7 messages
   * Progress reaches 1.0 (100%) right after "Enjoy!" finishes HOLDING
   */
  const getElapsedMs = (now: DOMHighResTimeStamp): number => {
    const currentPausedTime = isPaused ? (pausedTime + (now - lastPauseStart)) : pausedTime;
    return now - animationStartTime - currentPausedTime;
  };

  const getTotalDurationMs = (): number => {
    // Duration until "Enjoy!" finishes holding (when arrow should be fully white)
    // Message 0: HOLDING (3s) + DISSOLVING (2s) + PARTICLE_LIFE (10s) + FORMING (3s) = 18s
    // Messages 1-3: 3 × (HOLDING 8s + DISSOLVING 2s + PARTICLE_LIFE 10s + FORMING 3s) = 69s
    // Message 4 (creative): HOLDING (3s) + BALLOON_RISING (4s) + DISSOLVING (2s) + PARTICLE_LIFE (10s) + FORMING (3s) = 22s
    // Message 5: HOLDING (8s) + DISSOLVING (2s) + PARTICLE_LIFE (10s) + FORMING (3s) = 23s
    // Message 6 (Enjoy!): HOLDING (8s)
    // Total: 18 + 69 + 22 + 23 + 8 = 140s
    const firstMessageCycle = TIMING.holdingFirst + TIMING.dissolving + TIMING.particleLife + TIMING.forming;
    const normalMessageCycle = TIMING.holding + TIMING.dissolving + TIMING.particleLife + TIMING.forming;
    const creativeMessageCycle = TIMING.holdingCreative + TIMING.balloonRising + TIMING.dissolving + TIMING.particleLife + TIMING.forming;

    // Messages 0, then 1-3 (normal), then 4 (creative), then 5 (normal), then 6 (just holding)
    const untilEnjoy = firstMessageCycle + normalMessageCycle * 3 + creativeMessageCycle + normalMessageCycle;
    return (untilEnjoy + TIMING.holding) * 1000;
  };

  const getProgress = (now: DOMHighResTimeStamp): number => {
    const totalDuration = getTotalDurationMs();
    return Math.min(1, getElapsedMs(now) / totalDuration);
  };

  const isReady = (now: DOMHighResTimeStamp): boolean => {
    return getElapsedMs(now) >= getTotalDurationMs();
  };

  return { start, stop, resize, getProgress, isReady };
}
