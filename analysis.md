# Phase 1XX: Deep Code Analysis & Architecture Review

## 1. Architecture Overview
The application is a **Single Page Application (SPA)** built with **React 19** and **Vite**, utilizing **TypeScript** for type safety. It visualizes OSPF network topologies using `vis-network`.

### Core Components
-   **`App.tsx`**: The central controller. Manages state for:
    -   Network Data (`nodesDataSet`, `edgesDataSet`)
    -   Visual Configuration (`visualConfig`)
    -   Path Simulation (`source`, `destination`, `playing`)
    -   Impact Analysis (`impactResults`, `proposedCost`)
    -   New Link Creation (`newLinkConfig`)
-   **`services/dijkstra.ts`**: Implements the Dijkstra algorithm with ECMP (Equal-Cost Multi-Path) support. It returns not just the path but also the subgraph and animation steps.
-   **`services/geometry.ts`**: Provides computational geometry functions (`getConvexHull`, `getCentroid`) for drawing country boundaries on the canvas.
-   **`constants.ts`**: Contains the static database of Nodes and Links (`RAW_DATA`) and Country Color mappings.

## 2. Data Flow & Logic
1.  **Initialization**: `App.tsx` loads `NODES` and `LINKS` from `constants.ts`. It transforms them into `VisNode` and `VisEdge` formats required by `vis-network`.
2.  **Rendering**: The `Network` instance is created. A custom `beforeDrawing` event listener is attached to draw the convex hulls (colored regions) around nodes of the same country.
3.  **Interaction**:
    -   **Clicking Nodes/Edges**: Updates state (`selectedEdgeId`, `selectedNodeForLink`).
    -   **Path Simulation**: Triggers `dijkstraDirected`. The result is animated by sequentially updating node/edge styles in the `DataSet`.
    -   **Impact Analysis**: Runs a simulation by modifying the edge weights in memory and re-running Dijkstra for all pairs to calculate cost deltas and path changes.

## 3. Identified Gaps & "Missing Knobs"
The user request highlights the need for "required knobs" to enhance UI/UX and "deeper understanding". Based on the "Polymath/Network Engineer" persona, the following gaps exist:

### A. Lack of Physics/Layout Control (The "Physics Knobs")
-   **Current State**: Physics parameters (Gravity, Spring Length) are hardcoded in the `useEffect` hook (`gravitationalConstant: -20000`, `springLength: 200`).
-   **Issue**: Complex topologies often require tweaking these values to untangle nodes or compress the graph. Users cannot currently adjust this.
-   **Solution**: Add sliders for Gravity, Spring Length, and Spring Constant in the Visual Settings panel.

### B. Lack of Filtering (The "Filter Knobs")
-   **Current State**: All nodes are shown at all times.
-   **Issue**: With "100+ Nodes", the view can get cluttered. A network engineer often needs to focus on specific regions (Countries).
-   **Solution**: Add a "Filter" section to toggle visibility of specific Countries.

### C. Simulation Depth
-   **Current State**: Simulation is pure cost-based.
-   **Issue**: Real networks have latency and bandwidth constraints.
-   **Future**: While out of scope for the immediate "Knobs" fix, the architecture should support pluggable metrics (e.g., `metric: 'cost' | 'latency'`).

## 4. Implementation Plan (Phase 2XX)
I will implement the following "Knobs" to address the UI/UX gaps:

1.  **Enhanced Visual Settings Panel**:
    -   Add **Physics Section**:
        -   Gravity Slider (Range: -50000 to -1000)
        -   Spring Length Slider (Range: 50 to 500)
        -   Spring Constant Slider (Range: 0.01 to 0.2)
    -   Add **Filter Section**:
        -   Toggles for each Country (Show/Hide).

2.  **Refactor `App.tsx`**:
    -   Update the `options` object passed to `networkRef.current.setOptions()` dynamically when these new state variables change.
    -   Implement filtering logic to `nodesDataSet.remove()` / `nodesDataSet.add()` or use `hidden` property based on selected countries.

## 5. Validation Strategy (Phase 3XX)
-   **Puppeteer Test**:
    -   Load the app.
    -   Open Visual Settings.
    -   Adjust Gravity and verify the network stabilizes (screenshot).
    -   Toggle a Country filter (e.g., hide "USA") and verify USA nodes are removed from the DOM/Canvas (screenshot).
