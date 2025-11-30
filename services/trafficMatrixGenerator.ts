import { VisNode, VisEdge } from '../types';

export type TrafficMatrix = Map<string, Map<string, number>>; // src -> dest -> Mbps

export interface TrafficGenerationOptions {
  model: 'uniform' | 'population' | 'distance' | 'custom';
  baseTraffic: number;           // Mbps per flow
  scaleFactor: number;           // Multiplier
  customWeights?: Map<string, number>; // Node ID -> importance
}

// Country populations (millions) for weighted traffic
const COUNTRY_POPULATIONS: Record<string, number> = {
  'GBR': 67, 'USA': 331, 'DEU': 83, 'FRA': 67,
  'ZAF': 60, 'LSO': 2, 'ZWE': 15, 'MOZ': 31,
  'AGO': 33, 'PRT': 10
};

export function generateTrafficMatrix(
  nodes: VisNode[],
  options: TrafficGenerationOptions = { model: 'population', baseTraffic: 100, scaleFactor: 1 }
): TrafficMatrix {
  const matrix: TrafficMatrix = new Map();

  nodes.forEach(src => {
    matrix.set(src.id, new Map());

    nodes.forEach(dest => {
      if (src.id === dest.id) return;

      let traffic: number;

      switch (options.model) {
        case 'uniform':
          traffic = options.baseTraffic;
          break;

        case 'population':
          const srcPop = COUNTRY_POPULATIONS[src.country || ''] || 10;
          const destPop = COUNTRY_POPULATIONS[dest.country || ''] || 10;
          traffic = Math.sqrt(srcPop * destPop) * options.baseTraffic / 10;
          break;

        case 'distance':
          // Less traffic to distant nodes
          const sameCountry = src.country === dest.country;
          traffic = sameCountry
            ? options.baseTraffic * 2
            : options.baseTraffic * 0.5;
          break;

        case 'custom':
          const srcWeight = options.customWeights?.get(src.id) || 1;
          const destWeight = options.customWeights?.get(dest.id) || 1;
          traffic = options.baseTraffic * srcWeight * destWeight;
          break;

        default:
          traffic = options.baseTraffic;
      }

      matrix.get(src.id)!.set(dest.id, traffic * options.scaleFactor);
    });
  });

  return matrix;
}

export function calculateTotalTraffic(matrix: TrafficMatrix): number {
  let total = 0;
  matrix.forEach(destMap => {
    destMap.forEach(traffic => {
      total += traffic;
    });
  });
  return total;
}
