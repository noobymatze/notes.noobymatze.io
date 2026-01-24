/**
 * Particle Life System
 *
 * An artificial life simulation where particles interact based on attraction/repulsion rules,
 * creating emergent organic behaviors. The system cycles through introduction messages, then
 * enters an infinite particle life mode with evolving behavior patterns.
 *
 * ## Animation Flow:
 *
 * 1. **Introduction Sequence** (one-time, ~90s total):
 *    - HOLDING (3s): Show first message "Hi there, I am Matthias"
 *    - DISSOLVING (2s) → PARTICLE_LIFE (10s) → FORMING (3s)
 *    - HOLDING (8s): Show "a software developer"
 *    - ... repeats for all 7 introduction messages ...
 *
 * 2. **Infinite Particle Life** (after all messages shown):
 *    - PARTICLE_LIFE mode runs forever (15s cycles)
 *    - New attraction matrix generated every 15s for variety
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


// Animation timing (in seconds)
const EXPLOSION_DURATION = 2;      // Initial burst from center (unused - starts in HOLDING)
const PARTICLE_LIFE_DURATION = 10; // Chaotic particle life between messages (or infinite after all messages)
const FORMING_DURATION = 3;        // Particles transitioning to form text
const HOLDING_DURATION = 8;        // Particles holding text shape (3s for first message)
const DISSOLVE_DURATION = 2;       // Text dissolving back to chaos

// Introduction messages (shown once in sequence)
const MESSAGES = [
  "Hi there,\nI am Matthias",
  "a software\ndeveloper",
  "a bikepacker\n🚲",
  "who likes\nBadminton 🏸",
  "and creative\nthings.",
  "These are\nmy notes.",
  "Enjoy!"
];

// Text rendering constants
const LETTER_SPACING = 40;        // Horizontal spacing between characters (unused - relies on font kerning)
const TEXT_SAMPLE_DENSITY = 3;    // Default pixel spacing between samples (overridden by responsive density)

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
  let lastTime = performance.now();

  // Animation state
  let currentMode: AnimationMode = AnimationMode.EXPLOSION;
  let modeStartTime = 0;
  let textTargets: Array<{ x: number; y: number; type: number }> = [];
  let imageTargets: Array<{ x: number; y: number; type: number }> = [];
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
        return EXPLOSION_DURATION;
      case AnimationMode.PARTICLE_LIFE:
        return PARTICLE_LIFE_DURATION;
      case AnimationMode.FORMING:
        return FORMING_DURATION;
      case AnimationMode.HOLDING:
        return isFirstMessage ? 3 : HOLDING_DURATION;
      case AnimationMode.DISSOLVING:
        return DISSOLVE_DURATION;
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
   */
  const enterMode = (mode: AnimationMode, now: number) => {
    currentMode = mode;
    modeStartTime = now;

    if (mode === AnimationMode.FORMING) {
      generateTextTargets(MESSAGES[currentMessageIndex]);
      assignTargetsToParticles();
    }

    if (mode === AnimationMode.PARTICLE_LIFE && currentMessageIndex < MESSAGES.length) {
      // New behavior profile per message cycle (before final state)
      attractionMatrix = generateAttractionMatrix();
    }
  };

  /**
   * Check if current mode should advance and transition to next mode
   *
   * Flow logic:
   * - Messages 0-6: HOLDING → DISSOLVING → PARTICLE_LIFE → FORMING → HOLDING (next message)
   * - After message 6: DISSOLVING → PARTICLE_LIFE (infinite with matrix regeneration every 15s)
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
          // Still have messages to show
          nextMode = AnimationMode.FORMING;
        } else {
          // All messages shown - stay in particle life forever
          // Generate new matrix every 15s for evolving behavior
          attractionMatrix = generateAttractionMatrix();
          modeStartTime = now;
        }
        break;
      case AnimationMode.FORMING:
        nextMode = AnimationMode.HOLDING;
        break;
      case AnimationMode.HOLDING:
        nextMode = AnimationMode.DISSOLVING;
        isFirstMessage = false;
        break;
      case AnimationMode.DISSOLVING:
        currentMessageIndex = currentMessageIndex + 1;
        nextMode = AnimationMode.PARTICLE_LIFE;
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
   * @returns Force vector {fx, fy} to apply to p1
   */
  const calculateForce = (p1: ParticleLife, p2: ParticleLife): { fx: number; fy: number } => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < 0.01) return { fx: 0, fy: 0 };

    const dist = Math.sqrt(distSq);

    // REPULSION: Very close particles always repel (prevents clustering/overlap)
    if (dist < REPULSION_RANGE) {
      const repulsionForce = (REPULSION_RANGE - dist) / REPULSION_RANGE * 50;
      return {
        fx: -(dx / dist) * repulsionForce,
        fy: -(dy / dist) * repulsionForce,
      };
    }

    // Beyond interaction range: no force
    if (dist > FORCE_RANGE) return { fx: 0, fy: 0 };

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
   */
  const assignTargetsToParticles = (targets: Array<{ x: number; y: number; type: number }> = textTargets) => {
    if (targets.length === 0) return;

    // Assign targets to particles (reuse targets if more particles than targets)
    for (let i = 0; i < particles.length; i++) {
      const target = targets[i % targets.length];
      particles[i].targetX = target.x;
      particles[i].targetY = target.y;
      particles[i].type = target.type;
      // Assign random speed for organic formation (0.5x to 1.5x base speed)
      particles[i].formationSpeed = 0.5 + Math.random();
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
        const formProgress = elapsed / FORMING_DURATION;
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
    [AnimationMode.DISSOLVING]: {
      formation: (elapsed) => Math.max(0, 1 - elapsed / DISSOLVE_DURATION),
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

      const progress = elapsed / EXPLOSION_DURATION;
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

      const progress = elapsed / DISSOLVE_DURATION;
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
  const drawParticle = (p: ParticleLife) => {
    const color = COLORS[p.type];
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  };

  // =============================================================================
  // Main Animation Loop
  // =============================================================================

  /**
   * Main render loop - runs every frame via requestAnimationFrame
   *
   * 1. Check for mode transitions
   * 2. Clear canvas
   * 3. Build spatial grid
   * 4. Update all particles
   * 5. Draw all particles
   */
  const render = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    advanceMode(now);

    ctx.clearRect(0, 0, simWidth, simHeight);

    buildGrid();

    for (const p of particles) {
      updateParticle(p, dt, now);
    }

    for (const p of particles) {
      drawParticle(p);
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
    const now = performance.now();
    lastTime = now;
    currentMessageIndex = 0;
    isFirstMessage = true;
    enterMode(AnimationMode.HOLDING, now);

    render();
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

    ctx.clearRect(0, 0, simWidth, simHeight);
  };

  /**
   * Get current progress information for progress bar
   * Maps to 7 segments (one per message):
   * - Segment 0: Message 0 (HOLDING + DISSOLVING + PARTICLE_LIFE + FORMING)
   * - Segment 1: Message 1 (HOLDING + DISSOLVING + PARTICLE_LIFE + FORMING)
   * ...
   * - Segment 6: Message 6 (HOLDING + DISSOLVING only)
   */
  const getProgress = (): { segmentIndex: number; progress: number } => {
    const now = performance.now();
    const elapsed = getModeElapsedTime(now);

    // If we're past all messages (infinite particle life mode), return completed state
    if (currentMessageIndex >= MESSAGES.length) {
      return {
        segmentIndex: MESSAGES.length - 1,
        progress: 1,
      };
    }

    // Note: currentMessageIndex increments after DISSOLVING, so during PARTICLE_LIFE/FORMING
    // we need to use the previous message index
    let segmentIndex: number;
    if (currentMode === AnimationMode.PARTICLE_LIFE || currentMode === AnimationMode.FORMING) {
      segmentIndex = currentMessageIndex - 1;
    } else {
      segmentIndex = currentMessageIndex;
    }

    // Calculate total duration for all phases of a message
    const holdDuration = getModeDuration(AnimationMode.HOLDING) || 0;
    const dissolveDuration = getModeDuration(AnimationMode.DISSOLVING) || 0;
    const particleDuration = getModeDuration(AnimationMode.PARTICLE_LIFE) || 0;
    const formingDuration = getModeDuration(AnimationMode.FORMING) || 0;

    const totalDuration = holdDuration + dissolveDuration + particleDuration + formingDuration;

    let segmentProgress: number;

    if (currentMode === AnimationMode.HOLDING) {
      segmentProgress = elapsed / totalDuration;
    } else if (currentMode === AnimationMode.DISSOLVING) {
      segmentProgress = (holdDuration + elapsed) / totalDuration;
    } else if (currentMode === AnimationMode.PARTICLE_LIFE) {
      segmentProgress = (holdDuration + dissolveDuration + elapsed) / totalDuration;
    } else {
      // FORMING
      segmentProgress = (holdDuration + dissolveDuration + particleDuration + elapsed) / totalDuration;
    }

    return {
      segmentIndex: Math.max(0, segmentIndex),
      progress: Math.min(1, segmentProgress),
    };
  };

  return { start, stop, resize, getProgress };
}
