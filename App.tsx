import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import {
  Search, ZoomIn, ZoomOut, Maximize, RotateCcw, Settings,
  Play, Pause, Info, Download, Upload, Sun, Moon,
  Network as NetworkIcon, Link, Plus, Trash2, Save,
  Activity, AlertTriangle, Zap, X, ArrowRight, ArrowUpDown,
  Layers, Globe, Sliders, TrendingUp, TrendingDown, Route,
  MapPin, Eye, User as UserIcon, Key, LogOut
} from 'lucide-react';
import { PathComparisonModal } from './components/PathComparisonModal';
import { NetworkHealthModal } from './components/NetworkHealthModal';
import { RippleEffectModal } from './components/RippleEffectModal';
// ImpactAnalysisModal component removed - real modal is implemented inline in App.tsx
import { TopologyDesigner } from './components/TopologyDesigner';
import { ScenarioPlanner } from './components/ScenarioPlanner';
import { LinkInspector } from './components/LinkInspector';
import { CapacityAnalysis } from './components/CapacityAnalysis';
import {
  RouterNode, LogicalLink, VisNode, VisEdge,
  PathResult, VisualConfig, PhysicsConfig
} from './types';
import { dijkstraDirected } from './services/dijkstra';
import { getConvexHull, getCentroid, Point } from './services/geometry';
import {
  COUNTRIES, BASE_COUNTRY_COLORS, DARK_MODE_COUNTRY_COLORS,
  DEFAULT_VISUAL_CONFIG, DEFAULT_PHYSICS_CONFIG,
  getInitialNodes, getInitialLinks
} from './constants';
import { useLocalStorage, getLocalStorageUsage } from './hooks/useLocalStorage';
import { useNetworkData } from './hooks/useNetworkData';
import { validateImportedJSON, validateExportedJSON } from './utils/jsonValidator';

// --- Types ---
type ViewMode = 'VISUALIZER' | 'DESIGNER' | 'PLANNER' | 'ANALYSIS';

type ImpactType = 'cost_increase' | 'cost_decrease' | 'path_migration' | 'new_ecmp' | 'lost_ecmp' | 'MIGRATION' | 'REROUTE';

interface ImpactResult {
  src: RouterNode;
  dest: RouterNode;
  oldCost: number;
  newCost: number;
  oldPath: string[]; // List of router names
  newPath: string[]; // List of router names
  isECMP: boolean;
  wasECMP: boolean;
  impactType: ImpactType;
  pathChanged: boolean;
}

interface CountryFlowAggregation {
  srcCountry: string;
  destCountry: string;
  totalFlows: number;
  costIncreases: number;
  costDecreases: number;
  pathMigrations: number;
  avgCostDelta: number;
  flows: ImpactResult[];
}

interface NewLinkConfig {
  fromNode: string | null;
  toNode: string | null;
  forwardCost: number;
  reverseCost: number;
  isCreating: boolean;
}

interface CustomLink {
  id: string;
  from: string;
  to: string;
  forwardCost: number;
  reverseCost: number;
  createdAt: Date;
}

interface AppUser {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  loginCount?: number;
  loginCountSincePwdChange?: number;
  loginsRemaining?: number;
}

interface AppProps {
  user?: AppUser | null;
  onChangePassword?: () => void;
  onLogout?: () => void;
}

export default function App({ user, onChangePassword, onLogout }: AppProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [isNetworkInitialized, setIsNetworkInitialized] = useState(false);

  // Initialize network data with immutable copies
  const networkData = useNetworkData(getInitialNodes(), getInitialLinks());
  const { nodes: NODES, links: LINKS } = networkData;

  const nodesDataSet = useRef<DataSet<VisNode>>(new DataSet<VisNode>([]));
  const edgesDataSet = useRef<DataSet<VisEdge>>(new DataSet<VisEdge>([]));

  const [playing, setPlaying] = useState(false);
  const [source, setSource] = useState<string>("zaf-r1");
  const [destination, setDestination] = useState<string>("lso-r1");
  const [logs, setLogs] = useState<{ time: string, msg: string }[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function - defined early for use in callbacks
  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, msg }, ...prev].slice(0, 50));
  }, []);

  // Visual Toggles & Settings with enhanced localStorage
  const [visualConfig, setVisualConfig, visualConfigStorage] = useLocalStorage('ospf_visual_config', {
    showHull: false,
    hullPadding: 20,
    hullFontSize: 40,
    nodeFontSize: 14,
    nodeSize: 20,
    linkWidth: 1
  }, {
    onQuotaExceeded: () => {
      console.error('Visual config storage quota exceeded');
      addLog('⚠️ Storage full - visual settings may not persist');
    }
  });
  const visualConfigRef = useRef(visualConfig);

  // Impact Analysis State
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [proposedCost, setProposedCost] = useState<number>(0);
  const [impactResults, setImpactResults] = useState<ImpactResult[] | null>(null);
  const [countryAggregations, setCountryAggregations] = useState<CountryFlowAggregation[] | null>(null);
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [showVisualSettings, setShowVisualSettings] = useState(false);
  const [impactViewMode, setImpactViewMode] = useState<'flows' | 'countries'>('countries');
  
  // Performance optimization state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // New Modals State
  const [isDijkstraModalOpen, setIsDijkstraModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isRippleModalOpen, setIsRippleModalOpen] = useState(false);

  // Physics Configuration with enhanced localStorage
  const [physicsConfig, setPhysicsConfig, physicsConfigStorage] = useLocalStorage('ospf_physics_config', {
    gravitationalConstant: -20000,
    springLength: 200,
    springConstant: 0.04
  }, {
    onQuotaExceeded: () => {
      console.error('Physics config storage quota exceeded');
      addLog('⚠️ Storage full - physics settings may not persist');
    }
  });

  // Country Filter State with enhanced localStorage
  const [activeCountries, setActiveCountries, activeCountriesStorage] = useLocalStorage<Record<string, boolean>>('ospf_active_countries', (() => {
    const initial: Record<string, boolean> = {};
    Object.keys(COUNTRIES).forEach(c => initial[c] = true);
    return initial;
  })(), {
    onQuotaExceeded: () => {
      console.error('Country filter storage quota exceeded');
      addLog('⚠️ Storage full - country filters may not persist');
    }
  });
  const activeCountriesRef = useRef(activeCountries);

  // New Link Creation State
  const [newLinkConfig, setNewLinkConfig] = useState<NewLinkConfig>({
    fromNode: null,
    toNode: null,
    forwardCost: 10,
    reverseCost: 10,
    isCreating: false
  });
  const [showNewLinkModal, setShowNewLinkModal] = useState(false);
  const [selectedNodeForLink, setSelectedNodeForLink] = useState<string | null>(null);

  // Custom Links Tracking (user-added links) with enhanced localStorage
  const [customLinks, setCustomLinks, customLinksStorage] = useLocalStorage<CustomLink[]>('ospf_custom_links', [], {
    onQuotaExceeded: () => {
      alert(
        '⚠️ Storage Full\n\n' +
        'Cannot save more custom links - storage quota exceeded.\n\n' +
        'Please export your topology to save your work.'
      );
      addLog('❌ Cannot save custom link - storage full');
    },
    onError: (error) => {
      console.error('Custom links storage error:', error);
      addLog('❌ Error saving custom links');
    }
  });

  // Topology Planner State (dropdown-based link creation)
  const [plannerFromNode, setPlannerFromNode] = useState<string>('');
  const [plannerToNode, setPlannerToNode] = useState<string>('');
  const [plannerForwardCost, setPlannerForwardCost] = useState<number>(10);
  const [plannerReverseCost, setPlannerReverseCost] = useState<number>(10);

  // Sync state to ref for drawing loop & Update Nodes
  useEffect(() => {
    visualConfigRef.current = visualConfig;

    // Only update if network is initialized
    if (!isNetworkInitialized || !networkRef.current) return;

    // Dynamically update nodes
    if (nodesDataSet.current) {
      const allNodes = nodesDataSet.current.get();
      if (allNodes.length > 0) {
        const updates = allNodes.map(n => ({
          id: n.id,
          size: visualConfig.nodeSize,
          font: { size: visualConfig.nodeFontSize }
        }));
        nodesDataSet.current.update(updates);
      }
    }

    // Dynamically update edges
    if (edgesDataSet.current) {
      const allEdges = edgesDataSet.current.get();
      if (allEdges.length > 0) {
        const updates = allEdges.map(e => ({
          id: e.id,
          width: visualConfig.linkWidth
        }));
        edgesDataSet.current.update(updates);
      }
    }

    networkRef.current.redraw();
  }, [visualConfig, isNetworkInitialized]);

  // Physics Update Effect
  useEffect(() => {
    if (!isNetworkInitialized || !networkRef.current) return;
    networkRef.current.setOptions({
      physics: {
        barnesHut: {
          gravitationalConstant: physicsConfig.gravitationalConstant,
          springLength: physicsConfig.springLength,
          springConstant: physicsConfig.springConstant
        }
      }
    });
  }, [physicsConfig, isNetworkInitialized]);

  // Country Filter Effect
  useEffect(() => {
    activeCountriesRef.current = activeCountries;
    if (!isNetworkInitialized || !nodesDataSet.current) return;

    const allNodes = nodesDataSet.current.get();
    const updates = allNodes.map(n => ({
      id: n.id,
      hidden: n.country ? !activeCountries[n.country] : false
    }));

    nodesDataSet.current.update(updates);
  }, [activeCountries, isNetworkInitialized]);

  // Theme Toggle Effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Update Graph Theme if initialized
    if (!isNetworkInitialized || !networkRef.current) return;

    if (networkRef.current) {
      const themeColors = {
        bg: isDark ? '#020617' : '#f8fafc',
        nodeBorder: isDark ? '#94a3b8' : '#334155',
        nodeFont: isDark ? '#e2e8f0' : '#1e293b',
        edgeDefault: isDark ? '#334155' : '#cbd5e1',
        edgeFontBg: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255,255,255,0.85)',
        edgeFontColor: isDark ? '#94a3b8' : '#475569'
      };

      const allNodes = nodesDataSet.current.get();
      nodesDataSet.current.update(allNodes.map(n => ({
        id: n.id,
        font: { ...n.font, color: themeColors.nodeFont }, // Size handled by visualConfig effect
        color: { ...n.color, border: themeColors.nodeBorder }
      })));

      const allEdges = edgesDataSet.current.get();
      edgesDataSet.current.update(allEdges.map(e => ({
        id: e.id,
        color: { ...e.color, color: e.color?.color === '#3b82f6' || e.color?.color === '#f59e0b' || e.color?.color === '#22c55e' || e.color?.color === '#9333ea' ? e.color.color : themeColors.edgeDefault },
        font: { ...e.font, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
      })));
    }
  }, [isDark, isNetworkInitialized]);

  // For neighbors tooltip
  const getNeighborsCount = (nodeId: string) => {
    return LINKS.filter(l => l.a === nodeId || l.b === nodeId).length;
  };
  const getNeighborList = (nodeId: string) => {
    const neighbors = LINKS.filter(l => l.a === nodeId || l.b === nodeId)
      .map(l => l.a === nodeId ? l.b : l.a);
    return [...new Set(neighbors)].map(nid => NODES.find(n => n.id === nid)?.name || nid).join(", ");
  };

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // --- Initialization ---

  const getInitialData = useCallback(() => {
    const themeColors = {
      nodeFont: isDark ? '#e2e8f0' : '#1e293b',
      nodeBorder: isDark ? '#94a3b8' : '#334155',
      edgeDefault: isDark ? '#334155' : '#cbd5e1',
      edgeFontBg: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255,255,255,0.85)',
      edgeFontColor: isDark ? '#94a3b8' : '#475569'
    };

    const currentConfig = visualConfigRef.current;

    const visNodes: VisNode[] = NODES.map((n) => ({
      id: n.id,
      label: n.name,
      title: `Router: ${n.name} (${n.country}) | Neighbors: ${getNeighborsCount(n.id)}`,
      color: { background: COUNTRIES[n.country] || "#94a3b8", border: themeColors.nodeBorder },
      country: n.country,
      shape: "dot",
      size: currentConfig.nodeSize,
      font: { color: themeColors.nodeFont, face: "ui-sans-serif, system-ui", size: currentConfig.nodeFontSize }
    }));

    const visEdges: VisEdge[] = [];
    LINKS.forEach((lnk, idx) => {
      const idF = `e${idx}_f`;
      const idR = `e${idx}_r`;

      const shortIfA = lnk.ifA.replace("GigabitEthernet", "Gi").replace("Bundle-Ethernet", "BE").replace("HundredGigE", "Hu");
      const shortIfB = lnk.ifB.replace("GigabitEthernet", "Gi").replace("Bundle-Ethernet", "BE").replace("HundredGigE", "Hu");

      // Forward edge
      visEdges.push({
        id: idF,
        from: lnk.a,
        to: lnk.b,
        label: `${shortIfA} -> ${shortIfB}\nCost: ${lnk.costAB}`,
        arrows: "to",
        smooth: { type: "curvedCW", roundness: 0.15 },
        width: currentConfig.linkWidth,
        color: { color: themeColors.edgeDefault, highlight: "#ef4444" },
        cost: lnk.costAB,
        ifaceFrom: lnk.ifA,
        ifaceTo: lnk.ifB,
        logicalId: idx,
        font: { align: 'middle', size: 9, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
      });

      // Reverse edge
      visEdges.push({
        id: idR,
        from: lnk.b,
        to: lnk.a,
        label: `${shortIfB} -> ${shortIfA}\nCost: ${lnk.costBA}`,
        arrows: "to",
        smooth: { type: "curvedCW", roundness: 0.15 },
        width: currentConfig.linkWidth,
        color: { color: themeColors.edgeDefault, highlight: "#ef4444" },
        cost: lnk.costBA,
        ifaceFrom: lnk.ifB,
        ifaceTo: lnk.ifA,
        logicalId: idx,
        font: { align: 'middle', size: 9, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
      });
    });

    // Add Custom Links from LocalStorage
    customLinks.forEach((lnk, idx) => {
      const logicalId = 10000 + idx; // Offset for custom links
      visEdges.push({
        id: `${lnk.id}_f`,
        from: lnk.from,
        to: lnk.to,
        label: `CUSTOM\\nFwd: ${lnk.forwardCost}`,
        arrows: "to",
        smooth: { type: "curvedCW", roundness: 0.15 },
        width: currentConfig.linkWidth,
        color: { color: '#22c55e', highlight: "#ef4444" },
        cost: lnk.forwardCost,
        ifaceFrom: 'Custom',
        ifaceTo: 'Custom',
        logicalId: logicalId,
        font: { align: 'middle', size: 9, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
      });
      visEdges.push({
        id: `${lnk.id}_r`,
        from: lnk.to,
        to: lnk.from,
        label: `CUSTOM\\nRev: ${lnk.reverseCost}`,
        arrows: "to",
        smooth: { type: "curvedCW", roundness: 0.15 },
        width: currentConfig.linkWidth,
        color: { color: '#22c55e', highlight: "#ef4444" },
        cost: lnk.reverseCost,
        ifaceFrom: 'Custom',
        ifaceTo: 'Custom',
        logicalId: logicalId,
        font: { align: 'middle', size: 9, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
      });
    });

    return { visNodes, visEdges };
  }, [isDark, customLinks]); // Added customLinks dependency

  useEffect(() => {
    if (!containerRef.current) return;

    const { visNodes, visEdges } = getInitialData();
    nodesDataSet.current.clear();
    nodesDataSet.current.add(visNodes);
    edgesDataSet.current.clear();
    edgesDataSet.current.add(visEdges);

    const data = { nodes: nodesDataSet.current, edges: edgesDataSet.current };
    const options = {
      physics: {
        stabilization: true,
        barnesHut: {
          gravitationalConstant: -20000,
          springLength: 200,
          springConstant: 0.04,
          avoidOverlap: 0.2
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: false
      },
      edges: {
        smooth: { enabled: true, type: 'dynamic', roundness: 0.5 },
        font: { multi: false, strokeWidth: 0 },
        selectionWidth: 3,
        widthConstraint: { maximum: 120 }
      },
      nodes: {
        borderWidth: 2,
        shadow: true
      }
    };

    networkRef.current = new Network(containerRef.current, data, options);
    setIsNetworkInitialized(true);
    setIsLoading(false);

    // --- Custom Canvas Drawing for Country Hulls ---
    networkRef.current.on("beforeDrawing", (ctx: CanvasRenderingContext2D) => {
      // Check ref directly to support hot-toggling without re-binding listener
      const config = visualConfigRef.current;
      if (!config.showHull) return;

      const countryCodes = [...new Set(NODES.map(n => n.country))];

      countryCodes.forEach(code => {
        if (!activeCountriesRef.current[code]) return;
        // Get all node IDs for this country
        const countryNodeIds = NODES.filter(n => n.country === code).map(n => n.id);

        // Get positions from vis-network (only works if nodes are placed)
        const positionsObj = networkRef.current?.getPositions(countryNodeIds);
        if (!positionsObj) return;

        const points: Point[] = Object.values(positionsObj).map((p: any) => ({ x: p.x, y: p.y }));
        if (points.length === 0) return;

        // Calculate convex hull
        const hull = getConvexHull(points);
        const colorHex = COUNTRIES[code] || "#cccccc";

        ctx.beginPath();
        if (hull.length > 0) {
          ctx.moveTo(hull[0].x, hull[0].y);
          for (let i = 1; i < hull.length; i++) {
            ctx.lineTo(hull[i].x, hull[i].y);
          }
          ctx.closePath();
        }

        // Style the hull
        ctx.fillStyle = hexToRgba(colorHex, 0.15); // Semi-transparent fill
        ctx.strokeStyle = hexToRgba(colorHex, 0.4); // Solid border
        ctx.lineWidth = config.hullPadding; // Adjustable Line Width / Padding
        ctx.lineJoin = "round"; // Round corners for the hull

        // Stroke first to create the rounded "fence" effect
        ctx.stroke();
        ctx.fill();

        // Draw Country Label
        const centroid = getCentroid(points);
        ctx.font = `bold ${config.hullFontSize}px Arial`; // Adjustable Font Size
        ctx.fillStyle = hexToRgba(colorHex, 0.3); // Opacity for visibility
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Optional: Text Border/Stroke for legibility against dense edges
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.strokeText(code, centroid.x, centroid.y);
        ctx.fillText(code, centroid.x, centroid.y);
      });
    });

    networkRef.current.on("click", function (params) {
      if (params.edges && params.edges.length) {
        const id = params.edges[0];
        const edge = edgesDataSet.current.get(id);

        if (edge) {
          setSelectedEdgeId(id);
          setProposedCost(edge.cost);
          addLog(`Selected Link: ${edge.ifaceFrom} -> ${edge.ifaceTo} (Cost: ${edge.cost})`);

          const relatedEdges = edgesDataSet.current.get({
            filter: (item) => item.logicalId === edge.logicalId
          });

          // Reset all
          const allEdges = edgesDataSet.current.get();
          const defaultColor = isDark ? '#334155' : '#cbd5e1';
          const defaultWidth = visualConfigRef.current.linkWidth;

          edgesDataSet.current.update(allEdges.map(e => ({
            id: e.id,
            width: defaultWidth,
            color: { color: defaultColor },
            dashes: false
          })));

          // Highlight
          edgesDataSet.current.update(relatedEdges.map(e => {
            const isSelected = e.id === id;
            return {
              id: e.id,
              width: defaultWidth + 2, // Highlight is thicker than base
              color: { color: isSelected ? "#3b82f6" : "#f59e0b" }
            };
          }));
        }
      } else if (params.nodes && params.nodes.length) {
        const id = params.nodes[0];
        const node = nodesDataSet.current.get(id);
        if (node) {
          // Check if we're in new link creation mode
          handleNodeClickForLink(id);

          addLog(`Selected Router: ${node.label} (${node.country})`);
          setSelectedEdgeId(null);
          // Reset styles
          const allEdges = edgesDataSet.current.get();
          const defaultColor = isDark ? '#334155' : '#cbd5e1';
          const defaultWidth = visualConfigRef.current.linkWidth;

          edgesDataSet.current.update(allEdges.map(e => ({
            id: e.id,
            width: defaultWidth,
            color: { color: defaultColor },
            dashes: false
          })));
        }
      } else {
        setSelectedEdgeId(null);
        const allEdges = edgesDataSet.current.get();
        const defaultColor = isDark ? '#334155' : '#cbd5e1';
        const defaultWidth = visualConfigRef.current.linkWidth;

        edgesDataSet.current.update(allEdges.map(e => ({
          id: e.id,
          width: defaultWidth,
          color: { color: defaultColor },
          dashes: false
        })));
      }
    });

    addLog("Network Initialized.");

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
      setIsNetworkInitialized(false);
    };
  }, [isDark, customLinks, visualConfig.nodeSize, visualConfig.nodeFontSize, visualConfig.linkWidth, NODES, LINKS]); // Re-initialize when data or customLinks changes

  // CRITICAL FIX: Re-render network when customLinks changes
  useEffect(() => {
    if (!isNetworkInitialized || !networkRef.current) return;
    
    // Rebuild edges to include custom links
    const { visNodes, visEdges } = getInitialData();
    edgesDataSet.current.clear();
    edgesDataSet.current.add(visEdges);
    
    addLog(`Custom links updated: ${customLinks.length} custom link(s)`);
  }, [customLinks, isNetworkInitialized, getInitialData]);


  // --- Actions ---

  const handleReset = () => {
    const { visNodes, visEdges } = getInitialData();
    nodesDataSet.current.clear();
    nodesDataSet.current.add(visNodes);
    edgesDataSet.current.clear();
    edgesDataSet.current.add(visEdges);
    networkRef.current?.fit();
    setImpactResults(null);
    setSelectedEdgeId(null);
    // Reset to first two different routers instead of empty strings
    if (NODES.length >= 2) {
      setSource(NODES[0].id);
      setDestination(NODES[1].id);
    }
    addLog("Visualization reset.");
  };

  const handleSwap = () => {
    setSource(destination);
    setDestination(source);
    addLog("Swapped Source and Destination.");
  };

  const handleAnimate = async (overrideSrc?: string, overrideDest?: string, tempOverrideEdge?: { id: string, cost: number }) => {
    const src = overrideSrc ?? source;
    const dest = overrideDest ?? destination;

    if (!networkRef.current) return;
    if (src === dest || !src || !dest) {
      addLog("Please select valid source and destination.");
      return;
    }

    setPlaying(true);
    const currentNodes = nodesDataSet.current.get();
    const rawEdges = edgesDataSet.current.get();
    
    const srcNode = currentNodes.find(n => n.id === src);
    const destNode = currentNodes.find(n => n.id === dest);
    addLog(`Finding path: ${srcNode?.label} -> ${destNode?.label}...`);

    // CRITICAL FIX: Filter nodes based on country visibility
    const visibleNodes = currentNodes.filter(n => {
      return !n.country || activeCountries[n.country] !== false;
    });

    // CRITICAL FIX: Filter edges where both endpoints are visible
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    const visibleEdges = rawEdges.filter(e => {
      return visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to);
    });

    // Apply temporary cost if provided
    const effectiveEdges = visibleEdges.map(e => {
      if (tempOverrideEdge && e.id === tempOverrideEdge.id) {
        return { ...e, cost: tempOverrideEdge.cost };
      }
      return e;
    });

    // Reset visual state before animation
    const defaultEdgeColor = isDark ? '#334155' : '#cbd5e1';
    const defaultNodeBorder = isDark ? '#94a3b8' : '#334155';
    const defaultWidth = visualConfigRef.current.linkWidth;

    nodesDataSet.current.update(currentNodes.map(n => ({
      id: n.id,
      color: { background: COUNTRIES[n.country || ''] || '#94a3b8', border: defaultNodeBorder },
      size: visualConfigRef.current.nodeSize
    })));
    edgesDataSet.current.update(rawEdges.map(e => ({
      id: e.id,
      color: { color: defaultEdgeColor },
      width: defaultWidth,
      dashes: false
    })));

    const result = dijkstraDirected(src, dest, visibleNodes, effectiveEdges);

    if (!result) {
      addLog("No path found.");
      setPlaying(false);
      return;
    }

    const isECMP = result.isECMP;
    const waveColor = isECMP ? "#d946ef" : "#eab308";
    const finalColor = isECMP ? "#9333ea" : "#22c55e";

    // Animate
    for (let i = 0; i < result.steps.length; i++) {
      const stepNodes = result.steps[i];
      nodesDataSet.current.update(stepNodes.map(nid => ({
        id: nid,
        size: visualConfigRef.current.nodeSize + 10,
        color: { border: "#000000", background: NODES.find(n => n.id === nid)?.country ? COUNTRIES[NODES.find(n => n.id === nid)!.country] : '#666' }
      })));

      if (i > 0) {
        const prevNodes = result.steps[i - 1];
        const stepEdges = effectiveEdges.filter(e =>
          result.edges.includes(e.id) &&
          prevNodes.includes(e.from) &&
          stepNodes.includes(e.to)
        );
        edgesDataSet.current.update(stepEdges.map(e => ({
          id: e.id,
          color: { color: waveColor },
          width: defaultWidth + 3
        })));
      }

      if (i === 0) networkRef.current.focus(src, { scale: 1.0, animation: { duration: 500 } });
      await new Promise(r => setTimeout(r, 600));
    }

    // Finalize
    edgesDataSet.current.update(result.edges.map(eid => ({
      id: eid,
      color: { color: finalColor },
      width: defaultWidth + 3,
      dashes: isECMP
    })));

    setPlaying(false);
  };

  const handleReturnPath = () => {
    if (playing) return;
    const newSrc = destination;
    const newDest = source;
    setSource(newSrc);
    setDestination(newDest);
    handleAnimate(newSrc, newDest);
  };

  // Helper function to determine impact type
  const determineImpactType = (oldR: any, newR: any, newEdgeIds?: string[]): ImpactType => {
    const pathChanged = !oldR.edges.every((e: string) => newR.edges.includes(e)) ||
      oldR.edges.length !== newR.edges.length;

    // Check for MIGRATION: Does the new path use any of the new edges?
    if (newEdgeIds && newEdgeIds.length > 0) {
      const usesNewEdge = newR.edges.some((e: string) => newEdgeIds.includes(e));
      if (usesNewEdge) return 'MIGRATION';
    }

    if (oldR.isECMP && !newR.isECMP) return 'lost_ecmp';
    if (!oldR.isECMP && newR.isECMP) return 'new_ecmp';

    // If path changed but not a migration (or no new edges defined), it's a REROUTE
    if (pathChanged) return 'REROUTE';

    if (newR.cost > oldR.cost) return 'cost_increase';
    return 'cost_decrease';
  };

  // Helper function to aggregate by country pairs
  const aggregateByCountry = (results: ImpactResult[]): CountryFlowAggregation[] => {
    const aggregations = new Map<string, CountryFlowAggregation>();

    for (const result of results) {
      const key = `${result.src.country}->${result.dest.country}`;

      if (!aggregations.has(key)) {
        aggregations.set(key, {
          srcCountry: result.src.country,
          destCountry: result.dest.country,
          totalFlows: 0,
          costIncreases: 0,
          costDecreases: 0,
          pathMigrations: 0,
          avgCostDelta: 0,
          flows: []
        });
      }

      const agg = aggregations.get(key)!;
      agg.totalFlows++;
      agg.flows.push(result);

      if (result.impactType === 'cost_increase') agg.costIncreases++;
      else if (result.impactType === 'cost_decrease') agg.costDecreases++;
      if (result.pathChanged) agg.pathMigrations++;
    }

    // Calculate average cost delta for each aggregation
    for (const agg of aggregations.values()) {
      const totalDelta = agg.flows.reduce((sum, f) => sum + (f.newCost - f.oldCost), 0);
      agg.avgCostDelta = agg.totalFlows > 0 ? totalDelta / agg.totalFlows : 0;
    }

    return Array.from(aggregations.values()).sort((a, b) => b.totalFlows - a.totalFlows);
  };

  // PERFORMANCE OPTIMIZATION: Use simplified synchronous calculation for now
  // Web Worker implementation would require bundler configuration changes
  const handleSimulateImpact = (customEdges?: VisEdge[]) => {
    console.log('handleSimulateImpact started', { customEdges: !!customEdges, selectedEdgeId });
    if (!selectedEdgeId && !customEdges) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    addLog("Simulating impact...");

    // Use setTimeout to allow UI to update with progress indicator
    setTimeout(() => {
      try {
        const currentNodes = nodesDataSet.current.get();
        const currentEdges = edgesDataSet.current.get();
        console.log('handleSimulateImpact: Data fetched', { nodes: currentNodes.length, edges: currentEdges.length });

        // Filter nodes based on country visibility
        const visibleNodes = currentNodes.filter(n => {
          return !n.country || activeCountries[n.country] !== false;
        });

        // Filter edges where both endpoints are visible
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        const visibleCurrentEdges = currentEdges.filter(e => {
          return visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to);
        });

        let modifiedEdges: VisEdge[];
        let newEdgeIds: string[] = [];

        if (customEdges) {
          modifiedEdges = customEdges.filter(e => {
            return visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to);
          });
          const currentIds = new Set(visibleCurrentEdges.map(e => e.id));
          newEdgeIds = modifiedEdges.filter(e => !currentIds.has(e.id)).map(e => e.id);
        } else {
          const selectedEdge = visibleCurrentEdges.find(e => e.id === selectedEdgeId);
          if (!selectedEdge) {
            setIsAnalyzing(false);
            return;
          }

          modifiedEdges = visibleCurrentEdges.map(e => {
            if (e.logicalId === selectedEdge.logicalId) {
              return { ...e, cost: proposedCost };
            }
            return e;
          });
        }

        const changes: ImpactResult[] = [];
        const startTime = performance.now();
        const visibleRouters = NODES.filter(n => visibleNodeIds.has(n.id));
        const totalPairs = visibleRouters.length * (visibleRouters.length - 1);
        let processed = 0;

        console.log(`Starting simulation loop with ${visibleRouters.length} visible nodes (filtered from ${NODES.length} total)`);
        
        for (const src of visibleRouters) {
          for (const dest of visibleRouters) {
            if (src.id === dest.id) continue;

            const oldR = dijkstraDirected(src.id, dest.id, visibleNodes, visibleCurrentEdges);
            const newR = dijkstraDirected(src.id, dest.id, visibleNodes, modifiedEdges);

            if (oldR && newR && (oldR.cost !== newR.cost || oldR.edges.length !== newR.edges.length || !oldR.edges.every(e => newR.edges.includes(e)))) {
              const pathChanged = !oldR.edges.every(e => newR.edges.includes(e)) ||
                oldR.edges.length !== newR.edges.length;

              changes.push({
                src,
                dest,
                oldCost: oldR.cost,
                newCost: newR.cost,
                oldPath: oldR.canonicalPath.map(id => NODES.find(n => n.id === id)?.name || id),
                newPath: newR.canonicalPath.map(id => NODES.find(n => n.id === id)?.name || id),
                isECMP: newR.isECMP,
                wasECMP: oldR.isECMP,
                impactType: determineImpactType(oldR, newR, newEdgeIds),
                pathChanged
              });
            }

            processed++;
            // Update progress every 50 calculations
            if (processed % 50 === 0) {
              setAnalysisProgress(Math.round((processed / totalPairs) * 100));
            }
          }
        }

        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`Simulation finished. Duration: ${duration}s. Changes found: ${changes.length}`);
        const countryAggs = aggregateByCountry(changes);

        setImpactResults(changes);
        setCountryAggregations(countryAggs);
        setShowImpactModal(true);
        setIsAnalyzing(false);
        setAnalysisProgress(100);

        // Log summary
        const costIncreases = changes.filter(c => c.impactType === 'cost_increase').length;
        const costDecreases = changes.filter(c => c.impactType === 'cost_decrease').length;
        const pathMigrations = changes.filter(c => c.pathChanged).length;

        addLog(`Simulation done in ${duration}s. ${changes.length} flows impacted.`);
        addLog(`  ↑ Cost increases: ${costIncreases} | ↓ Cost decreases: ${costDecreases} | ⇄ Path migrations: ${pathMigrations}`);
      } catch (error) {
        console.error('Impact analysis error:', error);
        addLog('❌ Impact analysis failed');
        setIsAnalyzing(false);
      }
    }, 100); // Short delay to allow UI to update
  };

  // CRITICAL FIX: Support asymmetric cost changes
  const [costChangeDirection, setCostChangeDirection] = useState<'forward' | 'reverse' | 'both'>('both');

  const applyCostChange = () => {
    if (!selectedEdgeId) return;
    const edge = edgesDataSet.current.get(selectedEdgeId);
    if (!edge) return;

    // Update edges based on selected direction
    const allEdges = edgesDataSet.current.get();
    const relatedEdges = allEdges.filter(e => e.logicalId === edge.logicalId);

    const updates = relatedEdges.map(e => {
      // Determine if this is forward or reverse direction
      const isForward = (e.from === edge.from && e.to === edge.to);
      
      if (costChangeDirection === 'both') {
        // Update both directions
        return {
          id: e.id,
          cost: proposedCost,
          label: `${e.ifaceFrom} -> ${e.ifaceTo}\nCost: ${proposedCost}`
        };
      } else if (costChangeDirection === 'forward' && isForward) {
        // Update only forward direction
        return {
          id: e.id,
          cost: proposedCost,
          label: `${e.ifaceFrom} -> ${e.ifaceTo}\nCost: ${proposedCost}`
        };
      } else if (costChangeDirection === 'reverse' && !isForward) {
        // Update only reverse direction
        return {
          id: e.id,
          cost: proposedCost,
          label: `${e.ifaceFrom} -> ${e.ifaceTo}\nCost: ${proposedCost}`
        };
      } else {
        // No change for this edge
        return { id: e.id };
      }
    });

    edgesDataSet.current.update(updates);
    setShowImpactModal(false);
    const direction = costChangeDirection === 'both' ? 'both directions' : `${costChangeDirection} direction`;
    addLog(`Cost updated for ${direction}.`);
  };

  const handleVisualizeFlow = (res: ImpactResult) => {
    setSource(res.src.id);
    setDestination(res.dest.id);
    setShowImpactModal(false);
    // Only pass tempOverrideEdge if we have a selected edge (cost change scenario)
    // For new link scenarios, the edges are already in the simulation
    if (selectedEdgeId) {
      setTimeout(() => handleAnimate(res.src.id, res.dest.id, { id: selectedEdgeId, cost: proposedCost }), 100);
    } else {
      setTimeout(() => handleAnimate(res.src.id, res.dest.id), 100);
    }
  };

  const handleExport = () => {
    // Export current state, not just initial constants
    const currentEdges = edgesDataSet.current.get();

    // Map edges back to logical links format
    // We need to deduplicate because we have forward and reverse edges
    const logicalLinksMap = new Map();

    currentEdges.forEach(edge => {
      // Use logicalId to group forward and reverse edges of the same link
      if (!logicalLinksMap.has(edge.logicalId)) {
        // This is the first edge of this logical link we've encountered
        logicalLinksMap.set(edge.logicalId, {
          source: edge.from,
          target: edge.to,
          forward_cost: edge.cost,
          reverse_cost: 0 // Will fill from reverse edge
        });
      } else {
        const link = logicalLinksMap.get(edge.logicalId);
        // If this is the reverse edge (target -> source matches stored source -> target)
        if (edge.from === link.target && edge.to === link.source) {
          link.reverse_cost = edge.cost;
        } else if (edge.from === link.source && edge.to === link.target) {
          // This is the forward edge, update cost just in case (should already be set)
          link.forward_cost = edge.cost;
        }
      }
    });

    // Unified export format
    const exportData = {
      version: "1.0",
      type: "ospf-topology",
      exportedFrom: viewMode.toLowerCase(),
      exportedAt: new Date().toISOString(),
      data: {
        nodes: NODES,
        links: Array.from(logicalLinksMap.values()),
        customLinks: customLinks,
        visualConfig: visualConfig,
        physicsConfig: physicsConfig,
        activeCountries: activeCountries,
        metadata: {
          totalNodes: NODES.length,
          totalLinks: logicalLinksMap.size,
          customLinksCount: customLinks.length
        }
      }
    };

    // VALIDATION: Ensure export meets requirements
    const validation = validateExportedJSON(exportData);
    if (!validation.isValid) {
      alert(`❌ Export Validation Failed\n\n${validation.errorMessage}\n\nPlease report this issue - exports should always be valid.`);
      console.error('Export validation failed:', validation, exportData);
      return;
    }

    console.log('✅ Export validation passed:', validation.detectedFormat);

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ospf-${viewMode.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addLog(`Exported ${viewMode} data: ${NODES.length} nodes, ${logicalLinksMap.size} links`);
  };

  // New Link Creation Functions
  const startNewLinkCreation = () => {
    setNewLinkConfig({ fromNode: null, toNode: null, forwardCost: 10, reverseCost: 10, isCreating: true });
    setSelectedNodeForLink(null);
    addLog("Click on source node to start creating a new link...");
  };

  const cancelNewLinkCreation = () => {
    setNewLinkConfig({ fromNode: null, toNode: null, forwardCost: 10, reverseCost: 10, isCreating: false });
    setSelectedNodeForLink(null);
    setShowNewLinkModal(false);
    addLog("Link creation cancelled.");
  };

  const handleNodeClickForLink = (nodeId: string) => {
    if (!newLinkConfig.isCreating) return;

    const node = NODES.find(n => n.id === nodeId);
    if (!node) return;

    if (!newLinkConfig.fromNode) {
      setNewLinkConfig(prev => ({ ...prev, fromNode: nodeId }));
      setSelectedNodeForLink(nodeId);
      addLog(`Source node selected: ${node.name}. Now click on destination node...`);
    } else if (newLinkConfig.fromNode !== nodeId) {
      setNewLinkConfig(prev => ({ ...prev, toNode: nodeId }));
      setShowNewLinkModal(true);
      addLog(`Destination node selected: ${node.name}. Configure link cost.`);
    }
  };

  const simulateNewLink = (fromNode?: string, toNode?: string, fwdCost?: number, revCost?: number) => {
    try {
      const srcNode = fromNode || newLinkConfig.fromNode;
      const dstNode = toNode || newLinkConfig.toNode;
      const forwardCost = fwdCost ?? newLinkConfig.forwardCost;
      const reverseCost = revCost ?? newLinkConfig.reverseCost;

      if (!srcNode || !dstNode) {
        console.error("Missing source or destination node");
        return;
      }

      const currentEdges = edgesDataSet.current.get();
      const themeColors = {
        edgeDefault: isDark ? '#334155' : '#cbd5e1',
        edgeFontBg: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255,255,255,0.85)',
        edgeFontColor: isDark ? '#94a3b8' : '#475569'
      };

      const newLogicalId = Math.max(...currentEdges.map(e => e.logicalId)) + 1;

      // Create forward and reverse edges for the new link with separate costs
      const newEdges: VisEdge[] = [
        ...currentEdges,
        {
          id: `new_${newLogicalId}_f`,
          from: srcNode,
          to: dstNode,
          label: `NEW\\nFwd: ${forwardCost}`,
          arrows: "to",
          smooth: { type: "curvedCW", roundness: 0.15 },
          width: visualConfigRef.current.linkWidth,
          color: { color: '#22c55e', highlight: "#ef4444" },
          cost: forwardCost,
          ifaceFrom: 'NewInterface',
          ifaceTo: 'NewInterface',
          logicalId: newLogicalId,
          font: { align: 'middle', size: 9, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
        },
        {
          id: `new_${newLogicalId}_r`,
          from: dstNode,
          to: srcNode,
          label: `NEW\\nRev: ${reverseCost}`,
          arrows: "to",
          smooth: { type: "curvedCW", roundness: 0.15 },
          width: visualConfigRef.current.linkWidth,
          color: { color: '#22c55e', highlight: "#ef4444" },
          cost: reverseCost,
          ifaceFrom: 'NewInterface',
          ifaceTo: 'NewInterface',
          logicalId: newLogicalId,
          font: { align: 'middle', size: 9, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
        }
      ];

      const srcNodeObj = NODES.find(n => n.id === srcNode);
      const dstNodeObj = NODES.find(n => n.id === dstNode);
      console.log('SimulateNewLink: Nodes found', srcNodeObj?.name, dstNodeObj?.name);
      addLog(`Simulating new link: ${srcNodeObj?.name} <-> ${dstNodeObj?.name} (Fwd: ${forwardCost}, Rev: ${reverseCost})`);

      console.log('SimulateNewLink: Calling handleSimulateImpact');
      handleSimulateImpact(newEdges);
      console.log('SimulateNewLink: handleSimulateImpact returned');
    } catch (e) {
      console.error("Error in simulateNewLink:", e);
    }
  };

  const applyNewLink = (srcNode?: string, dstNode?: string, fwdCost?: number, revCost?: number) => {
    const fromId = srcNode || newLinkConfig.fromNode;
    const toId = dstNode || newLinkConfig.toNode;
    const forwardCost = fwdCost ?? newLinkConfig.forwardCost;
    const reverseCost = revCost ?? newLinkConfig.reverseCost;

    if (!fromId || !toId) return;

    const currentEdges = edgesDataSet.current.get();
    const themeColors = {
      edgeDefault: isDark ? '#334155' : '#cbd5e1',
      edgeFontBg: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255,255,255,0.85)',
      edgeFontColor: isDark ? '#94a3b8' : '#475569'
    };

    const newLogicalId = Math.max(...currentEdges.map(e => e.logicalId)) + 1;
    const linkId = `custom_${Date.now()}`;

    // Add the new edges to the dataset with separate forward/reverse costs
    edgesDataSet.current.add([
      {
        id: `${linkId}_f`,
        from: fromId,
        to: toId,
        label: `CUSTOM\\nFwd: ${forwardCost}`,
        arrows: "to",
        smooth: { type: "curvedCW", roundness: 0.15 },
        width: visualConfigRef.current.linkWidth,
        color: { color: '#22c55e', highlight: "#ef4444" },
        cost: forwardCost,
        ifaceFrom: 'CustomInterface',
        ifaceTo: 'CustomInterface',
        logicalId: newLogicalId,
        font: { align: 'middle', size: 9, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
      },
      {
        id: `${linkId}_r`,
        from: toId,
        to: fromId,
        label: `CUSTOM\\nRev: ${reverseCost}`,
        arrows: "to",
        smooth: { type: "curvedCW", roundness: 0.15 },
        width: visualConfigRef.current.linkWidth,
        color: { color: '#22c55e', highlight: "#ef4444" },
        cost: reverseCost,
        ifaceFrom: 'CustomInterface',
        ifaceTo: 'CustomInterface',
        logicalId: newLogicalId,
        font: { align: 'middle', size: 9, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
      }
    ]);

    // Track custom link
    setCustomLinks(prev => [...prev, {
      id: linkId,
      from: fromId,
      to: toId,
      forwardCost,
      reverseCost,
      createdAt: new Date()
    }]);

    const fromNodeObj = NODES.find(n => n.id === fromId);
    const toNodeObj = NODES.find(n => n.id === toId);
    addLog(`New link created: ${fromNodeObj?.name} <-> ${toNodeObj?.name} (Fwd: ${forwardCost}, Rev: ${reverseCost})`);

    cancelNewLinkCreation();
  };

  const selectedEdgeObj = selectedEdgeId ? edgesDataSet.current.get(selectedEdgeId) : null;

  const [viewMode, setViewMode] = useState<'VISUALIZER' | 'DESIGNER' | 'PLANNER'>('VISUALIZER');

  // Handler for Scenario Planner
  const handleRunScenario = (changes: any[]) => {
    const currentEdges = edgesDataSet.current.get();
    const modifiedEdges = currentEdges.map(e => {
      const change = changes.find(c => c.edgeId === e.id);
      if (change) {
        return { ...e, cost: change.newCost };
      }
      return e;
    });
    handleSimulateImpact(modifiedEdges);
  };

  // Handler for Topology Designer
  const handleAddNode = (node: RouterNode) => {
    // Use immutable state management instead of direct mutation
    try {
      networkData.addNode(node);
      
      // Update VisJS DataSet
      nodesDataSet.current.add({
        id: node.id,
        label: node.name,
        title: `Router: ${node.name} (${node.country})`,
        color: { background: COUNTRIES[node.country] || "#94a3b8", border: isDark ? '#94a3b8' : '#334155' },
        country: node.country,
        shape: "dot",
        size: visualConfig.nodeSize,
        font: { color: isDark ? '#e2e8f0' : '#1e293b', size: visualConfig.nodeFontSize }
      });
      addLog(`Node added: ${node.name}`);
    } catch (error) {
      const err = error as Error;
      addLog(`❌ Error adding node: ${err.message}`);
      console.error('Error adding node:', error);
    }
  };

  const handleRemoveNode = (nodeId: string) => {
    try {
      // Use immutable state management
      networkData.removeNode(nodeId);
      
      // Remove from VisJS
      nodesDataSet.current.remove(nodeId);
      
      // Also remove connected edges
      const edgesToRemove = edgesDataSet.current.get()
        .filter(e => e.from === nodeId || e.to === nodeId)
        .map(e => e.id);
      edgesDataSet.current.remove(edgesToRemove);
      
      addLog(`Node removed: ${nodeId}`);
    } catch (error) {
      const err = error as Error;
      addLog(`❌ Error removing node: ${err.message}`);
      console.error('Error removing node:', error);
    }
  };

  // Handler for importing design
  const handleImportDesign = (nodes: RouterNode[]) => {
    try {
      // Use immutable state management - replaceAllData
      networkData.replaceAllData(nodes, []);
      
      // Clear and rebuild VisJS
      nodesDataSet.current.clear();
      
      nodes.forEach(n => {
        nodesDataSet.current.add({
          id: n.id,
          label: n.name,
          title: `Router: ${n.name} (${n.country})`,
          color: { background: COUNTRIES[n.country] || "#94a3b8", border: isDark ? '#94a3b8' : '#334155' },
          country: n.country,
          shape: "dot",
          size: visualConfig.nodeSize,
          font: { color: isDark ? '#e2e8f0' : '#1e293b', size: visualConfig.nodeFontSize }
        });
      });
      
      // Fit network to view
      networkRef.current?.fit({ animation: { duration: 500 } });
      
      addLog(`Design imported: ${nodes.length} nodes.`);
    } catch (error) {
      const err = error as Error;
      addLog(`❌ Error importing design: ${err.message}`);
      console.error('Error importing design:', error);
    }
  };

  // Handler for saving scenario
  const handleSaveScenario = (changes: any[]) => {
    const data = JSON.stringify(changes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ospf-scenario-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addLog(`Scenario saved with ${changes.length} changes.`);
  };

  // Universal import handler - handles all export formats
  const handleImportTopology = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rawData = JSON.parse(content);

        // VALIDATION: Use centralized validator
        const validation = validateImportedJSON(rawData);

        if (!validation.isValid) {
          alert(`❌ Import Failed\n\n${validation.errorMessage}\n\nPlease ensure your file contains either:\n• A "nodes" array (for topology files)\n• A "files" array (for PyATS automation exports)`);
          console.error('Validation failed:', validation);
          event.target.value = ''; // Reset file input
          return;
        }

        // Log validation success
        console.log(`✅ Validation passed: ${validation.detectedFormat} format detected`);
        if (validation.warnings && validation.warnings.length > 0) {
          console.warn('Warnings:', validation.warnings);
        }

        // Detect format and normalize
        let data;
        if (rawData.version && rawData.type === 'ospf-topology') {
          // New unified format
          data = rawData.data;
        } else if (rawData.nodes && rawData.links) {
          // Legacy visualizer format
          data = rawData;
        } else if (rawData.nodes && !rawData.links) {
          // Designer format
          data = { nodes: rawData.nodes, links: [] };
        } else if (Array.isArray(rawData)) {
          // Planner format - skip for now
          alert("Scenario files cannot be imported as topology. Use Scenario Planner's Load button.");
          return;
        } else if (rawData.files) {
          // PyATS format - reject for topology import
          alert("⚠️ PyATS Automation File Detected\n\nThis appears to be a PyATS automation export (contains 'files' array).\nIt cannot be imported as a network topology.\n\nTopology files must contain a 'nodes' array.");
          return;
        } else {
          alert("Unrecognized file format.");
          return;
        }

        if (data.nodes && Array.isArray(data.nodes)) {
          // Use immutable state management - DON'T mutate NODES array
          const newNodes: RouterNode[] = data.nodes;
          const newLinks: any[] = data.links && Array.isArray(data.links) ? data.links : [];
          
          // Clear existing data
          nodesDataSet.current.clear();
          edgesDataSet.current.clear();
          setCustomLinks([]);
          
          // Replace all data with imported data
          networkData.replaceAllData(newNodes, newLinks.map((l, idx) => ({
            ...l,
            a: l.source,
            b: l.target,
            ifA: l.source_interface || 'Imported',
            ifB: l.target_interface || 'Imported',
            costAB: l.forward_cost || l.cost || 10,
            costBA: l.reverse_cost || l.cost || 10
          })));

          // Load Nodes into VisJS
          newNodes.forEach((n: any) => {
            nodesDataSet.current.add({
              id: n.id,
              label: n.name,
              title: `Router: ${n.name} (${n.country})`,
              color: { background: COUNTRIES[n.country] || "#94a3b8", border: isDark ? '#94a3b8' : '#334155' },
              country: n.country,
              shape: "dot",
              size: visualConfig.nodeSize,
              font: { color: isDark ? '#e2e8f0' : '#1e293b', size: visualConfig.nodeFontSize }
            });
          });

          // Load Links if present
          if (data.links && Array.isArray(data.links)) {
            data.links.forEach((l: any, idx: number) => {
              const themeColors = {
                edgeDefault: isDark ? '#334155' : '#cbd5e1',
                edgeFontBg: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255,255,255,0.85)',
                edgeFontColor: isDark ? '#94a3b8' : '#475569'
              };

              // Detect if this is rich netviz-pro format
              const isRichFormat = l.source_interface && l.source_capacity;

              // Build enhanced tooltip
              const buildTooltip = (direction: 'forward' | 'reverse') => {
                if (!isRichFormat) return undefined;

                const cost = direction === 'forward' ? l.forward_cost : l.reverse_cost;
                const srcIface = direction === 'forward' ? l.source_interface : l.target_interface;
                const dstIface = direction === 'forward' ? l.target_interface : l.source_interface;
                const capacity = direction === 'forward' ? l.source_capacity : l.target_capacity;
                const srcNode = direction === 'forward' ? l.source : l.target;
                const dstNode = direction === 'forward' ? l.target : l.source;

                let tooltip = `<div style="font-family: monospace; font-size: 11px;">`;
                tooltip += `<b>${srcNode} → ${dstNode}</b><br/>`;
                tooltip += `<hr style="margin: 4px 0; border-color: #666;"/>`;
                tooltip += `Interface: ${srcIface} → ${dstIface}<br/>`;
                tooltip += `Cost: ${cost}${l.is_asymmetric ? ' (Asymmetric)' : ''}<br/>`;

                if (capacity) {
                  tooltip += `Capacity: ${capacity.speed}`;
                  if (capacity.is_bundle) {
                    tooltip += ` (${capacity.member_count}x${capacity.member_speed} bundle)`;
                  }
                  tooltip += ` - ${capacity.total_capacity_mbps} Mbps<br/>`;
                }

                if (l.traffic) {
                  const util = direction === 'forward' ? l.traffic.forward_utilization_pct : l.traffic.reverse_utilization_pct;
                  const traffic = direction === 'forward' ? l.traffic.forward_traffic_mbps : l.traffic.reverse_traffic_mbps;
                  tooltip += `Traffic: ${traffic} Mbps (${util}% util)<br/>`;
                }

                tooltip += `Status: ${l.status === 'up' ? '✅ UP' : '❌ DOWN'}<br/>`;
                tooltip += `Type: ${l.edge_type || 'unknown'}`;
                tooltip += `</div>`;

                return tooltip;
              };

              // Build enhanced label
              const buildLabel = (direction: 'forward' | 'reverse') => {
                const cost = direction === 'forward' ? l.forward_cost : l.reverse_cost;
                const iface = direction === 'forward' ? l.source_interface : l.target_interface;
                const capacity = direction === 'forward' ? l.source_capacity : l.target_capacity;

                if (isRichFormat && capacity) {
                  const shortIface = iface.replace('GigabitEthernet', 'Gi')
                    .replace('Bundle-Ether', 'BE')
                    .replace('HundredGigE', 'Hu');
                  return `${shortIface} [${capacity.speed}]\\nCost: ${cost}`;
                }
                return `${direction === 'forward' ? 'Fwd' : 'Rev'}: ${cost}`;
              };

              // Color coding for link types
              let edgeColor = themeColors.edgeDefault;
              if (l.is_asymmetric) {
                edgeColor = '#f59e0b'; // Orange for asymmetric
              } else if (l.edge_type === 'backbone') {
                edgeColor = '#3b82f6'; // Blue for backbone
              }

              // Forward Edge
              edgesDataSet.current.add({
                id: `e${idx}_f`,
                from: l.source,
                to: l.target,
                label: buildLabel('forward'),
                title: buildTooltip('forward'),
                arrows: "to",
                color: { color: edgeColor, highlight: "#ef4444" },
                width: visualConfig.linkWidth,
                cost: l.forward_cost,
                reverseCost: l.reverse_cost,
                ifaceFrom: l.source_interface || 'Imported',
                ifaceTo: l.target_interface || 'Imported',
                logicalId: idx,
                status: l.status,
                edgeType: l.edge_type,
                isAsymmetric: l.is_asymmetric,
                sourceCapacity: l.source_capacity,
                targetCapacity: l.target_capacity,
                traffic: l.traffic,
                font: { align: 'middle', size: 9, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
              });

              // Reverse Edge
              edgesDataSet.current.add({
                id: `e${idx}_r`,
                from: l.target,
                to: l.source,
                label: buildLabel('reverse'),
                title: buildTooltip('reverse'),
                arrows: "to",
                color: { color: edgeColor, highlight: "#ef4444" },
                width: visualConfig.linkWidth,
                cost: l.reverse_cost,
                reverseCost: l.forward_cost,
                ifaceFrom: l.target_interface || 'Imported',
                ifaceTo: l.source_interface || 'Imported',
                logicalId: idx,
                status: l.status,
                edgeType: l.edge_type,
                isAsymmetric: l.is_asymmetric,
                sourceCapacity: l.target_capacity,
                targetCapacity: l.source_capacity,
                traffic: l.traffic,
                font: { align: 'middle', size: 9, color: themeColors.edgeFontColor, background: themeColors.edgeFontBg }
              });
            });
          }

          // Load custom links if present
          if (data.customLinks && Array.isArray(data.customLinks)) {
            setCustomLinks(data.customLinks);
          }

          // Load visual config if present
          if (data.visualConfig) {
            setVisualConfig(data.visualConfig);
          }

          // Load physics config if present
          if (data.physicsConfig) {
            setPhysicsConfig(data.physicsConfig);
          }

          // Load active countries if present
          if (data.activeCountries) {
            setActiveCountries(data.activeCountries);
          }

          // CRITICAL FIX: Fit network and stabilize physics after import
          if (networkRef.current) {
            networkRef.current.fit({ animation: { duration: 800 } });
            networkRef.current.stabilize();
          }

          addLog(`Imported: ${data.nodes.length} nodes, ${data.links?.length || 0} links`);
        } else {
          alert("Invalid topology file format.");
        }
      } catch (err) {
        console.error("Error importing topology:", err);
        alert("Failed to parse topology file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`flex flex-col h-full relative font-sans transition-colors duration-200 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportTopology}
        className="hidden"
        accept=".json"
      />

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm z-10 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <NetworkIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">OSPF Visualizer Pro</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">100+ Nodes • ECMP • Path Simulation</p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('VISUALIZER')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'VISUALIZER' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Visualizer
          </button>
          <button
            onClick={() => setViewMode('DESIGNER')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'DESIGNER' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Designer
          </button>
          <button
            onClick={() => setViewMode('PLANNER')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'PLANNER' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Planner
          </button>
          <button
            onClick={() => setViewMode('ANALYSIS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'ANALYSIS' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Analysis
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Tools */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mr-2">
            <button
              onClick={() => setIsDijkstraModalOpen(true)}
              className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Shortest Path (Dijkstra)"
            >
              <Route className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsHealthModalOpen(true)}
              className="p-1.5 text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              title="Network Health"
            >
              <Activity className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsRippleModalOpen(true)}
              className="p-1.5 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              title="Ripple Effect Analysis"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowImpactModal(true)}
              className="p-1.5 text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              title="Impact Analysis"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              title="Import Topology JSON"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <div className="w-px bg-slate-300 dark:bg-slate-700 my-1 mx-1"></div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              title="Export Topology JSON"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="w-px bg-slate-300 dark:bg-slate-700 my-1 mx-1"></div>
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = '/TEMPLATE_OSPF_TOPOLOGY_COMPLETE.json';
                a.download = 'TEMPLATE_OSPF_TOPOLOGY_COMPLETE.json';
                a.click();
                addLog('Template downloaded - customize and import!');
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              title="Download Complete Template with All Fields"
            >
              <Download className="w-4 h-4" />
              Template
            </button>
          </div>

          {/* User Info Badge - Only show if user is provided */}
          {user && (
            <div className="flex items-center gap-2 ml-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">{user.username}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {user.role === 'admin' ? (
                      <span className="text-amber-600 dark:text-amber-400">Admin</span>
                    ) : (
                      user.email
                    )}
                    {user.loginsRemaining !== undefined && user.loginsRemaining <= 3 && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400 font-bold">
                        ({user.loginsRemaining} left)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {onChangePassword && (
                <button
                  onClick={onChangePassword}
                  className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                  title="Change Password"
                >
                  <Key className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </button>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* New Link Creation Banner */}
      {newLinkConfig.isCreating && (
        <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                {!newLinkConfig.fromNode
                  ? "Step 1: Click on the SOURCE router node"
                  : !newLinkConfig.toNode
                    ? `Step 2: Click on the DESTINATION router node (Source: ${NODES.find(n => n.id === newLinkConfig.fromNode)?.name})`
                    : "Step 3: Configure link cost"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {newLinkConfig.fromNode && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs rounded font-medium">
                {NODES.find(n => n.id === newLinkConfig.fromNode)?.name}
                {newLinkConfig.toNode && ` → ${NODES.find(n => n.id === newLinkConfig.toNode)?.name}`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">

        {viewMode === 'DESIGNER' && (
          <TopologyDesigner
            nodes={NODES}
            onAddNode={handleAddNode}
            onRemoveNode={handleRemoveNode}
            onSave={handleExport}
            onImportDesign={handleImportDesign}
          />
        )}
        {viewMode === 'PLANNER' && (
          <ScenarioPlanner
            edges={edgesDataSet.current ? edgesDataSet.current.get() : []}
            nodes={NODES}
            onRunScenario={handleRunScenario}
            onSaveScenario={handleSaveScenario}
          />
        )}



        {/* Sidebar */}
        {viewMode === 'VISUALIZER' && (
          <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto z-10 shadow-lg transition-colors duration-200">
            <div className="p-6 space-y-8">

              {/* Inspector */}
              {selectedEdgeObj && (
                <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 animate-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Link Properties
                    </h3>
                    <button onClick={() => setSelectedEdgeId(null)} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                      <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-blue-500" />
                        <div className="overflow-hidden">
                          <span className="font-semibold block text-blue-600 dark:text-blue-400 text-[10px] uppercase">Forward</span>
                          <span className="font-mono truncate">{selectedEdgeObj.ifaceFrom}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-amber-500" />
                        <div className="overflow-hidden">
                          <span className="font-semibold block text-amber-600 dark:text-amber-400 text-[10px] uppercase">Reverse</span>
                          <span className="font-mono truncate">{selectedEdgeObj.ifaceTo}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                      <label className="text-xs font-semibold text-blue-900 dark:text-blue-300 block mb-1">Proposed Cost</label>
                      <input
                        type="number"
                        min="1"
                        value={proposedCost}
                        onChange={(e) => setProposedCost(parseInt(e.target.value) || 1)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSimulateImpact()}
                        className="w-full px-3 py-1.5 text-sm border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-950 text-blue-900 dark:text-blue-100 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <button
                      onClick={handleSimulateImpact}
                      className="w-full mt-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-sm flex items-center justify-center gap-2"
                    >
                      <Activity className="w-3 h-3" /> Simulate Impact
                    </button>
                  </div>
                </section>
              )}

              {/* Controls */}
              <section className={selectedEdgeObj ? "opacity-50 pointer-events-none filter blur-[1px]" : ""}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Play className="w-4 h-4" /> Path Simulation
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Source Router</label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      disabled={playing}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                    >
                      {NODES.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>

                  <div className="flex justify-center -my-1 relative z-10">
                    <button
                      onClick={handleSwap}
                      disabled={playing}
                      className="p-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Destination Router</label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      disabled={playing}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                    >
                      {NODES.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAnimate()}
                        disabled={playing}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold shadow-sm transition-all
                        ${playing
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        {playing ? 'Routing...' : 'Run Path'}
                        {!playing && <Play className="w-3.5 h-3.5 fill-current" />}
                      </button>

                      <button
                        onClick={handleReturnPath}
                        disabled={playing}
                        className="px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 shadow-sm flex items-center gap-1 font-medium text-xs"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" /> Return
                      </button>

                      <button
                        onClick={handleReset}
                        disabled={playing}
                        className="px-3 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Logs */}
              <section className="flex-1 flex flex-col min-h-[200px]">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Logs
                </h3>
                <div className="bg-slate-100 dark:bg-slate-950 rounded-lg p-3 overflow-y-auto h-48 border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1.5 last:mb-0 leading-relaxed text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 dark:text-slate-500 mr-2">[{log.time}]</span>
                      {log.msg}
                    </div>
                  ))}
                </div>
              </section>

              {/* Topology Planning Panel */}
              <section className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-green-900 dark:text-green-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Link className="w-4 h-4" /> Topology Planner
                </h3>

                <div className="space-y-3">
                  {/* Source Node Dropdown */}
                  <div>
                    <label className="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">Source Router</label>
                    <select
                      value={plannerFromNode}
                      onChange={(e) => setPlannerFromNode(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      <option value="">Select source...</option>
                      {NODES.map(n => (
                        <option key={n.id} value={n.id}>{n.name} ({n.country})</option>
                      ))}
                    </select>
                  </div>

                  {/* Destination Node Dropdown */}
                  <div>
                    <label className="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">Destination Router</label>
                    <select
                      value={plannerToNode}
                      onChange={(e) => setPlannerToNode(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      <option value="">Select destination...</option>
                      {NODES.filter(n => n.id !== plannerFromNode).map(n => (
                        <option key={n.id} value={n.id}>{n.name} ({n.country})</option>
                      ))}
                    </select>
                  </div>

                  {/* Cost Inputs - Forward and Reverse */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">Forward Cost</label>
                      <input
                        type="number"
                        min="1"
                        max="65535"
                        value={plannerForwardCost}
                        onChange={(e) => setPlannerForwardCost(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-green-700 dark:text-green-400 block mb-1">Reverse Cost</label>
                      <input
                        type="number"
                        min="1"
                        max="65535"
                        value={plannerReverseCost}
                        onChange={(e) => setPlannerReverseCost(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        console.log('Analyze Impact Clicked');
                        if (plannerFromNode && plannerToNode) {
                          console.log('Calling simulateNewLink', plannerFromNode, plannerToNode);
                          simulateNewLink(plannerFromNode, plannerToNode, plannerForwardCost, plannerReverseCost);
                        } else {
                          console.log('Missing nodes for impact analysis');
                        }
                      }}
                      disabled={!plannerFromNode || !plannerToNode}
                      className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Activity className="w-3 h-3" /> Analyze Impact
                    </button>
                    <button
                      onClick={() => {
                        if (plannerFromNode && plannerToNode) {
                          applyNewLink(plannerFromNode, plannerToNode, plannerForwardCost, plannerReverseCost);
                          setPlannerFromNode('');
                          setPlannerToNode('');
                        }
                      }}
                      disabled={!plannerFromNode || !plannerToNode}
                      className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Link
                    </button>
                  </div>

                  {/* Custom Links List */}
                  {customLinks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                      <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Custom Links ({customLinks.length})
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {customLinks.map(link => {
                          const fromNode = NODES.find(n => n.id === link.from);
                          const toNode = NODES.find(n => n.id === link.to);
                          return (
                            <div key={link.id} className="text-[10px] p-1.5 bg-white dark:bg-slate-800 rounded border border-green-100 dark:border-green-900 flex items-center justify-between">
                              <span className="text-slate-600 dark:text-slate-300 truncate">
                                {fromNode?.name} ↔ {toNode?.name}
                              </span>
                              <span className="text-green-600 dark:text-green-400 font-mono ml-2">
                                {link.forwardCost}/{link.reverseCost}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Country Legend */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Countries
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(COUNTRIES).map(([code, color]) => (
                    <div key={code} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 shadow-sm">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{code}</span>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </aside>
        )}

        {/* Graph */}
        <main className="flex-1 relative bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-950 z-10">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Initializing Network Topology...</p>
              </div>
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />

          {/* Floating Visual Settings Dock - Bottom Left */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
            {/* Settings Toggle Button */}
            <button
              onClick={() => setShowVisualSettings(!showVisualSettings)}
              className={`p-3 rounded-full shadow-lg transition-all ${showVisualSettings
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              title="Visual Settings"
            >
              <Sliders className="w-5 h-5" />
            </button>

            {/* Regions Toggle Button */}
            <button
              onClick={() => setVisualConfig(prev => ({ ...prev, showHull: !prev.showHull }))}
              className={`p-3 rounded-full shadow-lg transition-all ${visualConfig.showHull
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              title={visualConfig.showHull ? "Hide Country Borders" : "Show Country Borders"}
            >
              <Layers className="w-5 h-5" />
            </button>
          </div>

          {/* Floating Visual Settings Panel */}
          {showVisualSettings && (
            <div className="absolute bottom-20 left-4 z-20 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" /> Visual Settings
                </h3>
                <button
                  onClick={() => setShowVisualSettings(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Show Regions</span>
                  <button
                    onClick={() => setVisualConfig(prev => ({ ...prev, showHull: !prev.showHull }))}
                    className={`w-10 h-5 rounded-full relative transition-colors ${visualConfig.showHull ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${visualConfig.showHull ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>Region Border</span>
                    <span className="font-mono">{visualConfig.hullPadding}px</span>
                  </div>
                  <input
                    type="range" min="5" max="100"
                    value={visualConfig.hullPadding}
                    onChange={(e) => setVisualConfig(prev => ({ ...prev, hullPadding: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>Region Label</span>
                    <span className="font-mono">{visualConfig.hullFontSize}px</span>
                  </div>
                  <input
                    type="range" min="12" max="150"
                    value={visualConfig.hullFontSize}
                    onChange={(e) => setVisualConfig(prev => ({ ...prev, hullFontSize: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>Router Label</span>
                    <span className="font-mono">{visualConfig.nodeFontSize}px</span>
                  </div>
                  <input
                    type="range" min="10" max="40"
                    value={visualConfig.nodeFontSize}
                    onChange={(e) => setVisualConfig(prev => ({ ...prev, nodeFontSize: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>Router Size</span>
                    <span className="font-mono">{visualConfig.nodeSize}px</span>
                  </div>
                  <input
                    type="range" min="10" max="60"
                    value={visualConfig.nodeSize}
                    onChange={(e) => setVisualConfig(prev => ({ ...prev, nodeSize: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>Link Width</span>
                    <span className="font-mono">{visualConfig.linkWidth}px</span>
                  </div>
                  <input
                    type="range" min="1" max="10" step="0.5"
                    value={visualConfig.linkWidth}
                    onChange={(e) => setVisualConfig(prev => ({ ...prev, linkWidth: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Physics Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wider">Physics</h4>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <span>Gravity</span>
                        <span className="font-mono">{physicsConfig.gravitationalConstant}</span>
                      </div>
                      <input
                        type="range" min="-50000" max="-1000" step="1000"
                        value={physicsConfig.gravitationalConstant}
                        onChange={(e) => setPhysicsConfig(prev => ({ ...prev, gravitationalConstant: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <span>Spring Length</span>
                        <span className="font-mono">{physicsConfig.springLength}</span>
                      </div>
                      <input
                        type="range" min="50" max="500" step="10"
                        value={physicsConfig.springLength}
                        onChange={(e) => setPhysicsConfig(prev => ({ ...prev, springLength: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Filters Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Filters</h4>
                    <button
                      onClick={() => {
                        const allActive = Object.values(activeCountries).every(v => v);
                        const newState: Record<string, boolean> = {};
                        Object.keys(COUNTRIES).forEach(c => newState[c] = !allActive);
                        setActiveCountries(newState);
                      }}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Toggle All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {Object.keys(COUNTRIES).map(country => (
                      <label key={country} className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${activeCountries[country]
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                          }`}>
                          {activeCountries[country] && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={activeCountries[country] || false}
                          onChange={() => setActiveCountries(prev => ({ ...prev, [country]: !prev[country] }))}
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{country}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Impact Modal - Enhanced with Country Aggregation */}
      {showImpactModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Impact Analysis
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {newLinkConfig.fromNode && newLinkConfig.toNode
                      ? `New link simulation: ${NODES.find(n => n.id === newLinkConfig.fromNode)?.name} ↔ ${NODES.find(n => n.id === newLinkConfig.toNode)?.name}`
                      : `Comparing paths with proposed cost ${proposedCost}`}
                  </p>
                </div>
                <button
                  onClick={() => { setShowImpactModal(false); if (newLinkConfig.isCreating) cancelNewLinkCreation(); }}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Summary Stats */}
              {impactResults && impactResults.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{impactResults.length}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Total Flows</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {impactResults.filter(r => r.impactType === 'cost_increase').length}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400">Cost Increases</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" />
                      {impactResults.filter(r => r.impactType === 'cost_decrease').length}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">Cost Decreases</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Route className="w-4 h-4" />
                      {impactResults.filter(r => r.pathChanged).length}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Path Migrations</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {impactResults.filter(r => r.isECMP !== r.wasECMP).length}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">ECMP Changes</div>
                  </div>
                </div>
              )}

              {/* View Toggle */}
              {impactResults && impactResults.length > 0 && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setImpactViewMode('countries')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${impactViewMode === 'countries'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                  >
                    <MapPin className="w-4 h-4" /> By Country
                  </button>
                  <button
                    onClick={() => setImpactViewMode('flows')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${impactViewMode === 'flows'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                  >
                    <Route className="w-4 h-4" /> All Flows
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/50">
              {impactResults && impactResults.length > 0 ? (
                impactViewMode === 'countries' && countryAggregations ? (
                  /* Country Aggregation View */
                  <div className="space-y-4">
                    {countryAggregations.map((agg, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: COUNTRIES[agg.srcCountry] || '#94a3b8' }}
                              />
                              <span className="font-bold text-slate-800 dark:text-slate-200">{agg.srcCountry}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <div className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: COUNTRIES[agg.destCountry] || '#94a3b8' }}
                              />
                              <span className="font-bold text-slate-800 dark:text-slate-200">{agg.destCountry}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                              {agg.totalFlows} flows
                            </span>
                            {agg.costIncreases > 0 && (
                              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> {agg.costIncreases}
                              </span>
                            )}
                            {agg.costDecreases > 0 && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" /> {agg.costDecreases}
                              </span>
                            )}
                            {agg.pathMigrations > 0 && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <Route className="w-3 h-3" /> {agg.pathMigrations} migrations
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded font-medium ${agg.avgCostDelta > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                              agg.avgCostDelta < 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                                'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}>
                              Avg Δ: {agg.avgCostDelta > 0 ? '+' : ''}{agg.avgCostDelta.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                          {agg.flows.slice(0, 12).map((flow, j) => (
                            <div
                              key={j}
                              className="text-xs p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                              onClick={() => handleVisualizeFlow(flow)}
                            >
                              <span className="truncate text-slate-600 dark:text-slate-300">
                                {flow.src.name} → {flow.dest.name}
                              </span>
                              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                {flow.pathChanged && <Route className="w-3 h-3 text-blue-500" />}
                                <span className={`font-medium ${flow.newCost > flow.oldCost ? 'text-red-500' :
                                  flow.newCost < flow.oldCost ? 'text-green-500' : 'text-slate-400'
                                  }`}>
                                  {flow.oldCost}→{flow.newCost}
                                </span>
                              </div>
                            </div>
                          ))}
                          {agg.flows.length > 12 && (
                            <div className="text-xs text-slate-400 p-2">
                              +{agg.flows.length - 12} more flows...
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Individual Flows View */
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {impactResults.slice(0, 50).map((res, i) => {
                      const costDiff = res.newCost - res.oldCost;
                      return (
                        <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              {res.impactType === 'MIGRATION' ? (
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-bold border border-blue-200 dark:border-blue-800">MIGRATION</span>
                              ) : res.impactType === 'REROUTE' || res.impactType === 'path_migration' ? (
                                <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded font-bold border border-orange-200 dark:border-orange-800">REROUTE</span>
                              ) : res.impactType === 'cost_increase' ? (
                                <TrendingUp className="w-4 h-4 text-red-500" />
                              ) : res.impactType === 'cost_decrease' ? (
                                <TrendingDown className="w-4 h-4 text-green-500" />
                              ) : (
                                <div className={`w-2 h-2 rounded-full ${res.isECMP ? 'bg-purple-500' : 'bg-blue-500'}`} />
                              )}
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{res.src.name} → {res.dest.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {res.pathChanged && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                  PATH
                                </span>
                              )}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${costDiff > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                costDiff < 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                {res.oldCost} ➝ {res.newCost}
                                {costDiff !== 0 && (
                                  <span className="text-[9px] opacity-80">
                                    {costDiff > 0 ? '+' : ''}{res.oldCost > 0 ? Math.round(((res.newCost - res.oldCost) / res.oldCost) * 100) : 0}%
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex gap-2 text-slate-500 dark:text-slate-400">
                              <span className="w-8">Old:</span>
                              <span className="truncate">{res.oldPath.join(' → ')} ({Math.max(0, res.oldPath.length - 1)} hops)</span>
                            </div>
                            <div className="flex gap-2 text-slate-900 dark:text-slate-200 font-medium">
                              <span className="w-8">New:</span>
                              <span className="truncate">{res.newPath.join(' → ')} ({Math.max(0, res.newPath.length - 1)} hops)</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleVisualizeFlow(res)}
                            className="mt-3 w-full py-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium border border-blue-100 dark:border-blue-900 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> See New Path
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <p>No traffic flows were impacted.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {impactResults && impactResults.length > 50 && `Showing 50 of ${impactResults.length} flows`}
              </div>
              <div className="flex gap-3">
                {newLinkConfig.fromNode && newLinkConfig.toNode ? (
                  <button
                    onClick={applyNewLink}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Apply New Link
                  </button>
                ) : (
                  <button
                    onClick={applyCostChange}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                  >
                    Apply Cost Change
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Link Configuration Modal */}
      {showNewLinkModal && newLinkConfig.fromNode && newLinkConfig.toNode && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-green-50 dark:bg-green-900/20">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Link className="w-5 h-5 text-green-600 dark:text-green-400" />
                Configure New Link
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {NODES.find(n => n.id === newLinkConfig.fromNode)?.name} ↔ {NODES.find(n => n.id === newLinkConfig.toNode)?.name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Separate Forward and Reverse Cost Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Forward Cost
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={newLinkConfig.forwardCost}
                    onChange={(e) => setNewLinkConfig(prev => ({ ...prev, forwardCost: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-3 text-lg font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {NODES.find(n => n.id === newLinkConfig.fromNode)?.name} → {NODES.find(n => n.id === newLinkConfig.toNode)?.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reverse Cost
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={newLinkConfig.reverseCost}
                    onChange={(e) => setNewLinkConfig(prev => ({ ...prev, reverseCost: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-3 text-lg font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {NODES.find(n => n.id === newLinkConfig.toNode)?.name} → {NODES.find(n => n.id === newLinkConfig.fromNode)?.name}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                Lower cost = higher priority path. Typical OSPF values: 1-100
              </p>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COUNTRIES[NODES.find(n => n.id === newLinkConfig.fromNode)?.country || ''] || '#94a3b8' }}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {NODES.find(n => n.id === newLinkConfig.fromNode)?.country}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COUNTRIES[NODES.find(n => n.id === newLinkConfig.toNode)?.country || ''] || '#94a3b8' }}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {NODES.find(n => n.id === newLinkConfig.toNode)?.country}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <button
                onClick={cancelNewLinkCreation}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={simulateNewLink}
                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Activity className="w-4 h-4" /> Simulate Impact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PathComparisonModal
        isOpen={isDijkstraModalOpen}
        onClose={() => setIsDijkstraModalOpen(false)}
        nodes={Array.from(nodesDataSet.current.get())}
        edges={Array.from(edgesDataSet.current.get())}
        onAnimatePath={(path) => {
          // Implement path animation logic here if needed, 
          // or just rely on the modal to show the path.
          // For now, we can just log it or highlight it.
          console.log("Animating path:", path);
        }}
        onClearPath={() => {
          // Clear any highlights
        }}
      />

      <NetworkHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        nodes={Array.from(nodesDataSet.current.get())}
        edges={Array.from(edgesDataSet.current.get())}
      />

      <RippleEffectModal
        isOpen={isRippleModalOpen}
        onClose={() => setIsRippleModalOpen(false)}
        nodes={Array.from(nodesDataSet.current.get())}
        edges={Array.from(edgesDataSet.current.get())}
      />

      {/* NOTE: Real Impact Analysis Modal is rendered inline at line ~2265 */}
      {/* The ImpactAnalysisModal component was a placeholder - removed to avoid duplicate rendering */}

    </div>
  );
}
