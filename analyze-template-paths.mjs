/**
 * Comprehensive Path Analysis for TEMPLATE_OSPF_TOPOLOGY_COMPLETE.json
 * Tests ALL possible paths between ALL node pairs using Dijkstra algorithm
 */

import fs from 'fs';

// Read the topology file
const topologyFile = './zzzi--input-files/TEMPLATE_OSPF_TOPOLOGY_COMPLETE.json';
const rawData = JSON.parse(fs.readFileSync(topologyFile, 'utf8'));

// Extract nodes and links from the nested structure
const data = rawData.data || rawData;
const nodes = data.nodes;
const links = data.links;

console.log('='.repeat(80));
console.log('COMPREHENSIVE PATH ANALYSIS');
console.log('File:', topologyFile);
console.log('='.repeat(80));
console.log(`\nTopology Summary:`);
console.log(`  - Nodes: ${nodes.length}`);
console.log(`  - Links: ${links.length}`);
console.log(`  - Possible paths (N*(N-1)): ${nodes.length * (nodes.length - 1)}`);

// Build adjacency list (bidirectional with separate costs)
const adj = new Map();
nodes.forEach(n => adj.set(n.id, []));

links.forEach((l, idx) => {
  // Skip "down" links
  if (l.status === 'down') {
    console.log(`  - Skipping DOWN link: ${l.source} <-> ${l.target}`);
    return;
  }
  
  const forwardCost = l.forward_cost || l.cost || 10;
  const reverseCost = l.reverse_cost || l.cost || 10;
  
  // Forward edge
  if (adj.has(l.source)) {
    adj.get(l.source).push({ to: l.target, cost: forwardCost, id: `e${idx}_f` });
  }
  // Reverse edge
  if (adj.has(l.target)) {
    adj.get(l.target).push({ to: l.source, cost: reverseCost, id: `e${idx}_r` });
  }
});

// Count edges
let totalEdges = 0;
adj.forEach((edges, node) => {
  totalEdges += edges.length;
});
console.log(`  - Directed edges (after filtering down links): ${totalEdges}`);

// Dijkstra's algorithm
function dijkstra(start, goal) {
  const nodeIds = new Set(nodes.map(n => n.id));
  if (!nodeIds.has(start) || !nodeIds.has(goal)) return null;
  if (start === goal) return { cost: 0, path: [start] };

  const dist = new Map();
  const prev = new Map();
  const Q = new Set();

  nodes.forEach(n => {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
    Q.add(n.id);
  });
  dist.set(start, 0);

  while (Q.size > 0) {
    let u = null;
    let minDist = Infinity;
    for (const v of Q) {
      if (dist.get(v) < minDist) {
        minDist = dist.get(v);
        u = v;
      }
    }
    if (u === null || dist.get(u) === Infinity) break;
    Q.delete(u);

    if (u === goal) break;

    const neighbors = adj.get(u) || [];
    for (const edge of neighbors) {
      const alt = dist.get(u) + edge.cost;
      if (alt < dist.get(edge.to)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, u);
      }
    }
  }

  if (dist.get(goal) === Infinity) return null;

  // Reconstruct path
  const path = [];
  let curr = goal;
  while (curr) {
    path.unshift(curr);
    curr = prev.get(curr);
  }

  return { cost: dist.get(goal), path };
}

// Test ALL paths
console.log('\n' + '='.repeat(80));
console.log('PATH ANALYSIS RESULTS');
console.log('='.repeat(80));

let foundPaths = 0;
let notFoundPaths = 0;
const results = [];

for (const src of nodes) {
  for (const dest of nodes) {
    if (src.id === dest.id) continue;
    
    const result = dijkstra(src.id, dest.id);
    if (result) {
      foundPaths++;
      results.push({
        source: src.id,
        destination: dest.id,
        cost: result.cost,
        hops: result.path.length - 1,
        path: result.path.join(' → ')
      });
    } else {
      notFoundPaths++;
      results.push({
        source: src.id,
        destination: dest.id,
        cost: null,
        hops: null,
        path: 'NO PATH FOUND'
      });
    }
  }
}

// Print results grouped by source
console.log('\nDetailed Path Results:');
console.log('-'.repeat(80));

let currentSource = null;
for (const r of results) {
  if (r.source !== currentSource) {
    currentSource = r.source;
    console.log(`\nFrom: ${r.source}`);
  }
  
  if (r.cost !== null) {
    console.log(`  → ${r.destination.padEnd(20)} | Cost: ${String(r.cost).padStart(5)} | Hops: ${r.hops} | Path: ${r.path}`);
  } else {
    console.log(`  → ${r.destination.padEnd(20)} | ❌ NO PATH FOUND`);
  }
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total possible paths: ${nodes.length * (nodes.length - 1)}`);
console.log(`Paths FOUND: ${foundPaths} ✅`);
console.log(`Paths NOT FOUND: ${notFoundPaths} ❌`);
console.log(`Success Rate: ${((foundPaths / (foundPaths + notFoundPaths)) * 100).toFixed(1)}%`);

// Show unreachable pairs if any
if (notFoundPaths > 0) {
  console.log('\n⚠️  Unreachable Node Pairs:');
  for (const r of results) {
    if (r.cost === null) {
      console.log(`   ${r.source} → ${r.destination}`);
    }
  }
}

// Show network connectivity analysis
console.log('\n' + '='.repeat(80));
console.log('NETWORK CONNECTIVITY ANALYSIS');
console.log('='.repeat(80));

// Node degree analysis
console.log('\nNode Degree (number of neighbors):');
nodes.forEach(n => {
  const degree = adj.get(n.id)?.length || 0;
  console.log(`  ${n.id.padEnd(20)} (${n.country}): ${degree} neighbors`);
});

// Find isolated nodes
const isolatedNodes = nodes.filter(n => (adj.get(n.id)?.length || 0) === 0);
if (isolatedNodes.length > 0) {
  console.log('\n⚠️  Isolated Nodes (no connections):');
  isolatedNodes.forEach(n => console.log(`   - ${n.id}`));
}

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(80));






