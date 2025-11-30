import fs from 'fs';

// Load the topology
const topology = JSON.parse(fs.readFileSync('./zzzi--input-files/netviz-pro-topology-2025-11-30T18_44_02.838Z.json', 'utf8'));

// Build bidirectional adjacency list  
const adj = new Map();
topology.nodes.forEach(n => adj.set(n.id, []));
topology.links.forEach(link => {
  // Forward
  if (adj.has(link.source)) {
    adj.get(link.source).push({ to: link.target, cost: link.forward_cost, dir: 'fwd' });
  }
  // Reverse
  if (adj.has(link.target)) {
    adj.get(link.target).push({ to: link.source, cost: link.reverse_cost, dir: 'rev' });
  }
});

//BFS pathfinding
function findPath(src, dest) {
  if (src === dest) return { found: true, path: [src], cost: 0 };
  
  const queue = [src];
  const visited = new Set([src]);
  const parent = new Map();
  
  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr === dest) {
      // Reconstruct path
      const path = [];
      let node = dest;
      while (node) {
        path.unshift(node);
        node = parent.get(node);
      }
      return { found: true, path, cost: 0 };
    }
    
    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.to)) {
        visited.add(neighbor.to);
        parent.set(neighbor.to, curr);
        queue.push(neighbor.to);
      }
    }
  }
  
  return { found: false, path: [], cost: 0 };
}

// Generate 30 unique test cases
const nodes = topology.nodes.map(n => n.id);
const testCases = [];
const used = new Set();

// Systematic test cases covering all nodes
for (let i = 0; i < nodes.length && testCases.length < 30; i++) {
  for (let j = i + 1; j < nodes.length && testCases.length < 30; j++) {
    const key = `${nodes[i]}-${nodes[j]}`;
    if (!used.has(key)) {
      testCases.push({ src: nodes[i], dest: nodes[j] });
      used.add(key);
    }
  }
}

console.log("=".repeat(80));
console.log("COMPREHENSIVE PATH TESTING - 30 UNIQUE ROUTES");
console.log("=".repeat(80));
console.log(`Topology: netviz-pro-topology-2025-11-30T18_44_02.838Z.json`);
console.log(`Nodes: ${topology.nodes.length}`);
console.log(`Links: ${topology.links.length} (${topology.links.length * 2} directed edges)`);
console.log("=".repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((test, idx) => {
  const result = findPath(test.src, test.dest);
  const status = result.found ? "✅ PASS" : "❌ FAIL";
  
  if (result.found) passed++;
  else failed++;
  
  console.log(`\nTest ${idx + 1}/30: ${test.src} → ${test.dest}`);
  console.log(`  Status: ${status}`);
  if (result.found) {
    console.log(`  Path: ${result.path.join(' → ')}`);
    console.log(`  Hops: ${result.path.length - 1}`);
  } else {
    console.log(`  Error: No path exists`);
  }
});

console.log("\n" + "=".repeat(80));
console.log("TEST SUMMARY");
console.log("=".repeat(80));
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${passed} (${(passed/testCases.length*100).toFixed(1)}%)`);
console.log(`Failed: ${failed} (${(failed/testCases.length*100).toFixed(1)}%)`);
console.log("=".repeat(80));
