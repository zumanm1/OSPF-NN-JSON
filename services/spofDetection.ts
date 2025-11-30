import { VisNode, VisEdge } from '../types';
import { analyzeConnectivity, ConnectivityResult } from './connectivityAnalysis';

export interface SPOF {
  elementId: string;
  elementType: 'node' | 'edge';
  label: string;
  impact: {
    pathsAffected: number;
    nodesIsolated: number;
    causesPartition: boolean;
    partitionSizes: number[];
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

export interface SPOFAnalysisOptions {
  includeNodes?: boolean;      // Test node failures (default: true)
  includeEdges?: boolean;      // Test edge failures (default: true)
  maxSPOFs?: number;           // Limit results (default: 20)
  severityThreshold?: string;  // Minimum severity to include
}

export function detectSPOFs(
  nodes: VisNode[],
  edges: VisEdge[],
  options: SPOFAnalysisOptions = {}
): SPOF[] {
  const {
    includeNodes = true,
    includeEdges = true,
    maxSPOFs = 20
  } = options;

  const spofs: SPOF[] = [];
  const totalPaths = nodes.length * (nodes.length - 1);

  // Test each edge for SPOF
  if (includeEdges) {
    for (const edge of edges) {
      const connectivity = analyzeConnectivity(
        nodes, edges,
        new Set(),
        new Set([edge.id])
      );

      if (!connectivity.isFullyConnected || connectivity.isolatedNodes.length > 0) {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);

        const pathsAffected = estimateAffectedPaths(
          nodes, edges, connectivity
        );

        spofs.push({
          elementId: edge.id,
          elementType: 'edge',
          label: `${fromNode?.label || edge.from} ↔ ${toNode?.label || edge.to}`,
          impact: {
            pathsAffected,
            nodesIsolated: connectivity.isolatedNodes.length,
            causesPartition: connectivity.partitions.length > 1,
            partitionSizes: connectivity.partitions.map(p => p.length)
          },
          severity: calculateSeverity(pathsAffected, totalPaths, connectivity),
          recommendation: generateRecommendation('edge', fromNode, toNode)
        });
      }
    }
  }

  // Test each node for SPOF
  if (includeNodes) {
    for (const node of nodes) {
      const connectivity = analyzeConnectivity(
        nodes, edges,
        new Set([node.id]),
        new Set()
      );

      if (!connectivity.isFullyConnected || connectivity.isolatedNodes.length > 0) {
        const pathsAffected = estimateAffectedPaths(
          nodes, edges, connectivity
        );

        spofs.push({
          elementId: node.id,
          elementType: 'node',
          label: node.label || node.id,
          impact: {
            pathsAffected,
            nodesIsolated: connectivity.isolatedNodes.length + 1, // +1 for the failed node itself
            causesPartition: connectivity.partitions.length > 1,
            partitionSizes: connectivity.partitions.map(p => p.length)
          },
          severity: calculateSeverity(pathsAffected, totalPaths, connectivity),
          recommendation: generateRecommendation('node', node)
        });
      }
    }
  }

  // Sort by severity (CRITICAL > HIGH > MEDIUM > LOW)
  const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  spofs.sort((a, b) =>
    severityOrder[b.severity] - severityOrder[a.severity] ||
    b.impact.pathsAffected - a.impact.pathsAffected
  );

  return spofs.slice(0, maxSPOFs);
}

function calculateSeverity(
  pathsAffected: number,
  totalPaths: number,
  connectivity: ConnectivityResult
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const percentAffected = (pathsAffected / totalPaths) * 100;

  if (connectivity.partitions.length > 2 || percentAffected > 50) {
    return 'CRITICAL';
  }
  if (connectivity.partitions.length === 2 || percentAffected > 25) {
    return 'HIGH';
  }
  if (connectivity.isolatedNodes.length > 0 || percentAffected > 10) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function estimateAffectedPaths(
  nodes: VisNode[],
  edges: VisEdge[],
  connectivity: ConnectivityResult
): number {
  if (connectivity.isFullyConnected) {
    return connectivity.isolatedNodes.length * (nodes.length - 1) * 2;
  }

  // Cross-partition paths are all affected
  let affected = 0;
  for (let i = 0; i < connectivity.partitions.length; i++) {
    for (let j = i + 1; j < connectivity.partitions.length; j++) {
      affected += connectivity.partitions[i].length * connectivity.partitions[j].length * 2;
    }
  }

  return affected;
}

function generateRecommendation(
  type: 'node' | 'edge',
  ...elements: (VisNode | undefined)[]
): string {
  if (type === 'edge') {
    const [from, to] = elements;
    return `Add redundant link between ${from?.country || 'Unknown'} and ${to?.country || 'Unknown'} regions to eliminate this SPOF`;
  } else {
    const [node] = elements;
    return `Deploy redundant router in ${node?.country || 'Unknown'} region or add bypass links`;
  }
}
