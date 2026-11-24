import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Server,
    CheckCircle2,
    User,
    Search,
    Plus,
    Command,
    Keyboard,
    ClipboardCheck,
    TrendingDown,
    ShoppingBag,
    ArrowLeftRight,
    ChevronDown,
    Sparkles,
    Shield,
    Sun,
    Moon
} from 'lucide-react';

export const Navbar = ({ onOpenCommandPalette, onOpenShortcuts }) => {
    const { user } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();
    const [showQuickMenu, setShowQuickMenu] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowQuickMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const quickActions = [
        {
            title: 'Start Stock Count',
            desc: 'Cycle count audit for warehouse',
            icon: ClipboardCheck,
            color: 'text-blue-600 bg-blue-50',
            action: () => {
                navigate('/stock-counts');
                setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-stock-count')), 150);
            }
        },
        {
            title: 'Configure Reorder Threshold',
            desc: 'Set min/max replenishment level',
            icon: TrendingDown,
            color: 'text-indigo-600 bg-indigo-50',
            action: () => {
                navigate('/replenishment');
                setTimeout(() => window.dispatchEvent(new CustomEvent('open-configure-threshold')), 150);
            }
        },
        {
            title: 'Create Purchase Order',
            desc: 'New vendor procurement draft',
            icon: ShoppingBag,
            color: 'text-emerald-600 bg-emerald-50',
            action: () => navigate('/purchase-orders')
        },
        {
            title: 'Record Stock Movement',
            desc: 'Internal transfer or adjustment',
            icon: ArrowLeftRight,
            color: 'text-purple-600 bg-purple-50',
            action: () => navigate('/stock-movements')
        }
    ];

    return (
        <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-[#334155] bg-white/95 dark:bg-[#111827] px-8 backdrop-blur-md shadow-2xs transition-colors duration-200">
            {/* Left: Global Search / Command Palette Launch Button */}
            <div className="flex items-center gap-4 flex-1 max-w-lg">
                <button
                    onClick={onOpenCommandPalette}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50/80 dark:bg-[#1E293B] px-3.5 py-2 text-xs font-medium text-slate-500 dark:text-[#94A3B8] hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-[#273449] hover:text-slate-800 dark:hover:text-[#F1F5F9] transition-all cursor-pointer shadow-2xs group"
                >
                    <span className="flex items-center gap-2.5">
                        <Search className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span>Search operations, SKU catalog, or pages...</span>
                    </span>
                    <div className="flex items-center gap-1">
                        <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#111827] px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:text-[#94A3B8] shadow-2xs">
                            Ctrl + K
                        </kbd>
                    </div>
                </button>
            </div>

            {/* Right: Actions, Shortcuts Guide, API Status & User */}
            <div className="flex items-center gap-3">
                {/* Quick Action Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowQuickMenu(!showQuickMenu)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Quick Action</span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${showQuickMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showQuickMenu && (
                        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#1E293B] shadow-xl border border-slate-200 dark:border-[#334155] p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-[#334155] mb-1">
                                Fast Warehouse Actions
                            </div>
                            <div className="space-y-1">
                                {quickActions.map((act) => {
                                    const Icon = act.icon;
                                    return (
                                        <button
                                            key={act.title}
                                            onClick={() => { act.action(); setShowQuickMenu(false); }}
                                            className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-[#273449] transition cursor-pointer group"
                                        >
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${act.color}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="block text-xs font-bold text-slate-900 dark:text-[#F1F5F9] group-hover:text-blue-500 transition-colors">
                                                    {act.title}
                                                </span>
                                                <span className="block text-[11px] text-slate-400 dark:text-[#94A3B8] truncate">
                                                    {act.desc}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Theme Switcher Toggle (Night / Light Mode) */}
                <button
                    onClick={toggleTheme}
                    title={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-[#273449] transition shadow-2xs cursor-pointer"
                >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-slate-600" />}
                </button>

                {/* Shortcuts Modal Trigger */}
                <button
                    onClick={onOpenShortcuts}
                    title="Keyboard Shortcuts (?)"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#273449] hover:text-slate-900 dark:hover:text-white transition shadow-2xs cursor-pointer"
                >
                    <Keyboard className="h-4 w-4" />
                </button>

                {/* API Status Badge */}
                <div className="hidden md:inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <Server className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Live API</span>
                </div>

                {/* User Info Pill */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50/80 dark:bg-[#1E293B] px-3 py-1.5 shadow-2xs">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-[11px]">
                        {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-[#F1F5F9] max-w-[120px] truncate">
                            {user?.fullName || user?.email}
                        </span>
                        <span className="rounded-md bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.2 text-[10px] font-bold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {user?.roles?.[0] || 'Member'}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
