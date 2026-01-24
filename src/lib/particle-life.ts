/**
 * Particle Life System
 *
 * This is an artificial life simulation where particles interact with each other
 * based on attraction/repulsion rules, creating emergent organic behaviors.
 *
 * ## Core Concepts:
 *
 * 1. **Particle Life Physics**
 *    - Each particle has a "type" (color - 12 vibrant colors)
 *    - Different types attract or repel each other based on an attraction matrix
 *    - Example: Red particles might be attracted to blue, but repelled by green
 *    - This creates emergent behaviors: chasing, fleeing, clustering, orbiting, planets
 *    - Matrix is regenerated each cycle for variety
 *
 * 2. **Cyclical Animation Modes**
 *    - EXPLOSION (2s): Particles burst outward from center
 *    - PARTICLE_LIFE (15s): Full particle life physics with organic interactions
 *    - FORMING (3s): Smooth transition as particles move to form text
 *    - HOLDING (15s): Particles hold text formation
 *    - DISSOLVING (2s): Particles explode outward from text positions
 *    - Cycle repeats with different messages: "Welcome", "Awesome right?", "Have fun!"
 *
 * 3. **Text Formation System**
 *    - Uses canvas text rendering to generate target positions
 *    - Renders text using Pacifico font (matching hero section)
 *    - Each particle assigned a random speed (0.5x-1.5x) for organic arrival
 *    - Particles smoothly transition from chaos to formation via blended forces
 *
 * 4. **Performance Optimizations**
 *    - Spatial Partitioning: Canvas divided into grid cells (80×80px)
 *    - Each particle only checks neighbors in nearby cells (3×3 grid)
 *    - Reduces checks from O(n²) to ~O(n), ~10x performance improvement
 *    - Much better battery efficiency
 *
 * ## Physics Formula:
 *
 * For each particle, we calculate:
 *   1. Build spatial grid to organize particles by position
 *   2. Get nearby particles from surrounding cells (not all particles)
 *   3. For each nearby particle: calculate distance d = √(dx² + dy²)
 *   4. Look up attraction coefficient from matrix based on particle types
 *   5. Apply force: F = attraction × (1 - d/range) × strength
 *   6. Sum all forces: F_total = Σ F_i
 *   7. Update velocity: v = v + F × dt (with friction and max speed cap)
 *   8. Update position: pos = pos + v × dt
 *   9. Wrap around edges (toroidal topology)
 */

// =============================================================================
// Types
// =============================================================================

export interface ParticleLife {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: number; // Color type (0-5 for rainbow colors)
  targetX?: number; // Image formation target position
  targetY?: number;
  formationSpeed?: number; // Individual speed multiplier for text formation (0.5-1.5)
  attractionProfile?: number[]; // Individual particle's attraction to each type (per-particle matrix row)
}


// =============================================================================
// Constants
// =============================================================================

// Particle types and their colors (rainbow + extras from Tailwind)
const PARTICLE_TYPES = 12;
const COLORS = [
  { r: 239, g: 68, b: 68 },     // red-500
  { r: 251, g: 146, b: 60 },    // orange-500
  { r: 234, g: 179, b: 8 },     // yellow-500
  { r: 132, g: 204, b: 22 },    // lime-500
  { r: 34, g: 197, b: 94 },     // green-500
  { r: 16, g: 185, b: 129 },    // emerald-500
  { r: 20, g: 184, b: 166 },    // teal-500
  { r: 6, g: 182, b: 212 },     // cyan-500
  { r: 59, g: 130, b: 246 },    // blue-500
  { r: 99, g: 102, b: 241 },    // indigo-500
  { r: 168, g: 85, b: 247 },    // purple-500
  { r: 236, g: 72, b: 153 },    // pink-500
];

// Physics constants
const FORCE_RANGE = 80;        // How far particles can "sense" each other
const FRICTION = 0.88;         // Velocity damping (0-1, higher = slower)
const MAX_FORCE = 180;         // Maximum force magnitude for particle life (reduced for gentler movement)
const MAX_SPEED = 150;         // Maximum velocity (consistent across all modes)
const REPULSION_RANGE = 8;     // Very close particles always repel (prevents overlap)
const PARTICLE_COUNT = 2000;   // Initial particle count
const PARTICLE_RADIUS = 1.5;   // Visual size of particles

// Spatial partitioning - divide canvas into grid for faster neighbor lookups
const CELL_SIZE = FORCE_RANGE;  // Cell size = force range (particles only interact within range)


// Text formation cycle timing
const EXPLOSION_DURATION = 2;     // Initial explosion duration
const PARTICLE_LIFE_DURATION = 10; // Pure particle life chaos
const FORMING_DURATION = 3;       // Transition to text formation
const HOLDING_DURATION = 8;       // Hold text shape
const DISSOLVE_DURATION = 2;      // Dissolve/explode back to chaos

// Messages to cycle through
const MESSAGES = [
  "Hi there,\nI am Matthias",
  "a software developer",
  "a bikepacker 🚲",
  "who likes Badminton 🏸",
  "and creative things.",
  "These are my notes.",
  "Enjoy!"
];

// Text formation constants
const LETTER_SPACING = 40;        // Horizontal spacing between characters
const LETTER_HEIGHT = 60;         // Height of text
const TEXT_SAMPLE_DENSITY = 3;    // Pixels between samples in text

// Animation mode enum
enum AnimationMode {
  EXPLOSION = 'EXPLOSION',
  PARTICLE_LIFE = 'PARTICLE_LIFE',
  FORMING = 'FORMING',
  HOLDING = 'HOLDING',
  DISSOLVING = 'DISSOLVING',
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
  let currentMessageIndex = 0;
  let isFirstMessage = true;

  // Spatial partitioning grid
  let grid: Map<string, ParticleLife[]> = new Map();
  let gridCols = 0;
  let gridRows = 0;

  // Generate random attraction matrix
  // This creates the "personality" of the particle system
  // Each cell [i][j] determines how type i feels about type j
  // Positive = attraction, negative = repulsion
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
  // Utility Functions
  // =============================================================================

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Recalculate grid dimensions
    gridCols = Math.ceil(canvas.width / CELL_SIZE);
    gridRows = Math.ceil(canvas.height / CELL_SIZE);
  };


  // Get current elapsed time in the current mode
  const getModeElapsedTime = (now: number): number => {
    return (now - modeStartTime) / 1000;
  };

  // Check if we should transition to the next mode
  const checkModeTransition = (now: number) => {
    const elapsed = getModeElapsedTime(now);
    let shouldTransition = false;
    let nextMode: AnimationMode | null = null;

    switch (currentMode) {
      case AnimationMode.EXPLOSION:
        if (elapsed >= EXPLOSION_DURATION) {
          shouldTransition = true;
          nextMode = AnimationMode.PARTICLE_LIFE;
        }
        break;
      case AnimationMode.PARTICLE_LIFE:
        // Only transition to next message if we haven't shown all messages yet
        if (elapsed >= PARTICLE_LIFE_DURATION && currentMessageIndex < MESSAGES.length - 1) {
          shouldTransition = true;
          nextMode = AnimationMode.FORMING;
        }
        // If we've shown all messages, stay in particle life forever (no transition)
        break;
      case AnimationMode.FORMING:
        if (elapsed >= FORMING_DURATION) {
          shouldTransition = true;
          nextMode = AnimationMode.HOLDING;
        }
        break;
      case AnimationMode.HOLDING:
        // Shorter duration for first message, normal duration for others
        const holdDuration = isFirstMessage ? 3 : HOLDING_DURATION;
        if (elapsed >= holdDuration) {
          shouldTransition = true;
          nextMode = AnimationMode.DISSOLVING;
          isFirstMessage = false;
        }
        break;
      case AnimationMode.DISSOLVING:
        if (elapsed >= DISSOLVE_DURATION) {
          // Check if we've shown all messages
          if (currentMessageIndex < MESSAGES.length - 1) {
            shouldTransition = true;
            nextMode = AnimationMode.PARTICLE_LIFE;
            currentMessageIndex = currentMessageIndex + 1;
          } else {
            // After last message, stay in particle life forever with one random matrix
            shouldTransition = true;
            nextMode = AnimationMode.PARTICLE_LIFE;
            // Generate one final random preset matrix for endless particle life
            attractionMatrix = generateAttractionMatrix();
          }
        }
        break;
    }

    if (shouldTransition && nextMode) {
      currentMode = nextMode;
      modeStartTime = now;

      // When entering FORMING mode, generate text targets
      if (currentMode === AnimationMode.FORMING) {
        generateTextTargets(MESSAGES[currentMessageIndex]);
        assignTargetsToParticles();
      }

      // When transitioning back to PARTICLE_LIFE (before final message), generate new attraction matrix
      if (currentMode === AnimationMode.PARTICLE_LIFE && currentMessageIndex < MESSAGES.length - 1) {
        attractionMatrix = generateAttractionMatrix();
      }
    }
  };

  // =============================================================================
  // Particle Creation
  // =============================================================================

  // Create a random particle
  const spawnParticle = (type?: number): ParticleLife => {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;

    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      type: type !== undefined ? type : Math.floor(Math.random() * PARTICLE_TYPES),
    };
  };


  // =============================================================================
  // Spatial Partitioning
  // =============================================================================

  // Build spatial grid for fast neighbor lookups
  const buildGrid = () => {
    grid.clear();

    for (const p of particles) {
      const cellX = Math.floor(p.x / CELL_SIZE);
      const cellY = Math.floor(p.y / CELL_SIZE);
      const key = `${cellX},${cellY}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(p);
    }
  };

  // Get all particles in neighboring cells (including particle's own cell)
  const getNearbyParticles = (p: ParticleLife): ParticleLife[] => {
    const cellX = Math.floor(p.x / CELL_SIZE);
    const cellY = Math.floor(p.y / CELL_SIZE);
    const nearby: ParticleLife[] = [];

    // Check 3x3 grid of cells around particle
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cellParticles = grid.get(key);
        if (cellParticles) {
          nearby.push(...cellParticles);
        }
      }
    }

    return nearby;
  };

  // =============================================================================
  // Force Calculations
  // =============================================================================

  // Calculate force between two particles based on attraction matrix
  // This is the CORE of particle life behavior!
  const calculateForce = (p1: ParticleLife, p2: ParticleLife): { fx: number; fy: number } => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < 0.01) return { fx: 0, fy: 0 };

    const dist = Math.sqrt(distSq);

    // STRONG REPULSION at very close range (prevents particles from overlapping)
    if (dist < REPULSION_RANGE) {
      const repulsionForce = (REPULSION_RANGE - dist) / REPULSION_RANGE * 50;
      return {
        fx: -(dx / dist) * repulsionForce,
        fy: -(dy / dist) * repulsionForce,
      };
    }

    // Outside force range, no interaction
    if (dist > FORCE_RANGE) return { fx: 0, fy: 0 };

    // Get attraction coefficient - use per-particle profile if available, otherwise global matrix
    let attraction: number;
    if (p1.attractionProfile) {
      // Each particle has its own unique attraction rules!
      attraction = p1.attractionProfile[p2.type];
    } else {
      // Use global matrix
      attraction = attractionMatrix[p1.type][p2.type];
    }

    // Force calculation with smooth linear falloff
    // Formula: force = attraction × (1 - distance/range) × strength
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

  // Generate target positions by rendering text to an offscreen canvas
  const generateTextTargets = (text: string) => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Set up canvas for text rendering
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Configure text style (matching the hero font)
    tempCtx.font = `bold ${LETTER_HEIGHT}px "Pacifico", cursive`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = 'white';

    // Draw text centered on canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const lines = text.split('\n');
    const lineHeight = LETTER_HEIGHT * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = centerY - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      tempCtx.fillText(line, centerX, startY + i * lineHeight);
    });

    // Sample pixels from the text
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const samples: Array<{ x: number; y: number; type: number }> = [];

    for (let y = 0; y < tempCanvas.height; y += TEXT_SAMPLE_DENSITY) {
      for (let x = 0; x < tempCanvas.width; x += TEXT_SAMPLE_DENSITY) {
        const idx = (y * tempCanvas.width + x) * 4;
        const alpha = imageData.data[idx + 3];

        // If pixel is part of the text (has alpha > 0)
        if (alpha > 128) {
          // Assign random particle type for colorful text
          const type = Math.floor(Math.random() * PARTICLE_TYPES);
          samples.push({ x, y, type });
        }
      }
    }

    textTargets = samples;
  };

  // Assign text target positions to particles
  const assignTargetsToParticles = () => {
    if (textTargets.length === 0) return;

    // Shuffle targets to avoid clustering
    const shuffledTargets = [...textTargets].sort(() => Math.random() - 0.5);

    // Assign targets to particles (reuse targets if more particles than targets)
    for (let i = 0; i < particles.length; i++) {
      const target = shuffledTargets[i % shuffledTargets.length];
      particles[i].targetX = target.x;
      particles[i].targetY = target.y;
      // Assign random speed for organic formation (0.5x to 1.5x base speed)
      particles[i].formationSpeed = 0.5 + Math.random();
    }
  };

  // =============================================================================
  // Image Formation (WIP - Currently Debugging)
  // =============================================================================

  // Sample the profile image to get target positions for particles
  // Goal: Extract pixel positions and colors from the circular profile photo
  // Problem: Currently only getting ~9 samples due to transparency
  const sampleImageTargets = async (imgElement: HTMLImageElement) => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      return;
    }

    const rect = imgElement.getBoundingClientRect();
    const targetWidth = rect.width;
    const targetHeight = rect.height;

    tempCanvas.width = imgElement.naturalWidth;
    tempCanvas.height = imgElement.naturalHeight;

    tempCtx.drawImage(imgElement, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const samples: Array<{ x: number; y: number; type: number }> = [];

    // Sample every 2nd pixel for better coverage
    const sampleRate = 2;

    for (let y = 0; y < tempCanvas.height; y += sampleRate) {
      for (let x = 0; x < tempCanvas.width; x += sampleRate) {
        const idx = (y * tempCanvas.width + x) * 4;
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const b = imageData.data[idx + 2];
        const a = imageData.data[idx + 3];

        // Only sample visible pixels (lower threshold for semi-transparent edges)
        if (a > 50) {
          // Map to screen coordinates
          const screenX = rect.left + (x / tempCanvas.width) * targetWidth;
          const screenY = rect.top + (y / tempCanvas.height) * targetHeight;

          // Find closest particle color type
          let closestType = 0;
          let minDist = Infinity;
          for (let i = 0; i < PARTICLE_TYPES; i++) {
            const color = COLORS[i];
            const dist = Math.abs(r - color.r) + Math.abs(g - color.g) + Math.abs(b - color.b);
            if (dist < minDist) {
              minDist = dist;
              closestType = i;
            }
          }

          samples.push({ x: screenX, y: screenY, type: closestType });
        }
      }
    }

    imageTargets = samples;
  };


  // Get formation strength based on current mode
  // Returns 0-1 value indicating how much particles should be pulled toward their targets
  const getFormationStrength = (now: number): number => {
    const elapsed = getModeElapsedTime(now);

    switch (currentMode) {
      case AnimationMode.EXPLOSION:
      case AnimationMode.PARTICLE_LIFE:
        return 0; // No formation attraction

      case AnimationMode.FORMING:
        // Smooth ease-in to formation
        const formProgress = elapsed / FORMING_DURATION;
        return Math.min(1, formProgress * formProgress); // Quadratic ease-in

      case AnimationMode.HOLDING:
        return 1; // Full strength to hold formation

      case AnimationMode.DISSOLVING:
        // Smooth ease-out from formation
        const dissolveProgress = elapsed / DISSOLVE_DURATION;
        return Math.max(0, 1 - dissolveProgress);

      default:
        return 0;
    }
  };

  // Get explosion force based on current mode
  const getExplosionForce = (p: ParticleLife, now: number): { fx: number; fy: number } => {
    if (currentMode !== AnimationMode.EXPLOSION && currentMode !== AnimationMode.DISSOLVING) {
      return { fx: 0, fy: 0 };
    }

    const elapsed = getModeElapsedTime(now);

    let strength = 0;
    if (currentMode === AnimationMode.EXPLOSION) {
      // Strong initial explosion from center that fades over time
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) return { fx: 0, fy: 0 };

      const progress = elapsed / EXPLOSION_DURATION;
      strength = 3000 * (1 - progress);

      return {
        fx: (dx / dist) * strength,
        fy: (dy / dist) * strength,
      };
    } else if (currentMode === AnimationMode.DISSOLVING) {
      // Particles explode away from their TARGET position (not center)
      // This makes them scatter in all directions from the text
      if (p.targetX === undefined || p.targetY === undefined) {
        return { fx: 0, fy: 0 };
      }

      const dx = p.x - p.targetX;
      const dy = p.y - p.targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) {
        // If already at target, push in random direction
        const angle = Math.random() * Math.PI * 2;
        return {
          fx: Math.cos(angle) * 6000,
          fy: Math.sin(angle) * 6000,
        };
      }

      const progress = elapsed / DISSOLVE_DURATION;
      strength = 6000 * Math.max(0, 1 - progress);

      return {
        fx: (dx / dist) * strength,
        fy: (dy / dist) * strength,
      };
    }

    return { fx: 0, fy: 0 };
  };


  // =============================================================================
  // Physics Update
  // =============================================================================

  // Update particle physics
  const updateParticle = (p: ParticleLife, dt: number, now: number) => {

    let totalFx = 0;
    let totalFy = 0;

    // Get formation strength first to determine which forces to apply
    const formationStrength = getFormationStrength(now);

    // Apply particle life forces (but blend them out as formation starts)
    // Use spatial partitioning to only check nearby particles
    if (currentMode === AnimationMode.PARTICLE_LIFE || currentMode === AnimationMode.EXPLOSION) {
      // Calculate forces from nearby particles only (spatial optimization)
      const nearbyParticles = getNearbyParticles(p);
      for (const other of nearbyParticles) {
        if (other === p) continue;

        const { fx, fy } = calculateForce(p, other);
        totalFx += fx;
        totalFy += fy;
      }
    } else if (currentMode === AnimationMode.FORMING) {
      // During FORMING, gradually reduce particle life forces
      const particleLifeStrength = 1 - formationStrength;
      const nearbyParticles = getNearbyParticles(p);
      for (const other of nearbyParticles) {
        if (other === p) continue;

        const { fx, fy } = calculateForce(p, other);
        totalFx += fx * particleLifeStrength;
        totalFy += fy * particleLifeStrength;
      }
    }

    // Add explosion force
    const explosionForce = getExplosionForce(p, now);
    totalFx += explosionForce.fx;
    totalFy += explosionForce.fy;

    // Add text formation force
    if (formationStrength > 0 && p.targetX !== undefined && p.targetY !== undefined && textTargets.length > 0) {
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        // Strong attraction to target position, scaled by formation strength and particle's individual speed
        const speedMultiplier = p.formationSpeed || 1.0;
        const attractionForce = 2500 * formationStrength * speedMultiplier;
        totalFx += (dx / dist) * attractionForce;
        totalFy += (dy / dist) * attractionForce;
      }
    }

    // Apply forces to velocity (F = ma, assuming m = 1)
    p.vx += totalFx * dt;
    p.vy += totalFy * dt;

    // Apply friction/damping
    p.vx *= FRICTION;
    p.vy *= FRICTION;

    // Cap speed to maximum (consistent across all modes)
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      p.vx *= scale;
      p.vy *= scale;
    }

    // Update position
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Wrap around edges (toroidal topology)
    // Particles that go off one edge appear on the opposite edge
    if (p.x < 0) p.x += canvas.width;
    if (p.x > canvas.width) p.x -= canvas.width;
    if (p.y < 0) p.y += canvas.height;
    if (p.y > canvas.height) p.y -= canvas.height;
  };

  // =============================================================================
  // Rendering
  // =============================================================================

  // Draw a particle
  const drawParticle = (p: ParticleLife) => {
    const color = COLORS[p.type];
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  };

  // =============================================================================
  // Main Loop
  // =============================================================================

  const render = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Check for mode transitions
    checkModeTransition(now);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Build spatial grid for this frame
    buildGrid();

    // Update all particles
    for (const p of particles) {
      updateParticle(p, dt, now);
    }

    // Draw all particles
    for (const p of particles) {
      drawParticle(p);
    }

    animationId = requestAnimationFrame(render);
  };

  // =============================================================================
  // Public API
  // =============================================================================

  const setImageTargets = async (imgElement: HTMLImageElement) => {
    await sampleImageTargets(imgElement);
    assignTargetsToParticles();
  };

  const start = () => {
    resize();

    // Generate the first message targets immediately
    generateTextTargets(MESSAGES[0]);

    // Spawn particles directly at their target positions
    particles.length = 0;
    if (textTargets.length === 0) return;

    const shuffledTargets = [...textTargets].sort(() => Math.random() - 0.5);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const target = shuffledTargets[i % shuffledTargets.length];
      const p = spawnParticle(target.type);
      // Start particles at their target position
      p.x = target.x;
      p.y = target.y;
      p.vx = 0;
      p.vy = 0;
      p.targetX = target.x;
      p.targetY = target.y;
      p.formationSpeed = 0.5 + Math.random();
      particles.push(p);
    }

    // Initialize animation state - start directly in HOLDING mode
    lastTime = performance.now();
    modeStartTime = performance.now();
    currentMode = AnimationMode.HOLDING;
    currentMessageIndex = 0;

    render();
  };

  const stop = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return { start, stop, resize, setImageTargets };
}
