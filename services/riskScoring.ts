import { VisNode } from '../types';
import { ImpactResult } from '../App';

export interface BlastRadiusScore {
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
 */
export function calculateBlastRadiusScore(
  changes: ImpactResult[],
  allNodes: VisNode[]
): BlastRadiusScore {
  const totalFlows = Math.max(1, allNodes.length * (allNodes.length - 1));
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
