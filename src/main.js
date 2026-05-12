import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// --------------------------------------------------------
// 1. Scene, Camera, Renderer Setup
// --------------------------------------------------------
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dcedd0'); // Pale green background
scene.fog = new THREE.Fog('#dcedd0', 10, 60); // Matches background

const CAMERA_HEIGHT = 8; // Adjust this to change "eye level"

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, CAMERA_HEIGHT, -5); // Start slightly back and elevated at eye-level
camera.lookAt(0, CAMERA_HEIGHT, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// --------------------------------------------------------
// 2. Asset Generation (Placeholders)
// --------------------------------------------------------
// Helper to create a simple colored texture
function createPlaceholderTexture(colorText, textLabel) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = colorText;
  ctx.fillRect(0, 0, 512, 512);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '60px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(textLabel, 256, 256);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Helper to create a soft blurry glow texture
function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');     // bright warm center
  gradient.addColorStop(0.2, 'rgba(255, 240, 150, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 220, 100, 0.5)');
  gradient.addColorStop(0.7, 'rgba(255, 200, 80, 0.15)');
  gradient.addColorStop(1, 'rgba(255, 180, 60, 0)');       // fully transparent edge

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const glowTexture = createGlowTexture();

const textureLoader = new THREE.TextureLoader();

const tree1Tex = textureLoader.load('/assets/tree1.png');
const tree2_1Tex = textureLoader.load('/assets/tree2_1.png');
const tree2_2Tex = textureLoader.load('/assets/tree2_2.png');
const tree2_3Tex = textureLoader.load('/assets/tree2_3.png');
const tree3Tex = textureLoader.load('/assets/tree3.png');
const tree4Tex = textureLoader.load('/assets/tree4.png');

const bush1Tex = textureLoader.load('/assets/bush1.png');
const bush2Tex = textureLoader.load('/assets/bush2.png');
const bush3Tex = textureLoader.load('/assets/bush3.png');

const stone1Tex = textureLoader.load('/assets/stone1.png');
const stone2Tex = textureLoader.load('/assets/stone2.png');
const stone3Tex = textureLoader.load('/assets/stone3.png');
const dragonflyTex = textureLoader.load('/assets/dragonfly.png');

const materials = {
  trees: {
    huge: new THREE.MeshBasicMaterial({ map: tree1Tex, transparent: true, side: THREE.DoubleSide }),
    giant: new THREE.MeshBasicMaterial({ map: tree4Tex, transparent: true, side: THREE.DoubleSide }),
    large: [
      new THREE.MeshBasicMaterial({ map: tree2_1Tex, transparent: true, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ map: tree2_2Tex, transparent: true, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ map: tree2_3Tex, transparent: true, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ map: tree2_1Tex, transparent: true, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ map: tree2_2Tex, transparent: true, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ map: tree2_3Tex, transparent: true, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ map: tree3Tex, transparent: true, side: THREE.DoubleSide })
    ]
  },
  bushes: [
    new THREE.MeshBasicMaterial({ map: bush1Tex, transparent: true, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ map: bush2Tex, transparent: true, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ map: bush3Tex, transparent: true, side: THREE.DoubleSide })
  ],
  stones: [
    new THREE.MeshBasicMaterial({ map: stone1Tex, transparent: true, side: THREE.DoubleSide }), // Largest stone
    new THREE.MeshBasicMaterial({ map: stone2Tex, transparent: true, side: THREE.DoubleSide }), // Medium stone
    new THREE.MeshBasicMaterial({ map: stone3Tex, transparent: true, side: THREE.DoubleSide })  // Smallest stone
  ],
  interactable: new THREE.MeshBasicMaterial({ map: createPlaceholderTexture('#ff9f1c', 'CLICK ME'), transparent: true, side: THREE.DoubleSide }),
  dragonflyInteractable: new THREE.MeshBasicMaterial({ map: dragonflyTex, transparent: true, side: THREE.DoubleSide }),
};

const planes = [];
const interactables = [];

// Seeded Random Number Generator for deterministic placements
let seed = 12345;
function random() {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Helper to add a plane
function addPlane(material, x, y, z, scaleX, scaleY, isInteractable = false, interactableId = null) {
  const geometry = new THREE.PlaneGeometry(10 * Math.abs(scaleX), 10 * scaleY);
  // Clone the material so each plane has its own opacity!
  // This prevents the opacity fading bug where fading one object fades all objects sharing the material.
  const clonedMat = material.clone();
  clonedMat.depthWrite = false;
  const mesh = new THREE.Mesh(geometry, clonedMat);
  
  if (scaleX < 0) {
    mesh.scale.x = -1; // Flip horizontally
  }
  
  // Dynamically update aspect ratio once the texture fully loads
  if (clonedMat.map && clonedMat.map.image) {
    const aspect = clonedMat.map.image.width / clonedMat.map.image.height;
    mesh.scale.x = (scaleX < 0 ? -1 : 1) * aspect;
  } else if (clonedMat.map) {
    // If not loaded yet, wait for it
    // In Three.js, you can't easily listen to texture load after it's returned by load() 
    // unless you poll or hook into the original load callback. We will check it periodically until it's ready.
    const checkAspect = setInterval(() => {
      if (clonedMat.map.image && clonedMat.map.image.width) {
        const aspect = clonedMat.map.image.width / clonedMat.map.image.height;
        mesh.scale.x = (scaleX < 0 ? -1 : 1) * aspect;
        clearInterval(checkAspect);
      }
    }, 100);
  }

  mesh.position.set(x, y, z);
  mesh.userData.baseX = x;
  mesh.userData.baseY = y;
  
  // Make planes always face the camera
  mesh.lookAt(x, y, 0); 
  
  scene.add(mesh);
  planes.push(mesh);
  
  if (isInteractable) {
    mesh.userData = { id: interactableId, zStop: z, baseX: x, baseY: y, baseRotZ: mesh.rotation.z };
    
    // Create a blurry glow halo behind the object
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      opacity: 0,
      depthWrite: false,
      depthTest: false
    });

    const glowGeometry = new THREE.PlaneGeometry(10 * Math.abs(scaleX) * 1.8, 10 * scaleY * 1.8);
    const glowMesh = new THREE.Mesh(glowGeometry, glowMat);
    glowMesh.position.z = -0.3; // behind the object
    mesh.add(glowMesh);
    
    mesh.userData.glowMesh = glowMesh;
    
    interactables.push(mesh);
  }
}

// Helper to calculate grounded Y position.
// By adding half of the actual plane height (5 * scaleY) to the ground's Y equation,
// the bottom edge of the plane perfectly anchors to the rising slope.
const GROUND_SLOPE = 0.2;
const GROUND_OFFSET = -2;
function getGroundedY(z, scaleY) {
  const groundY = z * GROUND_SLOPE;
  return groundY + (5 * Math.abs(scaleY)) + GROUND_OFFSET;
}

// --------------------------------------------------------
// Asset Placement & Hierarchy
// --------------------------------------------------------

// 1. Trees (Most Abundant - Z: 5 to 125, 2 trees per Z for density)
function placeTree(x, z) {
  const r = random();
  let mat, scale;
  if (r > 0.97) {
    // tree4 — giant, very rare
    mat = materials.trees.giant;
    scale = 5.0 + random() * 2.0;
  } else if (r > 0.85) {
    // tree1 — huge
    mat = materials.trees.huge;
    scale = 3.0 + random() * 1.0;
  } else {
    mat = materials.trees.large[Math.floor(random() * materials.trees.large.length)];
    scale = 1.8 + random() * 0.8;
  }
  let flipX = random() > 0.5 ? 1 : -1;
  let y = getGroundedY(z, scale);
  addPlane(mat, x, y, z, scale * flipX, scale);
}

for (let z = 5; z <= 125; z += 1.5) {
  placeTree(-(8 + random() * 40), z);
  placeTree(8 + random() * 40, z);
  if (random() > 0.7) {
    placeTree((random() > 0.5 ? 1 : -1) * (55 + random() * 25), z);
  }
}

// 2. Bushes (Medium Abundance - Z: 2 to 120)
for (let z = 2; z <= 120; z += 4) {
  let x = (random() - 0.5) * 70;
  if (Math.abs(x) < 6) {
    x = 6 * Math.sign(x || 1) + (random() * 4 * Math.sign(x || 1));
  }

  let mat = materials.bushes[Math.floor(random() * materials.bushes.length)];
  let scale = 0.3 + random() * 0.2; // Smaller bushes
  let flipX = random() > 0.5 ? 1 : -1;

  let y = getGroundedY(z, scale);
  addPlane(mat, x, y, z, scale * flipX, scale);
}

// 3. Stones (Least Abundant - Z: 4 to 115)
for (let z = 4; z <= 115; z += 8) {
  let x = (random() - 0.5) * 50;
  if (Math.abs(x) < 4) {
    x = 4 * Math.sign(x || 1) + (random() * 3 * Math.sign(x || 1));
  }

  let randVal = random();
  let mat, scale;
  
  // Stone sizes based on type (Reverted to the proper scaled-down size)
  if (randVal > 0.7) {
    mat = materials.stones[0]; // stone 1
    scale = 0.25 + random() * 0.1;
  } else if (randVal > 0.3) {
    mat = materials.stones[1]; // stone 2
    scale = 0.15 + random() * 0.05;
  } else {
    mat = materials.stones[2]; // stone 3
    scale = 0.08 + random() * 0.04;
  }
  
  let flipX = random() > 0.5 ? 1 : -1;

  let y = getGroundedY(z, scale);
  addPlane(mat, x, y, z, scale * flipX, scale);
}

// Add Interactables at specific stops
// CRITICAL FIX: The camera needs to stop BEFORE the object, otherwise the camera clips inside it and it fades out/goes off-screen.
// We will set the camera to lock 10 units in front of the actual object.
const interactableData = [
  { id: 'phyllotaxis',   z: 20,  x: -5, scale: 0.5,  title: 'Phyllotaxis',         description: 'The mathematical arrangement of leaves around a stem — nature\'s spiral geometry, from sunflower heads to pine cones.' },
  { id: 'dragonfly',     z: 34,  x: 7,  scale: 0.4,  title: 'Voronoi Noise',       description: 'A generative pattern found in dragonfly wings, giraffe spots, and cracked mud — nature\'s way of partitioning space through Voronoi tessellation.' },
  { id: 'fermat',        z: 50,  x: -6, scale: 0.5,  title: "Fermat's Spiral",      description: 'The golden angle governs seed placement in a sunflower — a perfect mathematical spiral. Mouse disturbs the order, seeds scatter, then drift home.' },
  { id: 'tessellation',  z: 64,  x: 5,  scale: 0.5,  title: 'Tessellation',         description: 'Hexagonal honeycomb geometry — nature\'s perfect packing. Bees built the most efficient structure millions of years before mathematicians discovered it.' },
  { id: 'nectarguides',  z: 78,  x: -6, scale: 0.45, title: 'Nectar Guides',        description: 'Ultraviolet patterns on petals invisible to the human eye — nature\'s landing strips guiding pollinators to their reward.' },
  { id: 'meanders',      z: 90,  x: 6,  scale: 0.45, title: 'Meanders',             description: 'The sinuous curves carved by rivers over millennia — a universal pattern of flowing water shaping the landscape.' },
  { id: 'dendro',        z: 100, x: -5, scale: 0.45, title: 'Dendrochronology',     description: 'The story of time written in tree rings — each ring a record of seasons, fires, droughts, and centuries of a tree\'s life.' },
  { id: 'crownshyness',  z: 110, x: 5,  scale: 0.5,  title: 'Crown Shyness',        description: 'The phenomenon where tree crowns avoid touching, creating a delicate web of gaps in the canopy — arboreal boundaries.' }
];

interactableData.forEach(obj => {
  let cameraLockZ = obj.z - 11; // Camera locks 11 units in front (was 8) so it stays more on-screen
  let meshY = (cameraLockZ * GROUND_SLOPE) + CAMERA_HEIGHT;
  const materialToUse = obj.id === 'dragonfly' ? materials.dragonflyInteractable : materials.interactable;
  
  // Create mesh via addPlane to benefit from aspect ratio logic
  addPlane(materialToUse, obj.x, meshY, obj.z, obj.scale, obj.scale, true, obj.id);
  
  // Fix zStop to cameraLockZ so the camera stops IN FRONT of the object (not inside it)
  planes[planes.length - 1].userData.zStop = cameraLockZ;
});

// --------------------------------------------------------
// 3. ScrollTrigger & Animation
// --------------------------------------------------------

// Max Z distance camera will travel (Stops before the Layer E backdrop)
const maxZ = 120;

// Update scroll container height to ensure enough scroll space
document.querySelector('.scroll-content').style.height = `${maxZ * 100}px`;

// Welcome panel fade-out on scroll
const welcomePanel = document.getElementById('welcome-panel');
ScrollTrigger.create({
  trigger: '#scroll-container',
  start: 'top top',
  end: '+=300',
  onUpdate: (self) => {
    welcomePanel.style.opacity = 1 - self.progress;
  }
});

// Create a GSAP timeline linked to scroll
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '#scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1, // Smooth scrubbing
  }
});

// Animate camera Z and Y
// We will build the timeline in segments to create "slow zones" near interactables
let currentZ = -5; // Updated to match new starting position
const interactableStops = interactables.map(i => i.userData.zStop).sort((a,b) => a-b);

interactableStops.forEach(stopZ => {
  // Move to the next stop
  tl.to(camera.position, {
    z: stopZ,
    y: (stopZ * GROUND_SLOPE) + CAMERA_HEIGHT,
    ease: 'none',
    duration: stopZ - currentZ // proportional duration
  });
  
  // "Lock" the scroll by adding an empty tween (camera stays still while user keeps scrolling for a bit)
  tl.to(camera.position, {
    duration: 5 // This represents the 'pinned' duration
  });
  
  currentZ = stopZ;
});

// Move to the very end after the last stop
tl.to(camera.position, {
  z: maxZ,
  y: (maxZ * GROUND_SLOPE) + CAMERA_HEIGHT,
  ease: 'none',
  duration: maxZ - currentZ
});




// --------------------------------------------------------
// 4. Raycasting & Interaction
// --------------------------------------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Track which interactable is currently "active" based on camera proximity
let activeInteractable = null;

window.addEventListener('mousemove', (event) => {
  // Normalize mouse coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('click', () => {
  if (activeInteractable) {
    openModal(activeInteractable.userData.id);
  }
});

// Modal Logic
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalContent = document.getElementById('modal-content');

function openModal(id) {
  // Stop scrolling
  document.body.style.overflow = 'hidden';
  
  modalOverlay.classList.remove('hidden');
  
  // Find the interactable data for this id
  const data = interactableData.find(d => d.id === id);
  const title = data ? data.title : 'Discovery';
  const description = data ? data.description : '';
  
  // Determine the media source
  let mediaHtml = '';
  let isPannable = false;
  
  if (id === 'dragonfly') {
    // Prerendered Voronoi video — pannable & zoomable
    isPannable = true;
    mediaHtml = `
      <div class="pannable-wrapper" id="pannable-wrapper">
        <video src="/animations/Voronoi.mp4" autoplay loop muted playsinline
          style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(1.4);pointer-events:none;">
        </video>
      </div>`;
  } else if (id === 'phyllotaxis') {
    // Prerendered Phyllotaxis video
    isPannable = true;
    mediaHtml = `
      <div class="pannable-wrapper" id="pannable-wrapper">
        <video src="/animations/Phyllotaxis.mp4" autoplay loop muted playsinline
          style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(1.4);pointer-events:none;">
        </video>
      </div>`;
  } else if (id === 'tessellation') {
    // p5.js sketch — Honeycomb Tessellation
    mediaHtml = `<iframe src="/animations/tessellation/index.html" style="width: 100%; height: 100%; border: none; background: transparent;"></iframe>`;
  } else if (id === 'fermat') {
    // p5.js sketch — Fermat's Spiral
    mediaHtml = `<iframe src="/animations/fermat/index.html" style="width: 100%; height: 100%; border: none; background: transparent;"></iframe>`;
  } else if (id === 'dendro') {
    // p5.js sketch — Dendrochronology
    mediaHtml = `<iframe src="/animations/dendro/index.html" style="width: 100%; height: 100%; border: none; background: transparent;"></iframe>`;
  } else {
    // Fallback placeholder for other phenomena
    mediaHtml = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#8b7355;font-family:'Playwrite IE',cursive;font-size:clamp(14px,2vw,20px);">${title} — coming soon</div>`;
  }
  
  modalContent.innerHTML = `
    <div class="modal-animation">
      ${mediaHtml}
    </div>
    <div class="modal-text">
      <h2 class="modal-title">${title}</h2>
      <p class="modal-description">${description}</p>
    </div>
  `;

  // Wire up pan & zoom for pannable videos
  if (isPannable) {
    const wrapper = document.getElementById('pannable-wrapper');
    const video = wrapper.querySelector('video');
    let panX = 0, panY = 0, scale = 1.4;
    let dragging = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0;

    const updateTransform = () => {
      // Clamp pan — video edges must stay within the wrapper
      const maxPanX = Math.max(0, (scale - 1) * wrapper.clientWidth / 2);
      const maxPanY = Math.max(0, (scale - 1) * wrapper.clientHeight / 2);
      panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
      panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
      video.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`;
    };

    const onMouseDown = (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startPanX = panX;
      startPanY = panY;
      wrapper.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!dragging) return;
      panX = startPanX + (e.clientX - startX);
      panY = startPanY + (e.clientY - startY);
      updateTransform();
    };

    const onMouseUp = () => {
      dragging = false;
      if (wrapper) wrapper.style.cursor = 'grab';
    };

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      scale = Math.max(1.0, Math.min(4, scale + delta));
      updateTransform();
    };

    wrapper.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    wrapper.addEventListener('wheel', onWheel, { passive: false });

    // Cleanup on close
    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      wrapper.removeEventListener('mousedown', onMouseDown);
      wrapper.removeEventListener('wheel', onWheel);
    };
    modalClose.addEventListener('click', cleanup, { once: true });
  }
}

modalClose.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
  modalContent.innerHTML = '';
  document.body.style.overflow = ''; // Restore scrolling
});

let currentLookX = 0;
let targetLookX = 0;
let currentFov = 75;
let targetFov = 75;

// --------------------------------------------------------
// 5. Render Loop
// --------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  // Update Opacity Fading (distance < 5)
  // For Layer A, we want it to be visible immediately, so we adjust the fade logic slightly
  planes.forEach(plane => {
    const dist = plane.position.z - camera.position.z;
    if (dist < 5 && dist > -10) {
      // Fade out
      plane.material.opacity = Math.max(0, dist / 5);
    } else if (dist >= 5) {
      plane.material.opacity = 1;
    } else {
      // Behind camera
      plane.material.opacity = 0;
    }
  });

  // Curtain push effect: trees slide away from camera on X axis
  const MAX_PUSH = 8;
  const PUSH_RANGE = 10;
  planes.forEach(plane => {
    if (!plane.userData.baseX || plane.userData.id) return;
    const dist = plane.position.z - camera.position.z;
    const absDist = Math.abs(dist);
    if (absDist < PUSH_RANGE) {
      const t = 1 - absDist / PUSH_RANGE;
      const strength = t * t * MAX_PUSH;
      const direction = Math.sign(plane.userData.baseX) || 1;
      plane.position.x = plane.userData.baseX + direction * strength;
    } else {
      plane.position.x = plane.userData.baseX;
    }
  });

  // Check raycaster intersections
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactables);
  
  activeInteractable = null;
  document.body.style.cursor = 'default';

  if (intersects.length > 0) {
    const object = intersects[0].object;
    // PROXIMITY CHECK: Only allow click if camera is near the object's Z stop
    const dist = object.userData.zStop - camera.position.z;
    if (Math.abs(dist) < 14 && object.material.opacity > 0) { // Increased interaction range so it's clickable earlier
      activeInteractable = object;
      document.body.style.cursor = 'pointer';
      
      // Basic highlight effect: We use scale scalar directly but must preserve aspect ratio later
      // The easiest way is to let the scale reset handle it, but wait: 
      // setScalar replaces the entire Vector3. 
      // We will adjust this below in the loop.
    }
  }

  // Handle wiggle and scale for interactables
  const time = Date.now() * 0.002;
  interactables.forEach(obj => {
    // Preserve base aspect ratio setup in addPlane
    let baseAspect = 1;
    if (obj.material.map && obj.material.map.image) {
      baseAspect = obj.material.map.image.width / obj.material.map.image.height;
    }

    if (obj === activeInteractable) {
      // Hover scale up slightly
      obj.scale.set(1.1 * baseAspect, 1.1, 1.1);
      
      // Activate blurry glow
      if (obj.userData.glowMesh) {
        obj.userData.glowMesh.material.opacity = 1.0;
      }
    } else {
      // Normal scale
      obj.scale.set(1.0 * baseAspect, 1.0, 1.0);
      
      // Deactivate blurry glow
      if (obj.userData.glowMesh) {
        obj.userData.glowMesh.material.opacity = 0;
      }
    }

    // Add dragonfly wiggle
    if (obj.userData.id === 'dragonfly') {
      // Light rotation wiggle back and forth, preserving its initial orientation
      obj.rotation.z = obj.userData.baseRotZ + Math.sin(time * 2) * 0.1;
      // Light floating up and down
      obj.position.y = obj.userData.baseY + Math.sin(time * 3) * 0.3;
    }
  });

  // Smooth Camera Focus on Hover
  if (activeInteractable) {
    // Look slightly towards the object (20% of its X offset)
    targetLookX = activeInteractable.userData.baseX * 0.2;
    // Slight zoom in
    targetFov = 72;
  } else {
    // Look straight ahead
    targetLookX = 0;
    // Normal zoom
    targetFov = 75;
  }

  // Lerp values for smoothness
  currentLookX += (targetLookX - currentLookX) * 0.05;
  currentFov += (targetFov - currentFov) * 0.05;

  // Apply FOV changes if significant
  if (Math.abs(camera.fov - currentFov) > 0.01) {
    camera.fov = currentFov;
    camera.updateProjectionMatrix();
  }

  // Make the camera look straight ahead (or slightly turned) instead of tilting down
  camera.lookAt(currentLookX, camera.position.y, camera.position.z + 100);

  renderer.render(scene, camera);
}

animate();

// Handle Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
