let rings = [];
let maxR;
let originX, originY;
let isDragging = false;
let pivotX = 0, pivotY = 0;
let targetCount = 6;
let mouseVX = 0, mouseVY = 0;
let prevMouseX = 0, prevMouseY = 0;

const GRAVITY = 0.25;
const NUM_POINTS = 100;
const MAX_PENDULUM_ANGLE = 1.5;
const MIN_SPACING_INITIAL = 1 / 20;
const MIN_SPACING_GAP = 1 / 40;

const WOOD_PALETTE = [
  '#F5DEB3', // wheat
  '#DEB887', // burlywood
  '#D2B48C', // tan
  '#C4A35A', // golden-brown
  '#B8860B', // dark goldenrod
  '#A0522D', // sienna
  '#8B6914', // dark brown
  '#6B4226', // coffee
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  colorMode(RGB, 255, 255, 255, 255);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  originX = width / 2;
  originY = height / 2;
  maxR = max(width, height) * 0.85;
  placeInitialRings(6);
  prevMouseX = mouseX;
  prevMouseY = mouseY;
}

function draw() {
  background('#f5efe0');

  originX = width / 2;
  originY = height / 2;

  mouseVX = mouseX - prevMouseX;
  mouseVY = mouseY - prevMouseY;
  prevMouseX = mouseX;
  prevMouseY = mouseY;

  if (!isDragging) {
    targetCount = floor(map(mouseX, 0, width, 6, 50));
    targetCount = constrain(targetCount, 6, 50);
    adjustRingCount(targetCount);
  }

  for (let r of rings) {
    r.homeX = originX + r.centerOffX;
    r.homeY = originY + r.centerOffY;
  }

  for (let r of rings) {
    r.physics(isDragging, pivotX, pivotY, mouseVX, mouseVY);
  }

  push();
  for (let r of rings) {
    r.draw();
  }
  pop();
}

function placeInitialRings(count) {
  rings = [];
  let minSpacing = maxR * MIN_SPACING_INITIAL;
  let attempts = 0;
  while (rings.length < count && attempts < 2000) {
    let r = random(0, maxR);
    let tooClose = false;
    for (let ring of rings) {
      if (abs(ring.radius - r) < minSpacing) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      rings.push(new Ring(r));
    }
    attempts++;
  }
}

function adjustRingCount(target) {
  while (rings.length > target) {
    let idx = floor(random(rings.length));
    rings.splice(idx, 1);
  }
  let attempts = 0;
  while (rings.length < target && attempts < 200) {
    addRingAtRandomGap();
    attempts++;
  }
}

function addRingAtRandomGap() {
  let minSpacing = maxR * MIN_SPACING_GAP;
  let existingRadii = rings.map(r => r.radius).sort((a, b) => a - b);
  let boundaries = [0, ...existingRadii, maxR];
  let gaps = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    let low = boundaries[i];
    let high = boundaries[i + 1];
    let size = high - low;
    if (size >= minSpacing * 2) {
      gaps.push({ low, high, size });
    }
  }

  if (gaps.length === 0) return;

  let totalSize = gaps.reduce((sum, g) => sum + g.size, 0);
  let pick = random(totalSize);
  let cumulative = 0;
  let chosen = gaps[0];
  for (let g of gaps) {
    cumulative += g.size;
    if (pick <= cumulative) {
      chosen = g;
      break;
    }
  }

  let margin = minSpacing;
  let rangeLow = chosen.low + margin;
  let rangeHigh = chosen.high - margin;
  if (rangeHigh <= rangeLow) rangeHigh = rangeLow + 0.1;
  let newRadius = random(rangeLow, rangeHigh);
  rings.push(new Ring(newRadius));
}

class Ring {
  constructor(radius) {
    this.radius = max(1, radius);
    this.noiseSeed = random(5000);
    this.noiseAmp = random(2, 5);
    this.localPoints = [];
    this.buildPoints();

    this.centerOffX = random(-8, 8);
    this.centerOffY = random(-8, 8);
    this.strokeW = random(5, 14);
    this.color = WOOD_PALETTE[floor(random(WOOD_PALETTE.length))];

    this.homeX = originX + this.centerOffX;
    this.homeY = originY + this.centerOffY;
    this.cx = this.homeX;
    this.cy = this.homeY;

    this.state = 'order';
    this.angle = 0;
    this.angVel = 0;
    this.selfRot = 0;
    this.selfRotVel = 0;
    this.vx = 0;
    this.vy = 0;
  }

  buildPoints() {
    this.localPoints = [];
    for (let i = 0; i < NUM_POINTS; i++) {
      let a = (i / NUM_POINTS) * TWO_PI;
      let nx = cos(a) * 0.8 + this.noiseSeed * 0.003;
      let ny = sin(a) * 0.8 + this.noiseSeed * 0.003;
      let n = noise(nx, ny) * 2 - 1;
      let r = this.radius + n * this.noiseAmp;
      this.localPoints.push({ a, r });
    }
  }

  physics(isPendulum, px, py, pivotVX, pivotVY) {
    let L = max(5, this.radius);

    if (isPendulum && this.state !== 'order') {
      this.state = 'drag';
    }

    if (this.state === 'drag') {
      // stronger inertia scaling: large rings swing much slower
      let inertia = 0.25 + 0.75 / (L / 80 + 1);

      // pendulum gravity
      let angAcc = (GRAVITY / max(1, L)) * sin(this.angle) * inertia;
      this.angVel += angAcc;

      // pivot-motion impulse: the faster/more-forcefully you drag,
      // the stronger the tangential kick.
      // impulse = tangential component of pivot velocity / L
      let impulse = -(pivotVX * cos(this.angle) + pivotVY * sin(this.angle)) / max(1, L);
      // scale by (1 - inertia*0.5) so smaller rings get more kick, large rings lag more
      this.angVel += impulse * 0.35 * (1 - inertia * 0.4);

      this.angVel *= 0.998; // very light damping — swing freely
      this.angle += this.angVel;

      // soft clamp so they don't spin like propellers, but allow wide swing
      this.angle = constrain(this.angle, -MAX_PENDULUM_ANGLE, MAX_PENDULUM_ANGLE);

      this.cx = px + sin(this.angle) * L;
      this.cy = py + cos(this.angle) * L;

      // Self-rotation during drag — more pronounced
      this.selfRotVel += this.angVel * 0.55;
      this.selfRotVel *= 0.96;
      this.selfRot += this.selfRotVel;
    } else if (this.state === 'fall') {
      this.vy += 0.5;
      this.vx += (this.homeX - this.cx) * 0.015;
      this.vy += (this.homeY - this.cy) * 0.015;
      this.vx *= 0.94;
      this.vy *= 0.94;
      this.cx += this.vx;
      this.cy += this.vy;

      // Bounce when passing homeY going downward
      if (this.cy > this.homeY && this.vy > 0) {
        this.vy *= -0.45;
        this.cy = this.homeY;
      }

      // Self-rotation decay during fall
      this.selfRotVel *= 0.88;
      this.selfRot += this.selfRotVel;

      // Settle
      if (dist(this.cx, this.cy, this.homeX, this.homeY) < 1 && abs(this.vx) < 0.1 && abs(this.vy) < 0.1) {
        this.cx = this.homeX;
        this.cy = this.homeY;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.angVel = 0;
        this.selfRot = 0;
        this.selfRotVel = 0;
        this.state = 'order';
      }
    } else {
      // ORDER state — completely static
      this.cx = this.homeX;
      this.cy = this.homeY;
      this.angle = 0;
      this.angVel = 0;
      this.selfRot = 0;
      this.selfRotVel = 0;
      this.vx = 0;
      this.vy = 0;
    }
  }

  draw() {
    stroke(this.color);
    strokeWeight(this.strokeW);

    beginShape();
    for (let pt of this.localPoints) {
      let a = pt.a + this.selfRot;
      vertex(
        this.cx + cos(a) * pt.r,
        this.cy + sin(a) * pt.r
      );
    }
    endShape(CLOSE);
  }
}

function mousePressed() {
  isDragging = true;
  pivotX = mouseX;
  pivotY = mouseY;

  let dragSpeed = sqrt(mouseVX * mouseVX + mouseVY * mouseVY);

  for (let r of rings) {
    r.state = 'drag';
    // initialise angle pointing roughly toward the ring's home so the snap is less jarring
    let baseAngle = atan2(r.homeX - pivotX, r.homeY - pivotY);
    r.angle = baseAngle + random(-0.15, 0.15);
    // faster mouse movement at press = bigger initial kick
    r.angVel = random(-0.04, 0.04) + (mouseVX * random(-0.002, 0.002));
    // extra kick scaled by drag speed for a more chaotic, forceful feel
    r.angVel += (random() > 0.5 ? 1 : -1) * dragSpeed * 0.003 / sqrt(r.radius / 50 + 1);
  }
  return false;
}

function mouseReleased() {
  isDragging = false;
  for (let r of rings) {
    if (r.state === 'drag') {
      let L = max(5, r.radius);
      r.vx = r.angVel * cos(r.angle) * L * 0.25;
      r.vy = -r.angVel * sin(r.angle) * L * 0.25;
      r.angle = 0;
      r.angVel = 0;
      r.state = 'fall';
    }
  }
  return false;
}

function mouseDragged() {
  pivotX = mouseX;
  pivotY = mouseY;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  maxR = max(width, height) * 0.85;
  originX = width / 2;
  originY = height / 2;
  for (let r of rings) {
    r.homeX = originX + r.centerOffX;
    r.homeY = originY + r.centerOffY;
    if (!isDragging) {
      r.cx = r.homeX;
      r.cy = r.homeY;
      r.vx = 0;
      r.vy = 0;
      r.angle = 0;
      r.angVel = 0;
      r.selfRot = 0;
      r.selfRotVel = 0;
      r.state = 'order';
    }
  }
}
