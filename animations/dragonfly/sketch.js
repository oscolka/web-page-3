let points = [];
let nodes = [];
let edges = [];
let cells = [];

let drawProgress = 0;
let drawingComplete = false;

let nodeMap = new Map();
let edgesMap = new Map();

function setup() {
  createCanvas(windowWidth, windowHeight);
  generateVoronoi();
}

function getNodeId(x, y) {
  let key = x.toFixed(1) + ',' + y.toFixed(1);
  if (!nodeMap.has(key)) {
     let node = { id: nodes.length, baseX: x, baseY: y, x: x, y: y, vx: 0, vy: 0, neighbors: [] };
     nodes.push(node);
     nodeMap.set(key, node.id);
  }
  return nodeMap.get(key);
}

function generateVoronoi() {
  // 1. Generate points (reduced to 150 for larger sections)
  for (let i = 0; i < 150; i++) {
     let px = random(width);
     let py = random(height);
     points.push([px, py]);
  }

  // 2. Lloyd Relaxation
  if (typeof d3 !== 'undefined') {
    let delaunay = d3.Delaunay.from(points);
    let voronoi = delaunay.voronoi([0, 0, width, height]);
    for (let i = 0; i < points.length; i++) {
       let poly = voronoi.cellPolygon(i);
       if (poly) {
          let cx = 0, cy = 0;
          for (let pt of poly) { cx += pt[0]; cy += pt[1]; }
          cx /= poly.length;
          cy /= poly.length;
          points[i] = [cx, cy];
       }
    }
    
    // 3. Build graph
    delaunay = d3.Delaunay.from(points);
    voronoi = delaunay.voronoi([0, 0, width, height]);

    for (let i = 0; i < points.length; i++) {
       let poly = voronoi.cellPolygon(i);
       if (!poly) continue;
       
       let cx = points[i][0];
       let cy = points[i][1];

       let cellNodeIds = [];
       for (let j = 0; j < poly.length - 1; j++) {
          let p1 = poly[j];
          let p2 = poly[j+1];
          
          let id1 = getNodeId(p1[0], p1[1]);
          let id2 = getNodeId(p2[0], p2[1]);
          
          cellNodeIds.push(id1);
          
          let edgeKey = Math.min(id1, id2) + '-' + Math.max(id1, id2);
          if (!edgesMap.has(edgeKey)) {
             // Calculate distance from center for the radial drawing effect
             let dFromBase = dist(width/2, height/2, (p1[0]+p2[0])/2, (p1[1]+p2[1])/2);
             edges.push({ id1, id2, dFromBase });
             edgesMap.set(edgeKey, true);
             
             // Neighbor relations
             nodes[id1].neighbors.push(id2);
             nodes[id2].neighbors.push(id1);
          }
       }

       let isCream = random() < 0.4;
       
       cells.push({ 
          nodeIds: cellNodeIds, 
          isCream, 
          cx: cx, 
          cy: cy,
          dFromBase: dist(width/2, height/2, cx, cy)
       });
    }
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  let l2 = dist(x1, y1, x2, y2);
  l2 = l2 * l2;
  if (l2 == 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}

function draw() {
  clear(); // Keep background transparent

  if (!drawingComplete) {
     drawProgress += 0.002; // Slower drawing speed
     if (drawProgress >= 1) drawingComplete = true;
  } else {
     // Physics and Interaction
     let mouseVel = dist(mouseX, mouseY, pmouseX, pmouseY);
     if (mouseVel > 0 && mouseVel < 100) { 
        
        let closestEdge = null;
        let minDist = 15; // Tight radius so we only pluck one string

        for (let i = 0; i < edges.length; i++) {
           let e = edges[i];
           let n1 = nodes[e.id1];
           let n2 = nodes[e.id2];
           
           let d = distToSegment(mouseX, mouseY, n1.x, n1.y, n2.x, n2.y);
           if (d < minDist) {
              minDist = d;
              closestEdge = e;
           }
        }

        // Apply a gentle force only to the closest edge
        if (closestEdge) {
           let n1 = nodes[closestEdge.id1];
           let n2 = nodes[closestEdge.id2];
           let pullStrength = 0.8; // Smaller, controlled force
           let dirX = mouseX - pmouseX;
           let dirY = mouseY - pmouseY;
           let mag = dist(0, 0, dirX, dirY) + 0.001;
           dirX /= mag; dirY /= mag;
           
           n1.vx += dirX * pullStrength;
           n1.vy += dirY * pullStrength;
           n2.vx += dirX * pullStrength;
           n2.vy += dirY * pullStrength;
        }
     }

     // Spring Physics Update
     for (let i = 0; i < nodes.length; i++) {
        let n = nodes[i];
        
        // Base spring
        n.vx += (n.baseX - n.x) * 0.15;
        n.vy += (n.baseY - n.y) * 0.15;
        
        // Tension propagation
        for (let nid of n.neighbors) {
            let neighbor = nodes[nid];
            let baseD = dist(n.baseX, n.baseY, neighbor.baseX, neighbor.baseY);
            let currD = dist(n.x, n.y, neighbor.x, neighbor.y);
            if (currD > 0) {
                let stretch = currD - baseD;
                let pull = stretch * 0.03; 
                let dx = (neighbor.x - n.x) / currD;
                let dy = (neighbor.y - n.y) / currD;
                n.vx += dx * pull;
                n.vy += dy * pull;
            }
        }
        
        n.vx *= 0.82; // damping
        n.vy *= 0.82;
     }

     for (let i = 0; i < nodes.length; i++) {
        nodes[i].x += nodes[i].vx;
        nodes[i].y += nodes[i].vy;
     }
  }

  // --- DRAWING ---
  // Max distance covers the whole screen diagonally from the center
  let maxScreenDist = dist(0, 0, width/2, height/2);
  let currentMaxDist = drawProgress * maxScreenDist * 1.5;

  // Draw cells
  noStroke();
  for (let c of cells) {
     if (c.dFromBase < currentMaxDist) {
        if (c.isCream) {
           fill(242, 232, 207, 240); // Cream
        } else {
           fill(24, 78, 78, 240); // Teal-green
        }
        
        beginShape();
        for (let nid of c.nodeIds) {
           let n = nodes[nid];
           vertex(n.x, n.y);
        }
        endShape(CLOSE);
     }
  }

  // Draw Veins
  stroke(220, 210, 180, 200); // Vein color (slightly darker cream)
  strokeWeight(1.5);
  for (let e of edges) {
     if (e.dFromBase < currentMaxDist) {
        let n1 = nodes[e.id1];
        let n2 = nodes[e.id2];
        line(n1.x, n1.y, n2.x, n2.y);
     }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  location.reload(); 
}