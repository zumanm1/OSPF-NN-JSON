# Technical Specifications: Blast Radius Impact Analyzer

**Feature**: Blast Radius Impact Analyzer  
**Version**: 1.0  
**Last Updated**: 2025-11-29  

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BLAST RADIUS ANALYZER                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Visualization│  │Country Matrix│  │  Risk Score  │  │
│  │  Component   │  │  Component   │  │   Component  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                            │                             │
│                  ┌─────────▼─────────┐                   │
│                  │  State Manager    │                   │
│                  │ (useBlastRadius)  │                   │
│                  └─────────┬─────────┘                   │
│                            │                             │
│         ┌──────────────────┼──────────────────┐          │
│         │                  │                  │          │
│    ┌────▼────┐      ┌──────▼──────┐    ┌─────▼─────┐    │
│    │ Impact  │      │    Risk     │    │ Country   │    │
│    │Calculation│    │   Scoring   │    │Aggregation│    │
│    │ Service │      │  Algorithm  │    │  Service  │    │
│    └─────────┘      └─────────────┘    └───────────┘    │
│                                                          │
│    ┌──────────────────────────────────────────────┐     │
│    │          Web Worker (Performance)            │     │
│    │   - Dijkstra calculations off main thread    │     │
│    │   - Progress updates                         │     │
│    │   - Non-blocking UI                          │     │
│    └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. BlastRadiusAnalyzer.tsx (Main Container)

```typescript
interface BlastRadiusAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  changedEdgeId: string;
  oldCost: number;
  newCost: number;
  impactResults: ImpactResult[];
}

export const BlastRadiusAnalyzer: React.FC<BlastRadiusAnalyzerProps> = ({
  isOpen,
  onClose,
  changedEdgeId,
  oldCost,
  newCost,
  impactResults
}) => {
  const [activeTab, setActiveTab] = useState<'visualization' | 'matrix' | 'details'>('visualization');
  const [riskScore, setRiskScore] = useState<BlastRadiusScore | null>(null);
  const [countryAggs, setCountryAggs] = useState<CountryFlowAggregation[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  
  useEffect(() => {
    // Calculate risk score
    const score = calculateBlastRadiusScore(impactResults, NODES);
    setRiskScore(score);
    
    // Aggregate by country
    const aggs = aggregateByCountry(impactResults);
    setCountryAggs(aggs);
    
    // Generate recommendations
    const recs = generateRecommendations(score, impactResults, changedEdgeId);
    setRecommendations(recs);
  }, [impactResults]);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="fullscreen">
      <ModalHeader>
        <h2>Blast Radius Analysis: Cost Change {oldCost} → {newCost}</h2>
        <RiskBadge score={riskScore?.overall} level={riskScore?.risk} />
      </ModalHeader>
      
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <Tab id="visualization">
          <BlastRadiusVisualization 
            impactResults={impactResults}
            changedEdgeId={changedEdgeId}
          />
        </Tab>
        
        <Tab id="matrix">
          <CountryImpactMatrix 
            aggregations={countryAggs}
            onCellClick={handleCountryPairClick}
          />
        </Tab>
        
        <Tab id="details">
          <FlowDetailPanel 
            flows={impactResults}
            onFlowClick={handleFlowClick}
          />
        </Tab>
      </Tabs>
      
      <Sidebar>
        <RiskScoreGauge score={riskScore} />
        <RecommendationPanel recommendations={recommendations} />
        <RollbackInstructions 
          edgeId={changedEdgeId}
          originalCost={oldCost}
          affectedFlowCount={impactResults.length}
        />
        <ExportControls 
          onExportPDF={() => exportBlastRadiusPDF(impactResults, riskScore)}
          onExportCSV={() => exportFlowsCSV(impactResults)}
        />
      </Sidebar>
    </Modal>
  );
};
```

---

### 2. Risk Scoring Algorithm

```typescript
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

export function calculateBlastRadiusScore(
  changes: ImpactResult[],
  allNodes: RouterNode[]
): BlastRadiusScore {
  const totalFlows = allNodes.length * (allNodes.length - 1);
  const affectedFlows = changes.length;
  const affectedPct = affectedFlows / totalFlows;
  
  // Factor 1: Flow Impact (0-40 points)
  // More affected flows = higher score
  const flowImpact = Math.min(40, affectedPct * 100);
  
  // Factor 2: Cost Magnitude (0-30 points)
  // Larger cost changes = higher score
  const avgCostChangePct = changes.reduce((sum, c) => {
    const changePct = Math.abs((c.newCost - c.oldCost) / c.oldCost);
    return sum + changePct;
  }, 0) / changes.length;
  const costMagnitude = Math.min(30, avgCostChangePct * 100);
  
  // Factor 3: Country Diversity (0-20 points)
  // More countries affected = higher score
  const countriesAffected = new Set(
    changes.flatMap(c => [c.src.country, c.dest.country])
  ).size;
  const countryDiversity = Math.min(20, countriesAffected * 3);
  
  // Factor 4: Critical Paths (0-10 points)
  // Intercontinental paths that changed = higher score
  const criticalPathCount = changes.filter(c => 
    c.src.country !== c.dest.country && c.pathChanged
  ).length;
  const criticalPaths = Math.min(10, (criticalPathCount / changes.length) * 20);
  
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

---

### 3. Country Aggregation Service

```typescript
interface CountryFlowAggregation {
  srcCountry: string;
  destCountry: string;
  flowCount: number;
  avgCostChange: number;              // Average cost delta
  avgCostChangePct: number;           // Average % change
  maxCostChange: number;              // Largest cost delta
  pathMigrations: number;             // Flows that changed path
  costIncreases: number;              // Flows with cost increase
  costDecreases: number;              // Flows with cost decrease
  lostECMP: number;                   // Flows that lost ECMP
  newECMP: number;                    // Flows that gained ECMP
}

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
      pathMigrations: flows.filter(f => f.pathChanged).length,
      costIncreases: flows.filter(f => f.newCost > f.oldCost).length,
      costDecreases: flows.filter(f => f.newCost < f.oldCost).length,
      lostECMP: flows.filter(f => f.wasECMP && !f.isECMP).length,
      newECMP: flows.filter(f => !f.wasECMP && f.isECMP).length
    };
  }).sort((a, b) => b.flowCount - a.flowCount); // Sort by impact
}
```

---

### 4. Recommendation Engine

```typescript
interface Recommendation {
  type: 'PROCEED' | 'CAUTION' | 'ABORT';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  actionable: boolean;
  suggestedAction?: string;
}

export function generateRecommendations(
  score: BlastRadiusScore,
  changes: ImpactResult[],
  changedEdgeId: string
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  // 1. Overall recommendation based on risk score
  if (score.risk === 'LOW') {
    recommendations.push({
      type: 'PROCEED',
      title: 'Safe to Proceed',
      description: `Low risk change (score: ${score.overall}/100). Minimal impact detected.`,
      severity: 'info',
      actionable: true,
      suggestedAction: 'Apply change during normal operations.'
    });
  } else if (score.risk === 'MEDIUM') {
    recommendations.push({
      type: 'CAUTION',
      title: 'Proceed with Caution',
      description: `Moderate risk (score: ${score.overall}/100). Review affected flows before applying.`,
      severity: 'warning',
      actionable: true,
      suggestedAction: 'Review impact details, apply during low-traffic window.'
    });
  } else if (score.risk === 'HIGH') {
    recommendations.push({
      type: 'CAUTION',
      title: 'High Impact - Approval Required',
      description: `High risk (score: ${score.overall}/100). Significant impact detected.`,
      severity: 'warning',
      actionable: true,
      suggestedAction: 'Get stakeholder approval, schedule maintenance window.'
    });
  } else {
    recommendations.push({
      type: 'ABORT',
      title: 'Critical Impact - Reconsider',
      description: `Critical risk (score: ${score.overall}/100). This change affects >30% of network.`,
      severity: 'error',
      actionable: true,
      suggestedAction: 'Consider phased rollout or alternate approach.'
    });
  }
  
  // 2. Check for geographic concerns
  const countryChanges = changes.filter(c => {
    const oldCountries = c.oldPath.map(name => {
      const node = NODES.find(n => n.name === name);
      return node?.country;
    });
    const newCountries = c.newPath.map(name => {
      const node = NODES.find(n => n.name === name);
      return node?.country;
    });
    return JSON.stringify(oldCountries) !== JSON.stringify(newCountries);
  });
  
  if (countryChanges.length > 0) {
    const affectedCountries = new Set(
      countryChanges.flatMap(c => c.newPath.map(name => 
        NODES.find(n => n.name === name)?.country
      )).filter(Boolean)
    );
    
    recommendations.push({
      type: 'CAUTION',
      title: 'Geographic Routing Changes Detected',
      description: `${countryChanges.length} flows now traverse different countries: ${Array.from(affectedCountries).join(', ')}`,
      severity: 'warning',
      actionable: true,
      suggestedAction: 'Verify data sovereignty and regulatory compliance.'
    });
  }
  
  // 3. Check for ECMP loss
  const lostECMP = changes.filter(c => c.wasECMP && !c.isECMP);
  if (lostECMP.length > 5) {
    recommendations.push({
      type: 'CAUTION',
      title: 'ECMP Redundancy Loss',
      description: `${lostECMP.length} flows lost ECMP load balancing.`,
      severity: 'warning',
      actionable: true,
      suggestedAction: 'Review affected flows for capacity concerns.'
    });
  }
  
  // 4. Check for large cost increases
  const largeCostIncreases = changes.filter(c => 
    ((c.newCost - c.oldCost) / c.oldCost) > 0.5
  );
  if (largeCostIncreases.length > 0) {
    recommendations.push({
      type: 'CAUTION',
      title: 'Significant Cost Increases',
      description: `${largeCostIncreases.length} flows experience >50% cost increase.`,
      severity: 'warning',
      actionable: false
    });
  }
  
  // 5. Rollback reminder
  recommendations.push({
    type: 'PROCEED',
    title: 'Rollback Ready',
    description: 'Rollback plan prepared. See rollback section for details.',
    severity: 'info',
    actionable: true,
    suggestedAction: 'Review rollback procedures before applying.'
  });
  
  return recommendations;
}
```

---

### 5. PDF Export Service

```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

export async function exportBlastRadiusPDF(
  impactResults: ImpactResult[],
  riskScore: BlastRadiusScore,
  changedEdge: VisEdge,
  networkElement?: HTMLElement
): Promise<void> {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // PAGE 1: Executive Summary
  pdf.setFontSize(20);
  pdf.text('Blast Radius Analysis Report', 20, 20);
  
  pdf.setFontSize(12);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
  pdf.text(`Change: Cost ${changedEdge.cost} → ${changedEdge.cost + 5}`, 20, 38);
  
  // Risk Score Box
  pdf.setDrawColor(0);
  pdf.setFillColor(riskScore.risk === 'LOW' ? [76, 175, 80] : 
                   riskScore.risk === 'MEDIUM' ? [255, 193, 7] :
                   riskScore.risk === 'HIGH' ? [255, 152, 0] : [244, 67, 54]);
  pdf.rect(20, 45, 50, 20, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.text(`${riskScore.overall}/100`, 30, 58);
  pdf.setFontSize(10);
  pdf.text(riskScore.risk, 30, 62);
  pdf.setTextColor(0, 0, 0);
  
  // Key Metrics
  pdf.setFontSize(10);
  pdf.text(`Affected Flows: ${impactResults.length}`, 20, 75);
  pdf.text(`Countries Impacted: ${riskScore.details.countriesAffected}`, 20, 82);
  pdf.text(`Avg Cost Change: ${riskScore.details.avgCostChangePct.toFixed(1)}%`, 20, 89);
  
  // Recommendation
  pdf.setFontSize(14);
  pdf.text('Recommendation:', 20, 105);
  pdf.setFontSize(11);
  const recommendation = riskScore.risk === 'LOW' ? 'PROCEED' :
                        riskScore.risk === 'MEDIUM' ? 'CAUTION' :
                        riskScore.risk === 'HIGH' ? 'APPROVAL REQUIRED' : 'RECONSIDER';
  pdf.text(recommendation, 20, 113);
  
  // Signature Line
  pdf.text('Approved By: _________________________', 20, pageHeight - 30);
  pdf.text('Date: _____________', 20, pageHeight - 22);
  
  // PAGE 2: Visual Impact Diagram
  if (networkElement) {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('Network Impact Visualization', 20, 20);
    
    const canvas = await html2canvas(networkElement);
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 10, 30, pageWidth - 20, 150);
  }
  
  // PAGE 3: Country Impact Matrix
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.text('Country-Level Impact Matrix', 20, 20);
  
  const countryAggs = aggregateByCountry(impactResults);
  const matrixData = countryAggs.map(agg => [
    agg.srcCountry,
    agg.destCountry,
    agg.flowCount.toString(),
    agg.avgCostChangePct.toFixed(1) + '%',
    agg.pathMigrations.toString()
  ]);
  
  (pdf as any).autoTable({
    startY: 30,
    head: [['Source', 'Destination', 'Flows', 'Avg Cost Δ', 'Rerouted']],
    body: matrixData,
    theme: 'grid'
  });
  
  // PAGE 4: Detailed Flow List (first 50 flows)
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.text('Detailed Flow Analysis (Top 50)', 20, 20);
  
  const flowData = impactResults.slice(0, 50).map(r => [
    `${r.src.name} → ${r.dest.name}`,
    r.oldCost.toString(),
    r.newCost.toString(),
    ((r.newCost - r.oldCost) / r.oldCost * 100).toFixed(1) + '%',
    r.impactType
  ]);
  
  (pdf as any).autoTable({
    startY: 30,
    head: [['Flow', 'Old Cost', 'New Cost', 'Change %', 'Type']],
    body: flowData,
    theme: 'striped',
    styles: { fontSize: 8 }
  });
  
  // PAGE 5: Risk Analysis
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.text('Risk Analysis Breakdown', 20, 20);
  
  pdf.setFontSize(11);
  pdf.text(`Flow Impact Score: ${riskScore.breakdown.flowImpact}/40`, 20, 35);
  pdf.text(`  ${impactResults.length} of ${riskScore.details.totalFlows} flows affected (${riskScore.details.affectedPercentage.toFixed(1)}%)`, 25, 42);
  
  pdf.text(`Cost Magnitude Score: ${riskScore.breakdown.costMagnitude}/30`, 20, 52);
  pdf.text(`  Average cost change: ${riskScore.details.avgCostChangePct.toFixed(1)}%`, 25, 59);
  
  pdf.text(`Country Diversity Score: ${riskScore.breakdown.countryDiversity}/20`, 20, 69);
  pdf.text(`  ${riskScore.details.countriesAffected} countries affected`, 25, 76);
  
  pdf.text(`Critical Path Score: ${riskScore.breakdown.criticalPaths}/10`, 20, 86);
  pdf.text(`  ${riskScore.details.criticalPathCount} intercontinental paths changed`, 25, 93);
  
  // PAGE 6: Appendix
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.text('Appendix', 20, 20);
  
  pdf.setFontSize(10);
  pdf.text('Analysis Metadata:', 20, 35);
  pdf.text(`  Tool: OSPF Network Visualizer Pro v1.0`, 20, 42);
  pdf.text(`  Analysis Date: ${new Date().toISOString()}`, 20, 49);
  pdf.text(`  Network Size: ${NODES.length} routers, ${LINKS.length} links`, 20, 56);
  pdf.text(`  Analysis Duration: ${/* calculation time */} seconds`, 20, 63);
  
  pdf.text('Contact:', 20, 75);
  pdf.text(`  Network Operations Team`, 20, 82);
  pdf.text(`  Email: netops@company.com`, 20, 89);
  
  // Save
  pdf.save(`blast-radius-analysis-${Date.now()}.pdf`);
}
```

---

## Performance Optimization

### Web Worker Integration

Already implemented in `workers/impactAnalysis.worker.ts`. The blast radius analyzer leverages this for non-blocking calculations.

**Usage**:
```typescript
const worker = new Worker('./workers/impactAnalysis.worker.ts');

worker.postMessage({
  type: 'CALCULATE_IMPACT',
  payload: { nodes, currentEdges, modifiedEdges, newEdgeIds }
});

worker.onmessage = (e) => {
  if (e.data.type === 'PROGRESS') {
    setProgress(e.data.payload.percent);
  } else if (e.data.type === 'COMPLETE') {
    const { changes } = e.data.payload;
    setImpactResults(changes);
    // Calculate blast radius metrics
    analyzeBlastRadius(changes);
  }
};
```

---

## Testing Strategy

### Unit Tests
- `calculateBlastRadiusScore()` - Test scoring algorithm with various scenarios
- `aggregateByCountry()` - Verify correct grouping and aggregation
- `generateRecommendations()` - Test recommendation logic for each risk level
- `classifyRisk()` - Verify risk thresholds

### Integration Tests
- Full blast radius analysis end-to-end
- PDF export generation
- Country matrix drill-down
- Rollback instructions accuracy

### Performance Tests
- 50-node network: <2 seconds
- 100-node network: <5 seconds
- 200-node network: <10 seconds

---

## Dependencies

**Internal**:
- `services/dijkstra.ts`
- `constants.ts` (NODES, LINKS, COUNTRIES)
- `types.ts` (ImpactResult, RouterNode, etc.)
- Existing impact analysis infrastructure

**External**:
- `jspdf` v2.5.1 (already in project)
- `jspdf-autotable` v3.8.0 (already in project)
- `html2canvas` v1.4.1 (already in project)

**No new dependencies required!**

---

## File Structure

```
src/
├── components/
│   └── BlastRadiusAnalyzer/
│       ├── BlastRadiusAnalyzer.tsx
│       ├── BlastRadiusVisualization.tsx
│       ├── CountryImpactMatrix.tsx
│       ├── FlowDetailPanel.tsx
│       ├── RiskScoreGauge.tsx
│       ├── RecommendationPanel.tsx
│       └── RollbackInstructions.tsx
├── services/
│   ├── blastRadiusCalculation.ts
│   ├── riskScoring.ts
│   ├── countryAggregation.ts
│   ├── recommendationEngine.ts
│   └── reportGenerator.ts
├── hooks/
│   └── useBlastRadiusAnalysis.ts
└── types/
    └── blastRadius.types.ts
```

---

## Migration Path

**Phase 1 (Week 1)**: Core Services
- Implement `riskScoring.ts`
- Implement `countryAggregation.ts`
- Unit tests

**Phase 2 (Week 2)**: UI Components
- `BlastRadiusAnalyzer.tsx` shell
- `CountryImpactMatrix.tsx`
- `RiskScoreGauge.tsx`

**Phase 3 (Week 3)**: Recommendations & Visualization
- `recommendationEngine.ts`
- `BlastRadiusVisualization.tsx` (optional animation)
- `RollbackInstructions.tsx`

**Phase 4 (Week 4)**: Export & Polish
- `reportGenerator.ts` (PDF export)
- Integration with existing impact analysis
- Testing and bug fixes

---

**Implementation Ready**: ✅  
**Estimated Effort**: 4 weeks  
**Risk**: LOW (builds on existing infrastructure)








