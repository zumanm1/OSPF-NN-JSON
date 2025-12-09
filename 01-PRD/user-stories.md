# User Stories: Path Comparison & ECMP Explorer

## Epic: Multi-Path Analysis & Comparison

### Story 1: Basic Path Comparison
**ID**: PC-001  
**Priority**: P0 (Must Have)  
**Effort**: 3 points  

**User Story**:  
As a network engineer, I want to compare two different paths side-by-side so that I can understand routing trade-offs.

**Acceptance Criteria**:
- [ ] Can select Path A (source1 → dest1)
- [ ] Can select Path B (source2 → dest2)
- [ ] Both paths highlighted in different colors on network diagram
- [ ] Metrics table shows comparison (hop count, cost, latency)
- [ ] Paths remain highlighted until "Clear" is clicked

**Test Scenarios**:
1. Select GBR-R9 → ZAF-R1, then select GBR-R9 → LSO-R1
2. Verify both paths visible simultaneously
3. Verify metrics table populates correctly

---

### Story 2: Four-Way Path Comparison
**ID**: PC-002  
**Priority**: P1 (Should Have)  
**Effort**: 2 points  

**User Story**:  
As a capacity planner, I want to compare up to 4 paths simultaneously so that I can evaluate all routing options at once.

**Acceptance Criteria**:
- [ ] Can add up to 4 different paths
- [ ] Each path has unique color (Path1=blue, Path2=green, Path3=orange, Path4=purple)
- [ ] Metrics table shows all 4 paths in columns
- [ ] Can remove individual paths without affecting others

---

### Story 3: ECMP Auto-Discovery
**ID**: PC-003  
**Priority**: P0 (Must Have)  
**Effort**: 5 points  

**User Story**:  
As a network engineer, I want the system to automatically detect all equal-cost paths so that I don't have to manually find them.

**Acceptance Criteria**:
- [ ] Click "Analyze ECMP" button for any source/destination pair
- [ ] System identifies ALL paths with same total cost
- [ ] Badge shows "X ECMP paths found"
- [ ] All ECMP paths are highlighted automatically
- [ ] Message if no ECMP exists: "Single path - no ECMP"

**Test Scenarios**:
1. Analyze path with known ECMP (e.g., ZWE-R1 → ZAF-R1)
2. Verify all 3 equal-cost paths are detected
3. Verify costs are identical

---

### Story 4: ECMP Tree Visualization
**ID**: PC-004  
**Priority**: P1 (Should Have)  
**Effort**: 8 points  

**User Story**:  
As a network architect, I want to see a tree diagram showing where ECMP paths diverge and converge so that I can understand load balancing behavior.

**Acceptance Criteria**:
- [ ] Tree diagram displays in sidebar panel
- [ ] Nodes represent routers (circles)
- [ ] Edges represent links with load % (e.g., "33%")
- [ ] Divergence points highlighted in yellow
- [ ] Convergence points highlighted in green
- [ ] Clicking node in tree highlights it on main network

**Mockup Reference**: See `mockups/ecmp-tree-diagram.png`

---

### Story 5: Path Metrics Comparison Table
**ID**: PC-005  
**Priority**: P0 (Must Have)  
**Effort**: 3 points  

**User Story**:  
As a network engineer, I want to see a table comparing key metrics of all selected paths so that I can make data-driven routing decisions.

**Acceptance Criteria**:
- [ ] Table shows: Hop Count, Total Cost, Latency, Min Bandwidth, Shared Links, Countries
- [ ] Each column is sortable (ascending/descending)
- [ ] Best value in each metric highlighted in green
- [ ] Worst value highlighted in red
- [ ] Table updates dynamically as paths are added/removed

**Metrics Definitions**:
- **Hop Count**: Number of router hops (path.length - 1)
- **Total Cost**: Sum of all link costs in path
- **Latency**: Estimated based on hop count × 1ms + link propagation
- **Min Bandwidth**: Lowest capacity link in path (bottleneck)
- **Shared Links**: Count of links common with other displayed paths
- **Countries**: List of countries traversed (e.g., "GBR→DEU→ZAF")

---

### Story 6: Load Balancing Distribution
**ID**: PC-006  
**Priority**: P1 (Should Have)  
**Effort**: 3 points  

**User Story**:  
As a capacity planner, I want to see how traffic would be distributed across ECMP paths so that I can forecast link utilization.

**Acceptance Criteria**:
- [ ] For ECMP paths, show distribution percentage (e.g., "33% / 33% / 33%")
- [ ] Distribution assumes equal split (can be enhanced later for weighted)
- [ ] Show per-path capacity: "Path 1: 10Gbps (33% = 3.3Gbps)"
- [ ] Highlight if any path capacity < average traffic

---

### Story 7: What-If Link Failure
**ID**: PC-007  
**Priority**: P1 (Should Have)  
**Effort**: 5 points  

**User Story**:  
As a network engineer, I want to simulate a link failure and see alternate paths so that I can validate redundancy.

**Acceptance Criteria**:
- [ ] Can click any link and select "Simulate Failure"
- [ ] System recalculates paths excluding failed link
- [ ] Before/After comparison shown side-by-side
- [ ] Affected paths highlighted in red
- [ ] New alternate paths highlighted in green
- [ ] Message: "X paths affected, Y alternate paths available"

**Test Scenarios**:
1. Select GBR-R9 → ZAF-R1 path
2. Fail critical link (e.g., GBR-DEU)
3. Verify alternate path calculated
4. Verify metrics updated

---

### Story 8: What-If Cost Adjustment
**ID**: PC-008  
**Priority**: P2 (Nice to Have)  
**Effort**: 3 points  

**User Story**:  
As a network engineer, I want to preview how changing a link cost affects path selection so that I can plan OSPF cost tuning.

**Acceptance Criteria**:
- [ ] Can select link and enter new cost
- [ ] System shows "Current Path" vs "Proposed Path"
- [ ] Highlights which links would be used in proposed path
- [ ] Shows cost delta: "Cost increases from 30 to 35 (+5)"
- [ ] Can revert without applying

---

### Story 9: PDF Export
**ID**: PC-009  
**Priority**: P1 (Should Have)  
**Effort**: 5 points  

**User Story**:  
As a network architect, I want to export path comparison as a PDF report so that I can include it in documentation.

**Acceptance Criteria**:
- [ ] "Export PDF" button generates report in <5 seconds
- [ ] PDF includes:
  - Header with timestamp and network name
  - Network diagram with paths highlighted (screenshot)
  - Metrics comparison table
  - ECMP analysis section (if applicable)
  - Summary paragraph
- [ ] PDF filename: `path-comparison-{date}.pdf`
- [ ] PDF opens automatically after generation

---

### Story 10: CSV Metrics Export
**ID**: PC-010  
**Priority**: P2 (Nice to Have)  
**Effort**: 1 point  

**User Story**:  
As a data analyst, I want to export metrics as CSV so that I can analyze in Excel/Python.

**Acceptance Criteria**:
- [ ] "Export CSV" button downloads file immediately
- [ ] CSV contains all metrics columns
- [ ] One row per path
- [ ] Headers: Path_ID, Source, Destination, Hop_Count, Total_Cost, ...
- [ ] CSV filename: `path-metrics-{date}.csv`

---

### Story 11: Geographic Diversity Analysis
**ID**: PC-011  
**Priority**: P2 (Nice to Have)  
**Effort**: 3 points  

**User Story**:  
As a network architect, I want to see which countries each path traverses so that I can ensure geographic diversity.

**Acceptance Criteria**:
- [ ] Metrics table includes "Countries Traversed" column
- [ ] Shows ordered list: "GBR → DEU → ZAF"
- [ ] Diversity score calculated: more unique countries = higher score
- [ ] Can filter paths by "Must include country X"
- [ ] Can filter paths by "Must avoid country Y"

---

### Story 12: Shared Link Analysis
**ID**: PC-012  
**Priority**: P1 (Should Have)  
**Effort**: 3 points  

**User Story**:  
As a network engineer, I want to see which links are shared across multiple paths so that I can identify common failure points.

**Acceptance Criteria**:
- [ ] Shared links highlighted with dotted outline
- [ ] Tooltip on shared link: "Used by 3 paths"
- [ ] Metrics table shows "Shared Links" count per path
- [ ] Can click path to see which links are unique vs shared

---

## User Personas

### Persona 1: Network Engineer (Primary)
**Name**: Alex Chen  
**Role**: Senior Network Engineer  
**Experience**: 5+ years OSPF/BGP  
**Goals**: 
- Quickly identify optimal paths
- Validate routing decisions
- Troubleshoot routing issues
**Pain Points**:
- Manual path comparison is tedious
- ECMP behavior not visible
- No quick way to validate redundancy

### Persona 2: Network Architect (Secondary)
**Name**: Jordan Martinez  
**Role**: Principal Network Architect  
**Experience**: 10+ years network design  
**Goals**:
- Design resilient multi-path topologies
- Document routing architecture
- Ensure geographic diversity
**Pain Points**:
- Need professional reports for stakeholders
- Lack of tools for "what-if" analysis
- Hard to justify routing decisions without data

### Persona 3: NOC Operator (Tertiary)
**Name**: Sam Patel  
**Role**: NOC Shift Lead  
**Experience**: 2 years operations  
**Goals**:
- Quickly assess impact of link failures
- Validate backup paths exist
- Escalate with data
**Pain Points**:
- Need simple, visual tools
- Time pressure during incidents
- Limited OSPF expertise

---

## Acceptance Test Plan

### Test Suite: Path Comparison

**Test Case 1: Two-Path Comparison**
1. Open app, select Path A: GBR-R9 → ZAF-R1
2. Select Path B: GBR-R9 → LSO-R1
3. Verify both paths highlighted in different colors
4. Verify metrics table shows 2 columns
5. PASS if both paths visible simultaneously

**Test Case 2: ECMP Detection**
1. Select source: ZWE-R1, destination: ZAF-R1
2. Click "Analyze ECMP"
3. Verify badge shows "3 ECMP paths"
4. Verify all 3 paths have identical cost
5. PASS if all equal-cost paths detected

**Test Case 3: Link Failure Simulation**
1. Select path GBR-R9 → DEU-R10 → ZAF-R1
2. Click link GBR-R9→DEU-R10, select "Simulate Failure"
3. Verify alternate path calculated
4. Verify "Before/After" comparison shown
5. PASS if alternate path uses different link

**Test Case 4: PDF Export**
1. Compare 3 paths
2. Click "Export PDF"
3. Verify PDF generated in <5 seconds
4. Verify PDF contains network diagram + table
5. PASS if PDF opens and is readable

---

**Total Story Points**: 46 (approximately 4-5 weeks for 1 developer)

**Priority Breakdown**:
- P0 (Must Have): 5 stories, 14 points
- P1 (Should Have): 7 stories, 26 points
- P2 (Nice to Have): 3 stories, 6 points












