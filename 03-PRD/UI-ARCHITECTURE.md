# UI Architecture: Traffic Engineering & Cost Optimization Engine

**Feature**: Traffic Engineering & Cost Optimization
**Version**: 1.0
**Last Updated**: 2025-11-29
**Target Engineer**: UI/Frontend Developer

---

## Overview

This document defines the UI/UX architecture for the Traffic Engineering & Cost Optimization Engine, enabling automated OSPF cost tuning suggestions.

---

## UI Component Hierarchy

```
TrafficEngineeringModal (Main Container)
├── TrafficEngineeringHeader
│   ├── Title & Description
│   ├── OptimizationGoalSelector
│   └── Close Button
│
├── MainContent (Three-Column Layout)
│   ├── CurrentStatePane (33% width)
│   │   ├── NetworkHeatmapView
│   │   ├── UtilizationLegend
│   │   └── CongestionMetrics
│   │
│   ├── OptimizationControlsPane (34% width)
│   │   ├── GoalSelectionPanel
│   │   │   ├── BalanceTrafficRadio
│   │   │   ├── MinimizeLatencyRadio
│   │   │   ├── MaximizeDiversityRadio
│   │   │   └── CustomGoalInput
│   │   │
│   │   ├── ConstraintsPanel
│   │   │   ├── MaxCostChangeSlider
│   │   │   ├── MaxChangesCountInput
│   │   │   └── ProtectedLinksSelector
│   │   │
│   │   ├── RunOptimizationButton
│   │   └── OptimizationProgress
│   │
│   └── ProposedStatePane (33% width)
│       ├── NetworkHeatmapView (after)
│       ├── ImprovementMetrics
│       └── RecommendedChangesPanel
│
├── ComparisonMetricsBar
│   ├── MaxUtilizationComparison
│   ├── AvgUtilizationComparison
│   ├── CongestedLinksComparison
│   └── PathsChangedCount
│
└── ActionBar
    ├── ApplyChangesButton
    ├── ExportReportButton
    ├── SimulateMoreButton
    └── ResetButton
```

---

## Task Breakdown: UI Tasks (UI03-xx)

### UI03-01: TrafficEngineeringModal Shell
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: None

**Description**:
Create the main modal container with three-column comparison layout.

**Acceptance Criteria**:
- [ ] Full-screen modal with three-column split
- [ ] Header with goal selector and close button
- [ ] Before/After comparison view
- [ ] Dark mode support
- [ ] Responsive layout

**Technical Details**:
```typescript
// File: components/TrafficEngineeringModal.tsx
interface TrafficEngineeringModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: VisNode[];
  edges: VisEdge[];
  onApplyChanges?: (changes: CostChange[]) => void;
}

type OptimizationGoal = 'balance' | 'latency' | 'diversity' | 'cost' | 'custom';
```

**UI Mockup**:
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [X] Traffic Engineering & Cost Optimization                              │
│ Goal: [● Balance Traffic ○ Min Latency ○ Max Diversity ○ Custom]        │
├──────────────────────┬──────────────────────┬────────────────────────────┤
│   CURRENT STATE      │    OPTIMIZATION      │     PROPOSED STATE         │
│                      │                      │                            │
│   [Network Heatmap]  │  Constraints:        │   [Network Heatmap]        │
│   🔴🟡🟢 Utilization  │  Max Change: ±50%    │   (After optimization)     │
│                      │  Max Changes: 10     │                            │
│   Max Util: 95%      │  Protected: [None]   │   Max Util: 72%            │
│   Avg Util: 45%      │                      │   Avg Util: 52%            │
│   Congested: 8       │  [▶ Run Optimize]    │   Congested: 2             │
│                      │  Progress: ████░ 80% │                            │
├──────────────────────┴──────────────────────┴────────────────────────────┤
│ Improvement: Max Util -23% | Congested Links -6 | 34 Paths Changed       │
├──────────────────────────────────────────────────────────────────────────┤
│ [✓ Apply Changes] [📄 Export] [🔄 Simulate More] [Reset]                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### UI03-02: NetworkHeatmapView Component
**Priority**: P0 (Must Have)
**Effort**: 4 points
**Dependencies**: UI03-01

**Description**:
Network visualization with link utilization as color heatmap.

**Acceptance Criteria**:
- [ ] Links colored by utilization (Green→Yellow→Red)
- [ ] Link thickness proportional to capacity
- [ ] Hover shows utilization percentage
- [ ] Congested links (>80%) pulsing animation
- [ ] Click link to see detailed metrics
- [ ] Legend showing color scale

**Technical Details**:
```typescript
// File: components/NetworkHeatmapView.tsx
interface NetworkHeatmapViewProps {
  nodes: VisNode[];
  edges: VisEdge[];
  utilizationData: Map<string, number>;  // edgeId -> utilization (0-1)
  highlightCongested?: boolean;
  onLinkClick?: (edgeId: string) => void;
}

const UTILIZATION_COLORS = {
  low: '#22c55e',      // Green: <50%
  medium: '#eab308',   // Yellow: 50-80%
  high: '#f97316',     // Orange: 80-90%
  critical: '#ef4444'  // Red: >90%
};
```

**Color Scale**:
```
0%───────50%───────80%───────90%───────100%
🟢 Green  🟡 Yellow  🟠 Orange  🔴 Red
```

---

### UI03-03: GoalSelectionPanel Component
**Priority**: P0 (Must Have)
**Effort**: 2 points
**Dependencies**: UI03-01

**Description**:
Radio button group for selecting optimization goal.

**Acceptance Criteria**:
- [ ] Four preset goals + custom option
- [ ] Goal description tooltip
- [ ] Visual indicator of selected goal
- [ ] Custom goal formula input (advanced)

**UI Design**:
```
┌────────────────────────────────────────────┐
│ Optimization Goal                          │
│                                            │
│ ● Balance Traffic                          │
│   Minimize maximum link utilization        │
│                                            │
│ ○ Minimize Latency                         │
│   Prefer lower-hop-count paths             │
│                                            │
│ ○ Maximize Diversity                       │
│   Spread traffic across countries          │
│                                            │
│ ○ Minimize Cost                            │
│   Use lowest-cost paths                    │
│                                            │
│ ○ Custom [Define...]                       │
└────────────────────────────────────────────┘
```

---

### UI03-04: ConstraintsPanel Component
**Priority**: P1 (Should Have)
**Effort**: 2 points
**Dependencies**: UI03-01

**Description**:
Configure optimization constraints.

**Acceptance Criteria**:
- [ ] Max cost change slider (±10% to ±100%)
- [ ] Max changes count input (1-50)
- [ ] Protected links multi-select
- [ ] Constraints summary display

**Technical Details**:
```typescript
// File: components/ConstraintsPanel.tsx
interface OptimizationConstraints {
  maxCostChangePercent: number;  // 10-100
  maxChangesCount: number;       // 1-50
  protectedEdges: string[];      // Edge IDs that cannot be changed
  minCost: number;               // OSPF min (default: 1)
  maxCost: number;               // OSPF max (default: 65535)
}
```

---

### UI03-05: OptimizationProgressIndicator Component
**Priority**: P0 (Must Have)
**Effort**: 2 points
**Dependencies**: UI03-01

**Description**:
Progress bar showing optimization algorithm status.

**Acceptance Criteria**:
- [ ] Progress percentage display
- [ ] Current iteration count
- [ ] Estimated time remaining
- [ ] Cancel button
- [ ] "Best found so far" indicator

**UI Design**:
```
┌────────────────────────────────────────────┐
│ Optimization Progress                      │
│                                            │
│ ████████████░░░░░░░░ 60%                   │
│                                            │
│ Iteration: 60/100                          │
│ Best improvement so far: 18%               │
│ Time remaining: ~8s                        │
│                                            │
│ [Cancel]                                   │
└────────────────────────────────────────────┘
```

---

### UI03-06: RecommendedChangesPanel Component
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: UI03-01

**Description**:
Display list of recommended cost changes with impact details.

**Acceptance Criteria**:
- [ ] Sortable table of changes
- [ ] Columns: Link | Current Cost | New Cost | Change % | Impact
- [ ] Toggle individual changes on/off
- [ ] Impact preview per change
- [ ] Total impact summary

**UI Design**:
```
┌──────────────────────────────────────────────────────────────────┐
│ Recommended Changes (7)                              [Select All] │
├───┬──────────────────────┬─────────┬─────────┬────────┬──────────┤
│ ✓ │ Link                 │ Current │ New     │ Change │ Impact   │
├───┼──────────────────────┼─────────┼─────────┼────────┼──────────┤
│ ☑ │ GBR-R9 → DEU-R10    │ 10      │ 8       │ -20%   │ 12 flows │
│ ☑ │ DEU-R10 → ZAF-R1    │ 20      │ 25      │ +25%   │ 5 flows  │
│ ☑ │ USA-R5 → USA-R6     │ 5       │ 3       │ -40%   │ 8 flows  │
│ ☐ │ FRA-R7 → ZAF-R1     │ 15      │ 18      │ +20%   │ 3 flows  │
└───┴──────────────────────┴─────────┴─────────┴────────┴──────────┘
│                                                                  │
│ Summary: Applying 3 of 7 changes                                 │
│ Expected improvement: 18% (vs 23% with all)                      │
└──────────────────────────────────────────────────────────────────┘
```

---

### UI03-07: ComparisonMetricsBar Component
**Priority**: P1 (Should Have)
**Effort**: 2 points
**Dependencies**: UI03-02

**Description**:
Horizontal bar showing before/after metrics comparison.

**Acceptance Criteria**:
- [ ] Four key metrics displayed
- [ ] Before → After with delta
- [ ] Color coding for improvement (green) / regression (red)
- [ ] Animated transition on update

**UI Design**:
```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│ Max Utilization│ Avg Utilization│ Congested Links│ Paths Changed  │
│ 95% → 72%      │ 45% → 52%      │ 8 → 2          │ 34             │
│ ▼ -23% 🟢      │ ▲ +7% 🟢       │ ▼ -6 🟢        │                │
└────────────────┴────────────────┴────────────────┴────────────────┘
```

---

### UI03-08: CongestionDetailsPanel Component
**Priority**: P1 (Should Have)
**Effort**: 2 points
**Dependencies**: UI03-02

**Description**:
Detailed view of congested links with flow breakdown.

**Acceptance Criteria**:
- [ ] List top 10 congested links
- [ ] Each link shows: utilization, capacity, flows using it
- [ ] Click to highlight on network
- [ ] Root cause analysis text

**UI Design**:
```
┌────────────────────────────────────────────────────┐
│ Congestion Hotspots                                │
├────────────────────────────────────────────────────┤
│ 1. GBR-R9 → DEU-R10       95% (9.5/10 Gbps)       │
│    └─ 47 flows traverse this link                 │
│    └─ Root cause: All GBR→ZAF traffic funnels here│
│                                                    │
│ 2. DEU-R10 → ZAF-R1        88% (8.8/10 Gbps)      │
│    └─ 32 flows traverse this link                 │
│                                                    │
│ 3. USA-R5 → USA-R6         82% (820/1000 Mbps)    │
│    └─ 18 flows traverse this link                 │
└────────────────────────────────────────────────────┘
```

---

### UI03-09: BeforeAfterFlowAnimation Component
**Priority**: P2 (Nice to Have)
**Effort**: 3 points
**Dependencies**: UI03-02

**Description**:
Animated visualization showing traffic flow changes.

**Acceptance Criteria**:
- [ ] "Play" button triggers animation
- [ ] Flows animate from old paths to new paths
- [ ] Flow thickness = bandwidth
- [ ] Red flows (leaving) → Green flows (arriving)
- [ ] Speed control

---

### UI03-10: TrafficMatrixEditor Component
**Priority**: P2 (Nice to Have)
**Effort**: 3 points
**Dependencies**: UI03-01

**Description**:
Manual traffic matrix input for custom scenarios.

**Acceptance Criteria**:
- [ ] Grid showing source→dest traffic
- [ ] Editable cells
- [ ] Import from CSV
- [ ] Use synthetic (auto-generate) option
- [ ] Save custom matrices

---

### UI03-11: ApplyChangesConfirmation Component
**Priority**: P1 (Should Have)
**Effort**: 1 point
**Dependencies**: UI03-06

**Description**:
Confirmation dialog before applying cost changes.

**Acceptance Criteria**:
- [ ] Summary of changes to apply
- [ ] Warning for high-impact changes
- [ ] "Apply" and "Cancel" buttons
- [ ] Copy CLI commands option

---

## UI Task Summary Table

| Task ID | Task Name | Priority | Effort | Dependencies |
|---------|-----------|----------|--------|--------------|
| UI03-01 | TrafficEngineeringModal Shell | P0 | 3 pts | None |
| UI03-02 | NetworkHeatmapView | P0 | 4 pts | UI03-01 |
| UI03-03 | GoalSelectionPanel | P0 | 2 pts | UI03-01 |
| UI03-04 | ConstraintsPanel | P1 | 2 pts | UI03-01 |
| UI03-05 | OptimizationProgressIndicator | P0 | 2 pts | UI03-01 |
| UI03-06 | RecommendedChangesPanel | P0 | 3 pts | UI03-01 |
| UI03-07 | ComparisonMetricsBar | P1 | 2 pts | UI03-02 |
| UI03-08 | CongestionDetailsPanel | P1 | 2 pts | UI03-02 |
| UI03-09 | BeforeAfterFlowAnimation | P2 | 3 pts | UI03-02 |
| UI03-10 | TrafficMatrixEditor | P2 | 3 pts | UI03-01 |
| UI03-11 | ApplyChangesConfirmation | P1 | 1 pt | UI03-06 |

**Total UI Effort**: 27 story points

---

**Document Status**: APPROVED FOR IMPLEMENTATION
**UI Lead Approval**: ___________
**Date**: ___________
