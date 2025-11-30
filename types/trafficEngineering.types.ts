/**
 * Traffic Engineering & Cost Optimization Type Definitions
 * 03-PRD Backend Architecture
 */

// ============================================================================
// TRAFFIC MATRIX TYPES
// ============================================================================

export type TrafficMatrix = Map<string, Map<string, number>>; // src -> dest -> Mbps

export type TrafficModel = 'uniform' | 'population' | 'distance' | 'custom';

export interface TrafficGenerationOptions {
  model: TrafficModel;
  baseTraffic: number;           // Mbps per flow
  scaleFactor: number;           // Multiplier
  customWeights?: Map<string, number>; // Node ID -> importance
}

// ============================================================================
// UTILIZATION TYPES
// ============================================================================

export interface UtilizationResult {
  edgeUtilization: Map<string, number>;     // edgeId -> utilization (0-1)
  edgeTraffic: Map<string, number>;         // edgeId -> Mbps
  maxUtilization: number;
  avgUtilization: number;
  congestedEdges: string[];                 // edges > 80%
  underutilizedEdges: string[];             // edges < 20%
}

// ============================================================================
// OPTIMIZATION TYPES
// ============================================================================

export type OptimizationGoalType = 'balance' | 'latency' | 'diversity' | 'cost' | 'custom';

export interface OptimizationGoal {
  type: OptimizationGoalType;
  customObjective?: (util: UtilizationResult) => number;
}

export interface OptimizationConstraints {
  maxCostChangePercent: number;    // 0.1 - 1.0 (10% - 100%)
  maxChangesCount: number;         // Max number of cost changes
  protectedEdges: Set<string>;     // Edges that cannot be changed
  minCost: number;                 // Default: 1
  maxCost: number;                 // Default: 65535
}

export interface CostChange {
  edgeId: string;
  edgeLabel: string;
  oldCost: number;
  newCost: number;
  changePercent: number;
  impact: {
    flowsAffected: number;
    utilizationDelta: number;
  };
}

export interface OptimizationMetrics {
  oldMaxUtil: number;
  newMaxUtil: number;
  oldAvgUtil: number;
  newAvgUtil: number;
  congestedReduction: number;
  pathsChanged: number;
}

export interface OptimizationResult {
  proposedCosts: Map<string, number>;  // edgeId -> new cost
  changes: CostChange[];
  improvement: OptimizationMetrics;
  iterations: number;
  converged: boolean;
}

// ============================================================================
// CONGESTION ANALYSIS TYPES
// ============================================================================

export interface CongestionHotspot {
  edgeId: string;
  edgeLabel: string;
  utilization: number;
  traffic: number;
  capacity: number;
  flowsTraversing: number;
  rootCause: string;
  recommendations: string[];
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  code: string;
  message: string;
  edgeId?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  edgeId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ============================================================================
// ALTERNATE PATH TYPES
// ============================================================================

export interface AlternatePath {
  edgeId: string;
  pathCost: number;
  flowCount: number;
  utilizationAfter: number;
}

// ============================================================================
// COUNTRY POPULATIONS (for traffic modeling)
// ============================================================================

export const COUNTRY_POPULATIONS: Record<string, number> = {
  'GBR': 67,
  'USA': 331,
  'DEU': 83,
  'FRA': 67,
  'ZAF': 60,
  'LSO': 2,
  'ZWE': 15,
  'MOZ': 31,
  'AGO': 33,
  'PRT': 10,
  'NGA': 206,
  'KEN': 54,
  'CAN': 38,
  'MEX': 129,
  'BRA': 213,
  'ARG': 45,
  'CHN': 1400,
  'JPN': 126,
  'IND': 1380,
  'AUS': 26
};

// ============================================================================
// OSPF COST LIMITS
// ============================================================================

export const OSPF_COST_LIMITS = {
  MIN: 1,
  MAX: 65535,
  DEFAULT: 10
};

// ============================================================================
// UTILIZATION THRESHOLDS
// ============================================================================

export const UTILIZATION_THRESHOLDS = {
  CONGESTED: 0.8,      // > 80% is congested
  HIGH: 0.7,           // > 70% is high
  MODERATE: 0.5,       // > 50% is moderate
  LOW: 0.2             // < 20% is underutilized
};

// ============================================================================
// UTILIZATION COLORS (for heatmap)
// ============================================================================

export const UTILIZATION_COLORS = {
  low: '#22c55e',      // Green: <50%
  medium: '#eab308',   // Yellow: 50-80%
  high: '#f97316',     // Orange: 80-90%
  critical: '#ef4444'  // Red: >90%
};

export function getUtilizationColor(utilization: number): string {
  if (utilization < 0.5) return UTILIZATION_COLORS.low;
  if (utilization < 0.8) return UTILIZATION_COLORS.medium;
  if (utilization < 0.9) return UTILIZATION_COLORS.high;
  return UTILIZATION_COLORS.critical;
}
