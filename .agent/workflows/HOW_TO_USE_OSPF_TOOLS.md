---
description: How to use the OSPF Analysis Tools (Dijkstra, Capacity, Health, etc.)
---

# OSPF Analysis Tools Guide

This guide explains how to use the advanced OSPF analysis tools integrated into the application.

## 1. Shortest Path Analysis (Dijkstra)
- **Access**: Click the **Route** icon (curved arrow) in the header toolbar.
- **Usage**:
  1. Select a **Source Node** from the dropdown.
  2. Select a **Target Node** from the dropdown.
  3. Click **Run Analysis**.
- **Output**:
  - Displays the total OSPF cost.
  - Shows the sequence of nodes in the shortest path.
  - Detects and highlights **ECMP** (Equal Cost Multi-Path) if multiple paths exist with the same cost.

## 2. Network Capacity Analysis
- **Access**: Click the **ANALYSIS** view mode button in the top header.
- **Usage**:
  - View network-wide KPIs: Total Capacity, Current Traffic, Congested Links, Asymmetric Links.
  - Analyze the **Top Utilized Links** table to identify bottlenecks.
  - Use this view to plan capacity upgrades.

## 3. Link Inspector
- **Access**: In **VISUALIZER** mode, click on any link (line) between two routers.
- **Usage**:
  - A side panel will open displaying detailed link metadata.
  - View **Interface Names**, **Speed/Capacity**, **Traffic Utilization**, and **OSPF Costs** (Forward/Reverse).
  - Check for **Asymmetry** (mismatched costs) and **Status** (Up/Down).

## 4. Network Health
- **Access**: Click the **Activity** icon (pulse line) in the header toolbar.
- **Usage**:
  - View an overall **Health Score** (0-100%).
  - Quickly see counts of Down Links and Congested Links.

## 5. Scenario Planner ("What If")
- **Access**: Click the **PLANNER** view mode button.
- **Usage**:
  - **Add Cost Change**: Select a link and propose a new OSPF cost.
  - **Simulate**: Run the scenario to see how traffic patterns might change (future feature).
  - **Save/Load**: Save your scenarios to JSON files for later use.

## 6. Topology Designer
- **Access**: Click the **DESIGNER** view mode button.
- **Usage**:
  - **Add Routers**: Create new nodes with specific countries.
  - **Export**: Save your design to a JSON file.
  - **Import**: Load existing designs to modify them.

## Tips for Best Experience
- Use **Dark Mode** (Moon icon) for better visibility of complex topologies.
- Import **Rich Topology Files** (like `netviz-pro` format) to see full capacity and traffic data.
- Use the **Template** button to download a sample JSON file with all supported fields.
