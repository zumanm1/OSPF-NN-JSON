# PRD: Path Comparison & ECMP Explorer

**Product**: OSPF Network Visualizer Pro  
**Feature**: Path Comparison & ECMP Explorer  
**Version**: 1.0  
**Date**: 2025-11-29  
**Status**: Proposed  
**Priority**: HIGH  

---

## Executive Summary

Network engineers need to understand Equal-Cost Multi-Path (ECMP) load balancing and compare multiple routing paths simultaneously to optimize traffic distribution and identify redundancy opportunities. This feature provides side-by-side path comparison with ECMP detection, visualization, and analysis capabilities.

---

## Problem Statement

### Current Pain Points
1. **Limited Path Visibility**: Engineers can only see one path at a time
2. **ECMP Mystery**: ECMP paths exist but are not clearly identified or visualized
3. **No Comparison Tool**: Cannot compare alternate paths to understand trade-offs
4. **Manual Analysis**: Engineers must manually calculate and compare path metrics
5. **Load Balancing Blind Spot**: No visibility into how traffic would be distributed across ECMP paths

### Business Impact
- **Suboptimal Routing**: Traffic may not be load-balanced efficiently
- **Missed Redundancy**: ECMP opportunities not identified
- **Time Waste**: Manual path comparison takes 15-30 minutes per analysis
- **Poor Decisions**: Without comparison data, engineers make suboptimal routing choices

---

## Solution Overview

A dedicated **Path Comparison & ECMP Explorer** modal that allows engineers to:
- Compare up to 4 paths side-by-side
- Automatically detect and visualize all ECMP paths
- Analyze path metrics in a structured table
- Run what-if scenarios (link failures, cost changes)
- Export comparison reports for documentation

---

## Key Features

### 1. Multi-Path Comparison Interface
- **Side-by-Side View**: Display up to 4 different paths simultaneously
- **Path Selection**: Choose source/destination pairs from dropdowns or click on network
- **Visual Highlighting**: Each path shown in different color on network diagram
- **Synchronized Navigation**: Zoom/pan applies to all paths

**Technical Note**: Extends existing `dijkstraDirected` function to accept multiple source/destination pairs

### 2. ECMP Detection & Visualization
- **Automatic Discovery**: Identify all equal-cost paths between nodes
- **Tree Visualization**: Show path divergence and convergence points
- **Divergence Indicators**: Highlight where ECMP paths split and rejoin
- **Path Count Badge**: Display "3 ECMP paths" indicator

**Algorithm**: Enhance Dijkstra to track ALL equal-cost paths, not just one

### 3. Load Balancing Distribution Analysis
- **Traffic Split Calculator**: Show how traffic would be distributed (e.g., 33%/33%/33%)
- **Per-Path Capacity**: Display bandwidth available on each path
- **Bottleneck Identification**: Highlight lowest-capacity link in each path
- **Utilization Forecast**: Project utilization if traffic is distributed via ECMP

### 4. Path Metrics Comparison Table

| Metric | Path 1 | Path 2 | Path 3 | Path 4 |
|--------|--------|--------|--------|--------|
| Hop Count | 3 | 4 | 3 | 5 |
| Total Cost | 30 | 30 | 35 | 40 |
| Estimated Latency | 15ms | 18ms | 16ms | 22ms |
| Min Bandwidth | 1Gbps | 10Gbps | 1Gbps | 100Mbps |
| Shared Links | - | 2 | 1 | 0 |
| Countries Traversed | GBR→DEU→ZAF | GBR→USA→ZAF | GBR→FRA→ZAF | GBR→PRT→MOZ→ZAF |

**Metrics Calculated**:
- Hop count: Number of router hops
- Total cost: Sum of OSPF link costs
- Latency estimate: Based on hop count + link types
- Bandwidth: Minimum capacity along path
- Shared links: Links common with other paths
- Geographic diversity: Countries traversed

### 5. What-If Scenario Simulator
- **Link Failure Impact**: "What if link X fails?" - show which paths remain
- **Cost Adjustment Preview**: See how cost changes affect path selection
- **Before/After Comparison**: Side-by-side comparison of current vs proposed state
- **Scenario Saving**: Save scenarios for future reference

### 6. Path Export & Reporting
- **PDF Report**: Generate professional path comparison report
- **CSV Export**: Export metrics table for analysis in Excel
- **Screenshot Capture**: Save visual comparison image
- **Include in Documentation**: Export format suitable for network documentation

---

## User Stories

### US-1: Network Engineer Discovers ECMP Opportunities
**As a** network engineer  
**I want to** see all equal-cost paths between two nodes  
**So that** I can understand load balancing opportunities

**Acceptance Criteria**:
- Clicking "Analyze ECMP" shows all equal-cost paths
- Visual tree diagram displays path divergence
- Each ECMP path is highlighted in different color
- Load balancing percentage is calculated automatically

### US-2: Engineer Compares Path Trade-offs
**As a** capacity planner  
**I want to** compare metrics of 4 different paths side-by-side  
**So that** I can choose the optimal path based on latency, cost, and capacity

**Acceptance Criteria**:
- Can select 4 source/destination pairs
- Metrics table shows hop count, cost, latency, bandwidth for each
- Paths are color-coded and highlighted on network diagram
- Can sort by any metric

### US-3: Engineer Tests Failure Scenarios
**As a** network engineer  
**I want to** simulate a link failure and see alternate paths  
**So that** I can validate our network has sufficient redundancy

**Acceptance Criteria**:
- Can click link to simulate failure
- System shows which paths are affected
- Alternate paths are automatically displayed
- Can compare before/after scenarios

### US-4: Documentation Export
**As a** network architect  
**I want to** export path comparison as PDF report  
**So that** I can include it in design documentation

**Acceptance Criteria**:
- PDF includes network diagram with paths highlighted
- PDF includes metrics comparison table
- PDF includes ECMP analysis section
- Export completes in <5 seconds

### US-5: Geographic Diversity Analysis
**As a** network engineer  
**I want to** see which countries each path traverses  
**So that** I can ensure geographic diversity for resilience

**Acceptance Criteria**:
- Metrics table includes "Countries Traversed" column
- Paths are color-coded by country
- Can filter paths by geographic constraints
- Diversity score is calculated (more countries = more diverse)

---

## Technical Approach

### Architecture

```
Components/
├── PathComparisonModal.tsx (main component)
├── ECMPTreeVisualizer.tsx (tree diagram)
├── PathMetricsTable.tsx (comparison table)
└── PathSelectorPanel.tsx (path selection UI)

Services/
├── dijkstra.ts (enhance to return ALL equal-cost paths)
└── pathAnalysis.ts (new: path metrics calculations)

State Management/
├── usePathComparison.ts (custom hook)
└── pathComparisonState (React state)
```

### Enhanced Dijkstra Algorithm

**Current**: Returns single path  
**Enhanced**: Returns all equal-cost paths

```typescript
interface EnhancedPathResult {
  paths: string[][]; // Array of paths (each path is array of node IDs)
  cost: number;
  isECMP: boolean;
  allEdges: Map<string, string[]>; // Edge ID -> list of paths using it
  divergencePoints: string[]; // Node IDs where paths split
  convergencePoints: string[]; // Node IDs where paths rejoin
}
```

**Implementation**:
1. During Dijkstra relaxation, when `newDist === vDist`, add to parents list
2. After completion, backtrack from destination through ALL parent possibilities
3. Use DFS/BFS to enumerate all equal-cost paths
4. Identify divergence/convergence by analyzing path overlap

### Path Metrics Calculation

```typescript
function calculatePathMetrics(path: string[], edges: VisEdge[]): PathMetrics {
  return {
    hopCount: path.length - 1,
    totalCost: sum(edges.map(e => e.cost)),
    estimatedLatency: calculateLatency(path, edges),
    minBandwidth: min(edges.map(e => e.capacity)),
    sharedLinks: countSharedLinks(path, otherPaths),
    countriesTraversed: getCountries(path, nodes)
  };
}
```

### UI Components

**PathComparisonModal**:
- Full-screen modal overlaying network
- Split view: 60% network visualization, 40% metrics panel
- Tabbed interface: "Comparison" | "ECMP Analysis" | "Scenarios"

**ECMPTreeVisualizer**:
- D3.js tree diagram showing path branching
- Nodes: Routers where paths diverge/converge
- Edges: Links with load balancing percentage
- Interactive: Click node to highlight on main network

**PathMetricsTable**:
- Sortable table with all metrics
- Color-coded cells (green=best, red=worst for each metric)
- Export button (CSV/PDF)
- Filter controls

### Data Flow

1. User selects source/destination → `handleAnalyzePaths()`
2. Call `dijkstraDirected()` with ECMP enhancement
3. Calculate metrics for each path
4. Render in comparison view
5. User interactions update state
6. Export triggers report generation

---

## Dependencies

### Internal Dependencies
1. **CRITICAL BUG #3 Fix Required**: Country filter must exclude edges properly
2. **Dijkstra Algorithm Enhancement**: Must return all ECMP paths
3. **Network State Access**: Needs current nodes/edges from DataSet
4. **Vis-network Integration**: Must highlight multiple paths simultaneously

### External Dependencies
1. **D3.js** (if tree visualization needed): ~100KB addition
2. **jsPDF** (for PDF export): ~200KB addition
3. **papaparse** (for CSV export): ~50KB addition

**Total Bundle Impact**: ~350KB (acceptable for this feature)

### Technical Risks
1. **Performance**: Enumerating all ECMP paths could be slow for dense graphs
   - **Mitigation**: Limit to first 10 ECMP paths, add "Show More" button
2. **Memory**: Storing multiple paths simultaneously
   - **Mitigation**: Use lazy loading, compute on-demand
3. **Visualization Clutter**: Too many paths highlighted
   - **Mitigation**: Toggle individual paths on/off

---

## Success Metrics

### Quantitative
- **Adoption**: 60% of users try path comparison within first week
- **Usage**: Average 5 comparisons per user session
- **Time Savings**: Reduce manual path analysis from 15min to 2min (87% reduction)
- **Export**: 30% of comparisons exported as reports

### Qualitative
- **User Feedback**: >4.0/5.0 rating for "usefulness"
- **Support Tickets**: <5 questions about how to use feature
- **Documentation**: Feature mentioned in 50% of network design docs

### Technical
- **Performance**: Path comparison completes in <3 seconds for 100-node network
- **Memory**: <50MB additional memory usage
- **Bundle Size**: <400KB addition to production build

---

## Timeline Estimate

**Phase 1: Core ECMP Detection** (1 week)
- Enhance Dijkstra algorithm
- Basic path enumeration
- Testing with various topologies

**Phase 2: Comparison UI** (1 week)
- PathComparisonModal component
- Metrics table
- Path highlighting

**Phase 3: ECMP Visualization** (1 week)
- Tree diagram component
- Divergence/convergence detection
- Interactive highlighting

**Phase 4: Export & Polish** (0.5 weeks)
- PDF/CSV export
- What-if scenarios
- Documentation

**Total: 3.5 weeks** (1 developer, full-time)

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ECMP algorithm too slow | Medium | High | Add timeout, limit paths, optimize |
| Visualization cluttered | High | Medium | Add toggle controls, progressive disclosure |
| D3.js learning curve | Low | Medium | Use simpler tree library or custom SVG |
| Export quality poor | Low | Low | Use proven libraries (jsPDF), add QA |
| Feature too complex | Medium | High | User testing, simplify UI, add help |

---

## Open Questions

1. **ECMP Path Limit**: Show all paths or limit to first N? (Recommend: limit to 10)
2. **Latency Calculation**: Use simple hop-count or model link latency? (Recommend: start simple)
3. **Tree vs List View**: Tree diagram or simple list for ECMP? (Recommend: both options)
4. **Export Format**: PDF only or also Word/PowerPoint? (Recommend: PDF + CSV)

---

## Future Enhancements

- **Live Traffic Data**: Show actual traffic split across ECMP paths (requires telemetry integration)
- **Cost Optimization AI**: Suggest cost changes to create ECMP where beneficial
- **Path Prediction**: "Most likely path" based on current utilization
- **Historical Comparison**: Compare current paths to past week/month
- **Multi-Destination**: Compare paths from one source to multiple destinations

---

## Appendix

### Related Documents
- `CRITICAL_BUG_ANALYSIS.md` - Bug #3 fix required
- `services/dijkstra.ts` - Algorithm to enhance
- `types.ts` - PathResult interface to extend

### References
- RFC 2328 (OSPF v2) - Section 16.3 on equal-cost paths
- Cisco OSPF Design Guide - ECMP best practices
- vis-network Documentation - Path highlighting API

---

**Approval**: Pending  
**Next Steps**: 
1. Get stakeholder approval
2. Design mockups (Figma)
3. Technical spike: ECMP enumeration algorithm
4. Begin Phase 1 development













