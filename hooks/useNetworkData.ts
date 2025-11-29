// Custom hook for managing network data with immutability
import { useState, useCallback } from 'react';
import { RouterNode, LogicalLink } from '../types';

export interface NetworkLink extends LogicalLink {
  a: string;
  b: string;
  ifA: string;
  ifB: string;
  costAB: number;
  costBA: number;
}

export function useNetworkData(initialNodes: RouterNode[], initialLinks: NetworkLink[]) {
  const [nodes, setNodes] = useState<RouterNode[]>(() => [...initialNodes]);
  const [links, setLinks] = useState<NetworkLink[]>(() => [...initialLinks]);

  const addNode = useCallback((node: RouterNode) => {
    setNodes(prev => {
      // Validate no duplicate IDs
      if (prev.some(n => n.id === node.id)) {
        throw new Error(`Node with ID ${node.id} already exists`);
      }
      return [...prev, node];
    });
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    // Also remove connected links
    setLinks(prev => prev.filter(l => l.source !== nodeId && l.target !== nodeId));
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<RouterNode>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  }, []);

  const addLink = useCallback((link: NetworkLink) => {
    setLinks(prev => [...prev, link]);
  }, []);

  const removeLink = useCallback((linkId: string) => {
    setLinks(prev => prev.filter((l, idx) => idx.toString() !== linkId));
  }, []);

  const updateLinkCost = useCallback((
    linkIndex: number, 
    direction: 'forward' | 'reverse' | 'both',
    cost: number
  ) => {
    setLinks(prev => prev.map((link, idx) => {
      if (idx !== linkIndex) return link;
      
      switch (direction) {
        case 'forward':
          return { ...link, forward_cost: cost, costAB: cost };
        case 'reverse':
          return { ...link, reverse_cost: cost, costBA: cost };
        case 'both':
          return { 
            ...link, 
            forward_cost: cost, 
            reverse_cost: cost,
            costAB: cost,
            costBA: cost,
            cost
          };
        default:
          return link;
      }
    }));
  }, []);

  const replaceAllData = useCallback((newNodes: RouterNode[], newLinks: NetworkLink[]) => {
    setNodes([...newNodes]);
    setLinks([...newLinks]);
  }, []);

  const resetToInitial = useCallback(() => {
    setNodes([...initialNodes]);
    setLinks([...initialLinks]);
  }, [initialNodes, initialLinks]);

  return {
    nodes,
    links,
    addNode,
    removeNode,
    updateNode,
    addLink,
    removeLink,
    updateLinkCost,
    replaceAllData,
    resetToInitial
  };
}

