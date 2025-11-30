# UI Architecture: Failure Impact Simulator & Resilience Analysis

**Feature**: Failure Impact Simulator
**Version**: 1.0
**Last Updated**: 2025-11-29
**Target Engineer**: UI/Frontend Developer

---

## Overview

This document defines the UI/UX architecture for the Failure Impact Simulator feature, enabling interactive network failure testing and resilience analysis.

---

## UI Component Hierarchy

```
FailureSimulatorModal (Main Container)
├── FailureSimulatorHeader
│   ├── Title & Description
│   ├── ResilienceScoreBadge
│   └── Close Button
│
├── MainContent (Split View)
│   ├── NetworkFailurePane (65% width)
│   │   ├── vis-network Canvas
│   │   ├── FailureOverlay (red X markers)
│   │   ├── IsolatedNodeMarkers
│   │   ├── ReroutingAnimations
│   │   └── SelectionModeIndicator
│   │
│   └── ControlPane (35% width)
│       ├── FailureModeSelector
│       │   ├── SingleFailureMode
│       │   ├── MultiFailureMode
│       │   └── CascadeSimulationMode
│       │
│       ├── SelectedFailuresPanel
│       │   ├── FailedElementsList
│       │   ├── ClearSelectionsButton
│       │   └── TotalFailureCount
│       │
│       ├── ImpactMetricsDashboard
│       │   ├── PathsAffectedCard
│       │   ├── ConvergenceTimeCard
│       │   ├── IsolatedNodesCard
│       │   └── NetworkPartitionCard
│       │
│       └── SPOFAnalysisPanel
│           ├── SPOFListTable
│           ├── CriticalityRanking
│           └── RecommendationsPanel
│
├── ResilienceGauge (Fixed Bottom)
│   ├── ScoreDisplay (1-10)
│   ├── ScoreBreakdown
│   └── TrendIndicator
│
└── ActionBar
    ├── RunSimulationButton
    ├── SaveScenarioButton
    ├── LoadScenarioButton
    └── ExportReportButton
```

---

## Task Breakdown: UI Tasks (UI02-xx)

### UI02-01: FailureSimulatorModal Shell
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: None

**Description**:
Create the main modal container with split-view layout and failure mode controls.

**Acceptance Criteria**:
- [ ] Full-screen modal with backdrop
- [ ] Split view: 65% network, 35% controls
- [ ] Failure mode selector (Single | Multi | Cascade)
- [ ] Close button and escape key support
- [ ] Dark mode compatibility

**Technical Details**:
```typescript
// File: components/FailureSimulatorModal.tsx
interface FailureSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: VisNode[];
  edges: VisEdge[];
  onSimulateFailure?: (failedIds: string[]) => void;
}
```

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────────────┐
│ [X] Failure Impact Simulator           Resilience: [7.2/10 🟡] │
├────────────────────────────────────────┬────────────────────────┤
│                                        │ Mode: [●Single ○Multi] │
│      Network Visualization             │                        │
│                                        │ Failed Elements:       │
│         [Click nodes/links to fail]    │ ├─ GBR-R9 → DEU-R10   │
│                                        │ └─ (Click + to add)   │
│           ❌ GBR-R9                     │                        │
│              ╲                         │ Impact Metrics:        │
│               ╲ [X FAILED]             │ ├─ Paths Affected: 47  │
│                ╲                       │ ├─ Convergence: 30s    │
│                 DEU-R10                │ ├─ Isolated: 0 nodes   │
│                                        │ └─ Partitioned: No     │
│                                        │                        │
│                                        │ SPOF Analysis:         │
│                                        │ ├─ 5 SPOFs detected    │
│                                        │ └─ [View Details]      │
├────────────────────────────────────────┴────────────────────────┤
│ [▶ Run Simulation] [💾 Save] [📂 Load] [📄 Export]              │
└─────────────────────────────────────────────────────────────────┘
```

---

### UI02-02: FailureModeSelector Component
**Priority**: P0 (Must Have)
**Effort**: 2 points
**Dependencies**: UI02-01

**Description**:
Radio button group for selecting failure simulation mode.

**Acceptance Criteria**:
- [ ] Three modes: Single Failure | Multi-Failure | Cascade
- [ ] Mode description tooltip on hover
- [ ] Visual indicator of active mode
- [ ] Keyboard navigation support

**Technical Details**:
```typescript
// File: components/FailureModeSelector.tsx
type FailureMode = 'single' | 'multi' | 'cascade';

interface FailureModeSelectorProps {
  mode: FailureMode;
  onChange: (mode: FailureMode) => void;
}

const MODE_DESCRIPTIONS = {
  single: 'Test impact of one element failure',
  multi: 'Test multiple simultaneous failures',
  cascade: 'Test cascading failure scenarios'
};
```

**UI Design**:
```
┌───────────────────────────────────────────────────┐
│ Simulation Mode                                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│ │ ● Single    │ │ ○ Multi     │ │ ○ Cascade   │  │
│ │   Failure   │ │   Failure   │ │   Sim       │  │
│ └─────────────┘ └─────────────┘ └─────────────┘  │
│                                                   │
│ ℹ️ Click any node or link to simulate failure     │
└───────────────────────────────────────────────────┘
```

---

### UI02-03: NetworkFailureOverlay Component
**Priority**: P0 (Must Have)
**Effort**: 4 points
**Dependencies**: UI02-01

**Description**:
Visual overlay on vis-network showing failed elements and impact.

**Acceptance Criteria**:
- [ ] Failed nodes: Red color + X icon overlay
- [ ] Failed links: Red dashed line + X icon
- [ ] Isolated nodes: Yellow warning icon
- [ ] Affected paths: Orange highlighting
- [ ] Rerouted traffic: Animated green arrows
- [ ] Click handler for element selection

**Technical Details**:
```typescript
// Failure visualization using vis-network
function markElementFailed(elementId: string, type: 'node' | 'edge') {
  if (type === 'node') {
    nodesDataSet.update({
      id: elementId,
      color: { background: '#ef4444', border: '#b91c1c' },
      font: { color: '#ffffff' },
      icon: { code: '\uf00d', color: '#ffffff' } // X icon
    });
  } else {
    edgesDataSet.update({
      id: elementId,
      color: { color: '#ef4444' },
      dashes: [10, 10],
      width: 3,
      label: '❌ FAILED'
    });
  }
}

function markNodeIsolated(nodeId: string) {
  nodesDataSet.update({
    id: nodeId,
    color: { background: '#fbbf24', border: '#d97706' },
    icon: { code: '\uf071', color: '#000000' } // Warning icon
  });
}
```

---

### UI02-04: SelectedFailuresPanel Component
**Priority**: P0 (Must Have)
**Effort**: 2 points
**Dependencies**: UI02-03

**Description**:
List of currently selected failed elements with removal capability.

**Acceptance Criteria**:
- [ ] List all selected failures (nodes and links)
- [ ] Icon indicating element type (router vs link)
- [ ] Remove button per element
- [ ] "Clear All" button
- [ ] Count badge: "3 elements selected"

**UI Design**:
```
┌─────────────────────────────────────┐
│ Selected Failures (3)    [Clear All]│
├─────────────────────────────────────┤
│ 🔴 GBR-R9 → DEU-R10 (link)     [×] │
│ 🔴 DEU-R10 (node)              [×] │
│ 🔴 ZAF-R1 → LSO-R1 (link)      [×] │
├─────────────────────────────────────┤
│ Shift+Click to select multiple     │
└─────────────────────────────────────┘
```

---

### UI02-05: ImpactMetricsDashboard Component
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: UI02-03

**Description**:
Real-time metrics display showing failure impact.

**Acceptance Criteria**:
- [ ] Paths Affected: count + percentage
- [ ] Convergence Time: estimated SPF timer
- [ ] Isolated Nodes: count + list on hover
- [ ] Network Partition: Yes/No + island count
- [ ] Real-time updates as failures selected
- [ ] Color coding: green (OK), yellow (warning), red (critical)

**Technical Details**:
```typescript
// File: components/ImpactMetricsDashboard.tsx
interface ImpactMetrics {
  pathsAffected: number;
  totalPaths: number;
  percentAffected: number;
  convergenceTime: number;      // seconds
  isolatedNodes: string[];
  isPartitioned: boolean;
  partitionCount: number;
}

interface ImpactMetricsDashboardProps {
  metrics: ImpactMetrics;
  isLoading: boolean;
}
```

**UI Design**:
```
┌─────────────────────────────────────────────────────┐
│ Impact Analysis                                     │
├──────────────┬──────────────┬──────────────────────┤
│ Paths        │ Convergence  │ Network              │
│ Affected     │ Time         │ Status               │
│              │              │                      │
│   47/182     │    ~30s      │  ✅ Connected        │
│   (26%)      │              │  0 isolated          │
│   🟡 MEDIUM  │   🟢 OK      │  🟢 OK               │
└──────────────┴──────────────┴──────────────────────┘
```

---

### UI02-06: ResilienceGauge Component
**Priority**: P1 (Should Have)
**Effort**: 3 points
**Dependencies**: UI02-05

**Description**:
Visual gauge showing network resilience score (1-10).

**Acceptance Criteria**:
- [ ] Circular or linear gauge display
- [ ] Score: 1-10 with decimal precision
- [ ] Color zones: Red (1-3), Yellow (4-6), Green (7-10)
- [ ] Score breakdown on hover/click
- [ ] Animation on score change
- [ ] Target score indicator (if set)

**Technical Details**:
```typescript
// File: components/ResilienceGauge.tsx
interface ResilienceGaugeProps {
  score: number;                // 1-10
  breakdown?: {
    redundancy: number;
    diversity: number;
    capacity: number;
  };
  targetScore?: number;
  showBreakdown?: boolean;
}
```

**Visual Design**:
```
         RESILIENCE SCORE
              7.2
        ╭──────────────╮
        │    ████████░░ │
        ╰──────────────╯
         1    5    10
         🔴   🟡   🟢

   Breakdown:
   ├─ Redundancy:  8/10
   ├─ Diversity:   6/10
   └─ Capacity:    7/10
```

---

### UI02-07: SPOFAnalysisPanel Component
**Priority**: P1 (Should Have)
**Effort**: 4 points
**Dependencies**: UI02-01

**Description**:
Display single points of failure with criticality ranking.

**Acceptance Criteria**:
- [ ] "Analyze SPOFs" button triggers analysis
- [ ] Sortable table: Element | Type | Impact | Severity
- [ ] Click row to highlight on network
- [ ] Severity badges: LOW | MEDIUM | HIGH | CRITICAL
- [ ] Recommendations for each SPOF
- [ ] Export SPOF list

**Technical Details**:
```typescript
// File: components/SPOFAnalysisPanel.tsx
interface SPOF {
  elementId: string;
  elementType: 'node' | 'edge';
  label: string;
  impact: {
    pathsAffected: number;
    nodesIsolated: number;
    causesPartition: boolean;
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

interface SPOFAnalysisPanelProps {
  spofs: SPOF[];
  isLoading: boolean;
  onAnalyze: () => void;
  onHighlight: (elementId: string) => void;
}
```

**UI Design**:
```
┌────────────────────────────────────────────────────┐
│ Single Points of Failure        [🔄 Analyze SPOFs] │
├────────────────────────────────────────────────────┤
│ # │ Element            │ Impact  │ Severity        │
├───┼────────────────────┼─────────┼─────────────────┤
│ 1 │ GBR-R9 → DEU-R10   │ 47 paths│ 🔴 CRITICAL     │
│ 2 │ DEU-R10            │ 32 paths│ 🟠 HIGH         │
│ 3 │ ZAF-R1 → LSO-R1    │ 18 paths│ 🟡 MEDIUM       │
│ 4 │ USA-R5             │ 12 paths│ 🟡 MEDIUM       │
│ 5 │ FRA-R7 → ZAF-R1    │ 8 paths │ 🟢 LOW          │
├────────────────────────────────────────────────────┤
│ 💡 Recommendation: Add redundant link between      │
│    GBR and DEU to eliminate top SPOF               │
└────────────────────────────────────────────────────┘
```

---

### UI02-08: ScenarioManager Component
**Priority**: P1 (Should Have)
**Effort**: 3 points
**Dependencies**: UI02-04

**Description**:
Save, load, and manage failure test scenarios.

**Acceptance Criteria**:
- [ ] Save current failures as named scenario
- [ ] Load saved scenarios from list
- [ ] Delete scenarios
- [ ] Built-in templates: "Data Center Outage", "ISP Failure", etc.
- [ ] Export/Import scenarios as JSON
- [ ] localStorage persistence

**Technical Details**:
```typescript
// File: components/ScenarioManager.tsx
interface FailureScenario {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  failedElements: string[];
  mode: FailureMode;
}

interface ScenarioManagerProps {
  currentScenario: FailureScenario | null;
  onSave: (name: string, description?: string) => void;
  onLoad: (scenarioId: string) => void;
  onDelete: (scenarioId: string) => void;
  onExport: (scenarioId: string) => void;
  onImport: (json: string) => void;
}
```

**UI Design**:
```
┌───────────────────────────────────────────────────┐
│ Scenarios                                         │
├───────────────────────────────────────────────────┤
│ [Save Current] [Import]                           │
├───────────────────────────────────────────────────┤
│ 📁 My Scenarios                                   │
│   ├─ Core Router Upgrade    [▶ Load] [🗑️]        │
│   ├─ ISP Link Failure       [▶ Load] [🗑️]        │
│   └─ DR Test - Full DC      [▶ Load] [🗑️]        │
│                                                   │
│ 📋 Templates                                      │
│   ├─ Data Center Outage     [▶ Load]             │
│   ├─ Single ISP Failure     [▶ Load]             │
│   └─ Backbone Link Cut      [▶ Load]             │
└───────────────────────────────────────────────────┘
```

---

### UI02-09: ReroutingAnimationOverlay Component
**Priority**: P2 (Nice to Have)
**Effort**: 3 points
**Dependencies**: UI02-03

**Description**:
Animated visualization of traffic rerouting after failure.

**Acceptance Criteria**:
- [ ] Animated particles along rerouted paths
- [ ] Old path fades out (red)
- [ ] New path animates in (green)
- [ ] Speed control (slow/normal/fast)
- [ ] Pause/resume button
- [ ] Toggle animation on/off

---

### UI02-10: FailureTimelineView Component
**Priority**: P2 (Nice to Have)
**Effort**: 2 points
**Dependencies**: UI02-05

**Description**:
Timeline showing sequence of events during failure simulation.

**Acceptance Criteria**:
- [ ] Horizontal timeline
- [ ] Events: Failure detected → SPF calc → Convergence
- [ ] Time markers in seconds
- [ ] Click event to see details
- [ ] Export timeline as image

---

### UI02-11: ExportReportButton Component
**Priority**: P1 (Should Have)
**Effort**: 2 points
**Dependencies**: UI02-05, UI02-07

**Description**:
Generate PDF report of failure impact analysis.

**Acceptance Criteria**:
- [ ] Single-click export
- [ ] Report includes: summary, metrics, SPOF list, recommendations
- [ ] Network diagram with failures highlighted
- [ ] Professional formatting

---

## State Management

### Custom Hook: useFailureSimulation
```typescript
// File: hooks/useFailureSimulation.ts
interface FailureSimulationState {
  mode: FailureMode;
  failedElements: Set<string>;
  metrics: ImpactMetrics | null;
  spofList: SPOF[];
  resilienceScore: number;
  isAnalyzing: boolean;
  savedScenarios: FailureScenario[];
}

interface UseFailureSimulationReturn {
  state: FailureSimulationState;
  actions: {
    setMode: (mode: FailureMode) => void;
    toggleElement: (elementId: string) => void;
    clearSelections: () => void;
    runAnalysis: () => void;
    analyzeSPOFs: () => void;
    saveScenario: (name: string) => void;
    loadScenario: (scenarioId: string) => void;
    exportReport: () => void;
  };
}
```

---

## UI Task Summary Table

| Task ID | Task Name | Priority | Effort | Dependencies |
|---------|-----------|----------|--------|--------------|
| UI02-01 | FailureSimulatorModal Shell | P0 | 3 pts | None |
| UI02-02 | FailureModeSelector | P0 | 2 pts | UI02-01 |
| UI02-03 | NetworkFailureOverlay | P0 | 4 pts | UI02-01 |
| UI02-04 | SelectedFailuresPanel | P0 | 2 pts | UI02-03 |
| UI02-05 | ImpactMetricsDashboard | P0 | 3 pts | UI02-03 |
| UI02-06 | ResilienceGauge | P1 | 3 pts | UI02-05 |
| UI02-07 | SPOFAnalysisPanel | P1 | 4 pts | UI02-01 |
| UI02-08 | ScenarioManager | P1 | 3 pts | UI02-04 |
| UI02-09 | ReroutingAnimationOverlay | P2 | 3 pts | UI02-03 |
| UI02-10 | FailureTimelineView | P2 | 2 pts | UI02-05 |
| UI02-11 | ExportReportButton | P1 | 2 pts | UI02-05, UI02-07 |

**Total UI Effort**: 31 story points

---

## Design System Additions

### Failure Colors
```typescript
const FAILURE_COLORS = {
  failed: '#ef4444',        // red-500
  failedBorder: '#b91c1c',  // red-700
  isolated: '#fbbf24',      // amber-400
  isolatedBorder: '#d97706',// amber-600
  rerouted: '#22c55e',      // green-500
  affected: '#f97316',      // orange-500
};
```

### Severity Badges
```typescript
const SEVERITY_STYLES = {
  LOW: { bg: '#dcfce7', text: '#166534', icon: '🟢' },
  MEDIUM: { bg: '#fef9c3', text: '#854d0e', icon: '🟡' },
  HIGH: { bg: '#ffedd5', text: '#c2410c', icon: '🟠' },
  CRITICAL: { bg: '#fee2e2', text: '#b91c1c', icon: '🔴' }
};
```

### Animation Timings
```typescript
const ANIMATION = {
  failureFade: 300,         // ms
  rerouteAnimation: 2000,   // ms
  gaugeTransition: 500,     // ms
  particleSpeed: 50,        // px/s
};
```

---

**Document Status**: APPROVED FOR IMPLEMENTATION
**UI Lead Approval**: ___________
**Date**: ___________
