import { VisNode, VisEdge } from '../types';
import { ECMPPathResult, dijkstraWithECMP, PathInfo } from './dijkstraEnhanced';

export interface WhatIfResult {
  originalPaths: PathInfo[];
  simulatedPaths: PathInfo[];
  affectedPaths: string[];        // Path IDs that changed
  newPaths: string[];             // Paths that are new
  removedPaths: string[];         // Paths no longer possible
  costDelta: number;              // Total cost change
  summary: string;
}

export function simulateLinkFailure(
  source: string,
  dest: string,
  failedEdgeIds: string[],
  nodes: VisNode[],
  edges: VisEdge[]
): WhatIfResult {
  // Original calculation
  const originalResult = dijkstraWithECMP(source, dest, nodes, edges);

  // Remove failed edges
  const remainingEdges = edges.filter(e => !failedEdgeIds.includes(e.id));

  // Recalculate
  const simulatedResult = dijkstraWithECMP(source, dest, nodes, remainingEdges);

  // Compare
  return compareResults(originalResult, simulatedResult);
}

export function simulateCostChange(
  source: string,
  dest: string,
  edgeId: string,
  newCost: number,
  nodes: VisNode[],
  edges: VisEdge[]
): WhatIfResult {
  // Original calculation
  const originalResult = dijkstraWithECMP(source, dest, nodes, edges);

  // Modify cost
  const modifiedEdges = edges.map(e =>
    e.id === edgeId ? { ...e, cost: newCost } : e
  );

  // Recalculate
  const simulatedResult = dijkstraWithECMP(source, dest, nodes, modifiedEdges);

  // Compare
  return compareResults(originalResult, simulatedResult);
}

function compareResults(
  original: ECMPPathResult | null,
  simulated: ECMPPathResult | null
): WhatIfResult {
  const originalPaths = original?.paths || [];
  const simulatedPaths = simulated?.paths || [];

  const originalIds = new Set(originalPaths.map(p => p.id));
  const simulatedIds = new Set(simulatedPaths.map(p => p.id));

  const affectedPaths = originalPaths
    .filter(p => !simulatedPaths.some(sp =>
      sp.nodeSequence.join(',') === p.nodeSequence.join(',')
    ))
    .map(p => p.id);

  const newPaths = simulatedPaths
    .filter(p => !originalPaths.some(op =>
      op.nodeSequence.join(',') === p.nodeSequence.join(',')
    ))
    .map(p => p.id);

  const costDelta = (simulated?.cost || 0) - (original?.cost || 0);

  return {
    originalPaths,
    simulatedPaths,
    affectedPaths,
    newPaths,
    removedPaths: Array.from(originalIds).filter(id => !simulatedIds.has(id)),
    costDelta,
    summary: generateSummary(originalPaths, simulatedPaths, costDelta)
  };
}

function generateSummary(
  original: PathInfo[],
  simulated: PathInfo[],
  costDelta: number
): string {
  if (simulated.length === 0) {
    return 'CRITICAL: No path available after simulation!';
  }

  // Rough estimate of original cost from first path
  const originalTotalCost = original.length > 0 ? original[0].metrics?.totalCost || 100 : 100; 

  if (costDelta > 0) {
    return `Path cost increased by ${costDelta}`;
  } else if (costDelta < 0) {
    return `Path cost decreased by ${Math.abs(costDelta)}`;
  }

  return 'No cost change, but path may have changed';
}
