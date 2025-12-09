
export interface RouterNode {
  id: string;
  name: string;
  hostname: string;
  loopback_ip: string;
  country: string;
  is_active: boolean;
  node_type: string;
  neighbor_count: number;
}

export interface Capacity {
  speed: string;
  is_bundle: boolean;
  bundle_type?: string;
  member_count?: number;
  member_speed?: string;
  total_capacity_mbps: number;
}

export interface TrafficStats {
  forward_traffic_mbps: number;
  forward_utilization_pct: number;
  reverse_traffic_mbps: number;
  reverse_utilization_pct: number;
}

export interface LogicalLink {
  source: string;
  target: string;
  source_interface: string;
  target_interface: string;
  forward_cost: number;
  reverse_cost: number;
  cost: number;
  status: string;
  edge_type: string;
  is_asymmetric: boolean;
  source_capacity: Capacity;
  target_capacity: Capacity;
  traffic: TrafficStats;
  details?: string;
}

export interface VisNode {
  id: string;
  label: string;
  title?: string;
  color?: {
    background: string;
    border: string;
  };
  shape?: string;
  size?: number;
  country?: string;
  font?: {
    color?: string;
    face?: string;
    size?: number;
    align?: string;
  };
}

export interface VisEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  title?: string;
  arrows?: string;
  smooth?: {
    type: string;
    roundness: number;
  };
  width?: number;
  baseColor?: string;
  color?: {
    color: string;
    highlight?: string;
  };
  cost: number;
  ifaceFrom: string;
  ifaceTo: string;
  logicalId: number;
  font?: {
    align?: string;
    size?: number;
    color?: string;
    background?: string;
  };
  dashes?: boolean | number[];
  // Rich metadata from netviz-pro format
  reverseCost?: number;
  status?: string;
  edgeType?: string;
  isAsymmetric?: boolean;
  sourceCapacity?: Capacity;
  targetCapacity?: Capacity;
  traffic?: TrafficStats;
}

export interface PathResult {
  steps: string[][]; // Array of node IDs for animation steps
  edges: string[];   // Array of edge IDs involved in the path
  cost: number;
  isECMP: boolean;
  canonicalPath: string[]; // A single representative path (Node Labels) for display
}

export interface VisualConfig {
  showHull: boolean;
  hullPadding: number;
  hullFontSize: number;
  nodeFontSize: number;
  nodeSize: number;
  linkWidth: number;
}

export interface PhysicsConfig {
  gravitationalConstant: number;
  springLength: number;
  springConstant: number;
  damping?: number;
}
