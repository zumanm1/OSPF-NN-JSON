import React from 'react';
import { X, Activity, ArrowRight, Shield, Zap, Network, Server, AlertTriangle } from 'lucide-react';
import { VisEdge, RouterNode } from '../types';

interface LinkInspectorProps {
    edge: VisEdge;
    sourceNode?: RouterNode;
    targetNode?: RouterNode;
    onClose: () => void;
}

export const LinkInspector: React.FC<LinkInspectorProps> = ({ edge, sourceNode, targetNode, onClose }) => {
    if (!edge) return null;

    // Helper to format speed
    const formatSpeed = (speed?: string) => {
        if (!speed) return 'N/A';
        return speed.replace('GigabitEthernet', 'Ge').replace('TenGigE', 'Te');
    };

    // Helper to get utilization color
    const getUtilColor = (pct: number) => {
        if (pct >= 90) return 'text-red-600';
        if (pct >= 75) return 'text-amber-500';
        return 'text-green-600';
    };

    return (
        <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-30 flex flex-col overflow-hidden animate-slide-in-right">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-blue-500" />
                    <h2 className="font-bold text-slate-800 dark:text-slate-100">Link Inspector</h2>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Connection Header */}
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                    <div className="flex flex-col items-center">
                        <Server className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{sourceNode?.name || edge.from}</span>
                        <span className="text-[10px] text-slate-500">{sourceNode?.loopback_ip}</span>
                    </div>
                    <div className="flex flex-col items-center px-2">
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                        <span className="text-xs font-mono text-slate-500 mt-1">{edge.cost}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Server className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{targetNode?.name || edge.to}</span>
                        <span className="text-[10px] text-slate-500">{targetNode?.loopback_ip}</span>
                    </div>
                </div>

                {/* Status & Type */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-xs text-slate-500 uppercase font-semibold">Status</span>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${edge.status === 'up' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="font-medium text-slate-700 dark:text-slate-200 uppercase">{edge.status || 'Unknown'}</span>
                        </div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-xs text-slate-500 uppercase font-semibold">Type</span>
                        <div className="flex items-center gap-2 mt-1">
                            <Activity className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-slate-700 dark:text-slate-200 capitalize">{edge.edgeType || 'Standard'}</span>
                        </div>
                    </div>
                </div>

                {/* Interface Details */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                        <Network className="w-4 h-4" /> Interfaces
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-3 py-2">End</th>
                                    <th className="px-3 py-2">Interface</th>
                                    <th className="px-3 py-2">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                <tr>
                                    <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Source</td>
                                    <td className="px-3 py-2 font-mono text-xs text-blue-600 dark:text-blue-400">{edge.ifaceFrom}</td>
                                    <td className="px-3 py-2 text-slate-500">-</td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Target</td>
                                    <td className="px-3 py-2 font-mono text-xs text-blue-600 dark:text-blue-400">{edge.ifaceTo}</td>
                                    <td className="px-3 py-2 text-slate-500">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Capacity & Speed */}
                {(edge.sourceCapacity || edge.targetCapacity) && (
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Capacity & Speed
                        </h3>
                        <div className="space-y-2">
                            {edge.sourceCapacity && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-slate-500">Physical Speed</span>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{edge.sourceCapacity.speed}</span>
                                    </div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-slate-500">Total Capacity</span>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{edge.sourceCapacity.total_capacity_mbps} Mbps</span>
                                    </div>
                                    {edge.sourceCapacity.is_bundle && (
                                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                            <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                <Network className="w-3 h-3" />
                                                Bundle: {edge.sourceCapacity.member_count} x {edge.sourceCapacity.member_speed}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Traffic Statistics */}
                {edge.traffic && (
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Traffic Analysis
                        </h3>
                        <div className="space-y-3">
                            {/* Forward */}
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-500">Forward Utilization</span>
                                    <span className={`font-bold ${getUtilColor(edge.traffic.forward_utilization_pct)}`}>
                                        {edge.traffic.forward_utilization_pct}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full ${edge.traffic.forward_utilization_pct > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                        style={{ width: `${edge.traffic.forward_utilization_pct}%` }}
                                    ></div>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 text-right">
                                    {edge.traffic.forward_traffic_mbps} Mbps
                                </div>
                            </div>

                            {/* Reverse */}
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-500">Reverse Utilization</span>
                                    <span className={`font-bold ${getUtilColor(edge.traffic.reverse_utilization_pct)}`}>
                                        {edge.traffic.reverse_utilization_pct}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full ${edge.traffic.reverse_utilization_pct > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                        style={{ width: `${edge.traffic.reverse_utilization_pct}%` }}
                                    ></div>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 text-right">
                                    {edge.traffic.reverse_traffic_mbps} Mbps
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* OSPF Metrics */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" /> OSPF Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 text-center">
                            <div className="text-xs text-slate-500">Forward Cost</div>
                            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{edge.cost}</div>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 text-center">
                            <div className="text-xs text-slate-500">Reverse Cost</div>
                            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{edge.reverseCost || '-'}</div>
                        </div>
                    </div>
                    {edge.isAsymmetric && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Asymmetric routing detected</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
