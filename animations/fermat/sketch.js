const GOLDEN_ANGLE = 137.508;
let seeds = [];
let idealPositions = [];
let removalQueue = [];
let maxR, seedCount, spiralTightness, seedLen;
let canvasMouseX = 0, canvasMouseY = 0;
let isDragging = false;
let dragPath = [];
const MAGNET_RADIUS = 140;
const MAGNET_STRENGTH = 0.7;
const SPRING_STIFFNESS = 0.003;
const DAMPING = 0.96;
const REGROW_DELAY = 3000;
const BUD_GROW_SPEED = 0.025;
const CUT_WIDTH = 6;

const MOUSE_POLARITY = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  colorMode(HSB, 360, 100, 100, 255);

  let size = min(windowWidth, windowHeight);
  maxR = size * 0.49;
  seedCount = 1600;
  spiralTightness = maxR / sqrt(seedCount - 1);
  seedLen = size * 0.012;

  for (let i = 0; i < seedCount; i++) {
    let angle = i * radians(GOLDEN_ANGLE);
    let radius = spiralTightness * sqrt(i);
    let ix = cos(angle) * radius;
    let iy = sin(angle) * radius;

    seeds.push({
      ix: ix,
      iy: iy,
      cx: ix,
      cy: iy,
      idealRadius: radius,
      angle: angle,
      polarity: random() > 0.5 ? 1 : -1,
      hue: random(50, 90),
      sat: random(55, 85),
      bri: random(65, 95),
      alive: true,
      removeTime: 0,
      budProgress: 1,
      vx: 0,
      vy: 0
    });
    idealPositions.push({ x: ix, y: iy });
  }

  removalQueue = [];
  document.body.style.cursor = 'default';
}

function draw() {
  background('#eff2f6');

  push();
  translate(width / 2, height / 2);

  let mx = canvasMouseX;
  let my = canvasMouseY;
  let now = millis();

  if (isDragging) {
    dragPath.push({ x: mx, y: my });
  }

  for (let s of seeds) {
    if (!s.alive) continue;

    if (!isDragging && dist(s.cx, s.cy, mx, my) < MAGNET_RADIUS) {
      let dx = s.cx - mx;
      let dy = s.cy - my;
      let d = max(0.5, sqrt(dx * dx + dy * dy));
      let nx = dx / d;
      let ny = dy / d;
      let falloff = 1 - d / MAGNET_RADIUS;
      let force = MAGNET_STRENGTH * falloff * falloff;
      let dir = s.polarity * MOUSE_POLARITY;
      s.vx += dir * nx * force;
      s.vy += dir * ny * force;
    }

    let dx = s.ix - s.cx;
    let dy = s.iy - s.cy;
    s.vx += dx * SPRING_STIFFNESS;
    s.vy += dy * SPRING_STIFFNESS;

    s.vx *= DAMPING;
    s.vy *= DAMPING;

    s.cx += s.vx;
    s.cy += s.vy;
  }

  if (isDragging && dragPath.length >= 2) {
    let p0 = dragPath[dragPath.length - 2];
    let p1 = dragPath[dragPath.length - 1];
    for (let i = 0; i < seeds.length; i++) {
      let s = seeds[i];
      if (!s.alive) continue;
      if (s.budProgress < 0.5) continue;
      let d = pointToSegmentDist(s.cx, s.cy, p0.x, p0.y, p1.x, p1.y);
      if (d < seedLen * CUT_WIDTH) {
        s.alive = false;
        s.removeTime = now;
        removalQueue.push({ index: i, time: now, radius: s.idealRadius });
      }
    }
  }

  removalQueue.sort((a, b) => a.radius - b.radius);

  for (let i = removalQueue.length - 1; i >= 0; i--) {
    let item = removalQueue[i];
    if (now - item.time > REGROW_DELAY) {
      let s = seeds[item.index];
      if (s && !s.alive) {
        s.alive = true;
        s.budProgress = 0.05;
        s.cx = s.ix;
        s.cy = s.iy;
        s.vx = 0;
        s.vy = 0;
      }
      removalQueue.splice(i, 1);
    }
  }

  for (let s of seeds) {
    if (!s.alive) continue;
    if (s.budProgress < 1) {
      s.budProgress = min(1, s.budProgress + BUD_GROW_SPEED);
    }
    if (!isDragging && s.budProgress === 1) {
      s.cx = lerp(s.cx, s.ix, 0.03);
      s.cy = lerp(s.cy, s.iy, 0.03);
    }
  }

  for (let s of seeds) {
    if (!s.alive) continue;

    let dx = s.cx - s.ix;
    let dy = s.cy - s.iy;
    let displacement = sqrt(dx * dx + dy * dy);
    let t = min(1, displacement / MAGNET_RADIUS);

    let hue, sat, bri;
    if (s.budProgress < 1) {
      hue = lerp(75, s.hue, s.budProgress);
      sat = lerp(25, s.sat, s.budProgress);
      bri = lerp(100, s.bri, s.budProgress);
    } else {
      hue = s.hue;
      sat = s.sat * (1 - t * 0.25);
      bri = min(100, s.bri * (1 + t * 0.15));
    }

    let rot = s.angle;
    if (displacement > 0.3) {
      rot = atan2(dy, dx);
    }

    let L = seedLen * s.budProgress;
    let cx = s.cx;
    let cy = s.cy;

    fill(hue, sat, bri, 240);
    beginShape();
    vertex(cx + cos(rot) * L * 2, cy + sin(rot) * L * 2);
    vertex(cx + cos(rot + PI * 0.43) * L, cy + sin(rot + PI * 0.43) * L);
    vertex(cx - cos(rot) * L * 0.7, cy - sin(rot) * L * 0.7);
    vertex(cx + cos(rot - PI * 0.43) * L, cy + sin(rot - PI * 0.43) * L);
    endShape(CLOSE);
  }

  if (isDragging && dragPath.length > 2) {
    noFill();
    stroke(55, 12, 90, 25);
    strokeWeight(seedLen * 0.6);
    beginShape();
    for (let p of dragPath) {
      curveVertex(p.x, p.y);
    }
    endShape();
    noStroke();
  }

  pop();
}

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  let abx = bx - ax, aby = by - ay;
  let apx = px - ax, apy = py - ay;
  let t = max(0, min(1, (apx * abx + apy * aby) / max(0.001, abx * abx + aby * aby)));
  let cx = ax + t * abx, cy = ay + t * aby;
  return dist(px, py, cx, cy);
}

function mouseMoved() {
  canvasMouseX = mouseX - width / 2;
  canvasMouseY = mouseY - height / 2;
  if (!isDragging) {
    document.body.style.cursor = 'default';
  }
}

function mousePressed() {
  canvasMouseX = mouseX - width / 2;
  canvasMouseY = mouseY - height / 2;
  isDragging = true;
  dragPath = [{ x: canvasMouseX, y: canvasMouseY }];
  document.body.style.cursor = 'crosshair';
  return false;
}

function mouseReleased() {
  isDragging = false;
  dragPath = [];
  document.body.style.cursor = 'default';
  return false;
}

function mouseDragged() {
  canvasMouseX = mouseX - width / 2;
  canvasMouseY = mouseY - height / 2;
  document.body.style.cursor = 'crosshair';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  seeds = [];
  idealPositions = [];
  removalQueue = [];
  setup();
}
