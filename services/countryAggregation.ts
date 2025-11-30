import { ImpactResult } from '../App';

export interface CountryFlowAggregation {
  srcCountry: string;
  destCountry: string;
  totalFlows: number;
  costIncreases: number;
  costDecreases: number;
  pathMigrations: number;
  avgCostDelta: number;
  flows: ImpactResult[];
}

export function aggregateFlowsByCountry(
  results: ImpactResult[]
): CountryFlowAggregation[] {
  const aggregations = new Map<string, CountryFlowAggregation>();

  for (const result of results) {
    const srcCountry = result.src.country || 'Unknown';
    const destCountry = result.dest.country || 'Unknown';
    const key = `${srcCountry}->${destCountry}`;

    if (!aggregations.has(key)) {
      aggregations.set(key, {
        srcCountry,
        destCountry,
        totalFlows: 0,
        costIncreases: 0,
        costDecreases: 0,
        pathMigrations: 0,
        avgCostDelta: 0,
        flows: []
      });
    }

    const agg = aggregations.get(key)!;
    agg.totalFlows++;
    agg.flows.push(result);

    if (result.impactType === 'cost_increase') agg.costIncreases++;
    else if (result.impactType === 'cost_decrease') agg.costDecreases++;
    
    if (result.pathChanged) agg.pathMigrations++;
  }

  // Calculate averages
  for (const agg of aggregations.values()) {
    const totalDelta = agg.flows.reduce(
      (sum, f) => sum + (f.newCost - f.oldCost), 0
    );
    agg.avgCostDelta = agg.totalFlows > 0 ? totalDelta / agg.totalFlows : 0;
  }

  return Array.from(aggregations.values()).sort((a, b) => b.totalFlows - a.totalFlows);
}
