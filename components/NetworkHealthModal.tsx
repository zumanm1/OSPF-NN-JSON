import React from 'react';
import { X, Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { VisNode, VisEdge } from '../types';

interface NetworkHealthModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: VisNode[];
    edges: VisEdge[];
}

export const NetworkHealthModal: React.FC<NetworkHealthModalProps> = ({ isOpen, onClose, nodes, edges }) => {
    if (!isOpen) return null;

    const totalNodes = nodes.length;
    const totalLinks = edges.length;
    const downLinks = edges.filter(e => e.status === 'down').length;
    const congestedLinks = edges.filter(e => (e.traffic?.forward_utilization_pct || 0) > 80).length;
    const asymmetricLinks = edges.filter(e => e.isAsymmetric).length;

    const healthScore = Math.max(0, 100 - (downLinks * 10) - (congestedLinks * 5));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-in">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-500" />
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Network Health</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="text-5xl font-bold text-green-500 mb-2">{healthScore}%</div>
                        <div className="text-sm text-slate-500 uppercase tracking-wide font-semibold">Overall Health Score</div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-slate-600 dark:text-slate-300">Total Nodes</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{totalNodes}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-slate-600 dark:text-slate-300">Total Links</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{totalLinks}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                            <span className="text-red-700 dark:text-red-400 flex items-center gap-2">
                                <XCircle className="w-4 h-4" /> Down Links
                            </span>
                            <span className="font-bold text-red-700 dark:text-red-400">{downLinks}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
                            <span className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Congested Links
                            </span>
                            <span className="font-bold text-amber-700 dark:text-amber-400">{congestedLinks}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
