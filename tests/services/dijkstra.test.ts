import { describe, it, expect } from 'vitest';
import { dijkstraDirected } from '../../services/dijkstra';
import { VisNode, VisEdge } from '../../types';

describe('dijkstraDirected', () => {
  // Helper to create test nodes
  const createNode = (id: string): VisNode => ({
    id,
    label: id,
    title: `Router ${id}`,
    color: { background: '#3b82f6', border: '#1e40af' },
    country: 'TEST',
    shape: 'dot',
    size: 20,
    font: { color: '#000', size: 14 }
  });

  // Helper to create test edges
  const createEdge = (id: string, from: string, to: string, cost: number): VisEdge => ({
    id,
    from,
    to,
    label: `Cost: ${cost}`,
    arrows: 'to',
    width: 1,
    color: { color: '#cbd5e1' },
    cost,
    ifaceFrom: 'eth0',
    ifaceTo: 'eth1',
    logicalId: parseInt(id.replace('e', ''))
  });

  describe('Basic Path Finding', () => {
    it('should find a simple path between two connected nodes', () => {
      const nodes: VisNode[] = [
        createNode('A'),
        createNode('B'),
      ];

      const edges: VisEdge[] = [
        createEdge('e1', 'A', 'B', 10),
      ];

      const result = dijkstraDirected('A', 'B', nodes, edges);

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(10);
      expect(result?.canonicalPath).toEqual(['A', 'B']);
      expect(result?.edges).toEqual(['e1']);
      expect(result?.isECMP).toBe(false);
    });

    it('should find the shortest path among multiple paths', () => {
      const nodes: VisNode[] = [
        createNode('A'),
        createNode('B'),
        createNode('C'),
      ];

      const edges: VisEdge[] = [
        createEdge('e1', 'A', 'B', 5),
        createEdge('e2', 'B', 'C', 5),
        createEdge('e3', 'A', 'C', 15), // Direct but more expensive
      ];

      const result = dijkstraDirected('A', 'C', nodes, edges);

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(10);
      expect(result?.canonicalPath).toEqual(['A', 'B', 'C']);
      expect(result?.edges).toHaveLength(2);
      expect(result?.edges).toContain('e1');
      expect(result?.edges).toContain('e2');
    });

    it('should return null when no path exists', () => {
      const nodes: VisNode[] = [
        createNode('A'),
        createNode('B'),
        createNode('C'), // Isolated node
      ];

      const edges: VisEdge[] = [
        createEdge('e1', 'A', 'B', 10),
        // No edge to C
      ];

      const result = dijkstraDirected('A', 'C', nodes, edges);

      expect(result).toBeNull();
    });

    it('should handle same source and destination', () => {
      const nodes: VisNode[] = [createNode('A')];
      const edges: VisEdge[] = [];

      const result = dijkstraDirected('A', 'A', nodes, edges);

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(0);
      expect(result?.canonicalPath).toEqual(['A']);
      expect(result?.edges).toEqual([]);
    });
  });

  describe('ECMP (Equal-Cost Multi-Path) Detection', () => {
    it('should detect ECMP when multiple equal-cost paths exist', () => {
      const nodes: VisNode[] = [
        createNode('A'),
        createNode('B'),
        createNode('C'),
        createNode('D'),
      ];

      const edges: VisEdge[] = [
        // Path 1: A -> B -> D (cost: 10)
        createEdge('e1', 'A', 'B', 5),
        createEdge('e2', 'B', 'D', 5),
        // Path 2: A -> C -> D (cost: 10)
        createEdge('e3', 'A', 'C', 5),
        createEdge('e4', 'C', 'D', 5),
      ];

      const result = dijkstraDirected('A', 'D', nodes, edges);

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(10);
      expect(result?.isECMP).toBe(true);
      // Should include all edges from both paths
      expect(result?.edges.sort()).toEqual(['e1', 'e2', 'e3', 'e4'].sort());
    });

    it('should not detect ECMP when paths have different costs', () => {
      const nodes: VisNode[] = [
        createNode('A'),
        createNode('B'),
        createNode('C'),
        createNode('D'),
      ];

      const edges: VisEdge[] = [
        // Path 1: A -> B -> D (cost: 10)
        createEdge('e1', 'A', 'B', 5),
        createEdge('e2', 'B', 'D', 5),
        // Path 2: A -> C -> D (cost: 12) - more expensive
        createEdge('e3', 'A', 'C', 6),
        createEdge('e4', 'C', 'D', 6),
      ];

      const result = dijkstraDirected('A', 'D', nodes, edges);

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(10);
      expect(result?.isECMP).toBe(false);
      expect(result?.edges).toHaveLength(2);
      expect(result?.edges).toContain('e1');
      expect(result?.edges).toContain('e2');
    });
  });

  describe('Complex Topologies', () => {
    it('should handle a diamond topology', () => {
      const nodes: VisNode[] = [
        createNode('A'),
        createNode('B'),
        createNode('C'),
        createNode('D'),
      ];

      const edges: VisEdge[] = [
        createEdge('e1', 'A', 'B', 1),
        createEdge('e2', 'A', 'C', 4),
        createEdge('e3', 'B', 'D', 2),
        createEdge('e4', 'C', 'D', 1),
      ];

      const result = dijkstraDirected('A', 'D', nodes, edges);

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(3);
      expect(result?.canonicalPath).toEqual(['A', 'B', 'D']);
    });

    it('should handle a mesh topology with multiple hops', () => {
      const nodes: VisNode[] = [
        createNode('A'),
        createNode('B'),
        createNode('C'),
        createNode('D'),
        createNode('E'),
      ];

      const edges: VisEdge[] = [
        createEdge('e1', 'A', 'B', 2),
        createEdge('e2', 'B', 'C', 2),
        createEdge('e3', 'C', 'D', 2),
        createEdge('e4', 'D', 'E', 2),
        createEdge('e5', 'A', 'C', 5),
        createEdge('e6', 'B', 'E', 10),
      ];

      const result = dijkstraDirected('A', 'E', nodes, edges);

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(8);
      expect(result?.canonicalPath).toEqual(['A', 'B', 'C', 'D', 'E']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single node graph', () => {
      const nodes: VisNode[] = [createNode('A')];
      const edges: VisEdge[] = [];

      const result = dijkstraDirected('A', 'A', nodes, edges);

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(0);
    });

    it('should handle zero-cost edges', () => {
      const nodes: VisNode[] = [
        createNode('A'),
        createNode('B'),
      ];

      const edges: VisEdge[] = [
        createEdge('e1', 'A', 'B', 0),
      ];

      const result = dijkstraDirected('A', 'B', nodes, edges);

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(0);
      expect(result?.canonicalPath).toEqual(['A', 'B']);
    });

    it('should return null for non-existent source node', () => {
      const nodes: VisNode[] = [createNode('A'), createNode('B')];
      const edges: VisEdge[] = [createEdge('e1', 'A', 'B', 10)];

      const result = dijkstraDirected('X', 'B', nodes, edges);

      expect(result).toBeNull();
    });

    it('should return null for non-existent destination node', () => {
      const nodes: VisNode[] = [createNode('A'), createNode('B')];
      const edges: VisEdge[] = [createEdge('e1', 'A', 'B', 10)];

      const result = dijkstraDirected('A', 'X', nodes, edges);

      expect(result).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle large graphs efficiently', () => {
      // Create a chain of 50 nodes
      const nodeCount = 50;
      const nodes: VisNode[] = [];
      const edges: VisEdge[] = [];

      for (let i = 0; i < nodeCount; i++) {
        nodes.push(createNode(`node${i}`));
        if (i > 0) {
          edges.push(createEdge(`e${i}`, `node${i - 1}`, `node${i}`, 1));
        }
      }

      const startTime = performance.now();
      const result = dijkstraDirected('node0', `node${nodeCount - 1}`, nodes, edges);
      const endTime = performance.now();

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(nodeCount - 1);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});
