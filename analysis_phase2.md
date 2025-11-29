
# Phase 1XX (Continued): Deep Core Issue Identification

As a "Bounty Hunter" digging deeper, I have identified two critical systemic failures that render the application unfit for professional use:

### A. The "Amnesia" Bug (Lack of Persistence)
-   **Issue**: The application relies entirely on ephemeral React state (`useState`).
-   **Impact**: If a network engineer spends 30 minutes creating custom links, adjusting costs, and tuning physics settings, **all work is lost** instantly upon a browser refresh.
-   **System Thinking**: A professional tool must respect the user's time. State (Topology changes, View settings) must persist.
-   **Root Cause**: No integration with `localStorage` or Backend DB.

### B. The "False Export" Bug
-   **Issue**: The `handleExport` function currently exports `NODES` and `LINKS` directly from `constants.ts`.
-   **Impact**: It exports the **initial state**, ignoring all user modifications (New Links, Cost Changes). The exported file is a lie.
-   **Root Cause**:
    ```typescript
    const handleExport = () => {
      const data = { nodes: NODES, links: LINKS }; // <--- BUG: Exports static constants!
      // ...
    }
    ```

## 7. Implementation Plan: Persistence & Integrity (Phase 2XX)

I will implement a robust **State Persistence Layer** and fix the **Data Integrity** issue in the export function.

### Plan Details:
1.  **LocalStorage Hooks**:
    -   Implement `useLocalStorage` for `customLinks`, `physicsConfig`, `visualConfig`, and `activeCountries`.
    -   On load, hydrate state from these stores.

2.  **Fix Export Logic**:
    -   Refactor `handleExport` to gather the *current* state of the network.
    -   Merge `LINKS` (static) with `customLinks` (dynamic).
    -   Capture current costs from `edgesDataSet`.

## 8. Validation Strategy (Phase 3XX)
-   **Persistence Test**:
    1.  Add a custom link.
    2.  Change Gravity.
    3.  Reload Page.
    4.  Verify Link and Gravity settings are restored.
-   **Export Test**:
    1.  Modify a cost.
    2.  Trigger Export.
    3.  Verify the JSON blob contains the *new* cost.
