import { VisNode, VisEdge, PathResult } from '../types';

export interface ECMPPathResult {
  paths: PathInfo[];              // ALL equal-cost paths
  cost: number;                   // Optimal cost
  isECMP: boolean;                // true if multiple paths
  divergencePoints: string[];     // Nodes where paths split
  convergencePoints: string[];    // Nodes where paths rejoin
  pathCount: number;              // Total paths found
}

export interface PathInfo {
  id: string;
  source: string;
  destination: string;
  nodeSequence: string[];
  edgeSequence: string[];
  metrics?: any; // To be filled by pathMetrics service
  isECMP: boolean;
}

export function dijkstraWithECMP(
  start: string,
  goal: string,
  nodes: VisNode[],
  edges: VisEdge[],
  options?: {
    maxPaths?: number;            // Limit enumeration (default: 10)
    includeSuboptimal?: boolean;  // Include non-ECMP paths
    timeout?: number;             // Max computation time (ms)
  }
): ECMPPathResult | null {
  // Phase 1: Standard Dijkstra with multi-parent tracking
  const dist = new Map<string, number>();
  const parents = new Map<string, Array<{from: string, edgeId: string}>>();

  // Initialize
  nodes.forEach(n => {
    dist.set(n.id, Infinity);
    parents.set(n.id, []);
  });
  dist.set(start, 0);

  const Q = new Set(nodes.map(n => n.id));

  while (Q.size > 0) {
    // Find min distance node
    let u: string | null = null;
    let minDist = Infinity;
    for (const v of Q) {
      const d = dist.get(v);
      if (d !== undefined && d < minDist) {
        minDist = d;
        u = v;
      }
    }

    if (u === null || u === goal) break;
    Q.delete(u);

    // Relax neighbors
    const neighbors = edges.filter(e => e.from === u);
    for (const edge of neighbors) {
      const currentDistToU = dist.get(u);
      if (currentDistToU === undefined) continue;

      const newDist = currentDistToU + edge.cost;
      const currentDistToV = dist.get(edge.to);

      if (currentDistToV === undefined) continue;

      if (newDist < currentDistToV) {
        // Better path found - replace
        dist.set(edge.to, newDist);
        parents.set(edge.to, [{ from: u, edgeId: edge.id }]);
      } else if (newDist === currentDistToV) {
        // Equal-cost path found - ADD to parents (key for ECMP!)
        parents.get(edge.to)?.push({ from: u, edgeId: edge.id });
      }
    }
  }

  if (dist.get(goal) === Infinity) return null;

  // Phase 2: Enumerate all paths via backtracking
  const allPaths = enumeratePaths(start, goal, parents, options?.maxPaths || 10);

  // Phase 3: Analyze topology
  const { divergencePoints, convergencePoints } = analyzeTopology(allPaths);

  return {
    paths: allPaths.map((p, i) => ({
      id: `path-${i}`,
      source: start,
      destination: goal,
      nodeSequence: p.nodes,
      edgeSequence: p.edges,
      isECMP: allPaths.length > 1
    })),
    cost: dist.get(goal) || 0,
    isECMP: allPaths.length > 1,
    divergencePoints,
    convergencePoints,
    pathCount: allPaths.length
  };
}

interface RawPath {
  nodes: string[];
  edges: string[];
}

function enumeratePaths(
  start: string,
  goal: string,
  parents: Map<string, Array<{from: string, edgeId: string}>>,
  maxPaths: number = 10
): RawPath[] {
  const paths: RawPath[] = [];
  const stack: Array<{
    node: string;
    nodePath: string[];
    edgePath: string[];
  }> = [];

  // Start from goal, work backwards
  stack.push({ node: goal, nodePath: [goal], edgePath: [] });

  while (stack.length > 0 && paths.length < maxPaths) {
    const item = stack.pop();
    if (!item) break;
    const { node, nodePath, edgePath } = item;

    if (node === start) {
      // Complete path found
      paths.push({
        nodes: [...nodePath].reverse(),
        edges: [...edgePath].reverse()
      });
      continue;
    }

    // Explore all parents
    const nodeParents = parents.get(node) || [];
    for (const parent of nodeParents) {
      // Avoid cycles
      if (nodePath.includes(parent.from)) continue;

      stack.push({
        node: parent.from,
        nodePath: [...nodePath, parent.from],
        edgePath: [...edgePath, parent.edgeId]
      });
    }
  }

  return paths;
}

function analyzeTopology(paths: RawPath[]): { divergencePoints: string[], convergencePoints: string[] } {
  if (paths.length <= 1) {
    return { divergencePoints: [], convergencePoints: [] };
  }

  // Build node occurrence map
  const nodeInPaths = new Map<string, Set<number>>(); // nodeId -> set of path indices

  paths.forEach((path, pathIdx) => {
    path.nodes.forEach(nodeId => {
      if (!nodeInPaths.has(nodeId)) {
        nodeInPaths.set(nodeId, new Set());
      }
      nodeInPaths.get(nodeId)!.add(pathIdx);
    });
  });

  const divergencePoints: string[] = [];
  const convergencePoints: string[] = [];
  const allNodes = new Set(paths.flatMap(p => p.nodes));

  // Find divergence: node where next-hops differ
  for (const nodeId of allNodes) {
    const nextHops = new Set<string>();
    paths.forEach(path => {
      const idx = path.nodes.indexOf(nodeId);
      if (idx >= 0 && idx < path.nodes.length - 1) {
        nextHops.add(path.nodes[idx + 1]);
      }
    });
    if (nextHops.size > 1) divergencePoints.push(nodeId);
  }

  // Find convergence: node where prev-hops differ
  for (const nodeId of allNodes) {
    const prevHops = new Set<string>();
    paths.forEach(path => {
      const idx = path.nodes.indexOf(nodeId);
      if (idx > 0) {
        prevHops.add(path.nodes[idx - 1]);
      }
    });
    if (prevHops.size > 1) convergencePoints.push(nodeId);
  }

  return { divergencePoints, convergencePoints };
}
