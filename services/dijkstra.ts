
import { VisEdge, VisNode, PathResult } from '../types';

export function dijkstraDirected(
  start: string,
  goal: string,
  nodes: VisNode[],
  edges: VisEdge[]
): PathResult | null {
  // Adjacency List: Map<NodeID, Array<{to, cost, id}>>
  const adj = new Map<string, { to: string; cost: number; id: string }[]>();
  
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    if (adj.has(e.from)) {
      adj.get(e.from)?.push({ to: e.to, cost: e.cost, id: e.id });
    }
  });

  // Distances and Predecessors
  const dist = new Map<string, number>();
  // For ECMP, a node can have multiple parents
  const parents = new Map<string, { from: string; edgeId: string }[]>();
  const Q = new Set<string>();

  nodes.forEach((n) => {
    dist.set(n.id, Infinity);
    parents.set(n.id, []);
    Q.add(n.id);
  });
  dist.set(start, 0);

  while (Q.size) {
    let u: string | null = null;
    let best = Infinity;
    
    for (const v of Q) {
      const d = dist.get(v);
      if (d !== undefined && d < best) {
        best = d;
        u = v;
      }
    }

    if (u === null) break; // unreachable
    Q.delete(u);
    
    // Process neighbors
    const neighbors = adj.get(u) || [];
    for (const e of neighbors) {
      // Relaxation
      const uDist = dist.get(u);
      if (uDist === undefined) continue;
      
      const newDist = uDist + e.cost;
      const vDist = dist.get(e.to);
      
      if (vDist === undefined) continue;

      if (newDist < vDist) {
        // Found a strictly better path
        dist.set(e.to, newDist);
        parents.set(e.to, [{ from: u, edgeId: e.id }]);
      } else if (newDist === vDist) {
        // Found an Equal Cost Multi-Path
        parents.get(e.to)?.push({ from: u, edgeId: e.id });
      }
    }
  }

  if (dist.get(goal) === Infinity) return null;

  // 1. Reconstruct Canonical Path (Single path for text display)
  const canonicalPath: string[] = [];
  let curr = goal;
  while (curr) {
    canonicalPath.unshift(curr);
    if (curr === start) break;
    const pars = parents.get(curr);
    if (!pars || pars.length === 0) break;
    // Just pick the first parent for the canonical path representation
    curr = pars[0].from; 
  }

  // 2. Reconstruct Full Subgraph (Backtracking from Goal to capture all ECMP branches)
  const subgraphEdges = new Set<string>();
  const subgraphNodes = new Set<string>();
  const qBack = [goal];
  const visitedBack = new Set<string>([goal]);
  subgraphNodes.add(goal);

  while(qBack.length > 0) {
    const curr = qBack.shift()!;
    const pars = parents.get(curr) || [];
    for (const p of pars) {
      subgraphEdges.add(p.edgeId);
      subgraphNodes.add(p.from);
      if (!visitedBack.has(p.from)) {
        visitedBack.add(p.from);
        qBack.push(p.from);
      }
    }
  }

  // 3. Build "Wave" steps for animation (BFS forward from start within the subgraph)
  const steps: string[][] = [];
  const qFwd = [start];
  const seenFwd = new Set<string>([start]);
  
  let currentLayer = [start];
  while (currentLayer.length > 0) {
    steps.push(currentLayer);
    const nextLayer: string[] = [];
    
    for (const u of currentLayer) {
      const neighbors = adj.get(u) || [];
      for (const e of neighbors) {
        if (!subgraphNodes.has(e.to)) continue;
        if (!subgraphEdges.has(e.id)) continue;
        
        if (!seenFwd.has(e.to)) {
          seenFwd.add(e.to);
          nextLayer.push(e.to);
        }
      }
    }
    currentLayer = nextLayer;
  }

  // 4. Check for ECMP branching
  let isECMP = false;
  subgraphNodes.forEach(n => {
    const pars = parents.get(n) || [];
    const validParents = pars.filter(p => subgraphNodes.has(p.from) && subgraphEdges.has(p.edgeId));
    if (validParents.length > 1) isECMP = true;
  });

  return {
    steps,
    edges: Array.from(subgraphEdges),
    cost: dist.get(goal) || 0,
    isECMP,
    canonicalPath
  };
}
