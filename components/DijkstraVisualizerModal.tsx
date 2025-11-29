import React, { useState, useEffect } from 'react';
import { X, Play, RotateCcw, ArrowRight, Route, AlertTriangle } from 'lucide-react';
import { VisNode, VisEdge, PathResult } from '../types';
import { dijkstraDirected } from '../services/dijkstra';

interface DijkstraVisualizerModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: VisNode[];
    edges: VisEdge[];
    onAnimatePath: (path: string[]) => void;
    onClearPath: () => void;
}

export const DijkstraVisualizerModal: React.FC<DijkstraVisualizerModalProps> = ({
    isOpen, onClose, nodes, edges, onAnimatePath, onClearPath
}) => {
    const [sourceId, setSourceId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [result, setResult] = useState<PathResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSourceId('');
            setTargetId('');
            setResult(null);
            setError(null);
            onClearPath();
        }
    }, [isOpen, onClearPath]);

    const handleRun = () => {
        if (!sourceId || !targetId) {
            setError('Please select both source and target nodes.');
            return;
        }
        if (sourceId === targetId) {
            setError('Source and target must be different.');
            return;
        }

        const pathResult = dijkstraDirected(sourceId, targetId, nodes, edges);

        if (!pathResult) {
            setError('No path found between selected nodes.');
            setResult(null);
        } else {
            setError(null);
            setResult(pathResult);
            onAnimatePath(pathResult.canonicalPath);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-in">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Route className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Shortest Path Analysis</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Selection Controls */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Source Node</label>
                            <select
                                value={sourceId}
                                onChange={(e) => setSourceId(e.target.value)}
                                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="">Select Source</option>
                                {nodes.map(n => (
                                    <option key={n.id} value={n.id}>{n.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Target Node</label>
                            <select
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="">Select Target</option>
                                {nodes.map(n => (
                                    <option key={n.id} value={n.id}>{n.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400 animate-shake">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 animate-slide-up">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-slate-500">Total Cost</span>
                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{result.cost}</span>
                            </div>

                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500 uppercase">Path Sequence</div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {result.canonicalPath.map((nodeId, idx) => (
                                        <React.Fragment key={idx}>
                                            <span className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                                                {nodeId}
                                            </span>
                                            {idx < result.canonicalPath.length - 1 && (
                                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {result.isECMP && (
                                <div className="mt-4 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" />
                                    ECMP (Equal Cost Multi-Path) Detected
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setSourceId('');
                            setTargetId('');
                            setResult(null);
                            onClearPath();
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={!sourceId || !targetId}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                    >
                        <Play className="w-4 h-4" /> Run Analysis
                    </button>
                </div>

            </div>
        </div>
    );
};
