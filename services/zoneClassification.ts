/**
 * Zone Classification Service
 * B04-06: Zone Classification Service (P1, 2pts)
 *
 * Classify impacted flows into blast radius zones:
 * - Zone 1 (Direct): Flows that traverse the changed link
 * - Zone 2 (Indirect): Flows rerouted due to cost change
 * - Zone 3 (Secondary): Flows affected by congestion on rerouted paths
 */

import { VisEdge } from '../types';
import {
  BlastZone,
  ImpactResult,
  ZonedImpactResult,
  ZoneSummary,
  ZONE_COLORS
} from '../types/blastRadius.types';

/**
 * Classify flows into blast radius zones
 */
export function classifyIntoZones(
  impactResults: ImpactResult[],
  changedEdgeId: string,
  edges: VisEdge[]
): ZonedImpactResult[] {
  const changedEdge = edges.find(e => e.id === changedEdgeId);

  if (!changedEdge) {
    return impactResults.map(r => ({
      ...r,
      zone: 'unaffected' as BlastZone,
      zoneReason: 'Changed edge not found'
    }));
  }

  const changedNodeFrom = changedEdge.from as string;
  const changedNodeTo = changedEdge.to as string;

  return impactResults.map(result => {
    // Zone 1: Direct - path traverses the changed link
    const oldPathHasLink = hasLink(result.oldPath, changedNodeFrom, changedNodeTo);
    const newPathHasLink = hasLink(result.newPath, changedNodeFrom, changedNodeTo);

    if (oldPathHasLink || newPathHasLink) {
      return {
        ...result,
        zone: 'direct' as BlastZone,
        zoneReason: oldPathHasLink && newPathHasLink
          ? 'Path continues to traverse changed link'
          : oldPathHasLink
            ? 'Flow moved away from changed link'
            : 'Flow now traverses changed link'
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

/**
 * Check if a path contains a specific link (in either direction)
 */
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

  return zones.map(zone => ({
    zone,
    flowCount: zonedResults.filter(r => r.zone === zone).length,
    flows: zonedResults.filter(r => r.zone === zone),
    color: ZONE_COLORS[zone]
  })).filter(z => z.flowCount > 0);
}

/**
 * Get zone statistics
 */
export function getZoneStatistics(zonedResults: ZonedImpactResult[]): {
  directCount: number;
  indirectCount: number;
  secondaryCount: number;
  unaffectedCount: number;
  totalCount: number;
  directPercentage: number;
  indirectPercentage: number;
  secondaryPercentage: number;
} {
  const directCount = zonedResults.filter(r => r.zone === 'direct').length;
  const indirectCount = zonedResults.filter(r => r.zone === 'indirect').length;
  const secondaryCount = zonedResults.filter(r => r.zone === 'secondary').length;
  const unaffectedCount = zonedResults.filter(r => r.zone === 'unaffected').length;
  const totalCount = zonedResults.length;

  return {
    directCount,
    indirectCount,
    secondaryCount,
    unaffectedCount,
    totalCount,
    directPercentage: totalCount > 0 ? (directCount / totalCount) * 100 : 0,
    indirectPercentage: totalCount > 0 ? (indirectCount / totalCount) * 100 : 0,
    secondaryPercentage: totalCount > 0 ? (secondaryCount / totalCount) * 100 : 0
  };
}

/**
 * Get flows by zone
 */
export function getFlowsByZone(
  zonedResults: ZonedImpactResult[],
  zone: BlastZone
): ZonedImpactResult[] {
  return zonedResults.filter(r => r.zone === zone);
}

/**
 * Get zone description
 */
export function getZoneDescription(zone: BlastZone): string {
  const descriptions: Record<BlastZone, string> = {
    direct: 'Flows that directly traverse the changed link',
    indirect: 'Flows rerouted due to the cost change propagation',
    secondary: 'Flows affected by network-wide cost recalculation',
    unaffected: 'Flows with no detected impact'
  };
  return descriptions[zone];
}

/**
 * Get zone severity
 */
export function getZoneSeverity(zone: BlastZone): 'high' | 'medium' | 'low' | 'none' {
  const severity: Record<BlastZone, 'high' | 'medium' | 'low' | 'none'> = {
    direct: 'high',
    indirect: 'medium',
    secondary: 'low',
    unaffected: 'none'
  };
  return severity[zone];
}

/**
 * Get zone color
 */
export function getZoneColor(zone: BlastZone): string {
  return ZONE_COLORS[zone];
}

/**
 * Calculate zone impact severity score
 */
export function calculateZoneImpactScore(zonedResults: ZonedImpactResult[]): number {
  const weights: Record<BlastZone, number> = {
    direct: 3,
    indirect: 2,
    secondary: 1,
    unaffected: 0
  };

  const totalWeight = zonedResults.reduce((sum, r) => sum + weights[r.zone], 0);
  const maxPossibleWeight = zonedResults.length * 3;

  return maxPossibleWeight > 0 ? (totalWeight / maxPossibleWeight) * 100 : 0;
}

/**
 * Group zoned results by country pair and zone
 */
export function groupByCountryAndZone(
  zonedResults: ZonedImpactResult[]
): Map<string, Map<BlastZone, ZonedImpactResult[]>> {
  const grouped = new Map<string, Map<BlastZone, ZonedImpactResult[]>>();

  zonedResults.forEach(result => {
    const countryPair = `${result.src.country || 'Unknown'} → ${result.dest.country || 'Unknown'}`;

    if (!grouped.has(countryPair)) {
      grouped.set(countryPair, new Map());
    }

    const zoneMap = grouped.get(countryPair)!;
    if (!zoneMap.has(result.zone)) {
      zoneMap.set(result.zone, []);
    }

    zoneMap.get(result.zone)!.push(result);
  });

  return grouped;
}

/**
 * Get most impacted countries by zone
 */
export function getMostImpactedCountriesByZone(
  zonedResults: ZonedImpactResult[],
  zone: BlastZone,
  limit: number = 5
): Array<{ country: string; flowCount: number; asSource: number; asDest: number }> {
  const countryStats = new Map<string, { asSource: number; asDest: number }>();

  const zoneFlows = zonedResults.filter(r => r.zone === zone);

  zoneFlows.forEach(flow => {
    const srcCountry = flow.src.country || 'Unknown';
    const destCountry = flow.dest.country || 'Unknown';

    if (!countryStats.has(srcCountry)) {
      countryStats.set(srcCountry, { asSource: 0, asDest: 0 });
    }
    if (!countryStats.has(destCountry)) {
      countryStats.set(destCountry, { asSource: 0, asDest: 0 });
    }

    countryStats.get(srcCountry)!.asSource++;
    countryStats.get(destCountry)!.asDest++;
  });

  return Array.from(countryStats.entries())
    .map(([country, stats]) => ({
      country,
      flowCount: stats.asSource + stats.asDest,
      asSource: stats.asSource,
      asDest: stats.asDest
    }))
    .sort((a, b) => b.flowCount - a.flowCount)
    .slice(0, limit);
}

/**
 * Validate zone classification results
 */
export function validateZoneClassification(
  zonedResults: ZonedImpactResult[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check that each result has exactly one zone
  zonedResults.forEach((result, index) => {
    if (!result.zone) {
      issues.push(`Result ${index}: missing zone classification`);
    }
    if (!result.zoneReason) {
      issues.push(`Result ${index}: missing zone reason`);
    }
  });

  // Check zone distribution is reasonable
  const stats = getZoneStatistics(zonedResults);
  if (stats.unaffectedCount === stats.totalCount && stats.totalCount > 0) {
    issues.push('Warning: all flows classified as unaffected');
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Export zone data for visualization
 */
export function exportZoneDataForVisualization(
  zonedResults: ZonedImpactResult[]
): {
  nodes: Array<{ id: string; zone: BlastZone; color: string }>;
  links: Array<{ source: string; target: string; zone: BlastZone; color: string }>;
} {
  const nodeZones = new Map<string, BlastZone>();
  const linkData: Array<{ source: string; target: string; zone: BlastZone; color: string }> = [];

  // Priority: direct > indirect > secondary > unaffected
  const zonePriority: Record<BlastZone, number> = {
    direct: 3,
    indirect: 2,
    secondary: 1,
    unaffected: 0
  };

  zonedResults.forEach(result => {
    // Track highest priority zone for each node
    const srcId = result.src.id;
    const destId = result.dest.id;

    const currentSrcPriority = zonePriority[nodeZones.get(srcId) || 'unaffected'];
    const currentDestPriority = zonePriority[nodeZones.get(destId) || 'unaffected'];
    const newPriority = zonePriority[result.zone];

    if (newPriority > currentSrcPriority) {
      nodeZones.set(srcId, result.zone);
    }
    if (newPriority > currentDestPriority) {
      nodeZones.set(destId, result.zone);
    }

    // Track link zones
    linkData.push({
      source: srcId,
      target: destId,
      zone: result.zone,
      color: ZONE_COLORS[result.zone]
    });
  });

  const nodes = Array.from(nodeZones.entries()).map(([id, zone]) => ({
    id,
    zone,
    color: ZONE_COLORS[zone]
  }));

  return { nodes, links: linkData };
}
