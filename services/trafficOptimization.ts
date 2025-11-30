import { VisNode, VisEdge } from '../types';
import { TrafficMatrix } from './trafficMatrixGenerator';
import { UtilizationResult, calculateUtilization } from './utilizationCalculation';

export interface OptimizationResult {
  proposedCosts: Map<string, number>;  // edgeId -> new cost
  changes: CostChange[];
  improvement: OptimizationMetrics;
  iterations: number;
  converged: boolean;
}

export interface CostChange {
  edgeId: string;
  edgeLabel: string;
  oldCost: number;
  newCost: number;
  changePercent: number;
  impact: {
    flowsAffected: number;
    utilizationDelta: number;
  };
}

export interface OptimizationMetrics {
  oldMaxUtil: number;
  newMaxUtil: number;
  oldAvgUtil: number;
  newAvgUtil: number;
  congestedReduction: number;
  pathsChanged: number;
}

export interface OptimizationConstraints {
  maxCostChangePercent: number;    // 0.1 - 1.0 (10% - 100%)
  maxChangesCount: number;         // Max number of cost changes
  protectedEdges: Set<string>;     // Edges that cannot be changed
  minCost: number;                 // Default: 1
  maxCost: number;                 // Default: 65535
}

export interface OptimizationGoal {
  type: 'balance' | 'latency' | 'diversity' | 'custom';
  customObjective?: (util: UtilizationResult) => number;
}

export function optimizeCosts(
  nodes: VisNode[],
  edges: VisEdge[],
  trafficMatrix: TrafficMatrix,
  goal: OptimizationGoal,
  constraints: OptimizationConstraints,
  onProgress?: (progress: number, bestSoFar: number) => void
): OptimizationResult {
  const MAX_ITERATIONS = 50; // Reduced for performance

  // Get current state
  let currentCosts = new Map<string, number>();
  edges.forEach(e => currentCosts.set(e.id, e.cost));

  // Initial baseline
  const initialUtil = calculateUtilization(nodes, edges, trafficMatrix);
  let bestCosts = new Map(currentCosts);
  let bestObjective = evaluateObjective(
    nodes, edges, trafficMatrix, currentCosts, goal
  );

  const changes: CostChange[] = [];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Report progress
    if (onProgress) {
      onProgress(
        (iteration / MAX_ITERATIONS) * 100,
        (1 - bestObjective) * 100 // Visualization of improvement
      );
    }

    // Use currentCosts to simulate routing
    const currentEdges = edges.map(e => ({ ...e, cost: currentCosts.get(e.id) || e.cost }));
    const utilResult = calculateUtilization(nodes, currentEdges, trafficMatrix);

    if (utilResult.congestedEdges.length === 0) {
      break; // No congestion, done!
    }

    // Very simple greedy strategy: Increase cost of most congested link
    // to discourage traffic
    const mostCongested = utilResult.congestedEdges[0];

    // Skip if protected
    if (constraints.protectedEdges.has(mostCongested)) continue;

    // Increase cost by 50%
    const currentCost = currentCosts.get(mostCongested) || 10;
    const newCost = Math.min(constraints.maxCost, Math.round(currentCost * 1.5));

    if (newCost === currentCost) continue;

    // Apply change tentatively
    const testCosts = new Map(currentCosts);
    testCosts.set(mostCongested, newCost);

    const newObjective = evaluateObjective(
      nodes, edges, trafficMatrix, testCosts, goal
    );

    // If goal is 'balance', we want to minimize maxUtilization
    // If newObjective < bestObjective, we found improvement
    if (newObjective < bestObjective) {
      bestObjective = newObjective;
      bestCosts = new Map(testCosts);
      currentCosts = testCosts; // Accept the change

      // Record change
      const edge = edges.find(e => e.id === mostCongested)!;
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);

      changes.push({
        edgeId: mostCongested,
        edgeLabel: `${fromNode?.label || '??'} → ${toNode?.label || '??'}`,
        oldCost: currentCost,
        newCost,
        changePercent: ((newCost - currentCost) / currentCost) * 100,
        impact: {
          flowsAffected: 0, // Requires complex calculation
          utilizationDelta: bestObjective - newObjective
        }
      });

      if (changes.length >= constraints.maxChangesCount) {
        break;
      }
    } else {
      // Change didn't help or made things worse, try simple randomization for local minima escape
      // In real implementation, this would be more sophisticated (Simulated Annealing)
      break;
    }
  }

  // Calculate final metrics
  const finalEdges = edges.map(e => ({ ...e, cost: bestCosts.get(e.id) || e.cost }));
  const finalUtil = calculateUtilization(nodes, finalEdges, trafficMatrix);

  return {
    proposedCosts: bestCosts,
    changes,
    improvement: {
      oldMaxUtil: initialUtil.maxUtilization,
      newMaxUtil: finalUtil.maxUtilization,
      oldAvgUtil: initialUtil.avgUtilization,
      newAvgUtil: finalUtil.avgUtilization,
      congestedReduction: initialUtil.congestedEdges.length - finalUtil.congestedEdges.length,
      pathsChanged: changes.length // Simplified
    },
    iterations: MAX_ITERATIONS,
    converged: true
  };
}

function evaluateObjective(
  nodes: VisNode[],
  edges: VisEdge[],
  trafficMatrix: TrafficMatrix,
  costs: Map<string, number>,
  goal: OptimizationGoal
): number {
  const modifiedEdges = edges.map(e => ({
    ...e,
    cost: costs.get(e.id) || e.cost
  }));

  const util = calculateUtilization(nodes, modifiedEdges, trafficMatrix);

  switch (goal.type) {
    case 'balance':
      return util.maxUtilization; // Minimize max utilization

    case 'latency':
      // Minimize average hop count (simplified as average utilization?)
      // Actually latency optimization requires minimizing path length
      // Here we just proxy with utilization for now
      return util.avgUtilization;

    default:
      return util.maxUtilization;
  }
}
