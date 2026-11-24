import React from 'react';
import { Keyboard, X, ArrowRight, CornerDownLeft } from 'lucide-react';

export const ShortcutsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const shortcutGroups = [
        {
            title: 'Global Quick Access',
            items: [
                { keys: ['Ctrl', 'K'], label: 'Open Command Palette / Quick Search' },
                { keys: ['?'], label: 'Open this Keyboard Shortcuts Guide' },
                { keys: ['Esc'], label: 'Close active modal, drawer, or palette' }
            ]
        },
        {
            title: 'Navigation Shortcuts (Press G then key)',
            items: [
                { keys: ['G', 'C'], label: 'Jump to Stock Counting & Reconciliation' },
                { keys: ['G', 'R'], label: 'Jump to Replenishment & Reorder Points' },
                { keys: ['G', 'A'], label: 'Jump to Audit Trail & Compliance Log' },
                { keys: ['G', 'W'], label: 'Jump to Warehouses & Facilities' },
                { keys: ['G', 'P'], label: 'Jump to Products & Catalog' },
                { keys: ['G', 'M'], label: 'Jump to Stock Movements & Transfers' },
                { keys: ['G', 'O'], label: 'Jump to Purchase Orders' },
                { keys: ['G', 'S'], label: 'Jump to Sales Orders' },
                { keys: ['G', 'D'], label: 'Jump to Executive Dashboard' }
            ]
        },
        {
            title: 'Form & Table Shortcuts',
            items: [
                { keys: ['Enter'], label: 'Submit form or advance to next count row' },
                { keys: ['/'], label: 'Focus active table search input' },
                { keys: ['D'], label: 'Toggle Discrepancy Only filter in Count Sheet' }
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#0B1120]/80 backdrop-blur-xs">
            <div
                className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#1E293B] shadow-2xl border border-slate-200 dark:border-[#334155] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#111827] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            <Keyboard className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">Keyboard Shortcuts Guide</h3>
                            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Speed up your warehouse workflows with quick key combos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#273449] hover:text-slate-600 dark:hover:text-[#F1F5F9] cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
                    {shortcutGroups.map((group) => (
                        <div key={group.title} className="space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] border-b border-slate-100 dark:border-[#334155] pb-1">
                                {group.title}
                            </h4>
                            <div className="space-y-1.5">
                                {group.items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#273449] transition"
                                    >
                                        <span className="text-xs text-slate-700 dark:text-[#CBD5E1] font-medium">{item.label}</span>
                                        <div className="flex items-center gap-1">
                                            {item.keys.map((k, kIdx) => (
                                                <React.Fragment key={kIdx}>
                                                    <kbd className="inline-flex min-w-[24px] items-center justify-center rounded-md border border-slate-300 dark:border-[#334155] bg-slate-100 dark:bg-[#111827] px-2 py-1 font-mono text-[11px] font-bold text-slate-800 dark:text-[#F1F5F9] shadow-2xs">
                                                        {k}
                                                    </kbd>
                                                    {kIdx < item.keys.length - 1 && (
                                                        <span className="text-slate-400 text-xs">+</span>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-[#111827] px-6 py-3 flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
                    <span>Press <kbd className="font-mono font-bold text-slate-700 dark:text-[#CBD5E1] bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] px-1.5 py-0.5 rounded">Esc</kbd> to close</span>
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsModal;
