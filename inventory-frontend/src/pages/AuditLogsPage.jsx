import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    History,
    RefreshCw,
    Search,
    Filter,
    ShieldCheck,
    Warehouse,
    User,
    Calendar,
    Eye,
    X,
    FileText,
    ChevronLeft,
    ChevronRight,
    ArrowRightLeft,
    PlusCircle,
    CheckCircle2,
    AlertCircle,
    Copy,
    Check,
    Boxes,
    FileSpreadsheet,
    ShoppingCart,
    SlidersHorizontal,
    Clock,
    Lock,
    ExternalLink,
    Code,
    Activity,
    Layers,
    Share2,
    LayoutGrid,
    Table as TableIcon,
    Shield,
    Tag,
    ChevronDown
} from 'lucide-react';
import warehouseService from '../services/warehouseService';
import auditLogService from '../services/auditLogService';
import { useAuth } from '../context/AuthContext';

export const AuditLogsPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.roles?.some(r => r === 'Admin');
    const navigate = useNavigate();

    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [viewMode, setViewMode] = useState('cards'); // 'cards' (Default) or 'table'
    const [logs, setLogs] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [pageIndex, setPageIndex] = useState(1);
    const [pageSize] = useState(24); // 24 items divides evenly into 2, 3, and 4-column card grids
    const [loading, setLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [inspectorTab, setInspectorTab] = useState('summary'); // 'summary' or 'raw'
    const [copiedJson, setCopiedJson] = useState(false);

    // Initial warehouse load
    useEffect(() => {
        const loadWarehouses = async () => {
            try {
                const whData = await warehouseService.getAll();
                setWarehouses(whData || []);
            } catch (err) {
                console.error('Failed to load warehouses:', err);
            }
        };
        loadWarehouses();
    }, []);

    // Load audit logs
    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            let entity = entityFilter || null;
            if (categoryFilter === 'StockMovements') entity = 'StockMovement';
            else if (categoryFilter === 'StockCounts') entity = 'StockCountSession';
            else if (categoryFilter === 'Orders') entity = null;
            else if (categoryFilter === 'Settings') entity = 'WarehouseProductSetting';

            const params = {
                warehouseId: selectedWarehouseId || null,
                action: actionFilter || null,
                entityName: entity,
                fromDate: fromDate ? new Date(fromDate).toISOString() : null,
                toDate: toDate ? new Date(toDate).toISOString() : null,
                pageIndex,
                pageSize
            };

            const data = await auditLogService.getLogs(params);
            setLogs(data?.items || []);
            setTotalCount(data?.totalCount || 0);
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedWarehouseId, actionFilter, entityFilter, categoryFilter, fromDate, toDate, pageIndex, pageSize]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const totalPages = Math.ceil(totalCount / pageSize);

    // Reset all filters
    const handleResetFilters = () => {
        setSelectedWarehouseId('');
        setActionFilter('');
        setEntityFilter('');
        setCategoryFilter('All');
        setSearchQuery('');
        setFromDate('');
        setToDate('');
        setPageIndex(1);
    };

    const hasActiveFilters = Boolean(
        selectedWarehouseId || actionFilter || entityFilter || categoryFilter !== 'All' || searchQuery || fromDate || toDate
    );

    // Filter logs client-side by search query
    const filteredLogs = useMemo(() => {
        if (!searchQuery.trim()) return logs;
        const q = searchQuery.toLowerCase();
        return logs.filter(l =>
            l.action?.toLowerCase().includes(q) ||
            l.userName?.toLowerCase().includes(q) ||
            l.entityName?.toLowerCase().includes(q) ||
            l.warehouseName?.toLowerCase().includes(q)
        );
    }, [logs, searchQuery]);

    // Human-readable entity name (replaces raw DB entity names)
    const getEntityHumanName = (entityName) => {
        switch (entityName) {
            case 'StockCountSession': return 'Stock Cycle Count';
            case 'PurchaseOrder': return 'Purchase Voucher';
            case 'SalesOrder': return 'Sales Order';
            case 'StockMovement': return 'Ledger Movement';
            case 'WarehouseProductSetting': return 'Reorder Threshold';
            case 'Warehouse': return 'Warehouse Facility';
            case 'Product': return 'Catalog Product';
            case 'Supplier': return 'Vendor Profile';
            default: return entityName || 'System Record';
        }
    };

    // Extract humanized summary from JSON details
    const getChangeSummary = (log) => {
        if (!log.details) return null;
        try {
            const data = JSON.parse(log.details);
            if (data.sessionNumber) return `Session #${data.sessionNumber} — ${data.reconciledItemsCount ?? 0} items reconciled`;
            if (data.orderNumber) return `Order #${data.orderNumber}`;
            if (data.reorderPoint !== undefined) return `Trigger Point: ${data.reorderPoint} units (Max: ${data.reorderQuantity || 'Dynamic'})`;
            if (data.quantity !== undefined && data.productSku) return `${data.productSku} — ${data.quantity} units (${data.movementType || 'Movement'})`;
            if (data.reason) return `Reason: ${data.reason}`;
            if (data.notes) return data.notes;
            return null;
        } catch {
            return null;
        }
    };

    const getActionBadge = (action) => {
        if (action.includes('Approve') || action.includes('Reconcile') || action.includes('Receive')) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> {action}
                </span>
            );
        }
        if (action.includes('Reject') || action.includes('Cancel') || action.includes('Delete')) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <AlertCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" /> {action}
                </span>
            );
        }
        if (action.includes('Transfer')) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 text-xs font-bold text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <ArrowRightLeft className="h-3 w-3 text-purple-600 dark:text-purple-400" /> {action}
                </span>
            );
        }
        if (action.includes('StockCount')) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <Boxes className="h-3 w-3 text-blue-600 dark:text-blue-400" /> {action}
                </span>
            );
        }
        if (action.includes('PurchaseOrder') || action.includes('PO')) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <PlusCircle className="h-3 w-3 text-indigo-600 dark:text-indigo-400" /> {action}
                </span>
            );
        }
        if (action.includes('Create') || action.includes('Record')) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <PlusCircle className="h-3 w-3 text-blue-600 dark:text-blue-400" /> {action}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {action}
            </span>
        );
    };

    const copyJsonPayload = (jsonText) => {
        navigator.clipboard.writeText(jsonText);
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
    };

    // Parse JSON details safely into key-value pairs
    const parsedPayload = useMemo(() => {
        if (!selectedLog?.details) return null;
        try {
            return JSON.parse(selectedLog.details);
        } catch {
            return null;
        }
    }, [selectedLog]);

    // Handle jump to related entity
    const handleJumpToEntity = () => {
        if (!selectedLog) return;
        const name = selectedLog.entityName;
        if (name === 'StockCountSession') {
            navigate('/stock-counts');
        } else if (name === 'PurchaseOrder') {
            navigate('/purchase-orders');
        } else if (name === 'SalesOrder') {
            navigate('/sales-orders');
        } else if (name === 'StockMovement') {
            navigate('/stock-movements');
        } else if (name === 'WarehouseProductSetting') {
            navigate('/replenishment');
        }
        setSelectedLog(null);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                        <History className="h-7 w-7 text-teal-600 dark:text-teal-400" />
                        Audit Trail & Compliance Log
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Immutable historical record of business activities, cycle counts, threshold updates, and authorizations.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher Toggle */}
                    <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setViewMode('cards')}
                            title="Activity Cards View"
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                viewMode === 'cards'
                                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>Cards</span>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            title="Streamlined Table View"
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <TableIcon className="h-3.5 w-3.5" />
                            <span>Table</span>
                        </button>
                    </div>

                    <button
                        onClick={loadLogs}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 transition cursor-pointer"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-teal-600' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span>Refresh Log</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Audit Events</span>
                        <History className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">{totalCount}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">total entries</span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Tamper-evident activity logs</p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ledger Protection</span>
                        <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">Append-Only</span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Immutable historical records</p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Facility Scope</span>
                        <Warehouse className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                            {selectedWarehouseId ? (warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Filtered Facility') : 'All Facilities'}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Role-based scoping active</p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active View</span>
                        <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">{filteredLogs.length}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">records shown</span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Page {pageIndex} of {totalPages || 1}</p>
                </div>
            </div>

            {/* Responsive Filter Toolbar (No Horizontal Overflow) */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                            <Filter className="h-3.5 w-3.5" /> Scope:
                        </span>
                        {[
                            { key: 'All', label: 'All Activities' },
                            { key: 'StockMovements', label: 'Movements & Transfers' },
                            { key: 'StockCounts', label: 'Count Reconciliations' },
                            { key: 'Settings', label: 'Threshold Settings' }
                        ].map((cat) => (
                            <button
                                key={cat.key}
                                onClick={() => { setCategoryFilter(cat.key); setPageIndex(1); }}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                    categoryFilter === cat.key
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 transition cursor-pointer self-start sm:self-auto"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span>Reset Filters</span>
                        </button>
                    )}
                </div>

                {/* Filter Controls Grid */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Facility Context</label>
                        <select
                            value={selectedWarehouseId}
                            onChange={(e) => { setSelectedWarehouseId(e.target.value); setPageIndex(1); }}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-800 dark:text-slate-200 font-bold focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                        >
                            <option value="">All Permitted Facilities</option>
                            {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name} ({w.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Search Keyword</label>
                        <div className="relative">
                            <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search actor, activity, or entity..."
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Action Type</label>
                        <input
                            type="text"
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPageIndex(1); }}
                            placeholder="e.g. Approve, Create, Reconcile..."
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => { setFromDate(e.target.value); setPageIndex(1); }}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-teal-500 focus:outline-none cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => { setToDate(e.target.value); setPageIndex(1); }}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-teal-500 focus:outline-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {loading ? (
                <div className="py-20 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <RefreshCw className="mx-auto h-8 w-8 animate-spin text-teal-600 dark:text-teal-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Retrieving audit activity logs...</p>
                    <p className="text-xs text-slate-400 mt-1">Verifying append-only ledger integrity</p>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 mb-3 border border-teal-200 dark:border-teal-800">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Audit Records Found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                        {hasActiveFilters
                            ? 'No audit log records match the applied filters or search criteria.'
                            : 'No historical audit events are currently recorded in the system.'}
                    </p>
                    {hasActiveFilters && (
                        <div className="mt-4">
                            <button
                                onClick={handleResetFilters}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5 text-slate-400" />
                                <span>Clear Filter Criteria</span>
                            </button>
                        </div>
                    )}
                </div>
            ) : viewMode === 'cards' ? (
                /* 1. ACTIVITY CARDS VIEW (DEFAULT — Responsive, No Horizontal Scroll) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                    {filteredLogs.map((log) => {
                        const summaryText = getChangeSummary(log);
                        const actorInitial = (log.userName || 'O').charAt(0).toUpperCase();

                        return (
                            <div
                                key={log.id}
                                onClick={() => setSelectedLog(log)}
                                className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:border-teal-300 dark:hover:border-teal-700"
                            >
                                <div>
                                    {/* Card Header: Action Badge & Time */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="min-w-0">
                                            {getActionBadge(log.action)}
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actor Profile */}
                                    <div className="flex items-center gap-2.5 pt-1 mb-3.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                                            {actorInitial}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                                                    {log.userName || 'Authorized Operator'}
                                                </span>
                                                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
                                                    {log.userRole || 'Operator'}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                                                {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Context Chips: Entity & Facility */}
                                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 text-[11px] font-semibold text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80">
                                            <Tag className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                                            <span>{getEntityHumanName(log.entityName)}</span>
                                        </span>

                                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                            <Warehouse className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                            <span className="truncate max-w-[150px]">
                                                {log.warehouseName || 'Global System'}
                                            </span>
                                        </span>
                                    </div>

                                    {/* Summary / Notes Box */}
                                    {summaryText && (
                                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 line-clamp-2">
                                            {summaryText}
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer: Verification Seal & Inspect Trigger */}
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Verified Audit Entry</span>
                                    </span>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                                        className="inline-flex items-center gap-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 group-hover:bg-teal-600 group-hover:text-white transition cursor-pointer"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>Inspect</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* 2. COMPACT TABLE VIEW (Streamlined 4 Columns, No Horizontal Scroll) */
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <div className="w-full">
                        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-3.5">Event & Timestamp</th>
                                    <th className="px-5 py-3.5">Authorized Operator</th>
                                    <th className="px-5 py-3.5">Entity & Facility</th>
                                    <th className="px-5 py-3.5 text-right">Inspection</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredLogs.map((log) => (
                                    <tr
                                        key={log.id}
                                        onClick={() => setSelectedLog(log)}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                    >
                                        {/* Event & Timestamp */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getActionBadge(log.action)}
                                            </div>
                                            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block">
                                                {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                                            </span>
                                        </td>

                                        {/* Operator */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                                                    {(log.userName || 'O').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                                                        {log.userName || 'Authorized Operator'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                        {log.userRole || 'Staff'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Entity & Facility */}
                                        <td className="px-5 py-3.5">
                                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                                {getEntityHumanName(log.entityName)}
                                            </span>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Warehouse className="h-3 w-3 text-slate-400" />
                                                <span>{log.warehouseName || 'Global System'}</span>
                                            </span>
                                        </td>

                                        {/* Inspect Action */}
                                        <td className="px-5 py-3.5 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                                                className="inline-flex items-center gap-1 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 group-hover:bg-teal-600 group-hover:text-white transition cursor-pointer shadow-2xs"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                <span>Inspect</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && filteredLogs.length > 0 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400 shadow-2xs">
                    <span>
                        Showing <strong className="text-slate-800 dark:text-slate-200">{filteredLogs.length}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalCount}</strong> total audit events
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPageIndex(p => Math.max(1, p - 1))}
                            disabled={pageIndex <= 1}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono px-2">
                            Page {pageIndex} of {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setPageIndex(p => p + 1)}
                            disabled={pageIndex >= totalPages}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* DETAILS INSPECTOR DRAWER / MODAL */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
                                    <History className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">{selectedLog.action}</h3>
                                    </div>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Entity Target: <strong className="text-slate-800 dark:text-slate-200">{getEntityHumanName(selectedLog.entityName)}</strong>
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Meta Grid */}
                            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                                <div>
                                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Authorized Actor</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                        {selectedLog.userName || 'Authorized Operator'}
                                    </span>
                                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{selectedLog.userRole || 'Operator'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Facility Context</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{selectedLog.warehouseName || 'Global / System'}</span>
                                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Active Warehouse Scope</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Timestamp (UTC)</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(selectedLog.createdAt).toUTCString()}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Client IP Address</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.ipAddress || '127.0.0.1'}</span>
                                </div>
                            </div>

                            {/* View Switcher Tabs */}
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setInspectorTab('summary')}
                                        className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold border-b-2 cursor-pointer transition ${
                                            inspectorTab === 'summary'
                                                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        <Activity className="h-3.5 w-3.5" />
                                        <span>Change Summary</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setInspectorTab('raw')}
                                        className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold border-b-2 cursor-pointer transition ${
                                            inspectorTab === 'raw'
                                                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        <Code className="h-3.5 w-3.5" />
                                        <span>Raw Audit Payload</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => copyJsonPayload(selectedLog.details || '{}')}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:text-teal-900 cursor-pointer"
                                >
                                    {copiedJson ? (
                                        <>
                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            <span className="text-emerald-600">Copied Payload!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5" />
                                            <span>Copy JSON</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* TAB 1: Structured Change Summary */}
                            {inspectorTab === 'summary' ? (
                                <div className="space-y-3">
                                    {parsedPayload && typeof parsedPayload === 'object' ? (
                                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                                            {Object.entries(parsedPayload)
                                                .filter(([key]) => !key.toLowerCase().includes('id') || key === 'sessionNumber' || key === 'orderNumber')
                                                .map(([key, value]) => (
                                                    <div key={key} className="flex items-center justify-between p-3 text-xs">
                                                        <span className="font-bold text-slate-600 dark:text-slate-400 capitalize">
                                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                                        </span>
                                                        <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 font-mono">
                                            {selectedLog.details || 'No additional change details recorded.'}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* TAB 2: Raw Code JSON */
                                <div>
                                    <pre className="max-h-64 overflow-y-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs text-teal-300 leading-relaxed border border-slate-800 shadow-inner">
                                        {(() => {
                                            try {
                                                const parsed = JSON.parse(selectedLog.details);
                                                return JSON.stringify(parsed, null, 2);
                                            } catch {
                                                return selectedLog.details;
                                            }
                                        })()}
                                    </pre>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={handleJumpToEntity}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                                >
                                    <ExternalLink className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                    <span>Navigate to {getEntityHumanName(selectedLog.entityName)}</span>
                                </button>

                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="rounded-xl bg-slate-900 dark:bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-800 dark:border-slate-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogsPage;
