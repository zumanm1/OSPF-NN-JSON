/**
 * Path Comparison & ECMP Explorer Type Definitions
 * 01-PRD Backend Architecture
 */

import { VisNode, VisEdge } from '../types';

// ============================================================================
// PATH INFO TYPES
// ============================================================================

export interface RawPath {
  nodes: string[];
  edges: string[];
}

export interface PathMetrics {
  hopCount: number;
  totalCost: number;
  estimatedLatency: number;      // milliseconds
  minBandwidth: number;          // Mbps
  maxUtilization: number;        // percentage (0-1)
  sharedLinkCount: number;
  countriesTraversed: string[];
  diversityScore: number;        // 0-100
}

export interface PathInfo {
  id: string;
  source: string;
  destination: string;
  nodeSequence: string[];
  edgeSequence: string[];
  metrics: PathMetrics;
  color: string;
  isECMP: boolean;
  ecmpGroupId?: string;
}

// ============================================================================
// ECMP ANALYSIS TYPES
// ============================================================================

export interface ECMPPathResult {
  paths: PathInfo[];              // ALL equal-cost paths
  cost: number;                   // Optimal cost
  isECMP: boolean;                // true if multiple paths
  divergencePoints: DivergencePoint[];  // Nodes where paths split
  convergencePoints: ConvergencePoint[]; // Nodes where paths rejoin
  pathCount: number;              // Total paths found
}

export interface DivergencePoint {
  nodeId: string;
  outgoingBranches: number;
  pathIds: string[];
}

export interface ConvergencePoint {
  nodeId: string;
  incomingBranches: number;
  pathIds: string[];
}

export interface TopologyAnalysis {
  divergencePoints: DivergencePoint[];
  convergencePoints: ConvergencePoint[];
}

// ============================================================================
// LOAD BALANCING TYPES
// ============================================================================

export interface LoadBalancingInfo {
  distribution: Map<string, number>;  // pathId -> percentage
  perPathCapacity: Map<string, number>; // pathId -> Mbps
  totalCapacity: number;
  isBalanced: boolean;
  warnings: string[];
}

// ============================================================================
// ECMP GROUP TYPES
// ============================================================================

export interface ECMPGroup {
  groupId: string;
  source: string;
  destination: string;
  cost: number;
  paths: PathInfo[];
  divergencePoints: DivergencePoint[];
  convergencePoints: ConvergencePoint[];
  loadBalancing: LoadBalancingInfo;
}

// ============================================================================
// WHAT-IF SIMULATION TYPES
// ============================================================================

export interface WhatIfState {
  mode: 'failure' | 'cost_change';
  failedEdges: string[];
  costChanges: Map<string, number>;
  result: WhatIfResult | null;
}

export interface WhatIfResult {
  originalPaths: PathInfo[];
  simulatedPaths: PathInfo[];
  affectedPaths: string[];        // Path IDs that changed
  newPaths: string[];             // Paths that are new
  removedPaths: string[];         // Paths no longer possible
  costDelta: number;              // Total cost change
  summary: string;
}

// ============================================================================
// DIJKSTRA OPTIONS
// ============================================================================

export interface DijkstraOptions {
  maxPaths?: number;              // Limit enumeration (default: 10)
  includeSuboptimal?: boolean;    // Include non-ECMP paths
  timeout?: number;               // Max computation time (ms)
}

// ============================================================================
// EXPORT OPTIONS
// ============================================================================

export interface ExportOptions {
  includeNetworkDiagram: boolean;
  includeMetricsTable: boolean;
  includeECMPAnalysis: boolean;
  filename?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class PathNotFoundError extends Error {
  constructor(source: string, dest: string) {
    super(`No path exists from ${source} to ${dest}`);
    this.name = 'PathNotFoundError';
  }
}

export class ECMPLimitExceededError extends Error {
  constructor(actual: number, limit: number) {
    super(`ECMP path count (${actual}) exceeds limit (${limit})`);
    this.name = 'ECMPLimitExceededError';
  }
}

export class TimeoutError extends Error {
  constructor(operation: string, elapsed: number, limit: number) {
    super(`${operation} timed out after ${elapsed}ms (limit: ${limit}ms)`);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// CONTINENT MAPPING
// ============================================================================

export const CONTINENT_MAP: Record<string, string> = {
  'GBR': 'EU', 'DEU': 'EU', 'FRA': 'EU', 'PRT': 'EU', 'ITA': 'EU', 'ESP': 'EU', 'NLD': 'EU',
  'USA': 'NA', 'CAN': 'NA', 'MEX': 'NA',
  'ZAF': 'AF', 'LSO': 'AF', 'ZWE': 'AF', 'MOZ': 'AF', 'AGO': 'AF', 'NGA': 'AF', 'KEN': 'AF',
  'CHN': 'AS', 'JPN': 'AS', 'IND': 'AS', 'SGP': 'AS', 'KOR': 'AS',
  'AUS': 'OC', 'NZL': 'OC',
  'BRA': 'SA', 'ARG': 'SA', 'CHL': 'SA'
};

// ============================================================================
// PATH COLORS FOR VISUALIZATION
// ============================================================================

export const PATH_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#f97316', // Orange
  '#a855f7', // Purple
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#84cc16', // Lime
];
