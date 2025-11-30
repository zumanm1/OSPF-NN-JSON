import { VisNode, VisEdge } from '../types';
import { TrafficMatrix } from './trafficMatrixGenerator';
import { dijkstraDirected } from './dijkstra';

export interface UtilizationResult {
  edgeUtilization: Map<string, number>;     // edgeId -> utilization (0-1)
  edgeTraffic: Map<string, number>;         // edgeId -> Mbps
  maxUtilization: number;
  avgUtilization: number;
  congestedEdges: string[];                 // edges > 80%
  underutilizedEdges: string[];             // edges < 20%
}

export function calculateUtilization(
  nodes: VisNode[],
  edges: VisEdge[],
  trafficMatrix: TrafficMatrix
): UtilizationResult {
  const edgeTraffic = new Map<string, number>();

  // Initialize all edges to 0 traffic
  edges.forEach(e => edgeTraffic.set(e.id, 0));

  // For each source-destination pair, route traffic along shortest path
  trafficMatrix.forEach((destMap, srcId) => {
    destMap.forEach((traffic, destId) => {
      // Get shortest path
      const path = dijkstraDirected(srcId, destId, nodes, edges);

      if (path) {
        // Add traffic to each edge in path
        path.edges.forEach(edgeId => {
          const current = edgeTraffic.get(edgeId) || 0;
          edgeTraffic.set(edgeId, current + traffic);
        });
      }
    });
  });

  // Calculate utilization (traffic / capacity)
  const edgeUtilization = new Map<string, number>();
  const congestedEdges: string[] = [];
  const underutilizedEdges: string[] = [];
  let totalUtilization = 0;
  let edgeCount = 0;

  edges.forEach(edge => {
    const traffic = edgeTraffic.get(edge.id) || 0;
    const capacity = edge.sourceCapacity?.total_capacity_mbps || 10000; // Default 10Gbps
    const utilization = traffic / capacity;

    edgeUtilization.set(edge.id, Math.min(utilization, 1)); // Cap at 100%

    if (utilization > 0.8) {
      congestedEdges.push(edge.id);
    } else if (utilization < 0.2) {
      underutilizedEdges.push(edge.id);
    }

    totalUtilization += utilization;
    edgeCount++;
  });

  const maxUtilization = Math.max(...Array.from(edgeUtilization.values()));
  const avgUtilization = edgeCount > 0 ? totalUtilization / edgeCount : 0;

  return {
    edgeUtilization,
    edgeTraffic,
    maxUtilization,
    avgUtilization,
    congestedEdges,
    underutilizedEdges
  };
}
