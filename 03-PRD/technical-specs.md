# Technical Specifications: Traffic Engineering

## Core Algorithm: Greedy Heuristic

```typescript
function optimizeCosts(
  edges: VisEdge[],
  trafficMatrix: TrafficMatrix
): OptimizationResult {
  // Iteratively shift traffic from congested to underutilized links
  // by adjusting costs
}
```

## Key Components:
- `services/trafficOptimization.ts` - Core optimization algorithm
- `services/utilizationCalculation.ts` - Traffic-to-utilization mapping
- `components/TrafficEngineeringModal.tsx` - Main UI

## Traffic Model:
- Synthetic traffic based on country populations
- Future: Import NetFlow/sFlow data
- Utilization = Sum(flows on link) / Link capacity

## Optimization Goals:
1. Balance Traffic: Minimize max link utilization
2. Minimize Latency: Prefer shorter paths
3. Geographic Diversity: Spread across countries

See main README.md for full algorithm details.
