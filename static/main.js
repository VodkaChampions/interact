(() => {
  const canvas = document.getElementById('bg-canvas');
  const anchor = document.getElementById('wheel-anchor');
  const lockup = document.getElementById('lockup');
  const lockupText = document.getElementById('lockup-text');
  if (!canvas || typeof THREE === 'undefined') return;

  // 1. Scene, Camera, Renderer Setup
  const scene = new THREE.Scene();
  // Warm atmospheric linear fog that keeps tunnel crisp near camera and gently fades far horizon
  scene.fog = new THREE.Fog(0xfceeda, 20.0, 40.0);

  // Near plane set to 0.005 so camera never slices through gear polygons during zoom
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.005, 1000);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  let visibleHeight = 2 * 6 * Math.tan((camera.fov * Math.PI) / 360);
  let worldPerPixel = visibleHeight / window.innerHeight;

  // 2. Lighting for 3D Gear
  const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.2);
  scene.add(ambientLight);

  const keyLight = new THREE.PointLight(0xffffff, 1.8, 50);
  keyLight.position.set(4, 3, 4);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x2563eb, 2.2, 50);
  fillLight.position.set(-3, -2, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
  rimLight.position.set(0, 4, -2);
  scene.add(rimLight);

  // 3. Build 3D Rotary Gear
  const teethCount = 24;
  const step = (Math.PI * 2) / teethCount;
  const gearShape = new THREE.Shape();
  const crownWidth = 0.16 * step;
  const valleyWidth = 0.36 * step;
  const tipRadius = 0.98;
  const valleyRadius = 0.835;

  for (let i = 0; i < teethCount; i++) {
    const mid = i * step;
    const a0 = mid - crownWidth;
    const a1 = mid + crownWidth;
    const a2 = mid + valleyWidth;
    const a3 = mid + step - valleyWidth;

    if (i === 0) {
      gearShape.moveTo(Math.cos(a0) * tipRadius, Math.sin(a0) * tipRadius);
    } else {
      gearShape.lineTo(Math.cos(a0) * tipRadius, Math.sin(a0) * tipRadius);
    }
    gearShape.lineTo(Math.cos(a1) * tipRadius, Math.sin(a1) * tipRadius);
    gearShape.lineTo(Math.cos(a2) * valleyRadius, Math.sin(a2) * valleyRadius);
    gearShape.lineTo(Math.cos(a3) * valleyRadius, Math.sin(a3) * valleyRadius);
  }
  gearShape.closePath();

  // 6 Spokes: clean non-intersecting paths with safe bevel clearance
  const hubRadius = 0.24;
  const rimRadius = 0.64;
  function createSpokeHole(centerAngle, spanAngle) {
    const spoke = new THREE.Path();
    const half = spanAngle / 2;
    spoke.absarc(0, 0, rimRadius, centerAngle - half, centerAngle + half, false);
    spoke.absarc(0, 0, hubRadius, centerAngle + half, centerAngle - half, true);
    spoke.closePath();
    return spoke;
  }
  for (let i = 0; i < 6; i++) {
    gearShape.holes.push(createSpokeHole(i * (Math.PI / 3), 0.68));
  }

  // Official Rotary Axle Center Hole with Iconic Keyway Notch
  const hubHole = new THREE.Path();
  const axleRadius = 0.125;
  const keywayW = 0.032;
  const keywayH = 0.180;
  const keywayAngle = Math.asin(keywayW / axleRadius);

  // Clean continuous clockwise path for the center axle & keyway notch
  hubHole.moveTo(keywayW, axleRadius * Math.cos(keywayAngle));
  hubHole.absarc(0, 0, axleRadius, Math.PI / 2 - keywayAngle, -Math.PI * 1.5 + keywayAngle, true);
  hubHole.lineTo(-keywayW, keywayH);
  hubHole.lineTo(keywayW, keywayH);
  hubHole.closePath();
  gearShape.holes.push(hubHole);

  // High-fidelity smooth geometry: proportional bevel prevents self-intersecting corner fins
  const gearGeometry = new THREE.ExtrudeGeometry(gearShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.010,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 54
  });
  gearGeometry.center();
  gearGeometry.computeVertexNormals();

  const gearMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a84d4,
    metalness: 0.45,
    roughness: 0.30,
    emissive: 0x063a66,
    emissiveIntensity: 0.18,
    flatShading: false,
    side: THREE.FrontSide
  });

  const gearGroup = new THREE.Group();
  const gearMesh = new THREE.Mesh(gearGeometry, gearMaterial);
  gearGroup.add(gearMesh);
  scene.add(gearGroup);

  // 4. Particle Field: Sparse & Calm at Home (420 particles) -> Dense in Tunnel (2,400 particles)
  const PARTICLE_COUNT = 2400;
  const REST_PARTICLE_COUNT = 420;
  const particleGeometry = new THREE.BufferGeometry();

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const basePositions = new Float32Array(PARTICLE_COUNT * 3);
  const mouseDisplacements = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const targetColors = new Float32Array(PARTICLE_COUNT * 3);

  // Phase offsets for gentle stationary floating on resting screen
  const phaseX = new Float32Array(PARTICLE_COUNT);
  const phaseY = new Float32Array(PARTICLE_COUNT);
  const phaseZ = new Float32Array(PARTICLE_COUNT);
  const driftSpeed = new Float32Array(PARTICLE_COUNT);

  // Normalized relative coordinate distribution for resting field
  const normX = new Float32Array(PARTICLE_COUNT);
  const normY = new Float32Array(PARTICLE_COUNT);
  const normZ = new Float32Array(PARTICLE_COUNT);

  // Tunnel configuration per particle:
  // Organic, starry cylindrical shell (2,400 particles randomly scattered along a hollow 3D cylinder)
  const TUNNEL_SPAN = 48.0;
  const tunnelBaseZ = new Float32Array(PARTICLE_COUNT);
  const tunnelAngle = new Float32Array(PARTICLE_COUNT);
  const tunnelRadius = new Float32Array(PARTICLE_COUNT);

  function configureBeaconParticle(pIdx, slotIndex) {
    if (pIdx >= PARTICLE_COUNT) return;
    // Deep in the tunnel: only comes up later after the tunnel is fully formed
    tunnelBaseZ[pIdx] = 18.0 + slotIndex * 7.5;
    tunnelRadius[pIdx] = 0.74;

    // 4 directional wall assignments matching inward facing orientation:
    // Slot 0 (Left wall: angle = PI) -> points right inward
    // Slot 1 (Right wall: angle = 0) -> points left inward
    // Slot 2 (Top wall: angle = PI/2) -> points down inward
    // Slot 3 (Bottom wall: angle = -PI/2) -> points up inward
    if (slotIndex % 4 === 0) {
      tunnelAngle[pIdx] = Math.PI; // left wall
    } else if (slotIndex % 4 === 1) {
      tunnelAngle[pIdx] = 0.0; // right wall
    } else if (slotIndex % 4 === 2) {
      tunnelAngle[pIdx] = Math.PI / 2; // top wall
    } else {
      tunnelAngle[pIdx] = -Math.PI / 2; // bottom wall
    }

    const p3 = pIdx * 3;
    if (slotIndex % 2 === 0) {
      targetColors[p3] = 0.12; targetColors[p3 + 1] = 0.58; targetColors[p3 + 2] = 0.98; // Electric Rotary Blue
    } else {
      targetColors[p3] = 0.96; targetColors[p3 + 1] = 0.72; targetColors[p3 + 2] = 0.18; // Radiant Rotary Gold
    }
  }

  const colorPalette = [
    new THREE.Color('#1c85d7'), // Primary Interact Blue
    new THREE.Color('#388ec9'), // Rich Sky Blue
    new THREE.Color('#2563eb'), // Deep Rotary Electric Blue
    new THREE.Color('#4d88b4'), // Slate Blue
    new THREE.Color('#78a8ca'), // Medium Soft Blue
    new THREE.Color('#9bbecf'), // Muted Blue Gray
    new THREE.Color('#d4b693'), // Subtle warm parchment speckle
    new THREE.Color('#e2a85c')  // Warm Rotary Gold sparkle
  ];

  const bgColor = new THREE.Color('#fceeda');

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    // Resting field distribution: only the first 420 particles are spread on the home screen
    if (i < REST_PARTICLE_COUNT) {
      normX[i] = Math.random() - 0.5;
      normY[i] = Math.random() - 0.5;
      const z = -4.5 + Math.random() * 7.5;
      normZ[i] = z;
    } else {
      // Extra tunnel particles wait clustered at the gear hole opening
      normX[i] = (Math.random() - 0.5) * 0.18;
      normY[i] = (Math.random() - 0.5) * 0.18;
      normZ[i] = -0.5 - Math.random() * 8.0;
    }

    phaseX[i] = Math.random() * Math.PI * 2;
    phaseY[i] = Math.random() * Math.PI * 2;
    phaseZ[i] = Math.random() * Math.PI * 2;
    driftSpeed[i] = 0.25 + Math.random() * 0.35;

    // Natural, organic distribution along the cylinder surface:
    // Continuous random longitudinal distribution (no rigid ring rows)
    const u = i / PARTICLE_COUNT;
    tunnelBaseZ[i] = u * TUNNEL_SPAN + (Math.random() - 0.5) * 0.40;

    // Natural random angle around the cylinder circumference (no rigid column lines)
    tunnelAngle[i] = Math.random() * Math.PI * 2;

    // Organic shell thickness: clear open center (r >= 0.68) with starry depth out to 0.96
    const shellDepth = Math.random() * 0.26 + (Math.random() - 0.5) * 0.04;
    tunnelRadius[i] = 0.68 + Math.max(0, shellDepth);

    const dist = 6.0 - normZ[i];
    const visHeightAtZ = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
    const visWidthAtZ = visHeightAtZ * camera.aspect;

    const x = normX[i] * visWidthAtZ * 1.15;
    const y = normY[i] * visHeightAtZ * 1.15;
    const z = normZ[i];

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    basePositions[i3] = x;
    basePositions[i3 + 1] = y;
    basePositions[i3 + 2] = z;

    mouseDisplacements[i3] = 0;
    mouseDisplacements[i3 + 1] = 0;
    mouseDisplacements[i3 + 2] = 0;

    const depthFactor = (z + 4.5) / 7.5;
    const chosenColor = colorPalette[Math.floor(Math.random() * colorPalette.length)].clone();
    chosenColor.lerp(bgColor, (1 - depthFactor) * 0.35);

    targetColors[i3] = chosenColor.r;
    targetColors[i3 + 1] = chosenColor.g;
    targetColors[i3 + 2] = chosenColor.b;

    // Guide star glow for badge particles
    if (i === 24 || i === 140) {
      targetColors[i3] = 0.12; targetColors[i3 + 1] = 0.58; targetColors[i3 + 2] = 0.98; // Electric Rotary Blue
    } else if (i === 72 || i === 220) {
      targetColors[i3] = 0.96; targetColors[i3 + 1] = 0.72; targetColors[i3 + 2] = 0.18; // Radiant Rotary Gold
    }

    // Extra tunnel particles start identical to the background color so they are invisible on the home screen
    if (i < REST_PARTICLE_COUNT) {
      colors[i3] = chosenColor.r;
      colors[i3 + 1] = chosenColor.g;
      colors[i3 + 2] = chosenColor.b;
    } else {
      colors[i3] = bgColor.r;
      colors[i3 + 1] = bgColor.g;
      colors[i3 + 2] = bgColor.b;
    }
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // On home screen, only draw the sparse resting particles
  particleGeometry.setDrawRange(0, REST_PARTICLE_COUNT);

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.040,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });

  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  // Crucial: disable frustum culling because particles dynamically wrap in front of the camera
  particleSystem.frustumCulled = false;
  scene.add(particleSystem);

  // 4b. Dynamic Constellation Chains (Occasional Chain Reactions: A -> B -> C -> D)
  const clock = new THREE.Clock();

  const MAX_CHAIN_SEGMENTS = 14;
  const linePositions = new Float32Array(MAX_CHAIN_SEGMENTS * 2 * 3);
  const lineColors = new Float32Array(MAX_CHAIN_SEGMENTS * 2 * 3);

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.90,
    depthWrite: false
  });

  const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
  lineMesh.frustumCulled = false;
  scene.add(lineMesh);

  // Vivid Glowing Sparks at the connected chain nodes
  const MAX_SPARKS = 16;
  const sparkPositions = new Float32Array(MAX_SPARKS * 3);
  const sparkColors = new Float32Array(MAX_SPARKS * 3);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeometry.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

  const sparkMaterial = new THREE.PointsMaterial({
    size: 0.088, // 2x normal particle size for vivid sparkling glow
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });

  const sparkPoints = new THREE.Points(sparkGeometry, sparkMaterial);
  sparkPoints.frustumCulled = false;
  scene.add(sparkPoints);

  const activeChain = {
    nodes: [], // indices of particles in the chain [p0, p1, p2, p3]
    startTime: 0,
    segmentDuration: 0.85, // duration each segment is visible
    segmentDelay: 0.22,    // delay before next link in the chain sparks
    totalDuration: 0,
    nextPickTime: 0.4      // starts first chain almost immediately on load
  };

  // Triggers a sequential chain spark starting from a specific particle
  function triggerChain(startParticle, targetNodes = 4, isClick = false) {
    const posArr = particleGeometry.attributes.position.array;
    const connectMaxDist = 1.35;
    const connectMaxDistSq = connectMaxDist * connectMaxDist;
    const pool = REST_PARTICLE_COUNT;
    const chainNodes = [startParticle];
    const used = new Set([startParticle]);

    for (let step = 0; step < targetNodes - 1; step++) {
      const curr = chainNodes[chainNodes.length - 1];
      const curr3 = curr * 3;
      const cx = posArr[curr3];
      const cy = posArr[curr3 + 1];
      const cz = posArr[curr3 + 2];

      let bestNeighbor = -1;
      let bestDistSq = connectMaxDistSq;

      for (let cand = 0; cand < pool; cand++) {
        if (used.has(cand)) continue;
        const cand3 = cand * 3;
        const dx = cx - posArr[cand3];
        const dy = cy - posArr[cand3 + 1];
        const dz = (cz - posArr[cand3 + 2]) * 0.55;
        const dSq = dx * dx + dy * dy + dz * dz;

        if (dSq < bestDistSq && dSq > 0.0001) {
          bestDistSq = dSq;
          bestNeighbor = cand;
        }
      }

      if (bestNeighbor !== -1) {
        chainNodes.push(bestNeighbor);
        used.add(bestNeighbor);
      } else {
        break;
      }
    }

    if (chainNodes.length >= 2) {
      activeChain.nodes = chainNodes;
      activeChain.startTime = clock.getElapsedTime();
      activeChain.segmentDuration = isClick ? 0.60 : 0.85;
      activeChain.segmentDelay = isClick ? 0.10 : 0.22;
      const numSegs = chainNodes.length - 1;
      activeChain.totalDuration = (numSegs - 1) * activeChain.segmentDelay + activeChain.segmentDuration;
      activeChain.nextPickTime = clock.getElapsedTime() + activeChain.totalDuration + (isClick ? 1.0 : (0.8 + Math.random() * 0.7));
      return true;
    }
    return false;
  }

  function updateParticleBounds() {
    for (let i = 0; i < REST_PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const z = normZ[i];
      const dist = 6.0 - z;
      const visHeightAtZ = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
      const visWidthAtZ = visHeightAtZ * camera.aspect;
      basePositions[i3] = normX[i] * visWidthAtZ * 1.15;
      basePositions[i3 + 1] = normY[i] * visHeightAtZ * 1.15;
      basePositions[i3 + 2] = z;
    }
  }

  // 5. Align Gear to DOM Anchor
  let gearHoleWorldX = 0;
  let gearHoleWorldY = 0;
  let baseGearWorldRadius = 1;

  function updateGearTransform() {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    gearHoleWorldX = (centerX - window.innerWidth / 2) * worldPerPixel;
    gearHoleWorldY = -(centerY - window.innerHeight / 2) * worldPerPixel;
    baseGearWorldRadius = (rect.width / 2) * worldPerPixel;

    gearGroup.position.set(gearHoleWorldX, gearHoleWorldY, 0);
    gearGroup.scale.set(baseGearWorldRadius, baseGearWorldRadius, baseGearWorldRadius);
  }

  // 6. Navigation Controls: Scroll Wheel, Trackpad, Touch, and Keyboard
  // Scroll Down / Right -> Zoom In | Scroll Up / Left -> Zoom Out
  let targetScrollProg = 0;
  let smoothScrollProg = 0;

  // Wheel & Trackpad listener: smooth, capped, and immediately responsive in both directions
  window.addEventListener('wheel', (e) => {
    // Standard mouse wheel and trackpad:
    // Scrolling down (deltaY > 0) or right (deltaX > 0) zooms in (increases progress)
    // Scrolling up (deltaY < 0) or left (deltaX < 0) zooms out (decreases progress)
    const deltaY = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
    const deltaX = e.deltaMode === 1 ? e.deltaX * 24 : e.deltaX;
    const rawDelta = deltaY + deltaX;

    const absDelta = Math.abs(rawDelta);
    if (absDelta > 0.4) {
      // Proportional step with responsive floor and safe ceiling
      const stepMag = Math.min(0.032, Math.max(0.006, absDelta * 0.00032));
      const step = Math.sign(rawDelta) * stepMag;
      targetScrollProg = Math.min(1.0, Math.max(0.0, targetScrollProg + step));
    }
  }, { passive: true });

  // Touch Drag for Mobile / Touchpads
  let touchStartY = 0;
  let touchStartX = 0;

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      // Swiping finger up pulls content up (zooms in), swiping finger down zooms out
      const dy = touchStartY - e.touches[0].clientY;
      const dx = touchStartX - e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;

      const rawTouchDelta = dy + dx;
      const absTouch = Math.abs(rawTouchDelta);
      if (absTouch > 0.5) {
        const touchStep = Math.sign(rawTouchDelta) * Math.min(0.035, Math.max(0.005, absTouch * 0.0025));
        targetScrollProg = Math.min(1.0, Math.max(0.0, targetScrollProg + touchStep));
      }
    }
  }, { passive: true });

  // Keyboard navigation: Down/Right to zoom in, Up/Left to zoom out
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      if (activeFocusedCard && !activeFocusedCard.classList.contains('pinned')) {
        releaseCardFocus(activeFocusedCard, true);
      }
      targetScrollProg = Math.min(1.0, targetScrollProg + 0.05);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      if (activeFocusedCard && !activeFocusedCard.classList.contains('pinned')) {
        releaseCardFocus(activeFocusedCard, true);
      }
      targetScrollProg = Math.max(0.0, targetScrollProg - 0.05);
    }
  });

  // 7. Mouse Tracking & Raycasting (Home screen only)
  const mouse = {
    screenX: 0,
    screenY: 0,
    worldX: 0,
    worldY: 0,
    isHovered: false
  };

  const raycaster = new THREE.Raycaster();
  const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const planeIntersect = new THREE.Vector3();

  function onPointerMove(e) {
    mouse.isHovered = true;
    mouse.screenX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.screenY = -(e.clientY / window.innerHeight) * 2 + 1;

    // Only project mouse to world coordinates when on home screen to avoid near-plane division spikes
    if (smoothScrollProg < 0.10 && camera.position.z > 0.5) {
      raycaster.setFromCamera(new THREE.Vector2(mouse.screenX, mouse.screenY), camera);
      raycaster.ray.intersectPlane(mousePlane, planeIntersect);

      if (planeIntersect && isFinite(planeIntersect.x) && isFinite(planeIntersect.y)) {
        mouse.worldX = planeIntersect.x;
        mouse.worldY = planeIntersect.y;
      }
    }
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', () => {
    mouse.isHovered = false;
  });

  // Click/Tap on a particle triggers an immediate long cascading chain spark (8 to 11 nodes!)
  const clickProjectVec = new THREE.Vector3();

  window.addEventListener('click', (e) => {
    // Only active on the home screen
    if (smoothScrollProg > 0.15) return;
    if (e.target && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a, button'))) {
      return;
    }

    const posArr = particleGeometry.attributes.position.array;
    const pool = REST_PARTICLE_COUNT;
    let closestIndex = -1;
    let closestDistSq = Infinity;
    const MAX_CLICK_PX = 130; // generous hit area around particles
    const maxClickSq = MAX_CLICK_PX * MAX_CLICK_PX;

    for (let i = 0; i < pool; i++) {
      const i3 = i * 3;
      clickProjectVec.set(posArr[i3], posArr[i3 + 1], posArr[i3 + 2]);
      clickProjectVec.project(camera);

      const sx = (clickProjectVec.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-clickProjectVec.y * 0.5 + 0.5) * window.innerHeight;

      const dx = sx - e.clientX;
      const dy = sy - e.clientY;
      const dSq = dx * dx + dy * dy;

      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestIndex = i;
      }
    }

    // Trigger an electric long chain reaction starting directly from the clicked particle
    if (closestIndex !== -1 && closestDistSq <= maxClickSq) {
      const longChainLength = 8 + Math.floor(Math.random() * 4); // 8 to 11 connected particles!
      triggerChain(closestIndex, longChainLength, true);
    }
  });

  // 8. Responsive Resize
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    visibleHeight = 2 * 6 * Math.tan((camera.fov * Math.PI) / 360);
    worldPerPixel = visibleHeight / window.innerHeight;

    updateGearTransform();
    updateParticleBounds();
  }

  window.addEventListener('resize', onResize);
  updateGearTransform();

  // 9. Tunnel Beacon System: Automatic Scroll-Driven Milestone Scoping
  let activeInScopeBeacon = null;

  const currentLookAt = new THREE.Vector3(0, 0, -10);
  const targetLookAt = new THREE.Vector3(0, 0, -10);

  let beaconDefs = [];

  function bindNodeEvents(node) {
    const card = node.querySelector('.beacon-card');
    if (!card || card._bound) return;
    card._bound = true;

    // Optional click to pin/toggle
    card.addEventListener('click', (e) => {
      if (e.target && e.target.tagName === 'A') return;
      card.classList.toggle('is-expanded');
      node.classList.toggle('is-focused');
    });
  }

  function refreshBeaconDefs() {
    beaconDefs = [];
    const nodes = document.querySelectorAll('.beacon-node');
    nodes.forEach(node => {
      const pIdx = parseInt(node.getAttribute('data-pidx'), 10) || 0;
      const card = node.querySelector('.beacon-card');
      beaconDefs.push({
        id: node.id,
        el: node,
        cardEl: card,
        pIdx: pIdx
      });
      bindNodeEvents(node);
    });
  }

  // Initialize all initial beacon nodes from the DOM
  const initialNodes = document.querySelectorAll('.beacon-node');
  initialNodes.forEach((node, idx) => {
    const pIdx = parseInt(node.getAttribute('data-pidx'), 10);
    if (!isNaN(pIdx)) {
      configureBeaconParticle(pIdx, idx);
    }
  });
  refreshBeaconDefs();

  // Smooth camera position & look-at vectors
  const currentCamPos = new THREE.Vector3(0, 0, 6);
  const targetCamPos = new THREE.Vector3(0, 0, 6);
  let tunnelRollAngle = 0;
  let lastTimestamp = 0;
  let currentRollSpeed = 0.06;

  // Helper smoothstep function
  function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  // 9. Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();
    const posAttr = particleGeometry.attributes.position;
    const posArr = posAttr.array;

    // Smooth scroll interpolation (snappy, responsive, and cinematic)
    smoothScrollProg += (targetScrollProg - smoothScrollProg) * 0.14;

    // Phase 1 (0.0 to 0.38): Zoom straight into central axle hole of gear
    const tZoom = smoothstep(0.0, 0.38, smoothScrollProg);
    // Phase 2 (0.22 to 0.55): Particles gracefully assemble into the dense cylindrical tunnel
    const tAssemble = smoothstep(0.22, 0.55, smoothScrollProg);
    // Tunnel density expansion: smoothstep from 0.15 to 0.48
    const tunnelDensityProg = smoothstep(0.15, 0.48, smoothScrollProg);
    // Phase 3 (0.38 to 1.0): Camera plunges forward through the infinite tunnel
    const tTravel = smoothstep(0.38, 1.0, smoothScrollProg);

    // Number of active particles on screen:
    // Exactly 420 on the home screen; scales smoothly up to 2,400 in the tunnel!
    const activeCount = Math.floor(
      REST_PARTICLE_COUNT + (PARTICLE_COUNT - REST_PARTICLE_COUNT) * tunnelDensityProg
    );
    particleGeometry.setDrawRange(0, activeCount);

    // Dynamically fade in colors of the extra tunnel particles as density expands
    const colAttr = particleGeometry.attributes.color;
    const colArr = colAttr.array;
    if (smoothScrollProg < 0.65) {
      for (let i = REST_PARTICLE_COUNT; i < activeCount; i++) {
        const i3 = i * 3;
        colArr[i3] = THREE.MathUtils.lerp(bgColor.r, targetColors[i3], tunnelDensityProg);
        colArr[i3 + 1] = THREE.MathUtils.lerp(bgColor.g, targetColors[i3 + 1], tunnelDensityProg);
        colArr[i3 + 2] = THREE.MathUtils.lerp(bgColor.b, targetColors[i3 + 2], tunnelDensityProg);
      }
      colAttr.needsUpdate = true;
    }

    // Continuous gear spin
    gearMesh.rotation.z -= 0.005;

    // Camera Navigation: Camera position is ALWAYS strictly on the scroll path (never moves position on hover)
    const camTargetX = gearHoleWorldX * tZoom;
    const camTargetY = gearHoleWorldY * tZoom;
    const TUNNEL_TRAVEL_DIST = 42.0;
    const camTargetZ = (6.0 * (1 - tZoom) - 0.15 * tZoom) - (TUNNEL_TRAVEL_DIST * tTravel);
    targetCamPos.set(camTargetX, camTargetY, camTargetZ);

    // Default forward gaze down the tunnel
    const defaultLookX = gearHoleWorldX * tZoom;
    const defaultLookY = gearHoleWorldY * tZoom;
    const defaultLookZ = camTargetZ - 10.0;

    // Automatic Proximity-Driven Scope:
    // As the camera passes by each card, the card automatically unfolds and the camera turns to look at it!
    // When the camera passes by and the card goes out of scope, it folds shut and the camera moves on.
    let inScopeBeacon = null;
    let maxWeight = 0;

    if (smoothScrollProg >= 0.55) {
      for (let b = 0; b < beaconDefs.length; b++) {
        const beacon = beaconDefs[b];
        const card = beacon.cardEl || (beacon.el ? beacon.el.querySelector('.beacon-card') : null);
        const p3 = beacon.pIdx * 3;
        const pZ = posArr[p3 + 2];
        const distZ = camTargetZ - pZ; // positive when card is ahead of camera

        // Active reading scope zone: 0.9 to 7.2 units ahead of camera
        const inScope = (distZ >= 0.9 && distZ <= 7.2);

        if (inScope) {
          // Smooth bell-curve weighting for camera look-at angle
          const normDist = (distZ - 0.9) / (7.2 - 0.9);
          const weight = Math.sin(normDist * Math.PI);
          if (weight > maxWeight) {
            maxWeight = weight;
            inScopeBeacon = beacon;
          }

          if (card && !card.classList.contains('is-expanded')) {
            card.classList.add('is-expanded');
            if (beacon.el) beacon.el.classList.add('is-focused');
          }
        } else {
          if (card && card.classList.contains('is-expanded')) {
            card.classList.remove('is-expanded');
            if (beacon.el) beacon.el.classList.remove('is-focused');
          }
        }
      }
    } else {
      // Before tunnel is formed, ensure all are collapsed
      for (let b = 0; b < beaconDefs.length; b++) {
        const card = beaconDefs[b].cardEl || (beaconDefs[b].el ? beaconDefs[b].el.querySelector('.beacon-card') : null);
        if (card && card.classList.contains('is-expanded')) {
          card.classList.remove('is-expanded');
          if (beaconDefs[b].el) beaconDefs[b].el.classList.remove('is-focused');
        }
      }
    }

    activeInScopeBeacon = inScopeBeacon;

    if (inScopeBeacon && maxWeight > 0.05) {
      const bp3 = inScopeBeacon.pIdx * 3;
      const bpX = posArr[bp3];
      const bpY = posArr[bp3 + 1];

      let side = 'face-right';
      if (inScopeBeacon.el.classList.contains('face-left')) side = 'face-left';
      else if (inScopeBeacon.el.classList.contains('face-down')) side = 'face-down';
      else if (inScopeBeacon.el.classList.contains('face-up')) side = 'face-up';

      let cardOffX = 0;
      let cardOffY = 0;
      if (side === 'face-right') cardOffX = 0.22;
      else if (side === 'face-left') cardOffX = -0.22;
      else if (side === 'face-down') cardOffY = -0.20;
      else if (side === 'face-up') cardOffY = 0.20;

      const cardWorldX = bpX + cardOffX;
      const cardWorldY = bpY + cardOffY;

      // Softly and organically pan camera gaze towards the card as it passes by
      const panFactor = maxWeight * 0.48;
      targetLookAt.set(
        defaultLookX + (cardWorldX - defaultLookX) * panFactor,
        defaultLookY + (cardWorldY - defaultLookY) * panFactor,
        defaultLookZ
      );
    } else {
      targetLookAt.set(defaultLookX, defaultLookY, defaultLookZ);
    }

    // Camera position follows scroll responsively; camera rotation pans smoothly to meet the card
    currentCamPos.lerp(targetCamPos, 0.14);
    currentLookAt.lerp(targetLookAt, 0.08);

    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    // Smooth entrance reveal on initial page load
    const introProgress = Math.min(1.0, elapsedTime / 1.1);
    const introEase = 1.0 - Math.pow(1.0 - introProgress, 3);

    // Portal scale: stays natural during zoom, gently expanding only as gear covers screen
    const portalExpansion = 1.0 + smoothstep(0.28, 0.38, smoothScrollProg) * 1.5;
    const gearScale = baseGearWorldRadius * portalExpansion * introEase;
    gearGroup.scale.set(gearScale, gearScale, gearScale);

    // Lockup Text Fade
    if (lockupText) {
      const textOpacity = Math.max(0, 1.0 - tZoom * 2.8);
      lockupText.style.opacity = textOpacity.toFixed(3);
    }

    // Smooth, cinematic opacity fade into the tunnel portal
    // Stays 100% solid & opaque on home screen and initial zoom (zero ghosting)
    // Fades gracefully as camera enters axle hole, then cleanly culls when inside tunnel
    const gearOpacity = Math.max(0, 1.0 - smoothstep(0.22, 0.38, smoothScrollProg)) * introEase;
    if (gearOpacity < 0.99) {
      gearMaterial.transparent = true;
      gearMaterial.opacity = gearOpacity;
      gearMaterial.depthWrite = true;
    } else {
      gearMaterial.transparent = false;
      gearMaterial.opacity = 1.0;
      gearMaterial.depthWrite = true;
    }

    // Clean visibility cutoff once fully entered into the tunnel
    gearGroup.visible = (smoothScrollProg < 0.385);

    // Mouse repulsion strictly on the home screen; fades to 0 as soon as zoom begins
    const mouseActive = mouse.isHovered && smoothScrollProg < 0.08;
    const mouseStrength = 0.035 * (1.0 - smoothstep(0.0, 0.08, smoothScrollProg));
    const interactionRadius = 1.1;
    const interactionRadiusSq = interactionRadius * interactionRadius;

    // Delta-time integration for continuous glitch-free cylinder roll
    const delta = (lastTimestamp === 0) ? 0.016 : Math.min(0.05, elapsedTime - lastTimestamp);
    lastTimestamp = elapsedTime;

    // Gracefully soften rotation to a calm drift when a card is in scope; speeds up between milestones
    const targetRollSpeed = (inScopeBeacon && maxWeight > 0.25) ? (0.016 + (1.0 - maxWeight) * 0.045) : 0.065;
    const rollLerpRate = 0.04;
    currentRollSpeed += (targetRollSpeed - currentRollSpeed) * rollLerpRate;
    tunnelRollAngle += delta * currentRollSpeed;

    // High-performance particle position update
    if (tAssemble >= 0.98) {
      // 1. Fully in the tunnel: fast direct cylindrical calculation (zero redundant resting math)
      for (let i = 0; i < activeCount; i++) {
        const i3 = i * 3;
        const tunAngle = tunnelAngle[i] + tunnelRollAngle;
        const r = tunnelRadius[i];
        posArr[i3]     = gearHoleWorldX + Math.cos(tunAngle) * r;
        posArr[i3 + 1] = gearHoleWorldY + Math.sin(tunAngle) * r;
        posArr[i3 + 2] = -0.2 - tunnelBaseZ[i];
      }
    } else if (tAssemble <= 0.02) {
      // 2. Pure home screen: update resting particles only (skips all tunnel math)
      for (let i = 0; i < REST_PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const ambientX = Math.sin(elapsedTime * driftSpeed[i] + phaseX[i]) * 0.04;
        const ambientY = Math.cos(elapsedTime * driftSpeed[i] + phaseY[i]) * 0.04;
        const ambientZ = Math.sin(elapsedTime * driftSpeed[i] * 0.8 + phaseZ[i]) * 0.03;

        if (mouseActive) {
          const curPx = basePositions[i3] + mouseDisplacements[i3];
          const curPy = basePositions[i3 + 1] + mouseDisplacements[i3 + 1];
          const dx = curPx - mouse.worldX;
          const dy = curPy - mouse.worldY;
          const distSq = dx * dx + dy * dy;

          if (distSq < interactionRadiusSq && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const force = (1.0 - dist / interactionRadius) * mouseStrength;
            mouseDisplacements[i3]     += (dx / dist) * force;
            mouseDisplacements[i3 + 1] += (dy / dist) * force;
          }
        }
        mouseDisplacements[i3]     *= 0.90;
        mouseDisplacements[i3 + 1] *= 0.90;

        posArr[i3]     = basePositions[i3] + ambientX + mouseDisplacements[i3];
        posArr[i3 + 1] = basePositions[i3 + 1] + ambientY + mouseDisplacements[i3 + 1];
        posArr[i3 + 2] = basePositions[i3 + 2] + ambientZ;
      }
    } else {
      // 3. Smooth blend during the brief assembly phase (0.22 < smoothScrollProg < 0.55)
      for (let i = 0; i < activeCount; i++) {
        const i3 = i * 3;
        const ambientX = (i < REST_PARTICLE_COUNT) ? Math.sin(elapsedTime * driftSpeed[i] + phaseX[i]) * 0.04 : 0;
        const ambientY = (i < REST_PARTICLE_COUNT) ? Math.cos(elapsedTime * driftSpeed[i] + phaseY[i]) * 0.04 : 0;
        const ambientZ = (i < REST_PARTICLE_COUNT) ? Math.sin(elapsedTime * driftSpeed[i] * 0.8 + phaseZ[i]) * 0.03 : 0;

        const restX = basePositions[i3] + ambientX;
        const restY = basePositions[i3 + 1] + ambientY;
        const restZ = basePositions[i3 + 2] + ambientZ;

        const tunAngle = tunnelAngle[i] + tunnelRollAngle;
        const r = tunnelRadius[i];
        const tunX = gearHoleWorldX + Math.cos(tunAngle) * r;
        const tunY = gearHoleWorldY + Math.sin(tunAngle) * r;
        const tunZ = -0.2 - tunnelBaseZ[i];

        posArr[i3]     = restX * (1 - tAssemble) + tunX * tAssemble;
        posArr[i3 + 1] = restY * (1 - tAssemble) + tunY * tAssemble;
        posArr[i3 + 2] = restZ * (1 - tAssemble) + tunZ * tAssemble;
      }
    }

    posAttr.needsUpdate = true;

    // Dynamic Constellation Chains: Occasional chain reactions (A -> B -> C -> D) on title screen
    let lineIdx = 0;
    let sparkIdx = 0;
    const lPos = lineGeometry.attributes.position.array;
    const lCol = lineGeometry.attributes.color.array;
    const sPos = sparkGeometry.attributes.position.array;
    const sCol = sparkGeometry.attributes.color.array;

    const linkFade = (1.0 - tAssemble) * (1.0 - smoothstep(0.10, 0.28, smoothScrollProg));

    if (linkFade > 0.02) {
      // Pick a new ambient chain when previous chain has completed
      if (elapsedTime >= activeChain.nextPickTime) {
        const startP = Math.floor(Math.random() * REST_PARTICLE_COUNT);
        const targetNodes = 3 + Math.floor(Math.random() * 2); // 3 to 4 nodes for ambient
        triggerChain(startP, targetNodes, false);
      }

      // Render the active chain: segments ignite sequentially (A -> B, then B -> C, then C -> D ...)
      if (activeChain.nodes.length >= 2) {
        const numSegments = activeChain.nodes.length - 1;
        for (let s = 0; s < numSegments; s++) {
          const segStartTime = activeChain.startTime + s * activeChain.segmentDelay;
          const segAge = elapsedTime - segStartTime;

          if (segAge >= 0 && segAge < activeChain.segmentDuration) {
            const normAge = segAge / activeChain.segmentDuration;
            // Smooth bell pulse for each segment
            const pulse = Math.sin(normAge * Math.PI);
            const lineAlpha = pulse * linkFade;

            const n1 = activeChain.nodes[s] * 3;
            const n2 = activeChain.nodes[s + 1] * 3;

            // Connect lines between particles
            if (lineIdx < MAX_CHAIN_SEGMENTS) {
              const baseIdx = lineIdx * 6;
              lPos[baseIdx]     = posArr[n1];
              lPos[baseIdx + 1] = posArr[n1 + 1];
              lPos[baseIdx + 2] = posArr[n1 + 2];

              lPos[baseIdx + 3] = posArr[n2];
              lPos[baseIdx + 4] = posArr[n2 + 1];
              lPos[baseIdx + 5] = posArr[n2 + 2];

              // Rich crisp Rotary Electric Blue (#1d85d7 to #2563eb)
              const rC = 0.12 * lineAlpha;
              const gC = 0.52 * lineAlpha;
              const bC = 0.92 * lineAlpha;

              lCol[baseIdx]     = rC;
              lCol[baseIdx + 1] = gC;
              lCol[baseIdx + 2] = bC;

              lCol[baseIdx + 3] = rC;
              lCol[baseIdx + 4] = gC;
              lCol[baseIdx + 5] = bC;

              lineIdx++;
            }

            // Flash glowing spark at arriving particle node
            if (sparkIdx < MAX_SPARKS) {
              const spBase = sparkIdx * 3;
              sPos[spBase]     = posArr[n2];
              sPos[spBase + 1] = posArr[n2 + 1];
              sPos[spBase + 2] = posArr[n2 + 2];

              // Vibrant Electric Cyan & Rotary Gold spark glow
              sCol[spBase]     = 0.15 * lineAlpha;
              sCol[spBase + 1] = 0.75 * lineAlpha;
              sCol[spBase + 2] = 1.00 * lineAlpha;
              sparkIdx++;
            }

            // Flash start node at the beginning of the chain
            if (s === 0 && sparkIdx < MAX_SPARKS) {
              const spBase = sparkIdx * 3;
              sPos[spBase]     = posArr[n1];
              sPos[spBase + 1] = posArr[n1 + 1];
              sPos[spBase + 2] = posArr[n1 + 2];

              sCol[spBase]     = 0.15 * lineAlpha;
              sCol[spBase + 1] = 0.75 * lineAlpha;
              sCol[spBase + 2] = 1.00 * lineAlpha;
              sparkIdx++;
            }
          }
        }
      }
    }

    lineGeometry.setDrawRange(0, lineIdx * 2);
    lineGeometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.color.needsUpdate = true;

    sparkGeometry.setDrawRange(0, sparkIdx);
    sparkGeometry.attributes.position.needsUpdate = true;
    sparkGeometry.attributes.color.needsUpdate = true;

    // 10. Update Callout Tags Projected Directly from Real Tunnel Particles
    const beaconProjVec = new THREE.Vector3();

    for (let b = 0; b < beaconDefs.length; b++) {
      const beacon = beaconDefs[b];
      if (!beacon.el) continue;

      const p3 = beacon.pIdx * 3;
      const pX = posArr[p3];
      const pY = posArr[p3 + 1];
      const pZ = posArr[p3 + 2];

      // Project the exact 3D particle coordinate to 2D screen coordinate
      beaconProjVec.set(pX, pY, pZ);
      beaconProjVec.project(camera);

      // Distance from camera to this real particle along Z
      const distZ = camera.position.z - pZ;

      const isThisFocused = (activeInScopeBeacon && activeInScopeBeacon.pIdx === beacon.pIdx);

      // ONLY come up later in the tunnel (when smoothScrollProg >= 0.55, deep in the formed tunnel)
      if (smoothScrollProg < 0.55 || distZ < 0.35 || distZ > 22.0 || beaconProjVec.z > 1.0) {
        beacon.el.style.opacity = '0';
        beacon.el.style.visibility = 'hidden';
        beacon.el.style.pointerEvents = 'none';
      } else {
        const farFade = smoothstep(22.0, 10.0, distZ);
        const nearFade = smoothstep(0.35, 1.4, distZ);
        const tunnelFade = smoothstep(0.55, 0.65, smoothScrollProg);
        let alpha = farFade * nearFade * tunnelFade;

        // If this tag is currently in-scope/expanded, keep it at maximum focus
        if (isThisFocused) {
          alpha = 1.0;
        } else if (activeInScopeBeacon) {
          // Gently dim other tags in the distance to bring maximum clarity to the active card
          alpha *= 0.35;
        }

        // Perspective scale: compact tag scales smoothly with 3D depth
        const scale = THREE.MathUtils.clamp(4.6 / (distZ + 1.6), 0.70, 1.15);

        const sx = (beaconProjVec.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-beaconProjVec.y * 0.5 + 0.5) * window.innerHeight;

        // Viewport padding safety clamp: prevents tags/cards from overflowing off the screen edges
        const padX = Math.min(200, window.innerWidth * 0.22);
        const padY = Math.min(160, window.innerHeight * 0.22);
        const safeSx = THREE.MathUtils.clamp(sx, padX, window.innerWidth - padX);
        const safeSy = THREE.MathUtils.clamp(sy, padY, window.innerHeight - padY);

        beacon.el.style.transform = `translate3d(${safeSx.toFixed(1)}px, ${safeSy.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
        beacon.el.style.opacity = alpha.toFixed(3);
        beacon.el.style.visibility = alpha > 0.02 ? 'visible' : 'hidden';
        beacon.el.style.pointerEvents = alpha > 0.30 ? 'auto' : 'none';
      }
    }

    renderer.render(scene, camera);
  }

  animate();
})();
