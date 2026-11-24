import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Warehouse,
    Package,
    ArrowLeftRight,
    Truck,
    Users,
    ShieldCheck,
    LogOut,
    ShoppingBag,
    ShoppingCart,
    Link2,
    ClipboardCheck,
    TrendingDown,
    History,
    Search,
    Command,
    Sparkles,
    SlidersHorizontal,
    Boxes,
    Sun,
    Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const Sidebar = ({ onOpenCommandPalette, onOpenShortcuts }) => {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();

    const sections = [
        {
            title: 'Executive Oversight',
            items: [
                {
                    name: 'Dashboard',
                    subtext: 'Real-time command center',
                    href: '/',
                    icon: LayoutDashboard,
                    badge: 'Hub',
                    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    shortcut: 'G D'
                }
            ]
        },
        {
            title: 'Operations & Auditing',
            items: [
                {
                    name: 'Stock Counting',
                    subtext: 'Cycle counts & reconciliation',
                    href: '/stock-counts',
                    icon: ClipboardCheck,
                    badge: 'New',
                    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                    shortcut: 'G C'
                },
                {
                    name: 'Stock Movements',
                    subtext: 'Transfers & ledger entries',
                    href: '/stock-movements',
                    icon: ArrowLeftRight,
                    shortcut: 'G M'
                },
                {
                    name: 'Warehouses',
                    subtext: 'Facilities & locations',
                    href: '/warehouses',
                    icon: Warehouse,
                    shortcut: 'G W'
                }
            ]
        },
        {
            title: 'Inventory & Procurement',
            items: [
                {
                    name: 'Replenishment',
                    subtext: 'Thresholds & reorder alerts',
                    href: '/replenishment',
                    icon: TrendingDown,
                    badge: 'Auto',
                    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                    shortcut: 'G R'
                },
                {
                    name: 'Products & Catalog',
                    subtext: 'SKU registry & pricing',
                    href: '/products',
                    icon: Package,
                    shortcut: 'G P'
                },
                {
                    name: 'Purchase Orders',
                    subtext: 'Vendor orders & receiving',
                    href: '/purchase-orders',
                    icon: ShoppingBag,
                    shortcut: 'G O'
                },
                {
                    name: 'Suppliers',
                    subtext: 'Vendor management',
                    href: '/suppliers',
                    icon: Truck,
                    shortcut: 'G T'
                },
                {
                    name: 'Supplier Mappings',
                    subtext: 'Vendor catalog matching',
                    href: '/supplier-products',
                    icon: Link2
                }
            ]
        },
        {
            title: 'Sales & Distribution',
            items: [
                {
                    name: 'Sales Orders',
                    subtext: 'Customer fulfillment & dispatch',
                    href: '/sales-orders',
                    icon: ShoppingCart,
                    shortcut: 'G S'
                },
                {
                    name: 'Customers',
                    subtext: 'Client accounts & directory',
                    href: '/customers',
                    icon: Users,
                    shortcut: 'G U'
                }
            ]
        },
        {
            title: 'Governance & Compliance',
            items: [
                {
                    name: 'Audit Trail',
                    subtext: 'Compliance & activity logs',
                    href: '/audit-logs',
                    icon: History,
                    badge: 'Audit',
                    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
                    shortcut: 'G A'
                }
            ]
        }
    ];

    return (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-68 flex-col bg-[#111827] text-[#F1F5F9] shadow-xl border-r border-[#334155] transition-all duration-300">
            {/* Header Brand */}
            <div className="flex h-16 items-center justify-between border-b border-[#334155] px-5 bg-[#111827]">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black shadow-md border border-blue-400/20">
                        <Boxes className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-tight leading-none">Apex Inventory</h1>
                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Warehouse Intelligence
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Find / Command Palette Trigger */}
            <div className="px-4 pt-4 pb-2">
                <button
                    onClick={onOpenCommandPalette}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#1E293B] border border-[#334155] text-xs text-[#94A3B8] hover:text-[#F1F5F9] hover:border-slate-500 hover:bg-[#273449] transition-all cursor-pointer shadow-2xs group"
                >
                    <span className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                        <span>Quick search...</span>
                    </span>
                    <kbd className="flex items-center gap-0.5 rounded border border-[#334155] bg-[#111827] px-1.5 py-0.5 font-mono text-[10px] text-[#94A3B8] group-hover:text-slate-200">
                        <Command className="h-2.5 w-2.5" /> K
                    </kbd>
                </button>
            </div>

            {/* Nav list with Sections */}
            <nav className="flex-1 space-y-5 overflow-y-auto px-3.5 py-3 custom-scrollbar">
                {sections.map((section) => (
                    <div key={section.title} className="space-y-1">
                        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/90">
                            {section.title}
                        </div>
                        {section.items.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                end={item.href === '/'}
                                className={({ isActive }) =>
                                    `group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-sm font-bold'
                                            : 'text-[#CBD5E1] hover:bg-[#273449] hover:text-white'
                                    }`
                                }
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E293B] text-[#CBD5E1] group-hover:bg-[#273449] group-hover:text-blue-400 transition-colors"
                                    >
                                        <item.icon className="h-4 w-4 shrink-0" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="block truncate">{item.name}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    {item.badge && (
                                        <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold border ${item.badgeColor}`}>
                                            {item.badge}
                                        </span>
                                    )}
                                    {item.shortcut && (
                                        <span className="hidden group-hover:inline-block font-mono text-[9px] text-slate-400 bg-[#1E293B] px-1 py-0.5 rounded border border-[#334155]">
                                            {item.shortcut}
                                        </span>
                                    )}
                                </div>
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* Bottom Keyboard Shortcuts & User Profile */}
            <div className="border-t border-[#334155] p-3.5 bg-[#111827] space-y-2.5">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenShortcuts}
                        className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-[#273449] transition cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                            <span>Shortcuts Guide</span>
                        </span>
                        <kbd className="font-mono text-[10px] bg-[#1E293B] px-1.5 py-0.5 rounded text-slate-400 border border-[#334155]">?</kbd>
                    </button>

                    <button
                        onClick={toggleTheme}
                        title={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E293B] text-slate-300 hover:bg-[#273449] hover:text-white transition cursor-pointer border border-[#334155]"
                    >
                        {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-300" />}
                    </button>
                </div>

                {/* User Profile Card */}
                <div className="flex items-center gap-3 rounded-xl bg-[#1E293B] border border-[#334155] p-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs border border-blue-400/20">
                        {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#F1F5F9]">{user?.fullName || user?.email || 'User'}</p>
                        <div className="flex items-center gap-1 text-[10px] text-blue-400 mt-0.5">
                            <ShieldCheck className="h-3 w-3" />
                            <span className="truncate font-semibold">{user?.roles?.[0] || 'User'}</span>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        title="Sign Out"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
