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
    LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
    const { user, logout } = useAuth();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
        { name: 'Products & Catalog', href: '/products', icon: Package },
        { name: 'Stock Movements', href: '/stock-movements', icon: ArrowLeftRight },
        { name: 'Suppliers', href: '/suppliers', icon: Truck },
        { name: 'Customers', href: '/customers', icon: Users },
    ];

    return (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-slate-900 text-slate-100 shadow-xl transition-all duration-300">
            {/* Header */}
            <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
                    IMS
                </div>
                <div>
                    <h1 className="text-base font-semibold text-white tracking-tight leading-none">Inventory System</h1>
                    <span className="text-xs text-slate-400">Management Portal</span>
                </div>
            </div>

            {/* Nav list */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
                <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Main Navigation
                </div>
                {navigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        end={item.href === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User Profile & Logout */}
            <div className="border-t border-slate-800 p-4">
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-800/60 p-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                        {user?.fullName?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{user?.fullName || 'User'}</p>
                        <div className="flex items-center gap-1 text-xs text-blue-400">
                            <ShieldCheck className="h-3 w-3" />
                            <span className="truncate">{user?.roles?.[0] || 'User'}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
