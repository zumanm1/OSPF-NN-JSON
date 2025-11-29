
import React, { useState, useRef } from 'react';
import { Play, Plus, Trash2, Activity, Save, Upload } from 'lucide-react';
import { VisEdge, RouterNode } from '../types';
import { validateScenarioJSON } from '../utils/jsonValidator';

interface ScenarioChange {
    id: string;
    edgeId: string;
    from: string;
    to: string;
    newCost: number;
}

interface ScenarioPlannerProps {
    edges: VisEdge[];
    nodes: RouterNode[];
    onRunScenario: (changes: ScenarioChange[]) => void;
    onSaveScenario: (changes: ScenarioChange[]) => void;
    isDark: boolean;
}

export const ScenarioPlanner: React.FC<ScenarioPlannerProps> = ({ edges, nodes, onRunScenario, onSaveScenario, isDark }) => {
    const [changes, setChanges] = useState<ScenarioChange[]>([]);
    const [selectedEdgeId, setSelectedEdgeId] = useState('');
    const [proposedCost, setProposedCost] = useState(10);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddChange = () => {
        if (!selectedEdgeId) return;
        const edge = edges.find(e => e.id === selectedEdgeId);
        if (!edge) return;

        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);

        const newChange: ScenarioChange = {
            id: Date.now().toString(),
            edgeId: selectedEdgeId,
            from: fromNode?.name || edge.from,
            to: toNode?.name || edge.to,
            newCost: proposedCost
        };

        setChanges(prev => [...prev, newChange]);
        setSelectedEdgeId('');
        setProposedCost(10);
    };

    const handleRemoveChange = (id: string) => {
        setChanges(prev => prev.filter(c => c.id !== id));
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);

                // VALIDATION: Check for valid scenario structure
                const validation = validateScenarioJSON(data);
                if (!validation.isValid) {
                    alert(`❌ Import Failed\n\n${validation.errorMessage}\n\nScenario files must be an array of changes with 'edgeId' and 'newCost' fields.`);
                    console.error('Scenario import validation failed:', validation);
                    event.target.value = '';
                    return;
                }

                if (Array.isArray(data)) {
                    setChanges(data);
                } else {
                    alert("Invalid scenario file format. Must be an array of changes.");
                }
            } catch (err) {
                console.error("Error importing scenario:", err);
                alert("Failed to parse scenario file. Please ensure it's valid JSON.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    return (
        <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col w-80 shadow-xl z-20">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
                accept=".json"
            />
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500" />
                    Scenario Planner
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Plan multiple cost changes and simulate their combined impact.
                </p>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Add Cost Change</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Select Link</label>
                            <select
                                value={selectedEdgeId}
                                onChange={(e) => setSelectedEdgeId(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select a link...</option>
                                {edges.map(e => {
                                    const fromName = nodes.find(n => n.id === e.from)?.name || e.from;
                                    const toName = nodes.find(n => n.id === e.to)?.name || e.to;
                                    return (
                                        <option key={e.id} value={e.id}>
                                            {fromName} → {toName} (Curr: {e.cost})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">New Cost</label>
                            <input
                                type="number"
                                min="1"
                                value={proposedCost}
                                onChange={(e) => setProposedCost(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={handleAddChange}
                            disabled={!selectedEdgeId}
                            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add to Scenario
                        </button>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pending Changes ({changes.length})</h3>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                            title="Load Scenario"
                        >
                            <Upload className="w-3 h-3" /> Load
                        </button>
                    </div>
                    <div className="space-y-2">
                        {changes.length === 0 && (
                            <div className="text-xs text-slate-400 text-center py-4 italic">
                                No changes added yet.
                            </div>
                        )}
                        {changes.map(change => (
                            <div key={change.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg group">
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{change.from} → {change.to}</span>
                                    <span className="text-[10px] text-slate-500">New Cost: <span className="font-bold text-blue-600">{change.newCost}</span></span>
                                </div>
                                <button
                                    onClick={() => handleRemoveChange(change.id)}
                                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove Change"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-2">
                <button
                    onClick={() => onSaveScenario(changes)}
                    disabled={changes.length === 0}
                    className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <Save className="w-4 h-4" /> Save
                </button>
                <button
                    onClick={() => onRunScenario(changes)}
                    disabled={changes.length === 0}
                    className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <Play className="w-4 h-4" /> Run
                </button>
            </div>
        </div>
    );
};
