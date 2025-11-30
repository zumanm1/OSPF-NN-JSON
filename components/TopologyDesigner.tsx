
import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Plus, Save, Trash2, Server, Upload, Download,
  Route, ArrowRight, ArrowLeftRight, ChevronDown, ChevronUp,
  Zap, Edit3, Check, X, RefreshCw, AlertTriangle, Star
} from 'lucide-react';
import { RouterNode, VisNode, VisEdge } from '../types';
import { validateTopologyJSON, validateExportedJSON } from '../utils/jsonValidator';
import { dijkstraWithECMP, ECMPPathResult, PathInfo } from '../services/dijkstraEnhanced';

interface TopologyDesignerProps {
    nodes: RouterNode[];
    edges: VisEdge[];
    onAddNode: (node: RouterNode) => void;
    onRemoveNode: (nodeId: string) => void;
    onSave: () => void;
    onImportDesign: (nodes: RouterNode[]) => void;
    onUpdateLinkCost: (edgeId: string, newForwardCost: number, newReverseCost: number) => void;
    isDark: boolean;
}

interface PathAnalysisResult {
    forward: ECMPPathResult | null;
    reverse: ECMPPathResult | null;
}

interface EditingLink {
    edgeId: string;
    forwardCost: number;
    reverseCost: number;
}

export const TopologyDesigner: React.FC<TopologyDesignerProps> = ({
    nodes,
    edges,
    onAddNode,
    onRemoveNode,
    onSave,
    onImportDesign,
    onUpdateLinkCost,
    isDark
}) => {
    // Add New Router State
    const [newNodeName, setNewNodeName] = useState('');
    const [newNodeCountry, setNewNodeCountry] = useState('USA');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Path Analysis State
    const [selectedSource, setSelectedSource] = useState<string>('');
    const [selectedDest, setSelectedDest] = useState<string>('');
    const [pathAnalysis, setPathAnalysis] = useState<PathAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [selectedPreferredPath, setSelectedPreferredPath] = useState<string | null>(null);

    // Link Editing State
    const [editingLink, setEditingLink] = useState<EditingLink | null>(null);
    const [showAllRouters, setShowAllRouters] = useState(false);

    // Convert RouterNodes to VisNodes for dijkstra
    const visNodes: VisNode[] = useMemo(() => {
        return nodes.map(n => ({
            id: n.id,
            label: n.name,
            country: n.country
        }));
    }, [nodes]);

    // Analyze paths between selected routers
    const analyzePaths = useCallback(() => {
        if (!selectedSource || !selectedDest || selectedSource === selectedDest) {
            setPathAnalysis(null);
            return;
        }

        setIsAnalyzing(true);

        // Small delay for UI feedback
        setTimeout(() => {
            try {
                // Forward path (source -> dest)
                const forwardResult = dijkstraWithECMP(
                    selectedSource,
                    selectedDest,
                    visNodes,
                    edges,
                    { maxPaths: 10 }
                );

                // Reverse path (dest -> source) - using reverse costs
                const reverseEdges = edges.map(e => ({
                    ...e,
                    cost: e.reverseCost || e.cost,
                    from: e.to,
                    to: e.from
                }));

                const reverseResult = dijkstraWithECMP(
                    selectedDest,
                    selectedSource,
                    visNodes,
                    reverseEdges,
                    { maxPaths: 10 }
                );

                setPathAnalysis({
                    forward: forwardResult,
                    reverse: reverseResult
                });
            } catch (error) {
                console.error('Path analysis error:', error);
                setPathAnalysis(null);
            } finally {
                setIsAnalyzing(false);
            }
        }, 100);
    }, [selectedSource, selectedDest, visNodes, edges]);

    // Get edge details for a path
    const getPathEdgeDetails = useCallback((path: PathInfo): Array<{
        edgeId: string;
        from: string;
        to: string;
        forwardCost: number;
        reverseCost: number;
        isAsymmetric: boolean;
    }> => {
        const details: Array<{
            edgeId: string;
            from: string;
            to: string;
            forwardCost: number;
            reverseCost: number;
            isAsymmetric: boolean;
        }> = [];

        for (let i = 0; i < path.nodeSequence.length - 1; i++) {
            const from = path.nodeSequence[i];
            const to = path.nodeSequence[i + 1];

            // Find the edge
            const edge = edges.find(e =>
                (e.from === from && e.to === to) ||
                (e.from === to && e.to === from)
            );

            if (edge) {
                const isForward = edge.from === from;
                details.push({
                    edgeId: edge.id,
                    from,
                    to,
                    forwardCost: isForward ? edge.cost : (edge.reverseCost || edge.cost),
                    reverseCost: isForward ? (edge.reverseCost || edge.cost) : edge.cost,
                    isAsymmetric: edge.isAsymmetric || (edge.cost !== edge.reverseCost)
                });
            }
        }

        return details;
    }, [edges]);

    // Toggle path expansion
    const togglePathExpansion = (pathId: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(pathId)) {
                next.delete(pathId);
            } else {
                next.add(pathId);
            }
            return next;
        });
    };

    // Start editing a link
    const startEditingLink = (edgeId: string, forwardCost: number, reverseCost: number) => {
        setEditingLink({ edgeId, forwardCost, reverseCost });
    };

    // Save link edit
    const saveEditingLink = () => {
        if (editingLink) {
            onUpdateLinkCost(editingLink.edgeId, editingLink.forwardCost, editingLink.reverseCost);
            setEditingLink(null);
            // Re-analyze after cost change
            setTimeout(analyzePaths, 100);
        }
    };

    // Cancel link edit
    const cancelEditingLink = () => {
        setEditingLink(null);
    };

    // Handle add router
    const handleAdd = () => {
        if (!newNodeName) return;
        const id = newNodeName.toLowerCase().replace(/\s+/g, '-');
        const newNode: RouterNode = {
            id,
            name: newNodeName,
            hostname: newNodeName,
            loopback_ip: '10.0.0.1',
            country: newNodeCountry,
            is_active: true,
            node_type: 'router',
            neighbor_count: 0
        };
        onAddNode(newNode);
        setNewNodeName('');
    };

    // Handle import
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);
                const validation = validateTopologyJSON(data);

                if (!validation.isValid) {
                    alert(`❌ Import Failed\n\n${validation.errorMessage}`);
                    event.target.value = '';
                    return;
                }

                if (data.nodes && Array.isArray(data.nodes)) {
                    onImportDesign(data.nodes);
                }
            } catch (err) {
                alert("Failed to parse design file.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // Handle export
    const handleExportDesign = () => {
        const data = { nodes };
        const validation = validateExportedJSON({ data });

        if (!validation.isValid) {
            alert(`❌ Export Failed\n\n${validation.errorMessage}`);
            return;
        }

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `topology-design-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
    };

    // Render path card
    const renderPathCard = (
        path: PathInfo,
        direction: 'forward' | 'reverse',
        index: number,
        totalCost: number
    ) => {
        const pathId = `${direction}-${index}`;
        const isExpanded = expandedPaths.has(pathId);
        const isPreferred = selectedPreferredPath === pathId;
        const edgeDetails = getPathEdgeDetails(path);

        return (
            <div
                key={pathId}
                className={`border rounded-lg overflow-hidden transition-all ${
                    isPreferred
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
            >
                {/* Path Header */}
                <div
                    className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between"
                    onClick={() => togglePathExpansion(pathId)}
                >
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                        }`}>
                            {index + 1}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {path.nodeSequence.length - 1} hops
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Total Cost: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{totalCost}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {index === 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                                LOWEST COST
                            </span>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPreferredPath(isPreferred ? null : pathId);
                            }}
                            className={`p-1 rounded transition-colors ${
                                isPreferred
                                    ? 'text-green-600 bg-green-100 dark:bg-green-900/50'
                                    : 'text-slate-400 hover:text-amber-500'
                            }`}
                            title={isPreferred ? 'Unset preferred' : 'Set as preferred path'}
                        >
                            <Star className={`w-4 h-4 ${isPreferred ? 'fill-current' : ''}`} />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>

                {/* Path Summary */}
                <div className="px-3 pb-2">
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                        {path.nodeSequence.join(' → ')}
                    </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 space-y-2">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                            Link Details (Click to edit cost)
                        </div>
                        {edgeDetails.map((detail, idx) => {
                            const isEditing = editingLink?.edgeId === detail.edgeId;

                            return (
                                <div
                                    key={`${detail.edgeId}-${idx}`}
                                    className={`p-2 rounded border ${
                                        isEditing
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                            {detail.from} → {detail.to}
                                        </span>
                                        {detail.isAsymmetric && (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">
                                                ASYMMETRIC
                                            </span>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-2 mt-2">
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] text-slate-500 w-16">Forward:</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={editingLink.forwardCost}
                                                    onChange={(e) => setEditingLink({
                                                        ...editingLink,
                                                        forwardCost: parseInt(e.target.value) || 1
                                                    })}
                                                    className="flex-1 px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] text-slate-500 w-16">Reverse:</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={editingLink.reverseCost}
                                                    onChange={(e) => setEditingLink({
                                                        ...editingLink,
                                                        reverseCost: parseInt(e.target.value) || 1
                                                    })}
                                                    className="flex-1 px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                                />
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={saveEditingLink}
                                                    className="flex-1 py-1 px-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center justify-center gap-1"
                                                >
                                                    <Check className="w-3 h-3" /> Save
                                                </button>
                                                <button
                                                    onClick={cancelEditingLink}
                                                    className="flex-1 py-1 px-2 bg-slate-500 hover:bg-slate-600 text-white text-xs rounded flex items-center justify-center gap-1"
                                                >
                                                    <X className="w-3 h-3" /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-1 -m-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEditingLink(detail.edgeId, detail.forwardCost, detail.reverseCost);
                                            }}
                                        >
                                            <div className="flex items-center gap-3 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <ArrowRight className="w-3 h-3 text-blue-500" />
                                                    <span className="font-mono text-blue-600 dark:text-blue-400">{detail.forwardCost}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <ArrowLeftRight className="w-3 h-3 text-amber-500" />
                                                    <span className="font-mono text-amber-600 dark:text-amber-400">{detail.reverseCost}</span>
                                                </div>
                                            </div>
                                            <Edit3 className="w-3 h-3 text-slate-400" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Displayed routers (limited or all)
    const displayedRouters = showAllRouters ? nodes : nodes.slice(0, 10);

    return (
        <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col w-96 shadow-xl z-20 overflow-hidden">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
                accept=".json"
            />

            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-500" />
                    Topology Designer
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Design topology and analyze OSPF paths
                </p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Path Analysis Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                        <Route className="w-4 h-4" /> OSPF Path Analysis
                    </h3>

                    <div className="space-y-3">
                        {/* Source Selection */}
                        <div>
                            <label className="text-xs font-medium text-blue-700 dark:text-blue-400 block mb-1">
                                Source Router
                            </label>
                            <select
                                value={selectedSource}
                                onChange={(e) => {
                                    setSelectedSource(e.target.value);
                                    setPathAnalysis(null);
                                }}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select source...</option>
                                {nodes.map(n => (
                                    <option key={n.id} value={n.id}>{n.name} ({n.country})</option>
                                ))}
                            </select>
                        </div>

                        {/* Destination Selection */}
                        <div>
                            <label className="text-xs font-medium text-blue-700 dark:text-blue-400 block mb-1">
                                Destination Router
                            </label>
                            <select
                                value={selectedDest}
                                onChange={(e) => {
                                    setSelectedDest(e.target.value);
                                    setPathAnalysis(null);
                                }}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select destination...</option>
                                {nodes.filter(n => n.id !== selectedSource).map(n => (
                                    <option key={n.id} value={n.id}>{n.name} ({n.country})</option>
                                ))}
                            </select>
                        </div>

                        {/* Analyze Button */}
                        <button
                            onClick={analyzePaths}
                            disabled={!selectedSource || !selectedDest || isAnalyzing}
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            {isAnalyzing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" /> Analyze Paths
                                </>
                            )}
                        </button>
                    </div>

                    {/* Path Results */}
                    {pathAnalysis && (
                        <div className="mt-4 space-y-4">
                            {/* Forward Paths */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <ArrowRight className="w-4 h-4 text-blue-500" />
                                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                                        Forward Path ({selectedSource} → {selectedDest})
                                    </h4>
                                </div>

                                {pathAnalysis.forward ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-2">
                                            <span className="font-medium">Lowest Cost:</span>
                                            <span className="font-mono font-bold text-lg">{pathAnalysis.forward.cost}</span>
                                            {pathAnalysis.forward.isECMP && (
                                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-medium">
                                                    ECMP ({pathAnalysis.forward.pathCount} paths)
                                                </span>
                                            )}
                                        </div>
                                        {pathAnalysis.forward.paths.map((path, idx) =>
                                            renderPathCard(path, 'forward', idx, pathAnalysis.forward!.cost)
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                        <span className="text-xs text-red-700 dark:text-red-300">No path found</span>
                                    </div>
                                )}
                            </div>

                            {/* Reverse Paths */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                        Reverse Path ({selectedDest} → {selectedSource})
                                    </h4>
                                </div>

                                {pathAnalysis.reverse ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-2">
                                            <span className="font-medium">Lowest Cost:</span>
                                            <span className="font-mono font-bold text-lg">{pathAnalysis.reverse.cost}</span>
                                            {pathAnalysis.reverse.isECMP && (
                                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-medium">
                                                    ECMP ({pathAnalysis.reverse.pathCount} paths)
                                                </span>
                                            )}
                                        </div>
                                        {pathAnalysis.reverse.paths.map((path, idx) =>
                                            renderPathCard(path, 'reverse', idx, pathAnalysis.reverse!.cost)
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                        <span className="text-xs text-red-700 dark:text-red-300">No path found</span>
                                    </div>
                                )}
                            </div>

                            {/* Asymmetry Warning */}
                            {pathAnalysis.forward && pathAnalysis.reverse &&
                             pathAnalysis.forward.cost !== pathAnalysis.reverse.cost && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                            Asymmetric Routing Detected
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        Forward cost ({pathAnalysis.forward.cost}) ≠ Reverse cost ({pathAnalysis.reverse.cost})
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Add New Router Section */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Add New Router</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Router Name</label>
                            <input
                                type="text"
                                value={newNodeName}
                                onChange={(e) => setNewNodeName(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g., usa-r99"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Country</label>
                            <select
                                value={newNodeCountry}
                                onChange={(e) => setNewNodeCountry(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {['USA', 'GBR', 'DEU', 'FRA', 'ZAF', 'ZWE', 'LSO', 'MOZ', 'PRT'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={!newNodeName}
                            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add Router
                        </button>
                    </div>
                </div>

                {/* Existing Routers Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Existing Routers ({nodes.length})
                        </h3>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                            title="Load Design"
                        >
                            <Upload className="w-3 h-3" /> Load
                        </button>
                    </div>
                    <div className="space-y-2">
                        {displayedRouters.map(node => (
                            <div key={node.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg group">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{node.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">{node.country}</span>
                                </div>
                                <button
                                    onClick={() => onRemoveNode(node.id)}
                                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove Router"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {nodes.length > 10 && (
                            <button
                                onClick={() => setShowAllRouters(!showAllRouters)}
                                className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center gap-1"
                            >
                                {showAllRouters ? (
                                    <>
                                        <ChevronUp className="w-3 h-3" /> Show Less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="w-3 h-3" /> Show All ({nodes.length - 10} more)
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-2 flex-shrink-0">
                <button
                    onClick={handleExportDesign}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <Download className="w-4 h-4" /> Export
                </button>
                <button
                    onClick={onSave}
                    className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <Save className="w-4 h-4" /> Save
                </button>
            </div>
        </div>
    );
};
