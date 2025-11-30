import { VisNode, VisEdge } from '../types';

export interface ConnectivityResult {
  isFullyConnected: boolean;
  componentCount: number;
  largestComponent: string[];
  isolatedNodes: string[];
  partitions: string[][];
}

export function analyzeConnectivity(
  nodes: VisNode[],
  edges: VisEdge[],
  excludeNodes: Set<string> = new Set(),
  excludeEdges: Set<string> = new Set()
): ConnectivityResult {
  // Filter out failed elements
  const activeNodes = nodes.filter(n => !excludeNodes.has(n.id));
  const activeEdges = edges.filter(e =>
    !excludeEdges.has(e.id) &&
    !excludeNodes.has(e.from) &&
    !excludeNodes.has(e.to)
  );

  if (activeNodes.length === 0) {
    return {
      isFullyConnected: false,
      componentCount: 0,
      largestComponent: [],
      isolatedNodes: nodes.map(n => n.id),
      partitions: []
    };
  }

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  activeNodes.forEach(n => adjacency.set(n.id, new Set()));

  activeEdges.forEach(e => {
    if (adjacency.has(e.from) && adjacency.has(e.to)) {
      adjacency.get(e.from)!.add(e.to);
      adjacency.get(e.to)!.add(e.from);
    }
  });

  // Find connected components using BFS
  const visited = new Set<string>();
  const partitions: string[][] = [];

  for (const node of activeNodes) {
    if (visited.has(node.id)) continue;

    const component: string[] = [];
    const queue: string[] = [node.id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      component.push(current);

      const neighbors = adjacency.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    partitions.push(component);
  }

  // Identify largest component and isolated nodes
  const largestComponent = partitions.reduce((a, b) =>
    a.length > b.length ? a : b, []
  );

  // Correctly identify isolated nodes (including those we excluded)
  // But usually isolated means "in a component of size 1"
  // AND nodes that were excluded are technically "down", not "isolated" in this context?
  // PRD B02-01 says "isolated nodes" in the result.
  // Let's assume isolated nodes are active nodes with no connections (component size 1)
  const isolatedActiveNodes = partitions
    .filter(p => p.length === 1)
    .map(p => p[0]);

  return {
    isFullyConnected: partitions.length === 1,
    componentCount: partitions.length,
    largestComponent,
    isolatedNodes: isolatedActiveNodes,
    partitions
  };
}
