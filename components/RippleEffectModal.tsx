import React, { useState, useEffect, useMemo } from 'react';
import { X, Layers, AlertTriangle, Zap, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface RippleEffectModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes?: { id: string; label: string; country?: string }[];
    edges?: { id: string; from: string; to: string; cost: number; logicalId: number }[];
    onSimulateFailure?: (failedElements: string[]) => void;
}

interface FailureImpact {
    affectedPaths: number;
    isolatedNodes: string[];
    criticalScore: number;
    failureType: 'node' | 'edge';
    elementId: string;
    elementLabel: string;
}

interface SPOF {
    elementId: string;
    elementType: 'node' | 'edge';
    label: string;
    impactScore: number;
    affectedNodes: number;
}

export const RippleEffectModal: React.FC<RippleEffectModalProps> = ({
    isOpen,
    onClose,
    nodes = [],
    edges = [],
    onSimulateFailure
}) => {
    const [selectedFailures, setSelectedFailures] = useState<Set<string>>(new Set());
    const [analysisResult, setAnalysisResult] = useState<FailureImpact | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [viewMode, setViewMode] = useState<'select' | 'spof'>('select');
    const [spofList, setSpofList] = useState<SPOF[]>([]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedFailures(new Set());
            setAnalysisResult(null);
            setViewMode('select');
        }
    }, [isOpen]);

    // Calculate network connectivity after removing elements
    const calculateConnectivity = (excludeNodes: Set<string>, excludeEdges: Set<string>) => {
        const remainingNodes = nodes.filter(n => !excludeNodes.has(n.id));
        const remainingEdges = edges.filter(e =>
            !excludeEdges.has(e.id) &&
            !excludeNodes.has(e.from) &&
            !excludeNodes.has(e.to)
        );

        if (remainingNodes.length === 0) {
            return { connected: false, isolatedNodes: nodes.map(n => n.label), components: 0 };
        }

        // BFS to find connected components
        const visited = new Set<string>();
        const adjacency = new Map<string, string[]>();

        remainingNodes.forEach(n => adjacency.set(n.id, []));
        remainingEdges.forEach(e => {
            adjacency.get(e.from)?.push(e.to);
            adjacency.get(e.to)?.push(e.from);
        });

        let components = 0;
        const componentMembers: string[][] = [];

        for (const node of remainingNodes) {
            if (visited.has(node.id)) continue;

            components++;
            const queue = [node.id];
            const currentComponent: string[] = [];

            while (queue.length > 0) {
                const current = queue.shift()!;
                if (visited.has(current)) continue;
                visited.add(current);
                currentComponent.push(current);

                const neighbors = adjacency.get(current) || [];
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor)) {
                        queue.push(neighbor);
                    }
                }
            }
            componentMembers.push(currentComponent);
        }

        // Find isolated nodes (components with only 1 node or small components)
        const mainComponent = componentMembers.reduce((a, b) => a.length > b.length ? a : b, []);
        const isolatedNodes = remainingNodes
            .filter(n => !mainComponent.includes(n.id))
            .map(n => n.label);

        return {
            connected: components === 1,
            isolatedNodes,
            components
        };
    };

    // Analyze single point of failures
    const analyzeSPOFs = () => {
        setIsAnalyzing(true);
        const spofs: SPOF[] = [];

        // Check each edge
        edges.forEach(edge => {
            const result = calculateConnectivity(new Set(), new Set([edge.id]));
            if (!result.connected || result.isolatedNodes.length > 0) {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);
                spofs.push({
                    elementId: edge.id,
                    elementType: 'edge',
                    label: `${fromNode?.label || edge.from} ↔ ${toNode?.label || edge.to}`,
                    impactScore: result.isolatedNodes.length + (result.connected ? 0 : 50),
                    affectedNodes: result.isolatedNodes.length
                });
            }
        });

        // Check each node
        nodes.forEach(node => {
            const result = calculateConnectivity(new Set([node.id]), new Set());
            if (!result.connected || result.isolatedNodes.length > 0) {
                spofs.push({
                    elementId: node.id,
                    elementType: 'node',
                    label: node.label,
                    impactScore: result.isolatedNodes.length + (result.connected ? 0 : 50),
                    affectedNodes: result.isolatedNodes.length
                });
            }
        });

        // Sort by impact score descending
        spofs.sort((a, b) => b.impactScore - a.impactScore);
        setSpofList(spofs.slice(0, 10)); // Top 10 SPOFs
        setIsAnalyzing(false);
    };

    // Simulate failure of selected elements
    const simulateFailure = () => {
        if (selectedFailures.size === 0) return;

        setIsAnalyzing(true);

        const failedNodes = new Set<string>();
        const failedEdges = new Set<string>();

        selectedFailures.forEach(id => {
            if (nodes.find(n => n.id === id)) {
                failedNodes.add(id);
            } else {
                failedEdges.add(id);
            }
        });

        const result = calculateConnectivity(failedNodes, failedEdges);

        // Calculate affected paths (simplified: count connections involving failed elements)
        let affectedPaths = 0;
        edges.forEach(e => {
            if (failedNodes.has(e.from) || failedNodes.has(e.to) || failedEdges.has(e.id)) {
                affectedPaths++;
            }
        });

        const impact: FailureImpact = {
            affectedPaths: affectedPaths * (nodes.length - 1), // Estimate: each edge affects N-1 potential paths
            isolatedNodes: result.isolatedNodes,
            criticalScore: Math.min(100, result.isolatedNodes.length * 10 + (result.connected ? 0 : 40)),
            failureType: failedNodes.size > 0 ? 'node' : 'edge',
            elementId: Array.from(selectedFailures)[0],
            elementLabel: Array.from(selectedFailures).join(', ')
        };

        setAnalysisResult(impact);
        setIsAnalyzing(false);

        if (onSimulateFailure) {
            onSimulateFailure(Array.from(selectedFailures));
        }
    };

    // Toggle element selection
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedFailures);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedFailures(newSet);
        setAnalysisResult(null);
    };

    // Get resilience score
    const getResilienceScore = useMemo(() => {
        if (nodes.length === 0) return 10;

        const avgConnectivity = edges.length / nodes.length;
        let score = 10;

        // Penalize low connectivity
        if (avgConnectivity < 2) score -= 4;
        else if (avgConnectivity < 3) score -= 2;

        // Penalize SPOFs
        score -= Math.min(4, spofList.filter(s => s.impactScore > 20).length);

        return Math.max(1, score);
    }, [nodes.length, edges.length, spofList]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-in flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Ripple Effect Analysis</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Resilience Score */}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Resilience:</span>
                            <span className={`font-bold ${
                                getResilienceScore >= 8 ? 'text-green-600' :
                                getResilienceScore >= 5 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                                {getResilienceScore}/10
                            </span>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex gap-2">
                    <button
                        onClick={() => setViewMode('select')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            viewMode === 'select'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                        <Zap className="w-4 h-4 inline mr-2" />
                        Simulate Failure
                    </button>
                    <button
                        onClick={() => { setViewMode('spof'); analyzeSPOFs(); }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            viewMode === 'spof'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                        <AlertTriangle className="w-4 h-4 inline mr-2" />
                        Detect SPOFs
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {viewMode === 'select' ? (
                        <div className="space-y-6">
                            {/* Instructions */}
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                    Select nodes or links to simulate their failure. The analysis will show how the network would respond.
                                </p>
                            </div>

                            {/* Selection Grid */}
                            <div className="grid grid-cols-2 gap-6">
                                {/* Nodes */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Nodes ({nodes.length})
                                    </h3>
                                    <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                                        {nodes.slice(0, 30).map(node => (
                                            <button
                                                key={node.id}
                                                onClick={() => toggleSelection(node.id)}
                                                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                                                    selectedFailures.has(node.id)
                                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                                                        : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {selectedFailures.has(node.id) && <XCircle className="w-4 h-4 inline mr-2 text-red-500" />}
                                                {node.label}
                                            </button>
                                        ))}
                                        {nodes.length > 30 && (
                                            <p className="text-xs text-slate-400 px-3 py-2">+{nodes.length - 30} more nodes...</p>
                                        )}
                                    </div>
                                </div>

                                {/* Edges - show unique logical links */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Links
                                    </h3>
                                    <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                                        {/* Group edges by logicalId to show unique links */}
                                        {Array.from(new Map(edges.map(e => [e.logicalId, e])).values()).slice(0, 30).map(edge => {
                                            const fromNode = nodes.find(n => n.id === edge.from);
                                            const toNode = nodes.find(n => n.id === edge.to);
                                            return (
                                                <button
                                                    key={edge.id}
                                                    onClick={() => toggleSelection(edge.id)}
                                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                                                        selectedFailures.has(edge.id)
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                                                            : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {selectedFailures.has(edge.id) && <XCircle className="w-4 h-4 inline mr-2 text-red-500" />}
                                                    {fromNode?.label || edge.from} ↔ {toNode?.label || edge.to}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Simulate Button */}
                            <button
                                onClick={simulateFailure}
                                disabled={selectedFailures.size === 0 || isAnalyzing}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5" />
                                        Simulate Failure ({selectedFailures.size} selected)
                                    </>
                                )}
                            </button>

                            {/* Analysis Result */}
                            {analysisResult && (
                                <div className="mt-6 p-4 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10">
                                    <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        Failure Impact Analysis
                                    </h4>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                                {analysisResult.affectedPaths}
                                            </div>
                                            <div className="text-xs text-slate-500">Paths Affected</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                {analysisResult.isolatedNodes.length}
                                            </div>
                                            <div className="text-xs text-slate-500">Isolated Nodes</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                            <div className={`text-2xl font-bold ${
                                                analysisResult.criticalScore >= 70 ? 'text-red-600' :
                                                analysisResult.criticalScore >= 40 ? 'text-yellow-600' : 'text-green-600'
                                            }`}>
                                                {analysisResult.criticalScore}%
                                            </div>
                                            <div className="text-xs text-slate-500">Critical Score</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                            <div className={`text-lg font-bold flex items-center gap-1 ${
                                                analysisResult.isolatedNodes.length === 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {analysisResult.isolatedNodes.length === 0
                                                    ? <><CheckCircle className="w-5 h-5" /> Connected</>
                                                    : <><XCircle className="w-5 h-5" /> Split</>
                                                }
                                            </div>
                                            <div className="text-xs text-slate-500">Network Status</div>
                                        </div>
                                    </div>

                                    {analysisResult.isolatedNodes.length > 0 && (
                                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                            <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                                Isolated Nodes:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {analysisResult.isolatedNodes.map((node, i) => (
                                                    <span key={i} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                                                        {node}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* SPOF Detection View */
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                                    Single Points of Failure (SPOFs) are network elements whose failure would disconnect part of the network.
                                </p>
                            </div>

                            {isAnalyzing ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
                                    <span className="ml-3 text-slate-500">Analyzing network resilience...</span>
                                </div>
                            ) : spofList.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                    <p className="text-lg font-medium text-green-700 dark:text-green-300">
                                        No Single Points of Failure Detected
                                    </p>
                                    <p className="text-sm text-slate-500 mt-2">
                                        Your network has good redundancy!
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Top {spofList.length} Single Points of Failure
                                    </h3>
                                    {spofList.map((spof, i) => (
                                        <div
                                            key={spof.elementId}
                                            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                                    spof.impactScore >= 50 ? 'bg-red-500' :
                                                    spof.impactScore >= 20 ? 'bg-amber-500' : 'bg-yellow-500'
                                                }`}>
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-800 dark:text-slate-200">
                                                        {spof.label}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {spof.elementType === 'node' ? 'Router' : 'Link'} •
                                                        {spof.affectedNodes} nodes would be isolated
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                spof.impactScore >= 50 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                                spof.impactScore >= 20 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                            }`}>
                                                Impact: {spof.impactScore}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
