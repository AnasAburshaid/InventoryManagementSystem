import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import supplierService from '../services/supplierService';
import customerService from '../services/customerService';
import purchaseOrderService from '../services/purchaseOrderService';
import salesOrderService from '../services/salesOrderService';
import replenishmentService from '../services/replenishmentService';
import { formatMoneyK, formatCurrency } from '../utils/formatUtils';
import { formatDateOnly } from '../utils/dateUtils';
import {
    Warehouse,
    Package,
    ArrowLeftRight,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Plus,
    Boxes,
    Truck,
    Users,
    Search,
    Layers,
    Tag,
    ChevronRight,
    ExternalLink,
    ClipboardCheck,
    ShoppingBag,
    ShoppingCart,
    ShieldCheck,
    Command,
    Keyboard,
    AlertTriangle,
    Clock,
    DollarSign,
    CheckCheck,
    ArrowUpRight,
    ArrowDownLeft,
    Sparkles,
    Activity,
    Compass
} from 'lucide-react';

export const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [replenishmentSuggestions, setReplenishmentSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingReplenishment, setLoadingReplenishment] = useState(false);
    const [error, setError] = useState('');

    const fetchCoreData = async () => {
        setLoading(true);
        setError('');
        try {
            const [whData, prodData, supData, custData, poData, soData] = await Promise.all([
                warehouseService.getAll().catch(() => []),
                productService.getAll().catch(() => []),
                supplierService.getAll().catch(() => []),
                customerService.getAll().catch(() => []),
                purchaseOrderService.getAll().catch(() => []),
                salesOrderService.getAll().catch(() => [])
            ]);

            setWarehouses(whData || []);
            setProducts(prodData || []);
            setSuppliers(supData || []);
            setCustomers(custData || []);
            setPurchaseOrders(poData || []);
            setSalesOrders(soData || []);

            if (whData && whData.length > 0 && !selectedWarehouseId) {
                setSelectedWarehouseId(whData[0].id);
            }
        } catch (err) {
            console.error('Error fetching dashboard core data:', err);
            setError('Could not load some dashboard metrics from API. Please verify backend connection.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch warehouse-specific replenishment suggestions
    const fetchWarehouseReplenishment = async (whId) => {
        if (!whId) return;
        setLoadingReplenishment(true);
        try {
            const data = await replenishmentService.getSuggestions(whId, true);
            setReplenishmentSuggestions(data || []);
        } catch (err) {
            console.error('Failed to load replenishment for warehouse:', err);
            setReplenishmentSuggestions([]);
        } finally {
            setLoadingReplenishment(false);
        }
    };

    useEffect(() => {
        fetchCoreData();
    }, []);

    useEffect(() => {
        if (selectedWarehouseId) {
            fetchWarehouseReplenishment(selectedWarehouseId);
        }
    }, [selectedWarehouseId]);

    const activeWarehouses = useMemo(() => warehouses.filter((w) => w.isActive), [warehouses]);
    const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products]);

    // Active pending procurement & sales
    const pendingPOs = useMemo(() => {
        return purchaseOrders.filter((po) => po.status === 'Ordered' || po.status === 'PartiallyReceived');
    }, [purchaseOrders]);

    const pendingSOs = useMemo(() => {
        return salesOrders.filter((so) => so.status === 'Confirmed' || so.status === 'PartiallyFulfilled');
    }, [salesOrders]);

    const totalPOSpend = useMemo(() => {
        return purchaseOrders
            .filter((po) => po.status !== 'Cancelled')
            .reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    }, [purchaseOrders]);

    const totalSORep = useMemo(() => {
        return salesOrders
            .filter((so) => so.status !== 'Cancelled')
            .reduce((sum, so) => sum + (so.totalAmount || 0), 0);
    }, [salesOrders]);

    const currentWarehouse = useMemo(() => {
        return warehouses.find((w) => w.id === selectedWarehouseId) || warehouses[0] || null;
    }, [warehouses, selectedWarehouseId]);

    const triggerCommandPalette = () => {
        window.dispatchEvent(new CustomEvent('toggle-command-palette'));
    };

    const triggerShortcutsModal = () => {
        window.dispatchEvent(new CustomEvent('toggle-shortcuts-modal'));
    };

    return (
        <div className="space-y-8 pb-10">
            {/* HERO EXECUTIVE WELCOME & COMMAND BAR */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10 border border-slate-800">
                <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                Real-time Ledger System
                            </span>
                            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                                • Version 2.0 Connected
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Welcome back, {user?.fullName || 'Operator'}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Complete command & control hub for physical warehouse inventory, replenishment queues, procurement vouchers, and commercial shipments.
                        </p>
                    </div>

                    {/* Facility Switcher & Quick Command Triggers */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                        {warehouses.length > 0 && (
                            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2 backdrop-blur-md border border-white/10">
                                <Warehouse className="h-4 w-4 text-blue-300" />
                                <div className="text-left">
                                    <span className="text-[10px] uppercase font-bold text-slate-300 block leading-none">
                                        Active Facility
                                    </span>
                                    <select
                                        value={selectedWarehouseId}
                                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-2 pt-0.5"
                                    >
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id} className="text-slate-900 bg-white">
                                                {w.name} ({w.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                onClick={triggerCommandPalette}
                                className="inline-flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-xs font-bold text-white transition backdrop-blur-md border border-white/15 cursor-pointer shadow-sm"
                                title="Press Ctrl+K anytime"
                            >
                                <Command className="h-4 w-4 text-blue-300" />
                                <span className="hidden sm:inline">Command Palette</span>
                                <kbd className="font-mono text-[10px] bg-black/30 px-1.5 py-0.5 rounded border border-white/20">
                                    Ctrl+K
                                </kbd>
                            </button>

                            <button
                                onClick={triggerShortcutsModal}
                                className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/20 p-2.5 text-xs font-bold text-slate-200 transition backdrop-blur-md border border-white/10 cursor-pointer"
                                title="Keyboard Shortcuts Cheat Sheet (?)"
                            >
                                <Keyboard className="h-4 w-4" />
                                <kbd className="font-mono text-[10px] bg-black/30 px-1.5 py-0.5 rounded border border-white/20">
                                    ?
                                </kbd>
                            </button>

                            <button
                                onClick={fetchCoreData}
                                disabled={loading}
                                className="rounded-2xl bg-white/10 hover:bg-white/20 p-2.5 text-slate-200 transition backdrop-blur-md border border-white/10 cursor-pointer disabled:opacity-50"
                                title="Reload latest metrics"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-300' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* SECTION 1: PRIMARY OPERATIONAL SHORTCUTS (The Core Requested Feature) */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Compass className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-base font-black tracking-tight text-slate-900">
                            Fast Operational Launchers & Keyboard Shortcuts
                        </h2>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                        Type sequence keys directly or click to navigate
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Shortcut 1: Stock Counting */}
                    <Link
                        to="/stock-counts"
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-blue-400 transition-all duration-200 flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
                                <ClipboardCheck className="h-6 w-6" />
                            </div>
                            <span className="font-mono text-[11px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition">
                                Press G C
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition">
                                Physical Stock Counting
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                Start full or selective cycle count sessions, record physical inventory, and reconcile ledger variances.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-bold text-blue-600 group-hover:translate-x-1 transition">
                            <span>Open Count Workspace &rarr;</span>
                        </div>
                    </Link>

                    {/* Shortcut 2: Replenishment Queue */}
                    <Link
                        to="/replenishment"
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-amber-400 transition-all duration-200 flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition">
                                <ShoppingBag className="h-6 w-6" />
                            </div>
                            <div className="flex items-center gap-2">
                                {replenishmentSuggestions.length > 0 && (
                                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200 animate-pulse">
                                        {replenishmentSuggestions.length} Needs Reorder
                                    </span>
                                )}
                                <span className="font-mono text-[11px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 group-hover:bg-amber-50 group-hover:text-amber-700 group-hover:border-amber-200 transition">
                                    Press G R
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition">
                                Replenishment & Reorder Points
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                Evaluate stock against min/max thresholds and generate 1-click purchase order requisition drafts.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-bold text-amber-600 group-hover:translate-x-1 transition">
                            <span>Review Reorder Queue &rarr;</span>
                        </div>
                    </Link>

                    {/* Shortcut 3: Purchase Orders */}
                    <Link
                        to="/purchase-orders"
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-emerald-400 transition-all duration-200 flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
                                <Truck className="h-6 w-6" />
                            </div>
                            <div className="flex items-center gap-2">
                                {pendingPOs.length > 0 && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-200">
                                        {pendingPOs.length} Inbound
                                    </span>
                                )}
                                <span className="font-mono text-[11px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 transition">
                                    Press G O
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition">
                                Procurement & Inbound POs
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                Manage vendor procurement vouchers, track inbound shipments, and receive goods into warehouse stock.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition">
                            <span>Manage Purchase Orders &rarr;</span>
                        </div>
                    </Link>

                    {/* Shortcut 4: Sales Orders */}
                    <Link
                        to="/sales-orders"
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-violet-400 transition-all duration-200 flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition">
                                <ShoppingCart className="h-6 w-6" />
                            </div>
                            <div className="flex items-center gap-2">
                                {pendingSOs.length > 0 && (
                                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-800 border border-violet-200">
                                        {pendingSOs.length} Ready
                                    </span>
                                )}
                                <span className="font-mono text-[11px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 group-hover:bg-violet-50 group-hover:text-violet-700 group-hover:border-violet-200 transition">
                                    Press G S
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-sm font-black text-slate-900 group-hover:text-violet-600 transition">
                                Sales Orders & Outbound Dispatch
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                Process customer orders, inspect stock availability, and dispatch outbound packing slips.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-bold text-violet-600 group-hover:translate-x-1 transition">
                            <span>Manage Sales Orders &rarr;</span>
                        </div>
                    </Link>

                    {/* Shortcut 5: Stock Movements & Transfers */}
                    <Link
                        to="/stock-movements"
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-cyan-400 transition-all duration-200 flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition">
                                <ArrowLeftRight className="h-6 w-6" />
                            </div>
                            <span className="font-mono text-[11px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 group-hover:bg-cyan-50 group-hover:text-cyan-700 group-hover:border-cyan-200 transition">
                                Press G M
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-sm font-black text-slate-900 group-hover:text-cyan-600 transition">
                                Stock Movements & Transfers
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                Execute inter-warehouse transfers, log manual stock adjustments, and inspect immutable movement ledger.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-bold text-cyan-600 group-hover:translate-x-1 transition">
                            <span>Execute Movements &rarr;</span>
                        </div>
                    </Link>

                    {/* Shortcut 6: Audit Trail */}
                    <Link
                        to="/audit-logs"
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-indigo-400 transition-all duration-200 flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-indigo-900 text-white shadow-md shadow-indigo-950/20 group-hover:scale-105 transition">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <span className="font-mono text-[11px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200 transition">
                                Press G A
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition">
                                Governance Audit Trail
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                Inspect full chronological audit records: actor identity, timestamps, state diffs, and compliance logs.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition">
                            <span>Inspect Audit Trail &rarr;</span>
                        </div>
                    </Link>
                </div>
            </div>

            {/* SECTION 2: EXECUTIVE KPI METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Warehouses Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-blue-200">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Warehouses
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Warehouse className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                            {loading ? '-' : warehouses.length}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            {activeWarehouses.length} Active
                        </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span>Fulfillment sites</span>
                        <Link to="/warehouses" className="font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                            <span>Manage</span>
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>

                {/* Catalog Products */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-emerald-200">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Catalog SKUs
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Package className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                            {loading ? '-' : products.length}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            {activeProducts.length} Active
                        </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span>Tracked products</span>
                        <Link to="/products" className="font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1">
                            <span>Catalog</span>
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>

                {/* Stockout & Reorder Alert */}
                <div className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
                    replenishmentSuggestions.length > 0
                        ? 'border-rose-300 dark:border-rose-500/40 bg-gradient-to-br from-white to-rose-50/40 dark:from-slate-900 dark:to-rose-950/40 ring-2 ring-rose-500/10'
                        : 'border-slate-200 bg-white'
                }`}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Reorder Alerts
                        </span>
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            replenishmentSuggestions.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className={`text-3xl font-black tracking-tight font-mono ${
                            replenishmentSuggestions.length > 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}>
                            {loadingReplenishment ? '-' : replenishmentSuggestions.length}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            replenishmentSuggestions.length > 0
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                            {replenishmentSuggestions.length > 0 ? 'Action Needed' : 'Optimal'}
                        </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span className="truncate max-w-[100px]">{currentWarehouse ? currentWarehouse.name : 'Facility'}</span>
                        <Link to="/replenishment" className="font-bold text-rose-600 hover:text-rose-800 inline-flex items-center gap-1">
                            <span>Reorder</span>
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>

                {/* Inbound PO Spend */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-indigo-200">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Inbound POs
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Clock className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                            {loading ? '-' : pendingPOs.length}
                        </span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                            Awaiting
                        </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span className="font-mono font-bold text-slate-700">{formatMoneyK(totalPOSpend)}</span>
                        <Link to="/purchase-orders" className="font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                            <span>Orders</span>
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>

                {/* Outbound SO Revenue */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-purple-200">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Outbound SOs
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                            {loading ? '-' : pendingSOs.length}
                        </span>
                        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                            To Fulfill
                        </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span className="font-mono font-bold text-slate-700">{formatMoneyK(totalSORep)}</span>
                        <Link to="/sales-orders" className="font-bold text-purple-600 hover:text-purple-800 inline-flex items-center gap-1">
                            <span>Dispatch</span>
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* SECTION 3: URGENT REORDER ATTENTION SPOTLIGHT */}
            {replenishmentSuggestions.length > 0 && (
                <div className="rounded-3xl border border-amber-200 dark:border-amber-500/40 bg-gradient-to-r from-amber-50/50 via-white to-orange-50/40 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/30 p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-200/60 dark:border-amber-500/30 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">
                                    Urgent Stock Replenishment Required — {currentWarehouse?.name}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    The following items are at zero or have fallen below the configured safety threshold.
                                </p>
                            </div>
                        </div>
                        <Link
                            to="/replenishment"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                        >
                            <span>Open Replenishment Queue ({replenishmentSuggestions.length})</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        {replenishmentSuggestions.slice(0, 3).map((item) => (
                            <div
                                key={item.productId}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-md transition space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="font-mono text-xs font-black text-slate-900 block truncate">
                                            {item.productSku}
                                        </span>
                                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1" title={item.productName}>
                                            {item.productName}
                                        </h4>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase shrink-0 ${
                                        item.isCriticallyLow ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {item.isCriticallyLow ? 'Stockout' : 'Low Stock'}
                                    </span>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 flex items-center justify-between text-xs">
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase">What I Have</span>
                                        <span className={`font-mono text-lg font-black ${item.currentStock <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                            {item.currentStock}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Threshold</span>
                                        <span className="font-mono text-base font-black text-amber-700">
                                            {item.reorderPoint}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs pt-1">
                                    <span className="text-[11px] text-slate-500 font-semibold truncate max-w-[130px]" title={item.preferredSupplierName}>
                                        {item.preferredSupplierName || 'Preferred Supplier N/A'}
                                    </span>
                                    <Link
                                        to="/replenishment"
                                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                    >
                                        <span>Order {item.suggestedQuantity} &rarr;</span>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION 4: ACTIVE OPERATIONS DUAL COLUMN (PURCHASES & SALES) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inbound Purchase Orders Track */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                                <Truck className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Inbound Procurement Track</h3>
                                <p className="text-[11px] text-slate-400">Active purchase orders awaiting warehouse dock receipt</p>
                            </div>
                        </div>
                        <Link to="/purchase-orders" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                            All Orders ({purchaseOrders.length}) &rarr;
                        </Link>
                    </div>

                    <div className="divide-y divide-slate-100 flex-1">
                        {pendingPOs.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                {loading ? 'Loading procurement...' : 'No purchase orders awaiting delivery.'}
                            </div>
                        ) : (
                            pendingPOs.slice(0, 4).map((po) => (
                                <Link
                                    key={po.id}
                                    to="/purchase-orders"
                                    className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/80 transition group"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-blue-600 group-hover:text-blue-700">
                                                {po.purchaseOrderNumber}
                                            </span>
                                            <span className="text-xs font-bold text-slate-800">
                                                {po.supplierName}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            To: {po.warehouseName} • Expected: {formatDateOnly(po.expectedDeliveryDate) || 'Standard'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <span className="font-mono text-xs font-bold text-slate-900 block" title={formatCurrency(po.totalAmount)}>
                                                {formatMoneyK(po.totalAmount)}
                                            </span>
                                            <span className="text-[10px] text-emerald-600 font-semibold">
                                                {po.status === 'PartiallyReceived' ? 'Partial Receipt' : 'In Transit'}
                                            </span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Outbound Sales Orders Track */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                                <ShoppingCart className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Commercial Outbound Track</h3>
                                <p className="text-[11px] text-slate-400">Confirmed orders ready for warehouse picking & packing</p>
                            </div>
                        </div>
                        <Link to="/sales-orders" className="text-xs font-bold text-violet-600 hover:text-violet-800">
                            All Orders ({salesOrders.length}) &rarr;
                        </Link>
                    </div>

                    <div className="divide-y divide-slate-100 flex-1">
                        {pendingSOs.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                {loading ? 'Loading sales orders...' : 'No orders awaiting warehouse fulfillment.'}
                            </div>
                        ) : (
                            pendingSOs.slice(0, 4).map((so) => (
                                <Link
                                    key={so.id}
                                    to="/sales-orders"
                                    className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/80 transition group"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-violet-600 group-hover:text-violet-700">
                                                {so.salesOrderNumber}
                                            </span>
                                            <span className="text-xs font-bold text-slate-800">
                                                {so.customerName}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            From: {so.warehouseName} • Ordered: {formatDateOnly(so.orderDate)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <span className="font-mono text-xs font-bold text-slate-900 block" title={formatCurrency(so.totalAmount)}>
                                                {formatMoneyK(so.totalAmount)}
                                            </span>
                                            <span className="text-[10px] text-amber-600 font-semibold">
                                                {so.status === 'PartiallyFulfilled' ? 'Partial Dispatch' : 'Ready to Fulfill'}
                                            </span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-600 transition" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
