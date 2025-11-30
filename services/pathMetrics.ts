import { VisNode, VisEdge } from '../types';
import { PathInfo } from './dijkstraEnhanced';

export interface PathMetrics {
  hopCount: number;
  totalCost: number;
  estimatedLatency: number;      // milliseconds
  minBandwidth: number;          // Mbps
  maxUtilization: number;        // percentage
  sharedLinkCount: number;
  countriesTraversed: string[];
  diversityScore: number;        // 0-100
}

interface RawPath {
  nodes: string[];
  edges: string[];
}

export function calculatePathMetrics(
  path: PathInfo,
  edges: VisEdge[],
  nodes: VisNode[],
  otherPaths?: PathInfo[]
): PathMetrics {
  const pathEdges = path.edgeSequence.map(edgeId =>
    edges.find(e => e.id === edgeId)!
  ).filter(e => e !== undefined);

  const pathNodes = path.nodeSequence.map(nodeId =>
    nodes.find(n => n.id === nodeId)!
  ).filter(n => n !== undefined);

  const rawPath: RawPath = { nodes: path.nodeSequence, edges: path.edgeSequence };
  const rawOtherPaths: RawPath[] | undefined = otherPaths?.map(p => ({ nodes: p.nodeSequence, edges: p.edgeSequence }));

  return {
    hopCount: calculateHopCount(path.nodeSequence),
    totalCost: calculateTotalCost(pathEdges),
    estimatedLatency: estimateLatency(pathEdges, pathNodes),
    minBandwidth: calculateMinBandwidth(pathEdges),
    maxUtilization: calculateMaxUtilization(pathEdges),
    sharedLinkCount: countSharedLinks(path.edgeSequence, rawOtherPaths),
    countriesTraversed: getCountriesTraversed(pathNodes),
    diversityScore: calculateDiversityScore(rawPath, rawOtherPaths)
  };
}

function calculateHopCount(nodes: string[]): number {
  return Math.max(0, nodes.length - 1);
}

function calculateTotalCost(edges: VisEdge[]): number {
  return edges.reduce((sum, e) => sum + e.cost, 0);
}

function estimateLatency(edges: VisEdge[], nodes: VisNode[]): number {
  // Base: 1ms switching delay per hop
  let latency = Math.max(0, (nodes.length - 1) * 1);

  // Add propagation delay based on countries (rough estimate)
  // Cross-continent: +50ms per hop
  // Same continent: +5ms per hop
  for (let i = 0; i < nodes.length - 1; i++) {
    const srcCountry = nodes[i].country;
    const destCountry = nodes[i + 1].country;

    if (srcCountry && destCountry && srcCountry !== destCountry) {
      // Different countries - estimate based on continent
      const srcContinent = getContinent(srcCountry);
      const destContinent = getContinent(destCountry);

      if (srcContinent !== destContinent) {
        latency += 50; // Intercontinental
      } else {
        latency += 10; // Same continent, different country
      }
    } else {
      latency += 2; // Same country or unknown
    }
  }

  return latency;
}

function calculateMinBandwidth(edges: VisEdge[]): number {
  if (edges.length === 0) return 0;
  // Assuming edges have a capacity property or default to 10000 Mbps
  const capacities = edges.map(e =>
    e.sourceCapacity?.total_capacity_mbps || 10000
  );
  return Math.min(...capacities);
}

function calculateMaxUtilization(edges: VisEdge[]): number {
    if (edges.length === 0) return 0;
    // Placeholder: return random utilization or 0 if data not available
    // Real implementation needs current traffic data
    return 0; 
}

function countSharedLinks(
  pathEdges: string[],
  otherPaths?: RawPath[]
): number {
  if (!otherPaths || otherPaths.length === 0) return 0;

  const pathEdgeSet = new Set(pathEdges);
  let sharedCount = 0;

  otherPaths.forEach(other => {
    other.edges.forEach(edgeId => {
      if (pathEdgeSet.has(edgeId)) sharedCount++;
    });
  });

  return sharedCount;
}

function getCountriesTraversed(nodes: VisNode[]): string[] {
  const countries: string[] = [];
  let lastCountry = '';

  nodes.forEach(node => {
    if (node.country && node.country !== lastCountry) {
      countries.push(node.country);
      lastCountry = node.country;
    }
  });

  return countries;
}

function calculateDiversityScore(path: RawPath, otherPaths?: RawPath[]): number {
    // Simple diversity score: 100 - (percentage of shared links)
    if (!otherPaths || otherPaths.length === 0) return 100;
    
    const totalLinks = path.edges.length;
    if (totalLinks === 0) return 100;

    const shared = countSharedLinks(path.edges, otherPaths);
    // Normalize against number of other paths? For now, just raw count ratio might exceed 100 if multiple paths share
    // Let's treat it as: if any link is shared with ANY other path, it reduces diversity
    const uniqueLinks = path.edges.filter(eId => !otherPaths.some(op => op.edges.includes(eId))).length;
    
    return Math.round((uniqueLinks / totalLinks) * 100);
}

function getContinent(countryCode: string): string {
  const continentMap: Record<string, string> = {
    'GBR': 'EU', 'DEU': 'EU', 'FRA': 'EU', 'PRT': 'EU',
    'USA': 'NA', 'CAN': 'NA',
    'ZAF': 'AF', 'LSO': 'AF', 'ZWE': 'AF', 'MOZ': 'AF', 'AGO': 'AF',
    // Add more as needed
  };
  return continentMap[countryCode] || 'UNKNOWN';
}
