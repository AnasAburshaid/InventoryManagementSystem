import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    TrendingDown,
    Plus,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Warehouse,
    Package,
    ShoppingCart,
    ShoppingBag,
    Settings,
    ShieldCheck,
    Truck,
    ArrowRight,
    X,
    Filter,
    DollarSign,
    Layers,
    AlertTriangle,
    Search,
    ChevronRight,
    Boxes,
    ArrowUpRight,
    ArrowDownRight,
    SlidersHorizontal,
    Info,
    Sparkles,
    Calculator,
    Zap,
    Clock,
    Tag,
    LayoutGrid,
    List,
    ChevronDown,
    ExternalLink
} from 'lucide-react';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import replenishmentService from '../services/replenishmentService';
import supplierService from '../services/supplierService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatUtils';

export const ReplenishmentPage = () => {
    const { user } = useAuth();
    const isSupervisorOrManager = user?.roles?.some(r => ['Admin', 'Manager', 'Supervisor'].includes(r));

    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [activeTab, setActiveTab] = useState('suggestions');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' (visual) or 'table' (streamlined)
    const [suggestions, setSuggestions] = useState([]);
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);

    // Filters
    const [onlyBelowReorder, setOnlyBelowReorder] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCards, setExpandedCards] = useState({});

    // Convert to PO Modal
    const [showPoModal, setShowPoModal] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [poQuantity, setPoQuantity] = useState(1);
    const [poSupplierId, setPoSupplierId] = useState('');
    const [poUnitPrice, setPoUnitPrice] = useState(0);
    const [poNotes, setPoNotes] = useState('');
    const [poPriority, setPoPriority] = useState('Standard');
    const [submittingPo, setSubmittingPo] = useState(false);

    // Configure Setting Modal
    const [showSettingModal, setShowSettingModal] = useState(false);
    const [editProductId, setEditProductId] = useState('');
    const [reorderPoint, setReorderPoint] = useState(10);
    const [targetStockLevel, setTargetStockLevel] = useState(50);
    const [minOrderQuantity, setMinOrderQuantity] = useState(5);
    const [settingIsActive, setSettingIsActive] = useState(true);
    const [submittingSetting, setSubmittingSetting] = useState(false);

    const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    // Listen for custom event from Command Palette
    useEffect(() => {
        const handleOpenThreshold = () => openSettingModal(null);
        window.addEventListener('open-configure-threshold', handleOpenThreshold);
        return () => window.removeEventListener('open-configure-threshold', handleOpenThreshold);
    }, [products]);

    // Load Initial Data
    useEffect(() => {
        const loadInitial = async () => {
            try {
                const whData = await warehouseService.getAll();
                setWarehouses(whData || []);
                if (whData && whData.length > 0) {
                    setSelectedWarehouseId(whData[0].id);
                }

                const prodData = await productService.getAll();
                setProducts(prodData || []);

                const supData = await supplierService.getAll();
                setSuppliers(supData || []);
            } catch (err) {
                console.error('Failed to load initial replenishment data:', err);
                showAlert('Failed to load warehouses or reference data.', 'error');
            }
        };
        loadInitial();
    }, []);

    const showAlert = (message, type = 'success') => {
        setAlertMessage({ message, type });
        setTimeout(() => setAlertMessage(null), 5000);
    };

    // Load Data based on active tab
    const loadTabData = useCallback(async () => {
        if (!selectedWarehouseId) return;
        setLoading(true);
        try {
            if (activeTab === 'suggestions') {
                const data = await replenishmentService.getSuggestions(selectedWarehouseId, onlyBelowReorder);
                setSuggestions(data || []);
            } else {
                const data = await replenishmentService.getSettings(selectedWarehouseId);
                setSettings(data || []);
            }
        } catch (err) {
            console.error('Failed to load tab data:', err);
            const errMsg = err.response?.data?.message || err.message || 'Could not load replenishment data for this facility.';
            showAlert(errMsg, 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedWarehouseId, activeTab, onlyBelowReorder]);

    useEffect(() => {
        loadTabData();
    }, [loadTabData]);

    // Open Convert to PO Modal
    const openPoModal = (suggestion) => {
        setSelectedSuggestion(suggestion);
        setPoQuantity(suggestion.suggestedQuantity > 0 ? suggestion.suggestedQuantity : 1);
        setPoSupplierId(suggestion.preferredSupplierId || (suppliers[0]?.id || ''));
        setPoUnitPrice(suggestion.preferredSupplierUnitPrice || 0);
        setPoPriority(suggestion.isCriticallyLow ? 'Critical' : 'Standard');
        setPoNotes(`Automated replenishment requisition for SKU ${suggestion.productSku}`);
        setShowPoModal(true);
    };

    // Submit Convert to PO
    const handleConvertPo = async (e) => {
        e.preventDefault();
        if (!selectedSuggestion || !selectedWarehouseId) return;

        setSubmittingPo(true);
        try {
            const priorityPrefix = poPriority === 'Critical' ? '[URGENT - CRITICAL STOCKOUT] ' : '';
            const payload = {
                warehouseId: selectedWarehouseId,
                productId: selectedSuggestion.productId,
                quantity: parseFloat(poQuantity),
                supplierId: poSupplierId || null,
                unitPrice: parseFloat(poUnitPrice),
                notes: `${priorityPrefix}${poNotes}`.trim()
            };

            const po = await replenishmentService.convertToPo(selectedWarehouseId, payload);
            setShowPoModal(false);
            showAlert(`Draft Purchase Order ${po.purchaseOrderNumber} created successfully!`, 'success');
            loadTabData();
        } catch (err) {
            console.error('Failed to convert to PO:', err);
            showAlert(err.response?.data?.message || 'Failed to generate Purchase Order.', 'error');
        } finally {
            setSubmittingPo(false);
        }
    };

    // Open Configure Setting Modal
    const openSettingModal = (existing = null) => {
        if (existing) {
            setEditProductId(existing.productId);
            setReorderPoint(existing.reorderPoint);
            setTargetStockLevel(existing.targetStockLevel);
            setMinOrderQuantity(existing.minOrderQuantity);
            setSettingIsActive(existing.isActive);
        } else {
            setEditProductId(products[0]?.id || '');
            setReorderPoint(10);
            setTargetStockLevel(50);
            setMinOrderQuantity(5);
            setSettingIsActive(true);
        }
        setShowSettingModal(true);
    };

    // Submit Setting Upsert
    const handleSaveSetting = async (e) => {
        e.preventDefault();
        if (!selectedWarehouseId || !editProductId) return;

        setSubmittingSetting(true);
        try {
            const payload = {
                warehouseId: selectedWarehouseId,
                productId: editProductId,
                reorderPoint: parseFloat(reorderPoint),
                targetStockLevel: parseFloat(targetStockLevel),
                minOrderQuantity: parseFloat(minOrderQuantity),
                isActive: settingIsActive
            };

            await replenishmentService.upsertSetting(selectedWarehouseId, payload);
            setShowSettingModal(false);
            showAlert('Reorder point configuration saved successfully!', 'success');
            loadTabData();
        } catch (err) {
            console.error('Failed to save setting:', err);
            showAlert(err.response?.data?.message || 'Failed to save configuration.', 'error');
        } finally {
            setSubmittingSetting(false);
        }
    };

    const toggleCardExpand = (productId) => {
        setExpandedCards(prev => ({ ...prev, [productId]: !prev[productId] }));
    };

    // Filtered data based on search
    const filteredSuggestions = useMemo(() => {
        if (!searchQuery.trim()) return suggestions;
        const q = searchQuery.toLowerCase();
        return suggestions.filter(s =>
            s.productName?.toLowerCase().includes(q) ||
            s.productSku?.toLowerCase().includes(q) ||
            s.preferredSupplierName?.toLowerCase().includes(q)
        );
    }, [suggestions, searchQuery]);

    const filteredSettings = useMemo(() => {
        if (!searchQuery.trim()) return settings;
        const q = searchQuery.toLowerCase();
        return settings.filter(s =>
            s.productName?.toLowerCase().includes(q) ||
            s.productSku?.toLowerCase().includes(q)
        );
    }, [settings, searchQuery]);

    // KPI Metrics
    const criticalCount = suggestions.filter(s => s.isCriticallyLow).length;
    const totalPipelineUnits = suggestions.reduce((acc, s) => acc + (s.onOrderStock || 0), 0);
    const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <TrendingDown className="h-7 w-7 text-indigo-600" />
                        Reorder Points & Replenishment
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Monitor stock thresholds, spot low-inventory risks instantly, and trigger vendor draft purchase orders.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={loadTabData}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                        <span>Refresh</span>
                    </button>

                    {isSupervisorOrManager && (
                        <button
                            onClick={() => openSettingModal(null)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:bg-indigo-800 transition cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Configure Threshold</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Alert Banner */}
            {alertMessage && (
                <div
                    className={`flex items-center justify-between gap-2 rounded-2xl p-4 text-sm font-medium shadow-sm transition ${
                        alertMessage.type === 'error'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {alertMessage.type === 'error' ? (
                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        )}
                        <span>{alertMessage.message}</span>
                    </div>
                    <button
                        onClick={() => setAlertMessage(null)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Facility Context & KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Facility Selector Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Facility</span>
                        <Warehouse className="h-4 w-4 text-indigo-600" />
                    </div>
                    <select
                        value={selectedWarehouseId}
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-bold text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                        {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name} ({w.code})
                            </option>
                        ))}
                    </select>
                    {selectedWarehouse && (
                        <p className="text-[11px] text-slate-400 mt-2 truncate font-medium">
                            {selectedWarehouse.address || 'Facility active & operational'}
                        </p>
                    )}
                </div>

                {/* Suggestions Metric */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Replenishment Needed</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${suggestions.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {suggestions.length > 0 ? 'Action Required' : 'Optimal'}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black text-slate-900 font-mono tabular-nums">{suggestions.length}</span>
                        <span className="text-xs text-slate-500 font-medium">items below threshold</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Items requiring purchase reorders</p>
                </div>

                {/* Critical Stockouts Metric */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stockout Urgent</span>
                        <AlertTriangle className={`h-4 w-4 ${criticalCount > 0 ? 'text-rose-600 animate-bounce' : 'text-slate-300'}`} />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className={`text-3xl font-black font-mono tabular-nums ${criticalCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {criticalCount}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">empty stock</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">0 effective units remaining</p>
                </div>

                {/* Configured Thresholds Metric */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monitored Items</span>
                        <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black text-slate-900 font-mono tabular-nums">{settings.length}</span>
                        <span className="text-xs text-slate-500 font-medium">active thresholds</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Inbound on-order: <strong className="font-mono text-slate-700">{totalPipelineUnits}</strong> units</p>
                </div>
            </div>

            {/* Navigation Tabs Bar & View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 gap-3 pb-2 sm:pb-0">
                <div className="flex gap-2">
                    <button
                        onClick={() => { setActiveTab('suggestions'); setSearchQuery(''); }}
                        className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                            activeTab === 'suggestions'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <ShoppingBag className="h-4 w-4" />
                        <span>Replenishment Queue</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-black ${activeTab === 'suggestions' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {suggestions.length}
                        </span>
                    </button>

                    <button
                        onClick={() => { setActiveTab('settings'); setSearchQuery(''); }}
                        className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                            activeTab === 'settings'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Settings className="h-4 w-4" />
                        <span>Threshold Settings</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-black ${activeTab === 'settings' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {settings.length}
                        </span>
                    </button>
                </div>

                {/* View Mode Toggle & Search */}
                <div className="flex items-center gap-3">
                    {activeTab === 'suggestions' && (
                        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                            <button
                                onClick={() => setViewMode('cards')}
                                title="Visual Product Cards"
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    viewMode === 'cards'
                                        ? 'bg-white text-indigo-700 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                <span>Visual Cards</span>
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                title="Streamlined Table"
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    viewMode === 'table'
                                        ? 'bg-white text-indigo-700 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <List className="h-3.5 w-3.5" />
                                <span>Table</span>
                            </button>
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter product or SKU..."
                            className="rounded-xl border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-44 sm:w-56"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* TAB 1: Replenishment Queue */}
            {activeTab === 'suggestions' && (
                <div className="space-y-4">
                    {/* Filter bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                        <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={onlyBelowReorder}
                                onChange={(e) => setOnlyBelowReorder(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>Strictly below threshold point</span>
                        </label>
                        <span className="text-slate-400">
                            Showing {filteredSuggestions.length} items needing attention
                        </span>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-slate-400 shadow-sm">
                            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-500 mb-3" />
                            <p className="text-sm font-bold text-slate-700">Evaluating inventory levels...</p>
                        </div>
                    ) : filteredSuggestions.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 shadow-inner">
                                <CheckCircle2 className="h-9 w-9" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">All Stock Levels Optimal</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                                {searchQuery
                                    ? 'No items match your filter criteria.'
                                    : 'All products in this warehouse exceed their reorder thresholds. No replenishment orders are needed right now.'}
                            </p>
                            {isSupervisorOrManager && (
                                <div className="mt-5">
                                    <button
                                        onClick={() => setActiveTab('settings')}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                                    >
                                        <Settings className="h-3.5 w-3.5 text-slate-500" />
                                        <span>Review & Add Thresholds</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : viewMode === 'cards' ? (
                        /* ================= VISUAL PRODUCT CARDS GRID ================= */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredSuggestions.map((s) => {
                                const target = s.targetStockLevel > 0 ? s.targetStockLevel : 100;
                                const currentPct = Math.min(100, Math.max(0, (s.currentStock / target) * 100));
                                const thresholdPct = Math.min(100, Math.max(0, (s.reorderPoint / target) * 100));
                                const isExpanded = expandedCards[s.productId];

                                return (
                                    <div
                                        key={s.productId}
                                        className={`rounded-3xl border bg-white shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                                            s.isCriticallyLow
                                                ? 'border-rose-200 ring-2 ring-rose-500/10'
                                                : 'border-slate-200/90'
                                        }`}
                                    >
                                        {/* Card Top Section */}
                                        <div className="p-5 space-y-4">
                                            {/* Header: Product & Badge */}
                                            {(() => {
                                                const prod = productMap.get(s.productId);
                                                return (
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 font-black text-sm shadow-sm ${
                                                                s.isCriticallyLow
                                                                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                                            }`}>
                                                                {s.isCriticallyLow ? (
                                                                    <AlertTriangle className="h-6 w-6" />
                                                                ) : (
                                                                    <Package className="h-6 w-6" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-mono text-xs font-black text-slate-900 block truncate">
                                                                        {s.productSku}
                                                                    </span>
                                                                    {prod?.categoryName && (
                                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold border border-slate-200">
                                                                            {prod.categoryName}
                                                                        </span>
                                                                    )}
                                                                    {prod?.brandName && (
                                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                                            • {prod.brandName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h3 className="text-sm font-bold text-slate-800 line-clamp-1 mt-0.5" title={s.productName}>
                                                                    {s.productName}
                                                                </h3>
                                                            </div>
                                                        </div>

                                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase shrink-0 ${
                                                            s.isCriticallyLow
                                                                ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                                                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        }`}>
                                                            {s.isCriticallyLow ? 'Stockout (0)' : 'Below Min'}
                                                        </span>
                                                    </div>
                                                );
                                            })()}

                                            {/* What I Have vs What is the Threshold */}
                                            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                                                <div className="flex items-baseline justify-between">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">What I Have</span>
                                                        <div className="flex items-baseline gap-1 mt-0.5">
                                                            <span className={`font-mono text-2xl font-black ${s.currentStock <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                                                {s.currentStock}
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-semibold">{s.unitOfMeasureName || 'Units'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-wider">Trigger Threshold</span>
                                                        <div className="flex items-baseline justify-end gap-1 mt-0.5">
                                                            <span className="font-mono text-xl font-black text-amber-700 dark:text-amber-400">
                                                                {s.reorderPoint}
                                                            </span>
                                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{s.unitOfMeasureName || 'Units'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Visual Gauge Bar */}
                                                <div className="space-y-1 pt-1">
                                                    <div className="relative h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${s.currentStock <= 0 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'} transition-all duration-300`}
                                                            style={{ width: `${currentPct}%` }}
                                                        ></div>
                                                        {/* Marker for Reorder Threshold */}
                                                        <div
                                                            className="absolute top-0 bottom-0 w-1 bg-slate-900 dark:bg-white z-10 shadow-xs"
                                                            style={{ left: `${thresholdPct}%` }}
                                                            title={`Reorder Point: ${s.reorderPoint}`}
                                                        ></div>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-400 font-mono">
                                                        <span>0 Stockout</span>
                                                        <span className="text-amber-700 dark:text-amber-400 font-bold">▲ Min: {s.reorderPoint}</span>
                                                        <span className="text-slate-700 dark:text-slate-300 font-bold">Target: {s.targetStockLevel}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expandable Pipeline Details */}
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCardExpand(s.productId)}
                                                    className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                                                >
                                                    <span>Stock Pipeline Breakdown</span>
                                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>

                                                {isExpanded && (
                                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs animate-in fade-in duration-150">
                                                        <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/40 p-2 text-center border border-blue-100 dark:border-blue-900/60">
                                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase block">Inbound PO</span>
                                                            <span className="font-mono font-bold text-blue-900 dark:text-blue-200">+{s.onOrderStock}</span>
                                                        </div>
                                                        <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/40 p-2 text-center border border-amber-100 dark:border-amber-900/60">
                                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase block">Reserved SO</span>
                                                            <span className="font-mono font-bold text-amber-900 dark:text-amber-200">-{s.reservedStock}</span>
                                                        </div>
                                                        <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 p-2 text-center border border-indigo-100 dark:border-indigo-900/60">
                                                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase block">Effective</span>
                                                            <span className="font-mono font-black text-indigo-900 dark:text-indigo-200">{s.effectiveStock}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Footer: Suggested Action */}
                                        <div className="p-5 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Preferred Vendor</span>
                                                <p className="text-xs font-bold text-slate-800 truncate" title={s.preferredSupplierName || 'No supplier'}>
                                                    {s.preferredSupplierName || 'Not configured'}
                                                </p>
                                                {s.preferredSupplierUnitPrice && (
                                                    <span className="font-mono text-[11px] text-slate-500">
                                                        {formatCurrency(s.preferredSupplierUnitPrice)} / unit
                                                    </span>
                                                )}
                                            </div>

                                            {isSupervisorOrManager && (
                                                <button
                                                    onClick={() => openPoModal(s)}
                                                    className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 transition cursor-pointer shrink-0"
                                                >
                                                    <ShoppingCart className="h-4 w-4" />
                                                    <span>Reorder {s.suggestedQuantity}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* ================= STREAMLINED CLEAN TABLE VIEW ================= */
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase font-bold tracking-wider text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3.5">Product & SKU</th>
                                            <th className="px-4 py-3.5">Stock Status & Health Meter</th>
                                            <th className="px-4 py-3.5 text-center">On-Hand / Threshold</th>
                                            <th className="px-6 py-3.5">Preferred Vendor</th>
                                            <th className="px-6 py-3.5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredSuggestions.map((s) => (
                                            <tr key={s.productId} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold shrink-0">
                                                            <Package className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <span className="font-mono text-xs font-black text-slate-900 block">{s.productSku}</span>
                                                            <span className="text-xs text-slate-500 block truncate max-w-xs">{s.productName}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="space-y-1">
                                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-bold ${
                                                            s.isCriticallyLow ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                            {s.isCriticallyLow ? 'Stockout (0)' : 'Below Threshold'}
                                                        </span>
                                                        <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${s.currentStock <= 0 ? 'bg-rose-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${Math.min(100, (s.currentStock / (s.targetStockLevel || 100)) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4 text-center">
                                                    <span className="font-mono text-xs font-black text-slate-900">{s.currentStock}</span>
                                                    <span className="text-xs text-slate-400 font-bold mx-1">/</span>
                                                    <span className="font-mono text-xs font-bold text-amber-700">{s.reorderPoint} pt</span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-800 block text-xs">{s.preferredSupplierName || 'Not configured'}</span>
                                                    {s.preferredSupplierUnitPrice && (
                                                        <span className="text-[11px] font-mono text-slate-500">{formatCurrency(s.preferredSupplierUnitPrice)} / unit</span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-right">
                                                    {isSupervisorOrManager && (
                                                        <button
                                                            onClick={() => openPoModal(s)}
                                                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                                                        >
                                                            <ShoppingCart className="h-3.5 w-3.5" />
                                                            <span>Reorder {s.suggestedQuantity}</span>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: Threshold Settings */}
            {activeTab === 'settings' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Configure minimum inventory thresholds, target buffer levels, and minimum order batches per product for this facility.
                        </p>
                        {isSupervisorOrManager && (
                            <button
                                onClick={() => openSettingModal(null)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Product Threshold</span>
                            </button>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase font-bold tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3.5">Product & SKU</th>
                                        <th className="px-6 py-3.5">Category</th>
                                        <th className="px-6 py-3.5 text-center">Trigger Point (Min)</th>
                                        <th className="px-6 py-3.5 text-center">Target Stock (Max)</th>
                                        <th className="px-6 py-3.5 text-center">Order Batch</th>
                                        <th className="px-6 py-3.5 text-center">Status</th>
                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSettings.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="py-16 text-center text-slate-400">
                                                No thresholds configured yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSettings.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold">
                                                            <Package className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <span className="font-mono text-xs font-black text-slate-900 block">{item.productSku}</span>
                                                            <span className="text-xs text-slate-500">{item.productName}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                                                    {item.categoryName || 'Standard'}
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono text-xs font-black text-slate-900">
                                                    {item.reorderPoint}
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono text-xs font-black text-indigo-700">
                                                    {item.targetStockLevel}
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono text-xs text-slate-600">
                                                    {item.minOrderQuantity}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {item.isActive ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                                            <CheckCircle2 className="h-3 w-3" /> Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {isSupervisorOrManager && (
                                                        <button
                                                            onClick={() => openSettingModal(item)}
                                                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                                        >
                                                            <Settings className="h-3.5 w-3.5 text-slate-400" />
                                                            <span>Edit</span>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: Purchase Requisition Voucher ("Create Draft PO") */}
            {showPoModal && selectedSuggestion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Voucher Header */}
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                                    <ShoppingCart className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Procurement Requisition Voucher</h3>
                                    <p className="text-xs text-slate-500">Generate draft vendor purchase order</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPoModal(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConvertPo} className="p-6 space-y-4">
                            {/* Product & Warehouse Context Card */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-black text-indigo-700">{selectedSuggestion.productSku}</span>
                                        {selectedSuggestion.isCriticallyLow && (
                                            <span className="rounded bg-rose-100 text-rose-700 font-bold text-[9px] px-1.5 py-0.2">
                                                Stockout Urgent
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500">Warehouse: <strong>{selectedWarehouse?.name}</strong></span>
                                </div>

                                <h4 className="text-sm font-black text-slate-900">{selectedSuggestion.productName}</h4>

                                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-xs">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">On-Hand</span>
                                        <span className="font-black text-slate-800">{selectedSuggestion.currentStock}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Inbound PO</span>
                                        <span className="font-black text-blue-600">+{selectedSuggestion.onOrderStock}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Effective</span>
                                        <span className="font-black text-indigo-700">{selectedSuggestion.effectiveStock}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Stock</span>
                                        <span className="font-black text-slate-800">{selectedSuggestion.targetStockLevel}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Supplier Selector */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Target Supplier / Vendor <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={poSupplierId}
                                    onChange={(e) => setPoSupplierId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                    required
                                >
                                    <option value="">Select a supplier...</option>
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} {s.id === selectedSuggestion.preferredSupplierId ? '★ (Preferred Vendor)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Quantity Presets & Stepper */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700">Order Quantity</label>
                                    <div className="flex items-center gap-1 text-[11px]">
                                        <span className="text-slate-400">Presets:</span>
                                        <button
                                            type="button"
                                            onClick={() => setPoQuantity(selectedSuggestion.suggestedQuantity)}
                                            className="text-indigo-600 hover:underline font-bold cursor-pointer"
                                        >
                                            Suggested ({selectedSuggestion.suggestedQuantity})
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                            type="button"
                                            onClick={() => setPoQuantity(Math.max(1, selectedSuggestion.targetStockLevel - selectedSuggestion.effectiveStock))}
                                            className="text-indigo-600 hover:underline font-bold cursor-pointer"
                                        >
                                            To Target
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="any"
                                            value={poQuantity}
                                            onChange={(e) => setPoQuantity(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-sm font-black text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <div className="relative">
                                            <DollarSign className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={poUnitPrice}
                                                onChange={(e) => setPoUnitPrice(e.target.value)}
                                                placeholder="Unit Cost"
                                                className="w-full rounded-xl border border-slate-300 py-2.5 pl-8 pr-3 font-mono text-sm font-black text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Total Cost Estimate Banner */}
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calculator className="h-4 w-4 text-emerald-700" />
                                    <span className="text-xs font-bold text-emerald-900">Total Purchase Commitment</span>
                                </div>
                                <span className="text-base font-black text-emerald-800 font-mono">
                                    {formatCurrency((parseFloat(poQuantity) || 0) * (parseFloat(poUnitPrice) || 0))}
                                </span>
                            </div>

                            {/* Priority Selection */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1.5">Procurement Urgency</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPoPriority('Standard')}
                                        className={`rounded-xl border p-2 text-xs font-bold transition cursor-pointer text-left ${
                                            poPriority === 'Standard'
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        Standard Replenishment
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPoPriority('Critical')}
                                        className={`rounded-xl border p-2 text-xs font-bold transition cursor-pointer text-left ${
                                            poPriority === 'Critical'
                                                ? 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        High Priority / Critical
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Requisition Notes</label>
                                <textarea
                                    rows="2"
                                    value={poNotes}
                                    onChange={(e) => setPoNotes(e.target.value)}
                                    placeholder="Add supplier instructions, delivery expectations..."
                                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowPoModal(false)}
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingPo}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 transition cursor-pointer disabled:opacity-50"
                                >
                                    {submittingPo && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>Generate Draft Purchase Order</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: Configure Threshold Setting */}
            {showSettingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold">
                                    <SlidersHorizontal className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Configure Stock Threshold</h3>
                                    <p className="text-xs text-slate-500">Min and target inventory levels</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSettingModal(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSetting} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Target Product <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={editProductId}
                                    onChange={(e) => setEditProductId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 font-bold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                    required
                                >
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.sku})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Reorder Point (Trigger Threshold) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={reorderPoint}
                                    onChange={(e) => setReorderPoint(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-sm font-black text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    required
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    When effective stock drops at or below this number, replenishment is triggered.
                                </span>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Target Buffer Stock Level <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={targetStockLevel}
                                    onChange={(e) => setTargetStockLevel(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-sm font-black text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    required
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Optimal ceiling buffer stock to replenish up to.
                                </span>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Minimum Order Batch Size (Optional)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={minOrderQuantity}
                                    onChange={(e) => setMinOrderQuantity(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-sm font-black text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Supplier carton or pallet packaging requirement.
                                </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="settingActive"
                                    checked={settingIsActive}
                                    onChange={(e) => setSettingIsActive(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <label htmlFor="settingActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                                    Enable Active Monitoring for this Product
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowSettingModal(false)}
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingSetting}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:bg-indigo-800 transition cursor-pointer disabled:opacity-50"
                                >
                                    {submittingSetting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>Save Configuration</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReplenishmentPage;
