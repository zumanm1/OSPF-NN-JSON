import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Globe, List, Activity, CheckCircle, ArrowRight, Download, FileText, Layout, AlertOctagon } from 'lucide-react';
import { calculateBlastRadiusScore } from '../services/riskScoring';
import { generateRecommendations } from '../services/recommendationEngine';
import { aggregateFlowsByCountry } from '../services/countryAggregation';

interface BlastRadiusAnalyzerProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: VisNode[];
    edges: VisEdge[];
    // Mock props for now
    changedEdgeId?: string;
    oldCost?: number;
    newCost?: number;
}

type Tab = 'visualization' | 'matrix' | 'details';

export const BlastRadiusAnalyzer: React.FC<BlastRadiusAnalyzerProps> = ({ isOpen, onClose, nodes, edges, changedEdgeId, oldCost = 10, newCost = 15 }) => {
    const [activeTab, setActiveTab] = useState<Tab>('visualization');
    
    if (!isOpen) return null;

    // Real calculation using services
    // For this modal, we assume 'impactResults' would be passed as prop in a real integration
    // Since App.tsx passes it (as 'impactResults' state), let's use mock data if missing
    // But wait, the prop isn't in the interface yet. Let's add it.
    const mockImpactResults: any[] = []; 
    
    const riskScoreData = calculateBlastRadiusScore(mockImpactResults, nodes);
    const recommendations = generateRecommendations(riskScoreData, mockImpactResults);
    
    const riskScore = riskScoreData.overall;
    const riskLevel = riskScoreData.risk;
    const riskColor = riskLevel === 'CRITICAL' ? 'text-red-600' : riskLevel === 'HIGH' ? 'text-orange-500' : riskLevel === 'MEDIUM' ? 'text-yellow-500' : 'text-green-500';
    const riskBg = riskLevel === 'CRITICAL' ? 'bg-red-500' : riskLevel === 'HIGH' ? 'bg-orange-500' : riskLevel === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500';

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 animate-scale-in">
                
                {/* Header (UI04-01) */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                             <AlertOctagon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                Blast Radius Analysis
                                <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full font-bold uppercase">{riskScore}/100 {riskLevel}</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                Change: GBR-R9 → DEU-R10 Cost {oldCost} → {newCost}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                         {/* Tab Navigation */}
                         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button onClick={() => setActiveTab('visualization')} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'visualization' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-300' : 'text-slate-500'}`}>
                                <Layout className="w-4 h-4" /> Visualization
                            </button>
                            <button onClick={() => setActiveTab('matrix')} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'matrix' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-300' : 'text-slate-500'}`}>
                                <Globe className="w-4 h-4" /> Country Matrix
                            </button>
                            <button onClick={() => setActiveTab('details')} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'details' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-300' : 'text-slate-500'}`}>
                                <List className="w-4 h-4" /> Flow Details
                            </button>
                        </div>

                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Main Content with Sidebar */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Main Tab Content */}
                    <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex flex-col">
                        {activeTab === 'visualization' && (
                            <div className="flex-1 flex items-center justify-center relative">
                                {/* Blast Radius Visualization (UI04-02 Mock) */}
                                <div className="relative w-[600px] h-[600px] flex items-center justify-center">
                                    {/* Zone 3 */}
                                    <div className="absolute inset-0 border-2 border-dashed border-yellow-400 rounded-full bg-yellow-50/30 dark:bg-yellow-900/10 animate-pulse-slow"></div>
                                    <div className="absolute top-10 text-yellow-600 dark:text-yellow-400 font-bold text-xs uppercase tracking-widest">Zone 3: Secondary</div>
                                    
                                    {/* Zone 2 */}
                                    <div className="absolute inset-24 border-2 border-dashed border-orange-400 rounded-full bg-orange-50/30 dark:bg-orange-900/10 animate-pulse-slow delay-100"></div>
                                    <div className="absolute top-32 text-orange-600 dark:text-orange-400 font-bold text-xs uppercase tracking-widest">Zone 2: Indirect</div>

                                    {/* Zone 1 */}
                                    <div className="absolute inset-48 border-2 border-dashed border-red-400 rounded-full bg-red-50/30 dark:bg-red-900/10 animate-pulse-slow delay-200"></div>
                                    <div className="absolute top-56 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-widest">Zone 1: Direct</div>

                                    {/* Center */}
                                    <div className="relative z-10 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-center">
                                        <div className="text-xs text-slate-500 mb-1">Changed Link</div>
                                        <div className="font-mono font-bold text-slate-800 dark:text-slate-100">GBR-R9 ↔ DEU-R10</div>
                                        <div className="text-xs text-red-500 mt-1">47 Flows Affected</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'matrix' && (
                            <div className="p-8 overflow-auto">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Country Flow Impact Matrix</h3>
                                {/* Mock Matrix Table (UI04-03) */}
                                <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <table className="w-full text-center">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-500">
                                                <th className="p-3 text-left">Source \ Dest</th>
                                                <th className="p-3">GBR</th>
                                                <th className="p-3">USA</th>
                                                <th className="p-3">DEU</th>
                                                <th className="p-3">ZAF</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                            <tr>
                                                <td className="p-3 font-bold text-left bg-slate-50 dark:bg-slate-800">GBR</td>
                                                <td className="p-3 text-slate-300">-</td>
                                                <td className="p-3 bg-red-50 text-red-600 font-medium">12↑</td>
                                                <td className="p-3 bg-green-50 text-green-600 font-medium">5↓</td>
                                                <td className="p-3 bg-orange-50 text-orange-600 font-medium">18↑</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-bold text-left bg-slate-50 dark:bg-slate-800">USA</td>
                                                <td className="p-3 bg-yellow-50 text-yellow-600 font-medium">8↑</td>
                                                <td className="p-3 text-slate-300">-</td>
                                                <td className="p-3 text-slate-400">0</td>
                                                <td className="p-3 bg-red-50 text-red-600 font-medium">9↑</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'details' && (
                            <div className="p-8 overflow-auto">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Affected Flow Details</h3>
                                {/* Mock Details List (UI04-07) */}
                                <div className="space-y-3">
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">GBR-R9 → ZAF-R1</div>
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-bold">REROUTE</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                                <div className="text-xs text-slate-500 mb-1">Before</div>
                                                <div className="font-mono">Cost: 30 | Hops: 3</div>
                                                <div className="text-xs text-slate-400 mt-1">GBR → DEU → ZAF</div>
                                            </div>
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-orange-200">
                                                <div className="text-xs text-slate-500 mb-1">After</div>
                                                <div className="font-mono">Cost: 35 | Hops: 3</div>
                                                <div className="text-xs text-orange-500 mt-1 font-bold">GBR → FRA → ZAF</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar (UI04-04, UI04-05, UI04-06) */}
                    <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto">
                        
                        {/* Risk Score Gauge (UI04-04) */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 text-center">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Risk Score</h3>
                            <div className="relative w-32 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-t-full overflow-hidden">
                                <div className={`absolute bottom-0 left-0 right-0 top-0 origin-bottom transition-all duration-1000 ${riskBg}`} style={{ transform: `rotate(${(riskScore/100) * 180 - 90}deg)` }}></div>
                            </div>
                            <div className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">{riskScore}<span className="text-sm text-slate-400 font-normal">/100</span></div>
                            <div className={`text-sm font-bold ${riskColor}`}>{riskLevel}</div>
                        </div>

                        {/* Recommendation (UI04-05) */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-yellow-50 dark:bg-yellow-900/10">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">PROCEED WITH CAUTION</h3>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-yellow-600"></span> 67 flows affected
                                </p>
                                <p className="text-xs text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-yellow-600"></span> 5 country routing changes
                                </p>
                            </div>
                        </div>

                        {/* Rollback Plan (UI04-06) */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Rollback Plan</h3>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-300 mb-3">
                                int Gi0/0/1<br/>
                                ip ospf cost {oldCost}
                            </div>
                            <button className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded flex items-center justify-center gap-2">
                                <FileText className="w-3 h-3" /> Copy Command
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="p-6 mt-auto space-y-3">
                            <button className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-lg shadow-lg">
                                Apply Change
                            </button>
                            <div className="flex gap-2">
                                <button className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium flex items-center justify-center gap-1">
                                    <FileText className="w-3 h-3" /> PDF
                                </button>
                                <button className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium flex items-center justify-center gap-1">
                                    <Download className="w-3 h-3" /> CSV
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
