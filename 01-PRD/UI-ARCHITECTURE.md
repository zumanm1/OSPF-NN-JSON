# UI Architecture: Path Comparison & ECMP Explorer

**Feature**: Path Comparison & ECMP Explorer
**Version**: 1.0
**Last Updated**: 2025-11-29
**Target Engineer**: UI/Frontend Developer

---

## Overview

This document defines the UI/UX architecture for the Path Comparison & ECMP Explorer feature. It breaks down all frontend tasks for implementation by UI engineers.

---

## UI Component Hierarchy

```
PathComparisonModal (Main Container)
├── PathComparisonHeader
│   ├── Title & Description
│   ├── Close Button
│   └── Tab Navigation [Comparison | ECMP | Scenarios]
│
├── SplitViewContainer
│   ├── NetworkVisualizationPane (60% width)
│   │   ├── vis-network Canvas
│   │   ├── PathHighlightOverlay
│   │   ├── ZoomControls
│   │   └── LegendPanel
│   │
│   └── ControlPane (40% width)
│       ├── PathSelectorPanel
│       │   ├── SourceDropdown
│       │   ├── DestinationDropdown
│       │   ├── AddPathButton
│       │   └── SelectedPathsList
│       │
│       ├── PathMetricsTable
│       │   ├── TableHeader (sortable columns)
│       │   ├── TableBody (path rows)
│       │   └── TableFooter (totals/averages)
│       │
│       ├── ECMPTreeVisualizer (Tab 2)
│       │   ├── TreeCanvas (D3.js)
│       │   ├── DivergenceMarkers
│       │   └── LoadBalancingLabels
│       │
│       └── WhatIfSimulator (Tab 3)
│           ├── FailureSelector
│           ├── CostAdjuster
│           └── BeforeAfterComparison
│
└── ActionBar
    ├── ExportPDFButton
    ├── ExportCSVButton
    ├── SaveScenarioButton
    └── ClearAllButton
```

---

## Task Breakdown: UI Tasks (UI01-xx)

### UI01-01: PathComparisonModal Shell
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: None

**Description**:
Create the main modal container with split-view layout and tab navigation.

**Acceptance Criteria**:
- [ ] Modal overlay with backdrop blur
- [ ] Split view: 60% left (network), 40% right (controls)
- [ ] Tab navigation: Comparison | ECMP Analysis | Scenarios
- [ ] Close button (X) and keyboard escape
- [ ] Responsive design for 1280px+ screens
- [ ] Dark mode support

**Technical Details**:
```typescript
// File: components/PathComparisonModal.tsx
interface PathComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPaths?: PathInfo[];
  nodes: VisNode[];
  edges: VisEdge[];
}
```

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────────────┐
│ [X] Path Comparison & ECMP Explorer                              │
│ ─────────────────────────────────────────────────────────────── │
│ [Comparison] [ECMP Analysis] [Scenarios]                         │
├─────────────────────────────────────┬───────────────────────────┤
│                                     │ Path Selector              │
│      Network Visualization          │ ──────────────             │
│                                     │ Source: [Dropdown]         │
│         (vis-network canvas)        │ Dest:   [Dropdown]         │
│                                     │ [+ Add Path]               │
│                                     │                           │
│                                     │ Metrics Table              │
│                                     │ ───────────────            │
│                                     │ [Table Content]            │
├─────────────────────────────────────┴───────────────────────────┤
│ [Export PDF] [Export CSV] [Save Scenario] [Clear All]           │
└─────────────────────────────────────────────────────────────────┘
```

---

### UI01-02: PathSelectorPanel Component
**Priority**: P0 (Must Have)
**Effort**: 2 points
**Dependencies**: UI01-01

**Description**:
Path selection UI with source/destination dropdowns and path management.

**Acceptance Criteria**:
- [ ] Source dropdown with searchable node list
- [ ] Destination dropdown with searchable node list
- [ ] "Add Path" button (disabled if same src/dest)
- [ ] Selected paths list with color indicator
- [ ] Remove path button per entry
- [ ] Max 4 paths limit with warning

**Technical Details**:
```typescript
// File: components/PathSelectorPanel.tsx
interface PathSelectorPanelProps {
  nodes: VisNode[];
  selectedPaths: PathInfo[];
  onAddPath: (source: string, dest: string) => void;
  onRemovePath: (pathId: string) => void;
  maxPaths?: number; // default: 4
}

// Path colors
const PATH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
```

**UI Elements**:
- Combobox with search filter for 100+ nodes
- Color chip indicators (blue, green, orange, purple)
- Path count badge: "2 of 4 paths"

---

### UI01-03: PathMetricsTable Component
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: UI01-02

**Description**:
Comparison table showing metrics for all selected paths.

**Acceptance Criteria**:
- [ ] Columns: Path Name, Hop Count, Total Cost, Latency, Min BW, Shared Links, Countries
- [ ] Sortable by any column (click header)
- [ ] Best value highlighted in green
- [ ] Worst value highlighted in red
- [ ] Color chip matching path color
- [ ] Hover row highlights path on network
- [ ] Responsive scroll for many metrics

**Technical Details**:
```typescript
// File: components/PathMetricsTable.tsx
interface PathMetricsTableProps {
  paths: PathInfo[];
  sortBy: keyof PathMetrics;
  sortOrder: 'asc' | 'desc';
  onSort: (column: keyof PathMetrics) => void;
  onHighlightPath: (pathId: string | null) => void;
}

// Column definitions
const COLUMNS = [
  { key: 'hopCount', label: 'Hops', format: 'number' },
  { key: 'totalCost', label: 'Cost', format: 'number' },
  { key: 'estimatedLatency', label: 'Latency', format: 'ms' },
  { key: 'minBandwidth', label: 'Min BW', format: 'gbps' },
  { key: 'sharedLinkCount', label: 'Shared', format: 'number' },
  { key: 'countriesTraversed', label: 'Countries', format: 'list' }
];
```

**UI Design**:
```
┌────────┬──────┬──────┬─────────┬────────┬────────┬───────────┐
│ Path   │ Hops │ Cost │ Latency │ Min BW │ Shared │ Countries │
├────────┼──────┼──────┼─────────┼────────┼────────┼───────────┤
│ 🔵 P1  │ 3    │ 30   │ 15ms    │ 10Gbps │ 0      │ GBR→DEU→ZAF│
│ 🟢 P2  │ 4    │ 30   │ 18ms    │ 1Gbps  │ 2      │ GBR→USA→ZAF│
│ 🟠 P3  │ 3    │ 35   │ 16ms    │ 5Gbps  │ 1      │ GBR→FRA→ZAF│
└────────┴──────┴──────┴─────────┴────────┴────────┴───────────┘
         ↑ Best=Green     ↑ Worst=Red
```

---

### UI01-04: NetworkHighlightOverlay
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: UI01-01, UI01-02

**Description**:
Overlay on vis-network canvas showing multiple colored paths simultaneously.

**Acceptance Criteria**:
- [ ] Each path highlighted in distinct color
- [ ] Path line thickness: 4px (normal), 6px (hover)
- [ ] Node markers at path endpoints (source = circle, dest = diamond)
- [ ] Animated flow direction indicators (optional)
- [ ] Toggle individual paths on/off
- [ ] Clear all highlights option

**Technical Details**:
```typescript
// Uses vis-network edge/node highlighting
function highlightPath(pathInfo: PathInfo, color: string) {
  edgesDataSet.update(pathInfo.edgeSequence.map(edgeId => ({
    id: edgeId,
    color: { color },
    width: 4,
    shadow: { enabled: true, color: color, size: 10 }
  })));
}
```

---

### UI01-05: ECMPTreeVisualizer Component
**Priority**: P1 (Should Have)
**Effort**: 8 points
**Dependencies**: UI01-01

**Description**:
Tree diagram showing ECMP path divergence and convergence points.

**Acceptance Criteria**:
- [ ] Tree layout showing path branching
- [ ] Divergence points: yellow circle nodes
- [ ] Convergence points: green circle nodes
- [ ] Edge labels show load balancing %
- [ ] Click node to highlight on main network
- [ ] Zoom/pan controls
- [ ] Legend explaining symbols

**Technical Details**:
```typescript
// File: components/ECMPTreeVisualizer.tsx
// Uses D3.js for tree layout
import * as d3 from 'd3';

interface ECMPTreeVisualizerProps {
  ecmpGroup: ECMPGroup;
  onNodeClick: (nodeId: string) => void;
  onEdgeClick: (edgeId: string) => void;
}

// Tree node structure
interface TreeNode {
  id: string;
  label: string;
  type: 'source' | 'divergence' | 'convergence' | 'intermediate' | 'destination';
  children: TreeNode[];
  loadPercent?: number;
}
```

**Visual Design**:
```
              [GBR-R9]  (Source)
                 │
           ┌─────┼─────┐
           │     │     │
           ▼     ▼     ▼
       [DEU-R10][FRA-R7][USA-R5]  ← Divergence (yellow)
          33%   33%    33%
           │     │     │
           └─────┼─────┘
                 │
                 ▼
             [ZAF-R1]  (Destination) ← Convergence (green)
```

---

### UI01-06: LoadBalancingDistribution Panel
**Priority**: P1 (Should Have)
**Effort**: 2 points
**Dependencies**: UI01-05

**Description**:
Visual display of traffic distribution across ECMP paths.

**Acceptance Criteria**:
- [ ] Pie chart or bar showing distribution (33%/33%/33%)
- [ ] Per-path capacity display
- [ ] Total ECMP capacity sum
- [ ] Warning if any path < average traffic

**Technical Details**:
```typescript
// File: components/LoadBalancingDistribution.tsx
interface LoadBalancingDistributionProps {
  paths: PathInfo[];
  loadDistribution: Map<string, number>; // pathId -> percentage
}
```

---

### UI01-07: WhatIfSimulator Panel
**Priority**: P1 (Should Have)
**Effort**: 5 points
**Dependencies**: UI01-01

**Description**:
Interface for simulating link failures and cost changes.

**Acceptance Criteria**:
- [ ] "Simulate Failure" mode: click links to fail
- [ ] "Adjust Cost" mode: slider or input for new cost
- [ ] Before/After split view
- [ ] Affected paths highlighted in red
- [ ] Alternate paths highlighted in green
- [ ] "Reset" button to clear simulation

**UI Layout**:
```
┌─────────────────────────────────────────────┐
│ What-If Simulator                           │
├─────────────────────────────────────────────┤
│ Mode: [◉ Link Failure] [○ Cost Adjustment]  │
│                                             │
│ Selected Link: GBR-R9 → DEU-R10             │
│ Current Cost: 10                            │
│ New Cost: [─────○───────] 15                │
│                                             │
│ [Apply Simulation] [Reset]                  │
├─────────────────────────────────────────────┤
│ Impact Preview:                             │
│ • 12 paths affected                         │
│ • 8 paths rerouted                          │
│ • 4 paths cost increase only                │
└─────────────────────────────────────────────┘
```

---

### UI01-08: ExportPDFButton Component
**Priority**: P1 (Should Have)
**Effort**: 3 points
**Dependencies**: UI01-03

**Description**:
Generate PDF report of path comparison analysis.

**Acceptance Criteria**:
- [ ] Click triggers PDF generation
- [ ] Loading indicator during generation
- [ ] PDF includes: header, network diagram, metrics table, ECMP section
- [ ] Automatic download on completion
- [ ] Error handling with user feedback

**Technical Details**:
```typescript
// File: components/ExportPDFButton.tsx
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportPDFButtonProps {
  paths: PathInfo[];
  networkElement: HTMLElement;
  disabled?: boolean;
}
```

---

### UI01-09: ExportCSVButton Component
**Priority**: P2 (Nice to Have)
**Effort**: 1 point
**Dependencies**: UI01-03

**Description**:
Export metrics table as CSV file.

**Acceptance Criteria**:
- [ ] Click triggers CSV download
- [ ] All metrics columns included
- [ ] Proper escaping for special characters
- [ ] Filename: `path-metrics-{timestamp}.csv`

---

### UI01-10: PathColorLegend Component
**Priority**: P2 (Nice to Have)
**Effort**: 1 point
**Dependencies**: UI01-04

**Description**:
Legend showing path color mapping.

**Acceptance Criteria**:
- [ ] Compact legend below network view
- [ ] Color chip + path name for each path
- [ ] Collapsible for space savings

---

### UI01-11: PathComparisonTour (Onboarding)
**Priority**: P2 (Nice to Have)
**Effort**: 2 points
**Dependencies**: All UI01-xx

**Description**:
Interactive tour for first-time users.

**Acceptance Criteria**:
- [ ] Step-by-step tooltip guide
- [ ] Highlights key features
- [ ] "Don't show again" option
- [ ] Skip and restart options

---

## State Management

### Custom Hook: usePathComparison
```typescript
// File: hooks/usePathComparison.ts
interface PathComparisonState {
  selectedPaths: PathInfo[];
  ecmpAnalysis: ECMPGroup | null;
  sortBy: keyof PathMetrics;
  sortOrder: 'asc' | 'desc';
  activeTab: 'comparison' | 'ecmp' | 'scenarios';
  highlightedPathId: string | null;
  whatIfState: WhatIfState | null;
}

interface UsePathComparisonReturn {
  state: PathComparisonState;
  actions: {
    addPath: (source: string, dest: string) => void;
    removePath: (pathId: string) => void;
    analyzeECMP: (source: string, dest: string) => void;
    setSort: (column: keyof PathMetrics) => void;
    highlightPath: (pathId: string | null) => void;
    simulateFailure: (edgeId: string) => void;
    simulateCostChange: (edgeId: string, newCost: number) => void;
    resetSimulation: () => void;
    clearAll: () => void;
  };
}
```

---

## UI Task Summary Table

| Task ID | Task Name | Priority | Effort | Dependencies |
|---------|-----------|----------|--------|--------------|
| UI01-01 | PathComparisonModal Shell | P0 | 3 pts | None |
| UI01-02 | PathSelectorPanel | P0 | 2 pts | UI01-01 |
| UI01-03 | PathMetricsTable | P0 | 3 pts | UI01-02 |
| UI01-04 | NetworkHighlightOverlay | P0 | 3 pts | UI01-01, UI01-02 |
| UI01-05 | ECMPTreeVisualizer | P1 | 8 pts | UI01-01 |
| UI01-06 | LoadBalancingDistribution | P1 | 2 pts | UI01-05 |
| UI01-07 | WhatIfSimulator Panel | P1 | 5 pts | UI01-01 |
| UI01-08 | ExportPDFButton | P1 | 3 pts | UI01-03 |
| UI01-09 | ExportCSVButton | P2 | 1 pt | UI01-03 |
| UI01-10 | PathColorLegend | P2 | 1 pt | UI01-04 |
| UI01-11 | PathComparisonTour | P2 | 2 pts | All |

**Total UI Effort**: 33 story points

---

## Design System Guidelines

### Colors (Light Mode)
- Primary: `#3b82f6` (blue-500)
- Success: `#10b981` (green-500)
- Warning: `#f59e0b` (amber-500)
- Error: `#ef4444` (red-500)
- Background: `#ffffff`
- Surface: `#f8fafc` (slate-50)
- Border: `#e2e8f0` (slate-200)

### Colors (Dark Mode)
- Primary: `#60a5fa` (blue-400)
- Success: `#34d399` (green-400)
- Warning: `#fbbf24` (amber-400)
- Error: `#f87171` (red-400)
- Background: `#0f172a` (slate-900)
- Surface: `#1e293b` (slate-800)
- Border: `#334155` (slate-700)

### Path Colors
```typescript
const PATH_COLORS = {
  path1: '#3b82f6', // Blue
  path2: '#10b981', // Green
  path3: '#f59e0b', // Orange
  path4: '#8b5cf6', // Purple
};
```

### Typography
- Headings: `font-semibold`
- Body: `font-normal`
- Mono (metrics): `font-mono`
- Size scale: text-xs, text-sm, text-base, text-lg

### Spacing
- Modal padding: `p-6`
- Section gap: `gap-4`
- Component gap: `gap-2`
- Border radius: `rounded-lg`

---

## Accessibility Requirements

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] Color not sole indicator (icons + color)
- [ ] Screen reader labels for all buttons
- [ ] High contrast mode support
- [ ] Reduced motion preference respected

---

## Performance Requirements

- [ ] Initial render < 200ms
- [ ] Path calculation feedback < 500ms
- [ ] Smooth 60fps animations
- [ ] Lazy load D3.js for tree visualizer
- [ ] Virtualized list for 100+ node dropdowns

---

**Document Status**: APPROVED FOR IMPLEMENTATION
**UI Lead Approval**: ___________
**Date**: ___________
