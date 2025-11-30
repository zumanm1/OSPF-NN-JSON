/**
 * useBlastRadiusAnalysis Hook
 * B04-05: useBlastRadiusAnalysis Hook (P0, 3pts)
 *
 * Custom React hook that orchestrates all blast radius calculations and state management
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { VisNode, VisEdge } from '../types';
import {
  UseBlastRadiusAnalysisProps,
  UseBlastRadiusAnalysisResult,
  BlastRadiusScore,
  CountryFlowAggregation,
  CountrySummary,
  Recommendation,
  RollbackPlan,
  ImpactResult,
  ImpactType,
  ZonedImpactResult,
  ZoneSummary,
  BlastZone,
  RouterNode
} from '../types/blastRadius.types';

import { calculateBlastRadiusScore } from '../services/riskScoring';
import { aggregateByCountry, getCountrySummaries } from '../services/countryAggregation';
import { generateRecommendations, generateRollbackPlan } from '../services/recommendationEngine';
import { classifyIntoZones, getZoneSummaries } from '../services/zoneClassification';
import { exportBlastRadiusPDF, exportFlowsCSV } from '../services/blastRadiusReportGenerator';

/**
 * Hook for blast radius analysis
 */
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

  // Convert VisNodes to RouterNodes for scoring
  const routerNodes = useMemo((): RouterNode[] => {
    return nodes.map(n => ({
      id: n.id as string,
      name: n.label || (n.id as string),
      country: n.country
    }));
  }, [nodes]);

  // Memoized risk score calculation
  const riskScore = useMemo((): BlastRadiusScore | null => {
    try {
      if (impactResults.length === 0) {
        return {
          overall: 0,
          risk: 'LOW',
          breakdown: {
            flowImpact: 0,
            costMagnitude: 0,
            countryDiversity: 0,
            criticalPaths: 0
          },
          details: {
            totalFlows: routerNodes.length * (routerNodes.length - 1),
            affectedFlows: 0,
            affectedPercentage: 0,
            avgCostChangePct: 0,
            countriesAffected: 0,
            criticalPathCount: 0
          }
        };
      }
      return calculateBlastRadiusScore(impactResults, routerNodes);
    } catch (e) {
      setError(e as Error);
      return null;
    }
  }, [impactResults, routerNodes]);

  // Memoized country aggregations
  const countryAggregations = useMemo((): CountryFlowAggregation[] => {
    try {
      return aggregateByCountry(impactResults);
    } catch (e) {
      setError(e as Error);
      return [];
    }
  }, [impactResults]);

  // Memoized country summaries
  const countrySummaries = useMemo((): CountrySummary[] => {
    try {
      return getCountrySummaries(countryAggregations);
    } catch (e) {
      setError(e as Error);
      return [];
    }
  }, [countryAggregations]);

  // Memoized recommendations
  const recommendations = useMemo((): Recommendation[] => {
    try {
      if (!riskScore) return [];
      return generateRecommendations(
        riskScore,
        impactResults,
        changedEdgeId,
        originalCost,
        newCost,
        nodes
      );
    } catch (e) {
      setError(e as Error);
      return [];
    }
  }, [riskScore, impactResults, changedEdgeId, originalCost, newCost, nodes]);

  // Memoized rollback plan
  const rollbackPlan = useMemo((): RollbackPlan | null => {
    try {
      return generateRollbackPlan(changedEdgeId, originalCost, impactResults.length, edges);
    } catch (e) {
      setError(e as Error);
      return null;
    }
  }, [changedEdgeId, originalCost, impactResults.length, edges]);

  // Memoized zone classification
  const zonedResults = useMemo((): ZonedImpactResult[] => {
    try {
      return classifyIntoZones(impactResults, changedEdgeId, edges);
    } catch (e) {
      setError(e as Error);
      return [];
    }
  }, [impactResults, changedEdgeId, edges]);

  // Memoized zone summaries
  const zoneSummaries = useMemo((): ZoneSummary[] => {
    try {
      return getZoneSummaries(zonedResults);
    } catch (e) {
      setError(e as Error);
      return [];
    }
  }, [zonedResults]);

  // Set loading to false when all calculations complete
  useEffect(() => {
    if (riskScore !== undefined) {
      setIsLoading(false);
    }
  }, [riskScore, countryAggregations, recommendations, zonedResults]);

  // Export to PDF action
  const exportPDF = useCallback(async (): Promise<void> => {
    if (!riskScore || !rollbackPlan) {
      console.error('Cannot export PDF: missing risk score or rollback plan');
      return;
    }

    const changedEdge = edges.find(e => e.id === changedEdgeId);
    if (!changedEdge) {
      console.error('Cannot export PDF: changed edge not found');
      return;
    }

    try {
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
        rollbackPlan,
        metadata: {
          generatedAt: new Date(),
          networkSize: { nodes: nodes.length, links: edges.length },
          analysisVersion: '1.0'
        }
      });
    } catch (e) {
      setError(e as Error);
    }
  }, [
    impactResults,
    riskScore,
    changedEdgeId,
    originalCost,
    newCost,
    edges,
    countryAggregations,
    recommendations,
    rollbackPlan,
    nodes
  ]);

  // Export to CSV action
  const exportCSV = useCallback((): void => {
    const changedEdge = edges.find(e => e.id === changedEdgeId);
    if (!changedEdge) {
      console.error('Cannot export CSV: changed edge not found');
      return;
    }

    try {
      exportFlowsCSV(impactResults, {
        from: changedEdge.from as string,
        to: changedEdge.to as string
      });
    } catch (e) {
      setError(e as Error);
    }
  }, [impactResults, changedEdgeId, edges]);

  // Get flows by country pair
  const getFlowsByCountryPair = useCallback((src: string, dest: string): ImpactResult[] => {
    return impactResults.filter(r =>
      r.src.country === src && r.dest.country === dest
    );
  }, [impactResults]);

  // Get flows by impact type
  const getFlowsByType = useCallback((type: ImpactType): ImpactResult[] => {
    return impactResults.filter(r => r.impactType === type);
  }, [impactResults]);

  // Get flows by zone
  const getFlowsByZone = useCallback((zone: BlastZone): ZonedImpactResult[] => {
    return zonedResults.filter(r => r.zone === zone);
  }, [zonedResults]);

  return {
    // Data
    riskScore,
    countryAggregations,
    countrySummaries,
    recommendations,
    rollbackPlan,
    zonedResults,
    zoneSummaries,

    // State
    isLoading,
    error,

    // Actions
    exportPDF,
    exportCSV,
    getFlowsByCountryPair,
    getFlowsByType,
    getFlowsByZone
  };
}

/**
 * Hook for lightweight blast radius preview (faster, fewer calculations)
 */
export function useBlastRadiusPreview(
  impactResults: ImpactResult[],
  nodes: VisNode[]
): {
  estimatedScore: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedCount: number;
  isCalculating: boolean;
} {
  const [isCalculating, setIsCalculating] = useState(true);

  const result = useMemo(() => {
    const totalFlows = nodes.length * (nodes.length - 1);
    const affectedCount = impactResults.length;
    const affectedPct = totalFlows > 0 ? affectedCount / totalFlows : 0;

    // Quick score estimation (simplified)
    const flowImpact = Math.min(40, affectedPct * 100);

    // Get unique countries
    const countries = new Set<string>();
    impactResults.forEach(r => {
      if (r.src.country) countries.add(r.src.country);
      if (r.dest.country) countries.add(r.dest.country);
    });
    const countryDiversity = Math.min(20, countries.size * 3);

    const estimatedScore = Math.round(flowImpact + countryDiversity);

    let risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (estimatedScore < 20) risk = 'LOW';
    else if (estimatedScore < 40) risk = 'MEDIUM';
    else if (estimatedScore < 70) risk = 'HIGH';
    else risk = 'CRITICAL';

    return { estimatedScore, risk, affectedCount };
  }, [impactResults, nodes]);

  useEffect(() => {
    setIsCalculating(false);
  }, [result]);

  return { ...result, isCalculating };
}

/**
 * Hook for zone-based filtering
 */
export function useZoneFilter(
  zonedResults: ZonedImpactResult[],
  initialZone: BlastZone | 'all' = 'all'
): {
  selectedZone: BlastZone | 'all';
  setSelectedZone: (zone: BlastZone | 'all') => void;
  filteredResults: ZonedImpactResult[];
  zoneCounts: Record<BlastZone, number>;
} {
  const [selectedZone, setSelectedZone] = useState<BlastZone | 'all'>(initialZone);

  const filteredResults = useMemo(() => {
    if (selectedZone === 'all') return zonedResults;
    return zonedResults.filter(r => r.zone === selectedZone);
  }, [zonedResults, selectedZone]);

  const zoneCounts = useMemo(() => ({
    direct: zonedResults.filter(r => r.zone === 'direct').length,
    indirect: zonedResults.filter(r => r.zone === 'indirect').length,
    secondary: zonedResults.filter(r => r.zone === 'secondary').length,
    unaffected: zonedResults.filter(r => r.zone === 'unaffected').length
  }), [zonedResults]);

  return { selectedZone, setSelectedZone, filteredResults, zoneCounts };
}

/**
 * Hook for country-based filtering
 */
export function useCountryFilter(
  aggregations: CountryFlowAggregation[]
): {
  selectedCountry: string | null;
  setSelectedCountry: (country: string | null) => void;
  filteredAggregations: CountryFlowAggregation[];
  countries: string[];
} {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const countries = useMemo(() => {
    const countrySet = new Set<string>();
    aggregations.forEach(agg => {
      countrySet.add(agg.srcCountry);
      countrySet.add(agg.destCountry);
    });
    return Array.from(countrySet).sort();
  }, [aggregations]);

  const filteredAggregations = useMemo(() => {
    if (!selectedCountry) return aggregations;
    return aggregations.filter(agg =>
      agg.srcCountry === selectedCountry || agg.destCountry === selectedCountry
    );
  }, [aggregations, selectedCountry]);

  return { selectedCountry, setSelectedCountry, filteredAggregations, countries };
}

export default useBlastRadiusAnalysis;
