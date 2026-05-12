let waves = [];
let hexData = {};
let hexBaseColor = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  colorMode(RGB, 255, 255, 255, 255);
}

const cellR = 26;
const drawR = 24;
const hexW = cellR * Math.sqrt(3);
const hexSpacingY = cellR * 1.5;
const WAVE_SPEED = 0.22;
const CHAOS_PER_RING = 0.07;
const DECAY_RATE = 0.0025;
const MAX_JITTER = 18;
const MAX_VERTEX_JITTER = 12;

function getHexData(col, row) {
  let key = col + ',' + row;
  if (!(key in hexData)) {
    hexData[key] = { chaos: 0, jitterX: 0, jitterY: 0, verts: [] };
    for (let i = 0; i < 6; i++) {
      hexData[key].verts.push({ ox: 0, oy: 0 });
    }
  }
  return hexData[key];
}

function getBaseColor(col, row) {
  let key = col + ',' + row;
  if (!(key in hexBaseColor)) {
    let r = Math.random();
    if (r < 0.06)      hexBaseColor[key] = [255, 210, 60, 230];
    else if (r < 0.12) hexBaseColor[key] = [240, 160, 20, 220];
    else               hexBaseColor[key] = [255, 185, 15, 220];
  }
  return hexBaseColor[key];
}

function hexCenter(col, row) {
  return {
    x: col * hexW + (row % 2 === 0 ? 0 : hexW / 2),
    y: row * hexSpacingY
  };
}

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function draw() {
  background(255, 248, 220);

  let cols = ceil(width / hexW) + 2;
  let rows = ceil(height / hexSpacingY) + 2;
  let sCol = -floor(cols / 2) - 1;
  let sRow = -floor(rows / 2) - 1;

  // Apply wave chaos to hexes
  for (let w of waves) {
    let waveDist = (frameCount - w.frame) * WAVE_SPEED;
    let ringCenter = floor(waveDist);
    if (ringCenter !== w.lastRing) {
      w.lastRing = ringCenter;
      for (let row = sRow; row < sRow + rows; row++) {
        for (let col = sCol; col < sCol + cols; col++) {
          let d = Math.sqrt((col - w.col) ** 2 + (row - w.row) ** 2);
          let ringDist = Math.abs(d - ringCenter);
          if (ringDist < 1.2) {
            let hd = getHexData(col, row);
            hd.chaos = Math.min(1, hd.chaos + CHAOS_PER_RING * (1 - ringDist));
          }
        }
      }
    }
  }

  // Clean old waves
  waves = waves.filter(w => (frameCount - w.frame) * WAVE_SPEED < 30);

  // Update all hexes: decay chaos, compute jitter and vertex offsets
  let seedBase = frameCount * 0.15;
  for (let row = sRow; row < sRow + rows; row++) {
    for (let col = sCol; col < sCol + cols; col++) {
      let hd = getHexData(col, row);

      // Settle: chaos slowly decays toward zero
      hd.chaos = Math.max(0, hd.chaos - DECAY_RATE);

      let c = hd.chaos;
      let seed = (col * 733 + row * 271 + seedBase);

      // Position jitter
      hd.jitterX = (seededRandom(seed) - 0.5) * MAX_JITTER * c;
      hd.jitterY = (seededRandom(seed + 1000) - 0.5) * MAX_JITTER * c;

      // Vertex distortion: each of the 6 vertices gets an independent offset
      for (let i = 0; i < 6; i++) {
        let vs = seed + 2000 + i * 137;
        hd.verts[i].ox = (seededRandom(vs) - 0.5) * MAX_VERTEX_JITTER * c;
        hd.verts[i].oy = (seededRandom(vs + 500) - 0.5) * MAX_VERTEX_JITTER * c;
      }
    }
  }

  push();
  translate(width / 2, height / 2);

  for (let row = sRow; row < sRow + rows; row++) {
    for (let col = sCol; col < sCol + cols; col++) {
      let c = hexCenter(col, row);
      let hd = getHexData(col, row);
      let base = getBaseColor(col, row);

      // Color: honey → dark burnt as chaos increases
      let t = hd.chaos;
      let rgba = [
        base[0] * (1 - t) + (180 + t * 40) * t,
        base[1] * (1 - t) + 50 * t,
        base[2] * (1 - t) + 10 * t,
        base[3]
      ];

      // Draw hex with position jitter + vertex distortion
      let ox = c.x + hd.jitterX;
      let oy = c.y + hd.jitterY;

      fill(rgba[0], rgba[1], rgba[2], rgba[3]);
      beginShape();
      for (let i = 0; i < 6; i++) {
        let a = TWO_PI / 6 * i - PI / 6;
        vertex(
          ox + cos(a) * drawR + hd.verts[i].ox,
          oy + sin(a) * drawR + hd.verts[i].oy
        );
      }
      endShape(CLOSE);
    }
  }

  pop();
}

function mousePressed() {
  let mx = mouseX - width / 2;
  let my = mouseY - height / 2;
  let best = null, bestDist = Infinity;

  for (let row = -30; row < 30; row++) {
    for (let col = -30; col < 30; col++) {
      let c = hexCenter(col, row);
      let d = dist(mx, my, c.x, c.y);
      if (d < bestDist) { bestDist = d; best = {col, row}; }
    }
  }
  if (best && bestDist < drawR) {
    waves.push({ col: best.col, row: best.row, frame: frameCount, lastRing: -1 });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
