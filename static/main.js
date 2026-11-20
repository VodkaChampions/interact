(() => {
  const canvas = document.getElementById('bg-canvas');
  const anchor = document.getElementById('wheel-anchor');
  const lockup = document.getElementById('lockup');
  const lockupText = document.getElementById('lockup-text');
  const mainContent = document.getElementById('main-content');
  const navTooltipEl = document.getElementById('nav-tooltip');

  if (!canvas || typeof THREE === 'undefined') return;

  // ─────────────────────────────────────────────────────────────
  // 1. Scene, Camera, Renderer
  // ─────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xfceeda, 22.0, 48.0);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.005, 1000);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.localClippingEnabled = true;

  let visibleHeight = 2 * 6 * Math.tan((camera.fov * Math.PI) / 360);
  let worldPerPixel = visibleHeight / window.innerHeight;

  // ─────────────────────────────────────────────────────────────
  // 2. Lighting
  // ─────────────────────────────────────────────────────────────
  const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.4);
  scene.add(ambientLight);

  const keyLight = new THREE.PointLight(0xffffff, 2.0, 50);
  keyLight.position.set(4, 3, 4);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x2563eb, 2.4, 50);
  fillLight.position.set(-3, -2, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
  rimLight.position.set(0, 4, -2);
  scene.add(rimLight);

  // ─────────────────────────────────────────────────────────────
  // 3. Intro Rotary Wheel (SVG → CanvasTexture → PlaneGeometry)
  // ─────────────────────────────────────────────────────────────
  const gearGroup = new THREE.Group();

  const gearCanvas = document.createElement('canvas');
  gearCanvas.width = 2048;
  gearCanvas.height = 2048;
  const gearCtx = gearCanvas.getContext('2d');

  const gearTexture = new THREE.CanvasTexture(gearCanvas);
  gearTexture.generateMipmaps = true;
  gearTexture.minFilter = THREE.LinearMipmapLinearFilter;

  const gearImg = new Image();
  gearImg.crossOrigin = 'anonymous';
  gearImg.onload = () => {
    gearCtx.clearRect(0, 0, 2048, 2048);
    gearCtx.drawImage(gearImg, 0, 0, 2048, 2048);
    gearTexture.needsUpdate = true;
  };
  gearImg.src = '/static/rotary_wheel_clean.svg';

  const gearGeometry = new THREE.PlaneGeometry(2, 2);
  const gearMaterial = new THREE.MeshStandardMaterial({
    map: gearTexture,
    transparent: true,
    alphaTest: 0.02,
    roughness: 0.28,
    metalness: 0.35,
    emissive: 0x063a66,
    emissiveIntensity: 0.18,
    side: THREE.DoubleSide
  });
  const gearMesh = new THREE.Mesh(gearGeometry, gearMaterial);
  gearGroup.add(gearMesh);

  const gearBackMaterial = new THREE.MeshStandardMaterial({
    map: gearTexture,
    transparent: true,
    alphaTest: 0.02,
    color: 0x08456f,
    roughness: 0.45,
    metalness: 0.50,
    side: THREE.DoubleSide
  });
  const gearBackMesh = new THREE.Mesh(gearGeometry, gearBackMaterial);
  gearBackMesh.position.z = -0.04;
  gearGroup.add(gearBackMesh);

  scene.add(gearGroup);

  let gearHoleWorldX = 0;
  let gearHoleWorldY = 0;
  let baseGearWorldRadius = 1;

  // ─────────────────────────────────────────────────────────────
  // 4. Navigation Gear (Post-tunnel, left-side, SVG-textured)
  // ─────────────────────────────────────────────────────────────
  const NAV_SECTIONS = [
    { name: 'Home',              icon: '🏠' },
    { name: 'About Us',          icon: '📖' },
    { name: 'Our Projects',      icon: '🚀' },
    { name: 'Events & Activities', icon: '🎉' },
    { name: 'Our Team',          icon: '👥' },
    { name: 'Gallery',           icon: '🖼' },
    { name: 'Join Us',           icon: '✋' },
    { name: 'Contact Us',        icon: '✉' }
  ];
  const NUM_TEETH = NAV_SECTIONS.length; // 8
  const TOOTH_ANGLE = (Math.PI * 2) / NUM_TEETH; // 45° per tooth

  // Build the nav gear texture with icons baked onto the SVG layer
  const navGearCanvas = document.createElement('canvas');
  navGearCanvas.width = 2048;
  navGearCanvas.height = 2048;
  const navGearCtx = navGearCanvas.getContext('2d');

  const navGearTexture = new THREE.CanvasTexture(navGearCanvas);
  navGearTexture.generateMipmaps = true;
  navGearTexture.minFilter = THREE.LinearMipmapLinearFilter;

  let navGearImgLoaded = false;
  const navGearImg = new Image();
  navGearImg.crossOrigin = 'anonymous';
  navGearImg.onload = () => {
    navGearImgLoaded = true;
    renderNavGearTexture(0);
  };
  navGearImg.src = '/static/rotary_wheel_clean.svg';

  function renderNavGearTexture(activeIdx) {
    const W = 2048;
    navGearCtx.clearRect(0, 0, W, W);

    // Tint to electric-blue metallic
    navGearCtx.save();
    navGearCtx.drawImage(navGearImg, 0, 0, W, W);

    // Blue overlay for metallic feel
    navGearCtx.globalCompositeOperation = 'multiply';
    navGearCtx.fillStyle = '#1a5fa8';
    navGearCtx.fillRect(0, 0, W, W);
    navGearCtx.globalCompositeOperation = 'source-over';
    navGearCtx.restore();

    // Redraw SVG cleanly on top
    navGearCtx.save();
    navGearCtx.globalAlpha = 0.72;
    navGearCtx.drawImage(navGearImg, 0, 0, W, W);
    navGearCtx.globalAlpha = 1.0;
    navGearCtx.restore();

    // Draw icons at each tooth position (outer edge of gear, every 45°)
    const cx = W / 2;
    const cy = W / 2;
    // The SVG's outer tooth tips are roughly at radius 490/512 of half-width
    const iconR = W * 0.44; // slightly inside tooth tips

    navGearCtx.font = `bold ${W * 0.062}px serif`;
    navGearCtx.textAlign = 'center';
    navGearCtx.textBaseline = 'middle';

    for (let i = 0; i < NUM_TEETH; i++) {
      const angle = (i * TOOTH_ANGLE) - Math.PI / 2; // top = section 0
      const ix = cx + Math.cos(angle) * iconR;
      const iy = cy + Math.sin(angle) * iconR;

      // Active tooth glow ring
      if (i === activeIdx) {
        navGearCtx.save();
        navGearCtx.beginPath();
        navGearCtx.arc(ix, iy, W * 0.052, 0, Math.PI * 2);
        navGearCtx.fillStyle = 'rgba(37, 200, 255, 0.35)';
        navGearCtx.fill();
        navGearCtx.strokeStyle = 'rgba(37, 200, 255, 0.90)';
        navGearCtx.lineWidth = W * 0.006;
        navGearCtx.stroke();
        navGearCtx.restore();
      }

      // Icon shadow for legibility
      navGearCtx.save();
      navGearCtx.shadowColor = 'rgba(0,0,0,0.75)';
      navGearCtx.shadowBlur = W * 0.015;
      navGearCtx.fillStyle = i === activeIdx ? '#ffffff' : 'rgba(255,255,255,0.80)';
      navGearCtx.fillText(NAV_SECTIONS[i].icon, ix, iy);
      navGearCtx.restore();
    }

    navGearTexture.needsUpdate = true;
  }

  // Build 3D mesh for nav gear (thick extruded disc with 8 teeth bumps)
  // We'll use a shape-based approach: circle + 8 tooth bumps
  function buildNavGearShape() {
    const shape = new THREE.Shape();
    const outerR = 1.0;
    const innerR = 0.52; // big center hole
    const toothH = 0.14;
    const toothW = 0.11; // half-width in radians
    const pts = 128;

    // Outer profile with tooth bumps at every 45°
    const outerPoints = [];
    for (let i = 0; i <= pts; i++) {
      const ang = (i / pts) * Math.PI * 2;
      let r = outerR;

      // Check if near a tooth center
      for (let t = 0; t < NUM_TEETH; t++) {
        const toothAng = (t / NUM_TEETH) * Math.PI * 2;
        const diff = Math.abs(((ang - toothAng) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        if (diff < toothW * 1.5) {
          const blend = Math.max(0, 1 - diff / (toothW * 1.5));
          r = outerR + toothH * blend * blend;
        }
      }

      outerPoints.push(new THREE.Vector2(Math.cos(ang) * r, Math.sin(ang) * r));
    }
    shape.setFromPoints(outerPoints);

    // Punch center hole
    const hole = new THREE.Path();
    for (let i = 0; i <= pts; i++) {
      const ang = (i / pts) * Math.PI * 2;
      const hx = Math.cos(ang) * innerR;
      const hy = Math.sin(ang) * innerR;
      if (i === 0) hole.moveTo(hx, hy);
      else hole.lineTo(hx, hy);
    }
    shape.holes.push(hole);

    return shape;
  }

  const navGearShape = buildNavGearShape();
  const navGearExtrudeSettings = {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.012,
    bevelSegments: 3
  };
  const navGearGeo = new THREE.ExtrudeGeometry(navGearShape, navGearExtrudeSettings);

  // Apply UV mapping for the texture
  navGearGeo.computeBoundingBox();

  const navGearMat = new THREE.MeshStandardMaterial({
    map: navGearTexture,
    roughness: 0.25,
    metalness: 0.72,
    emissive: 0x0a3a6a,
    emissiveIntensity: 0.22,
    side: THREE.FrontSide
  });

  // Also a flat plane overlay so SVG icons are always crisp
  const navIconPlaneGeo = new THREE.PlaneGeometry(2, 2);
  const navIconPlaneMat = new THREE.MeshBasicMaterial({
    map: navGearTexture,
    transparent: true,
    alphaTest: 0.01,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const navIconPlane = new THREE.Mesh(navIconPlaneGeo, navIconPlaneMat);
  navIconPlane.position.z = 0.12;

  const navGearGroup = new THREE.Group();
  const navGearMesh = new THREE.Mesh(navGearGeo, navGearMat);
  navGearGroup.add(navGearMesh);
  navGearGroup.add(navIconPlane);
  navGearGroup.visible = false;
  scene.add(navGearGroup);

  // Nav gear state
  let navActive = false;           // true when mouse is in left 42% of screen
  let navToothIndex = 0;           // 0-7, current snap position
  let navGearTargetAngle = 0;      // target rotation in radians
  let navGearCurrentAngle = 0;     // current animated rotation
  let navScrollCooldown = false;
  let navGearVisible = false;      // true after tunnel exit
  let navGearSlideIn = 0;          // 0→1 slide-in progress
  let activeNavSection = 0;        // 0-7 currently selected section

  // Hover detection for individual tooth icons (screen-space)
  let hoveredToothIndex = -1;
  let tooltipFade = 0;
  let tooltipTargetFade = 0;

  // ─────────────────────────────────────────────────────────────
  // 5. Particle Field
  // ─────────────────────────────────────────────────────────────
  const PARTICLE_COUNT = 2400;
  const REST_PARTICLE_COUNT = 420;
  const particleGeometry = new THREE.BufferGeometry();

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const basePositions = new Float32Array(PARTICLE_COUNT * 3);
  const mouseDisplacements = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const targetColors = new Float32Array(PARTICLE_COUNT * 3);

  const phaseX = new Float32Array(PARTICLE_COUNT);
  const phaseY = new Float32Array(PARTICLE_COUNT);
  const phaseZ = new Float32Array(PARTICLE_COUNT);
  const driftSpeed = new Float32Array(PARTICLE_COUNT);

  const normX = new Float32Array(PARTICLE_COUNT);
  const normY = new Float32Array(PARTICLE_COUNT);
  const normZ = new Float32Array(PARTICLE_COUNT);

  const TUNNEL_SPAN = 58.0;
  const tunnelBaseZ = new Float32Array(PARTICLE_COUNT);
  const tunnelAngle = new Float32Array(PARTICLE_COUNT);
  const tunnelRadius = new Float32Array(PARTICLE_COUNT);

  function configureBeaconParticle(pIdx, slotIndex) {
    if (pIdx >= PARTICLE_COUNT) return;
    tunnelBaseZ[pIdx] = 14.0 + slotIndex * 5.2;
    tunnelRadius[pIdx] = 0.74;

    if (slotIndex % 4 === 0) tunnelAngle[pIdx] = Math.PI;
    else if (slotIndex % 4 === 1) tunnelAngle[pIdx] = 0.0;
    else if (slotIndex % 4 === 2) tunnelAngle[pIdx] = Math.PI / 2;
    else tunnelAngle[pIdx] = -Math.PI / 2;

    const p3 = pIdx * 3;
    if (slotIndex % 2 === 0) {
      targetColors[p3] = 0.12; targetColors[p3 + 1] = 0.58; targetColors[p3 + 2] = 0.98;
    } else {
      targetColors[p3] = 0.96; targetColors[p3 + 1] = 0.72; targetColors[p3 + 2] = 0.18;
    }
  }

  const colorPalette = [
    new THREE.Color('#1c85d7'),
    new THREE.Color('#388ec9'),
    new THREE.Color('#2563eb'),
    new THREE.Color('#4d88b4'),
    new THREE.Color('#78a8ca'),
    new THREE.Color('#9bbecf'),
    new THREE.Color('#d4b693'),
    new THREE.Color('#e2a85c')
  ];
  const bgColor = new THREE.Color('#fceeda');

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    if (i < REST_PARTICLE_COUNT) {
      normX[i] = Math.random() - 0.5;
      normY[i] = Math.random() - 0.5;
      const z = -4.5 + Math.random() * 7.5;
      normZ[i] = z;
    } else {
      normX[i] = (Math.random() - 0.5) * 0.18;
      normY[i] = (Math.random() - 0.5) * 0.18;
      normZ[i] = -0.5 - Math.random() * 8.0;
    }

    phaseX[i] = Math.random() * Math.PI * 2;
    phaseY[i] = Math.random() * Math.PI * 2;
    phaseZ[i] = Math.random() * Math.PI * 2;
    driftSpeed[i] = 0.25 + Math.random() * 0.35;

    const u = i / PARTICLE_COUNT;
    tunnelBaseZ[i] = u * TUNNEL_SPAN + (Math.random() - 0.5) * 0.40;
    tunnelAngle[i] = Math.random() * Math.PI * 2;

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

    if (i === 35 || i === 140 || i === 290 || i === 480) {
      targetColors[i3] = 0.12; targetColors[i3 + 1] = 0.58; targetColors[i3 + 2] = 0.98;
    } else if (i === 80 || i === 210 || i === 380 || i === 580) {
      targetColors[i3] = 0.96; targetColors[i3 + 1] = 0.72; targetColors[i3 + 2] = 0.18;
    }

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
  particleSystem.frustumCulled = false;
  scene.add(particleSystem);

  // ─────────────────────────────────────────────────────────────
  // 5b. Constellation chains + sparks
  // ─────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  const MAX_CHAIN_SEGMENTS = 14;
  const linePositions = new Float32Array(MAX_CHAIN_SEGMENTS * 2 * 3);
  const lineColors = new Float32Array(MAX_CHAIN_SEGMENTS * 2 * 3);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
  const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.90, depthWrite: false });
  const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
  lineMesh.frustumCulled = false;
  scene.add(lineMesh);

  const MAX_SPARKS = 16;
  const sparkPositions = new Float32Array(MAX_SPARKS * 3);
  const sparkColors = new Float32Array(MAX_SPARKS * 3);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeometry.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
  const sparkMaterial = new THREE.PointsMaterial({ size: 0.088, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const sparkPoints = new THREE.Points(sparkGeometry, sparkMaterial);
  sparkPoints.frustumCulled = false;
  scene.add(sparkPoints);

  const activeChain = { nodes: [], startTime: 0, segmentDuration: 0.85, segmentDelay: 0.22, totalDuration: 0, nextPickTime: 0.4 };

  function triggerChain(startParticle, targetNodes = 4, isClick = false) {
    const posArr = particleGeometry.attributes.position.array;
    const connectMaxDistSq = 1.35 * 1.35;
    const pool = REST_PARTICLE_COUNT;
    const chainNodes = [startParticle];
    const used = new Set([startParticle]);

    for (let step = 0; step < targetNodes - 1; step++) {
      const curr = chainNodes[chainNodes.length - 1];
      const curr3 = curr * 3;
      const cx = posArr[curr3], cy = posArr[curr3 + 1], cz = posArr[curr3 + 2];
      let bestNeighbor = -1, bestDistSq = connectMaxDistSq;

      for (let cand = 0; cand < pool; cand++) {
        if (used.has(cand)) continue;
        const cand3 = cand * 3;
        const dx = cx - posArr[cand3];
        const dy = cy - posArr[cand3 + 1];
        const dz = (cz - posArr[cand3 + 2]) * 0.55;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < bestDistSq && dSq > 0.0001) { bestDistSq = dSq; bestNeighbor = cand; }
      }

      if (bestNeighbor !== -1) { chainNodes.push(bestNeighbor); used.add(bestNeighbor); }
      else break;
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

  // ─────────────────────────────────────────────────────────────
  // 6. Align intro gear to DOM anchor
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // 7. Scroll & Nav Interaction
  // ─────────────────────────────────────────────────────────────
  let targetScrollProg = 0;
  let smoothScrollProg = 0;

  // Tunnel scroll (home screen → tunnel)
  window.addEventListener('wheel', (e) => {
    // If nav gear is visible, only tunnel scroll when NOT hovering nav area
    if (navGearVisible && navActive) {
      handleNavGearScroll(e);
      return;
    }
    if (navGearVisible) return; // block tunnel scroll after exit

    const deltaY = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
    const deltaX = e.deltaMode === 1 ? e.deltaX * 24 : e.deltaX;
    const rawDelta = deltaY + deltaX;
    const absDelta = Math.abs(rawDelta);
    if (absDelta > 0.4) {
      const stepMag = Math.min(0.032, Math.max(0.006, absDelta * 0.00032));
      const step = Math.sign(rawDelta) * stepMag;
      targetScrollProg = Math.min(1.0, Math.max(0.0, targetScrollProg + step));
    }
  }, { passive: true });

  function handleNavGearScroll(e) {
    if (navScrollCooldown) return;
    const deltaY = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
    const rawDelta = deltaY + (e.deltaMode === 1 ? e.deltaX * 24 : e.deltaX);
    if (Math.abs(rawDelta) < 2) return;

    const dir = Math.sign(rawDelta);
    navToothIndex = ((navToothIndex + dir) % NUM_TEETH + NUM_TEETH) % NUM_TEETH;
    navGearTargetAngle = navToothIndex * TOOTH_ANGLE;
    activeNavSection = navToothIndex;

    if (navGearImgLoaded) renderNavGearTexture(navToothIndex);
    updateMainContent(navToothIndex);

    navScrollCooldown = true;
    setTimeout(() => { navScrollCooldown = false; }, 420);
  }

  // Touch
  let touchStartY = 0, touchStartX = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      const dy = touchStartY - e.touches[0].clientY;
      const dx = touchStartX - e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;

      if (navGearVisible) {
        if (navScrollCooldown) return;
        const rawDelta = dy + dx;
        if (Math.abs(rawDelta) > 4) {
          const dir = Math.sign(rawDelta);
          navToothIndex = ((navToothIndex + dir) % NUM_TEETH + NUM_TEETH) % NUM_TEETH;
          navGearTargetAngle = navToothIndex * TOOTH_ANGLE;
          activeNavSection = navToothIndex;
          if (navGearImgLoaded) renderNavGearTexture(navToothIndex);
          updateMainContent(navToothIndex);
          navScrollCooldown = true;
          setTimeout(() => { navScrollCooldown = false; }, 420);
        }
        return;
      }

      const rawTouchDelta = dy + dx;
      const absTouch = Math.abs(rawTouchDelta);
      if (absTouch > 0.5) {
        const touchStep = Math.sign(rawTouchDelta) * Math.min(0.035, Math.max(0.005, absTouch * 0.0025));
        targetScrollProg = Math.min(1.0, Math.max(0.0, targetScrollProg + touchStep));
      }
    }
  }, { passive: true });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (navGearVisible) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (navScrollCooldown) return;
        navToothIndex = (navToothIndex + 1) % NUM_TEETH;
        navGearTargetAngle = navToothIndex * TOOTH_ANGLE;
        activeNavSection = navToothIndex;
        if (navGearImgLoaded) renderNavGearTexture(navToothIndex);
        updateMainContent(navToothIndex);
        navScrollCooldown = true;
        setTimeout(() => { navScrollCooldown = false; }, 420);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (navScrollCooldown) return;
        navToothIndex = ((navToothIndex - 1) + NUM_TEETH) % NUM_TEETH;
        navGearTargetAngle = navToothIndex * TOOTH_ANGLE;
        activeNavSection = navToothIndex;
        if (navGearImgLoaded) renderNavGearTexture(navToothIndex);
        updateMainContent(navToothIndex);
        navScrollCooldown = true;
        setTimeout(() => { navScrollCooldown = false; }, 420);
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      targetScrollProg = Math.min(1.0, targetScrollProg + 0.04);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      targetScrollProg = Math.max(0.0, targetScrollProg - 0.04);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Mouse Tracking
  // ─────────────────────────────────────────────────────────────
  const mouse = { screenX: 0, screenY: 0, worldX: 0, worldY: 0, isHovered: false, clientX: 0, clientY: 0 };
  const raycaster = new THREE.Raycaster();
  const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const planeIntersect = new THREE.Vector3();

  function onPointerMove(e) {
    mouse.isHovered = true;
    mouse.clientX = e.clientX;
    mouse.clientY = e.clientY;
    mouse.screenX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.screenY = -(e.clientY / window.innerHeight) * 2 + 1;

    // Nav hover zone = left ~42% of screen
    navActive = navGearVisible && (e.clientX < window.innerWidth * 0.42);

    if (smoothScrollProg < 0.10 && camera.position.z > 0.5) {
      raycaster.setFromCamera(new THREE.Vector2(mouse.screenX, mouse.screenY), camera);
      raycaster.ray.intersectPlane(mousePlane, planeIntersect);
      if (planeIntersect && isFinite(planeIntersect.x)) {
        mouse.worldX = planeIntersect.x;
        mouse.worldY = planeIntersect.y;
      }
    }

    // Tooth hover detection (screen-space)
    if (navGearVisible) {
      detectHoveredTooth(e.clientX, e.clientY);
    }
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', () => {
    mouse.isHovered = false;
    navActive = false;
    hoveredToothIndex = -1;
    tooltipTargetFade = 0;
  });

  function getNavGearScreenCenter() {
    // Nav gear center in screen pixels
    // The gear is at world position (navGearWorldX, 0, navGearWorldZ)
    // Project to screen
    const v = new THREE.Vector3(navGearWorldX, 0, navGearWorldZ);
    v.project(camera);
    const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
    return { sx, sy };
  }

  function detectHoveredTooth(cx, cy) {
    if (!navGearVisible) { hoveredToothIndex = -1; tooltipTargetFade = 0; return; }
    const { sx, sy } = getNavGearScreenCenter();

    // Nav gear radius in screen pixels
    // navGearGroup scale = navGearScale world units, project diff
    const edgeWorld = new THREE.Vector3(navGearWorldX + navGearScale, 0, navGearWorldZ);
    edgeWorld.project(camera);
    const edgeSx = (edgeWorld.x * 0.5 + 0.5) * window.innerWidth;
    const gearRadiusPx = Math.abs(edgeSx - sx);

    const iconR = gearRadiusPx * 0.88; // matches texture iconR ratio
    const toothPickR = gearRadiusPx * 0.16;

    for (let i = 0; i < NUM_TEETH; i++) {
      const ang = (i * TOOTH_ANGLE) + navGearCurrentAngle - Math.PI / 2;
      const ix = sx + Math.cos(ang) * iconR;
      const iy = sy + Math.sin(ang) * iconR;

      const dx = cx - ix, dy = cy - iy;
      if (dx * dx + dy * dy < toothPickR * toothPickR) {
        if (hoveredToothIndex !== i) {
          hoveredToothIndex = i;
          tooltipTargetFade = 1;
          if (navTooltipEl) {
            navTooltipEl.textContent = NAV_SECTIONS[i].name;
          }
        }
        return;
      }
    }

    hoveredToothIndex = -1;
    tooltipTargetFade = 0;
  }

  // Click on a particle
  const clickProjectVec = new THREE.Vector3();
  window.addEventListener('click', (e) => {
    if (smoothScrollProg > 0.15) return;
    if (e.target && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a, button'))) return;

    const posArr = particleGeometry.attributes.position.array;
    const pool = REST_PARTICLE_COUNT;
    let closestIndex = -1, closestDistSq = Infinity;
    const maxClickSq = 130 * 130;

    for (let i = 0; i < pool; i++) {
      const i3 = i * 3;
      clickProjectVec.set(posArr[i3], posArr[i3 + 1], posArr[i3 + 2]);
      clickProjectVec.project(camera);
      const sx = (clickProjectVec.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-clickProjectVec.y * 0.5 + 0.5) * window.innerHeight;
      const dx = sx - e.clientX, dy = sy - e.clientY;
      const dSq = dx * dx + dy * dy;
      if (dSq < closestDistSq) { closestDistSq = dSq; closestIndex = i; }
    }

    if (closestIndex !== -1 && closestDistSq <= maxClickSq) {
      triggerChain(closestIndex, 8 + Math.floor(Math.random() * 4), true);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Resize
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // 10. Beacon System
  // ─────────────────────────────────────────────────────────────
  let activeInScopeBeacon = null;
  const currentLookAt = new THREE.Vector3(0, 0, -10);
  const targetLookAt = new THREE.Vector3(0, 0, -10);
  let beaconDefs = [];

  function bindNodeEvents(node) {
    const card = node.querySelector('.beacon-card');
    if (!card || card._bound) return;
    card._bound = true;
    card.addEventListener('click', (e) => {
      if (e.target && e.target.tagName === 'A') return;
      card.classList.toggle('is-expanded');
      node.classList.toggle('is-focused');
    });
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      card.style.transform = `perspective(1000px) rotateX(${((-y / (rect.height / 2)) * 8).toFixed(2)}deg) rotateY(${((x / (rect.width / 2)) * 8).toFixed(2)}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  }

  function refreshBeaconDefs() {
    beaconDefs = [];
    document.querySelectorAll('.beacon-node').forEach(node => {
      const pIdx = parseInt(node.getAttribute('data-pidx'), 10) || 0;
      beaconDefs.push({ id: node.id, el: node, cardEl: node.querySelector('.beacon-card'), pIdx });
      bindNodeEvents(node);
    });
  }

  document.querySelectorAll('.beacon-node').forEach((node, idx) => {
    const pIdx = parseInt(node.getAttribute('data-pidx'), 10);
    if (!isNaN(pIdx)) configureBeaconParticle(pIdx, idx);
  });
  refreshBeaconDefs();

  // ─────────────────────────────────────────────────────────────
  // 11. Main content area update
  // ─────────────────────────────────────────────────────────────
  function updateMainContent(sectionIdx) {
    if (!mainContent) return;
    const section = NAV_SECTIONS[sectionIdx];
    const inner = mainContent.querySelector('.content-placeholder-inner');
    if (!inner) return;
    inner.querySelector('.cp-label').textContent = section.icon + '  ' + section.name;
    inner.querySelector('.cp-hint').textContent = 'Placeholder — content coming soon';
  }

  // ─────────────────────────────────────────────────────────────
  // 12. Helpers
  // ─────────────────────────────────────────────────────────────
  const currentCamPos = new THREE.Vector3(0, 0, 6);
  const targetCamPos = new THREE.Vector3(0, 0, 6);
  let tunnelRollAngle = 0;
  let lastTimestamp = 0;
  let currentRollSpeed = 0.06;

  function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  // Nav gear world position (computed once per frame)
  let navGearWorldX = 0;
  let navGearWorldZ = 0;
  let navGearScale = 1;

  // ─────────────────────────────────────────────────────────────
  // 13. Animation Loop
  // ─────────────────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();
    const posAttr = particleGeometry.attributes.position;
    const posArr = posAttr.array;

    // ── Scroll interpolation ──────────────────────────────────
    smoothScrollProg += (targetScrollProg - smoothScrollProg) * 0.14;

    // ── Tunnel phases ─────────────────────────────────────────
    const tZoom     = smoothstep(0.0,  0.38, smoothScrollProg);
    const tAssemble = smoothstep(0.22, 0.55, smoothScrollProg);
    const tunnelDensityProg = smoothstep(0.15, 0.48, smoothScrollProg);
    const tTravel   = smoothstep(0.38, 1.0,  smoothScrollProg);

    // ── Tunnel exit & Nav gear trigger ────────────────────────
    const tunnelExitProg = smoothstep(0.92, 1.0, smoothScrollProg);

    if (smoothScrollProg >= 0.98 && !navGearVisible) {
      navGearVisible = true;
      // Snap camera to fixed viewing position
      targetScrollProg = 1.0;
      if (mainContent) mainContent.classList.add('visible');
      updateMainContent(0);
    }

    // ── Active particle count ─────────────────────────────────
    // After tunnel exit, disperse particles back to resting count
    let activeCount;
    if (tunnelExitProg > 0) {
      // Gradually reduce particle count back to resting
      const disperseCount = Math.floor(
        REST_PARTICLE_COUNT + (PARTICLE_COUNT - REST_PARTICLE_COUNT) * (1 - tunnelExitProg)
      );
      activeCount = disperseCount;
    } else {
      activeCount = Math.floor(REST_PARTICLE_COUNT + (PARTICLE_COUNT - REST_PARTICLE_COUNT) * tunnelDensityProg);
    }
    particleGeometry.setDrawRange(0, activeCount);

    // ── Fade in tunnel particle colors ────────────────────────
    const colAttr = particleGeometry.attributes.color;
    const colArr = colAttr.array;
    if (smoothScrollProg < 0.65 && tunnelExitProg < 0.1) {
      for (let i = REST_PARTICLE_COUNT; i < activeCount; i++) {
        const i3 = i * 3;
        colArr[i3]     = THREE.MathUtils.lerp(bgColor.r, targetColors[i3],     tunnelDensityProg);
        colArr[i3 + 1] = THREE.MathUtils.lerp(bgColor.g, targetColors[i3 + 1], tunnelDensityProg);
        colArr[i3 + 2] = THREE.MathUtils.lerp(bgColor.b, targetColors[i3 + 2], tunnelDensityProg);
      }
      colAttr.needsUpdate = true;
    }

    // ── Intro gear rotation (scroll-driven) ───────────────────
    gearGroup.rotation.z = -smoothScrollProg * (Math.PI * 4.2);

    // ── Camera position ───────────────────────────────────────
    let camTargetZ;
    if (navGearVisible) {
      // Lock camera after tunnel exit, slightly pulled back for 3D context
      const TUNNEL_TRAVEL_DIST = 52.0;
      camTargetZ = (6.0 * (1 - 1) - 0.15 * 1) - TUNNEL_TRAVEL_DIST + 2.0;
    } else {
      const TUNNEL_TRAVEL_DIST = 52.0;
      camTargetZ = (6.0 * (1 - tZoom) - 0.15 * tZoom) - (TUNNEL_TRAVEL_DIST * tTravel);
    }
    const camTargetX = gearHoleWorldX * tZoom * (1 - tunnelExitProg);
    const camTargetY = gearHoleWorldY * tZoom * (1 - tunnelExitProg);
    targetCamPos.set(camTargetX, camTargetY, camTargetZ);

    // ── Look-at ───────────────────────────────────────────────
    const defaultLookX = gearHoleWorldX * tZoom * (1 - tunnelExitProg);
    const defaultLookY = gearHoleWorldY * tZoom * (1 - tunnelExitProg);
    const defaultLookZ = camTargetZ - 10.0;

    // Beacon scoping
    let inScopeBeacon = null, maxWeight = 0;

    if (smoothScrollProg >= 0.44 && !navGearVisible) {
      for (let b = 0; b < beaconDefs.length; b++) {
        const beacon = beaconDefs[b];
        const card = beacon.cardEl || (beacon.el ? beacon.el.querySelector('.beacon-card') : null);
        const p3 = beacon.pIdx * 3;
        const pZ = posArr[p3 + 2];
        const distZ = camTargetZ - pZ;
        const inScope = (distZ >= 0.8 && distZ <= 6.8);

        if (inScope) {
          const normDist = (distZ - 0.8) / (6.8 - 0.8);
          const weight = Math.sin(normDist * Math.PI);
          if (weight > maxWeight) { maxWeight = weight; inScopeBeacon = beacon; }
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
    } else if (navGearVisible) {
      // Hide all beacon cards after tunnel exit
      for (let b = 0; b < beaconDefs.length; b++) {
        const card = beaconDefs[b].cardEl;
        if (card && card.classList.contains('is-expanded')) {
          card.classList.remove('is-expanded');
          if (beaconDefs[b].el) beaconDefs[b].el.classList.remove('is-focused');
        }
      }
    } else {
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
      const bpX = posArr[bp3], bpY = posArr[bp3 + 1];
      let side = 'face-right';
      if (inScopeBeacon.el.classList.contains('face-left')) side = 'face-left';
      else if (inScopeBeacon.el.classList.contains('face-down')) side = 'face-down';
      else if (inScopeBeacon.el.classList.contains('face-up')) side = 'face-up';

      let cardOffX = 0, cardOffY = 0;
      if (side === 'face-right') cardOffX = 0.22;
      else if (side === 'face-left') cardOffX = -0.22;
      else if (side === 'face-down') cardOffY = -0.20;
      else if (side === 'face-up') cardOffY = 0.20;

      const panFactor = maxWeight * 0.45;
      targetLookAt.set(
        defaultLookX + (bpX + cardOffX - defaultLookX) * panFactor,
        defaultLookY + (bpY + cardOffY - defaultLookY) * panFactor,
        defaultLookZ
      );
    } else {
      targetLookAt.set(defaultLookX, defaultLookY, defaultLookZ);
    }

    currentCamPos.lerp(targetCamPos, 0.14);
    currentLookAt.lerp(targetLookAt, 0.08);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    // ── Intro animations ──────────────────────────────────────
    const introProgress = Math.min(1.0, elapsedTime / 1.1);
    const introEase = 1.0 - Math.pow(1.0 - introProgress, 3);

    const portalExpansion = 1.0 + smoothstep(0.22, 0.38, smoothScrollProg) * 2.2;
    const gearScale = baseGearWorldRadius * portalExpansion * introEase;
    gearGroup.scale.set(gearScale, gearScale, gearScale);

    if (lockupText) {
      const textOpacity = Math.max(0, 1.0 - tZoom * 2.8);
      lockupText.style.opacity = textOpacity.toFixed(3);
    }

    const gearOpacity = Math.max(0, 1.0 - smoothstep(0.24, 0.38, smoothScrollProg)) * introEase;
    gearMaterial.opacity = gearOpacity;
    gearBackMaterial.opacity = gearOpacity * 0.8;
    gearGroup.visible = (smoothScrollProg < 0.385);

    // ── Nav Gear (Post-tunnel) ────────────────────────────────
    if (navGearVisible) {
      // Slide in from left
      navGearSlideIn = Math.min(1.0, navGearSlideIn + 0.025);
      const slideEase = 1.0 - Math.pow(1.0 - navGearSlideIn, 4);

      // Gear scale: roughly 85% of viewport height in world units
      const camZ = camera.position.z;
      const viewH = 2 * Math.abs(camZ) * Math.tan((camera.fov * Math.PI) / 360);
      navGearScale = viewH * 0.85;

      // Center is off-screen left so only 2/5 is visible
      // 2/5 of diameter visible means center is -3/5 * radius from left edge
      const viewW = viewH * camera.aspect;
      const leftEdge = -viewW / 2;
      // visible width of gear = 2/5 * diameter = 4/5 * radius
      // so gear center x = leftEdge - (3/5 * radius)
      // But we want 2/5 of diameter = 2/5 * 2R = 4R/5 to show
      // center at: leftEdge - navGearScale * 0.6  (clipped left)
      // Actually: left edge is at -viewW/2 in world. Gear center at leftEdge - R*0.6
      // Slide: start fully off screen, then settle to final pos
      const finalGearX = leftEdge - navGearScale * 0.6;
      const startGearX = leftEdge - navGearScale * 2.0;
      navGearWorldX = startGearX + (finalGearX - startGearX) * slideEase;
      navGearWorldZ = camera.position.z - 2.5; // slightly in front of camera

      navGearGroup.position.set(navGearWorldX, 0, navGearWorldZ);
      navGearGroup.scale.set(navGearScale, navGearScale, navGearScale * 0.1);
      navGearGroup.visible = true;

      // Smooth angle lerp with snap
      const angleDiff = navGearTargetAngle - navGearCurrentAngle;
      navGearCurrentAngle += angleDiff * 0.14;
      if (Math.abs(angleDiff) < 0.0008) navGearCurrentAngle = navGearTargetAngle;

      navGearGroup.rotation.z = navGearCurrentAngle;

      // Tooltip fade
      tooltipFade += (tooltipTargetFade - tooltipFade) * 0.12;
      if (navTooltipEl) {
        if (tooltipFade > 0.02 && hoveredToothIndex >= 0) {
          navTooltipEl.style.opacity = tooltipFade.toFixed(3);
          navTooltipEl.style.visibility = 'visible';

          // Position near cursor
          const tx = mouse.clientX + 18;
          const ty = mouse.clientY - 32;
          navTooltipEl.style.left = tx + 'px';
          navTooltipEl.style.top = ty + 'px';
        } else {
          navTooltipEl.style.opacity = '0';
          navTooltipEl.style.visibility = 'hidden';
        }
      }
    } else {
      navGearGroup.visible = false;
      if (navTooltipEl) { navTooltipEl.style.opacity = '0'; navTooltipEl.style.visibility = 'hidden'; }
    }

    // ── Particle positions ────────────────────────────────────
    const delta = (lastTimestamp === 0) ? 0.016 : Math.min(0.05, elapsedTime - lastTimestamp);
    lastTimestamp = elapsedTime;

    const targetRollSpeed = (inScopeBeacon && maxWeight > 0.25) ? (0.016 + (1.0 - maxWeight) * 0.045) : 0.065;
    currentRollSpeed += (targetRollSpeed - currentRollSpeed) * 0.04;
    tunnelRollAngle += delta * currentRollSpeed;

    const mouseActive = mouse.isHovered && smoothScrollProg < 0.08;
    const mouseStrength = 0.035 * (1.0 - smoothstep(0.0, 0.08, smoothScrollProg));
    const interactionRadiusSq = 1.1 * 1.1;

    if (navGearVisible && tunnelExitProg >= 1.0) {
      // After full tunnel exit: drift particles back to resting ambient positions
      for (let i = 0; i < REST_PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const ambientX = Math.sin(elapsedTime * driftSpeed[i] + phaseX[i]) * 0.04;
        const ambientY = Math.cos(elapsedTime * driftSpeed[i] + phaseY[i]) * 0.04;
        const ambientZ = Math.sin(elapsedTime * driftSpeed[i] * 0.8 + phaseZ[i]) * 0.03;
        posArr[i3]     = basePositions[i3]     + ambientX;
        posArr[i3 + 1] = basePositions[i3 + 1] + ambientY;
        posArr[i3 + 2] = basePositions[i3 + 2] + ambientZ;
      }
    } else if (tAssemble >= 0.98) {
      for (let i = 0; i < activeCount; i++) {
        const i3 = i * 3;
        const tunAngle = tunnelAngle[i] + tunnelRollAngle;
        const r = tunnelRadius[i];
        posArr[i3]     = gearHoleWorldX + Math.cos(tunAngle) * r;
        posArr[i3 + 1] = gearHoleWorldY + Math.sin(tunAngle) * r;
        posArr[i3 + 2] = -0.2 - tunnelBaseZ[i];
      }
    } else if (tAssemble <= 0.02) {
      for (let i = 0; i < REST_PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const ambientX = Math.sin(elapsedTime * driftSpeed[i] + phaseX[i]) * 0.04;
        const ambientY = Math.cos(elapsedTime * driftSpeed[i] + phaseY[i]) * 0.04;
        const ambientZ = Math.sin(elapsedTime * driftSpeed[i] * 0.8 + phaseZ[i]) * 0.03;

        if (mouseActive) {
          const curPx = basePositions[i3] + mouseDisplacements[i3];
          const curPy = basePositions[i3 + 1] + mouseDisplacements[i3 + 1];
          const dx = curPx - mouse.worldX, dy = curPy - mouse.worldY;
          const distSq = dx * dx + dy * dy;
          if (distSq < interactionRadiusSq && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const force = (1.0 - dist / 1.1) * mouseStrength;
            mouseDisplacements[i3]     += (dx / dist) * force;
            mouseDisplacements[i3 + 1] += (dy / dist) * force;
          }
        }
        mouseDisplacements[i3]     *= 0.90;
        mouseDisplacements[i3 + 1] *= 0.90;

        posArr[i3]     = basePositions[i3]     + ambientX + mouseDisplacements[i3];
        posArr[i3 + 1] = basePositions[i3 + 1] + ambientY + mouseDisplacements[i3 + 1];
        posArr[i3 + 2] = basePositions[i3 + 2] + ambientZ;
      }
    } else {
      // Tunnel assembly blend
      for (let i = 0; i < activeCount; i++) {
        const i3 = i * 3;
        const ambientX = (i < REST_PARTICLE_COUNT) ? Math.sin(elapsedTime * driftSpeed[i] + phaseX[i]) * 0.04 : 0;
        const ambientY = (i < REST_PARTICLE_COUNT) ? Math.cos(elapsedTime * driftSpeed[i] + phaseY[i]) * 0.04 : 0;
        const ambientZ = (i < REST_PARTICLE_COUNT) ? Math.sin(elapsedTime * driftSpeed[i] * 0.8 + phaseZ[i]) * 0.03 : 0;

        const restX = basePositions[i3]     + ambientX;
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

    // ── Constellation chains ───────────────────────────────────
    let lineIdx = 0, sparkIdx = 0;
    const lPos = lineGeometry.attributes.position.array;
    const lCol = lineGeometry.attributes.color.array;
    const sPos = sparkGeometry.attributes.position.array;
    const sCol = sparkGeometry.attributes.color.array;

    const linkFade = navGearVisible ? 0 : (1.0 - tAssemble) * (1.0 - smoothstep(0.10, 0.28, smoothScrollProg));

    if (linkFade > 0.02) {
      if (elapsedTime >= activeChain.nextPickTime) {
        const startP = Math.floor(Math.random() * REST_PARTICLE_COUNT);
        triggerChain(startP, 3 + Math.floor(Math.random() * 2), false);
      }

      if (activeChain.nodes.length >= 2) {
        const numSegments = activeChain.nodes.length - 1;
        for (let s = 0; s < numSegments; s++) {
          const segAge = elapsedTime - (activeChain.startTime + s * activeChain.segmentDelay);
          if (segAge >= 0 && segAge < activeChain.segmentDuration) {
            const normAge = segAge / activeChain.segmentDuration;
            const pulse = Math.sin(normAge * Math.PI);
            const lineAlpha = pulse * linkFade;

            const n1 = activeChain.nodes[s] * 3;
            const n2 = activeChain.nodes[s + 1] * 3;

            if (lineIdx < MAX_CHAIN_SEGMENTS) {
              const baseIdx = lineIdx * 6;
              lPos[baseIdx] = posArr[n1]; lPos[baseIdx+1] = posArr[n1+1]; lPos[baseIdx+2] = posArr[n1+2];
              lPos[baseIdx+3] = posArr[n2]; lPos[baseIdx+4] = posArr[n2+1]; lPos[baseIdx+5] = posArr[n2+2];
              const rC = 0.12*lineAlpha, gC = 0.52*lineAlpha, bC = 0.92*lineAlpha;
              lCol[baseIdx] = rC; lCol[baseIdx+1] = gC; lCol[baseIdx+2] = bC;
              lCol[baseIdx+3] = rC; lCol[baseIdx+4] = gC; lCol[baseIdx+5] = bC;
              lineIdx++;
            }

            if (sparkIdx < MAX_SPARKS) {
              const spBase = sparkIdx * 3;
              sPos[spBase] = posArr[n2]; sPos[spBase+1] = posArr[n2+1]; sPos[spBase+2] = posArr[n2+2];
              sCol[spBase] = 0.15*lineAlpha; sCol[spBase+1] = 0.75*lineAlpha; sCol[spBase+2] = 1.0*lineAlpha;
              sparkIdx++;
            }

            if (s === 0 && sparkIdx < MAX_SPARKS) {
              const spBase = sparkIdx * 3;
              sPos[spBase] = posArr[n1]; sPos[spBase+1] = posArr[n1+1]; sPos[spBase+2] = posArr[n1+2];
              sCol[spBase] = 0.15*lineAlpha; sCol[spBase+1] = 0.75*lineAlpha; sCol[spBase+2] = 1.0*lineAlpha;
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

    // ── Beacon card projections ────────────────────────────────
    const beaconProjVec = new THREE.Vector3();
    for (let b = 0; b < beaconDefs.length; b++) {
      const beacon = beaconDefs[b];
      if (!beacon.el) continue;

      if (navGearVisible) {
        beacon.el.style.opacity = '0';
        beacon.el.style.visibility = 'hidden';
        beacon.el.style.pointerEvents = 'none';
        continue;
      }

      const p3 = beacon.pIdx * 3;
      beaconProjVec.set(posArr[p3], posArr[p3+1], posArr[p3+2]);
      beaconProjVec.project(camera);

      const distZ = camera.position.z - posArr[p3+2];
      const isThisFocused = (activeInScopeBeacon && activeInScopeBeacon.pIdx === beacon.pIdx);

      if (smoothScrollProg < 0.40 || distZ < 0.35 || distZ > 24.0 || beaconProjVec.z > 1.0) {
        beacon.el.style.opacity = '0';
        beacon.el.style.visibility = 'hidden';
        beacon.el.style.pointerEvents = 'none';
      } else {
        const farFade = smoothstep(24.0, 12.0, distZ);
        const nearFade = smoothstep(0.35, 1.4, distZ);
        const tunnelFade = smoothstep(0.40, 0.52, smoothScrollProg);
        let alpha = farFade * nearFade * tunnelFade;
        if (isThisFocused) alpha = 1.0;
        else if (activeInScopeBeacon) alpha *= 0.35;

        const scale = THREE.MathUtils.clamp(4.6 / (distZ + 1.6), 0.70, 1.15);
        const sx = (beaconProjVec.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-beaconProjVec.y * 0.5 + 0.5) * window.innerHeight;
        const padX = Math.min(220, window.innerWidth * 0.22);
        const padY = Math.min(180, window.innerHeight * 0.22);
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
