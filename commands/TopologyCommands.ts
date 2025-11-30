import { Command } from '../hooks/useUndoRedo';
import { TopologyData, VisEdge } from '../types';

// Command to update link cost
export class UpdateLinkCostCommand implements Command<TopologyData> {
  private topology: TopologyData;
  private edgeId: string;
  private oldCost: number;
  private newCost: number;

  constructor(topology: TopologyData, edgeId: string, newCost: number) {
    this.topology = topology;
    this.edgeId = edgeId;
    this.newCost = newCost;

    // Find the current cost
    const link = topology.links.find((l) => String(l.id) === edgeId);
    this.oldCost = link ? link.cost : 0;
  }

  get description(): string {
    return `Update link cost: ${this.oldCost} → ${this.newCost}`;
  }

  execute(): TopologyData {
    return {
      ...this.topology,
      links: this.topology.links.map((link) =>
        String(link.id) === this.edgeId
          ? { ...link, cost: this.newCost }
          : link
      ),
    };
  }

  undo(): TopologyData {
    return {
      ...this.topology,
      links: this.topology.links.map((link) =>
        String(link.id) === this.edgeId
          ? { ...link, cost: this.oldCost }
          : link
      ),
    };
  }
}

// Command to import new topology
export class ImportTopologyCommand implements Command<TopologyData | null> {
  private oldTopology: TopologyData | null;
  private newTopology: TopologyData;

  constructor(oldTopology: TopologyData | null, newTopology: TopologyData) {
    this.oldTopology = oldTopology;
    this.newTopology = newTopology;
  }

  get description(): string {
    return `Import topology (${this.newTopology.nodes.length} nodes, ${this.newTopology.links.length} links)`;
  }

  execute(): TopologyData | null {
    return this.newTopology;
  }

  undo(): TopologyData | null {
    return this.oldTopology;
  }
}

// Command to toggle node active status
export class ToggleNodeActiveCommand implements Command<TopologyData> {
  private topology: TopologyData;
  private nodeId: string;

  constructor(topology: TopologyData, nodeId: string) {
    this.topology = topology;
    this.nodeId = nodeId;
  }

  get description(): string {
    const node = this.topology.nodes.find((n) => n.id === this.nodeId);
    const newStatus = !node?.is_active;
    return `Toggle node ${this.nodeId}: ${newStatus ? 'active' : 'inactive'}`;
  }

  execute(): TopologyData {
    return {
      ...this.topology,
      nodes: this.topology.nodes.map((node) =>
        node.id === this.nodeId
          ? { ...node, is_active: !node.is_active }
          : node
      ),
    };
  }

  undo(): TopologyData {
    // Toggling again reverts it
    return this.execute();
  }
}

// Command to delete a node
export class DeleteNodeCommand implements Command<TopologyData> {
  private topology: TopologyData;
  private nodeId: string;
  private deletedNode: any;
  private deletedLinks: any[];

  constructor(topology: TopologyData, nodeId: string) {
    this.topology = topology;
    this.nodeId = nodeId;
    this.deletedNode = topology.nodes.find((n) => n.id === nodeId);
    this.deletedLinks = topology.links.filter(
      (l) => l.source_id === nodeId || l.target_id === nodeId
    );
  }

  get description(): string {
    return `Delete node ${this.nodeId}`;
  }

  execute(): TopologyData {
    return {
      ...this.topology,
      nodes: this.topology.nodes.filter((n) => n.id !== this.nodeId),
      links: this.topology.links.filter(
        (l) => l.source_id !== this.nodeId && l.target_id !== this.nodeId
      ),
    };
  }

  undo(): TopologyData {
    return {
      ...this.topology,
      nodes: [...this.topology.nodes, this.deletedNode],
      links: [...this.topology.links, ...this.deletedLinks],
    };
  }
}

// Command to add a new link
export class AddLinkCommand implements Command<TopologyData> {
  private topology: TopologyData;
  private newLink: any;

  constructor(topology: TopologyData, newLink: any) {
    this.topology = topology;
    this.newLink = newLink;
  }

  get description(): string {
    return `Add link: ${this.newLink.source_id} → ${this.newLink.target_id}`;
  }

  execute(): TopologyData {
    return {
      ...this.topology,
      links: [...this.topology.links, this.newLink],
    };
  }

  undo(): TopologyData {
    return {
      ...this.topology,
      links: this.topology.links.filter((l) => l.id !== this.newLink.id),
    };
  }
}
