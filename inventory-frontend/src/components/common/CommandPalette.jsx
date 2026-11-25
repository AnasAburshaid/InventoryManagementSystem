import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
    Search,
    X,
    ArrowRight,
    LayoutDashboard,
    ChartNoAxesCombined,
    ClipboardCheck,
    TrendingDown,
    History,
    Warehouse,
    Package,
    ShoppingBag,
    ShoppingCart,
    Truck,
    Users,
    ArrowLeftRight,
    Plus,
    SlidersHorizontal,
    Keyboard,
    CornerDownLeft,
    Sparkles,
    ShieldAlert,
    Sun,
    Moon
} from 'lucide-react';

export const CommandPalette = ({ isOpen, onClose, onOpenShortcuts }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();

    // Available pages and quick actions
    const items = [
        // Navigation Pages
        {
            category: 'Navigation',
            name: 'Executive Dashboard (Command Center)',
            description: 'Live system oversight, inventory valuation, and prioritized alerts',
            icon: LayoutDashboard,
            color: 'text-blue-600 bg-blue-50',
            shortcut: 'G D',
            action: () => navigate('/')
        },
        {
            category: 'Navigation',
            name: 'AI Inventory Assistant',
            description: 'Ask natural-language questions about stock, reorder levels, orders, and audits',
            icon: Sparkles,
            color: 'text-indigo-600 bg-indigo-50',
            shortcut: 'G A',
            action: () => navigate('/assistant')
        },
        {
            category: 'Navigation',
            name: 'Demand Forecasting',
            description: 'Review projected demand, stockout risk, and forecast confidence',
            icon: ChartNoAxesCombined,
            color: 'text-indigo-600 bg-indigo-50',
            shortcut: 'G F',
            action: () => navigate('/forecasting')
        },
        {
            category: 'Navigation',
            name: 'Stock Counting & Reconciliation',
            description: 'Run physical cycle counts, record shelf quantities, and reconcile discrepancies',
            icon: ClipboardCheck,
            color: 'text-blue-600 bg-blue-50',
            shortcut: 'G C',
            action: () => navigate('/stock-counts')
        },
        {
            category: 'Navigation',
            name: 'Replenishment & Reorder Points',
            description: 'Automated threshold monitoring and draft purchase order generation',
            icon: TrendingDown,
            color: 'text-indigo-600 bg-indigo-50',
            shortcut: 'G R',
            action: () => navigate('/replenishment')
        },
        {
            category: 'Navigation',
            name: 'Audit Trail & Compliance',
            description: 'Immutable historical event log of all ledger movements and approvals',
            icon: History,
            color: 'text-teal-600 bg-teal-50',
            shortcut: 'G A',
            action: () => navigate('/audit-logs')
        },
        {
            category: 'Navigation',
            name: 'Warehouse Operations & Stock Movements',
            description: 'Record inbound receipts, stock transfers, and adjustments',
            icon: ArrowLeftRight,
            color: 'text-purple-600 bg-purple-50',
            shortcut: 'G M',
            action: () => navigate('/stock-movements')
        },
        {
            category: 'Navigation',
            name: 'Purchase Orders',
            description: 'Vendor procurement orders, line item tracking, and receiving',
            icon: ShoppingBag,
            color: 'text-emerald-600 bg-emerald-50',
            shortcut: 'G O',
            action: () => navigate('/purchase-orders')
        },
        {
            category: 'Navigation',
            name: 'Sales Orders',
            description: 'Customer order management, order fulfillment, and dispatch',
            icon: ShoppingCart,
            color: 'text-cyan-600 bg-cyan-50',
            shortcut: 'G S',
            action: () => navigate('/sales-orders')
        },
        {
            category: 'Navigation',
            name: 'Warehouses & Storage Facilities',
            description: 'Facility configuration, capacity settings, and location management',
            icon: Warehouse,
            color: 'text-amber-600 bg-amber-50',
            shortcut: 'G W',
            action: () => navigate('/warehouses')
        },
        {
            category: 'Navigation',
            name: 'Products & Catalog',
            description: 'SKU definitions, categories, units of measure, and prices',
            icon: Package,
            color: 'text-slate-600 bg-slate-100',
            shortcut: 'G P',
            action: () => navigate('/products')
        },
        {
            category: 'Navigation',
            name: 'Suppliers & Vendors',
            description: 'Vendor directory, catalog capabilities, and pricing',
            icon: Truck,
            color: 'text-orange-600 bg-orange-50',
            shortcut: 'G T',
            action: () => navigate('/suppliers')
        },
        {
            category: 'Navigation',
            name: 'Customers',
            description: 'Customer accounts and billing directory',
            icon: Users,
            color: 'text-pink-600 bg-pink-50',
            shortcut: 'G U',
            action: () => navigate('/customers')
        },
        // Quick Actions
        {
            category: 'Quick Actions',
            name: 'Toggle Night / Light Mode',
            description: 'Switch between dark and light color theme preferences',
            icon: isDark ? Sun : Moon,
            color: 'text-amber-600 bg-amber-50',
            shortcut: 'Alt T',
            action: () => toggleTheme()
        },
        {
            category: 'Quick Actions',
            name: 'Start New Stock Count Session',
            description: 'Initiate a full or partial cycle count for a warehouse',
            icon: Plus,
            color: 'text-blue-600 bg-blue-100',
            shortcut: 'Alt N C',
            action: () => {
                navigate('/stock-counts');
                setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-stock-count')), 150);
            }
        },
        {
            category: 'Quick Actions',
            name: 'Configure Product Reorder Threshold',
            description: 'Set minimum reorder points and target buffer stock levels',
            icon: SlidersHorizontal,
            color: 'text-indigo-600 bg-indigo-100',
            shortcut: 'Alt N T',
            action: () => {
                navigate('/replenishment');
                setTimeout(() => window.dispatchEvent(new CustomEvent('open-configure-threshold')), 150);
            }
        },
        {
            category: 'Quick Actions',
            name: 'View Keyboard Shortcuts',
            description: 'Show full cheat sheet of navigation and action shortcuts',
            icon: Keyboard,
            color: 'text-slate-700 bg-slate-100',
            shortcut: '?',
            action: () => {
                if (onOpenShortcuts) onOpenShortcuts();
            }
        }
    ];

    // Filter items
    const filteredItems = items.filter(item => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
            item.name.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            item.shortcut?.toLowerCase().includes(q)
        );
    });

    // Auto-focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Keyboard navigation within list
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                    filteredItems[selectedIndex].action();
                    onClose();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredItems, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 dark:bg-[#0B1120]/80 backdrop-blur-xs">
            <div
                className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#1E293B] shadow-2xl border border-slate-200 dark:border-[#334155] overflow-hidden transition-all transform animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input Bar */}
                <div className="relative border-b border-slate-200 dark:border-[#334155] bg-white dark:bg-[#111827] px-4 py-3.5 flex items-center gap-3">
                    <Search className="h-5 w-5 text-slate-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                        placeholder="Search pages, actions, or type a shortcut... (e.g. stock, reorder, audit)"
                        className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-[#F1F5F9] placeholder-slate-400 focus:outline-none"
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); setSelectedIndex(0); }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-slate-200 dark:border-[#334155] bg-slate-100 dark:bg-[#1E293B] px-2 py-0.5 text-[11px] font-mono text-slate-500 dark:text-[#94A3B8]">
                        ESC to close
                    </kbd>
                </div>

                {/* Results List */}
                <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-[#273449]">
                    {filteredItems.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <Search className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-[#CBD5E1]">No matching pages or actions</p>
                            <p className="text-xs text-slate-400 mt-1">Try searching for "Stock", "Count", "Reorder", "PO", or "Audit"</p>
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => {
                            const isSelected = idx === selectedIndex;
                            const IconComponent = item.icon;

                            return (
                                <div
                                    key={item.name}
                                    onClick={() => { item.action(); onClose(); }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-blue-50/80 dark:bg-blue-600/20 text-blue-900 dark:text-blue-300 border border-transparent dark:border-blue-500/30 shadow-xs'
                                            : 'hover:bg-slate-50 dark:hover:bg-[#273449] text-slate-700 dark:text-[#CBD5E1]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${item.color}`}>
                                            <IconComponent className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900 dark:text-[#F1F5F9] truncate">{item.name}</span>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-[#111827] px-1.5 py-0.2 rounded border border-transparent dark:border-[#334155]">
                                                    {item.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">{item.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ml-4">
                                        {item.shortcut && (
                                            <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] px-2 py-0.5 rounded shadow-2xs">
                                                {item.shortcut}
                                            </span>
                                        )}
                                        {isSelected && (
                                            <CornerDownLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#111827] px-4 py-2.5 text-[11px] text-slate-500 dark:text-[#94A3B8]">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-1.5 py-0.5 font-mono text-[10px]">↑</kbd>
                            <kbd className="rounded border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-1.5 py-0.5 font-mono text-[10px]">↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
                            Select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-1.5 py-0.5 font-mono text-[10px]">?</kbd>
                            Shortcuts Guide
                        </span>
                    </div>
                    <span className="font-semibold text-slate-600 dark:text-[#94A3B8]">Inventory Management Portal</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
