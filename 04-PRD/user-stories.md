# User Stories: Blast Radius Impact Analyzer

## Epic: Comprehensive Impact Analysis

### Story 1: Blast Radius Visualization
**ID**: BRA-001  
**Priority**: P0 (Must Have)  
**Effort**: 8 points  

**User Story**:  
As a network engineer, I want to see a visual blast radius of my cost change so that I understand the scope of impact at a glance.

**Acceptance Criteria**:
- [ ] Concentric circles show impact zones (direct, indirect, secondary)
- [ ] Animated ripple effect from changed link
- [ ] Color-coded zones (red=direct, orange=indirect, yellow=secondary)
- [ ] Hover shows affected flow count per zone
- [ ] Can toggle zones on/off

**Test Scenario**:
1. Increase GBR-DEU cost from 10 to 15
2. Click "Analyze Blast Radius"
3. Verify visualization shows 3 zones
4. Verify animation plays smoothly
5. Hover Zone 1, verify shows "47 flows affected"

---

### Story 2: Country Impact Matrix
**ID**: BRA-002  
**Priority**: P0 (Must Have)  
**Effort**: 5 points  

**User Story**:  
As a network architect, I want to see which country pairs are affected so that I can assess regulatory compliance.

**Acceptance Criteria**:
- [ ] Heatmap table shows all country pairs
- [ ] Color intensity reflects impact severity
- [ ] Each cell shows: flow count + cost change direction (↑↓)
- [ ] Click cell to drill down to specific flows
- [ ] Export matrix as CSV

**Test Scenario**:
1. After blast radius analysis, view Country Impact Matrix
2. Verify GBR→ZAF cell shows "18↑" (18 flows, cost increased)
3. Click cell, verify detailed flow list appears
4. Export CSV, verify contains all country pairs

---

### Story 3: Risk Score Calculation
**ID**: BRA-003  
**Priority**: P0 (Must Have)  
**Effort**: 5 points  

**User Story**:  
As a network manager, I want to see a blast radius risk score so that I can quickly determine if this change needs executive approval.

**Acceptance Criteria**:
- [ ] Score displayed as gauge (1-100)
- [ ] Risk level shown: LOW/MEDIUM/HIGH/CRITICAL with color
- [ ] Score breakdown: Flow Impact, Cost Magnitude, Diversity, Critical Paths
- [ ] Each breakdown component explained
- [ ] Visual gauge updates based on simulation

**Risk Thresholds**:
- 1-19: LOW (green)
- 20-39: MEDIUM (yellow)
- 40-69: HIGH (orange)
- 70-100: CRITICAL (red)

---

### Story 4: Detailed Flow Drill-Down
**ID**: BRA-004  
**Priority**: P1 (Should Have)  
**Effort**: 3 points  

**User Story**:  
As a network engineer, I want to drill down into specific affected flows so that I can understand before/after routing details.

**Acceptance Criteria**:
- [ ] Can click any flow in list to expand details
- [ ] Shows before path: nodes, cost, latency, countries
- [ ] Shows after path: same metrics
- [ ] Highlights what changed (path, cost, countries)
- [ ] Shows impact type: REROUTE, COST_INCREASE, LOST_ECMP, etc.
- [ ] "Visualize Path" button highlights on network diagram

---

### Story 5: Recommendation Engine
**ID**: BRA-005  
**Priority**: P0 (Must Have)  
**Effort**: 5 points  

**User Story**:  
As a network engineer, I want automated recommendations so that I know whether to proceed, review, or abort.

**Acceptance Criteria**:
- [ ] Displays recommendation: PROCEED / CAUTION / ABORT
- [ ] Lists specific concerns (e.g., "5 flows now traverse USA")
- [ ] Provides optimization suggestions (e.g., "Also adjust FRA-ZAF cost")
- [ ] Shows rollback instructions
- [ ] Links to relevant documentation

**Recommendation Logic**:
- PROCEED: Risk < 20, no concerns
- CAUTION: Risk 20-69, or concerns present
- ABORT: Risk > 70, or critical constraint violation

---

### Story 6: Rollback Planning
**ID**: BRA-006  
**Priority**: P0 (Must Have)  
**Effort**: 3 points  

**User Story**:  
As a NOC operator, I want clear rollback instructions so that I can quickly recover if the change causes issues.

**Acceptance Criteria**:
- [ ] Shows exact cost to revert to
- [ ] Displays estimated SPF convergence time (e.g., "30 seconds")
- [ ] Lists number of flows that will revert
- [ ] "Copy Rollback Command" button
- [ ] Visual timeline of rollback steps

---

### Story 7: Executive PDF Report Export
**ID**: BRA-007  
**Priority**: P1 (Should Have)  
**Effort**: 8 points  

**User Story**:  
As a network director, I want to export a professional PDF report so that I can get change approval from management.

**Acceptance Criteria**:
- [ ] "Export PDF" generates report in <10 seconds
- [ ] PDF includes 6 pages:
  1. Executive Summary
  2. Visual Impact Diagram
  3. Country Impact Matrix
  4. Detailed Flow List
  5. Risk Analysis
  6. Appendix (metadata, contact info)
- [ ] Professional formatting with logo, headers, footers
- [ ] Signature line for approval
- [ ] PDF filename: `blast-radius-{change}-{date}.pdf`

---

### Story 8: Country Aggregation Metrics
**ID**: BRA-008  
**Priority**: P1 (Should Have)  
**Effort**: 3 points  

**User Story**:  
As a capacity planner, I want per-country aggregated metrics so that I can assess regional impact.

**Acceptance Criteria**:
- [ ] Table shows per-country summary:
  - Flows affected
  - Avg cost change %
  - Max impact %
  - Status (LOW/MEDIUM/HIGH/CRITICAL)
- [ ] Sortable by any column
- [ ] Click country to filter flows by that country

---

### Story 9: Multi-Impact Type Filtering
**ID**: BRA-009  
**Priority**: P2 (Nice to Have)  
**Effort**: 2 points  

**User Story**:  
As a network engineer, I want to filter flows by impact type so that I can focus on specific concerns.

**Acceptance Criteria**:
- [ ] Filter dropdown with options:
  - All
  - Cost Increase
  - Cost Decrease
  - Path Rerouted
  - Lost ECMP
  - New ECMP
  - Country Changed
- [ ] Flow list updates based on filter
- [ ] Count badge shows filtered count: "Showing 12 of 67 flows"

---

### Story 10: Blast Radius Animation
**ID**: BRA-010  
**Priority**: P2 (Nice to Have)  
**Effort**: 5 points  

**User Story**:  
As a network engineer, I want to see an animated visualization of traffic rerouting so that I can understand the dynamic impact.

**Acceptance Criteria**:
- [ ] "Play Animation" button starts sequence
- [ ] Changed link pulses/glows
- [ ] Flows animate from old path to new path
- [ ] Link utilization colors update in real-time
- [ ] Animation duration: 5-10 seconds
- [ ] Can pause/resume animation

---

### Story 11: Batch Export (CSV)
**ID**: BRA-011  
**Priority**: P2 (Nice to Have)  
**Effort**: 2 points  

**User Story**:  
As a data analyst, I want to export all affected flows as CSV so that I can analyze in Excel/Python.

**Acceptance Criteria**:
- [ ] "Export CSV" button downloads immediately
- [ ] CSV contains columns:
  - Source, Destination
  - Old_Path, New_Path
  - Old_Cost, New_Cost, Cost_Delta_%
  - Impact_Type
  - Countries_Before, Countries_After
- [ ] One row per affected flow

---

### Story 12: Historical Comparison
**ID**: BRA-012  
**Priority**: P3 (Future)  
**Effort**: 8 points  

**User Story** (Future Enhancement):  
As a network manager, I want to compare current blast radius to past changes so that I can track improvement.

**Acceptance Criteria** (Future):
- [ ] Shows graph of blast radius scores over time
- [ ] Can compare to previous cost changes
- [ ] Trend line: "Network resilience improving"

---

## User Personas

### Persona 1: Network Engineer (Primary)
**Name**: Sarah Thompson  
**Role**: Senior Network Engineer  
**Experience**: 7 years OSPF, MPLS  
**Daily Tasks**: Cost tuning, troubleshooting, capacity planning  
**Goals**:
- Make informed routing decisions
- Avoid causing outages
- Document changes thoroughly

**Pain Points**:
- Can't predict impact of cost changes
- Manual analysis takes hours
- Fear of breaking production

**How This Feature Helps**:
- 5-minute analysis vs 2-hour manual work
- Clear go/no-go recommendation
- Professional reports for documentation

---

### Persona 2: Network Manager (Secondary)
**Name**: David Chen  
**Role**: Network Operations Manager  
**Experience**: 12 years, manages team of 8 engineers  
**Daily Tasks**: Change approvals, capacity planning, vendor management  
**Goals**:
- Ensure network stability
- Meet SLAs
- Justify budget for upgrades

**Pain Points**:
- Can't assess risk of engineer's proposed changes
- Need executive-level reports for stakeholders
- Compliance audits require documentation

**How This Feature Helps**:
- Risk score provides quick assessment
- PDF reports ready for executives
- Audit trail for compliance

---

### Persona 3: NOC Operator (Tertiary)
**Name**: Maria Rodriguez  
**Role**: NOC Shift Lead  
**Experience**: 3 years operations  
**Daily Tasks**: Monitoring, incident response, executing change requests  
**Goals**:
- Execute changes safely
- Quick rollback if issues
- Escalate with clear data

**Pain Points**:
- Limited OSPF expertise
- High pressure during changes
- Need clear rollback procedures

**How This Feature Helps**:
- Simple PROCEED/CAUTION/ABORT guidance
- Step-by-step rollback instructions
- Visualizations easy to understand

---

## Acceptance Test Plan

### Test Suite: Blast Radius Analysis

**Test Case 1: Single Cost Change Analysis**
1. Open app, select link GBR-DEU
2. Change cost from 10 to 15
3. Click "Analyze Blast Radius"
4. Verify visualization displays with zones
5. Verify risk score calculated (expected: ~35-45, MEDIUM)
6. Verify country matrix shows affected pairs
7. PASS if all components render correctly

**Test Case 2: High-Risk Change Detection**
1. Select critical backbone link
2. Increase cost by 200% (e.g., 10 → 30)
3. Run analysis
4. Verify risk score > 70 (CRITICAL)
5. Verify recommendation = ABORT or CAUTION
6. Verify concerns listed (e.g., ">50% flows affected")
7. PASS if correctly flagged as high risk

**Test Case 3: Country Drill-Down**
1. After analysis, view Country Impact Matrix
2. Click cell with flows (e.g., GBR→ZAF: 18↑)
3. Verify detailed flow list appears
4. Click individual flow
5. Verify before/after path shown
6. PASS if drill-down works correctly

**Test Case 4: PDF Export**
1. Complete analysis
2. Click "Export PDF"
3. Verify PDF generated in <10 seconds
4. Open PDF, verify 6 pages present
5. Verify all diagrams, tables, and text readable
6. PASS if PDF is professional-quality

**Test Case 5: Rollback Instructions**
1. After analysis, view rollback section
2. Verify shows original cost value
3. Verify convergence time estimate
4. Click "Copy Rollback Command"
5. Verify command copied to clipboard
6. PASS if instructions are clear and actionable

**Test Case 6: Performance (Large Network)**
1. Load topology with 200+ nodes
2. Run blast radius analysis
3. Verify completes in <10 seconds
4. Verify no UI freeze (Web Worker used)
5. Verify progress indicator updates
6. PASS if performance acceptable

---

## Story Point Summary

| Priority | Stories | Points | Weeks (Est) |
|----------|---------|--------|-------------|
| P0 (Must) | 5 stories | 26 points | 2.5 weeks |
| P1 (Should) | 4 stories | 19 points | 1.5 weeks |
| P2 (Nice) | 3 stories | 9 points | 1 week |
| P3 (Future) | 1 story | 8 points | (deferred) |

**Total (P0-P2)**: 54 story points ≈ **4-5 weeks** for 1 developer

---

## Definition of Done

For this feature to be "done":
- [ ] All P0 stories implemented and tested
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passing
- [ ] Performance validated (<10s for 200-node network)
- [ ] Documentation updated (README, user guide)
- [ ] PDF export working reliably
- [ ] Code reviewed and merged
- [ ] Stakeholder demo completed
- [ ] Deployed to production

---

**Epic Owner**: Network Platform Team  
**Stakeholders**: Engineering, Operations, Management  
**Success Criteria**: 80% adoption within 30 days of release



