import { VisNode, VisEdge } from '../types';
import { SPOF } from './spofDetection';

export interface ResilienceScore {
  overall: number;              // 1-10
  breakdown: {
    redundancy: number;         // 0-10: Link/path redundancy
    diversity: number;          // 0-10: Geographic diversity
    capacity: number;           // 0-10: Spare capacity
  };
  level: 'CRITICAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXCELLENT';
  improvements: string[];
}

export function calculateResilienceScore(
  nodes: VisNode[],
  edges: VisEdge[],
  spofs: SPOF[]
): ResilienceScore {
  // Factor 1: Redundancy (based on SPOF count)
  const redundancyScore = calculateRedundancyScore(spofs, nodes.length);

  // Factor 2: Geographic Diversity
  const diversityScore = calculateDiversityScore(nodes, edges);

  // Factor 3: Capacity Headroom
  const capacityScore = calculateCapacityScore(edges);

  // Weighted average
  const overall = Math.round(
    (redundancyScore * 0.4 + diversityScore * 0.3 + capacityScore * 0.3) * 10
  ) / 10;

  return {
    overall,
    breakdown: {
      redundancy: redundancyScore,
      diversity: diversityScore,
      capacity: capacityScore
    },
    level: classifyLevel(overall),
    improvements: generateImprovements(redundancyScore, diversityScore, capacityScore)
  };
}

function calculateRedundancyScore(spofs: SPOF[], nodeCount: number): number {
  // Penalize based on SPOF count and severity
  const criticalCount = spofs.filter(s => s.severity === 'CRITICAL').length;
  const highCount = spofs.filter(s => s.severity === 'HIGH').length;
  const mediumCount = spofs.filter(s => s.severity === 'MEDIUM').length;

  let score = 10;
  score -= criticalCount * 2.5;
  score -= highCount * 1.5;
  score -= mediumCount * 0.5;

  return Math.max(1, Math.min(10, score));
}

function calculateDiversityScore(nodes: VisNode[], edges: VisEdge[]): number {
  // Score based on country diversity
  const countries = new Set(nodes.map(n => n.country).filter(Boolean));
  if (countries.size === 0) return 5; // Default if no country data

  const avgConnectionsPerCountry = edges.length / countries.size;

  let score = 5; // Base score

  // Bonus for many countries
  if (countries.size >= 10) score += 2;
  else if (countries.size >= 5) score += 1;

  // Bonus for high inter-country connectivity
  if (avgConnectionsPerCountry >= 5) score += 2;
  else if (avgConnectionsPerCountry >= 3) score += 1;

  return Math.min(10, score);
}

function calculateCapacityScore(edges: VisEdge[]): number {
  // Score based on available capacity
  const edgesWithCapacity = edges.filter(e =>
    e.sourceCapacity?.total_capacity_mbps
  );

  if (edgesWithCapacity.length === 0) return 5; // Unknown, assume average

  const avgUtilization = edgesWithCapacity.reduce((sum, e) => {
    const used = e.sourceCapacity?.current_bandwidth_mbps || 0;
    const total = e.sourceCapacity?.total_capacity_mbps || 1;
    return sum + (used / total);
  }, 0) / edgesWithCapacity.length;

  // Lower utilization = higher score
  if (avgUtilization < 0.3) return 10;
  if (avgUtilization < 0.5) return 8;
  if (avgUtilization < 0.7) return 6;
  if (avgUtilization < 0.85) return 4;
  return 2;
}

function classifyLevel(score: number): 'CRITICAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXCELLENT' {
  if (score >= 9) return 'EXCELLENT';
  if (score >= 7) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  if (score >= 3) return 'LOW';
  return 'CRITICAL';
}

function generateImprovements(
  redundancy: number,
  diversity: number,
  capacity: number
): string[] {
  const improvements: string[] = [];

  if (redundancy < 7) {
    improvements.push('Add redundant links to eliminate single points of failure');
  }
  if (diversity < 7) {
    improvements.push('Increase geographic diversity with links to additional countries');
  }
  if (capacity < 7) {
    improvements.push('Upgrade link capacity or add parallel links to reduce utilization');
  }

  return improvements;
}
