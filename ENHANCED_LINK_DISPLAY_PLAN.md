# Enhanced Link Information Display - Implementation Plan

## Current Gap
The application currently displays only basic link information (cost, interfaces). The imported JSON contains rich metadata that is not being utilized:
- Link speed and capacity
- Bundle information
- Traffic utilization
- Asymmetric link indicators
- Link status

## Proposed Enhancement

### 1. Enhanced Link Tooltip
Display comprehensive link information on hover:
```
┌─────────────────────────────────────┐
│ deu-r10 → usa-r5                    │
├─────────────────────────────────────┤
│ Forward: Gi0/0/0/1 → Gi0/0/0/1      │
│ Cost: 600 → 800 (Asymmetric)        │
│ Capacity: 1G (1000 Mbps)            │
│ Utilization: 0%                     │
│ Status: ✅ UP                        │
│ Type: Asymmetric Link               │
└─────────────────────────────────────┘
```

### 2. Enhanced Edge Labels
Show key metrics directly on the graph:
```
Gi0/0/0/1 [1G]
Cost: 600/800
```

### 3. Link Inspector Panel
When a link is selected, show detailed information:
- Interface details
- Capacity breakdown (bundle members if applicable)
- Traffic statistics
- Historical utilization
- Link type and status

### 4. Import Handler Enhancement
Preserve all metadata when importing this rich format:
- Detect `netviz-pro-1.0` format
- Map all fields to internal data structure
- Store in edge metadata

## Implementation Steps

1. Update VisEdge type to include all fields
2. Enhance handleImportTopology to preserve metadata
3. Update edge tooltip generation
4. Create enhanced Link Inspector component
5. Add capacity/utilization visualization
6. Validate with Puppeteer
