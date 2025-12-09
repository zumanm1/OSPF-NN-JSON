# PRD: Blast Radius Impact Analyzer

**Product**: OSPF Network Visualizer Pro  
**Feature**: Blast Radius Impact Analyzer  
**Version**: 1.0  
**Date**: 2025-11-29  
**Priority**: CRITICAL  

---

## Executive Summary

The **Blast Radius Impact Analyzer** is the flagship feature for understanding the cascading impact of OSPF cost changes across a multi-country MPLS network. When an engineer modifies a single link cost, this tool visualizes the ripple effect across all flows, provides country-level aggregations, calculates risk scores, and delivers actionable recommendations.

This is NOT just an incremental enhancement—it's a paradigm shift from "guess and hope" to "analyze and act with confidence."

---

## Problem Statement

### The Core Challenge
When a network engineer changes a single OSPF link cost:
- **Unknown Scope**: Which flows are affected? 10? 100? 1000?
- **Geographic Impact**: Does this force GBR→ZAF traffic through USA? Regulatory risk!
- **Cascade Effects**: Rerouting may congest other links, creating new problems
- **Reversibility**: If it goes wrong, how do we roll back?
- **Approval Blocker**: Management demands "show me the impact" but tools don't exist

### Real-World Scenario
> *Network Engineer*: "I need to increase cost on GBR-DEU link from 10 to 15."  
> *Manager*: "What's the impact?"  
> *Engineer*: "Uh... I think it affects some flows to Germany..."  
> *Manager*: "How many? Which countries? Cost increase? Can we reverse it?"  
> *Engineer*: "I'll need a few hours to analyze..."  
> 
> **Result**: Change delayed 2-3 days for manual analysis, or worse—deployed blind.

### Business Impact
- **Change Freeze**: Network changes delayed due to fear of unknown impact
- **Suboptimal Routing**: Engineers avoid changes even when beneficial
- **Outages**: Unintended consequences of cost changes cause incidents
- **Compliance Risk**: Regulatory violations (e.g., data routed through wrong country)
- **Time Waste**: 2-4 hours manual analysis per cost change

---

## Solution Overview

A comprehensive **Blast Radius Analyzer** that:
1. **Visualizes Impact**: Concentric circle "blast radius" showing affected areas
2. **Country Aggregations**: Heatmap of impacted country-to-country flows
3. **Detailed Flow Analysis**: Drill-down to specific router-to-router paths
4. **Risk Scoring**: Automated calculation of change risk (LOW/MEDIUM/HIGH/CRITICAL)
5. **Rollback Planning**: Shows exactly how to reverse the change
6. **Professional Reporting**: Executive-ready PDF with diagrams and recommendations

---

## Key Features (Detailed)

### 1. Blast Radius Visualization 💥

**Concept**: Visual representation of impact spreading from changed link outward

**Implementation**:
- **Center**: The changed link glows with pulsing animation
- **Zone 1 (Red)**: Directly affected paths (traverse the changed link)
- **Zone 2 (Orange)**: Indirectly affected (rerouted due to cost change)
- **Zone 3 (Yellow)**: Secondary effects (increased congestion on alternate paths)
- **Unaffected (Gray)**: Paths with no change

**Interactive**:
- Hover over zone to see affected flow count
- Click zone to drill down to specific flows
- Toggle zones on/off for clarity

**Animation**:
- Ripple effect emanating from changed link
- Flows animate shifting from old path to new path
- Congestion level colors update in real-time

**Mockup**:
```
     ┌─────────────────────────────────────┐
     │   Blast Radius: Cost Change Impact  │
     │                                      │
     │         ╔══════════╗                 │
     │      ╔══║  Zone 1  ║══╗              │
     │   ╔══║  ║ 47 flows ║  ║══╗           │
     │   ║     ╚══════════╝     ║           │
     │   ║    [Changed Link]    ║           │
     │   ║      💥 +5 cost       ║           │
     │   ╚═══════════════════════╝           │
     │                                      │
     │   Legend:                            │
     │   🔴 Direct Impact (47 flows)        │
     │   🟠 Rerouted (12 flows)             │
     │   🟡 Congestion Impact (5 links)     │
     └─────────────────────────────────────┘
```

---

### 2. Country-Level Impact Matrix 🌍

**Problem**: Engineers need to see impact at country level, not just router level

**Solution**: Interactive heatmap showing affected flows between country pairs

**Visualization**:
```
Country Flow Impact Matrix
                Destination →
Source ↓     GBR  USA  DEU  FRA  ZAF  LSO  ZWE
┌───────┬──────────────────────────────────────┐
│  GBR  │  -   12↑  5↓   0    18↑  3↑   2↓   │
│  USA  │  8↑   -   2↓   1↓   9↑   1↑   0    │
│  DEU  │  4↓   1↑   -   0    7↑   2↑   1↑   │
│  FRA  │  0    0    0    -   4↑   0    0    │
│  ZAF  │  15↑  7↑  3↓   2↓   -    5↑   3↑   │
│  LSO  │  2↑   1↑   0    0   4↑   -    1↑   │
│  ZWE  │  1↓   0    0    0   2↑   1↑   -    │
└───────┴──────────────────────────────────────┘

Legend:
↑ = Cost increased (red shading)
↓ = Cost decreased (green shading)
Number = Flow count
```

**Interactivity**:
- Click cell (e.g., GBR→ZAF: 18↑) to see list of 18 affected flows
- Hover for summary: "18 flows, avg cost increase +8.5"
- Filter by impact type: Show only "Cost Increased" flows
- Export matrix as CSV for further analysis

**Aggregated Metrics Per Country**:
```
Country Impact Summary:
┌──────────┬─────────┬──────────┬────────────┬───────────┐
│ Country  │ Flows   │ Avg Cost │ Max Impact │ Status    │
│          │ Affected│ Change   │            │           │
├──────────┼─────────┼──────────┼────────────┼───────────┤
│ GBR      │ 47      │ +12%     │ +25%       │ ⚠️ MEDIUM │
│ DEU      │ 23      │ +8%      │ +20%       │ ✅ LOW    │
│ ZAF      │ 61      │ +15%     │ +40%       │ 🔴 HIGH   │
│ USA      │ 18      │ +5%      │ +10%       │ ✅ LOW    │
└──────────┴─────────┴──────────┴────────────┴───────────┘
```

---

### 3. Detailed Path Analysis 🔍

**Drill-Down Capability**: Click any flow to see detailed before/after comparison

**Flow Detail View**:
```
Flow: GBR-R9 → ZAF-R1 (IMPACTED)

BEFORE Change:
┌────────────────────────────────────────────────┐
│ Path: GBR-R9 → DEU-R10 → ZAF-R1                │
│ Cost: 30                                       │
│ Hops: 3                                        │
│ Latency: ~45ms                                 │
│ Countries: GBR → DEU → ZAF                     │
│ Links:                                         │
│   - GBR-R9 → DEU-R10 (cost: 10) ← CHANGED     │
│   - DEU-R10 → ZAF-R1 (cost: 20)               │
└────────────────────────────────────────────────┘

AFTER Change:
┌────────────────────────────────────────────────┐
│ Path: GBR-R9 → FRA-R7 → ZAF-R1                 │
│ Cost: 35 (+5, +17%)                            │
│ Hops: 3 (same)                                 │
│ Latency: ~50ms (+5ms)                          │
│ Countries: GBR → FRA → ZAF (CHANGED)           │
│ Links:                                         │
│   - GBR-R9 → FRA-R7 (cost: 12)                │
│   - FRA-R7 → ZAF-R1 (cost: 23)                │
│                                                │
│ Impact Type: REROUTE + COST INCREASE           │
│ Concern: Now traverses France (regulatory OK?) │
└────────────────────────────────────────────────┘

Actions:
[Visualize Path] [Export Detail] [Flag for Review]
```

**Batch Operations**:
- Select multiple flows and export as CSV
- Flag high-impact flows for manual review
- Group by impact type (REROUTE, COST_INCREASE, LOST_ECMP, etc.)

---

### 4. Blast Radius Impact Score 📊

**Purpose**: Single number (1-100) quantifying change severity

**Scoring Algorithm**:
```typescript
function calculateBlastRadiusScore(
  changes: ImpactResult[],
  nodes: RouterNode[]
): BlastRadiusScore {
  let score = 0;
  
  // Factor 1: Number of affected flows (0-40 points)
  const flowCount = changes.length;
  const totalFlows = nodes.length * (nodes.length - 1);
  const flowScore = Math.min(40, (flowCount / totalFlows) * 100);
  
  // Factor 2: Cost change magnitude (0-30 points)
  const avgCostChange = changes.reduce((sum, c) => 
    sum + Math.abs((c.newCost - c.oldCost) / c.oldCost), 0
  ) / changes.length;
  const costScore = Math.min(30, avgCostChange * 100);
  
  // Factor 3: Country diversity (0-20 points)
  const countriesAffected = new Set(
    changes.flatMap(c => [c.src.country, c.dest.country])
  ).size;
  const diversityScore = Math.min(20, countriesAffected * 3);
  
  // Factor 4: Critical path involvement (0-10 points)
  const criticalPaths = changes.filter(c => 
    c.src.country !== c.dest.country && c.pathChanged
  ).length;
  const criticalScore = Math.min(10, criticalPaths / 5);
  
  score = flowScore + costScore + diversityScore + criticalScore;
  
  return {
    overall: Math.round(score),
    risk: classifyRisk(score),
    breakdown: { flowScore, costScore, diversityScore, criticalScore }
  };
}

function classifyRisk(score: number): RiskLevel {
  if (score < 20) return 'LOW';       // Minor change, localized impact
  if (score < 40) return 'MEDIUM';    // Moderate impact, some rerouting
  if (score < 70) return 'HIGH';      // Significant impact, many flows affected
  return 'CRITICAL';                  // Major change, network-wide impact
}
```

**Risk Classification**:

| Score | Risk Level | Meaning | Recommendation |
|-------|------------|---------|----------------|
| 1-19  | 🟢 LOW | <5% flows affected, minimal cost change | Safe to proceed |
| 20-39 | 🟡 MEDIUM | 5-15% flows affected, moderate rerouting | Review before applying |
| 40-69 | 🟠 HIGH | 15-30% flows affected, significant impact | Stakeholder approval required |
| 70-100| 🔴 CRITICAL | >30% flows affected, major network change | Executive approval + maintenance window |

**Visual Gauge**:
```
Blast Radius Score: 67 / 100

Risk Level: HIGH 🟠

┌─────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓░░░  │
│ ←LOW    MEDIUM    HIGH    CRITICAL→         │
└─────────────────────────────────────────────┘

Breakdown:
- Flow Impact:     32/40 points (80% of flows)
- Cost Magnitude:  18/30 points (avg +15%)
- Country Diversity: 15/20 points (5 countries)
- Critical Paths:   2/10 points (few critical)

Recommendation: REVIEW REQUIRED
⚠️ This change affects 67 flows across 5 countries.
   Recommend scheduling during maintenance window.
```

---

### 5. Recommendation Engine 🤖

**Purpose**: Provide actionable guidance based on analysis

**Recommendations Generated**:

1. **Proceed / Caution / Abort**
   - **PROCEED**: Low risk, no concerns detected
   - **CAUTION**: Medium risk, review recommended flows
   - **ABORT**: Critical risk or constraint violation detected

2. **Specific Concerns**:
   - ⚠️ "5 flows now traverse USA (regulatory concern for EU data)"
   - ⚠️ "Link DEU-ZAF now at 95% utilization (congestion risk)"
   - ⚠️ "12 flows lost ECMP redundancy"
   - ⚠️ "Asymmetric routing introduced (OK for OSPF, but note)"

3. **Optimization Suggestions**:
   - 💡 "Consider also reducing FRA-ZAF cost to balance traffic"
   - 💡 "3 alternate paths available if this causes issues"
   - 💡 "Schedule during low-traffic window (2-6 AM UTC)"

4. **Rollback Instructions**:
   - 🔄 "To reverse: Set GBR-DEU cost back to 10"
   - 🔄 "Estimated recovery time: 30 seconds (SPF convergence)"
   - 🔄 "67 flows will revert to original paths"

**Example Output**:
```
┌──────────────────────────────────────────────────────────┐
│ RECOMMENDATION: PROCEED WITH CAUTION                      │
│                                                           │
│ ✅ SAFE TO APPLY:                                         │
│   - No path breaks detected                              │
│   - All flows remain reachable                           │
│   - Cost change within safe range (+50%)                 │
│                                                           │
│ ⚠️ CONCERNS:                                              │
│   1. 67 flows affected (36% of network)                  │
│   2. 12 flows now route via France (review data policy?) │
│   3. DEU-ZAF link utilization: 78% → 92% (near capacity) │
│                                                           │
│ 💡 SUGGESTIONS:                                           │
│   - Apply during maintenance window (Sat 2-4 AM)         │
│   - Monitor DEU-ZAF link post-change                     │
│   - Have rollback ready (documented below)               │
│                                                           │
│ 🔄 ROLLBACK PLAN:                                         │
│   IF issues occur:                                       │
│   1. Set GBR-DEU cost back to 10                         │
│   2. Wait 30s for SPF convergence                        │
│   3. Verify 67 flows revert to original paths            │
│                                                           │
│ [APPLY CHANGE] [EXPORT REPORT] [RUN MORE SIMULATIONS]    │
└──────────────────────────────────────────────────────────┘
```

---

### 6. Executive-Ready PDF Report 📄

**Purpose**: Document for change approval and audit trail

**Report Structure**:

**Page 1: Executive Summary**
- Change description: "Increase GBR-DEU cost 10→15"
- Blast Radius Score: 67/100 (HIGH risk)
- Key metrics: 67 flows affected, avg cost +12%
- Recommendation: PROCEED WITH CAUTION
- Approval section: _____________ (signature line)

**Page 2: Visual Impact Diagram**
- Network topology with blast radius visualization
- Color-coded affected paths
- Legend and annotations

**Page 3: Country Impact Matrix**
- Heatmap table of affected country pairs
- Country-level aggregated metrics

**Page 4: Detailed Flow List**
- Table of all affected flows:
  - Source → Destination
  - Old path → New path
  - Old cost → New cost
  - Impact type
  - Risk flag

**Page 5: Risk Analysis**
- Score breakdown
- Identified concerns
- Recommendations
- Rollback procedures

**Page 6: Appendix**
- Timestamp of analysis
- Network state snapshot (node/link counts)
- Tool version
- Contact: [email]

**Export Options**:
- PDF (for approvals)
- CSV (for detailed analysis)
- JSON (for automation/API integration)

---

## User Stories

### US-1: Visualize Blast Radius
**As a** network engineer  
**I want to** see a blast radius visualization  
**So that** I understand the scope of my cost change

**Acceptance Criteria**:
- Concentric circles show impact zones
- Animation shows ripple effect
- Can toggle zones on/off
- Affected flow counts displayed

### US-2: Country-Level Impact Analysis
**As a** network architect  
**I want to** see which country pairs are affected  
**So that** I can assess regulatory compliance

**Acceptance Criteria**:
- Heatmap shows country-to-country flows
- Click cell to drill down to specific flows
- Color intensity = impact severity
- Export matrix as CSV

### US-3: Blast Radius Score Calculation
**As a** network manager  
**I want to** see a single risk score  
**So that** I can quickly assess change severity

**Acceptance Criteria**:
- Score displayed as gauge (1-100)
- Risk level: LOW/MEDIUM/HIGH/CRITICAL
- Score breakdown shown
- Recommendation provided

### US-4: Rollback Planning
**As a** NOC operator  
**I want to** know how to reverse a change  
**So that** I can quickly recover if issues occur

**Acceptance Criteria**:
- Rollback instructions displayed
- Shows exact cost to revert to
- Estimates recovery time
- Lists flows that will revert

### US-5: Executive PDF Report
**As a** network director  
**I want to** export a professional report  
**So that** I can get change approval from management

**Acceptance Criteria**:
- PDF generated in <10 seconds
- Includes all 6 pages (summary, diagram, matrix, details, analysis, appendix)
- Professional formatting
- Signature line for approval

---

## Technical Approach

### Architecture
```
Components/
├── BlastRadiusAnalyzer.tsx           (Main container)
├── BlastRadiusVisualization.tsx      (Concentric circles, animation)
├── CountryImpactMatrix.tsx           (Heatmap table)
├── FlowDetailPanel.tsx               (Drill-down to specific flows)
├── RiskScoreGauge.tsx                (Score visualization)
├── RecommendationPanel.tsx           (Recommendations display)
└── BlastRadiusExporter.tsx           (PDF/CSV export)

Services/
├── blastRadiusCalculation.ts         (Core analysis logic)
├── riskScoring.ts                    (Score algorithm)
├── countryAggregation.ts             (Country-level rollups)
├── recommendationEngine.ts           (Generate recommendations)
└── reportGenerator.ts                (PDF generation)

Hooks/
├── useBlastRadiusAnalysis.ts         (State management)
└── useRiskAssessment.ts              (Risk calculation)
```

### Performance Optimization

**Challenge**: Analyzing all N×(N-1) router pairs is expensive

**Current Performance** (from `handleSimulateImpact`):
- 182 nodes → 32,942 router pairs
- ~3-5 seconds for full analysis

**Optimization Strategy**:
1. **Web Worker**: Move calculation off main thread ✅ (already implemented)
2. **Progressive Rendering**: Show results as they calculate
3. **Caching**: Cache path calculations for repeated simulations
4. **Incremental Analysis**: Only re-calculate affected paths

**Enhanced Implementation**:
```typescript
// Use Web Worker for non-blocking calculation
const worker = new Worker('workers/impactAnalysis.worker.ts');

worker.postMessage({
  type: 'CALCULATE_BLAST_RADIUS',
  payload: { nodes, currentEdges, modifiedEdges, changedLinkId }
});

worker.onmessage = (e) => {
  if (e.data.type === 'PROGRESS') {
    setAnalysisProgress(e.data.payload.percent);
  } else if (e.data.type === 'COMPLETE') {
    const { changes, score, recommendations } = e.data.payload;
    setBlastRadiusData({ changes, score, recommendations });
    setShowBlastRadiusModal(true);
  }
};
```

### Country Aggregation Logic
```typescript
function aggregateByCountry(
  changes: ImpactResult[]
): CountryFlowAggregation[] {
  const countryPairs = new Map<string, ImpactResult[]>();
  
  changes.forEach(change => {
    const key = `${change.src.country}→${change.dest.country}`;
    if (!countryPairs.has(key)) countryPairs.set(key, []);
    countryPairs.get(key)!.push(change);
  });
  
  return Array.from(countryPairs.entries()).map(([key, flows]) => {
    const [srcCountry, destCountry] = key.split('→');
    
    return {
      srcCountry,
      destCountry,
      flowCount: flows.length,
      avgCostChange: flows.reduce((sum, f) => 
        sum + (f.newCost - f.oldCost), 0
      ) / flows.length,
      maxCostChange: Math.max(...flows.map(f => f.newCost - f.oldCost)),
      pathMigrations: flows.filter(f => f.pathChanged).length,
      costIncreases: flows.filter(f => f.newCost > f.oldCost).length,
      costDecreases: flows.filter(f => f.newCost < f.oldCost).length
    };
  });
}
```

---

## Integration with Existing Features

**Extends Current Impact Analysis**:
- Builds on existing `handleSimulateImpact` function
- Adds country aggregation layer
- Enhances with risk scoring
- Improves visualization

**Minimal Code Changes**:
- Keep existing impact analysis
- Add new components for blast radius
- Integrate country aggregation
- No breaking changes

---

## Dependencies

**Internal**:
- `services/dijkstra.ts` - Path calculation
- `constants.ts` - Country data
- Existing impact analysis modal

**External**:
- `jspdf` (already used)
- `jspdf-autotable` (already used)
- **No new dependencies**

---

## Success Metrics

### Quantitative
- **Adoption**: 80% of cost changes use blast radius analysis
- **Time Savings**: Reduce change analysis from 2 hours to 5 minutes (96% reduction)
- **Confidence**: 90% of engineers "feel confident" after using tool
- **Incidents**: 40% reduction in routing-related incidents post-deployment

### Qualitative
- **Manager Approval**: Changes approved faster with professional reports
- **Risk Awareness**: Engineers catch issues before deployment
- **Documentation**: Audit trail for all network changes
- **Knowledge Transfer**: Junior engineers learn from detailed analysis

### Business Impact
- **Revenue Protection**: Prevent outages that cost $5,600/minute
- **Compliance**: Meet regulatory requirements for change management
- **Efficiency**: Free up 10-15 hours/week per engineer
- **Decision Quality**: Data-driven routing decisions

---

## Timeline: 4 weeks (1 developer)

**Week 1**: Risk scoring, country aggregation  
**Week 2**: Blast radius visualization, animation  
**Week 3**: Recommendation engine, rollback planning  
**Week 4**: PDF export, polish, testing  

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance too slow | High | Medium | Use Web Worker, add progress indicator |
| Score algorithm inaccurate | High | Medium | Validate with historical data, add tuning |
| Recommendations too generic | Medium | High | Add context-awareness, improve logic |
| PDF export fails | Low | Low | Fallback to CSV, add error handling |
| Users don't trust score | High | Medium | Show score breakdown, explain reasoning |

---

## Future Enhancements

1. **Machine Learning**: Learn from past changes to improve scoring
2. **Predictive Analysis**: "You're likely to change X next, here's the impact"
3. **Time-Series**: "Show blast radius over last 6 months"
4. **Real-Time Monitoring**: "Alert if deployed change has unexpected impact"
5. **Multi-Change Analysis**: "What if I change 3 costs simultaneously?"
6. **Integration**: Push reports to Slack/Teams, integrate with ITSM tools

---

## Competitive Advantage

**No Other OSPF Tool Offers**:
- ✅ Country-level impact aggregation
- ✅ Automated risk scoring
- ✅ Visual blast radius
- ✅ Recommendation engine
- ✅ Executive-ready reports

**This Feature Alone** could justify switching from competitors.

---

## Approval & Sign-Off

**Approved By**: ___________ (VP Engineering)  
**Date**: ___________  
**Budget**: 4 weeks engineering time  
**Priority**: P0 (Critical for Q1 2026 release)  

---

**Next Steps**:
1. ✅ PRD approval
2. Design mockups (Figma)
3. Technical spike: Risk scoring validation
4. Begin Week 1 development

---

**Status**: READY FOR IMPLEMENTATION













