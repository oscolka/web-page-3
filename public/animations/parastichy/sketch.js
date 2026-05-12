let n = 600;
let fernColor;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  fernColor = color(144, 210, 109, 200); // light green
}

function draw() {
  background(18, 42, 28); // dark green

  let cx = width / 2;
  let cy = height / 2;
  let maxR = min(width, height) * 0.45;
  let golden = PI * (3 - Math.sqrt(5)); // golden angle ~137.5°

  for (let i = 0; i < n; i++) {
    let r = maxR * Math.sqrt(i / n);
    let angle = i * golden;

    let x = cx + r * cos(angle);
    let y = cy + r * sin(angle);

    let leafSize = map(r, 0, maxR, 6, 12);

    push();
    translate(x, y);
    rotate(angle + PI / 2);

    // Simple fern-leaf shape: a teardrop/ellipse
    fill(fernColor);
    beginShape();
    vertex(0, -leafSize * 1.4);           // tip
    vertex(leafSize * 0.5, leafSize * 0.3); // right
    vertex(0, leafSize * 0.8);             // bottom dip
    vertex(-leafSize * 0.5, leafSize * 0.3); // left
    endShape(CLOSE);

    // small secondary leaf at each side
    push();
    rotate(0.5);
    fill(160, 220, 120, 120);
    ellipse(leafSize * 0.3, leafSize * 0.1, leafSize * 0.6, leafSize * 0.15);
    pop();

    push();
    rotate(-0.5);
    ellipse(-leafSize * 0.3, leafSize * 0.1, leafSize * 0.6, leafSize * 0.15);
    pop();

    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
