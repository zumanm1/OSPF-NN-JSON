import React, { useMemo } from 'react';
import { VisEdge, RouterNode } from '../types';
import { BarChart, Activity, AlertTriangle, Zap, ArrowDown, ArrowUp } from 'lucide-react';

interface CapacityAnalysisProps {
    nodes: RouterNode[];
    edges: VisEdge[];
    isDark: boolean;
}

export const CapacityAnalysis: React.FC<CapacityAnalysisProps> = ({ nodes, edges, isDark }) => {

    // Calculate network statistics
    const stats = useMemo(() => {
        const totalCapacity = edges.reduce((acc, e) => acc + (e.sourceCapacity?.total_capacity_mbps || 0), 0);
        const totalTraffic = edges.reduce((acc, e) => acc + (e.traffic?.forward_traffic_mbps || 0), 0);
        const avgUtilization = edges.length > 0 ? totalTraffic / totalCapacity * 100 : 0;

        const congestedLinks = edges.filter(e => (e.traffic?.forward_utilization_pct || 0) > 80);
        const asymmetricLinks = edges.filter(e => e.isAsymmetric);
        const bundleLinks = edges.filter(e => e.sourceCapacity?.is_bundle);

        return {
            totalCapacity: (totalCapacity / 1000).toFixed(1) + ' Gbps',
            totalTraffic: (totalTraffic / 1000).toFixed(1) + ' Gbps',
            avgUtilization: avgUtilization.toFixed(1) + '%',
            congestedCount: congestedLinks.length,
            asymmetricCount: asymmetricLinks.length,
            bundleCount: bundleLinks.length,
            topUtilized: [...edges].sort((a, b) => (b.traffic?.forward_utilization_pct || 0) - (a.traffic?.forward_utilization_pct || 0)).slice(0, 5)
        };
    }, [edges]);

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-y-auto p-6">

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <Activity className="w-8 h-8 text-blue-500" />
                    Network Capacity Analysis
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Real-time analysis of network capacity, traffic utilization, and bottleneck detection.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Total Capacity</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.totalCapacity}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Zap className="w-5 h-5 text-blue-500" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-green-600">
                        <ArrowUp className="w-3 h-3 mr-1" />
                        <span>Available across {edges.length} links</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Current Traffic</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.totalTraffic}</h3>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <Activity className="w-5 h-5 text-green-500" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-slate-500">
                        <span>Avg Utilization: {stats.avgUtilization}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Congested Links</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.congestedCount}</h3>
                        </div>
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-red-500">
                        <span>&gt; 80% Utilization</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Asymmetric Links</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.asymmetricCount}</h3>
                        </div>
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <BarChart className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-amber-600">
                        <span>Cost Mismatch Detected</span>
                    </div>
                </div>
            </div>

            {/* Top Utilized Links Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-8">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Top Utilized Links</h3>
                    <button className="text-xs text-blue-500 hover:text-blue-600 font-medium">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 font-medium">
                            <tr>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3">Target</th>
                                <th className="px-4 py-3">Interface</th>
                                <th className="px-4 py-3">Capacity</th>
                                <th className="px-4 py-3">Traffic</th>
                                <th className="px-4 py-3">Utilization</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {stats.topUtilized.map((edge, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{edge.from}</td>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{edge.to}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{edge.ifaceFrom}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{edge.sourceCapacity?.speed || 'N/A'}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{edge.traffic?.forward_traffic_mbps} Mbps</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full ${(edge.traffic?.forward_utilization_pct || 0) > 90 ? 'bg-red-500' :
                                                            (edge.traffic?.forward_utilization_pct || 0) > 75 ? 'bg-amber-500' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${edge.traffic?.forward_utilization_pct || 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                {edge.traffic?.forward_utilization_pct}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${edge.status === 'up'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {edge.status?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {stats.topUtilized.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        No traffic data available. Import a rich topology file to see analysis.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};
