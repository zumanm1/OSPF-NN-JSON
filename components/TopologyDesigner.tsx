
import React, { useState, useRef } from 'react';
import { Plus, Save, Trash2, MapPin, Server, Upload, Download } from 'lucide-react';
import { RouterNode } from '../types';
import { validateTopologyJSON, validateExportedJSON } from '../utils/jsonValidator';

interface TopologyDesignerProps {
    nodes: RouterNode[];
    onAddNode: (node: RouterNode) => void;
    onRemoveNode: (nodeId: string) => void;
    onSave: () => void;
    onImportDesign: (nodes: RouterNode[]) => void;
    isDark: boolean;
}

export const TopologyDesigner: React.FC<TopologyDesignerProps> = ({ nodes, onAddNode, onRemoveNode, onSave, onImportDesign, isDark }) => {
    const [newNodeName, setNewNodeName] = useState('');
    const [newNodeCountry, setNewNodeCountry] = useState('USA');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAdd = () => {
        if (!newNodeName) return;
        const id = newNodeName.toLowerCase().replace(/\s+/g, '-');
        const newNode: RouterNode = {
            id,
            name: newNodeName,
            hostname: newNodeName,
            loopback_ip: '10.0.0.1', // Default
            country: newNodeCountry,
            is_active: true,
            node_type: 'router',
            neighbor_count: 0
        };
        onAddNode(newNode);
        setNewNodeName('');
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);

                // VALIDATION: Check for valid topology structure
                const validation = validateTopologyJSON(data);
                if (!validation.isValid) {
                    alert(`❌ Import Failed\n\n${validation.errorMessage}\n\nDesigner requires a file with a "nodes" array.`);
                    console.error('Designer import validation failed:', validation);
                    event.target.value = '';
                    return;
                }

                if (data.nodes && Array.isArray(data.nodes)) {
                    if (data.nodes.length === 0) {
                        alert('⚠️ Warning: Imported file contains zero nodes.');
                    }
                    onImportDesign(data.nodes);
                } else {
                    alert("Invalid design file format. Must contain a 'nodes' array.");
                }
            } catch (err) {
                console.error("Error importing design:", err);
                alert("Failed to parse design file. Please ensure it's valid JSON.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleExportDesign = () => {
        const data = { nodes };

        // VALIDATION: Ensure export is valid
        const validation = validateExportedJSON({ data });
        if (!validation.isValid) {
            alert(`❌ Export Failed\n\n${validation.errorMessage}`);
            console.error('Designer export validation failed:', validation);
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
                    <Server className="w-5 h-5 text-blue-500" />
                    Topology Designer
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Add or remove routers from the network.
                </p>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
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

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Existing Routers ({nodes.length})</h3>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                            title="Load Design"
                        >
                            <Upload className="w-3 h-3" /> Load
                        </button>
                    </div>
                    <div className="space-y-2">
                        {nodes.map(node => (
                            <div key={node.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg group">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-400" />
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
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-2">
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
