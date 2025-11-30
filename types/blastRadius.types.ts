/**
 * Blast Radius Impact Analyzer Type Definitions
 * 04-PRD Backend Architecture
 */

import { VisNode, VisEdge } from '../types';

// ============================================================================
// IMPACT RESULT TYPES (from existing worker)
// ============================================================================

export type ImpactType =
  | 'path_change'
  | 'cost_increase'
  | 'cost_decrease'
  | 'ecmp_lost'
  | 'ecmp_gained'
  | 'no_impact';

export interface RouterNode {
  id: string;
  name: string;
  country?: string;
}

export interface ImpactResult {
  src: RouterNode;
  dest: RouterNode;
  oldPath: string[];
  newPath: string[];
  oldCost: number;
  newCost: number;
  pathChanged: boolean;
  wasECMP?: boolean;
  isECMP?: boolean;
  impactType: ImpactType;
}

// ============================================================================
// RISK SCORING TYPES (B04-01)
// ============================================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BlastRadiusScore {
  overall: number;                    // 1-100
  risk: RiskLevel;
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

// ============================================================================
// COUNTRY AGGREGATION TYPES (B04-02)
// ============================================================================

export interface CountryFlowAggregation {
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

export interface CountrySummary {
  country: string;
  flowsAsSource: number;
  flowsAsDestination: number;
  totalFlowsAffected: number;
  avgCostChangePct: number;
  maxCostChangePct: number;
  riskLevel: RiskLevel;
}

// ============================================================================
// RECOMMENDATION TYPES (B04-03)
// ============================================================================

export type RecommendationType = 'PROCEED' | 'CAUTION' | 'ABORT';
export type RecommendationSeverity = 'info' | 'warning' | 'error';
export type RecommendationCategory = 'main' | 'concern' | 'suggestion' | 'rollback';

export interface Recommendation {
  type: RecommendationType;
  title: string;
  description: string;
  severity: RecommendationSeverity;
  actionable: boolean;
  suggestedAction?: string;
  category: RecommendationCategory;
}

export interface RollbackPlan {
  edgeId: string;
  originalCost: number;
  cliCommand: string;
  estimatedConvergenceSeconds: number;
  affectedFlowCount: number;
  steps: string[];
}

// ============================================================================
// PDF REPORT TYPES (B04-04)
// ============================================================================

export interface PDFReportData {
  impactResults: ImpactResult[];
  riskScore: BlastRadiusScore;
  changedEdge: {
    id: string;
    from: string;
    to: string;
    oldCost: number;
    newCost: number
  };
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

// ============================================================================
// ZONE CLASSIFICATION TYPES (B04-06)
// ============================================================================

export type BlastZone = 'direct' | 'indirect' | 'secondary' | 'unaffected';

export interface ZonedImpactResult extends ImpactResult {
  zone: BlastZone;
  zoneReason: string;
}

export interface ZoneSummary {
  zone: BlastZone;
  flowCount: number;
  flows: ZonedImpactResult[];
  color: string;
}

// ============================================================================
// HOOK TYPES (B04-05)
// ============================================================================

export interface UseBlastRadiusAnalysisProps {
  impactResults: ImpactResult[];
  changedEdgeId: string;
  originalCost: number;
  newCost: number;
  nodes: VisNode[];
  edges: VisEdge[];
}

export interface UseBlastRadiusAnalysisResult {
  // Data
  riskScore: BlastRadiusScore | null;
  countryAggregations: CountryFlowAggregation[];
  countrySummaries: CountrySummary[];
  recommendations: Recommendation[];
  rollbackPlan: RollbackPlan | null;
  zonedResults: ZonedImpactResult[];
  zoneSummaries: ZoneSummary[];

  // State
  isLoading: boolean;
  error: Error | null;

  // Actions
  exportPDF: () => Promise<void>;
  exportCSV: () => void;
  getFlowsByCountryPair: (src: string, dest: string) => ImpactResult[];
  getFlowsByType: (type: ImpactType) => ImpactResult[];
  getFlowsByZone: (zone: BlastZone) => ZonedImpactResult[];
}

// ============================================================================
// ZONE COLORS
// ============================================================================

export const ZONE_COLORS: Record<BlastZone, string> = {
  direct: '#ef4444',     // Red
  indirect: '#f97316',   // Orange
  secondary: '#eab308',  // Yellow
  unaffected: '#6b7280'  // Gray
};

// ============================================================================
// RISK COLORS
// ============================================================================

export const RISK_COLORS: Record<RiskLevel, { rgb: [number, number, number]; hex: string }> = {
  LOW: { rgb: [76, 175, 80], hex: '#4caf50' },
  MEDIUM: { rgb: [255, 193, 7], hex: '#ffc107' },
  HIGH: { rgb: [255, 152, 0], hex: '#ff9800' },
  CRITICAL: { rgb: [244, 67, 54], hex: '#f44336' }
};

// ============================================================================
// RISK THRESHOLDS
// ============================================================================

export const RISK_THRESHOLDS = {
  LOW_MAX: 19,
  MEDIUM_MAX: 39,
  HIGH_MAX: 69,
  CRITICAL_MIN: 70
};

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

export const SCORING_WEIGHTS = {
  FLOW_IMPACT_MAX: 40,
  COST_MAGNITUDE_MAX: 30,
  COUNTRY_DIVERSITY_MAX: 20,
  CRITICAL_PATHS_MAX: 10,
  COUNTRY_POINTS_PER: 3,
  CRITICAL_PATH_MULTIPLIER: 20
};
