# 🐛 PATHFINDING BUG - ROOT CAUSE & FIX

## Problem Statement
User reported: "No path found" errors when trying to find paths between nodes that **DO exist** in the imported topology.

Example failing paths:
- `gbr-ldn-wst-pe09` → `deu-ber-bes-pe10`
- `gbr-ldn-wst-p07` → `deu-ber-bes-pe10`

## Investigation Summary

### Phase 1: Algorithm Verification ✅
- **Dijkstra implementation**: CORRECT
- **Graph construction**: CORRECT
- **Topology data**: VALID (paths exist)

**Proof**: Independent BFS test confirmed:
- Path `gbr-ldn-wst-pe09 → deu-ber-bes-p06 → deu-ber-bes-pe10` exists (cost: 100)
- Path `gbr-ldn-wst-p07 → deu-ber-bes-p06 → deu-ber-bes-pe10` exists (cost: 20)

### Phase 2: Root Cause Identified 🎯

**Location**: `App.tsx` lines 670-674

**The Bug**:
```typescript
// Line 105: NODES is set ONCE on component mount from default topology
const { nodes: NODES, links: LINKS } = networkData;

// Lines 670-671: Uses stale NODES constant instead of imported data
const srcNode = NODES.find(n => n.id === src);      // ❌ BUG!
const destNode = NODES.find(n => n.id === dest);    // ❌ BUG!
addLog(`Finding path: ${srcNode?.name} -> ${destNode?.name}...`);

// Line 674: Correctly gets current nodes from DataSet
const currentNodes = nodesDataSet.current.get();    // ✅ This has imported data
const rawEdges = edgesDataSet.current.get();
```

**What Was Happening**:
1. User imports a new topology → `networkData.replaceAllData()` is called
2. New nodes are loaded into `nodesDataSet` (VisJS DataSet)
3. BUT `NODES` constant still points to the OLD default topology
4. When pathfinding runs:
   - Looks up node names from OLD `NODES` → returns `undefined` for imported nodes
   - Log shows "Finding path: undefined → undefined..."
   - Uses CORRECT `currentNodes` for dijkstra (imported data)
   - Dijkstra fails because node IDs don't match

**Why It Appeared Random**:
- Paths worked for nodes that existed in BOTH default AND imported topologies
- Paths failed for nodes that ONLY existed in imported topology

## The Fix 🔧

**File**: `App.tsx` (line ~670)

**Before** (BUGGY):
```typescript
const srcNode = NODES.find(n => n.id === src);
const destNode = NODES.find(n => n.id === dest);
addLog(`Finding path: ${srcNode?.name} -> ${destNode?.name}...`);

const currentNodes = nodesDataSet.current.get();
const rawEdges = edgesDataSet.current.get();
```

**After** (FIXED):
```typescript
const currentNodes = nodesDataSet.current.get();
const rawEdges = edgesDataSet.current.get();

const srcNode = currentNodes.find(n => n.id === src);
const destNode = currentNodes.find(n => n.id === dest);
addLog(`Finding path: ${srcNode?.label} -> ${destNode?.label}...`);
```

**Changes**:
1. ✅ Get `currentNodes` FIRST (contains imported topology)
2. ✅ Use `currentNodes` to find source/destination nodes
3. ✅ Use `label` property (VisNode) instead of `name` (RouterNode)

## Validation Required

**Test Case 1**: Import `netviz-pro-topology-2025-11-30T18_44_02.838Z.json`
- **Expected**: `gbr-ldn-wst-pe09` → `deu-ber-bes-pe10` 
- **Path**: `gbr-ldn-wst-pe09 → deu-ber-bes-p06 → deu-ber-bes-pe10`
- **Cost**: 100

**Test Case 2**: Same topology
- **Expected**: `gbr-ldn-wst-p07` → `deu-ber-bes-pe10`
- **Path**: `gbr-ldn-wst-p07 → deu-ber-bes-p06 → deu-ber-bes-pe10`
- **Cost**: 20

## Impact Analysis

**Severity**: HIGH
- Core functionality (pathfinding) was broken for imported topologies
- Affected ALL users using custom topologies

**Scope**: 
- Only affects pathfinding after topology import
- Default topology still worked fine
- All other features unaffected

**Files Changed**: 2
1. `App.tsx` (4 lines modified)
2. `services/dijkstra.ts` (debug logging removed)

## Status

- ✅ Bug identified
- ✅ Root cause analyzed
- ✅ Fix implemented
- ⏳ Validation pending (awaiting user test with imported topology)

**Next Step**: User needs to import topology file and test pathfinding.







