/**
 * Failure Simulation Engine
 * B02-04: Failure Impact Calculator (P0, 4pts)
 * B02-06: Failure Simulation Engine (P0, 3pts)
 *
 * Core engine that orchestrates failure simulation and coordinates services
 */

import { VisNode, VisEdge } from '../types';
import {
  ImpactMetrics,
  SimulationResult,
  AffectedFlow,
  ConnectivityResult,
  OSPF_CONVERGENCE
} from '../types/failureSimulation.types';
import { analyzeConnectivity } from './connectivityAnalysis';
import { dijkstraDirected } from './dijkstra';

/**
 * Run complete failure simulation
 */
export function runFailureSimulation(
  nodes: VisNode[],
  edges: VisEdge[],
  failedNodes: string[],
  failedEdges: string[]
): SimulationResult {
  const failedNodeSet = new Set(failedNodes);
  const failedEdgeSet = new Set(failedEdges);

  // Calculate connectivity after failures
  const connectivity = analyzeConnectivity(
    nodes, edges, failedNodeSet, failedEdgeSet
  );

  // Calculate impact metrics
  const metrics = calculateFailureImpact(
    nodes, edges, failedNodeSet, failedEdgeSet
  );

  // Sample affected flows (don't calculate all N×N)
  const affectedFlows = sampleAffectedFlows(
    nodes, edges, failedNodeSet, failedEdgeSet, 20
  );

  // Generate recommendations
  const recommendations = generateFailureRecommendations(metrics, connectivity);

  return {
    metrics,
    connectivity,
    affectedFlows,
    recommendations
  };
}

/**
 * Calculate detailed failure impact metrics
 * B02-04: Failure Impact Calculator
 */
export function calculateFailureImpact(
  nodes: VisNode[],
  edges: VisEdge[],
  failedNodes: Set<string>,
  failedEdges: Set<string>
): ImpactMetrics {
  // Get connectivity after failures
  const connectivity = analyzeConnectivity(nodes, edges, failedNodes, failedEdges);

  // Calculate total possible paths (N × (N-1))
  const totalPaths = nodes.length * (nodes.length - 1);

  // Calculate affected paths
  let pathsAffected = 0;
  let reroutablePaths = 0;
  let brokenPaths = 0;

  // Estimate paths affected by failed nodes
  failedNodes.forEach(nodeId => {
    // Count edges connected to this node
    const nodeEdges = edges.filter(e => e.from === nodeId || e.to === nodeId);
    // Rough estimate: affected paths = degree × (N-1)
    pathsAffected += Math.min(nodeEdges.length * (nodes.length - 1), totalPaths);
  });

  // Estimate paths affected by failed edges
  failedEdges.forEach(edgeId => {
    // Each failed edge affects approximately 10-20% of paths
    pathsAffected += Math.floor(totalPaths * 0.1);
  });

  // Cap at total paths
  pathsAffected = Math.min(pathsAffected, totalPaths);

  // Calculate broken vs reroutable based on connectivity
  if (!connectivity.isFullyConnected) {
    // Cross-partition paths are broken
    for (let i = 0; i < connectivity.partitions.length; i++) {
      for (let j = i + 1; j < connectivity.partitions.length; j++) {
        brokenPaths += connectivity.partitions[i].length * connectivity.partitions[j].length * 2;
      }
    }
    reroutablePaths = Math.max(0, pathsAffected - brokenPaths);
  } else {
    // All affected paths can potentially reroute
    reroutablePaths = pathsAffected;
    brokenPaths = 0;
  }

  // Determine affected countries
  const affectedCountries = new Set<string>();

  failedNodes.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    if (node?.country) affectedCountries.add(node.country);
  });

  failedEdges.forEach(edgeId => {
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (fromNode?.country) affectedCountries.add(fromNode.country);
      if (toNode?.country) affectedCountries.add(toNode.country);
    }
  });

  // Estimate convergence time
  const convergenceTime = estimateConvergenceTime(
    failedNodes.size + failedEdges.size,
    nodes.length
  );

  return {
    pathsAffected,
    totalPaths,
    percentAffected: totalPaths > 0 ? (pathsAffected / totalPaths) * 100 : 0,
    convergenceTime,
    isolatedNodes: connectivity.isolatedNodes,
    isPartitioned: !connectivity.isFullyConnected,
    partitionCount: connectivity.partitions.length,
    reroutablePaths,
    brokenPaths,
    affectedCountries: Array.from(affectedCountries)
  };
}

/**
 * Sample affected flows to show concrete examples
 */
function sampleAffectedFlows(
  nodes: VisNode[],
  edges: VisEdge[],
  failedNodes: Set<string>,
  failedEdges: Set<string>,
  sampleSize: number
): AffectedFlow[] {
  const flows: AffectedFlow[] = [];

  // Get remaining elements
  const remainingNodes = nodes.filter(n => !failedNodes.has(n.id));
  const remainingEdges = edges.filter(e =>
    !failedEdges.has(e.id) &&
    !failedNodes.has(e.from) &&
    !failedNodes.has(e.to)
  );

  if (remainingNodes.length < 2) return flows;

  // Sample random source-destination pairs
  const attempts = Math.min(sampleSize * 3, remainingNodes.length * 2);

  for (let i = 0; i < attempts && flows.length < sampleSize; i++) {
    const srcIdx = Math.floor(Math.random() * remainingNodes.length);
    let dstIdx = Math.floor(Math.random() * remainingNodes.length);

    // Ensure different nodes
    if (srcIdx === dstIdx) continue;

    const src = remainingNodes[srcIdx];
    const dst = remainingNodes[dstIdx];

    // Calculate original path (with all elements)
    const originalPath = dijkstraDirected(src.id, dst.id, nodes, edges);

    // Calculate new path (without failed elements)
    const newPath = dijkstraDirected(src.id, dst.id, remainingNodes, remainingEdges);

    // Check if this flow was affected
    const wasAffected = originalPath && (
      originalPath.canonicalPath.some(n => failedNodes.has(n)) ||
      originalPath.edges.some(e => failedEdges.has(e))
    );

    if (wasAffected || !newPath) {
      flows.push({
        source: src.id,
        destination: dst.id,
        oldPath: originalPath?.canonicalPath || [],
        newPath: newPath?.canonicalPath || null,
        costDelta: newPath ? newPath.cost - (originalPath?.cost || 0) : Infinity,
        status: !newPath ? 'BROKEN' : wasAffected ? 'REROUTED' : 'UNAFFECTED'
      });
    }
  }

  // Sort by status (BROKEN first, then REROUTED)
  const statusOrder = { 'BROKEN': 0, 'REROUTED': 1, 'UNAFFECTED': 2 };
  flows.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return flows;
}

/**
 * Estimate OSPF SPF convergence time
 */
function estimateConvergenceTime(failureCount: number, nodeCount: number): number {
  // OSPF convergence components:
  // 1. SPF delay: Default 5 seconds
  // 2. SPF calculation: ~1ms per node
  // 3. LSA propagation: ~10ms per hop (log2 of node count)

  const spfDelay = OSPF_CONVERGENCE.SPF_DELAY_DEFAULT;
  const spfCalc = nodeCount * OSPF_CONVERGENCE.SPF_CALC_PER_NODE;
  const lsaPropagation = Math.log2(Math.max(2, nodeCount)) * OSPF_CONVERGENCE.LSA_PROPAGATION_FACTOR;

  // Total per failure event
  const perFailure = spfDelay + spfCalc + lsaPropagation;

  // Multiple failures may cause multiple SPF runs
  return Math.round(perFailure * Math.min(failureCount, 3)); // Cap at 3 SPF runs
}

/**
 * Generate failure recommendations based on impact analysis
 */
function generateFailureRecommendations(
  metrics: ImpactMetrics,
  connectivity: ConnectivityResult
): string[] {
  const recommendations: string[] = [];

  // Critical: Network partitioned
  if (!connectivity.isFullyConnected && connectivity.partitions.length > 1) {
    recommendations.push(
      `⚠️ CRITICAL: Network is partitioned into ${connectivity.partitions.length} segments. Immediate action required.`
    );

    // Suggest which partitions need reconnection
    const sizes = connectivity.partitions.map(p => p.length).sort((a, b) => b - a);
    if (sizes.length >= 2) {
      recommendations.push(
        `Priority: Reconnect main network (${sizes[0]} nodes) with isolated segment (${sizes[1]} nodes)`
      );
    }
  }

  // Critical: Isolated nodes
  if (metrics.isolatedNodes.length > 0) {
    if (metrics.isolatedNodes.length > 5) {
      recommendations.push(
        `🔴 ${metrics.isolatedNodes.length} nodes are completely isolated. Restore connectivity urgently.`
      );
    } else {
      recommendations.push(
        `🔴 Isolated nodes: ${metrics.isolatedNodes.join(', ')}. Restore connectivity.`
      );
    }
  }

  // High impact: Many broken paths
  if (metrics.brokenPaths > 0) {
    const pctBroken = (metrics.brokenPaths / metrics.totalPaths) * 100;
    if (pctBroken > 20) {
      recommendations.push(
        `🟠 ${metrics.brokenPaths} paths (${pctBroken.toFixed(1)}%) have no alternate route. Consider emergency rerouting.`
      );
    } else {
      recommendations.push(
        `🟠 ${metrics.brokenPaths} paths have no alternate route.`
      );
    }
  }

  // Convergence time warning
  if (metrics.convergenceTime > 60) {
    recommendations.push(
      `⏱️ Estimated convergence time: ${metrics.convergenceTime}s. Consider reducing SPF delay timer.`
    );
  } else if (metrics.convergenceTime > 30) {
    recommendations.push(
      `⏱️ Convergence time: ${metrics.convergenceTime}s. Network should stabilize within a minute.`
    );
  }

  // Country impact
  if (metrics.affectedCountries.length > 2) {
    recommendations.push(
      `🌍 Multiple countries affected: ${metrics.affectedCountries.join(', ')}. May impact SLAs.`
    );
  }

  // Good news if network is resilient
  if (recommendations.length === 0) {
    recommendations.push(
      '✅ Network remains fully connected. All paths have alternates.'
    );
  }

  return recommendations;
}

/**
 * Quick impact assessment (lighter weight than full simulation)
 */
export function quickImpactAssessment(
  nodes: VisNode[],
  edges: VisEdge[],
  failedNodeId?: string,
  failedEdgeId?: string
): {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  wouldPartition: boolean;
  isolatedCount: number;
} {
  const failedNodes = failedNodeId ? new Set([failedNodeId]) : new Set<string>();
  const failedEdges = failedEdgeId ? new Set([failedEdgeId]) : new Set<string>();

  const connectivity = analyzeConnectivity(nodes, edges, failedNodes, failedEdges);

  const wouldPartition = !connectivity.isFullyConnected;
  const isolatedCount = connectivity.isolatedNodes.length + (failedNodeId ? 1 : 0);

  let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  let summary: string;

  if (wouldPartition && connectivity.partitions.length > 2) {
    severity = 'CRITICAL';
    summary = `Would fragment network into ${connectivity.partitions.length} parts`;
  } else if (wouldPartition) {
    severity = 'HIGH';
    summary = 'Would partition the network';
  } else if (isolatedCount > 0) {
    severity = 'MEDIUM';
    summary = `Would isolate ${isolatedCount} node(s)`;
  } else {
    severity = 'LOW';
    summary = 'Minimal impact - alternate paths exist';
  }

  return {
    severity,
    summary,
    wouldPartition,
    isolatedCount
  };
}

/**
 * Calculate cascade failure impact (chain reaction)
 */
export function simulateCascadeFailure(
  nodes: VisNode[],
  edges: VisEdge[],
  initialFailures: string[],
  maxIterations: number = 3
): {
  iterations: Array<{
    step: number;
    failed: string[];
    metrics: ImpactMetrics;
  }>;
  totalFailed: string[];
  finalMetrics: ImpactMetrics;
} {
  const iterations: Array<{
    step: number;
    failed: string[];
    metrics: ImpactMetrics;
  }> = [];

  const allFailed = new Set<string>();
  initialFailures.forEach(f => allFailed.add(f));

  // Initial failure
  const isNode = (id: string) => nodes.some(n => n.id === id);
  const initialNodeFailures = initialFailures.filter(isNode);
  const initialEdgeFailures = initialFailures.filter(f => !isNode(f));

  let metrics = calculateFailureImpact(
    nodes, edges,
    new Set(initialNodeFailures),
    new Set(initialEdgeFailures)
  );

  iterations.push({
    step: 0,
    failed: [...initialFailures],
    metrics: { ...metrics }
  });

  // Simulate cascade (simplified: isolated nodes cause connected edges to fail)
  for (let i = 1; i <= maxIterations; i++) {
    const newFailures: string[] = [];

    // Isolated nodes cause their edges to "fail" (no traffic)
    metrics.isolatedNodes.forEach(nodeId => {
      edges.forEach(e => {
        if ((e.from === nodeId || e.to === nodeId) && !allFailed.has(e.id)) {
          newFailures.push(e.id);
          allFailed.add(e.id);
        }
      });
    });

    if (newFailures.length === 0) break;

    // Recalculate with new failures
    const allNodes = Array.from(allFailed).filter(isNode);
    const allEdges = Array.from(allFailed).filter(f => !isNode(f));

    metrics = calculateFailureImpact(
      nodes, edges,
      new Set(allNodes),
      new Set(allEdges)
    );

    iterations.push({
      step: i,
      failed: newFailures,
      metrics: { ...metrics }
    });
  }

  return {
    iterations,
    totalFailed: Array.from(allFailed),
    finalMetrics: metrics
  };
}
