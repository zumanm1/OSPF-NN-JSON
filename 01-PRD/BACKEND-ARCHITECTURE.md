# Backend Architecture: Path Comparison & ECMP Explorer

**Feature**: Path Comparison & ECMP Explorer
**Version**: 1.0
**Last Updated**: 2025-11-29
**Target Engineer**: Backend/Algorithm Developer

---

## Overview

This document defines the backend/service architecture for the Path Comparison & ECMP Explorer feature. It includes algorithm implementations, data services, and API contracts for backend engineers.

---

## Service Architecture

```
services/
├── dijkstraEnhanced.ts          # Enhanced Dijkstra with ECMP support
├── pathMetrics.ts               # Path metrics calculations
├── pathComparison.ts            # Path comparison logic
├── ecmpAnalysis.ts              # ECMP detection & analysis
├── pathEnumeration.ts           # All-paths enumeration algorithm
└── exportService.ts             # PDF/CSV generation

types/
└── pathComparison.types.ts      # TypeScript interfaces

hooks/
├── usePathComparison.ts         # State management hook
└── useECMPAnalysis.ts           # ECMP calculation hook
```

---

## Task Breakdown: Backend Tasks (B01-xx)

### B01-01: Enhanced Dijkstra Algorithm (ECMP Support)
**Priority**: P0 (Must Have)
**Effort**: 5 points
**Dependencies**: None

**Description**:
Extend the existing `dijkstraDirected` function to track and return ALL equal-cost paths, not just one.

**Current Implementation** (`services/dijkstra.ts`):
```typescript
// Returns single path only
export function dijkstraDirected(
  start: string,
  goal: string,
  nodes: VisNode[],
  edges: VisEdge[]
): PathResult | null
```

**New Implementation**:
```typescript
// File: services/dijkstraEnhanced.ts
export interface ECMPPathResult {
  paths: PathInfo[];              // ALL equal-cost paths
  cost: number;                   // Optimal cost
  isECMP: boolean;                // true if multiple paths
  divergencePoints: string[];     // Nodes where paths split
  convergencePoints: string[];    // Nodes where paths rejoin
  pathCount: number;              // Total paths found
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
      if (dist.get(v)! < minDist) {
        minDist = dist.get(v)!;
        u = v;
      }
    }

    if (u === null || u === goal) break;
    Q.delete(u);

    // Relax neighbors
    const neighbors = edges.filter(e => e.from === u);
    for (const edge of neighbors) {
      const newDist = dist.get(u)! + edge.cost;
      const currentDist = dist.get(edge.to)!;

      if (newDist < currentDist) {
        // Better path found - replace
        dist.set(edge.to, newDist);
        parents.set(edge.to, [{ from: u, edgeId: edge.id }]);
      } else if (newDist === currentDist) {
        // Equal-cost path found - ADD to parents (key for ECMP!)
        parents.get(edge.to)!.push({ from: u, edgeId: edge.id });
      }
    }
  }

  if (dist.get(goal) === Infinity) return null;

  // Phase 2: Enumerate all paths via backtracking
  const allPaths = enumeratePaths(start, goal, parents, options?.maxPaths || 10);

  // Phase 3: Analyze topology
  const { divergencePoints, convergencePoints } = analyzeTopology(allPaths);

  return {
    paths: allPaths.map((p, i) => buildPathInfo(p, i, edges, nodes)),
    cost: dist.get(goal)!,
    isECMP: allPaths.length > 1,
    divergencePoints,
    convergencePoints,
    pathCount: allPaths.length
  };
}
```

**Acceptance Criteria**:
- [ ] Returns all equal-cost paths (not just one)
- [ ] Handles cycles correctly
- [ ] Respects maxPaths limit
- [ ] Performance: < 500ms for 100-node graph
- [ ] Unit tests for ECMP detection

**Test Cases**:
```typescript
describe('dijkstraWithECMP', () => {
  it('should detect ECMP when multiple equal-cost paths exist', () => {
    const result = dijkstraWithECMP('A', 'D', nodes, edges);
    expect(result.isECMP).toBe(true);
    expect(result.paths.length).toBeGreaterThan(1);
  });

  it('should return single path when no ECMP exists', () => {
    const result = dijkstraWithECMP('A', 'B', nodes, edges);
    expect(result.isECMP).toBe(false);
    expect(result.paths.length).toBe(1);
  });

  it('should respect maxPaths limit', () => {
    const result = dijkstraWithECMP('A', 'Z', nodes, edges, { maxPaths: 5 });
    expect(result.paths.length).toBeLessThanOrEqual(5);
  });
});
```

---

### B01-02: Path Enumeration Algorithm
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: B01-01

**Description**:
Implement backtracking algorithm to enumerate all equal-cost paths from Dijkstra parent map.

**Implementation**:
```typescript
// File: services/pathEnumeration.ts
interface RawPath {
  nodes: string[];
  edges: string[];
}

export function enumeratePaths(
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
    const { node, nodePath, edgePath } = stack.pop()!;

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
```

**Acceptance Criteria**:
- [ ] Correctly enumerates all paths
- [ ] Avoids infinite loops on cycles
- [ ] Respects maxPaths limit
- [ ] Memory efficient (no path duplication)

---

### B01-03: Divergence/Convergence Analysis
**Priority**: P1 (Should Have)
**Effort**: 3 points
**Dependencies**: B01-02

**Description**:
Analyze ECMP path topology to find where paths diverge (split) and converge (rejoin).

**Implementation**:
```typescript
// File: services/ecmpAnalysis.ts
interface TopologyAnalysis {
  divergencePoints: DivergencePoint[];
  convergencePoints: ConvergencePoint[];
}

interface DivergencePoint {
  nodeId: string;
  outgoingBranches: number;
  pathIds: string[];
}

interface ConvergencePoint {
  nodeId: string;
  incomingBranches: number;
  pathIds: string[];
}

export function analyzeTopology(paths: RawPath[]): TopologyAnalysis {
  const divergencePoints: DivergencePoint[] = [];
  const convergencePoints: ConvergencePoint[] = [];

  if (paths.length <= 1) {
    return { divergencePoints, convergencePoints };
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

  // Find divergence points: node where next-hops differ across paths
  const allNodes = new Set(paths.flatMap(p => p.nodes));

  for (const nodeId of allNodes) {
    const nextHops = new Map<string, number[]>(); // nextHop -> path indices

    paths.forEach((path, pathIdx) => {
      const nodeIndex = path.nodes.indexOf(nodeId);
      if (nodeIndex >= 0 && nodeIndex < path.nodes.length - 1) {
        const nextHop = path.nodes[nodeIndex + 1];
        if (!nextHops.has(nextHop)) {
          nextHops.set(nextHop, []);
        }
        nextHops.get(nextHop)!.push(pathIdx);
      }
    });

    if (nextHops.size > 1) {
      divergencePoints.push({
        nodeId,
        outgoingBranches: nextHops.size,
        pathIds: Array.from(nodeInPaths.get(nodeId) || []).map(i => `path-${i}`)
      });
    }
  }

  // Find convergence points: node where previous-hops differ
  for (const nodeId of allNodes) {
    const prevHops = new Map<string, number[]>();

    paths.forEach((path, pathIdx) => {
      const nodeIndex = path.nodes.indexOf(nodeId);
      if (nodeIndex > 0) {
        const prevHop = path.nodes[nodeIndex - 1];
        if (!prevHops.has(prevHop)) {
          prevHops.set(prevHop, []);
        }
        prevHops.get(prevHop)!.push(pathIdx);
      }
    });

    if (prevHops.size > 1) {
      convergencePoints.push({
        nodeId,
        incomingBranches: prevHops.size,
        pathIds: Array.from(nodeInPaths.get(nodeId) || []).map(i => `path-${i}`)
      });
    }
  }

  return { divergencePoints, convergencePoints };
}
```

**Acceptance Criteria**:
- [ ] Correctly identifies all divergence points
- [ ] Correctly identifies all convergence points
- [ ] Handles complex topologies
- [ ] Unit tests for various scenarios

---

### B01-04: Path Metrics Calculator
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: None

**Description**:
Calculate comprehensive metrics for each path.

**Implementation**:
```typescript
// File: services/pathMetrics.ts
export interface PathMetrics {
  hopCount: number;
  totalCost: number;
  estimatedLatency: number;      // milliseconds
  minBandwidth: number;          // Mbps
  maxUtilization: number;        // percentage
  sharedLinkCount: number;
  countriesTraversed: string[];
  diversityScore: number;        // 0-100
}

export function calculatePathMetrics(
  path: RawPath,
  edges: VisEdge[],
  nodes: VisNode[],
  otherPaths?: RawPath[]
): PathMetrics {
  const pathEdges = path.edges.map(edgeId =>
    edges.find(e => e.id === edgeId)!
  );

  const pathNodes = path.nodes.map(nodeId =>
    nodes.find(n => n.id === nodeId)!
  );

  return {
    hopCount: calculateHopCount(path.nodes),
    totalCost: calculateTotalCost(pathEdges),
    estimatedLatency: estimateLatency(pathEdges, pathNodes),
    minBandwidth: calculateMinBandwidth(pathEdges),
    maxUtilization: calculateMaxUtilization(pathEdges),
    sharedLinkCount: countSharedLinks(path.edges, otherPaths),
    countriesTraversed: getCountriesTraversed(pathNodes),
    diversityScore: calculateDiversityScore(path, otherPaths)
  };
}

function calculateHopCount(nodes: string[]): number {
  return nodes.length - 1;
}

function calculateTotalCost(edges: VisEdge[]): number {
  return edges.reduce((sum, e) => sum + e.cost, 0);
}

function estimateLatency(edges: VisEdge[], nodes: VisNode[]): number {
  // Base: 1ms switching delay per hop
  let latency = (nodes.length - 1) * 1;

  // Add propagation delay based on countries (rough estimate)
  const countries = new Set(nodes.map(n => n.country).filter(Boolean));

  // Cross-continent: +50ms per hop
  // Same continent: +5ms per hop
  for (let i = 0; i < nodes.length - 1; i++) {
    const srcCountry = nodes[i].country;
    const destCountry = nodes[i + 1].country;

    if (srcCountry !== destCountry) {
      // Different countries - estimate based on continent
      const srcContinent = getContinent(srcCountry);
      const destContinent = getContinent(destCountry);

      if (srcContinent !== destContinent) {
        latency += 50; // Intercontinental
      } else {
        latency += 10; // Same continent, different country
      }
    } else {
      latency += 2; // Same country
    }
  }

  return latency;
}

function calculateMinBandwidth(edges: VisEdge[]): number {
  const capacities = edges.map(e =>
    e.sourceCapacity?.total_capacity_mbps || Infinity
  );
  return Math.min(...capacities);
}

function countSharedLinks(
  pathEdges: string[],
  otherPaths?: RawPath[]
): number {
  if (!otherPaths || otherPaths.length === 0) return 0;

  const pathEdgeSet = new Set(pathEdges);
  let sharedCount = 0;

  otherPaths.forEach(other => {
    other.edges.forEach(edgeId => {
      if (pathEdgeSet.has(edgeId)) sharedCount++;
    });
  });

  return sharedCount;
}

function getCountriesTraversed(nodes: VisNode[]): string[] {
  const countries: string[] = [];
  let lastCountry = '';

  nodes.forEach(node => {
    if (node.country && node.country !== lastCountry) {
      countries.push(node.country);
      lastCountry = node.country;
    }
  });

  return countries;
}

function getContinent(countryCode: string): string {
  const continentMap: Record<string, string> = {
    'GBR': 'EU', 'DEU': 'EU', 'FRA': 'EU', 'PRT': 'EU',
    'USA': 'NA', 'CAN': 'NA',
    'ZAF': 'AF', 'LSO': 'AF', 'ZWE': 'AF', 'MOZ': 'AF', 'AGO': 'AF',
    // ... add more
  };
  return continentMap[countryCode] || 'UNKNOWN';
}
```

**Acceptance Criteria**:
- [ ] All metrics calculated correctly
- [ ] Handles missing data gracefully
- [ ] Performance: < 10ms per path
- [ ] Unit tests for each metric

---

### B01-05: Load Balancing Calculator
**Priority**: P1 (Should Have)
**Effort**: 2 points
**Dependencies**: B01-01, B01-04

**Description**:
Calculate how traffic would be distributed across ECMP paths.

**Implementation**:
```typescript
// File: services/ecmpAnalysis.ts
export interface LoadBalancingInfo {
  distribution: Map<string, number>;  // pathId -> percentage
  perPathCapacity: Map<string, number>; // pathId -> Mbps
  totalCapacity: number;
  isBalanced: boolean;
  warnings: string[];
}

export function calculateLoadBalancing(
  paths: PathInfo[],
  edges: VisEdge[]
): LoadBalancingInfo {
  const distribution = new Map<string, number>();
  const perPathCapacity = new Map<string, number>();
  const warnings: string[] = [];

  // Default: equal distribution
  const equalShare = 100 / paths.length;

  paths.forEach(path => {
    distribution.set(path.id, Math.round(equalShare * 100) / 100);
    perPathCapacity.set(path.id, path.metrics.minBandwidth);
  });

  const totalCapacity = paths.reduce(
    (sum, p) => sum + p.metrics.minBandwidth, 0
  );

  // Check for capacity imbalance
  const avgCapacity = totalCapacity / paths.length;
  paths.forEach(path => {
    if (path.metrics.minBandwidth < avgCapacity * 0.5) {
      warnings.push(
        `Path ${path.id} has low capacity (${path.metrics.minBandwidth}Mbps) ` +
        `compared to average (${avgCapacity.toFixed(0)}Mbps)`
      );
    }
  });

  return {
    distribution,
    perPathCapacity,
    totalCapacity,
    isBalanced: warnings.length === 0,
    warnings
  };
}
```

---

### B01-06: What-If Simulation Engine
**Priority**: P1 (Should Have)
**Effort**: 5 points
**Dependencies**: B01-01

**Description**:
Simulate link failures and cost changes to show before/after impact.

**Implementation**:
```typescript
// File: services/pathComparison.ts
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

  if (costDelta > 0) {
    return `Path cost increased by ${costDelta} (${((costDelta / (original[0]?.metrics.totalCost || 1)) * 100).toFixed(1)}%)`;
  } else if (costDelta < 0) {
    return `Path cost decreased by ${Math.abs(costDelta)} (${((Math.abs(costDelta) / (original[0]?.metrics.totalCost || 1)) * 100).toFixed(1)}%)`;
  }

  return 'No cost change, but path may have changed';
}
```

---

### B01-07: PDF Export Service
**Priority**: P1 (Should Have)
**Effort**: 3 points
**Dependencies**: B01-04

**Description**:
Generate professional PDF report of path comparison.

**Implementation**:
```typescript
// File: services/exportService.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export interface ExportOptions {
  includeNetworkDiagram: boolean;
  includeMetricsTable: boolean;
  includeECMPAnalysis: boolean;
  filename?: string;
}

export async function exportPathComparisonPDF(
  paths: PathInfo[],
  ecmpAnalysis: ECMPGroup | null,
  networkElement: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Page 1: Header + Network Diagram
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Path Comparison Report', 20, 20);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
  pdf.text(`Paths Analyzed: ${paths.length}`, 20, 36);

  if (options.includeNetworkDiagram) {
    const canvas = await html2canvas(networkElement, {
      scale: 2,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 20, 45, 250, 140);
  }

  // Page 2: Metrics Table
  if (options.includeMetricsTable) {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('Path Metrics Comparison', 20, 20);

    const tableData = paths.map((p, i) => [
      `Path ${i + 1}`,
      p.source,
      p.destination,
      p.metrics.hopCount.toString(),
      p.metrics.totalCost.toString(),
      `${p.metrics.estimatedLatency}ms`,
      `${(p.metrics.minBandwidth / 1000).toFixed(1)}Gbps`,
      p.metrics.countriesTraversed.join('→')
    ]);

    autoTable(pdf, {
      head: [['Path', 'Source', 'Dest', 'Hops', 'Cost', 'Latency', 'Min BW', 'Countries']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
  }

  // Page 3: ECMP Analysis (if applicable)
  if (options.includeECMPAnalysis && ecmpAnalysis) {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('ECMP Analysis', 20, 20);

    pdf.setFontSize(12);
    pdf.text(`Total ECMP Paths: ${ecmpAnalysis.paths.length}`, 20, 35);
    pdf.text(`Equal Cost: ${ecmpAnalysis.cost}`, 20, 45);
    pdf.text(`Divergence Points: ${ecmpAnalysis.divergencePoints.length}`, 20, 55);
    pdf.text(`Convergence Points: ${ecmpAnalysis.convergencePoints.length}`, 20, 65);

    // Load balancing info
    pdf.text('Load Balancing Distribution:', 20, 80);
    let y = 90;
    ecmpAnalysis.paths.forEach((path, i) => {
      const percent = (100 / ecmpAnalysis.paths.length).toFixed(1);
      pdf.text(`  Path ${i + 1}: ${percent}%`, 20, y);
      y += 10;
    });
  }

  // Save
  const filename = options.filename || `path-comparison-${Date.now()}.pdf`;
  pdf.save(filename);
}
```

---

### B01-08: CSV Export Service
**Priority**: P2 (Nice to Have)
**Effort**: 1 point
**Dependencies**: B01-04

**Description**:
Export path metrics as CSV file.

**Implementation**:
```typescript
// File: services/exportService.ts
export function exportPathMetricsCSV(paths: PathInfo[]): void {
  const headers = [
    'Path_ID',
    'Source',
    'Destination',
    'Hop_Count',
    'Total_Cost',
    'Latency_ms',
    'Min_Bandwidth_Mbps',
    'Shared_Links',
    'Countries_Traversed',
    'Diversity_Score'
  ];

  const rows = paths.map(p => [
    p.id,
    p.source,
    p.destination,
    p.metrics.hopCount,
    p.metrics.totalCost,
    p.metrics.estimatedLatency,
    p.metrics.minBandwidth,
    p.metrics.sharedLinkCount,
    p.metrics.countriesTraversed.join('→'),
    p.metrics.diversityScore
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell =>
      typeof cell === 'string' && cell.includes(',')
        ? `"${cell}"`
        : cell
    ).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `path-metrics-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

## Backend Task Summary Table

| Task ID | Task Name | Priority | Effort | Dependencies |
|---------|-----------|----------|--------|--------------|
| B01-01 | Enhanced Dijkstra (ECMP) | P0 | 5 pts | None |
| B01-02 | Path Enumeration Algorithm | P0 | 3 pts | B01-01 |
| B01-03 | Divergence/Convergence Analysis | P1 | 3 pts | B01-02 |
| B01-04 | Path Metrics Calculator | P0 | 3 pts | None |
| B01-05 | Load Balancing Calculator | P1 | 2 pts | B01-01, B01-04 |
| B01-06 | What-If Simulation Engine | P1 | 5 pts | B01-01 |
| B01-07 | PDF Export Service | P1 | 3 pts | B01-04 |
| B01-08 | CSV Export Service | P2 | 1 pt | B01-04 |

**Total Backend Effort**: 25 story points

---

## Data Type Definitions

```typescript
// File: types/pathComparison.types.ts

export interface PathInfo {
  id: string;
  source: string;
  destination: string;
  nodeSequence: string[];
  edgeSequence: string[];
  metrics: PathMetrics;
  color: string;
  isECMP: boolean;
  ecmpGroupId?: string;
}

export interface PathMetrics {
  hopCount: number;
  totalCost: number;
  estimatedLatency: number;
  minBandwidth: number;
  maxUtilization: number;
  sharedLinkCount: number;
  countriesTraversed: string[];
  diversityScore: number;
}

export interface ECMPGroup {
  groupId: string;
  source: string;
  destination: string;
  cost: number;
  paths: PathInfo[];
  divergencePoints: DivergencePoint[];
  convergencePoints: ConvergencePoint[];
  loadBalancing: LoadBalancingInfo;
}

export interface DivergencePoint {
  nodeId: string;
  outgoingBranches: number;
  pathIds: string[];
}

export interface ConvergencePoint {
  nodeId: string;
  incomingBranches: number;
  pathIds: string[];
}

export interface LoadBalancingInfo {
  distribution: Map<string, number>;
  perPathCapacity: Map<string, number>;
  totalCapacity: number;
  isBalanced: boolean;
  warnings: string[];
}

export interface WhatIfState {
  mode: 'failure' | 'cost_change';
  failedEdges: string[];
  costChanges: Map<string, number>;
  result: WhatIfResult | null;
}

export interface WhatIfResult {
  originalPaths: PathInfo[];
  simulatedPaths: PathInfo[];
  affectedPaths: string[];
  newPaths: string[];
  removedPaths: string[];
  costDelta: number;
  summary: string;
}
```

---

## Performance Requirements

### Benchmarks
| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| Dijkstra + ECMP (100 nodes) | 100ms | 500ms |
| Path enumeration (10 paths) | 50ms | 200ms |
| Metrics calculation | 5ms | 20ms |
| PDF generation | 2s | 5s |

### Optimization Strategies
1. **Memoization**: Cache Dijkstra results for repeated source/dest pairs
2. **Early termination**: Stop enumeration when maxPaths reached
3. **Lazy metrics**: Calculate metrics on-demand, not upfront
4. **Web Worker**: Move expensive operations off main thread

---

## Testing Strategy

### Unit Tests
- [ ] dijkstraWithECMP: ECMP detection, single path, no path
- [ ] enumeratePaths: cycle handling, maxPaths limit
- [ ] analyzeTopology: divergence/convergence detection
- [ ] calculatePathMetrics: all metrics individually
- [ ] calculateLoadBalancing: equal distribution, warnings

### Integration Tests
- [ ] Full path comparison flow
- [ ] What-If simulation accuracy
- [ ] Export file contents validation

### Performance Tests
- [ ] 100-node graph benchmark
- [ ] 1000-node graph stress test
- [ ] Memory leak detection (repeated calculations)

---

## Error Handling

```typescript
// Standard error types
export class PathNotFoundError extends Error {
  constructor(source: string, dest: string) {
    super(`No path exists from ${source} to ${dest}`);
    this.name = 'PathNotFoundError';
  }
}

export class ECMPLimitExceededError extends Error {
  constructor(actual: number, limit: number) {
    super(`ECMP path count (${actual}) exceeds limit (${limit})`);
    this.name = 'ECMPLimitExceededError';
  }
}

export class TimeoutError extends Error {
  constructor(operation: string, elapsed: number, limit: number) {
    super(`${operation} timed out after ${elapsed}ms (limit: ${limit}ms)`);
    this.name = 'TimeoutError';
  }
}
```

---

**Document Status**: APPROVED FOR IMPLEMENTATION
**Backend Lead Approval**: ___________
**Date**: ___________
