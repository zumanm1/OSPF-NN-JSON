import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRight, Plus, Trash2, Download, FileText, Settings, Route, GitBranch, Activity } from 'lucide-react';
import { dijkstraWithECMP, PathInfo } from '../services/dijkstraEnhanced';
import { calculatePathMetrics } from '../services/pathMetrics';

interface PathComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: VisNode[];
    edges: VisEdge[];
}

type Tab = 'comparison' | 'ecmp' | 'scenarios';

interface PathInfo extends PathResult {
    id: string;
    name: string;
    color: string;
    srcId: string;
    destId: string;
}

const PATH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export const PathComparisonModal: React.FC<PathComparisonModalProps> = ({ isOpen, onClose, nodes, edges }) => {
    const [activeTab, setActiveTab] = useState<Tab>('comparison');
    const [selectedPaths, setSelectedPaths] = useState<PathInfo[]>([]);
    const [sourceId, setSourceId] = useState('');
    const [destId, setDestId] = useState('');

    // Metrics Table Sorting
    const [sortBy, setSortBy] = useState<keyof PathResult | 'hops'>('cost');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleAddPath = () => {
        if (!sourceId || !destId || sourceId === destId) return;
        if (selectedPaths.length >= 4) {
            alert("Maximum 4 paths allowed for comparison.");
            return;
        }

        // Use enhanced Dijkstra service
        const result = dijkstraWithECMP(sourceId, destId, nodes, edges);
        
        if (result && result.paths.length > 0) {
            // For comparison, we usually pick the first path or primary ECMP path
            // In a real app, we might let user choose WHICH of the ECMP paths to add
            // For now, we take the first one and mark if it was part of an ECMP group
            const primaryPath = result.paths[0];
            
            // Calculate detailed metrics
            const metrics = calculatePathMetrics(primaryPath, edges, nodes, selectedPaths);
            
            const newPath: PathInfo = {
                ...primaryPath,
                id: `path-${Date.now()}`,
                name: `Path ${selectedPaths.length + 1}`,
                color: PATH_COLORS[selectedPaths.length],
                metrics: metrics // Store calculated metrics
            };
            setSelectedPaths([...selectedPaths, newPath]);
        } else {
            alert("No path found between selected nodes.");
        }
    };

    const removePath = (id: string) => {
        setSelectedPaths(selectedPaths.filter(p => p.id !== id));
    };

    const getNodeName = (id: string) => nodes.find(n => n.id === id)?.label || id;
    const getCountry = (id: string) => nodes.find(n => n.id === id)?.country || '??';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700 animate-scale-in">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <Route className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Path Comparison & ECMP Explorer</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Analyze routing efficiency and redundancy</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Tab Navigation */}
                        <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                            <button 
                                onClick={() => setActiveTab('comparison')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'comparison' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                Comparison
                            </button>
                            <button 
                                onClick={() => setActiveTab('ecmp')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'ecmp' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                ECMP Analysis
                            </button>
                            <button 
                                onClick={() => setActiveTab('scenarios')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'scenarios' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                Scenarios
                            </button>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Main Content - Split View */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Left: Visualization (Placeholder for actual Graph Integration) */}
                    <div className="w-3/5 bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 relative p-4">
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                            <div className="text-center">
                                <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>Visualization Panel</p>
                                <p className="text-xs mt-2">(Path highlights would appear here on the main graph)</p>
                            </div>
                        </div>
                        
                        {/* Selected Paths Overlay List */}
                        <div className="absolute top-4 left-4 space-y-2">
                            {selectedPaths.map(path => (
                                <div key={path.id} className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-md border-l-4 text-xs" style={{ borderLeftColor: path.color }}>
                                    <div className="font-bold text-slate-800 dark:text-slate-200">{path.name}</div>
                                    <div className="text-slate-500">{getNodeName(path.srcId)} → {getNodeName(path.destId)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Control Pane */}
                    <div className="w-2/5 flex flex-col bg-white dark:bg-slate-900">
                        
                        {/* Path Selector Panel (UI01-02) */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Path Selection</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Source</label>
                                        <select 
                                            value={sourceId}
                                            onChange={(e) => setSourceId(e.target.value)}
                                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                        >
                                            <option value="">Select Node...</option>
                                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.country})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Destination</label>
                                        <select 
                                            value={destId}
                                            onChange={(e) => setDestId(e.target.value)}
                                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                        >
                                            <option value="">Select Node...</option>
                                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.country})</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleAddPath}
                                    disabled={!sourceId || !destId || sourceId === destId}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Path to Comparison
                                </button>
                            </div>

                            {/* Selected Paths List */}
                            <div className="mt-4 space-y-2">
                                {selectedPaths.map(path => (
                                    <div key={path.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: path.color }}></div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{path.name}</span>
                                            <span className="text-xs text-slate-500">({getNodeName(path.srcId).substring(0, 3)}...{getNodeName(path.destId).substring(0, 3)})</span>
                                        </div>
                                        <button onClick={() => removePath(path.id)} className="text-slate-400 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Metrics Table (UI01-03) */}
                        <div className="flex-1 overflow-auto p-6">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Comparison Metrics</h3>
                            {selectedPaths.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                                <th className="pb-2 pl-2">Path</th>
                                                <th className="pb-2">Hops</th>
                                                <th className="pb-2">Cost</th>
                                                <th className="pb-2">Latency</th>
                                                <th className="pb-2">Countries</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {selectedPaths.map(path => {
                                                const metrics = path.metrics || {}; 
                                                const hops = metrics.hopCount ?? 0;
                                                const cost = metrics.totalCost ?? 0;
                                                const latency = metrics.estimatedLatency ?? 0;
                                                const countries = metrics.countriesTraversed || [];

                                                return (
                                                    <tr key={path.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="py-3 pl-2 font-medium flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: path.color }}></div>
                                                            {path.name}
                                                        </td>
                                                        <td className="py-3 font-mono">{hops}</td>
                                                        <td className="py-3 font-mono font-bold">{path.cost}</td>
                                                        <td className="py-3 font-mono text-slate-500">~{latency}ms</td>
                                                        <td className="py-3">
                                                            <div className="flex gap-1">
                                                                {countries.map(c => (
                                                                    <span key={c} className="text-[10px] px-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">{c}</span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-8 text-sm">
                                    Add paths to compare their metrics.
                                </div>
                            )}
                        </div>

                        {/* Action Bar */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex gap-3">
                            <button className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2">
                                <FileText className="w-4 h-4" /> Export PDF
                            </button>
                            <button className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2">
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
