import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import warehouseService from '../services/warehouseService';
import analyticsService from '../services/analyticsService';
import productService from '../services/productService';
import {
    Warehouse,
    ArrowLeft,
    RefreshCw,
    Search,
    Filter,
    Calendar,
    Package,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    AlertTriangle,
    Clock,
    CheckCircle2,
    XCircle,
    Sliders,
    Layers,
    BarChart3,
    History,
    FileText,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Tag,
    X,
    LayoutGrid,
    List
} from 'lucide-react';

const DATE_PRESETS = [
    { id: 'Today', label: 'Today' },
    { id: 'Yesterday', label: 'Yesterday' },
    { id: 'Last7Days', label: 'Last 7 Days' },
    { id: 'Last30Days', label: 'Last 30 Days' },
    { id: 'CurrentMonth', label: 'Current Month' },
    { id: 'PreviousMonth', label: 'Previous Month' },
    { id: 'CurrentYear', label: 'Current Year' },
    { id: 'Last12Months', label: 'Last 12 Months' },
    { id: 'Custom', label: 'Custom Range' }
];

export const WarehouseDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [warehouse, setWarehouse] = useState(null);
    const [loadingWarehouse, setLoadingWarehouse] = useState(true);
    const [activeTab, setActiveTab] = useState('inventory'); // inventory, history, categories, analytics
    const [pageError, setPageError] = useState('');

    // Global metadata
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [expandedCategoryIds, setExpandedCategoryIds] = useState(new Set());

    // --- TAB: INVENTORY ---
    const [inventoryItems, setInventoryItems] = useState([]);
    const [inventoryTotal, setInventoryTotal] = useState(0);
    const [inventoryPage, setInventoryPage] = useState(1);
    const [inventoryPageSize, setInventoryPageSize] = useState(20);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const [invSearch, setInvSearch] = useState('');
    const [invCategory, setInvCategory] = useState('');
    const [invBrand, setInvBrand] = useState('');
    const [invStatus, setInvStatus] = useState('All');
    const [invViewMode, setInvViewMode] = useState('cards');

    // --- TAB: MOVEMENT HISTORY ---
    const [historyItems, setHistoryItems] = useState([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(20);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [histPreset, setHistPreset] = useState('Last30Days');
    const [histFromDate, setHistFromDate] = useState('');
    const [histToDate, setHistToDate] = useState('');
    const [histType, setHistType] = useState('');
    const [histSearch, setHistSearch] = useState('');

    // --- TAB: CATEGORIES ---
    const [restrictions, setRestrictions] = useState(null);
    const [canAcceptAll, setCanAcceptAll] = useState(true);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState(new Set());
    const [savingCategories, setSavingCategories] = useState(false);
    const [categorySuccess, setCategorySuccess] = useState('');
    const [categoryError, setCategoryError] = useState('');

    // --- TAB: ANALYTICS ---
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsPreset, setAnalyticsPreset] = useState('Last30Days');

    // --- PRODUCT DETAIL MODAL ---
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productMovements, setProductMovements] = useState([]);
    const [productMovementsLoading, setProductMovementsLoading] = useState(false);

    // Initial Load: Warehouse & Metadata
    useEffect(() => {
        const loadInitialData = async () => {
            setLoadingWarehouse(true);
            setPageError('');
            try {
                const [whData, cats, brs, prods] = await Promise.all([
                    warehouseService.getById(id),
                    productService.getCategories(),
                    productService.getBrands(),
                    productService.getAll().catch(() => [])
                ]);
                setWarehouse(whData);
                setCanAcceptAll(whData.canAcceptAllCategories);
                setCategories(cats || []);
                setBrands(brs || []);
                setAllProducts(prods || []);
            } catch (err) {
                console.error('Error loading warehouse data:', err);
                setPageError('Failed to load warehouse facility.');
            } finally {
                setLoadingWarehouse(false);
            }
        };

        if (id) {
            loadInitialData();
        }
    }, [id]);

    // Map each Category to the Brands that have active products in that Category
    const categoryBrandsMap = useMemo(() => {
        const map = {};
        categories.forEach((c) => {
            map[c.id] = brands.filter((b) =>
                allProducts.some((p) => p.categoryId === c.id && p.brandId === b.id)
            );
        });
        return map;
    }, [categories, brands, allProducts]);

    // Load Inventory Tab
    const fetchInventory = useCallback(async () => {
        if (!id) return;
        setInventoryLoading(true);
        try {
            const result = await analyticsService.getWarehouseInventory(id, {
                pageIndex: inventoryPage,
                pageSize: inventoryPageSize,
                searchTerm: invSearch || undefined,
                categoryId: invCategory || undefined,
                brandId: invBrand || undefined,
                stockStatus: invStatus || undefined
            });
            setInventoryItems(result.items || []);
            setInventoryTotal(result.totalCount || 0);
        } catch (err) {
            console.error('Error fetching warehouse inventory:', err);
        } finally {
            setInventoryLoading(false);
        }
    }, [id, inventoryPage, inventoryPageSize, invSearch, invCategory, invBrand, invStatus]);

    useEffect(() => {
        if (activeTab === 'inventory') {
            fetchInventory();
        }
    }, [activeTab, fetchInventory]);

    // Load Movement History Tab
    const fetchHistory = useCallback(async () => {
        if (!id) return;
        setHistoryLoading(true);
        try {
            const result = await analyticsService.getMovementHistory(id, {
                pageIndex: historyPage,
                pageSize: historyPageSize,
                datePreset: histPreset !== 'Custom' ? histPreset : undefined,
                fromDate: histPreset === 'Custom' && histFromDate ? histFromDate : undefined,
                toDate: histPreset === 'Custom' && histToDate ? histToDate : undefined,
                movementType: histType || undefined,
                searchTerm: histSearch || undefined
            });
            setHistoryItems(result.items || []);
            setHistoryTotal(result.totalCount || 0);
        } catch (err) {
            console.error('Error fetching movement history:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, [id, historyPage, historyPageSize, histPreset, histFromDate, histToDate, histType, histSearch]);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab, fetchHistory]);

    // Load Category Restrictions Tab
    const fetchRestrictions = useCallback(async () => {
        if (!id) return;
        try {
            const data = await warehouseService.getRestrictions(id);
            setRestrictions(data);
            setCanAcceptAll(data.canAcceptAllCategories);
            const ids = new Set(data.allowedCategories.map(c => c.categoryId));
            setSelectedCategoryIds(ids);
        } catch (err) {
            console.error('Error fetching restrictions:', err);
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === 'categories') {
            fetchRestrictions();
        }
    }, [activeTab, fetchRestrictions]);

    // Load Analytics Tab
    const fetchAnalytics = useCallback(async () => {
        if (!id) return;
        setAnalyticsLoading(true);
        try {
            const data = await analyticsService.getWarehouseAnalytics(id, {
                datePreset: analyticsPreset
            });
            setAnalytics(data);
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    }, [id, analyticsPreset]);

    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchAnalytics();
        }
    }, [activeTab, fetchAnalytics]);

    // Handle Category Restrictions Save
    const handleSaveCategories = async () => {
        setSavingCategories(true);
        setCategorySuccess('');
        setCategoryError('');

        try {
            // First update flag if changed
            if (canAcceptAll !== restrictions?.canAcceptAllCategories) {
                await warehouseService.updateCategoryFlag(id, canAcceptAll);
            }

            // If not all categories, update allowed categories list
            if (!canAcceptAll) {
                await warehouseService.setRestrictions(id, Array.from(selectedCategoryIds));
            }

            setCategorySuccess('Warehouse category restrictions updated successfully!');
            fetchRestrictions();
            // Refresh warehouse info
            const updatedWh = await warehouseService.getById(id);
            setWarehouse(updatedWh);
        } catch (err) {
            console.error('Error saving category restrictions:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to update category restrictions.';
            setCategoryError(msg);
        } finally {
            setSavingCategories(false);
        }
    };

    // Open Product Movement History Modal
    const handleViewProductHistory = async (product) => {
        setSelectedProduct(product);
        setProductMovementsLoading(true);
        try {
            const result = await analyticsService.getMovementHistory(id, {
                productId: product.productId,
                pageSize: 50,
                datePreset: 'Last12Months'
            });
            setProductMovements(result.items || []);
        } catch (err) {
            console.error('Error fetching product history:', err);
        } finally {
            setProductMovementsLoading(false);
        }
    };

    if (loadingWarehouse) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <span className="text-xs text-slate-500 font-medium">Loading warehouse facility...</span>
                </div>
            </div>
        );
    }

    if (pageError || !warehouse) {
        return (
            <div className="space-y-4 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <XCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{pageError || 'Warehouse not found'}</h3>
                <button
                    onClick={() => navigate('/warehouses')}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Warehouses</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            onClick={() => navigate('/warehouses')}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Warehouses</span>
                        </button>
                        <span className="text-slate-300">/</span>
                        <span className="text-xs font-semibold text-slate-900">{warehouse.name}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm">
                            <Warehouse className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-2xl font-bold text-slate-900">{warehouse.name}</h1>
                                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                    {warehouse.code}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                    warehouse.isActive
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {warehouse.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {warehouse.address || 'No physical address specified'} • Created on {new Date(warehouse.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        warehouse.canAcceptAllCategories
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                        <ShieldCheck className="h-4 w-4" />
                        <span>{warehouse.canAcceptAllCategories ? 'Unrestricted Facility (All Categories)' : 'Specialized Category Restricted'}</span>
                    </span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition ${
                        activeTab === 'inventory'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Package className="h-4 w-4" />
                    <span>Current Inventory</span>
                </button>

                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition ${
                        activeTab === 'history'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <History className="h-4 w-4" />
                    <span>Movement History</span>
                </button>

                <button
                    onClick={() => setActiveTab('categories')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition ${
                        activeTab === 'categories'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Layers className="h-4 w-4" />
                    <span>Permitted Categories</span>
                </button>

                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition ${
                        activeTab === 'analytics'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <BarChart3 className="h-4 w-4" />
                    <span>Throughput Analytics</span>
                </button>
            </div>

            {/* TAB 1: CURRENT INVENTORY */}
            {activeTab === 'inventory' && (
                <div className="space-y-4">
                    {/* Filters Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={invSearch}
                                onChange={(e) => { setInvSearch(e.target.value); setInventoryPage(1); }}
                                placeholder="Search products, SKU..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <select
                                value={invCategory}
                                onChange={(e) => { setInvCategory(e.target.value); setInventoryPage(1); }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={invBrand}
                                onChange={(e) => { setInvBrand(e.target.value); setInventoryPage(1); }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                            >
                                <option value="">All Brands</option>
                                {brands.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={invStatus}
                                onChange={(e) => { setInvStatus(e.target.value); setInventoryPage(1); }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 font-medium"
                            >
                                <option value="All">All Statuses</option>
                                <option value="InStock">In Stock Only</option>
                                <option value="LowStock">Low Stock (≤ 10)</option>
                                <option value="OutOfStock">Out of Stock</option>
                                <option value="Dormant">Dormant (≥ 60 Days)</option>
                                <option value="PermittedOnly">Permitted Only</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setInvViewMode('cards')}
                                    className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                                        invViewMode === 'cards'
                                            ? 'bg-white shadow-xs text-blue-600 font-bold'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                    title="Show visual product cards with prominent quantity"
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Cards</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInvViewMode('table')}
                                    className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                                        invViewMode === 'table'
                                            ? 'bg-white shadow-xs text-blue-600 font-bold'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                    title="Show dense inventory data table"
                                >
                                    <List className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Table</span>
                                </button>
                            </div>

                            <button
                                onClick={fetchInventory}
                                disabled={inventoryLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${inventoryLoading ? 'animate-spin text-blue-600' : ''}`} />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* Inventory Display: Cards or Table */}
                    {inventoryLoading ? (
                        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
                            <p className="text-xs text-slate-500 mt-2 font-medium">Loading inventory holdings...</p>
                        </div>
                    ) : inventoryItems.length === 0 ? (
                        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
                            <Package className="mx-auto h-12 w-12 text-slate-300" />
                            <h3 className="mt-3 text-sm font-bold text-slate-900">No stock records found</h3>
                            <p className="mt-1 text-xs text-slate-500">No products matching the selected category, brand, or stock health filters.</p>
                        </div>
                    ) : invViewMode === 'cards' ? (
                        /* VISUAL INVENTORY CARDS VIEW */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inventoryItems.map((item) => (
                                <div
                                    key={item.productId}
                                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        {/* Physical Stock Quantity Prominently First */}
                                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                                    Stock in Warehouse
                                                </span>
                                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                                    <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                                                        {item.currentStock.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                        {item.uomName}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Health Status Pill */}
                                            {item.isOutOfStock ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                    Out of Stock
                                                </span>
                                            ) : item.isLowStock ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    <span>Low Stock</span>
                                                </span>
                                            ) : item.isDormant ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                    <Clock className="h-3 w-3" />
                                                    <span>Dormant ({item.daysSinceLastMovement}d)</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    Adequate Stock
                                                </span>
                                            )}
                                        </div>

                                        {/* Product Identification */}
                                        <div className="pt-3 space-y-2">
                                            <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
                                                {item.productName}
                                            </h4>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                    {item.productSku}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                    <Layers className="h-3 w-3 text-slate-400" />
                                                    <span>{item.categoryName}</span>
                                                </span>
                                                {item.brandName && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                                        <Tag className="h-3 w-3 text-slate-400" />
                                                        <span>{item.brandName}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Info & Actions */}
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                        <div>
                                            {item.lastMovementDate ? (
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    Last active: {new Date(item.lastMovementDate).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 font-medium">No recorded movements</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleViewProductHistory(item)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition"
                                            >
                                                <History className="h-3.5 w-3.5" />
                                                <span>Ledger</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* STRUCTURED TABLE VIEW */
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Physical Stock</th>
                                            <th className="px-4 py-3">Product Name & SKU</th>
                                            <th className="px-4 py-3">Category & Brand</th>
                                            <th className="px-4 py-3 text-center">Permitted Status</th>
                                            <th className="px-4 py-3 text-center">Health Status</th>
                                            <th className="px-4 py-3">Last Activity</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {inventoryItems.map((item) => (
                                            <tr key={item.productId} className="hover:bg-slate-50/70 transition">
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="font-mono text-base font-extrabold text-slate-900">
                                                            {item.currentStock.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-slate-500 uppercase">{item.uomName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="font-bold text-sm text-slate-900">{item.productName}</div>
                                                    <div className="font-mono text-xs font-bold text-blue-600 mt-0.5">{item.productSku}</div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="text-slate-800 font-medium">{item.categoryName}</div>
                                                    <div className="text-[11px] text-slate-400">{item.brandName || 'Generic'}</div>
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        item.isPermitted
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-red-50 text-red-700 border border-red-200'
                                                    }`}>
                                                        {item.isPermitted ? 'Permitted' : 'Disallowed'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    {item.isOutOfStock ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                                            Out of Stock
                                                        </span>
                                                    ) : item.isDormant ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                            <Clock className="h-2.5 w-2.5" />
                                                            <span>Dormant ({item.daysSinceLastMovement}d)</span>
                                                        </span>
                                                    ) : item.isLowStock ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <AlertTriangle className="h-2.5 w-2.5" />
                                                            <span>Low Stock</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Adequate
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-500">
                                                    {item.lastMovementDate ? (
                                                        <div>
                                                            <div>{new Date(item.lastMovementDate).toLocaleDateString()}</div>
                                                            <div className="text-[10px] text-slate-400">{item.daysSinceLastMovement} days ago</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">No activity</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <button
                                                        onClick={() => handleViewProductHistory(item)}
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-blue-50"
                                                    >
                                                        <History className="h-3.5 w-3.5" />
                                                        <span>Ledger</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination Footer */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
                            <div>
                                Showing <span className="font-semibold text-slate-900">{inventoryItems.length}</span> of <span className="font-semibold text-slate-900">{inventoryTotal}</span> products
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setInventoryPage(p => Math.max(1, p - 1))}
                                    disabled={inventoryPage <= 1}
                                    className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="font-medium text-slate-700">
                                    Page {inventoryPage} of {Math.max(1, Math.ceil(inventoryTotal / inventoryPageSize))}
                                </span>
                                <button
                                    onClick={() => setInventoryPage(p => p + 1)}
                                    disabled={inventoryPage >= Math.ceil(inventoryTotal / inventoryPageSize)}
                                    className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: MOVEMENT HISTORY */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {/* Date Presets Bar */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                <span>Period Preset:</span>
                            </span>

                            <div className="flex items-center flex-wrap gap-1.5">
                                {DATE_PRESETS.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setHistPreset(p.id); setHistoryPage(1); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                            histPreset === p.id
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {histPreset === 'Custom' && (
                            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 flex-wrap">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 font-medium">From:</span>
                                    <input
                                        type="date"
                                        value={histFromDate}
                                        onChange={(e) => { setHistFromDate(e.target.value); setHistoryPage(1); }}
                                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 font-medium">To:</span>
                                    <input
                                        type="date"
                                        value={histToDate}
                                        onChange={(e) => { setHistToDate(e.target.value); setHistoryPage(1); }}
                                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Movement Filter Dropdowns */}
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 flex-wrap">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={histSearch}
                                    onChange={(e) => { setHistSearch(e.target.value); setHistoryPage(1); }}
                                    placeholder="Filter by product name, SKU, or document ref..."
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                                />
                            </div>

                            <div className="w-48">
                                <select
                                    value={histType}
                                    onChange={(e) => { setHistType(e.target.value); setHistoryPage(1); }}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                                >
                                    <option value="">All Movement Types</option>
                                    <option value="Purchase">Purchase (Receipt)</option>
                                    <option value="Sale">Sale (Dispatch)</option>
                                    <option value="TransferIn">Transfer In</option>
                                    <option value="TransferOut">Transfer Out</option>
                                    <option value="AdjustmentIn">Adjustment In</option>
                                    <option value="AdjustmentOut">Adjustment Out</option>
                                </select>
                            </div>

                            <button
                                onClick={fetchHistory}
                                disabled={historyLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin text-blue-600' : ''}`} />
                                <span>Filter</span>
                            </button>
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">Timestamp (UTC)</th>
                                        <th className="px-4 py-3">Movement Type</th>
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3 text-right">Gross Qty</th>
                                        <th className="px-4 py-3 text-right">Net Impact</th>
                                        <th className="px-4 py-3">Reference / Transaction</th>
                                        <th className="px-4 py-3">Transfer Route</th>
                                        <th className="px-4 py-3">User</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historyLoading ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center">
                                                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                            </td>
                                        </tr>
                                    ) : historyItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-slate-400">
                                                No physical movements recorded in this warehouse during the selected period.
                                            </td>
                                        </tr>
                                    ) : (
                                        historyItems.map((sm) => {
                                            const netChange = sm.netQuantityChange ?? sm.NetQuantityChange ?? 0;
                                            const isInbound = netChange > 0;
                                            return (
                                                <tr key={sm.id} className="hover:bg-slate-50/70 transition">
                                                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                                                        <div>{new Date(sm.createdAt).toLocaleDateString()}</div>
                                                        <div className="text-[10px] text-slate-400">{new Date(sm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                                            sm.movementType === 'Purchase'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : sm.movementType === 'Sale'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : sm.movementType === 'TransferIn'
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                : sm.movementType === 'TransferOut'
                                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                : sm.movementType === 'AdjustmentIn'
                                                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                                        }`}>
                                                            {isInbound ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                                            <span>
                                                                {sm.movementType === 'Purchase' && 'Purchase Receipt'}
                                                                {sm.movementType === 'Sale' && 'Sales Dispatch'}
                                                                {sm.movementType === 'TransferIn' && 'Transfer In'}
                                                                {sm.movementType === 'TransferOut' && 'Transfer Out'}
                                                                {sm.movementType === 'AdjustmentIn' && 'Count Surplus'}
                                                                {sm.movementType === 'AdjustmentOut' && 'Count Shrink'}
                                                                {!['Purchase', 'Sale', 'TransferIn', 'TransferOut', 'AdjustmentIn', 'AdjustmentOut'].includes(sm.movementType) && sm.movementType}
                                                            </span>
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-900 text-xs">{sm.productName}</div>
                                                        <div className="font-mono text-[11px] text-blue-600 font-medium">{sm.productSku}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-700">
                                                        {sm.quantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-mono font-bold text-sm ${
                                                        isInbound ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                        {isInbound ? '+' : ''}{netChange.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-slate-800">
                                                            {sm.referenceType ? `${sm.referenceType}: ${sm.referenceId || ''}` : sm.referenceId || 'Manual Movement'}
                                                        </div>
                                                        {sm.adjustmentReasonName && (
                                                            <div className="text-[10px] text-amber-600 font-semibold">
                                                                Reason: {sm.adjustmentReasonName}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {sm.otherWarehouseName ? (
                                                            <div className="flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 text-[11px]">
                                                                <ArrowLeftRight className="h-3 w-3" />
                                                                <span>{sm.movementType === 'TransferOut' ? `To: ${sm.otherWarehouseName}` : `From: ${sm.otherWarehouseName}`}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 text-xs">
                                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                                            {sm.createdByUserId ? 'Operator' : 'System'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* History Pagination Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
                            <div>
                                Showing <span className="font-semibold text-slate-900">{historyItems.length}</span> of <span className="font-semibold text-slate-900">{historyTotal}</span> movements
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                    disabled={historyPage <= 1}
                                    className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="font-medium text-slate-700">
                                    Page {historyPage} of {Math.max(1, Math.ceil(historyTotal / historyPageSize))}
                                </span>
                                <button
                                    onClick={() => setHistoryPage(p => p + 1)}
                                    disabled={historyPage >= Math.ceil(historyTotal / historyPageSize)}
                                    className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: PERMITTED CATEGORIES (RESTRICTIONS) */}
            {activeTab === 'categories' && (
                <div className="max-w-3xl space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Warehouse Category Authorization</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Define whether this facility accepts all product catalog categories or specializes in specific product lines.
                                Strict guards prevent purchase orders, stock transfers, and inbound adjustments for unauthorized categories.
                            </p>
                        </div>

                        {categorySuccess && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-xs text-emerald-800">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                                <span>{categorySuccess}</span>
                            </div>
                        )}

                        {categoryError && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-50 p-4 text-xs text-rose-800">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                                <div>
                                    <span className="font-bold">Physical Stock Safeguard Rejection:</span>
                                    <p className="mt-1">{categoryError}</p>
                                </div>
                            </div>
                        )}

                        {/* Unrestricted Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                            <div>
                                <h4 className="text-xs font-bold text-slate-900">Unrestricted General Facility</h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    When enabled, this warehouse accepts goods belonging to all product categories.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={canAcceptAll}
                                    onChange={(e) => setCanAcceptAll(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* Category Checklist */}
                        {!canAcceptAll && (
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                                        Permitted Product Categories & Brand Scope:
                                    </h4>
                                    <span className="text-xs text-slate-500 font-medium">
                                        {selectedCategoryIds.size} of {categories.length} categories permitted
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {categories.map((c) => {
                                        const isChecked = selectedCategoryIds.has(c.id);
                                        const catBrands = categoryBrandsMap[c.id] || [];
                                        const hasBrands = catBrands.length > 0;
                                        const isExpanded = expandedCategoryIds.has(c.id);

                                        return (
                                            <div
                                                key={c.id}
                                                className={`rounded-2xl border transition-all ${
                                                    isChecked
                                                        ? 'border-blue-500/50 bg-blue-50/20 shadow-xs'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                {/* Main Category Row */}
                                                <div className="flex items-center justify-between p-4">
                                                    <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const next = new Set(selectedCategoryIds);
                                                                if (e.target.checked) next.add(c.id);
                                                                else next.delete(c.id);
                                                                setSelectedCategoryIds(next);
                                                            }}
                                                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <div>
                                                            <span className={`text-xs font-bold ${isChecked ? 'text-blue-950' : 'text-slate-800'}`}>
                                                                {c.name}
                                                            </span>
                                                            {hasBrands ? (
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                                        <Tag className="h-2.5 w-2.5 text-blue-500" />
                                                                        <span>{catBrands.length} Brand{catBrands.length > 1 ? 's' : ''} available</span>
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] text-slate-400 mt-0.5">No registered brands</p>
                                                            )}
                                                        </div>
                                                    </label>

                                                    {/* Show Brand Toggle ONLY if this category has brands */}
                                                    {hasBrands && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = new Set(expandedCategoryIds);
                                                                if (next.has(c.id)) next.delete(c.id);
                                                                else next.add(c.id);
                                                                setExpandedCategoryIds(next);
                                                            }}
                                                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition shrink-0"
                                                            title={isExpanded ? "Hide brands" : "Show brands"}
                                                        >
                                                            <span>{isExpanded ? 'Hide Brands' : 'Show Brands'}</span>
                                                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Collapsible Brands Section: Renders ONLY if category has brands AND is expanded */}
                                                {hasBrands && isExpanded && (
                                                    <div className="border-t border-slate-100 bg-slate-50/70 p-3.5 rounded-b-2xl space-y-2 animate-in fade-in duration-150">
                                                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                                            <span>Brands associated with {c.name}:</span>
                                                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                                                                All Brands Accepted
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                                            {catBrands.map((b) => (
                                                                <span
                                                                    key={b.id}
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs"
                                                                >
                                                                    <Tag className="h-3 w-3 text-slate-400" />
                                                                    <span>{b.name}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                            <button
                                onClick={handleSaveCategories}
                                disabled={savingCategories}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-60 transition"
                            >
                                {savingCategories ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <span>Save Restrictions</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: THROUGHPUT ANALYTICS */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* Period Selector */}
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-blue-600" />
                            <span>Analytics Reporting Period:</span>
                        </span>
                        <div className="flex items-center flex-wrap gap-1.5">
                            {DATE_PRESETS.filter(p => p.id !== 'Custom').map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setAnalyticsPreset(p.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        analyticsPreset === p.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {analyticsLoading || !analytics ? (
                        <div className="flex h-64 items-center justify-center bg-white rounded-xl border border-slate-200">
                            <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Metrics Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between text-slate-400 mb-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider">Gross Inbound Received</span>
                                        <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900 font-mono">
                                        +{analytics.activitySummary.totalReceivedQuantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        POs: {analytics.activitySummary.totalPurchasesQuantity} • Transfers In: {analytics.activitySummary.totalTransfersInQuantity}
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between text-slate-400 mb-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider">Gross Outbound Dispatched</span>
                                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900 font-mono">
                                        -{analytics.activitySummary.totalDispatchedQuantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Sales: {analytics.activitySummary.totalSalesQuantity} • Transfers Out: {analytics.activitySummary.totalTransfersOutQuantity}
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between text-slate-400 mb-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider">Net Stock Impact</span>
                                        <BarChart3 className="h-4 w-4 text-purple-500" />
                                    </div>
                                    <div className={`text-2xl font-bold font-mono ${
                                        analytics.activitySummary.netStockChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                        {analytics.activitySummary.netStockChange >= 0 ? '+' : ''}
                                        {analytics.activitySummary.netStockChange.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Across {analytics.activitySummary.totalMovementCount} recorded movements
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between text-slate-400 mb-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider">Total Warehouse Physical Stock</span>
                                        <Package className="h-4 w-4 text-indigo-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900 font-mono">
                                        {analytics.totalUnitsInWarehouse.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        {analytics.totalStockedProductsCount} distinct products held
                                    </div>
                                </div>
                            </div>

                            {/* VISUAL FLOW METER: INBOUND VS OUTBOUND RATIO */}
                            {(() => {
                                const inQty = analytics.activitySummary.totalReceivedQuantity || 0;
                                const outQty = analytics.activitySummary.totalDispatchedQuantity || 0;
                                const totalFlow = inQty + outQty;
                                const inPct = totalFlow > 0 ? Math.round((inQty / totalFlow) * 100) : 50;
                                const outPct = 100 - inPct;

                                return (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block"></span>
                                                <span className="font-bold text-slate-800">Inbound Receipts ({inPct}%)</span>
                                                <span className="text-slate-500 font-mono">+{inQty.toLocaleString()} units</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500 font-mono">-{outQty.toLocaleString()} units</span>
                                                <span className="font-bold text-slate-800">Outbound Dispatches ({outPct}%)</span>
                                                <span className="h-3 w-3 rounded-full bg-blue-500 inline-block"></span>
                                            </div>
                                        </div>

                                        {/* Visual Two-Tone Progress Bar */}
                                        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                                            <div
                                                style={{ width: `${inPct}%` }}
                                                className="bg-emerald-500 h-full transition-all duration-500"
                                                title={`Inbound: ${inQty} units (${inPct}%)`}
                                            />
                                            <div
                                                style={{ width: `${outPct}%` }}
                                                className="bg-blue-500 h-full transition-all duration-500"
                                                title={`Outbound: ${outQty} units (${outPct}%)`}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                                            <span>Purchases & Inbound Transfers</span>
                                            <span>Sales Orders & Outbound Transfers</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Top Moving Products & Dormant Stock Tables */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top Moving Products with Visual Velocity Bars */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-blue-600" />
                                        <span>Highest Velocity Products ({analytics.activitySummary.datePresetApplied})</span>
                                    </h3>

                                    {analytics.topMovingProducts.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-4">No product velocity data in this period.</p>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {(() => {
                                                const maxQty = Math.max(...analytics.topMovingProducts.map(p => p.totalQuantityMoved || 1), 1);
                                                return analytics.topMovingProducts.map((p, idx) => {
                                                    const barWidth = Math.min(100, Math.max(8, Math.round((p.totalQuantityMoved / maxQty) * 100)));
                                                    return (
                                                        <div key={p.productId} className="py-3 text-xs space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <span className="font-bold text-slate-800">#{idx + 1} {p.productName}</span>
                                                                    <span className="text-[11px] text-slate-400 ml-2 font-mono">({p.productSku})</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="font-mono font-bold text-slate-900">
                                                                        {p.totalQuantityMoved.toLocaleString()} moved
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {/* Horizontal Visual Meter */}
                                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                                <div
                                                                    style={{ width: `${barWidth}%` }}
                                                                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                                                                <span>{p.categoryName || 'General'}</span>
                                                                <span>+{p.quantityIn} in / -{p.quantityOut} out</span>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Dormant Inventory Alerts */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-purple-600" />
                                        <span>Dormant Inventory Watch (≥ 60 Days Inactive)</span>
                                    </h3>

                                    {analytics.dormantProducts.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-4">No stagnant stock detected. High inventory turnover maintained!</p>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {analytics.dormantProducts.map((d) => (
                                                <div key={d.productId} className="py-2.5 flex items-center justify-between text-xs">
                                                    <div>
                                                        <span className="font-semibold text-slate-800">{d.productName}</span>
                                                        <div className="text-[11px] text-slate-400">{d.categoryName} • {d.productSku}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                            {d.daysDormant} days inactive
                                                        </span>
                                                        <div className="font-mono font-semibold text-slate-700 mt-0.5">
                                                            {d.currentStock} units held
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* PRODUCT LEDGER AUDIT MODAL */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">{selectedProduct.productName}</h3>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                    {selectedProduct.productSku} • In-Warehouse Stock: {selectedProduct.currentStock} {selectedProduct.uomName}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="text-slate-400 hover:text-slate-600 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {productMovementsLoading ? (
                                <div className="p-8 text-center">
                                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                </div>
                            ) : productMovements.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400">
                                    No physical stock movements recorded for this product in this warehouse.
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2">Date (UTC)</th>
                                            <th className="px-3 py-2">Type</th>
                                            <th className="px-3 py-2 text-right">Qty</th>
                                            <th className="px-3 py-2">Document</th>
                                            <th className="px-3 py-2">Route</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                        {productMovements.map((pm) => (
                                            <tr key={pm.id} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 text-slate-600">{new Date(pm.createdAt).toLocaleDateString()}</td>
                                                <td className="px-3 py-2 font-sans">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        pm.netQuantityChange > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {pm.movementType}
                                                    </span>
                                                </td>
                                                <td className={`px-3 py-2 text-right font-bold ${
                                                    pm.netQuantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                                                }`}>
                                                    {pm.netQuantityChange > 0 ? '+' : ''}{pm.netQuantityChange}
                                                </td>
                                                <td className="px-3 py-2 font-sans text-slate-700">{pm.referenceType}: {pm.referenceId}</td>
                                                <td className="px-3 py-2 font-sans text-slate-500">{pm.otherWarehouseName || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehouseDetailPage;
