# Backend Architecture: Traffic Engineering & Cost Optimization Engine

**Feature**: Traffic Engineering & Cost Optimization
**Version**: 1.0
**Last Updated**: 2025-11-29
**Target Engineer**: Backend/Algorithm Developer

---

## Overview

This document defines the backend services and algorithms for the Traffic Engineering feature, including cost optimization algorithms and traffic analysis.

---

## Service Architecture

```
services/
├── trafficOptimization.ts       # Core optimization algorithm
├── utilizationCalculation.ts    # Link utilization calculation
├── trafficMatrixGenerator.ts    # Synthetic traffic generation
├── congestionAnalysis.ts        # Hotspot detection
├── constraintSolver.ts          # Optimization constraints
└── validationService.ts         # Safety checks

types/
└── trafficEngineering.types.ts  # TypeScript interfaces
```

---

## Task Breakdown: Backend Tasks (B03-xx)

### B03-01: Traffic Matrix Generator
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: None

**Description**:
Generate synthetic traffic matrix based on node importance and geographic distribution.

**Implementation**:
```typescript
// File: services/trafficMatrixGenerator.ts
export type TrafficMatrix = Map<string, Map<string, number>>; // src -> dest -> Mbps

export interface TrafficGenerationOptions {
  model: 'uniform' | 'population' | 'distance' | 'custom';
  baseTraffic: number;           // Mbps per flow
  scaleFactor: number;           // Multiplier
  customWeights?: Map<string, number>; // Node ID -> importance
}

// Country populations (millions) for weighted traffic
const COUNTRY_POPULATIONS: Record<string, number> = {
  'GBR': 67, 'USA': 331, 'DEU': 83, 'FRA': 67,
  'ZAF': 60, 'LSO': 2, 'ZWE': 15, 'MOZ': 31,
  'AGO': 33, 'PRT': 10
};

export function generateTrafficMatrix(
  nodes: VisNode[],
  options: TrafficGenerationOptions = { model: 'population', baseTraffic: 100, scaleFactor: 1 }
): TrafficMatrix {
  const matrix: TrafficMatrix = new Map();

  nodes.forEach(src => {
    matrix.set(src.id, new Map());

    nodes.forEach(dest => {
      if (src.id === dest.id) return;

      let traffic: number;

      switch (options.model) {
        case 'uniform':
          traffic = options.baseTraffic;
          break;

        case 'population':
          const srcPop = COUNTRY_POPULATIONS[src.country || ''] || 10;
          const destPop = COUNTRY_POPULATIONS[dest.country || ''] || 10;
          traffic = Math.sqrt(srcPop * destPop) * options.baseTraffic / 10;
          break;

        case 'distance':
          // Less traffic to distant nodes
          const sameCountry = src.country === dest.country;
          traffic = sameCountry
            ? options.baseTraffic * 2
            : options.baseTraffic * 0.5;
          break;

        case 'custom':
          const srcWeight = options.customWeights?.get(src.id) || 1;
          const destWeight = options.customWeights?.get(dest.id) || 1;
          traffic = options.baseTraffic * srcWeight * destWeight;
          break;

        default:
          traffic = options.baseTraffic;
      }

      matrix.get(src.id)!.set(dest.id, traffic * options.scaleFactor);
    });
  });

  return matrix;
}

export function calculateTotalTraffic(matrix: TrafficMatrix): number {
  let total = 0;
  matrix.forEach(destMap => {
    destMap.forEach(traffic => {
      total += traffic;
    });
  });
  return total;
}
```

---

### B03-02: Utilization Calculation Service
**Priority**: P0 (Must Have)
**Effort**: 4 points
**Dependencies**: B03-01

**Description**:
Calculate link utilization based on traffic matrix and routing paths.

**Implementation**:
```typescript
// File: services/utilizationCalculation.ts
export interface UtilizationResult {
  edgeUtilization: Map<string, number>;     // edgeId -> utilization (0-1)
  edgeTraffic: Map<string, number>;         // edgeId -> Mbps
  maxUtilization: number;
  avgUtilization: number;
  congestedEdges: string[];                 // edges > 80%
  underutilizedEdges: string[];             // edges < 20%
}

export function calculateUtilization(
  nodes: VisNode[],
  edges: VisEdge[],
  trafficMatrix: TrafficMatrix
): UtilizationResult {
  const edgeTraffic = new Map<string, number>();

  // Initialize all edges to 0 traffic
  edges.forEach(e => edgeTraffic.set(e.id, 0));

  // For each source-destination pair, route traffic along shortest path
  trafficMatrix.forEach((destMap, srcId) => {
    destMap.forEach((traffic, destId) => {
      // Get shortest path
      const path = dijkstraDirected(srcId, destId, nodes, edges);

      if (path) {
        // Add traffic to each edge in path
        path.edges.forEach(edgeId => {
          const current = edgeTraffic.get(edgeId) || 0;
          edgeTraffic.set(edgeId, current + traffic);
        });
      }
    });
  });

  // Calculate utilization (traffic / capacity)
  const edgeUtilization = new Map<string, number>();
  const congestedEdges: string[] = [];
  const underutilizedEdges: string[] = [];
  let totalUtilization = 0;
  let edgeCount = 0;

  edges.forEach(edge => {
    const traffic = edgeTraffic.get(edge.id) || 0;
    const capacity = edge.sourceCapacity?.total_capacity_mbps || 10000; // Default 10Gbps
    const utilization = traffic / capacity;

    edgeUtilization.set(edge.id, Math.min(utilization, 1)); // Cap at 100%

    if (utilization > 0.8) {
      congestedEdges.push(edge.id);
    } else if (utilization < 0.2) {
      underutilizedEdges.push(edge.id);
    }

    totalUtilization += utilization;
    edgeCount++;
  });

  const maxUtilization = Math.max(...Array.from(edgeUtilization.values()));
  const avgUtilization = edgeCount > 0 ? totalUtilization / edgeCount : 0;

  return {
    edgeUtilization,
    edgeTraffic,
    maxUtilization,
    avgUtilization,
    congestedEdges,
    underutilizedEdges
  };
}
```

---

### B03-03: Cost Optimization Algorithm (Greedy)
**Priority**: P0 (Must Have)
**Effort**: 5 points
**Dependencies**: B03-02

**Description**:
Greedy optimization algorithm to suggest cost changes that reduce congestion.

**Implementation**:
```typescript
// File: services/trafficOptimization.ts
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
  const MAX_ITERATIONS = 100;

  // Get current state
  let currentCosts = new Map<string, number>();
  edges.forEach(e => currentCosts.set(e.id, e.cost));

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
        (1 - bestObjective) * 100
      );
    }

    // Find most congested edge
    const utilResult = calculateUtilizationWithCosts(
      nodes, edges, trafficMatrix, currentCosts
    );

    if (utilResult.congestedEdges.length === 0) {
      break; // No congestion, done!
    }

    const mostCongested = utilResult.congestedEdges[0];

    // Skip if protected
    if (constraints.protectedEdges.has(mostCongested)) continue;

    // Find alternate paths that could relieve congestion
    const alternates = findAlternatePaths(
      mostCongested, nodes, edges, currentCosts
    );

    if (alternates.length === 0) continue;

    // Try lowering cost of an alternate path
    for (const alt of alternates) {
      if (constraints.protectedEdges.has(alt.edgeId)) continue;

      const currentCost = currentCosts.get(alt.edgeId)!;
      const minAllowed = Math.max(
        constraints.minCost,
        currentCost * (1 - constraints.maxCostChangePercent)
      );
      const newCost = Math.max(minAllowed, currentCost - 5);

      if (newCost === currentCost) continue;

      // Try this change
      const testCosts = new Map(currentCosts);
      testCosts.set(alt.edgeId, newCost);

      const newObjective = evaluateObjective(
        nodes, edges, trafficMatrix, testCosts, goal
      );

      if (newObjective < bestObjective) {
        bestObjective = newObjective;
        bestCosts = new Map(testCosts);
        currentCosts = testCosts;

        // Record change
        const edge = edges.find(e => e.id === alt.edgeId)!;
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);

        changes.push({
          edgeId: alt.edgeId,
          edgeLabel: `${fromNode?.label} → ${toNode?.label}`,
          oldCost: currentCost,
          newCost,
          changePercent: ((newCost - currentCost) / currentCost) * 100,
          impact: {
            flowsAffected: alt.flowCount,
            utilizationDelta: newObjective - bestObjective
          }
        });

        // Check if we've hit max changes
        if (changes.length >= constraints.maxChangesCount) {
          return buildResult(edges, bestCosts, changes, iteration, true);
        }

        break;
      }
    }
  }

  return buildResult(edges, bestCosts, changes, MAX_ITERATIONS, true);
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
      // Minimize average hop count (simplified)
      return util.avgUtilization;

    case 'diversity':
      // Maximize country diversity (inverted for minimization)
      return 1 - calculateDiversity(nodes, modifiedEdges, trafficMatrix);

    case 'custom':
      return goal.customObjective!(util);

    default:
      return util.maxUtilization;
  }
}

function buildResult(
  edges: VisEdge[],
  bestCosts: Map<string, number>,
  changes: CostChange[],
  iterations: number,
  converged: boolean
): OptimizationResult {
  return {
    proposedCosts: bestCosts,
    changes,
    improvement: {
      oldMaxUtil: 0,     // Set by caller
      newMaxUtil: 0,
      oldAvgUtil: 0,
      newAvgUtil: 0,
      congestedReduction: 0,
      pathsChanged: changes.reduce((sum, c) => sum + c.impact.flowsAffected, 0)
    },
    iterations,
    converged
  };
}
```

---

### B03-04: Congestion Analysis Service
**Priority**: P1 (Should Have)
**Effort**: 2 points
**Dependencies**: B03-02

**Description**:
Analyze congestion hotspots and identify root causes.

**Implementation**:
```typescript
// File: services/congestionAnalysis.ts
export interface CongestionHotspot {
  edgeId: string;
  edgeLabel: string;
  utilization: number;
  traffic: number;
  capacity: number;
  flowsTraversing: number;
  rootCause: string;
  recommendations: string[];
}

export function analyzeCongestion(
  nodes: VisNode[],
  edges: VisEdge[],
  trafficMatrix: TrafficMatrix,
  utilization: UtilizationResult
): CongestionHotspot[] {
  const hotspots: CongestionHotspot[] = [];

  for (const edgeId of utilization.congestedEdges) {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) continue;

    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);

    // Count flows using this edge
    let flowCount = 0;
    const flowsByCountryPair = new Map<string, number>();

    trafficMatrix.forEach((destMap, srcId) => {
      destMap.forEach((traffic, destId) => {
        const path = dijkstraDirected(srcId, destId, nodes, edges);
        if (path && path.edges.includes(edgeId)) {
          flowCount++;

          const srcNode = nodes.find(n => n.id === srcId);
          const destNode = nodes.find(n => n.id === destId);
          const key = `${srcNode?.country}→${destNode?.country}`;
          flowsByCountryPair.set(key, (flowsByCountryPair.get(key) || 0) + 1);
        }
      });
    });

    // Identify root cause
    const topCountryPair = Array.from(flowsByCountryPair.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const rootCause = topCountryPair
      ? `${topCountryPair[1]} flows from ${topCountryPair[0]} route through this link`
      : 'Multiple flows converge on this link';

    // Generate recommendations
    const recommendations = [
      `Increase capacity of ${fromNode?.label} → ${toNode?.label}`,
      `Add alternate link between ${fromNode?.country} and ${toNode?.country}`,
      `Reduce cost of alternate paths to distribute traffic`
    ];

    hotspots.push({
      edgeId,
      edgeLabel: `${fromNode?.label} → ${toNode?.label}`,
      utilization: utilization.edgeUtilization.get(edgeId) || 0,
      traffic: utilization.edgeTraffic.get(edgeId) || 0,
      capacity: edge.sourceCapacity?.total_capacity_mbps || 10000,
      flowsTraversing: flowCount,
      rootCause,
      recommendations
    });
  }

  // Sort by utilization descending
  hotspots.sort((a, b) => b.utilization - a.utilization);

  return hotspots;
}
```

---

### B03-05: Validation Service
**Priority**: P0 (Must Have)
**Effort**: 2 points
**Dependencies**: B03-03

**Description**:
Validate proposed cost changes before application.

**Implementation**:
```typescript
// File: services/validationService.ts
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  edgeId?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  edgeId?: string;
}

export function validateCostChanges(
  nodes: VisNode[],
  edges: VisEdge[],
  proposedCosts: Map<string, number>,
  constraints: OptimizationConstraints
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check each proposed cost
  proposedCosts.forEach((newCost, edgeId) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) {
      errors.push({
        code: 'EDGE_NOT_FOUND',
        message: `Edge ${edgeId} not found`,
        edgeId
      });
      return;
    }

    // Check OSPF cost range
    if (newCost < 1 || newCost > 65535) {
      errors.push({
        code: 'COST_OUT_OF_RANGE',
        message: `Cost ${newCost} outside OSPF range [1, 65535]`,
        edgeId
      });
    }

    // Check change percent
    const changePercent = Math.abs((newCost - edge.cost) / edge.cost);
    if (changePercent > constraints.maxCostChangePercent) {
      warnings.push({
        code: 'LARGE_COST_CHANGE',
        message: `Cost change ${(changePercent * 100).toFixed(0)}% exceeds limit ${(constraints.maxCostChangePercent * 100).toFixed(0)}%`,
        edgeId
      });
    }

    // Check protected edges
    if (constraints.protectedEdges.has(edgeId)) {
      errors.push({
        code: 'PROTECTED_EDGE',
        message: `Edge ${edgeId} is protected and cannot be changed`,
        edgeId
      });
    }
  });

  // Verify all paths still exist with new costs
  const modifiedEdges = edges.map(e => ({
    ...e,
    cost: proposedCosts.get(e.id) || e.cost
  }));

  // Check connectivity
  const connectivity = analyzeConnectivity(nodes, modifiedEdges);
  if (!connectivity.isFullyConnected) {
    errors.push({
      code: 'CONNECTIVITY_BROKEN',
      message: 'Proposed changes would break network connectivity'
    });
  }

  // Check for routing loops (simplified)
  const loopDetected = detectRoutingLoops(nodes, modifiedEdges);
  if (loopDetected) {
    errors.push({
      code: 'ROUTING_LOOP',
      message: 'Proposed changes may create routing loops'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function detectRoutingLoops(nodes: VisNode[], edges: VisEdge[]): boolean {
  // Simplified loop detection: check if any path has a cycle
  // Full implementation would use SPF algorithm
  return false; // Placeholder
}
```

---

## Backend Task Summary Table

| Task ID | Task Name | Priority | Effort | Dependencies |
|---------|-----------|----------|--------|--------------|
| B03-01 | Traffic Matrix Generator | P0 | 3 pts | None |
| B03-02 | Utilization Calculation Service | P0 | 4 pts | B03-01 |
| B03-03 | Cost Optimization Algorithm | P0 | 5 pts | B03-02 |
| B03-04 | Congestion Analysis Service | P1 | 2 pts | B03-02 |
| B03-05 | Validation Service | P0 | 2 pts | B03-03 |

**Total Backend Effort**: 16 story points

---

## Data Type Definitions

```typescript
// File: types/trafficEngineering.types.ts

export type TrafficMatrix = Map<string, Map<string, number>>;

export type OptimizationGoalType = 'balance' | 'latency' | 'diversity' | 'cost' | 'custom';

export interface OptimizationConstraints {
  maxCostChangePercent: number;
  maxChangesCount: number;
  protectedEdges: Set<string>;
  minCost: number;
  maxCost: number;
}

export interface OptimizationResult {
  proposedCosts: Map<string, number>;
  changes: CostChange[];
  improvement: OptimizationMetrics;
  iterations: number;
  converged: boolean;
}

export interface OptimizationMetrics {
  oldMaxUtil: number;
  newMaxUtil: number;
  oldAvgUtil: number;
  newAvgUtil: number;
  congestedReduction: number;
  pathsChanged: number;
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

export interface UtilizationResult {
  edgeUtilization: Map<string, number>;
  edgeTraffic: Map<string, number>;
  maxUtilization: number;
  avgUtilization: number;
  congestedEdges: string[];
  underutilizedEdges: string[];
}

export interface CongestionHotspot {
  edgeId: string;
  edgeLabel: string;
  utilization: number;
  traffic: number;
  capacity: number;
  flowsTraversing: number;
  rootCause: string;
  recommendations: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

---

**Document Status**: APPROVED FOR IMPLEMENTATION
**Backend Lead Approval**: ___________
**Date**: ___________
