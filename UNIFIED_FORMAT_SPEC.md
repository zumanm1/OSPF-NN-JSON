# OSPF Visualizer Pro - Unified Import/Export Specification

## Problem Statement
The three views (Visualizer, Designer, Planner) currently export incompatible data formats, preventing cross-view data loading and creating a fragmented user experience.

## Root Cause Analysis
1. **Visualizer** exports complete topology (nodes + links)
2. **Designer** exports only nodes
3. **Planner** exports scenario changes (array format)

This violates the principle of **data portability** and **single source of truth**.

## Proposed Solution: Unified Format

### Universal Export Format
```json
{
  "version": "1.0",
  "type": "ospf-topology",
  "exportedFrom": "visualizer|designer|planner",
  "exportedAt": "2025-11-29T10:00:00.000Z",
  "data": {
    "nodes": [...],
    "links": [...],
    "scenarios": [...],
    "visualConfig": {...},
    "metadata": {...}
  }
}
```

### Benefits
1. **Interoperability** - Any view can load any export
2. **Version Control** - Track format changes
3. **Extensibility** - Easy to add new fields
4. **Validation** - Clear schema for error checking

## Implementation Plan

### Phase 1: Update Export Functions
- Modify `handleExport` to use unified format
- Update `handleExportDesign` to include all data
- Update `handleSaveScenario` to use unified format

### Phase 2: Update Import Functions
- Create unified import handler
- Add format detection and migration
- Implement backward compatibility

### Phase 3: Validation
- Puppeteer tests for cross-view loading
- Edge case testing
- Performance validation
