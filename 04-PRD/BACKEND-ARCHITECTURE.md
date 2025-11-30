# Backend Architecture: Blast Radius Impact Analyzer

**Feature**: Blast Radius Impact Analyzer
**Version**: 1.0
**Last Updated**: 2025-11-29
**Target Engineer**: Backend/Algorithm Developer

---

## Overview

This document defines the backend architecture for the Blast Radius Impact Analyzer, providing the computational engine for risk scoring, country aggregation, recommendation generation, and report export.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BLAST RADIUS BACKEND                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                    HOOK LAYER                               │     │
│  │  useBlastRadiusAnalysis.ts                                 │     │
│  │  - Orchestrates all calculations                           │     │
│  │  - Manages loading/progress state                          │     │
│  │  - Provides memoized results                              │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                 │
│         ▼                    ▼                    ▼                 │
│  ┌─────────────┐    ┌─────────────┐     ┌─────────────────┐        │
│  │ riskScoring │    │  country    │     │ recommendation  │        │
│  │    .ts      │    │ Aggregation │     │    Engine.ts    │        │
│  │             │    │    .ts      │     │                 │        │
│  │ - Score     │    │ - Group by  │     │ - Analyze risks │        │
│  │   algorithm │    │   country   │     │ - Generate      │        │
│  │ - Risk      │    │ - Calculate │     │   suggestions   │        │
│  │   classify  │    │   metrics   │     │ - Rollback plan │        │
│  └─────────────┘    └─────────────┘     └─────────────────┘        │
│                              │                                       │
│         ┌────────────────────┴────────────────────┐                 │
│         │                                         │                 │
│         ▼                                         ▼                 │
│  ┌─────────────────┐                    ┌─────────────────┐        │
│  │ reportGenerator │                    │  Web Worker     │        │
│  │      .ts        │                    │ (existing)      │        │
│  │                 │                    │                 │        │
│  │ - PDF export    │                    │ - Impact calc   │        │
│  │ - CSV export    │                    │ - Non-blocking  │        │
│  │ - JSON export   │                    │ - Progress      │        │
│  └─────────────────┘                    └─────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Task Breakdown: Backend Tasks (B04-xx)

### B04-01: Risk Scoring Algorithm Service
**Priority**: P0 (Must Have)
**Effort**: 4 points
**Dependencies**: Existing impact analysis

**Description**:
Implement the blast radius score calculation algorithm that quantifies change severity on a 1-100 scale.

**Acceptance Criteria**:
- [ ] Calculate score based on 4 factors: flow impact, cost magnitude, country diversity, critical paths
- [ ] Score correctly distributed 0-100
- [ ] Risk classification: LOW (1-19), MEDIUM (20-39), HIGH (40-69), CRITICAL (70-100)
- [ ] Score breakdown available for each factor
- [ ] Detailed metrics included (total flows, affected %, etc.)
- [ ] Unit tests with >90% coverage

**Technical Details**:
```typescript
// File: services/riskScoring.ts

interface BlastRadiusScore {
  overall: number;                    // 1-100
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  breakdown: {
    flowImpact: number;               // 0-40 points
    costMagnitude: number;            // 0-30 points
    countryDiversity: number;         // 0-20 points
    criticalPaths: number;            // 0-10 points
  };
  details: {
    totalFlows: number;
    affectedFlows: number;
    affectedPercentage: number;
    avgCostChangePct: number;
    countriesAffected: number;
    criticalPathCount: number;
  };
}

/**
 * Calculate blast radius score for OSPF cost change impact
 *
 * Scoring Formula:
 * - Flow Impact (0-40 pts): Percentage of total flows affected
 * - Cost Magnitude (0-30 pts): Average cost change percentage
 * - Country Diversity (0-20 pts): Number of countries affected
 * - Critical Paths (0-10 pts): Intercountry paths that changed routing
 */
export function calculateBlastRadiusScore(
  changes: ImpactResult[],
  allNodes: RouterNode[]
): BlastRadiusScore {
  const totalFlows = allNodes.length * (allNodes.length - 1);
  const affectedFlows = changes.length;
  const affectedPct = affectedFlows / totalFlows;

  // Factor 1: Flow Impact (0-40 points)
  // Scale: 0% affected = 0 pts, 40%+ affected = 40 pts
  const flowImpact = Math.min(40, affectedPct * 100);

  // Factor 2: Cost Magnitude (0-30 points)
  // Scale: 0% change = 0 pts, 30%+ avg change = 30 pts
  const avgCostChangePct = changes.length > 0
    ? changes.reduce((sum, c) => {
        const changePct = Math.abs((c.newCost - c.oldCost) / c.oldCost);
        return sum + changePct;
      }, 0) / changes.length
    : 0;
  const costMagnitude = Math.min(30, avgCostChangePct * 100);

  // Factor 3: Country Diversity (0-20 points)
  // Scale: 1 country = 3 pts, 7+ countries = 20 pts
  const countriesAffected = new Set(
    changes.flatMap(c => [c.src.country, c.dest.country])
  ).size;
  const countryDiversity = Math.min(20, countriesAffected * 3);

  // Factor 4: Critical Paths (0-10 points)
  // Intercountry flows that changed their routing path
  const criticalPathCount = changes.filter(c =>
    c.src.country !== c.dest.country && c.pathChanged
  ).length;
  const criticalPaths = Math.min(10, (criticalPathCount / Math.max(1, changes.length)) * 20);

  const overall = Math.round(flowImpact + costMagnitude + countryDiversity + criticalPaths);
  const risk = classifyRisk(overall);

  return {
    overall,
    risk,
    breakdown: {
      flowImpact: Math.round(flowImpact),
      costMagnitude: Math.round(costMagnitude),
      countryDiversity: Math.round(countryDiversity),
      criticalPaths: Math.round(criticalPaths)
    },
    details: {
      totalFlows,
      affectedFlows,
      affectedPercentage: affectedPct * 100,
      avgCostChangePct: avgCostChangePct * 100,
      countriesAffected,
      criticalPathCount
    }
  };
}

function classifyRisk(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score < 20) return 'LOW';
  if (score < 40) return 'MEDIUM';
  if (score < 70) return 'HIGH';
  return 'CRITICAL';
}
```

**Test Cases**:
```typescript
describe('calculateBlastRadiusScore', () => {
  it('returns LOW risk for <5% flows affected', () => {
    const changes = createMockChanges(5, 200); // 5 of 200 flows
    const score = calculateBlastRadiusScore(changes, mockNodes);
    expect(score.risk).toBe('LOW');
    expect(score.overall).toBeLessThan(20);
  });

  it('returns CRITICAL for >50% flows with high cost change', () => {
    const changes = createMockChanges(150, 200, { avgCostChange: 0.5 });
    const score = calculateBlastRadiusScore(changes, mockNodes);
    expect(score.risk).toBe('CRITICAL');
    expect(score.overall).toBeGreaterThanOrEqual(70);
  });

  it('correctly calculates country diversity score', () => {
    const changes = createChangesAcrossCountries(['GBR', 'USA', 'DEU', 'ZAF', 'FRA']);
    const score = calculateBlastRadiusScore(changes, mockNodes);
    expect(score.breakdown.countryDiversity).toBe(15); // 5 countries * 3
  });
});
```

---

### B04-02: Country Aggregation Service
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: Existing impact analysis

**Description**:
Aggregate impact results by country pairs to enable country-level analysis.

**Acceptance Criteria**:
- [ ] Group flows by source→destination country pairs
- [ ] Calculate per-pair metrics: count, avg change, max change
- [ ] Track path migrations, ECMP changes
- [ ] Support filtering by individual country
- [ ] Sorted by impact severity

**Technical Details**:
```typescript
// File: services/countryAggregation.ts

interface CountryFlowAggregation {
  srcCountry: string;
  destCountry: string;
  flowCount: number;
  avgCostChange: number;              // Average cost delta
  avgCostChangePct: number;           // Average % change
  maxCostChange: number;              // Largest cost delta
  maxCostChangePct: number;           // Largest % change
  pathMigrations: number;             // Flows that changed path
  costIncreases: number;              // Flows with cost increase
  costDecreases: number;              // Flows with cost decrease
  lostECMP: number;                   // Flows that lost ECMP
  newECMP: number;                    // Flows that gained ECMP
  flows: ImpactResult[];              // Original flow details
}

interface CountrySummary {
  country: string;
  flowsAsSource: number;
  flowsAsDestination: number;
  totalFlowsAffected: number;
  avgCostChangePct: number;
  maxCostChangePct: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Aggregate impact results by country pairs
 */
export function aggregateByCountry(
  changes: ImpactResult[]
): CountryFlowAggregation[] {
  const countryPairs = new Map<string, ImpactResult[]>();

  // Group by country pair
  changes.forEach(change => {
    const key = `${change.src.country}→${change.dest.country}`;
    if (!countryPairs.has(key)) {
      countryPairs.set(key, []);
    }
    countryPairs.get(key)!.push(change);
  });

  // Calculate aggregations
  return Array.from(countryPairs.entries()).map(([key, flows]) => {
    const [srcCountry, destCountry] = key.split('→');

    const costDeltas = flows.map(f => f.newCost - f.oldCost);
    const costDeltaPcts = flows.map(f =>
      ((f.newCost - f.oldCost) / f.oldCost) * 100
    );

    return {
      srcCountry,
      destCountry,
      flowCount: flows.length,
      avgCostChange: costDeltas.reduce((a, b) => a + b, 0) / flows.length,
      avgCostChangePct: costDeltaPcts.reduce((a, b) => a + b, 0) / flows.length,
      maxCostChange: Math.max(...costDeltas.map(Math.abs)),
      maxCostChangePct: Math.max(...costDeltaPcts.map(Math.abs)),
      pathMigrations: flows.filter(f => f.pathChanged).length,
      costIncreases: flows.filter(f => f.newCost > f.oldCost).length,
      costDecreases: flows.filter(f => f.newCost < f.oldCost).length,
      lostECMP: flows.filter(f => f.wasECMP && !f.isECMP).length,
      newECMP: flows.filter(f => !f.wasECMP && f.isECMP).length,
      flows
    };
  }).sort((a, b) => b.flowCount - a.flowCount);
}

/**
 * Get per-country summary metrics
 */
export function getCountrySummaries(
  aggregations: CountryFlowAggregation[]
): CountrySummary[] {
  const countrySummary = new Map<string, {
    asSource: CountryFlowAggregation[];
    asDest: CountryFlowAggregation[];
  }>();

  aggregations.forEach(agg => {
    if (!countrySummary.has(agg.srcCountry)) {
      countrySummary.set(agg.srcCountry, { asSource: [], asDest: [] });
    }
    if (!countrySummary.has(agg.destCountry)) {
      countrySummary.set(agg.destCountry, { asSource: [], asDest: [] });
    }
    countrySummary.get(agg.srcCountry)!.asSource.push(agg);
    countrySummary.get(agg.destCountry)!.asDest.push(agg);
  });

  return Array.from(countrySummary.entries()).map(([country, data]) => {
    const allFlows = [...data.asSource, ...data.asDest];
    const flowsAsSource = data.asSource.reduce((sum, a) => sum + a.flowCount, 0);
    const flowsAsDest = data.asDest.reduce((sum, a) => sum + a.flowCount, 0);
    const avgCostChangePct = allFlows.length > 0
      ? allFlows.reduce((sum, a) => sum + a.avgCostChangePct * a.flowCount, 0) /
        allFlows.reduce((sum, a) => sum + a.flowCount, 0)
      : 0;
    const maxCostChangePct = Math.max(...allFlows.map(a => a.maxCostChangePct), 0);

    return {
      country,
      flowsAsSource,
      flowsAsDestination: flowsAsDest,
      totalFlowsAffected: flowsAsSource + flowsAsDest,
      avgCostChangePct,
      maxCostChangePct,
      riskLevel: classifyCountryRisk(avgCostChangePct, maxCostChangePct, flowsAsSource + flowsAsDest)
    };
  }).sort((a, b) => b.totalFlowsAffected - a.totalFlowsAffected);
}

function classifyCountryRisk(
  avgChange: number,
  maxChange: number,
  flowCount: number
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (maxChange > 40 || flowCount > 50) return 'HIGH';
  if (avgChange > 15 || flowCount > 25) return 'MEDIUM';
  return 'LOW';
}
```

---

### B04-03: Recommendation Engine Service
**Priority**: P0 (Must Have)
**Effort**: 4 points
**Dependencies**: B04-01, B04-02

**Description**:
Generate actionable recommendations based on risk analysis results.

**Acceptance Criteria**:
- [ ] Primary recommendation: PROCEED / CAUTION / ABORT
- [ ] List specific concerns (geographic changes, ECMP loss, etc.)
- [ ] Provide optimization suggestions
- [ ] Generate rollback instructions
- [ ] Recommendations based on risk score and analysis

**Technical Details**:
```typescript
// File: services/recommendationEngine.ts

interface Recommendation {
  type: 'PROCEED' | 'CAUTION' | 'ABORT';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  actionable: boolean;
  suggestedAction?: string;
  category: 'main' | 'concern' | 'suggestion' | 'rollback';
}

interface RollbackPlan {
  edgeId: string;
  originalCost: number;
  cliCommand: string;
  estimatedConvergenceSeconds: number;
  affectedFlowCount: number;
  steps: string[];
}

/**
 * Generate recommendations based on blast radius analysis
 */
export function generateRecommendations(
  score: BlastRadiusScore,
  changes: ImpactResult[],
  changedEdgeId: string,
  originalCost: number,
  newCost: number,
  nodes: RouterNode[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. Main recommendation based on risk score
  recommendations.push(getMainRecommendation(score));

  // 2. Geographic routing concerns
  const geoRecommendations = analyzeGeographicChanges(changes, nodes);
  recommendations.push(...geoRecommendations);

  // 3. ECMP changes
  const ecmpRecommendations = analyzeECMPChanges(changes);
  recommendations.push(...ecmpRecommendations);

  // 4. Cost increase concerns
  const costRecommendations = analyzeCostChanges(changes);
  recommendations.push(...costRecommendations);

  // 5. Capacity concerns
  const capacityRecommendations = analyzeCapacityConcerns(changes);
  recommendations.push(...capacityRecommendations);

  // 6. Rollback reminder
  recommendations.push({
    type: 'PROCEED',
    title: 'Rollback Ready',
    description: `Rollback plan prepared. Original cost: ${originalCost}`,
    severity: 'info',
    actionable: true,
    suggestedAction: 'Review rollback procedures before applying.',
    category: 'rollback'
  });

  return recommendations;
}

function getMainRecommendation(score: BlastRadiusScore): Recommendation {
  if (score.risk === 'LOW') {
    return {
      type: 'PROCEED',
      title: 'Safe to Proceed',
      description: `Low risk change (score: ${score.overall}/100). Minimal impact detected.`,
      severity: 'info',
      actionable: true,
      suggestedAction: 'Apply change during normal operations.',
      category: 'main'
    };
  } else if (score.risk === 'MEDIUM') {
    return {
      type: 'CAUTION',
      title: 'Proceed with Caution',
      description: `Moderate risk (score: ${score.overall}/100). ${score.details.affectedFlows} flows affected.`,
      severity: 'warning',
      actionable: true,
      suggestedAction: 'Review impact details, apply during low-traffic window.',
      category: 'main'
    };
  } else if (score.risk === 'HIGH') {
    return {
      type: 'CAUTION',
      title: 'High Impact - Approval Required',
      description: `High risk (score: ${score.overall}/100). ${score.details.affectedPercentage.toFixed(1)}% of flows affected.`,
      severity: 'warning',
      actionable: true,
      suggestedAction: 'Get stakeholder approval, schedule maintenance window.',
      category: 'main'
    };
  } else {
    return {
      type: 'ABORT',
      title: 'Critical Impact - Reconsider',
      description: `Critical risk (score: ${score.overall}/100). This change affects ${score.details.affectedPercentage.toFixed(1)}% of network.`,
      severity: 'error',
      actionable: true,
      suggestedAction: 'Consider phased rollout or alternate approach.',
      category: 'main'
    };
  }
}

function analyzeGeographicChanges(
  changes: ImpactResult[],
  nodes: RouterNode[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Find flows where country routing changed
  const countryChanges = changes.filter(c => {
    const oldCountries = getPathCountries(c.oldPath, nodes);
    const newCountries = getPathCountries(c.newPath, nodes);
    return JSON.stringify(oldCountries) !== JSON.stringify(newCountries);
  });

  if (countryChanges.length > 0) {
    const newCountries = new Set(
      countryChanges.flatMap(c => getPathCountries(c.newPath, nodes))
    );

    recommendations.push({
      type: 'CAUTION',
      title: 'Geographic Routing Changes',
      description: `${countryChanges.length} flows now traverse different countries: ${Array.from(newCountries).join(', ')}`,
      severity: 'warning',
      actionable: true,
      suggestedAction: 'Verify data sovereignty and regulatory compliance.',
      category: 'concern'
    });
  }

  return recommendations;
}

function analyzeECMPChanges(changes: ImpactResult[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const lostECMP = changes.filter(c => c.wasECMP && !c.isECMP);
  const gainedECMP = changes.filter(c => !c.wasECMP && c.isECMP);

  if (lostECMP.length > 5) {
    recommendations.push({
      type: 'CAUTION',
      title: 'ECMP Redundancy Loss',
      description: `${lostECMP.length} flows lost ECMP load balancing redundancy.`,
      severity: 'warning',
      actionable: true,
      suggestedAction: 'Review affected flows for capacity and redundancy concerns.',
      category: 'concern'
    });
  }

  if (gainedECMP.length > 0) {
    recommendations.push({
      type: 'PROCEED',
      title: 'ECMP Improvement',
      description: `${gainedECMP.length} flows gained ECMP load balancing.`,
      severity: 'info',
      actionable: false,
      category: 'suggestion'
    });
  }

  return recommendations;
}

function analyzeCostChanges(changes: ImpactResult[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const largeCostIncreases = changes.filter(c =>
    ((c.newCost - c.oldCost) / c.oldCost) > 0.5
  );

  if (largeCostIncreases.length > 0) {
    recommendations.push({
      type: 'CAUTION',
      title: 'Significant Cost Increases',
      description: `${largeCostIncreases.length} flows experience >50% path cost increase.`,
      severity: 'warning',
      actionable: false,
      category: 'concern'
    });
  }

  return recommendations;
}

/**
 * Generate rollback plan with CLI commands
 */
export function generateRollbackPlan(
  changedEdgeId: string,
  originalCost: number,
  affectedFlowCount: number,
  edges: VisEdge[]
): RollbackPlan {
  const edge = edges.find(e => e.id === changedEdgeId);
  const routerName = edge?.from || 'Router';

  return {
    edgeId: changedEdgeId,
    originalCost,
    cliCommand: `router ospf 1\n  interface <interface>\n    ip ospf cost ${originalCost}`,
    estimatedConvergenceSeconds: 30, // Typical OSPF SPF convergence
    affectedFlowCount,
    steps: [
      `Set ${changedEdgeId} cost back to ${originalCost}`,
      'Wait 30 seconds for SPF convergence',
      `Verify ${affectedFlowCount} flows revert to original paths`
    ]
  };
}

function getPathCountries(path: string[], nodes: RouterNode[]): string[] {
  return path.map(name => {
    const node = nodes.find(n => n.name === name);
    return node?.country || 'Unknown';
  }).filter((c, i, arr) => arr.indexOf(c) === i); // Dedupe
}
```

---

### B04-04: PDF Report Generator Service
**Priority**: P1 (Should Have)
**Effort**: 5 points
**Dependencies**: B04-01, B04-02, B04-03

**Description**:
Generate professional PDF reports with all blast radius analysis data.

**Acceptance Criteria**:
- [ ] 6-page PDF structure: Summary, Visualization, Matrix, Details, Risk, Appendix
- [ ] Professional formatting with headers, footers, page numbers
- [ ] Network visualization screenshot capture
- [ ] Signature line for approval
- [ ] Generation in <10 seconds
- [ ] Configurable company logo/branding

**Technical Details**:
```typescript
// File: services/reportGenerator.ts

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface PDFReportData {
  impactResults: ImpactResult[];
  riskScore: BlastRadiusScore;
  changedEdge: { id: string; from: string; to: string; oldCost: number; newCost: number };
  countryAggregations: CountryFlowAggregation[];
  recommendations: Recommendation[];
  rollbackPlan: RollbackPlan;
  networkElement?: HTMLElement;
  metadata: {
    generatedAt: Date;
    networkSize: { nodes: number; links: number };
    analysisVersion: string;
  };
}

/**
 * Generate comprehensive blast radius PDF report
 */
export async function exportBlastRadiusPDF(
  data: PDFReportData
): Promise<void> {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let currentPage = 1;

  // Helper function for page header/footer
  const addPageHeader = (title: string) => {
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    pdf.text('OSPF Network Visualizer Pro - Blast Radius Analysis', 20, 10);
    pdf.text(`Page ${currentPage}`, pageWidth - 30, 10);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.text(title, 20, 25);
  };

  // PAGE 1: Executive Summary
  addPageHeader('Executive Summary');

  // Change Description
  pdf.setFontSize(11);
  pdf.text(`Change: ${data.changedEdge.from} → ${data.changedEdge.to}`, 20, 40);
  pdf.text(`Cost: ${data.changedEdge.oldCost} → ${data.changedEdge.newCost}`, 20, 47);
  pdf.text(`Generated: ${data.metadata.generatedAt.toLocaleString()}`, 20, 54);

  // Risk Score Box
  const riskColors: Record<string, number[]> = {
    LOW: [76, 175, 80],
    MEDIUM: [255, 193, 7],
    HIGH: [255, 152, 0],
    CRITICAL: [244, 67, 54]
  };
  pdf.setFillColor(...(riskColors[data.riskScore.risk] as [number, number, number]));
  pdf.rect(20, 65, 60, 25, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text(`${data.riskScore.overall}/100`, 30, 78);
  pdf.setFontSize(12);
  pdf.text(data.riskScore.risk, 30, 86);
  pdf.setTextColor(0, 0, 0);

  // Key Metrics
  pdf.setFontSize(11);
  pdf.text('Key Metrics:', 90, 70);
  pdf.setFontSize(10);
  pdf.text(`• Affected Flows: ${data.riskScore.details.affectedFlows} (${data.riskScore.details.affectedPercentage.toFixed(1)}%)`, 95, 78);
  pdf.text(`• Countries Impacted: ${data.riskScore.details.countriesAffected}`, 95, 85);
  pdf.text(`• Avg Cost Change: ${data.riskScore.details.avgCostChangePct.toFixed(1)}%`, 95, 92);

  // Main Recommendation
  const mainRec = data.recommendations.find(r => r.category === 'main');
  if (mainRec) {
    pdf.setFontSize(12);
    pdf.text('Recommendation:', 20, 105);
    pdf.setFontSize(11);
    pdf.text(`${mainRec.type}: ${mainRec.title}`, 20, 113);
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(mainRec.description, pageWidth - 40);
    pdf.text(lines, 20, 121);
  }

  // Signature Section
  pdf.setFontSize(11);
  pdf.text('Approval:', 20, pageHeight - 40);
  pdf.text('Approved By: _________________________', 20, pageHeight - 30);
  pdf.text('Date: _____________', 120, pageHeight - 30);
  pdf.text('Signature: _________________________', 20, pageHeight - 20);

  // PAGE 2: Visual Impact (if network element provided)
  if (data.networkElement) {
    pdf.addPage();
    currentPage++;
    addPageHeader('Network Impact Visualization');

    try {
      const canvas = await html2canvas(data.networkElement, {
        backgroundColor: '#1a1a2e',
        scale: 2
      });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 15, 35, pageWidth - 30, 140);
    } catch (e) {
      pdf.text('Network visualization could not be captured.', 20, 50);
    }
  }

  // PAGE 3: Country Impact Matrix
  pdf.addPage();
  currentPage++;
  addPageHeader('Country-Level Impact Matrix');

  const matrixData = data.countryAggregations.slice(0, 30).map(agg => [
    agg.srcCountry,
    agg.destCountry,
    agg.flowCount.toString(),
    (agg.avgCostChangePct >= 0 ? '+' : '') + agg.avgCostChangePct.toFixed(1) + '%',
    agg.pathMigrations.toString(),
    agg.lostECMP.toString()
  ]);

  (pdf as any).autoTable({
    startY: 35,
    head: [['Source', 'Dest', 'Flows', 'Avg Δ', 'Rerouted', 'Lost ECMP']],
    body: matrixData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] }
  });

  // PAGE 4: Detailed Flow List
  pdf.addPage();
  currentPage++;
  addPageHeader('Detailed Flow Analysis (Top 40)');

  const flowData = data.impactResults.slice(0, 40).map(r => [
    `${r.src.name.substring(0, 8)} → ${r.dest.name.substring(0, 8)}`,
    r.oldCost.toString(),
    r.newCost.toString(),
    ((r.newCost - r.oldCost) / r.oldCost * 100).toFixed(0) + '%',
    r.impactType.substring(0, 10)
  ]);

  (pdf as any).autoTable({
    startY: 35,
    head: [['Flow', 'Old', 'New', 'Δ%', 'Type']],
    body: flowData,
    theme: 'striped',
    styles: { fontSize: 8 }
  });

  // PAGE 5: Risk Analysis
  pdf.addPage();
  currentPage++;
  addPageHeader('Risk Analysis Breakdown');

  pdf.setFontSize(11);
  pdf.text(`Overall Score: ${data.riskScore.overall}/100 (${data.riskScore.risk})`, 20, 40);

  pdf.setFontSize(10);
  const breakdown = data.riskScore.breakdown;
  const details = data.riskScore.details;

  pdf.text(`Flow Impact Score: ${breakdown.flowImpact}/40`, 20, 55);
  pdf.text(`  ${details.affectedFlows} of ${details.totalFlows} flows affected (${details.affectedPercentage.toFixed(1)}%)`, 25, 62);

  pdf.text(`Cost Magnitude Score: ${breakdown.costMagnitude}/30`, 20, 75);
  pdf.text(`  Average cost change: ${details.avgCostChangePct.toFixed(1)}%`, 25, 82);

  pdf.text(`Country Diversity Score: ${breakdown.countryDiversity}/20`, 20, 95);
  pdf.text(`  ${details.countriesAffected} countries affected`, 25, 102);

  pdf.text(`Critical Path Score: ${breakdown.criticalPaths}/10`, 20, 115);
  pdf.text(`  ${details.criticalPathCount} intercontinental paths changed`, 25, 122);

  // Concerns
  const concerns = data.recommendations.filter(r => r.category === 'concern');
  if (concerns.length > 0) {
    pdf.setFontSize(11);
    pdf.text('Concerns:', 20, 140);
    pdf.setFontSize(10);
    concerns.forEach((c, i) => {
      pdf.text(`• ${c.title}: ${c.description.substring(0, 80)}`, 25, 148 + i * 8);
    });
  }

  // Rollback Plan
  pdf.setFontSize(11);
  pdf.text('Rollback Plan:', 20, 180);
  pdf.setFontSize(10);
  data.rollbackPlan.steps.forEach((step, i) => {
    pdf.text(`${i + 1}. ${step}`, 25, 188 + i * 7);
  });

  // PAGE 6: Appendix
  pdf.addPage();
  currentPage++;
  addPageHeader('Appendix');

  pdf.setFontSize(10);
  pdf.text('Analysis Metadata:', 20, 40);
  pdf.text(`  Tool: OSPF Network Visualizer Pro`, 25, 48);
  pdf.text(`  Version: ${data.metadata.analysisVersion}`, 25, 55);
  pdf.text(`  Analysis Date: ${data.metadata.generatedAt.toISOString()}`, 25, 62);
  pdf.text(`  Network Size: ${data.metadata.networkSize.nodes} routers, ${data.metadata.networkSize.links} links`, 25, 69);

  pdf.text('Contact:', 20, 85);
  pdf.text('  Network Operations Team', 25, 93);
  pdf.text('  Email: netops@company.com', 25, 100);

  // Save
  const filename = `blast-radius-${data.changedEdge.from}-${data.changedEdge.to}-${Date.now()}.pdf`;
  pdf.save(filename);
}

/**
 * Export flows to CSV
 */
export function exportFlowsCSV(
  impactResults: ImpactResult[],
  changedEdge: { from: string; to: string }
): void {
  const headers = [
    'Source', 'Destination', 'Source_Country', 'Dest_Country',
    'Old_Path', 'New_Path', 'Old_Cost', 'New_Cost', 'Cost_Delta', 'Cost_Delta_Pct',
    'Path_Changed', 'Was_ECMP', 'Is_ECMP', 'Impact_Type'
  ];

  const rows = impactResults.map(r => [
    r.src.name,
    r.dest.name,
    r.src.country,
    r.dest.country,
    r.oldPath.join(' → '),
    r.newPath.join(' → '),
    r.oldCost,
    r.newCost,
    r.newCost - r.oldCost,
    ((r.newCost - r.oldCost) / r.oldCost * 100).toFixed(2),
    r.pathChanged,
    r.wasECMP || false,
    r.isECMP || false,
    r.impactType
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `blast-radius-flows-${changedEdge.from}-${changedEdge.to}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

### B04-05: useBlastRadiusAnalysis Hook
**Priority**: P0 (Must Have)
**Effort**: 3 points
**Dependencies**: B04-01, B04-02, B04-03

**Description**:
Custom React hook that orchestrates all blast radius calculations and state management.

**Acceptance Criteria**:
- [ ] Orchestrate all service calls
- [ ] Manage loading/progress/error states
- [ ] Memoize expensive calculations
- [ ] Provide stable callback references
- [ ] Support cancellation

**Technical Details**:
```typescript
// File: hooks/useBlastRadiusAnalysis.ts

interface UseBlastRadiusAnalysisProps {
  impactResults: ImpactResult[];
  changedEdgeId: string;
  originalCost: number;
  newCost: number;
  nodes: RouterNode[];
  edges: VisEdge[];
}

interface UseBlastRadiusAnalysisResult {
  // Data
  riskScore: BlastRadiusScore | null;
  countryAggregations: CountryFlowAggregation[];
  countrySummaries: CountrySummary[];
  recommendations: Recommendation[];
  rollbackPlan: RollbackPlan | null;

  // State
  isLoading: boolean;
  error: Error | null;

  // Actions
  exportPDF: () => Promise<void>;
  exportCSV: () => void;
  getFlowsByCountryPair: (src: string, dest: string) => ImpactResult[];
  getFlowsByType: (type: ImpactType) => ImpactResult[];
}

export function useBlastRadiusAnalysis({
  impactResults,
  changedEdgeId,
  originalCost,
  newCost,
  nodes,
  edges
}: UseBlastRadiusAnalysisProps): UseBlastRadiusAnalysisResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoized calculations
  const riskScore = useMemo(() => {
    try {
      return calculateBlastRadiusScore(impactResults, nodes);
    } catch (e) {
      setError(e as Error);
      return null;
    }
  }, [impactResults, nodes]);

  const countryAggregations = useMemo(() => {
    return aggregateByCountry(impactResults);
  }, [impactResults]);

  const countrySummaries = useMemo(() => {
    return getCountrySummaries(countryAggregations);
  }, [countryAggregations]);

  const recommendations = useMemo(() => {
    if (!riskScore) return [];
    return generateRecommendations(
      riskScore,
      impactResults,
      changedEdgeId,
      originalCost,
      newCost,
      nodes
    );
  }, [riskScore, impactResults, changedEdgeId, originalCost, newCost, nodes]);

  const rollbackPlan = useMemo(() => {
    return generateRollbackPlan(changedEdgeId, originalCost, impactResults.length, edges);
  }, [changedEdgeId, originalCost, impactResults.length, edges]);

  useEffect(() => {
    setIsLoading(false);
  }, [riskScore, countryAggregations, recommendations]);

  // Actions
  const exportPDF = useCallback(async () => {
    if (!riskScore) return;

    const changedEdge = edges.find(e => e.id === changedEdgeId);
    if (!changedEdge) return;

    await exportBlastRadiusPDF({
      impactResults,
      riskScore,
      changedEdge: {
        id: changedEdgeId,
        from: changedEdge.from as string,
        to: changedEdge.to as string,
        oldCost: originalCost,
        newCost
      },
      countryAggregations,
      recommendations,
      rollbackPlan: rollbackPlan!,
      metadata: {
        generatedAt: new Date(),
        networkSize: { nodes: nodes.length, links: edges.length },
        analysisVersion: '1.0'
      }
    });
  }, [impactResults, riskScore, changedEdgeId, originalCost, newCost, edges, countryAggregations, recommendations, rollbackPlan, nodes]);

  const exportCSV = useCallback(() => {
    const changedEdge = edges.find(e => e.id === changedEdgeId);
    if (!changedEdge) return;

    exportFlowsCSV(impactResults, {
      from: changedEdge.from as string,
      to: changedEdge.to as string
    });
  }, [impactResults, changedEdgeId, edges]);

  const getFlowsByCountryPair = useCallback((src: string, dest: string) => {
    return impactResults.filter(r =>
      r.src.country === src && r.dest.country === dest
    );
  }, [impactResults]);

  const getFlowsByType = useCallback((type: ImpactType) => {
    return impactResults.filter(r => r.impactType === type);
  }, [impactResults]);

  return {
    riskScore,
    countryAggregations,
    countrySummaries,
    recommendations,
    rollbackPlan,
    isLoading,
    error,
    exportPDF,
    exportCSV,
    getFlowsByCountryPair,
    getFlowsByType
  };
}
```

---

### B04-06: Zone Classification Service
**Priority**: P1 (Should Have)
**Effort**: 2 points
**Dependencies**: None

**Description**:
Classify impacted flows into blast radius zones (direct, indirect, secondary).

**Acceptance Criteria**:
- [ ] Zone 1 (Direct): Flows that traverse the changed link
- [ ] Zone 2 (Indirect): Flows rerouted due to cost change
- [ ] Zone 3 (Secondary): Flows affected by congestion on rerouted paths
- [ ] Flows classified into exactly one zone

**Technical Details**:
```typescript
// File: services/zoneClassification.ts

type BlastZone = 'direct' | 'indirect' | 'secondary' | 'unaffected';

interface ZonedImpactResult extends ImpactResult {
  zone: BlastZone;
  zoneReason: string;
}

interface ZoneSummary {
  zone: BlastZone;
  flowCount: number;
  flows: ZonedImpactResult[];
  color: string;
}

/**
 * Classify flows into blast radius zones
 */
export function classifyIntoZones(
  impactResults: ImpactResult[],
  changedEdgeId: string,
  edges: VisEdge[]
): ZonedImpactResult[] {
  const changedEdge = edges.find(e => e.id === changedEdgeId);
  if (!changedEdge) return impactResults.map(r => ({ ...r, zone: 'unaffected' as BlastZone, zoneReason: 'Changed edge not found' }));

  const changedNodes = [changedEdge.from, changedEdge.to];

  return impactResults.map(result => {
    // Zone 1: Direct - path traverses the changed link
    const oldPathHasLink = hasLink(result.oldPath, changedNodes[0] as string, changedNodes[1] as string);
    const newPathHasLink = hasLink(result.newPath, changedNodes[0] as string, changedNodes[1] as string);

    if (oldPathHasLink || newPathHasLink) {
      return {
        ...result,
        zone: 'direct' as BlastZone,
        zoneReason: 'Path traverses changed link'
      };
    }

    // Zone 2: Indirect - path changed but doesn't traverse changed link
    if (result.pathChanged) {
      return {
        ...result,
        zone: 'indirect' as BlastZone,
        zoneReason: 'Path rerouted due to cost change propagation'
      };
    }

    // Zone 3: Secondary - cost changed but path stayed same (congestion effect)
    if (result.newCost !== result.oldCost) {
      return {
        ...result,
        zone: 'secondary' as BlastZone,
        zoneReason: 'Cost affected by network recalculation'
      };
    }

    // Unaffected
    return {
      ...result,
      zone: 'unaffected' as BlastZone,
      zoneReason: 'No impact detected'
    };
  });
}

function hasLink(path: string[], node1: string, node2: string): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    if ((path[i] === node1 && path[i + 1] === node2) ||
        (path[i] === node2 && path[i + 1] === node1)) {
      return true;
    }
  }
  return false;
}

/**
 * Get zone summary statistics
 */
export function getZoneSummaries(
  zonedResults: ZonedImpactResult[]
): ZoneSummary[] {
  const zones: BlastZone[] = ['direct', 'indirect', 'secondary'];
  const colors: Record<BlastZone, string> = {
    direct: '#ef4444',
    indirect: '#f97316',
    secondary: '#eab308',
    unaffected: '#6b7280'
  };

  return zones.map(zone => ({
    zone,
    flowCount: zonedResults.filter(r => r.zone === zone).length,
    flows: zonedResults.filter(r => r.zone === zone),
    color: colors[zone]
  })).filter(z => z.flowCount > 0);
}
```

---

## Backend Task Summary Table

| Task ID | Task Name | Priority | Effort | Dependencies |
|---------|-----------|----------|--------|--------------|
| B04-01 | Risk Scoring Algorithm | P0 | 4 pts | Existing impact analysis |
| B04-02 | Country Aggregation Service | P0 | 3 pts | Existing impact analysis |
| B04-03 | Recommendation Engine | P0 | 4 pts | B04-01, B04-02 |
| B04-04 | PDF Report Generator | P1 | 5 pts | B04-01, B04-02, B04-03 |
| B04-05 | useBlastRadiusAnalysis Hook | P0 | 3 pts | B04-01, B04-02, B04-03 |
| B04-06 | Zone Classification Service | P1 | 2 pts | None |

**Total Backend Effort**: 21 story points

---

## Implementation Priority

### Phase 1: Core Services (P0) - Week 1
1. B04-01: Risk Scoring Algorithm (4 pts)
2. B04-02: Country Aggregation Service (3 pts)

### Phase 2: Recommendations & Hook (P0) - Week 2
3. B04-03: Recommendation Engine (4 pts)
4. B04-05: useBlastRadiusAnalysis Hook (3 pts)

### Phase 3: Visualization Support (P1) - Week 3
5. B04-06: Zone Classification Service (2 pts)

### Phase 4: Export (P1) - Week 4
6. B04-04: PDF Report Generator (5 pts)

---

## Integration with Existing Code

**Leverages Existing Infrastructure**:
- `workers/impactAnalysis.worker.ts` - Already calculates impact results
- `services/dijkstra.ts` - Path calculation engine
- `constants.ts` - Node and edge data
- `types.ts` - Shared type definitions

**No Breaking Changes**:
- New services are additive
- Existing impact modal continues to work
- Blast radius is an enhancement layer

---

**Document Status**: APPROVED FOR IMPLEMENTATION
**Backend Lead Approval**: ___________
**Date**: ___________

