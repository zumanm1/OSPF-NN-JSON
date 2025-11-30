# PRD: Traffic Engineering & Cost Optimization Engine

**Product**: OSPF Network Visualizer Pro  
**Feature**: Traffic Engineering & Cost Optimization  
**Version**: 1.0  
**Date**: 2025-11-29  
**Priority**: MEDIUM  

---

## Executive Summary

Manual OSPF cost tuning is time-consuming, error-prone, and often results in suboptimal traffic distribution. This feature provides an algorithmic optimization engine to automatically suggest cost changes that balance traffic, reduce congestion, and improve network efficiency.

---

## Problem Statement

### Pain Points
- **Manual Tuning Hell**: Engineers spend days tweaking costs via trial-and-error
- **Congestion Hotspots**: Over-utilized links cause performance degradation
- **Wasted Capacity**: Under-utilized links sit idle while others are overloaded
- **No Optimization Tools**: Current tools only show status, don't suggest fixes
- **Risk of Breaking**: Cost changes can inadvertently worsen routing

### Business Impact
- **Poor Performance**: Congested links = slow applications = user complaints
- **Over-Provisioning**: Buy more bandwidth instead of optimizing existing capacity
- **Time Waste**: 1-2 weeks for manual optimization per network change
- **SLA Risk**: Congestion leads to packet loss, violating SLAs

---

## Solution Overview

An **Automated Traffic Engineering Engine** that:
- Analyzes current link utilization
- Identifies congestion hotspots and underutilized links
- Runs optimization algorithms to suggest cost changes
- Shows before/after traffic distribution preview
- Validates changes won't break routing

---

## Key Features

### 1. Current State Analysis
- **Link Utilization Heatmap**: Color-coded network showing utilization
  - Green: <50% utilized
  - Yellow: 50-80% utilized
  - Red: >80% utilized (congestion)
- **Congestion Ranking**: "Top 10 Most Congested Links"
- **Capacity Waste Report**: "15 links < 20% utilized, total wasted: 45Gbps"
- **Traffic Matrix**: Source-destination flow volumes

### 2. Congestion Hotspot Identification
- **Automatic Detection**: Links with >80% utilization flagged
- **Impact Analysis**: Show which flows traverse congested links
- **Root Cause**: "Why is this link congested?"
  - All GBR→ZAF traffic funnels through this link
  - No alternate paths with acceptable cost
- **Cascade Detection**: Identify if rerouting creates new hotspots

### 3. Optimization Algorithm
**Goal**: Minimize maximum link utilization (load balancing)

**Constraints**:
- Cost changes limited to ±50% of current value
- Minimum cost: 1, Maximum cost: 65535 (OSPF limit)
- Preserve critical routing requirements (e.g., "GBR→USA must stay direct")
- Limit number of changes (e.g., max 10 cost changes)

**Algorithm Options**:
1. **Greedy Heuristic** (Fast, 90% optimal)
2. **Simulated Annealing** (Slow, near-optimal)
3. **Linear Programming** (Optimal, requires solver library)

**Recommended**: Start with Greedy Heuristic

```typescript
function optimizeCosts(
  nodes: VisNode[],
  edges: VisEdge[],
  trafficMatrix: TrafficMatrix,
  constraints: OptimizationConstraints
): OptimizationResult {
  const congested = edges.filter(e => e.utilization > 0.8);
  const underutilized = edges.filter(e => e.utilization < 0.2);
  
  let bestCosts = getCurrentCosts(edges);
  let bestMaxUtil = calculateMaxUtilization(edges);
  
  // Greedy: Iteratively adjust costs to shift traffic
  for (let iteration = 0; iteration < 100; iteration++) {
    const mostCongested = findMostCongestedLink(edges);
    const alternates = findAlternatePaths(mostCongested, edges);
    
    if (alternates.length === 0) continue;
    
    // Lower cost of alternate paths
    const newCosts = adjustCosts(bestCosts, alternates, -5);
    const newMaxUtil = simulateUtilization(newCosts, trafficMatrix);
    
    if (newMaxUtil < bestMaxUtil) {
      bestCosts = newCosts;
      bestMaxUtil = newMaxUtil;
    }
  }
  
  return {
    proposedCosts: bestCosts,
    improvement: (oldMaxUtil - bestMaxUtil) / oldMaxUtil,
    changes: diffCosts(getCurrentCosts(edges), bestCosts)
  };
}
```

### 4. Goal-Based Optimization
User can select optimization goal:
- **Balance Traffic**: Minimize max link utilization
- **Minimize Latency**: Prefer lower-hop-count paths
- **Geographic Diversity**: Spread traffic across countries
- **Cost Minimize**: Use cheapest paths (e.g., avoid expensive transit)
- **Custom**: User-defined objective function

### 5. Before/After Comparison
**Side-by-Side View**:
- **Left**: Current state with utilization heatmap
- **Right**: Proposed state with new costs applied

**Metrics Comparison Table**:
| Metric | Current | Proposed | Improvement |
|--------|---------|----------|-------------|
| Max Link Utilization | 95% | 72% | -23% ✅ |
| Avg Link Utilization | 45% | 52% | +7% ✅ |
| Congested Links (>80%) | 8 | 2 | -6 ✅ |
| Underutilized Links (<20%) | 15 | 10 | -5 ✅ |
| Paths Changed | - | 34 | - |

**Traffic Flow Visualization**:
- Animated flows showing traffic shifting from congested to alternate paths
- Flow thickness proportional to bandwidth

### 6. Change Recommendations
**Output Format**:
```
Optimization Complete: 7 cost changes recommended

Changes:
1. Link GBR-R9 → DEU-R10: Cost 10 → 8 (-20%)
   Impact: Shifts 12 flows, reduces utilization from 95% to 68%
   
2. Link DEU-R10 → ZAF-R1: Cost 20 → 25 (+25%)
   Impact: Offloads 5 flows to alternate via FRA
   
3. Link USA-R5 → USA-R6: Cost 5 → 3 (-40%)
   Impact: Attracts 8 flows, increases utilization from 15% to 45%
   
...

Summary:
- Max utilization reduced: 95% → 72%
- 6 fewer congested links
- 34 flows rerouted
- No paths broken
- Estimated improvement: 23%

Apply Changes? [Yes] [Simulate More] [Export Report]
```

### 7. Validation & Safety Checks
Before applying changes:
- ✅ **No Path Breaks**: Verify all source-destination pairs still reachable
- ✅ **No Infinite Loops**: Check for routing loops
- ✅ **Cost Limits**: All costs within OSPF range [1, 65535]
- ✅ **Constraint Compliance**: User constraints satisfied
- ⚠️ **Warning**: "This creates asymmetric routing (OK for OSPF, but note)"

---

## User Stories

### US-1: Congestion Hotspot Identification
**As a** network engineer  
**I want to** see which links are congested  
**So that** I can prioritize optimization efforts

**Acceptance Criteria**:
- Heatmap shows utilization color-coded
- Can click congested link to see which flows traverse it
- "Top 10 Congested Links" list

### US-2: Automated Cost Optimization
**As a** network planner  
**I want to** get algorithm-suggested cost changes  
**So that** I don't have to manually try different values

**Acceptance Criteria**:
- Click "Optimize Costs" button
- Algorithm runs in <10 seconds
- Shows list of recommended changes with impact
- Can accept/reject individual changes

### US-3: What-If Validation
**As a** network engineer  
**I want to** preview how cost changes affect routing  
**So that** I can validate before applying

**Acceptance Criteria**:
- Before/After split-screen comparison
- Metrics table shows improvement
- Can see which flows change paths
- "Apply Changes" button to commit

### US-4: Goal Selection
**As a** capacity planner  
**I want to** choose optimization goal (balance vs latency)  
**So that** algorithm optimizes for my priority

**Acceptance Criteria**:
- Radio buttons: Balance Traffic | Minimize Latency | Diversity
- Algorithm adjusts based on selection
- Results reflect chosen goal

### US-5: Export Recommendations
**As a** network architect  
**I want to** export optimization report  
**So that** I can share with team and document changes

**Acceptance Criteria**:
- "Export PDF" generates report
- Includes before/after metrics
- Lists all cost changes
- Includes validation results

---

## Technical Approach

### Architecture
```
Components/
├── TrafficEngineeringModal.tsx       (Main UI)
├── UtilizationHeatmap.tsx            (Network heatmap)
├── OptimizationControls.tsx          (Goal selection, run button)
├── RecommendationsPanel.tsx          (Cost change list)
└── BeforeAfterComparison.tsx         (Side-by-side view)

Services/
├── trafficOptimization.ts            (Core algorithm)
├── utilizationCalculation.ts         (Flow-to-utilization)
├── constraintSolver.ts               (Optimization engine)
└── validationService.ts              (Safety checks)
```

### Traffic Matrix Data
**Challenge**: Real traffic data not available in current app

**Solution Options**:
1. **Synthetic**: Generate based on node importance (e.g., capital cities = more traffic)
2. **User Input**: Allow uploading NetFlow/sFlow data
3. **Placeholder**: Assume uniform traffic (1Gbps per source-dest pair)
4. **Future Integration**: Connect to telemetry systems (Prometheus, InfluxDB)

**Recommended**: Start with synthetic traffic model

```typescript
function generateTrafficMatrix(nodes: RouterNode[]): TrafficMatrix {
  const matrix = new Map<string, Map<string, number>>();
  
  nodes.forEach(src => {
    matrix.set(src.id, new Map());
    nodes.forEach(dest => {
      if (src.id === dest.id) return;
      
      // Traffic proportional to country populations (simple model)
      const srcPop = countryPopulations[src.country] || 1;
      const destPop = countryPopulations[dest.country] || 1;
      const traffic = Math.sqrt(srcPop * destPop) * 10; // Mbps
      
      matrix.get(src.id)!.set(dest.id, traffic);
    });
  });
  
  return matrix;
}
```

---

## Dependencies
- **Traffic Data**: Requires synthetic or real traffic matrix
- **Optimization Library**: Consider using `numeric.js` for LP solver (optional)
- **Utilization Calculation**: Integrate with existing Dijkstra routing

**Bundle Impact**: +50KB (numeric.js) if using LP solver

---

## Success Metrics
- **Time Savings**: Reduce optimization from 1 week to 1 hour (98% reduction)
- **Network Efficiency**: Improve average utilization by 15%
- **Congestion Reduction**: 50% fewer links >80% utilized
- **Adoption**: 40% of users try optimization within first month

---

## Timeline: 4 weeks (1 developer)

**Week 1**: Traffic matrix generation, utilization calculation  
**Week 2**: Greedy optimization algorithm  
**Week 3**: Before/After UI, validation  
**Week 4**: Goal-based optimization, export, polish  

---

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Algorithm too slow | Use heuristic, add timeout, run in Web Worker |
| Traffic data inaccurate | Provide manual override, import NetFlow |
| Optimization makes it worse | Extensive validation, rollback capability |
| Users don't trust algorithm | Show detailed reasoning for each change |

---

## Future Enhancements
- **Real-Time Integration**: Connect to live telemetry
- **Machine Learning**: Learn traffic patterns over time
- **Multi-Objective**: Optimize for multiple goals simultaneously
- **Auto-Apply**: Automatically apply during low-traffic hours
- **Historical Comparison**: "This week vs last week"

---

**Status**: Approved for Development  
**Dependencies**: Traffic matrix model (can use synthetic data)







