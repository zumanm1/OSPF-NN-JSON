// Web Worker for Impact Analysis Performance Optimization
// Runs Dijkstra calculations off the main thread
// This is a self-contained implementation to work in Worker context

interface VisNode {
  id: string;
  label: string;
  country?: string;
}

interface VisEdge {
  id: string;
  from: string;
  to: string;
  cost: number;
  logicalId: number;
}

interface PathResult {
  steps: string[][];
  edges: string[];
  cost: number;
  isECMP: boolean;
  canonicalPath: string[];
}

interface RouterNode {
  id: string;
  name: string;
  hostname: string;
  loopback_ip: string;
  country: string;
  is_active: boolean;
  node_type: string;
  neighbor_count: number;
}

type ImpactType = 'cost_increase' | 'cost_decrease' | 'path_migration' | 'new_ecmp' | 'lost_ecmp' | 'MIGRATION' | 'REROUTE';

interface ImpactResult {
  src: RouterNode;
  dest: RouterNode;
  oldCost: number;
  newCost: number;
  oldPath: string[];
  newPath: string[];
  isECMP: boolean;
  wasECMP: boolean;
  impactType: ImpactType;
  pathChanged: boolean;
}

// Self-contained Dijkstra implementation for the worker
function dijkstraDirected(
  start: string,
  goal: string,
  nodes: VisNode[],
  edges: VisEdge[]
): PathResult | null {
  const adj = new Map<string, { to: string; cost: number; id: string }[]>();

  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    if (adj.has(e.from)) {
      adj.get(e.from)?.push({ to: e.to, cost: e.cost, id: e.id });
    }
  });

  const dist = new Map<string, number>();
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

    if (u === null) break;
    Q.delete(u);

    const neighbors = adj.get(u) || [];
    for (const e of neighbors) {
      const uDist = dist.get(u);
      if (uDist === undefined) continue;

      const newDist = uDist + e.cost;
      const vDist = dist.get(e.to);

      if (vDist === undefined) continue;

      if (newDist < vDist) {
        dist.set(e.to, newDist);
        parents.set(e.to, [{ from: u, edgeId: e.id }]);
      } else if (newDist === vDist) {
        parents.get(e.to)?.push({ from: u, edgeId: e.id });
      }
    }
  }

  if (dist.get(goal) === Infinity) return null;

  // Reconstruct Canonical Path
  const canonicalPath: string[] = [];
  let curr = goal;
  while (curr) {
    canonicalPath.unshift(curr);
    if (curr === start) break;
    const pars = parents.get(curr);
    if (!pars || pars.length === 0) break;
    curr = pars[0].from;
  }

  // Reconstruct Full Subgraph
  const subgraphEdges = new Set<string>();
  const subgraphNodes = new Set<string>();
  const qBack = [goal];
  const visitedBack = new Set<string>([goal]);
  subgraphNodes.add(goal);

  while (qBack.length > 0) {
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

  // Build wave steps for animation
  const steps: string[][] = [];
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

  // Check for ECMP
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

// Determine impact type
function determineImpactType(
  oldR: PathResult,
  newR: PathResult,
  newEdgeIds: string[]
): ImpactType {
  if (newEdgeIds && newEdgeIds.length > 0) {
    const usesNewEdge = newR.edges.some(e => newEdgeIds.includes(e));
    if (usesNewEdge) return 'MIGRATION';
  }

  const pathChanged = !oldR.edges.every(e => newR.edges.includes(e)) ||
    oldR.edges.length !== newR.edges.length;

  if (pathChanged) return 'REROUTE';
  if (oldR.isECMP && !newR.isECMP) return 'lost_ecmp';
  if (!oldR.isECMP && newR.isECMP) return 'new_ecmp';
  if (newR.cost > oldR.cost) return 'cost_increase';
  return 'cost_decrease';
}

// Worker message handler
self.onmessage = function(e: MessageEvent) {
  const { type, payload } = e.data;

  if (type === 'CALCULATE_IMPACT') {
    const {
      visibleNodes,
      visibleRouters,
      currentEdges,
      modifiedEdges,
      newEdgeIds,
      nodeNameMap
    } = payload;

    const changes: ImpactResult[] = [];
    const totalPairs = visibleRouters.length * (visibleRouters.length - 1);
    let processed = 0;
    const startTime = Date.now();

    for (const src of visibleRouters) {
      for (const dest of visibleRouters) {
        if (src.id === dest.id) continue;

        const oldR = dijkstraDirected(src.id, dest.id, visibleNodes, currentEdges);
        const newR = dijkstraDirected(src.id, dest.id, visibleNodes, modifiedEdges);

        if (oldR && newR && (
          oldR.cost !== newR.cost ||
          oldR.edges.length !== newR.edges.length ||
          !oldR.edges.every(e => newR.edges.includes(e))
        )) {
          const pathChanged = !oldR.edges.every(e => newR.edges.includes(e)) ||
            oldR.edges.length !== newR.edges.length;

          const impactType = determineImpactType(oldR, newR, newEdgeIds || []);

          changes.push({
            src,
            dest,
            oldCost: oldR.cost,
            newCost: newR.cost,
            oldPath: oldR.canonicalPath.map(id => nodeNameMap[id] || id),
            newPath: newR.canonicalPath.map(id => nodeNameMap[id] || id),
            isECMP: newR.isECMP,
            wasECMP: oldR.isECMP,
            impactType,
            pathChanged
          });
        }

        processed++;

        // Send progress updates every 50 calculations
        if (processed % 50 === 0) {
          self.postMessage({
            type: 'PROGRESS',
            payload: {
              processed,
              total: totalPairs,
              percent: Math.round((processed / totalPairs) * 100)
            }
          });
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Send final result
    self.postMessage({
      type: 'COMPLETE',
      payload: {
        changes,
        duration,
        totalPairs,
        changesCount: changes.length
      }
    });
  }
};

export {};











