# Backend Architecture: Failure Impact Simulator & Resilience Analysis

**Feature**: Failure Impact Simulator
**Version**: 1.0
**Last Updated**: 2025-11-29
**Target Engineer**: Backend/Algorithm Developer

---

## Overview

This document defines the backend/service architecture for the Failure Impact Simulator, including SPOF detection algorithms, resilience scoring, and impact calculation services.

---

## Service Architecture

```
services/
├── failureSimulation.ts         # Core failure simulation logic
├── spofDetection.ts             # Single Point of Failure detection
├── resilienceScoring.ts         # Resilience score calculation
├── connectivityAnalysis.ts      # Network partition detection
├── impactCalculation.ts         # Failure impact metrics
└── scenarioStorage.ts           # Scenario persistence

types/
└── failureSimulation.types.ts   # TypeScript interfaces

hooks/
├── useFailureSimulation.ts      # State management
└── useSPOFAnalysis.ts           # SPOF calculation hook
```

---

## Task Breakdown: Backend Tasks (B02-xx)

### B02-01: Connectivity Analysis Algorithm
**Priority**: P0 (Must Have)
**Effort**: 4 points
**Dependencies**: None

**Description**:
Implement graph connectivity analysis to detect network partitions and isolated nodes after element failures.

**Implementation**:
```typescript
// File: services/connectivityAnalysis.ts
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

  const isolatedNodes = partitions
    .filter(p => p.length === 1)
    .map(p => p[0]);

  return {
    isFullyConnected: partitions.length === 1,
    componentCount: partitions.length,
    largestComponent,
    isolatedNodes,
    partitions
  };
}
```

**Acceptance Criteria**:
- [ ] Correctly detects network partitions
- [ ] Identifies all isolated nodes
- [ ] Handles edge removal correctly
- [ ] Performance: O(V + E) complexity
- [ ] Unit tests for various topologies

**Test Cases**:
```typescript
describe('analyzeConnectivity', () => {
  it('should detect network partition when bridge link fails', () => {
    const result = analyzeConnectivity(nodes, edges, new Set(), new Set(['bridge-link']));
    expect(result.isFullyConnected).toBe(false);
    expect(result.partitions.length).toBe(2);
  });

  it('should identify isolated nodes', () => {
    const result = analyzeConnectivity(nodes, edges, new Set(['hub-node']), new Set());
    expect(result.isolatedNodes.length).toBeGreaterThan(0);
  });

  it('should return fully connected for healthy network', () => {
    const result = analyzeConnectivity(nodes, edges);
    expect(result.isFullyConnected).toBe(true);
  });
});
```

---

### B02-02: SPOF Detection Algorithm
**Priority**: P0 (Must Have)
**Effort**: 5 points
**Dependencies**: B02-01

**Description**:
Detect Single Points of Failure by testing connectivity when each element is removed.

**Implementation**:
```typescript
// File: services/spofDetection.ts
export interface SPOF {
  elementId: string;
  elementType: 'node' | 'edge';
  label: string;
  impact: {
    pathsAffected: number;
    nodesIsolated: number;
    causesPartition: boolean;
    partitionSizes: number[];
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

export interface SPOFAnalysisOptions {
  includeNodes?: boolean;      // Test node failures (default: true)
  includeEdges?: boolean;      // Test edge failures (default: true)
  maxSPOFs?: number;           // Limit results (default: 20)
  severityThreshold?: string;  // Minimum severity to include
}

export function detectSPOFs(
  nodes: VisNode[],
  edges: VisEdge[],
  options: SPOFAnalysisOptions = {}
): SPOF[] {
  const {
    includeNodes = true,
    includeEdges = true,
    maxSPOFs = 20
  } = options;

  const spofs: SPOF[] = [];
  const totalPaths = nodes.length * (nodes.length - 1);

  // Test each edge for SPOF
  if (includeEdges) {
    for (const edge of edges) {
      const connectivity = analyzeConnectivity(
        nodes, edges,
        new Set(),
        new Set([edge.id])
      );

      if (!connectivity.isFullyConnected || connectivity.isolatedNodes.length > 0) {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);

        const pathsAffected = estimateAffectedPaths(
          nodes, edges, connectivity
        );

        spofs.push({
          elementId: edge.id,
          elementType: 'edge',
          label: `${fromNode?.label || edge.from} ↔ ${toNode?.label || edge.to}`,
          impact: {
            pathsAffected,
            nodesIsolated: connectivity.isolatedNodes.length,
            causesPartition: connectivity.partitions.length > 1,
            partitionSizes: connectivity.partitions.map(p => p.length)
          },
          severity: calculateSeverity(pathsAffected, totalPaths, connectivity),
          recommendation: generateRecommendation('edge', fromNode, toNode)
        });
      }
    }
  }

  // Test each node for SPOF
  if (includeNodes) {
    for (const node of nodes) {
      const connectivity = analyzeConnectivity(
        nodes, edges,
        new Set([node.id]),
        new Set()
      );

      if (!connectivity.isFullyConnected || connectivity.isolatedNodes.length > 0) {
        const pathsAffected = estimateAffectedPaths(
          nodes, edges, connectivity
        );

        spofs.push({
          elementId: node.id,
          elementType: 'node',
          label: node.label || node.id,
          impact: {
            pathsAffected,
            nodesIsolated: connectivity.isolatedNodes.length + 1, // +1 for the failed node itself
            causesPartition: connectivity.partitions.length > 1,
            partitionSizes: connectivity.partitions.map(p => p.length)
          },
          severity: calculateSeverity(pathsAffected, totalPaths, connectivity),
          recommendation: generateRecommendation('node', node)
        });
      }
    }
  }

  // Sort by severity (CRITICAL > HIGH > MEDIUM > LOW)
  const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  spofs.sort((a, b) =>
    severityOrder[b.severity] - severityOrder[a.severity] ||
    b.impact.pathsAffected - a.impact.pathsAffected
  );

  return spofs.slice(0, maxSPOFs);
}

function calculateSeverity(
  pathsAffected: number,
  totalPaths: number,
  connectivity: ConnectivityResult
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const percentAffected = (pathsAffected / totalPaths) * 100;

  if (connectivity.partitions.length > 2 || percentAffected > 50) {
    return 'CRITICAL';
  }
  if (connectivity.partitions.length === 2 || percentAffected > 25) {
    return 'HIGH';
  }
  if (connectivity.isolatedNodes.length > 0 || percentAffected > 10) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function estimateAffectedPaths(
  nodes: VisNode[],
  edges: VisEdge[],
  connectivity: ConnectivityResult
): number {
  if (connectivity.isFullyConnected) {
    return connectivity.isolatedNodes.length * (nodes.length - 1) * 2;
  }

  // Cross-partition paths are all affected
  let affected = 0;
  for (let i = 0; i < connectivity.partitions.length; i++) {
    for (let j = i + 1; j < connectivity.partitions.length; j++) {
      affected += connectivity.partitions[i].length * connectivity.partitions[j].length * 2;
    }
  }

  return affected;
}

function generateRecommendation(
  type: 'node' | 'edge',
  ...elements: (VisNode | undefined)[]
): string {
  if (type === 'edge') {
    const [from, to] = elements;
    return `Add redundant link between ${from?.country || 'Unknown'} and ${to?.country || 'Unknown'} regions to eliminate this SPOF`;
  } else {
    const [node] = elements;
    return `Deploy redundant router in ${node?.country || 'Unknown'} region or add bypass links`;
  }
}
```

**Acceptance Criteria**:
- [ ] Detects all SPOFs in network
- [ ] Correct severity classification
- [ ] Generates useful recommendations
- [ ] Performance: < 5s for 100-node network
- [ ] Unit tests for various scenarios

---

### B02-03: Resilience Score Calculator
**Priority**: P1 (Should Have)
**Effort**: 3 points
**Dependencies**: B02-02

**Description**:
Calculate network resilience score (1-10) based on redundancy, diversity, and capacity factors.

**Implementation**:
```typescript
// File: services/resilienceScoring.ts
export interface ResilienceScore {
  overall: number;              // 1-10
  breakdown: {
    redundancy: number;         // 0-10: Link/path redundancy
    diversity: number;          // 0-10: Geographic diversity
    capacity: number;           // 0-10: Spare capacity
  };
  level: 'CRITICAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXCELLENT';
  improvements: string[];
}

export function calculateResilienceScore(
  nodes: VisNode[],
  edges: VisEdge[],
  spofs: SPOF[]
): ResilienceScore {
  // Factor 1: Redundancy (based on SPOF count)
  const redundancyScore = calculateRedundancyScore(spofs, nodes.length);

  // Factor 2: Geographic Diversity
  const diversityScore = calculateDiversityScore(nodes, edges);

  // Factor 3: Capacity Headroom
  const capacityScore = calculateCapacityScore(edges);

  // Weighted average
  const overall = Math.round(
    (redundancyScore * 0.4 + diversityScore * 0.3 + capacityScore * 0.3) * 10
  ) / 10;

  return {
    overall,
    breakdown: {
      redundancy: redundancyScore,
      diversity: diversityScore,
      capacity: capacityScore
    },
    level: classifyLevel(overall),
    improvements: generateImprovements(redundancyScore, diversityScore, capacityScore)
  };
}

function calculateRedundancyScore(spofs: SPOF[], nodeCount: number): number {
  // Penalize based on SPOF count and severity
  const criticalCount = spofs.filter(s => s.severity === 'CRITICAL').length;
  const highCount = spofs.filter(s => s.severity === 'HIGH').length;
  const mediumCount = spofs.filter(s => s.severity === 'MEDIUM').length;

  let score = 10;
  score -= criticalCount * 2.5;
  score -= highCount * 1.5;
  score -= mediumCount * 0.5;

  return Math.max(1, Math.min(10, score));
}

function calculateDiversityScore(nodes: VisNode[], edges: VisEdge[]): number {
  // Score based on country diversity
  const countries = new Set(nodes.map(n => n.country).filter(Boolean));
  const avgConnectionsPerCountry = edges.length / countries.size;

  let score = 5; // Base score

  // Bonus for many countries
  if (countries.size >= 10) score += 2;
  else if (countries.size >= 5) score += 1;

  // Bonus for high inter-country connectivity
  if (avgConnectionsPerCountry >= 5) score += 2;
  else if (avgConnectionsPerCountry >= 3) score += 1;

  return Math.min(10, score);
}

function calculateCapacityScore(edges: VisEdge[]): number {
  // Score based on available capacity
  const edgesWithCapacity = edges.filter(e =>
    e.sourceCapacity?.total_capacity_mbps
  );

  if (edgesWithCapacity.length === 0) return 5; // Unknown, assume average

  const avgUtilization = edgesWithCapacity.reduce((sum, e) => {
    const used = e.sourceCapacity?.current_bandwidth_mbps || 0;
    const total = e.sourceCapacity?.total_capacity_mbps || 1;
    return sum + (used / total);
  }, 0) / edgesWithCapacity.length;

  // Lower utilization = higher score
  if (avgUtilization < 0.3) return 10;
  if (avgUtilization < 0.5) return 8;
  if (avgUtilization < 0.7) return 6;
  if (avgUtilization < 0.85) return 4;
  return 2;
}

function classifyLevel(score: number): string {
  if (score >= 9) return 'EXCELLENT';
  if (score >= 7) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  if (score >= 3) return 'LOW';
  return 'CRITICAL';
}

function generateImprovements(
  redundancy: number,
  diversity: number,
  capacity: number
): string[] {
  const improvements: string[] = [];

  if (redundancy < 7) {
    improvements.push('Add redundant links to eliminate single points of failure');
  }
  if (diversity < 7) {
    improvements.push('Increase geographic diversity with links to additional countries');
  }
  if (capacity < 7) {
    improvements.push('Upgrade link capacity or add parallel links to reduce utilization');
  }

  return improvements;
}
```

---

### B02-04: Failure Impact Calculator
**Priority**: P0 (Must Have)
**Effort**: 4 points
**Dependencies**: B02-01

**Description**:
Calculate detailed impact metrics when specific elements fail.

**Implementation**:
```typescript
// File: services/impactCalculation.ts
export interface ImpactMetrics {
  pathsAffected: number;
  totalPaths: number;
  percentAffected: number;
  convergenceTime: number;        // Estimated SPF convergence time (seconds)
  isolatedNodes: string[];
  isPartitioned: boolean;
  partitionCount: number;
  reroutablePaths: number;        // Paths that have alternates
  brokenPaths: number;            // Paths with no alternate
  affectedCountries: string[];
}

export function calculateFailureImpact(
  nodes: VisNode[],
  edges: VisEdge[],
  failedNodes: Set<string>,
  failedEdges: Set<string>
): ImpactMetrics {
  // Get connectivity after failures
  const connectivity = analyzeConnectivity(nodes, edges, failedNodes, failedEdges);

  // Calculate total possible paths
  const activeNodeCount = nodes.length - failedNodes.size;
  const totalPaths = nodes.length * (nodes.length - 1);

  // Calculate affected paths
  let pathsAffected = 0;
  let reroutablePaths = 0;
  let brokenPaths = 0;

  // Paths through failed nodes
  failedNodes.forEach(nodeId => {
    // Each failed node breaks paths that traverse it
    // Rough estimate: node degree * (N-1)
    const nodeEdges = edges.filter(e => e.from === nodeId || e.to === nodeId);
    pathsAffected += nodeEdges.length * (nodes.length - 1);
  });

  // Paths through failed edges
  failedEdges.forEach(edgeId => {
    // Each failed edge affects paths that use it
    pathsAffected += Math.floor(totalPaths * 0.1); // Rough estimate: 10% of paths per edge
  });

  // Partition impact
  if (!connectivity.isFullyConnected) {
    // Cross-partition paths are broken
    for (let i = 0; i < connectivity.partitions.length; i++) {
      for (let j = i + 1; j < connectivity.partitions.length; j++) {
        brokenPaths += connectivity.partitions[i].length * connectivity.partitions[j].length * 2;
      }
    }
    reroutablePaths = pathsAffected - brokenPaths;
  } else {
    reroutablePaths = pathsAffected; // All affected paths can reroute
    brokenPaths = 0;
  }

  // Affected countries
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

  // Convergence time estimate (simplified)
  const convergenceTime = estimateConvergenceTime(
    failedNodes.size + failedEdges.size,
    nodes.length
  );

  return {
    pathsAffected: Math.min(pathsAffected, totalPaths),
    totalPaths,
    percentAffected: Math.min(100, (pathsAffected / totalPaths) * 100),
    convergenceTime,
    isolatedNodes: connectivity.isolatedNodes,
    isPartitioned: !connectivity.isFullyConnected,
    partitionCount: connectivity.partitions.length,
    reroutablePaths,
    brokenPaths,
    affectedCountries: Array.from(affectedCountries)
  };
}

function estimateConvergenceTime(failureCount: number, nodeCount: number): number {
  // OSPF convergence estimate:
  // - SPF delay: 5 seconds (default)
  // - SPF calculation: ~1ms per node
  // - LSA propagation: ~10ms per hop

  const spfDelay = 5;           // seconds
  const spfCalc = (nodeCount * 0.001);  // seconds
  const lsaPropagation = Math.log2(nodeCount) * 0.05; // seconds

  return Math.round((spfDelay + spfCalc + lsaPropagation) * failureCount);
}
```

---

### B02-05: Scenario Persistence Service
**Priority**: P1 (Should Have)
**Effort**: 2 points
**Dependencies**: None

**Description**:
Manage saving and loading failure test scenarios to localStorage.

**Implementation**:
```typescript
// File: services/scenarioStorage.ts
const STORAGE_KEY = 'ospf-failure-scenarios';

export interface FailureScenario {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  failedNodes: string[];
  failedEdges: string[];
  mode: 'single' | 'multi' | 'cascade';
}

export function saveScenario(scenario: Omit<FailureScenario, 'id' | 'createdAt' | 'updatedAt'>): FailureScenario {
  const scenarios = loadScenarios();

  const newScenario: FailureScenario = {
    ...scenario,
    id: `scenario-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  scenarios.push(newScenario);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));

  return newScenario;
}

export function loadScenarios(): FailureScenario[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function loadScenarioById(id: string): FailureScenario | null {
  const scenarios = loadScenarios();
  return scenarios.find(s => s.id === id) || null;
}

export function deleteScenario(id: string): boolean {
  const scenarios = loadScenarios();
  const filtered = scenarios.filter(s => s.id !== id);

  if (filtered.length === scenarios.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function exportScenario(id: string): string {
  const scenario = loadScenarioById(id);
  if (!scenario) throw new Error(`Scenario ${id} not found`);
  return JSON.stringify(scenario, null, 2);
}

export function importScenario(json: string): FailureScenario {
  const scenario = JSON.parse(json) as FailureScenario;

  // Generate new ID to avoid conflicts
  scenario.id = `scenario-${Date.now()}`;
  scenario.createdAt = new Date().toISOString();
  scenario.updatedAt = new Date().toISOString();

  const scenarios = loadScenarios();
  scenarios.push(scenario);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));

  return scenario;
}

// Built-in templates
export const SCENARIO_TEMPLATES: Omit<FailureScenario, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Data Center Outage',
    description: 'Simulates complete failure of a data center node',
    failedNodes: ['GBR-R9'], // Placeholder - should be dynamically set
    failedEdges: [],
    mode: 'single'
  },
  {
    name: 'ISP Link Failure',
    description: 'Simulates failure of primary ISP connection',
    failedNodes: [],
    failedEdges: ['edge-gbr-deu-1'],
    mode: 'single'
  },
  {
    name: 'Backbone Link Cut',
    description: 'Simulates fiber cut on backbone link',
    failedNodes: [],
    failedEdges: ['edge-backbone-1'],
    mode: 'single'
  }
];
```

---

### B02-06: Failure Simulation Engine
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: B02-01, B02-04

**Description**:
Core engine that orchestrates failure simulation and coordinates with other services.

**Implementation**:
```typescript
// File: services/failureSimulation.ts
export interface SimulationResult {
  metrics: ImpactMetrics;
  connectivity: ConnectivityResult;
  affectedFlows: AffectedFlow[];
  recommendations: string[];
}

export interface AffectedFlow {
  source: string;
  destination: string;
  oldPath: string[];
  newPath: string[] | null;    // null if path broken
  costDelta: number;
  status: 'REROUTED' | 'BROKEN' | 'UNAFFECTED';
}

export function runFailureSimulation(
  nodes: VisNode[],
  edges: VisEdge[],
  failedNodes: string[],
  failedEdges: string[]
): SimulationResult {
  const failedNodeSet = new Set(failedNodes);
  const failedEdgeSet = new Set(failedEdges);

  // Calculate connectivity
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

function sampleAffectedFlows(
  nodes: VisNode[],
  edges: VisEdge[],
  failedNodes: Set<string>,
  failedEdges: Set<string>,
  sampleSize: number
): AffectedFlow[] {
  const flows: AffectedFlow[] = [];
  const remainingEdges = edges.filter(e => !failedEdges.has(e.id));
  const remainingNodes = nodes.filter(n => !failedNodes.has(n.id));

  // Sample random source-destination pairs
  for (let i = 0; i < Math.min(sampleSize, remainingNodes.length * 2); i++) {
    const srcIdx = Math.floor(Math.random() * remainingNodes.length);
    const dstIdx = Math.floor(Math.random() * remainingNodes.length);

    if (srcIdx === dstIdx) continue;

    const src = remainingNodes[srcIdx];
    const dst = remainingNodes[dstIdx];

    // Calculate original path
    const originalPath = dijkstraDirected(src.id, dst.id, nodes, edges);

    // Calculate new path without failed elements
    const newPath = dijkstraDirected(src.id, dst.id, remainingNodes, remainingEdges);

    // Determine if this flow is affected
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
        status: !newPath ? 'BROKEN' : 'REROUTED'
      });
    }
  }

  return flows;
}

function generateFailureRecommendations(
  metrics: ImpactMetrics,
  connectivity: ConnectivityResult
): string[] {
  const recommendations: string[] = [];

  if (connectivity.partitions.length > 1) {
    recommendations.push(
      '⚠️ CRITICAL: Network is partitioned. Immediate action required.'
    );
  }

  if (metrics.isolatedNodes.length > 0) {
    recommendations.push(
      `🔴 ${metrics.isolatedNodes.length} node(s) are isolated and unreachable.`
    );
  }

  if (metrics.brokenPaths > 0) {
    recommendations.push(
      `🟠 ${metrics.brokenPaths} paths have no alternate route.`
    );
  }

  if (metrics.convergenceTime > 60) {
    recommendations.push(
      `⏱️ Estimated convergence time: ${metrics.convergenceTime}s. Consider reducing SPF delay.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Network remains fully connected. All paths have alternates.');
  }

  return recommendations;
}
```

---

## Backend Task Summary Table

| Task ID | Task Name | Priority | Effort | Dependencies |
|---------|-----------|----------|--------|--------------|
| B02-01 | Connectivity Analysis Algorithm | P0 | 4 pts | None |
| B02-02 | SPOF Detection Algorithm | P0 | 5 pts | B02-01 |
| B02-03 | Resilience Score Calculator | P1 | 3 pts | B02-02 |
| B02-04 | Failure Impact Calculator | P0 | 4 pts | B02-01 |
| B02-05 | Scenario Persistence Service | P1 | 2 pts | None |
| B02-06 | Failure Simulation Engine | P0 | 3 pts | B02-01, B02-04 |

**Total Backend Effort**: 21 story points

---

## Data Type Definitions

```typescript
// File: types/failureSimulation.types.ts

export type FailureMode = 'single' | 'multi' | 'cascade';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SPOF {
  elementId: string;
  elementType: 'node' | 'edge';
  label: string;
  impact: SPOFImpact;
  severity: Severity;
  recommendation: string;
}

export interface SPOFImpact {
  pathsAffected: number;
  nodesIsolated: number;
  causesPartition: boolean;
  partitionSizes: number[];
}

export interface ConnectivityResult {
  isFullyConnected: boolean;
  componentCount: number;
  largestComponent: string[];
  isolatedNodes: string[];
  partitions: string[][];
}

export interface ImpactMetrics {
  pathsAffected: number;
  totalPaths: number;
  percentAffected: number;
  convergenceTime: number;
  isolatedNodes: string[];
  isPartitioned: boolean;
  partitionCount: number;
  reroutablePaths: number;
  brokenPaths: number;
  affectedCountries: string[];
}

export interface ResilienceScore {
  overall: number;
  breakdown: {
    redundancy: number;
    diversity: number;
    capacity: number;
  };
  level: 'CRITICAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXCELLENT';
  improvements: string[];
}

export interface FailureScenario {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  failedNodes: string[];
  failedEdges: string[];
  mode: FailureMode;
}

export interface SimulationResult {
  metrics: ImpactMetrics;
  connectivity: ConnectivityResult;
  affectedFlows: AffectedFlow[];
  recommendations: string[];
}

export interface AffectedFlow {
  source: string;
  destination: string;
  oldPath: string[];
  newPath: string[] | null;
  costDelta: number;
  status: 'REROUTED' | 'BROKEN' | 'UNAFFECTED';
}
```

---

## Performance Requirements

| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| Connectivity analysis | 50ms | 200ms |
| SPOF detection (full) | 3s | 10s |
| Impact calculation | 100ms | 500ms |
| Resilience score | 50ms | 200ms |

---

**Document Status**: APPROVED FOR IMPLEMENTATION
**Backend Lead Approval**: ___________
**Date**: ___________
