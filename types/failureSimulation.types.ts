/**
 * Failure Impact Simulator Type Definitions
 * 02-PRD Backend Architecture
 */

import { VisNode, VisEdge } from '../types';

// ============================================================================
// FAILURE MODE TYPES
// ============================================================================

export type FailureMode = 'single' | 'multi' | 'cascade';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// ============================================================================
// CONNECTIVITY TYPES
// ============================================================================

export interface ConnectivityResult {
  isFullyConnected: boolean;
  componentCount: number;
  largestComponent: string[];
  isolatedNodes: string[];
  partitions: string[][];
}

// ============================================================================
// SPOF TYPES
// ============================================================================

export interface SPOFImpact {
  pathsAffected: number;
  nodesIsolated: number;
  causesPartition: boolean;
  partitionSizes: number[];
}

export interface SPOF {
  elementId: string;
  elementType: 'node' | 'edge';
  label: string;
  impact: SPOFImpact;
  severity: Severity;
  recommendation: string;
}

export interface SPOFAnalysisOptions {
  includeNodes?: boolean;      // Test node failures (default: true)
  includeEdges?: boolean;      // Test edge failures (default: true)
  maxSPOFs?: number;           // Limit results (default: 20)
  severityThreshold?: Severity; // Minimum severity to include
}

// ============================================================================
// IMPACT METRICS TYPES
// ============================================================================

export interface ImpactMetrics {
  pathsAffected: number;
  totalPaths: number;
  percentAffected: number;
  convergenceTime: number;        // Estimated SPF convergence time (seconds)
  isolatedNodes: string[];
  isPartitioned: boolean;
  partitionCount: number;
  reroutablePaths: number;        // Paths that have alternates
  brokenPaths: number;            // Paths with no alternate
  affectedCountries: string[];
}

// ============================================================================
// RESILIENCE SCORE TYPES
// ============================================================================

export interface ResilienceBreakdown {
  redundancy: number;         // 0-10: Link/path redundancy
  diversity: number;          // 0-10: Geographic diversity
  capacity: number;           // 0-10: Spare capacity
}

export interface ResilienceScore {
  overall: number;              // 1-10
  breakdown: ResilienceBreakdown;
  level: 'CRITICAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXCELLENT';
  improvements: string[];
}

// ============================================================================
// FAILURE SCENARIO TYPES
// ============================================================================

export interface FailureScenario {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  failedNodes: string[];
  failedEdges: string[];
  mode: FailureMode;
}

export interface FailureScenarioTemplate {
  name: string;
  description: string;
  failedNodes: string[];
  failedEdges: string[];
  mode: FailureMode;
}

// ============================================================================
// AFFECTED FLOW TYPES
// ============================================================================

export type FlowStatus = 'REROUTED' | 'BROKEN' | 'UNAFFECTED';

export interface AffectedFlow {
  source: string;
  destination: string;
  oldPath: string[];
  newPath: string[] | null;    // null if path broken
  costDelta: number;
  status: FlowStatus;
}

// ============================================================================
// SIMULATION RESULT TYPES
// ============================================================================

export interface SimulationResult {
  metrics: ImpactMetrics;
  connectivity: ConnectivityResult;
  affectedFlows: AffectedFlow[];
  recommendations: string[];
}

// ============================================================================
// CRITICAL ELEMENT TYPES
// ============================================================================

export interface CriticalElement {
  elementId: string;
  elementType: 'node' | 'edge';
  label: string;
  criticality: number; // 0-100
  reason: string;
}

// ============================================================================
// SCENARIO STORAGE CONSTANTS
// ============================================================================

export const FAILURE_SCENARIOS_STORAGE_KEY = 'ospf-failure-scenarios';

export const DEFAULT_SCENARIO_TEMPLATES: FailureScenarioTemplate[] = [
  {
    name: 'Data Center Outage',
    description: 'Simulates complete failure of a data center node',
    failedNodes: [],
    failedEdges: [],
    mode: 'single'
  },
  {
    name: 'ISP Link Failure',
    description: 'Simulates failure of primary ISP connection',
    failedNodes: [],
    failedEdges: [],
    mode: 'single'
  },
  {
    name: 'Backbone Link Cut',
    description: 'Simulates fiber cut on backbone link',
    failedNodes: [],
    failedEdges: [],
    mode: 'single'
  },
  {
    name: 'Regional Outage',
    description: 'Simulates multiple failures in a region',
    failedNodes: [],
    failedEdges: [],
    mode: 'multi'
  }
];

// ============================================================================
// SEVERITY THRESHOLDS
// ============================================================================

export const SEVERITY_THRESHOLDS = {
  CRITICAL: { minPercent: 50, minPartitions: 3 },
  HIGH: { minPercent: 25, minPartitions: 2 },
  MEDIUM: { minPercent: 10, minPartitions: 0 },
  LOW: { minPercent: 0, minPartitions: 0 }
};

// ============================================================================
// CONVERGENCE TIME CONSTANTS
// ============================================================================

export const OSPF_CONVERGENCE = {
  SPF_DELAY_DEFAULT: 5,        // seconds
  SPF_CALC_PER_NODE: 0.001,    // seconds per node
  LSA_PROPAGATION_FACTOR: 0.05 // seconds per hop (log2 of node count)
};
