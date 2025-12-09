# PRD: Failure Impact Simulator & Resilience Analysis

**Product**: OSPF Network Visualizer Pro  
**Feature**: Failure Impact Simulator  
**Version**: 1.0  
**Date**: 2025-11-29  
**Priority**: HIGH  

---

## Executive Summary

Network engineers need to proactively test disaster recovery scenarios and identify single points of failure before incidents occur. This feature provides interactive failure simulation with comprehensive impact analysis and resilience scoring.

---

## Problem Statement

### Pain Points
- **Reactive Testing**: Failures discovered during actual outages, not proactively
- **Unknown SPOFs**: Single Points of Failure not identified until they fail
- **Manual DR Planning**: Disaster recovery scenarios require hours of manual analysis
- **No Impact Visibility**: Can't predict what breaks when X fails
- **Compliance Risk**: SLA validation requires extensive testing

### Business Impact
- **Downtime Cost**: Average $5,600/minute for enterprise networks
- **SLA Penalties**: Unplanned outages trigger contractual penalties
- **Reputation Damage**: Service degradation affects customer trust
- **Time Waste**: Manual failure analysis takes 30-60 minutes per scenario

---

## Solution Overview

An interactive **Failure Simulator** that allows engineers to:
- Click-to-fail nodes or links
- Simulate cascade/multi-failure scenarios
- Visualize traffic rerouting with animation
- Calculate resilience scores
- Save/load disaster recovery test scenarios

---

## Key Features

### 1. Interactive Failure Selection
- **Click-to-Fail**: Click any node/link to simulate failure
- **Multi-Selection**: Hold Shift to select multiple elements
- **Cascade Simulation**: "What if 3 links fail simultaneously?"
- **Scheduled Maintenance**: Simulate planned downtime windows
- **Failure Probability**: Set likelihood (e.g., "20% chance link fails")

### 2. Impact Visualization
- **Red Highlighting**: Failed elements shown in red with X icon
- **Affected Paths**: Paths traversing failed elements highlighted
- **Traffic Rerouting**: Animated flow showing traffic shifting to alternate paths
- **Isolated Nodes**: Nodes unreachable after failure shown with warning icon
- **Network Partition**: Identify if network splits into islands

### 3. Metrics Dashboard
- **Paths Affected**: "47 of 182 paths impacted (26%)"
- **Convergence Time**: Estimated SPF recalculation time
- **Capacity Impact**: New utilization on alternate paths
- **SPF Recalculation Count**: How many routers must recalculate
- **Downtime Estimate**: Based on OSPF timers

### 4. Resilience Score (1-10)
- **Score Calculation**:
  - 10 points: Full redundancy, no single point of failure
  - 8-9 points: High resilience, <10% paths affected by single failure
  - 5-7 points: Moderate resilience, some SPOFs exist
  - 3-4 points: Low resilience, >50% paths affected
  - 1-2 points: Critical state, network partitions on single failure
- **Visual Indicator**: Color-coded gauge (green/yellow/red)
- **Breakdown**: Per-country resilience sub-scores

### 5. Single Point of Failure (SPOF) Identification
- **Automatic Detection**: System identifies critical elements
- **Criticality Ranking**: "Top 5 Most Critical Links"
- **Impact Preview**: Shows what breaks if SPOF fails
- **Recommendations**: "Add link between X and Y to eliminate SPOF"

### 6. Scenario Library
- **Save Scenarios**: "Maintenance Window - Core Router Upgrade"
- **Load Scenarios**: Quick access to common test cases
- **Scenario Templates**: Pre-built scenarios (Data Center Outage, ISP Failure, etc.)
- **Scenario Sharing**: Export/import scenarios as JSON

---

## User Stories

### US-1: Single Link Failure Test
**As a** network engineer  
**I want to** simulate a single link failure  
**So that** I can verify alternate paths exist

**Acceptance Criteria**:
- Click link → marked as failed (red X)
- System recalculates all affected paths
- Alternate paths shown in green
- Metrics update: "12 paths affected, all have alternates"

### US-2: SPOF Identification
**As a** network architect  
**I want to** automatically identify single points of failure  
**So that** I can prioritize network redundancy improvements

**Acceptance Criteria**:
- "Analyze Resilience" button runs SPOF detection
- List shows: "5 SPOFs found"
- Click SPOF to see impact visualization
- Recommendations provided for each SPOF

### US-3: Multi-Failure Cascade
**As a** disaster recovery planner  
**I want to** simulate multiple simultaneous failures  
**So that** I can test worst-case scenarios

**Acceptance Criteria**:
- Can select 3 links and click "Fail All"
- System shows compound impact
- Identifies if network partitions
- Shows: "Network split into 2 islands: 8 nodes isolated"

### US-4: Resilience Score Tracking
**As a** network manager  
**I want to** see a resilience score over time  
**So that** I can track network health improvements

**Acceptance Criteria**:
- Resilience score displayed as gauge: "7.2/10"
- Score breakdown by component
- Historical tracking (if feature expanded)
- Target score displayed: "Goal: 8.5/10"

### US-5: Scenario Saving
**As a** NOC operator  
**I want to** save failure test scenarios  
**So that** I can reuse them during drills

**Acceptance Criteria**:
- "Save Scenario" button with name field
- Scenario saved to localStorage
- "Load Scenario" dropdown lists saved scenarios
- Can delete old scenarios

---

## Technical Approach

### Architecture
```
Components/
├── FailureSimulator.tsx          (Main component)
├── FailureControls.tsx            (Selection UI)
├── ImpactDashboard.tsx            (Metrics display)
├── ResilienceGauge.tsx            (Score visualization)
├── SPOFAnalyzer.tsx               (SPOF detection)
└── ScenarioManager.tsx            (Save/load scenarios)

Services/
├── failureSimulation.ts           (Core simulation logic)
├── resilienceScoring.ts           (Score calculation)
├── spofDetection.ts               (SPOF algorithm)
└── impactCalculation.ts           (Metrics calculation)
```

### SPOF Detection Algorithm
```typescript
function detectSPOFs(nodes: VisNode[], edges: VisEdge[]): SPOF[] {
  const spofs: SPOF[] = [];
  
  // Test each edge
  edges.forEach(edge => {
    const remainingEdges = edges.filter(e => e.id !== edge.id);
    const connectivity = testConnectivity(nodes, remainingEdges);
    
    if (!connectivity.isFullyConnected) {
      spofs.push({
        element: edge,
        type: 'edge',
        impact: {
          nodesIsolated: connectivity.isolatedNodes,
          pathsAffected: connectivity.brokenPaths,
          severity: 'CRITICAL'
        }
      });
    }
  });
  
  // Test each node
  nodes.forEach(node => {
    const remainingNodes = nodes.filter(n => n.id !== node.id);
    const remainingEdges = edges.filter(e => 
      e.from !== node.id && e.to !== node.id
    );
    const connectivity = testConnectivity(remainingNodes, remainingEdges);
    
    if (!connectivity.isFullyConnected) {
      spofs.push({
        element: node,
        type: 'node',
        impact: connectivity
      });
    }
  });
  
  return spofs.sort((a, b) => 
    b.impact.pathsAffected - a.impact.pathsAffected
  );
}
```

### Resilience Score Calculation
```typescript
function calculateResilienceScore(
  nodes: VisNode[],
  edges: VisEdge[]
): ResilienceScore {
  const spofs = detectSPOFs(nodes, edges);
  const avgConnectivity = calculateAvgConnectivity(nodes, edges);
  const ecmpCoverage = calculateECMPCoverage(nodes, edges);
  
  let score = 10;
  
  // Penalize SPOFs
  score -= spofs.filter(s => s.impact.severity === 'CRITICAL').length * 2;
  score -= spofs.filter(s => s.impact.severity === 'HIGH').length * 1;
  
  // Reward high connectivity
  score += avgConnectivity > 3 ? 1 : 0;
  
  // Reward ECMP coverage
  score += ecmpCoverage > 0.5 ? 1 : 0;
  
  return {
    overall: Math.max(1, Math.min(10, score)),
    breakdown: {
      redundancy: calculateRedundancyScore(edges),
      diversity: calculateDiversityScore(nodes),
      capacity: calculateCapacityScore(edges)
    }
  };
}
```

---

## Dependencies
- Extends existing impact analysis
- Requires Dijkstra algorithm
- Uses vis-network for visualization
- **No new external libraries required**

---

## Success Metrics
- **Adoption**: 70% of users run failure simulation within first 2 weeks
- **SPOF Discovery**: Average 3-5 SPOFs identified per network
- **Time Savings**: Reduce DR testing from 60min to 5min
- **Incident Reduction**: 30% fewer surprise outages post-implementation

---

## Timeline: 3 weeks (1 developer)

**Week 1**: Failure simulation core, SPOF detection  
**Week 2**: Impact visualization, metrics dashboard  
**Week 3**: Resilience scoring, scenario management  

---

## See Also
- `user-stories.md` - Detailed user stories
- `technical-specs.md` - Implementation details
- `CRITICAL_BUG_ANALYSIS.md` - Related bug fixes

---

**Status**: Approved for Development  
**Dependencies**: None (can start immediately)












