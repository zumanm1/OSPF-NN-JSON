# Technical Specifications: Path Comparison & ECMP Explorer

**Feature**: Path Comparison & ECMP Explorer  
**Version**: 1.0  
**Last Updated**: 2025-11-29  

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Path Comparison Modal                    │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  Network Diagram     │  │  Control Panel               │ │
│  │  (60% width)         │  │  - Path Selector             │ │
│  │                      │  │  - Metrics Table             │ │
│  │  [Highlighted Paths] │  │  - ECMP Tree                 │ │
│  │                      │  │  - Export Controls           │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Structure

```
components/
├── PathComparisonModal.tsx           (Main container)
├── ECMPTreeVisualizer.tsx            (D3 tree diagram)
├── PathMetricsTable.tsx              (Comparison table)
├── PathSelectorPanel.tsx             (Source/dest selection)
├── WhatIfSimulator.tsx               (Failure/cost scenarios)
└── PathExporter.tsx                  (PDF/CSV export)

services/
├── dijkstraEnhanced.ts               (ECMP-aware algorithm)
├── pathMetrics.ts                    (Metrics calculations)
├── pathComparison.ts                 (Comparison logic)
└── exportService.ts                  (PDF/CSV generation)

hooks/
├── usePathComparison.ts              (State management)
└── useECMPAnalysis.ts                (ECMP detection)

types/
└── pathComparison.types.ts           (TypeScript interfaces)
```

---

## Data Models

### PathInfo Interface
```typescript
interface PathInfo {
  id: string;                         // Unique path identifier
  source: string;                     // Source node ID
  destination: string;                // Destination node ID
  nodeSequence: string[];             // [node1, node2, ..., nodeN]
  edgeSequence: string[];             // [edge1, edge2, ..., edgeN-1]
  metrics: PathMetrics;               // Calculated metrics
  color: string;                      // Display color (hex)
  isECMP: boolean;                    // Part of ECMP group?
  ecmpGroupId?: string;               // ECMP group identifier
}

interface PathMetrics {
  hopCount: number;                   // Number of hops
  totalCost: number;                  // Sum of link costs
  estimatedLatency: number;           // Milliseconds
  minBandwidth: number;               // Mbps (bottleneck)
  maxUtilization: number;             // Percent (worst link)
  sharedLinkCount: number;            // Links shared with other paths
  countriesTraversed: string[];       // Country codes in order
  diversityScore: number;             // 0-100 (higher = more diverse)
}
```

### ECMPGroup Interface
```typescript
interface ECMPGroup {
  groupId: string;                    // Unique group ID
  source: string;                     // Common source
  destination: string;                // Common destination
  cost: number;                       // Equal cost for all paths
  paths: PathInfo[];                  // All paths in group
  divergencePoints: DivergencePoint[]; // Where paths split
  convergencePoints: ConvergencePoint[]; // Where paths rejoin
  loadBalancing: LoadBalancingInfo;   // Distribution info
}

interface DivergencePoint {
  nodeId: string;                     // Node where split occurs
  outgoingPaths: number;              // Number of branches
  pathIds: string[];                  // Paths that diverge here
}

interface ConvergencePoint {
  nodeId: string;                     // Node where paths rejoin
  incomingPaths: number;              // Number of branches
  pathIds: string[];                  // Paths that converge here
}

interface LoadBalancingInfo {
  distribution: Map<string, number>;  // path ID -> percentage
  perPathCapacity: Map<string, number>; // path ID -> Gbps
  totalCapacity: number;              // Sum of all path capacities
}
```

---

## Enhanced Dijkstra Algorithm

### Current Implementation
```typescript
// Current: Returns single path
export function dijkstraDirected(
  start: string,
  goal: string,
  nodes: VisNode[],
  edges: VisEdge[]
): PathResult | null
```

### Enhanced Implementation
```typescript
// Enhanced: Returns ALL equal-cost paths
export function dijkstraWithECMP(
  start: string,
  goal: string,
  nodes: VisNode[],
  edges: VisEdge[],
  options?: {
    maxPaths?: number;                // Limit ECMP paths (default: 10)
    includeSuboptimal?: boolean;      // Include non-ECMP paths (default: false)
  }
): ECMPPathResult | null {
  // Phase 1: Standard Dijkstra
  const dist = new Map<string, number>();
  const parents = new Map<string, Array<{from: string, edgeId: string}>>();
  
  // ... standard Dijkstra implementation ...
  
  // Key change: When newDist === currentDist, ADD to parents, don't replace
  if (newDist === currentDist) {
    parents.get(neighbor)!.push({ from: current, edgeId: edge.id });
  }
  
  // Phase 2: Enumerate ALL equal-cost paths via backtracking
  const allPaths = enumeratePaths(start, goal, parents, options.maxPaths);
  
  // Phase 3: Identify divergence/convergence points
  const analysis = analyzePathTopology(allPaths);
  
  return {
    paths: allPaths,
    cost: dist.get(goal)!,
    isECMP: allPaths.length > 1,
    divergencePoints: analysis.divergencePoints,
    convergencePoints: analysis.convergencePoints,
    loadBalancing: calculateLoadBalancing(allPaths, edges)
  };
}
```

### Path Enumeration Algorithm
```typescript
function enumeratePaths(
  start: string,
  goal: string,
  parents: Map<string, Array<{from: string, edgeId: string}>>,
  maxPaths: number = 10
): Array<{nodes: string[], edges: string[]}> {
  const paths: Array<{nodes: string[], edges: string[]}> = [];
  const stack: Array<{node: string, nodePath: string[], edgePath: string[]}> = [];
  
  // Start from goal and work backwards
  stack.push({ node: goal, nodePath: [goal], edgePath: [] });
  
  while (stack.length > 0 && paths.length < maxPaths) {
    const { node, nodePath, edgePath } = stack.pop()!;
    
    if (node === start) {
      // Found complete path
      paths.push({
        nodes: nodePath.reverse(),
        edges: edgePath.reverse()
      });
      continue;
    }
    
    // Explore all parents (equal-cost predecessors)
    const nodeParents = parents.get(node) || [];
    for (const parent of nodeParents) {
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

### Divergence/Convergence Analysis
```typescript
function analyzePathTopology(
  paths: Array<{nodes: string[], edges: string[]}>
): {
  divergencePoints: DivergencePoint[],
  convergencePoints: ConvergencePoint[]
} {
  const nodeCounts = new Map<string, Set<string>>(); // node -> set of path IDs
  
  // Count how many paths use each node
  paths.forEach((path, idx) => {
    path.nodes.forEach(node => {
      if (!nodeCounts.has(node)) nodeCounts.set(node, new Set());
      nodeCounts.get(node)!.add(`path-${idx}`);
    });
  });
  
  // Identify divergence: node where outgoing edges split
  const divergencePoints: DivergencePoint[] = [];
  const convergencePoints: ConvergencePoint[] = [];
  
  paths[0].nodes.forEach((node, i) => {
    if (i === 0 || i === paths[0].nodes.length - 1) return; // Skip source/dest
    
    const pathsUsingNode = nodeCounts.get(node)!;
    
    // Check if next hop differs across paths
    const nextHops = new Set<string>();
    paths.forEach(path => {
      const nodeIndex = path.nodes.indexOf(node);
      if (nodeIndex >= 0 && nodeIndex < path.nodes.length - 1) {
        nextHops.add(path.nodes[nodeIndex + 1]);
      }
    });
    
    if (nextHops.size > 1) {
      // Divergence: multiple next hops
      divergencePoints.push({
        nodeId: node,
        outgoingPaths: nextHops.size,
        pathIds: Array.from(pathsUsingNode)
      });
    }
    
    // Similarly check for convergence (multiple previous hops)
    // ... implementation ...
  });
  
  return { divergencePoints, convergencePoints };
}
```

---

## Path Metrics Calculation

### Hop Count
```typescript
function calculateHopCount(path: string[]): number {
  return path.length - 1; // Number of links = nodes - 1
}
```

### Total Cost
```typescript
function calculateTotalCost(edgeIds: string[], edges: VisEdge[]): number {
  return edgeIds.reduce((sum, edgeId) => {
    const edge = edges.find(e => e.id === edgeId);
    return sum + (edge?.cost || 0);
  }, 0);
}
```

### Estimated Latency
```typescript
function estimateLatency(path: string[], edges: VisEdge[]): number {
  // Simple model: 1ms per hop + propagation delay per link type
  const hopLatency = (path.length - 1) * 1; // 1ms switching delay per hop
  
  const propagationDelay = path.slice(0, -1).reduce((sum, node, i) => {
    const nextNode = path[i + 1];
    const edge = edges.find(e => e.from === node && e.to === nextNode);
    
    // Estimate based on link type (oversimplified)
    if (edge?.edgeType === 'intercontinental') return sum + 50; // 50ms
    if (edge?.edgeType === 'backbone') return sum + 10; // 10ms
    return sum + 2; // 2ms local
  }, 0);
  
  return hopLatency + propagationDelay;
}
```

### Min Bandwidth (Bottleneck)
```typescript
function calculateMinBandwidth(edgeIds: string[], edges: VisEdge[]): number {
  const capacities = edgeIds.map(edgeId => {
    const edge = edges.find(e => e.id === edgeId);
    return edge?.sourceCapacity?.total_capacity_mbps || Infinity;
  });
  
  return Math.min(...capacities);
}
```

### Shared Link Count
```typescript
function countSharedLinks(
  pathEdges: string[],
  otherPaths: PathInfo[]
): number {
  const pathEdgeSet = new Set(pathEdges);
  let sharedCount = 0;
  
  otherPaths.forEach(otherPath => {
    otherPath.edgeSequence.forEach(edgeId => {
      if (pathEdgeSet.has(edgeId)) sharedCount++;
    });
  });
  
  return sharedCount;
}
```

### Diversity Score
```typescript
function calculateDiversityScore(
  path: PathInfo,
  allPaths: PathInfo[]
): number {
  // Score based on:
  // 1. Unique countries (30 points)
  // 2. Unique links (40 points)
  // 3. Unique nodes (30 points)
  
  const uniqueCountries = new Set(path.metrics.countriesTraversed).size;
  const countryScore = Math.min(uniqueCountries * 10, 30);
  
  const totalLinks = path.edgeSequence.length;
  const sharedLinks = path.metrics.sharedLinkCount;
  const linkScore = ((totalLinks - sharedLinks) / totalLinks) * 40;
  
  // ... node uniqueness calculation ...
  
  return countryScore + linkScore + nodeScore;
}
```

---

## UI Component APIs

### PathComparisonModal Component
```typescript
interface PathComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPaths?: PathInfo[];
  maxPaths?: number; // default: 4
}

export const PathComparisonModal: React.FC<PathComparisonModalProps> = ({
  isOpen,
  onClose,
  initialPaths = [],
  maxPaths = 4
}) => {
  const [selectedPaths, setSelectedPaths] = useState<PathInfo[]>(initialPaths);
  const [ecmpAnalysis, setECMPAnalysis] = useState<ECMPGroup | null>(null);
  
  const handleAddPath = (source: string, dest: string) => {
    if (selectedPaths.length >= maxPaths) {
      alert(`Maximum ${maxPaths} paths allowed`);
      return;
    }
    
    const path = calculatePath(source, dest);
    setSelectedPaths(prev => [...prev, path]);
  };
  
  const handleAnalyzeECMP = (source: string, dest: string) => {
    const result = dijkstraWithECMP(source, dest, nodes, edges);
    if (result.isECMP) {
      setECMPAnalysis(buildECMPGroup(result));
      setSelectedPaths(result.paths.map(p => buildPathInfo(p)));
    }
  };
  
  return (
    <div className="modal">
      <div className="split-view">
        <div className="network-view">
          {/* Render network with highlighted paths */}
        </div>
        <div className="control-panel">
          <PathSelectorPanel onAddPath={handleAddPath} />
          <PathMetricsTable paths={selectedPaths} />
          {ecmpAnalysis && <ECMPTreeVisualizer group={ecmpAnalysis} />}
        </div>
      </div>
    </div>
  );
};
```

### PathMetricsTable Component
```typescript
interface PathMetricsTableProps {
  paths: PathInfo[];
  sortBy?: keyof PathMetrics;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: keyof PathMetrics) => void;
}

export const PathMetricsTable: React.FC<PathMetricsTableProps> = ({
  paths,
  sortBy = 'totalCost',
  sortOrder = 'asc',
  onSort
}) => {
  const sortedPaths = useMemo(() => {
    return [...paths].sort((a, b) => {
      const aVal = a.metrics[sortBy];
      const bVal = b.metrics[sortBy];
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [paths, sortBy, sortOrder]);
  
  return (
    <table className="metrics-table">
      <thead>
        <tr>
          <th onClick={() => onSort?.('hopCount')}>Hop Count</th>
          <th onClick={() => onSort?.('totalCost')}>Total Cost</th>
          <th onClick={() => onSort?.('estimatedLatency')}>Latency</th>
          {/* ... more columns ... */}
        </tr>
      </thead>
      <tbody>
        {sortedPaths.map(path => (
          <tr key={path.id}>
            <td>{path.metrics.hopCount}</td>
            <td>{path.metrics.totalCost}</td>
            <td>{path.metrics.estimatedLatency}ms</td>
            {/* ... more cells ... */}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## Export Service

### PDF Generation
```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportPathComparisonPDF(
  paths: PathInfo[],
  networkElement: HTMLElement
): Promise<void> {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  
  // Page 1: Header + Network Diagram
  pdf.setFontSize(18);
  pdf.text('Path Comparison Report', 20, 20);
  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
  
  // Capture network diagram as image
  const canvas = await html2canvas(networkElement);
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 20, 40, 250, 140);
  
  // Page 2: Metrics Table
  pdf.addPage();
  pdf.setFontSize(14);
  pdf.text('Path Metrics Comparison', 20, 20);
  
  // Generate table
  const tableData = paths.map(p => [
    p.source,
    p.destination,
    p.metrics.hopCount.toString(),
    p.metrics.totalCost.toString(),
    `${p.metrics.estimatedLatency}ms`,
    // ... more columns
  ]);
  
  pdf.autoTable({
    head: [['Source', 'Destination', 'Hops', 'Cost', 'Latency']],
    body: tableData,
    startY: 30
  });
  
  // Save
  pdf.save(`path-comparison-${Date.now()}.pdf`);
}
```

### CSV Generation
```typescript
export function exportPathMetricsCSV(paths: PathInfo[]): void {
  const headers = [
    'Path_ID',
    'Source',
    'Destination',
    'Hop_Count',
    'Total_Cost',
    'Latency_ms',
    'Min_Bandwidth_Mbps',
    'Countries_Traversed'
  ];
  
  const rows = paths.map(p => [
    p.id,
    p.source,
    p.destination,
    p.metrics.hopCount,
    p.metrics.totalCost,
    p.metrics.estimatedLatency,
    p.metrics.minBandwidth,
    p.metrics.countriesTraversed.join('→')
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `path-metrics-${Date.now()}.csv`;
  a.click();
}
```

---

## Performance Considerations

### Path Enumeration Limits
- **Max ECMP Paths**: 10 (configurable)
- **Timeout**: 5 seconds for path calculation
- **Complexity**: O(V + E) per path, O(P × (V + E)) for P paths

### Optimization Strategies
1. **Early Termination**: Stop after finding N equal-cost paths
2. **Path Pruning**: Remove duplicate paths (same node sequence)
3. **Lazy Loading**: Calculate metrics on-demand, not upfront
4. **Memoization**: Cache path calculations for same source/dest pair

### Memory Usage
- **Per Path**: ~1KB (100 nodes × 10 bytes per node)
- **10 Paths**: ~10KB
- **ECMP Analysis**: ~5KB (divergence/convergence data)
- **Total**: <20KB per comparison (acceptable)

---

## Testing Strategy

### Unit Tests
```typescript
describe('dijkstraWithECMP', () => {
  it('detects ECMP when multiple equal-cost paths exist', () => {
    const result = dijkstraWithECMP('A', 'D', nodes, edges);
    expect(result.isECMP).toBe(true);
    expect(result.paths.length).toBe(3);
    expect(result.paths.every(p => p.cost === 30)).toBe(true);
  });
  
  it('returns single path when no ECMP exists', () => {
    const result = dijkstraWithECMP('A', 'B', nodes, edges);
    expect(result.isECMP).toBe(false);
    expect(result.paths.length).toBe(1);
  });
  
  it('respects maxPaths limit', () => {
    const result = dijkstraWithECMP('A', 'Z', nodes, edges, { maxPaths: 5 });
    expect(result.paths.length).toBeLessThanOrEqual(5);
  });
});

describe('pathMetrics', () => {
  it('calculates hop count correctly', () => {
    const path = {nodes: ['A', 'B', 'C', 'D']};
    expect(calculateHopCount(path.nodes)).toBe(3);
  });
  
  it('identifies bottleneck bandwidth', () => {
    const edges = [
      {capacity: 10000}, // 10Gbps
      {capacity: 1000},  // 1Gbps (bottleneck)
      {capacity: 5000}   // 5Gbps
    ];
    expect(calculateMinBandwidth(edges)).toBe(1000);
  });
});
```

### Integration Tests
```typescript
describe('PathComparisonModal', () => {
  it('displays multiple paths simultaneously', async () => {
    render(<PathComparisonModal isOpen={true} />);
    
    // Add path 1
    await selectPath('GBR-R9', 'ZAF-R1');
    expect(screen.getByText(/Path 1/)).toBeInTheDocument();
    
    // Add path 2
    await selectPath('GBR-R9', 'LSO-R1');
    expect(screen.getByText(/Path 2/)).toBeInTheDocument();
    
    // Verify metrics table
    expect(screen.getByText(/Hop Count/)).toBeInTheDocument();
  });
  
  it('exports PDF successfully', async () => {
    const { exportPDF } = render(<PathComparisonModal />);
    await selectPath('A', 'B');
    
    await exportPDF.click();
    
    // Verify PDF generation (mock jsPDF)
    expect(mockPDF.save).toHaveBeenCalledWith(
      expect.stringContaining('path-comparison')
    );
  });
});
```

---

## Dependencies & Libraries

### Required Libraries
```json
{
  "dependencies": {
    "d3": "^7.8.5",           // Tree visualization (if used)
    "jspdf": "^2.5.1",        // PDF generation
    "jspdf-autotable": "^3.8.0", // PDF tables
    "html2canvas": "^1.4.1",  // Screenshot capture
    "papaparse": "^5.4.1"     // CSV generation
  }
}
```

**Total Bundle Impact**: ~350KB minified

### Bundle Optimization
- Use tree-shaking for D3 (import only needed modules)
- Lazy-load PDF export libraries (dynamic import)
- Consider alternative to html2canvas (SVG export)

---

## Migration Path

### Phase 1: Core Algorithm (Week 1)
- Implement `dijkstraWithECMP()`
- Add unit tests
- Benchmark performance

### Phase 2: UI Components (Week 2)
- PathComparisonModal shell
- PathMetricsTable
- Basic path highlighting

### Phase 3: ECMP Visualization (Week 3)
- ECMPTreeVisualizer
- Divergence/convergence detection
- Interactive highlighting

### Phase 4: Export & Polish (Week 4)
- PDF/CSV export
- What-if scenarios
- Documentation

---

**Approved By**: _________  
**Implementation Start**: [TBD]  
**Target Completion**: [TBD + 4 weeks]













