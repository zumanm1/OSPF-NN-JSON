import React from 'react';
import { X, Sliders } from 'lucide-react';

interface ImpactAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ImpactAnalysisModal: React.FC<ImpactAnalysisModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-in">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Impact Analysis</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400">
                        Analyze the impact of configuration changes before applying them.
                        <br /><br />
                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">Coming Soon in v2.0</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
