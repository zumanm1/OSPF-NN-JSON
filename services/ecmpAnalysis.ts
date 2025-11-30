/**
 * ECMP Analysis Service
 * B01-03: Divergence/Convergence Analysis (P1, 3pts)
 * B01-05: Load Balancing Calculator (P1, 2pts)
 *
 * Analyze ECMP topology and calculate load distribution
 */

import { VisNode, VisEdge } from '../types';
import {
  PathInfo,
  ECMPGroup,
  LoadBalancingInfo,
  DivergencePoint,
  ConvergencePoint
} from '../types/pathComparison.types';
import { dijkstraWithECMP, analyzeTopology } from './dijkstraEnhanced';

/**
 * Create a complete ECMP group analysis
 */
export function createECMPGroup(
  source: string,
  destination: string,
  nodes: VisNode[],
  edges: VisEdge[]
): ECMPGroup | null {
  const result = dijkstraWithECMP(source, destination, nodes, edges);

  if (!result || result.paths.length === 0) {
    return null;
  }

  const loadBalancing = calculateLoadBalancing(result.paths, edges);

  return {
    groupId: `ecmp-${source}-${destination}`,
    source,
    destination,
    cost: result.cost,
    paths: result.paths,
    divergencePoints: result.divergencePoints,
    convergencePoints: result.convergencePoints,
    loadBalancing
  };
}

/**
 * Calculate load balancing distribution across ECMP paths
 * B01-05: Load Balancing Calculator
 */
export function calculateLoadBalancing(
  paths: PathInfo[],
  edges: VisEdge[]
): LoadBalancingInfo {
  const distribution = new Map<string, number>();
  const perPathCapacity = new Map<string, number>();
  const warnings: string[] = [];

  if (paths.length === 0) {
    return {
      distribution,
      perPathCapacity,
      totalCapacity: 0,
      isBalanced: true,
      warnings: []
    };
  }

  // Default: equal distribution (ECMP standard behavior)
  const equalShare = 100 / paths.length;

  paths.forEach(path => {
    distribution.set(path.id, Math.round(equalShare * 100) / 100);
    perPathCapacity.set(path.id, path.metrics.minBandwidth);
  });

  // Calculate total capacity
  const totalCapacity = paths.reduce(
    (sum, p) => sum + p.metrics.minBandwidth,
    0
  );

  // Check for capacity imbalance and generate warnings
  const avgCapacity = totalCapacity / paths.length;

  paths.forEach(path => {
    // Low capacity warning
    if (path.metrics.minBandwidth < avgCapacity * 0.5) {
      warnings.push(
        `Path ${path.id} has low capacity (${path.metrics.minBandwidth}Mbps) ` +
        `compared to average (${avgCapacity.toFixed(0)}Mbps)`
      );
    }

    // High utilization warning
    if (path.metrics.maxUtilization > 0.8) {
      warnings.push(
        `Path ${path.id} has high utilization (${(path.metrics.maxUtilization * 100).toFixed(0)}%)`
      );
    }

    // Long path warning
    const avgHops = paths.reduce((sum, p) => sum + p.metrics.hopCount, 0) / paths.length;
    if (path.metrics.hopCount > avgHops * 1.5) {
      warnings.push(
        `Path ${path.id} has more hops (${path.metrics.hopCount}) than average (${avgHops.toFixed(1)})`
      );
    }
  });

  // Check if load is balanced (all capacities within 30% of average)
  const isBalanced = paths.every(path =>
    Math.abs(path.metrics.minBandwidth - avgCapacity) / avgCapacity < 0.3
  );

  return {
    distribution,
    perPathCapacity,
    totalCapacity,
    isBalanced,
    warnings
  };
}

/**
 * Calculate weighted load balancing based on capacity
 * Some routers support unequal-cost load balancing
 */
export function calculateWeightedLoadBalancing(
  paths: PathInfo[],
  edges: VisEdge[]
): LoadBalancingInfo {
  const distribution = new Map<string, number>();
  const perPathCapacity = new Map<string, number>();
  const warnings: string[] = [];

  if (paths.length === 0) {
    return {
      distribution,
      perPathCapacity,
      totalCapacity: 0,
      isBalanced: true,
      warnings: []
    };
  }

  // Calculate total capacity
  const totalCapacity = paths.reduce(
    (sum, p) => sum + p.metrics.minBandwidth,
    0
  );

  // Distribute proportionally to capacity
  paths.forEach(path => {
    const share = totalCapacity > 0
      ? (path.metrics.minBandwidth / totalCapacity) * 100
      : 100 / paths.length;

    distribution.set(path.id, Math.round(share * 100) / 100);
    perPathCapacity.set(path.id, path.metrics.minBandwidth);
  });

  // Check balance
  const avgShare = 100 / paths.length;
  const isBalanced = paths.every(path => {
    const share = distribution.get(path.id) || 0;
    return Math.abs(share - avgShare) < 20; // Within 20 percentage points
  });

  if (!isBalanced) {
    warnings.push('Load distribution is uneven due to capacity differences');
  }

  return {
    distribution,
    perPathCapacity,
    totalCapacity,
    isBalanced,
    warnings
  };
}

/**
 * Analyze ECMP effectiveness across all node pairs
 */
export function analyzeNetworkECMP(
  nodes: VisNode[],
  edges: VisEdge[],
  sampleSize: number = 20
): {
  ecmpPairs: number;
  nonEcmpPairs: number;
  avgPathCount: number;
  maxPathCount: number;
  ecmpGroups: ECMPGroup[];
} {
  const ecmpGroups: ECMPGroup[] = [];
  let ecmpPairs = 0;
  let nonEcmpPairs = 0;
  let totalPaths = 0;
  let maxPathCount = 0;

  // Sample random pairs for large networks
  const nodeIds = nodes.map(n => n.id);
  const pairs: [string, string][] = [];

  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      pairs.push([nodeIds[i], nodeIds[j]]);
    }
  }

  // Shuffle and take sample
  const shuffled = pairs.sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, Math.min(sampleSize, pairs.length));

  sample.forEach(([src, dst]) => {
    const result = dijkstraWithECMP(src, dst, nodes, edges);

    if (result) {
      totalPaths += result.pathCount;
      maxPathCount = Math.max(maxPathCount, result.pathCount);

      if (result.isECMP) {
        ecmpPairs++;
        const group = createECMPGroup(src, dst, nodes, edges);
        if (group) {
          ecmpGroups.push(group);
        }
      } else {
        nonEcmpPairs++;
      }
    }
  });

  const totalPairsChecked = ecmpPairs + nonEcmpPairs;

  return {
    ecmpPairs,
    nonEcmpPairs,
    avgPathCount: totalPairsChecked > 0 ? totalPaths / totalPairsChecked : 0,
    maxPathCount,
    ecmpGroups: ecmpGroups.slice(0, 10) // Limit to top 10
  };
}

/**
 * Find critical nodes that would break ECMP if failed
 */
export function findECMPCriticalNodes(
  ecmpGroup: ECMPGroup,
  nodes: VisNode[],
  edges: VisEdge[]
): Array<{
  nodeId: string;
  label: string;
  pathsAffected: number;
  wouldBreakECMP: boolean;
}> {
  const criticalNodes: Array<{
    nodeId: string;
    label: string;
    pathsAffected: number;
    wouldBreakECMP: boolean;
  }> = [];

  // Get all unique nodes in all ECMP paths (excluding source/dest)
  const transitNodes = new Set<string>();
  ecmpGroup.paths.forEach(path => {
    path.nodeSequence.slice(1, -1).forEach(nodeId => {
      transitNodes.add(nodeId);
    });
  });

  // Test each node removal
  transitNodes.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Remove node and its edges
    const remainingNodes = nodes.filter(n => n.id !== nodeId);
    const remainingEdges = edges.filter(e => e.from !== nodeId && e.to !== nodeId);

    // Recalculate paths
    const result = dijkstraWithECMP(
      ecmpGroup.source,
      ecmpGroup.destination,
      remainingNodes,
      remainingEdges
    );

    const pathsAffected = ecmpGroup.paths.filter(path =>
      path.nodeSequence.includes(nodeId)
    ).length;

    const wouldBreakECMP = !result || !result.isECMP || result.pathCount < ecmpGroup.paths.length;

    if (pathsAffected > 0) {
      criticalNodes.push({
        nodeId,
        label: node.label || nodeId,
        pathsAffected,
        wouldBreakECMP
      });
    }
  });

  // Sort by paths affected (descending)
  return criticalNodes.sort((a, b) => b.pathsAffected - a.pathsAffected);
}

/**
 * Find critical edges that would break ECMP if failed
 */
export function findECMPCriticalEdges(
  ecmpGroup: ECMPGroup,
  nodes: VisNode[],
  edges: VisEdge[]
): Array<{
  edgeId: string;
  label: string;
  pathsAffected: number;
  wouldBreakECMP: boolean;
}> {
  const criticalEdges: Array<{
    edgeId: string;
    label: string;
    pathsAffected: number;
    wouldBreakECMP: boolean;
  }> = [];

  // Get all unique edges in all ECMP paths
  const ecmpEdges = new Set<string>();
  ecmpGroup.paths.forEach(path => {
    path.edgeSequence.forEach(edgeId => {
      ecmpEdges.add(edgeId);
    });
  });

  // Test each edge removal
  ecmpEdges.forEach(edgeId => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;

    // Remove edge
    const remainingEdges = edges.filter(e => e.id !== edgeId);

    // Recalculate paths
    const result = dijkstraWithECMP(
      ecmpGroup.source,
      ecmpGroup.destination,
      nodes,
      remainingEdges
    );

    const pathsAffected = ecmpGroup.paths.filter(path =>
      path.edgeSequence.includes(edgeId)
    ).length;

    const wouldBreakECMP = !result || !result.isECMP || result.pathCount < ecmpGroup.paths.length;

    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);

    criticalEdges.push({
      edgeId,
      label: `${fromNode?.label || edge.from} → ${toNode?.label || edge.to}`,
      pathsAffected,
      wouldBreakECMP
    });
  });

  // Sort by paths affected (descending)
  return criticalEdges.sort((a, b) => b.pathsAffected - a.pathsAffected);
}

/**
 * Get ECMP statistics summary
 */
export function getECMPSummary(ecmpGroup: ECMPGroup): {
  pathCount: number;
  totalCost: number;
  divergenceCount: number;
  convergenceCount: number;
  avgHops: number;
  avgLatency: number;
  totalBandwidth: number;
  countriesCovered: string[];
} {
  const paths = ecmpGroup.paths;

  const avgHops = paths.reduce((sum, p) => sum + p.metrics.hopCount, 0) / paths.length;
  const avgLatency = paths.reduce((sum, p) => sum + p.metrics.estimatedLatency, 0) / paths.length;
  const totalBandwidth = paths.reduce((sum, p) => sum + p.metrics.minBandwidth, 0);

  const countriesCovered = new Set<string>();
  paths.forEach(path => {
    path.metrics.countriesTraversed.forEach(c => countriesCovered.add(c));
  });

  return {
    pathCount: paths.length,
    totalCost: ecmpGroup.cost,
    divergenceCount: ecmpGroup.divergencePoints.length,
    convergenceCount: ecmpGroup.convergencePoints.length,
    avgHops,
    avgLatency,
    totalBandwidth,
    countriesCovered: Array.from(countriesCovered)
  };
}
