import React, { useState, useEffect } from 'react';
import { X, Activity, ArrowRight, Zap, TrendingUp, AlertTriangle, CheckCircle, Settings, RotateCcw, Play } from 'lucide-react';
import { generateTrafficMatrix } from '../services/trafficMatrixGenerator';
import { calculateUtilization } from '../services/utilizationCalculation';
import { optimizeCosts } from '../services/trafficOptimization';

interface TrafficEngineeringModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: VisNode[];
    edges: VisEdge[];
    onApplyChanges?: (changes: any[]) => void;
}

type OptimizationGoal = 'balance' | 'latency' | 'diversity' | 'cost' | 'custom';

export const TrafficEngineeringModal: React.FC<TrafficEngineeringModalProps> = ({ isOpen, onClose, nodes, edges }) => {
    const [goal, setGoal] = useState<OptimizationGoal>('balance');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [hasRun, setHasRun] = useState(false);
    
    // Constraints
    const [maxCostChange, setMaxCostChange] = useState(50);
    const [maxChanges, setMaxChanges] = useState(10);

    useEffect(() => {
        if (!isOpen) {
            setHasRun(false);
            setProgress(0);
            setIsOptimizing(false);
        }
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleRunOptimization = () => {
        setIsOptimizing(true);
        setProgress(0);
        setHasRun(false);

        // Generate synthetic traffic if none exists (simplified for this modal)
        const trafficMatrix = generateTrafficMatrix(nodes, { model: 'population', baseTraffic: 100, scaleFactor: 1 });

        // Use optimization service
        // In a real app this would be in a Web Worker to not block UI
        setTimeout(() => {
             const result = optimizeCosts(
                nodes, 
                edges, 
                trafficMatrix, 
                { type: goal }, 
                { 
                    maxCostChangePercent: maxCostChange/100,
                    maxChangesCount: maxChanges,
                    protectedEdges: new Set(),
                    minCost: 1,
                    maxCost: 65535
                },
                (p) => setProgress(Math.round(p))
             );
             
             setIsOptimizing(false);
             setHasRun(true);
             setProgress(100);
             // In a real implementation, we would store 'result' in state to display detailed changes
             console.log("Optimization Result:", result);
        }, 100);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-[90vw] h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 animate-scale-in">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <Zap className="w-6 h-6 text-amber-500" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Traffic Engineering & Cost Optimization</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Automated OSPF cost tuning</p>
                        </div>
                    </div>
                    
                    {/* Goal Selector (UI03-03) */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button onClick={() => setGoal('balance')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${goal === 'balance' ? 'bg-white dark:bg-slate-700 shadow text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>Balance Traffic</button>
                        <button onClick={() => setGoal('latency')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${goal === 'latency' ? 'bg-white dark:bg-slate-700 shadow text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>Min Latency</button>
                        <button onClick={() => setGoal('diversity')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${goal === 'diversity' ? 'bg-white dark:bg-slate-700 shadow text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>Max Diversity</button>
                        <button onClick={() => setGoal('cost')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${goal === 'cost' ? 'bg-white dark:bg-slate-700 shadow text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>Min Cost</button>
                    </div>

                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main 3-Column Layout */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* 1. Current State (UI03-02 Heatmap placeholder) */}
                    <div className="w-1/3 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> CURRENT STATE
                        </h3>
                        
                        <div className="flex-1 bg-slate-200 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 relative mb-4 overflow-hidden flex items-center justify-center">
                             {/* Mock Heatmap Visual */}
                             <div className="text-center opacity-40">
                                <Activity className="w-16 h-16 mx-auto mb-2" />
                                <p className="text-sm font-medium">Network Heatmap</p>
                             </div>
                             
                             {/* Utilization Legend */}
                             <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-slate-800/90 p-2 rounded-lg text-[10px] flex justify-between shadow-sm backdrop-blur-sm">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> &lt;50%</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> 50-80%</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> 80-90%</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> &gt;90%</div>
                             </div>
                        </div>

                        {/* Congestion Details (UI03-08) */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Congestion Hotspots</div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Max Utilization</span>
                                    <span className="text-sm font-bold text-red-500">95%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Avg Utilization</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">45%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Congested Links</span>
                                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-bold">8</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Optimization Controls */}
                    <div className="w-1/3 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col">
                         <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <Settings className="w-4 h-4" /> OPTIMIZATION
                        </h3>

                        {/* Constraints Panel (UI03-04) */}
                        <div className="space-y-6 mb-8">
                            <div>
                                <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                                    <span>Max Cost Change</span>
                                    <span>±{maxCostChange}%</span>
                                </div>
                                <input 
                                    type="range" min="10" max="100" step="10"
                                    value={maxCostChange}
                                    onChange={(e) => setMaxCostChange(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                                    <span>Max Changes Count</span>
                                    <span>{maxChanges} links</span>
                                </div>
                                <input 
                                    type="range" min="1" max="50"
                                    value={maxChanges}
                                    onChange={(e) => setMaxChanges(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                            </div>
                        </div>

                        {/* Run Button / Progress (UI03-05) */}
                        <div className="mb-8">
                            {!isOptimizing && !hasRun && (
                                <button 
                                    onClick={handleRunOptimization}
                                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg shadow-amber-500/20 font-bold text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                >
                                    <Play className="w-5 h-5" /> Run Optimization
                                </button>
                            )}

                            {isOptimizing && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                        <span>Running Algorithm...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 transition-all duration-100" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="text-center text-xs text-slate-400 pt-1">
                                        Iteration: {Math.floor(progress / 2)}/50
                                    </div>
                                </div>
                            )}

                            {hasRun && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                    <div>
                                        <div className="font-bold text-green-800 dark:text-green-200">Optimization Complete</div>
                                        <div className="text-xs text-green-600 dark:text-green-400">Found solution with 18% improvement</div>
                                    </div>
                                    <button onClick={() => setHasRun(false)} className="ml-auto p-2 text-slate-400 hover:text-slate-600">
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Recommended Changes (UI03-06) */}
                        {hasRun && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Recommended Changes</h4>
                                <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                            <tr>
                                                <th className="p-2 text-xs font-medium text-slate-500">Link</th>
                                                <th className="p-2 text-xs font-medium text-slate-500">Cost</th>
                                                <th className="p-2 text-xs font-medium text-slate-500">Change</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="p-2 font-mono text-xs">GBR-R9 → DEU-R10</td>
                                                <td className="p-2 text-slate-500">10 → <span className="text-slate-900 dark:text-slate-100 font-bold">15</span></td>
                                                <td className="p-2 text-green-600 text-xs font-medium">+50%</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="p-2 font-mono text-xs">USA-R5 → USA-R6</td>
                                                <td className="p-2 text-slate-500">5 → <span className="text-slate-900 dark:text-slate-100 font-bold">8</span></td>
                                                <td className="p-2 text-green-600 text-xs font-medium">+60%</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="p-2 font-mono text-xs">FRA-R7 → ZAF-R1</td>
                                                <td className="p-2 text-slate-500">20 → <span className="text-slate-900 dark:text-slate-100 font-bold">18</span></td>
                                                <td className="p-2 text-blue-600 text-xs font-medium">-10%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Proposed State */}
                    <div className="w-1/3 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> PROPOSED STATE
                        </h3>

                         <div className="flex-1 bg-slate-200 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 relative mb-4 overflow-hidden flex items-center justify-center">
                             {/* Mock Heatmap Visual (After) */}
                             <div className="text-center opacity-40">
                                <Activity className="w-16 h-16 mx-auto mb-2 text-green-500" />
                                <p className="text-sm font-medium">Optimized Heatmap</p>
                             </div>
                        </div>

                        {/* Comparison Metrics (UI03-07) */}
                         <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Projected Improvements</div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Max Utilization</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 line-through">95%</span>
                                        <span className="text-sm font-bold text-green-500">72%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Congested Links</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 line-through">8</span>
                                        <span className="text-sm font-bold text-green-500">2</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button disabled={!hasRun} className="w-full mt-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                Apply 3 Changes
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
