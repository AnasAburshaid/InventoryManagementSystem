import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supplierService from '../services/supplierService';
import analyticsService from '../services/analyticsService';
import productService from '../services/productService';
import supplierProductService from '../services/supplierProductService';
import { formatMoneyK, formatCurrency } from '../utils/formatUtils';
import {
    Truck,
    ArrowLeft,
    RefreshCw,
    Search,
    Plus,
    CheckCircle2,
    XCircle,
    Layers,
    Tag,
    Package,
    History,
    BarChart3,
    AlertCircle,
    Star,
    Clock,
    X,
    TrendingUp,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    Info
} from 'lucide-react';

export const SupplierDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [supplier, setSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [activeTab, setActiveTab] = useState('capabilities'); // capabilities, catalog, stock, analytics

    // Global lists
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [allProducts, setAllProducts] = useState([]);

    // --- TAB: CAPABILITIES ---
    const [canSupplyAllCategories, setCanSupplyAllCategories] = useState(false);
    const [canSupplyAllBrands, setCanSupplyAllBrands] = useState(false);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState(new Set());
    const [selectedBrandIds, setSelectedBrandIds] = useState(new Set());
    const [expandedCategoryIds, setExpandedCategoryIds] = useState(new Set());
    const [hoveredCategoryId, setHoveredCategoryId] = useState(null);
    const [savingCapabilities, setSavingCapabilities] = useState(false);
    const [capSuccess, setCapSuccess] = useState('');
    const [capError, setCapError] = useState('');

    // --- TAB: CATALOG ---
    const [catalog, setCatalog] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogError, setCatalogError] = useState('');
    const [catalogSearch, setCatalogSearch] = useState('');
    const [settingPreferredId, setSettingPreferredId] = useState(null);
    // Add product modal
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [addProdId, setAddProdId] = useState('');
    const [addProdCode, setAddProdCode] = useState('');
    const [addProdPrice, setAddProdPrice] = useState('');
    const [addProdLeadTime, setAddProdLeadTime] = useState('3');
    const [addProdIsPreferred, setAddProdIsPreferred] = useState(false);
    const [addProdSubmitting, setAddProdSubmitting] = useState(false);
    const [addProdError, setAddProdError] = useState('');

    // --- TAB: STOCK LEDGER ---
    const [stockSummary, setStockSummary] = useState([]);
    const [stockLoading, setStockLoading] = useState(false);
    const [stockError, setStockError] = useState('');
    // Replenishment modal
    const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);
    const [repProdId, setRepProdId] = useState('');
    const [repQty, setRepQty] = useState('');
    const [repCost, setRepCost] = useState('');
    const [repBatch, setRepBatch] = useState('');
    const [repNotes, setRepNotes] = useState('');
    const [repSubmitting, setRepSubmitting] = useState(false);
    const [repError, setRepError] = useState('');
    const [repSuccess, setRepSuccess] = useState('');

    // --- ELIGIBLE PRODUCTS FOR THIS SUPPLIER ---
    const [eligibleProducts, setEligibleProducts] = useState([]);
    const [eligibleLoading, setEligibleLoading] = useState(false);

    // Stock movement audit modal
    const [selectedStockProduct, setSelectedStockProduct] = useState(null);
    const [stockLedgerMovements, setStockLedgerMovements] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    // --- TAB: ANALYTICS ---
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Initial Load - loads supplier, capabilities, catalog, products and eligible products immediately
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setPageError('');
            try {
                const [sup, caps, cats, brs, prods, catList, eligProds] = await Promise.all([
                    supplierService.getById(id),
                    supplierService.getCapabilities(id).catch(() => null),
                    productService.getCategories().catch(() => []),
                    productService.getBrands().catch(() => []),
                    productService.getAll().catch(() => []),
                    supplierProductService.getBySupplier(id).catch(() => []),
                    supplierService.getEligibleProducts(id).catch(() => [])
                ]);
                setSupplier(sup);
                if (caps) {
                    setCanSupplyAllCategories(caps.canSupplyAllCategories);
                    setCanSupplyAllBrands(caps.canSupplyAllBrands);
                    setSelectedCategoryIds(new Set((caps.allowedCategories || []).map(c => c.categoryId)));
                    setSelectedBrandIds(new Set((caps.allowedBrands || []).map(b => b.brandId)));
                } else if (sup) {
                    setCanSupplyAllCategories(sup.canSupplyAllCategories);
                    setCanSupplyAllBrands(sup.canSupplyAllBrands);
                }
                setCategories(cats || []);
                setBrands(brs || []);
                setAllProducts(prods || []);
                setCatalog(catList || []);
                setEligibleProducts(eligProds || []);
            } catch (err) {
                console.error('Error loading supplier:', err);
                setPageError('Failed to load supplier profile.');
            } finally {
                setLoading(false);
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

    // Load Capabilities
    const fetchCapabilities = useCallback(async () => {
        if (!id) return;
        try {
            const data = await supplierService.getCapabilities(id);
            setCanSupplyAllCategories(data.canSupplyAllCategories);
            setCanSupplyAllBrands(data.canSupplyAllBrands);
            setSelectedCategoryIds(new Set(data.allowedCategories.map(c => c.categoryId)));
            setSelectedBrandIds(new Set(data.allowedBrands.map(b => b.brandId)));
        } catch (err) {
            console.error('Error fetching capabilities:', err);
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === 'capabilities') {
            fetchCapabilities();
        }
    }, [activeTab, fetchCapabilities]);

    // Load Catalog
    const fetchCatalog = useCallback(async () => {
        if (!id) return;
        setCatalogLoading(true);
        setCatalogError('');
        try {
            const data = await supplierProductService.getBySupplier(id);
            setCatalog(data || []);
        } catch (err) {
            console.error('Error fetching supplier catalog:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to load supplier catalog.';
            setCatalogError(msg);
        } finally {
            setCatalogLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === 'catalog') {
            fetchCatalog();
        }
    }, [activeTab, fetchCatalog]);

    // Load Stock Summary
    const fetchStock = useCallback(async () => {
        if (!id) return;
        setStockLoading(true);
        setStockError('');
        try {
            const data = await supplierService.getStockSummary(id);
            setStockSummary(data || []);
        } catch (err) {
            console.error('Error fetching supplier stock:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to load supplier stock ledger.';
            setStockError(msg);
        } finally {
            setStockLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === 'stock') {
            fetchStock();
        }
    }, [activeTab, fetchStock]);

    // Load Analytics
    const fetchAnalytics = useCallback(async () => {
        if (!id) return;
        setAnalyticsLoading(true);
        try {
            const data = await analyticsService.getSupplierAnalytics(id);
            setAnalytics(data);
        } catch (err) {
            console.error('Error fetching supplier analytics:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchAnalytics();
        }
    }, [activeTab, fetchAnalytics]);

    // Load Eligible Products for this Supplier
    const fetchEligibleProducts = useCallback(async () => {
        if (!id) return;
        setEligibleLoading(true);
        try {
            const data = await supplierService.getEligibleProducts(id);
            setEligibleProducts(data || []);
        } catch (err) {
            console.error('Error fetching eligible products:', err);
        } finally {
            setEligibleLoading(false);
        }
    }, [id]);

    // Uncataloged products that match supplier capability matrix
    const uncatalogedEligibleProducts = useMemo(() => {
        return eligibleProducts.filter(p => !catalog.some(c => c.productId === p.id));
    }, [eligibleProducts, catalog]);

    // Set Preferred Product
    const handleSetPreferred = async (supplierProductId) => {
        setSettingPreferredId(supplierProductId);
        try {
            await supplierProductService.setPreferred(supplierProductId);
            await fetchCatalog();
        } catch (err) {
            console.error('Error setting preferred vendor:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to designate as preferred vendor.';
            alert(msg);
        } finally {
            setSettingPreferredId(null);
        }
    };

    // Save Capabilities
    const handleSaveCapabilities = async () => {
        setSavingCapabilities(true);
        setCapSuccess('');
        setCapError('');

        try {
            await supplierService.updateCapabilityFlags(id, {
                canSupplyAllCategories,
                canSupplyAllBrands
            });

            if (!canSupplyAllCategories) {
                await supplierService.setCategoryCapabilities(id, Array.from(selectedCategoryIds));
            }

            if (!canSupplyAllBrands) {
                // Ensure only brands belonging to authorized categories are saved
                const allowedBrandIds = Array.from(selectedBrandIds).filter((brandId) => {
                    if (canSupplyAllCategories) return true;
                    return Array.from(selectedCategoryIds).some((catId) => {
                        const catBrands = categoryBrandsMap[catId] || [];
                        return catBrands.some((b) => b.id === brandId);
                    });
                });
                await supplierService.setBrandCapabilities(id, allowedBrandIds);
                setSelectedBrandIds(new Set(allowedBrandIds));
            }

            setCapSuccess('Supplier capability matrix updated successfully!');
            fetchCapabilities();
            fetchEligibleProducts();
            fetchCatalog();
            const sup = await supplierService.getById(id);
            setSupplier(sup);
        } catch (err) {
            console.error('Error saving capabilities:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to update capabilities.';
            setCapError(msg);
        } finally {
            setSavingCapabilities(false);
        }
    };

    // Add Product to Catalog
    const handleAddProductToCatalog = async (e) => {
        e.preventDefault();
        setAddProdSubmitting(true);
        setAddProdError('');

        try {
            await supplierProductService.create({
                supplierId: id,
                productId: addProdId,
                supplierProductCode: addProdCode.trim() || null,
                lastPurchasePrice: addProdPrice ? parseFloat(addProdPrice) : null,
                leadTimeDays: addProdLeadTime ? parseInt(addProdLeadTime) : null,
                isPreferred: addProdIsPreferred
            });

            setIsAddProductModalOpen(false);
            setAddProdId('');
            setAddProdCode('');
            setAddProdPrice('');
            fetchCatalog();
            fetchEligibleProducts();
        } catch (err) {
            console.error('Add product error:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to add product to catalog.';
            setAddProdError(msg);
        } finally {
            setAddProdSubmitting(false);
        }
    };

    // Record Replenishment
    const handleRecordReplenishment = async (e) => {
        e.preventDefault();
        setRepSubmitting(true);
        setRepError('');
        setRepSuccess('');

        const parsedQty = parseInt(repQty, 10);
        if (isNaN(parsedQty) || parsedQty <= 0) {
            setRepError('Please enter a valid whole unit quantity (at least 1).');
            setRepSubmitting(false);
            return;
        }

        try {
            await supplierService.recordReplenishment(id, {
                productId: repProdId,
                quantity: parsedQty,
                unitCost: repCost ? parseFloat(repCost) : null,
                batchNumber: repBatch.trim() || null,
                notes: repNotes.trim() || null
            });

            setRepSuccess('Replenishment successfully recorded in supplier ledger!');
            fetchStock();
            fetchCatalog();
            setTimeout(() => {
                setIsReplenishModalOpen(false);
                setRepSuccess('');
                setRepProdId('');
                setRepQty('');
                setRepCost('');
                setRepBatch('');
                setRepNotes('');
            }, 1200);
        } catch (err) {
            console.error('Record replenishment error:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to record replenishment.';
            setRepError(msg);
        } finally {
            setRepSubmitting(false);
        }
    };

    // View Product Stock Ledger
    const handleViewStockLedger = async (item) => {
        setSelectedStockProduct(item);
        setLedgerLoading(true);
        try {
            const data = await supplierService.getStockLedger(id, item.productId);
            setStockLedgerMovements(data || []);
        } catch (err) {
            console.error('Error fetching stock movements:', err);
        } finally {
            setLedgerLoading(false);
        }
    };

    const filteredCatalog = catalog.filter(c =>
        c.productName.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        c.productSku.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (c.supplierProductCode && c.supplierProductCode.toLowerCase().includes(catalogSearch.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <span className="text-xs text-slate-500 font-medium">Loading supplier profile...</span>
                </div>
            </div>
        );
    }

    if (pageError || !supplier) {
        return (
            <div className="space-y-4 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <XCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{pageError || 'Supplier not found'}</h3>
                <button
                    onClick={() => navigate('/suppliers')}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Suppliers</span>
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
                            onClick={() => navigate('/suppliers')}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Suppliers</span>
                        </button>
                        <span className="text-slate-300">/</span>
                        <span className="text-xs font-semibold text-slate-900">{supplier.name}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm">
                            <Truck className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-2xl font-bold text-slate-900">{supplier.name}</h1>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                    supplier.isActive
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {supplier.isActive ? 'Active Vendor' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {supplier.email || 'No email'} • {supplier.phone || 'No phone'} • Vendor registered on {new Date(supplier.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        supplier.canSupplyAllCategories && supplier.canSupplyAllBrands
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                            {supplier.canSupplyAllCategories && supplier.canSupplyAllBrands
                                ? 'Full Universal Supplier'
                                : 'Specialized Capability Matrix'}
                        </span>
                    </span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('capabilities')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition ${
                        activeTab === 'capabilities'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Layers className="h-4 w-4" />
                    <span>Supply Capabilities</span>
                </button>

                <button
                    onClick={() => setActiveTab('catalog')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition ${
                        activeTab === 'catalog'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Tag className="h-4 w-4" />
                    <span>Product Catalog</span>
                </button>

                <button
                    onClick={() => setActiveTab('stock')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition ${
                        activeTab === 'stock'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Package className="h-4 w-4" />
                    <span>Supplier Stock & Ledger</span>
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
                    <span>Procurement Analytics</span>
                </button>
            </div>

            {/* TAB 1: CAPABILITIES */}
            {activeTab === 'capabilities' && (
                <div className="max-w-4xl space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Commercial Supply Capability Matrix</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Configure which product categories and manufacturer brands this supplier is authorized to offer.
                                The backend strictly enforces this matrix during catalog addition and purchase order placement.
                            </p>
                        </div>

                        {capSuccess && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-xs text-emerald-800">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                                <span>{capSuccess}</span>
                            </div>
                        )}

                        {capError && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-50 p-4 text-xs text-rose-800">
                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                                <span>{capError}</span>
                            </div>
                        )}

                        {/* Global Flags */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Can Supply All Categories</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Authorized for all current and future product catalog categories.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={canSupplyAllCategories}
                                        onChange={(e) => setCanSupplyAllCategories(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Can Supply All Brands</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Authorized for all manufacturer brands within permitted categories.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={canSupplyAllBrands}
                                        onChange={(e) => setCanSupplyAllBrands(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Category & Brand Hierarchy */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Authorized Categories & Brand Assignment:
                                </h5>
                                <span className="text-xs text-slate-500 font-medium">
                                    {canSupplyAllCategories ? 'All Categories Permitted' : `${selectedCategoryIds.size} of ${categories.length} Categories Authorized`}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {categories.map((c) => {
                                    const isCategoryChecked = canSupplyAllCategories || selectedCategoryIds.has(c.id);
                                    const catBrands = categoryBrandsMap[c.id] || [];
                                    const hasBrands = catBrands.length > 0;
                                    const isExpanded = expandedCategoryIds.has(c.id);
                                    const isHovered = hoveredCategoryId === c.id;

                                    // Find which brands in this category are currently selected
                                    const selectedBrandsInCat = catBrands.filter((b) => selectedBrandIds.has(b.id));

                                    return (
                                        <div
                                            key={c.id}
                                            onMouseEnter={() => setHoveredCategoryId(c.id)}
                                            onMouseLeave={() => setHoveredCategoryId(null)}
                                            className={`relative rounded-2xl border transition-all ${
                                                isCategoryChecked
                                                    ? 'border-blue-500/50 bg-blue-50/15 shadow-xs'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 opacity-80'
                                            }`}
                                        >
                                            {/* Category Card Header */}
                                            <div className="flex items-center justify-between p-4">
                                                <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
                                                    <input
                                                        type="checkbox"
                                                        disabled={canSupplyAllCategories}
                                                        checked={isCategoryChecked}
                                                        onChange={(e) => {
                                                            const next = new Set(selectedCategoryIds);
                                                            const nextBrands = new Set(selectedBrandIds);
                                                            if (e.target.checked) {
                                                                next.add(c.id);
                                                            } else {
                                                                next.delete(c.id);
                                                                // Deselecting a category automatically removes its brands
                                                                catBrands.forEach((b) => nextBrands.delete(b.id));
                                                                setSelectedBrandIds(nextBrands);
                                                            }
                                                            setSelectedCategoryIds(next);
                                                        }}
                                                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-bold ${isCategoryChecked ? 'text-blue-950' : 'text-slate-700'}`}>
                                                                {c.name}
                                                            </span>
                                                            {isCategoryChecked && (
                                                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                                                    Authorized
                                                                </span>
                                                            )}
                                                        </div>

                                                        {hasBrands ? (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                                    <Tag className="h-3 w-3 text-blue-500" />
                                                                    <span>{catBrands.length} Brand{catBrands.length > 1 ? 's' : ''} available</span>
                                                                </span>
                                                                {!canSupplyAllBrands && isCategoryChecked && (
                                                                    <span className="text-[11px] text-slate-400">
                                                                        ({selectedBrandsInCat.length} selected)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] text-slate-400 mt-1">
                                                                No manufacturer brands registered
                                                            </p>
                                                        )}
                                                    </div>
                                                </label>

                                                {/* Toggle brands expand button ONLY if category has brands */}
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
                                                        title={isExpanded ? "Hide brands" : "Show brands for this category"}
                                                    >
                                                        <span>{isExpanded ? 'Hide Brands' : 'Show Brands'}</span>
                                                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Hover Card / Tooltip Popup */}
                                            {isHovered && (
                                                <div className="absolute left-4 right-4 -top-11 z-30 pointer-events-none rounded-xl bg-slate-900 text-white p-2.5 shadow-xl text-xs animate-in fade-in duration-150">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold text-slate-300">{c.name} Brands Supplied:</span>
                                                        <span className="text-emerald-400 font-bold truncate max-w-[240px]">
                                                            {!isCategoryChecked
                                                                ? 'Category Not Supplied'
                                                                : canSupplyAllBrands
                                                                ? 'All Brands Authorized'
                                                                : selectedBrandsInCat.length > 0
                                                                ? selectedBrandsInCat.map((b) => b.name).join(', ')
                                                                : 'No brands selected'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Scoped Brands Section for this specific Category */}
                                            {hasBrands && isExpanded && (
                                                <div className="border-t border-slate-100 bg-slate-50/70 p-4 rounded-b-2xl space-y-3 animate-in fade-in duration-150">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                                            Brands for {c.name}:
                                                        </span>

                                                        {isCategoryChecked && !canSupplyAllBrands && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = new Set(selectedBrandIds);
                                                                        catBrands.forEach((b) => next.add(b.id));
                                                                        setSelectedBrandIds(next);
                                                                    }}
                                                                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                                                                >
                                                                    Select All
                                                                </button>
                                                                <span className="text-slate-300">|</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = new Set(selectedBrandIds);
                                                                        catBrands.forEach((b) => next.delete(b.id));
                                                                        setSelectedBrandIds(next);
                                                                    }}
                                                                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-700"
                                                                >
                                                                    Clear
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {canSupplyAllBrands ? (
                                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
                                                            <p className="font-semibold">All brands in {c.name} are authorized under the "Can Supply All Brands" setting.</p>
                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                {catBrands.map((b) => (
                                                                    <span key={b.id} className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs text-emerald-900 border border-emerald-200 font-medium">
                                                                        {b.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : !isCategoryChecked ? (
                                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                                            <span>Authorize <strong>{c.name}</strong> category first to enable selection of its brands.</span>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                            {catBrands.map((b) => {
                                                                const isBrandChecked = selectedBrandIds.has(b.id);
                                                                return (
                                                                    <label
                                                                        key={b.id}
                                                                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                                                                            isBrandChecked
                                                                                ? 'border-indigo-500/50 bg-indigo-50/50 text-indigo-900 font-semibold'
                                                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isBrandChecked}
                                                                            onChange={(e) => {
                                                                                const next = new Set(selectedBrandIds);
                                                                                if (e.target.checked) next.add(b.id);
                                                                                else next.delete(b.id);
                                                                                setSelectedBrandIds(next);
                                                                            }}
                                                                            className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                                                                        />
                                                                        <span>{b.name}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                            <button
                                onClick={handleSaveCapabilities}
                                disabled={savingCapabilities}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-60 transition"
                            >
                                {savingCapabilities ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <span>Save Capabilities</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: PRODUCT CATALOG */}
            {activeTab === 'catalog' && (
                <div className="space-y-4">
                    {catalogError && (
                        <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-500/30 bg-rose-50 text-xs text-rose-700">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                            <span>{catalogError}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={catalogSearch}
                                onChange={(e) => setCatalogSearch(e.target.value)}
                                placeholder="Search supplier catalog by product, SKU, code..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchCatalog}
                                disabled={catalogLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${catalogLoading ? 'animate-spin text-blue-600' : ''}`} />
                                <span>Refresh</span>
                            </button>

                            <button
                                onClick={() => { setAddProdError(''); setIsAddProductModalOpen(true); }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Product to Catalog</span>
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">Product Name & SKU</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Vendor SKU Code</th>
                                        <th className="px-4 py-3 text-right">Purchase Price</th>
                                        <th className="px-4 py-3 text-center">Lead Time</th>
                                        <th className="px-4 py-3 text-center">Preferred Vendor</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {catalogLoading ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center">
                                                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                            </td>
                                        </tr>
                                    ) : filteredCatalog.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-400">
                                                No products cataloged for this supplier.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCatalog.map((sp) => (
                                            <tr key={sp.id} className="hover:bg-slate-50/70 transition">
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-slate-900">{sp.productName}</div>
                                                    <div className="font-mono text-[11px] text-slate-400">{sp.productSku}</div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {sp.categoryName}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                                                    {sp.supplierProductCode || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900" title={formatCurrency(sp.lastPurchasePrice)}>
                                                    {formatMoneyK(sp.lastPurchasePrice)}
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-600">
                                                    {sp.leadTimeDays != null ? `${sp.leadTimeDays} days` : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {sp.isPreferred ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                                                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                                            <span>Preferred</span>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetPreferred(sp.id)}
                                                            disabled={settingPreferredId === sp.id}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition cursor-pointer disabled:opacity-50"
                                                            title="Designate this vendor as preferred for this product"
                                                        >
                                                            <Star className={`h-3 w-3 ${settingPreferredId === sp.id ? 'animate-spin text-amber-600' : 'text-slate-400 group-hover:text-amber-500'}`} />
                                                            <span>{settingPreferredId === sp.id ? 'Saving...' : 'Set Preferred'}</span>
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        sp.isActive
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {sp.isActive ? 'Active' : 'Inactive'}
                                                    </span>
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

            {/* TAB 3: SUPPLIER STOCK & LEDGER */}
            {activeTab === 'stock' && (
                <div className="space-y-4">
                    {stockError && (
                        <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-500/30 bg-rose-50 text-xs text-rose-700">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                            <span>{stockError}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Supplier Stock Tracking & Available-to-Promise</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Event-sourced stock ledger tracking replenishments, order reservations, and warehouse dispatches.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchStock}
                                disabled={stockLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${stockLoading ? 'animate-spin text-blue-600' : ''}`} />
                                <span>Refresh</span>
                            </button>

                            <button
                                onClick={() => { setRepError(''); setRepSuccess(''); setIsReplenishModalOpen(true); }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Record Replenishment</span>
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3 text-right">Physical On-Hand</th>
                                        <th className="px-4 py-3 text-right">Reserved (Active POs)</th>
                                        <th className="px-4 py-3 text-right">Available-To-Promise (ATP)</th>
                                        <th className="px-4 py-3">Last Replenished</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                    {stockLoading ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center">
                                                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                            </td>
                                        </tr>
                                    ) : stockSummary.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                                                No stock movements recorded for this supplier. Record a replenishment to initialize vendor inventory.
                                            </td>
                                        </tr>
                                    ) : (
                                        stockSummary.map((s) => (
                                            <tr key={s.productId} className="hover:bg-slate-50/70 transition">
                                                <td className="px-4 py-3 font-sans">
                                                    <div className="font-semibold text-slate-900">{s.productName}</div>
                                                    <div className="font-mono text-[11px] text-slate-400">{s.productSku}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                    {(s.onHandQuantity ?? 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right text-amber-600 font-semibold">
                                                    {(s.reservedQuantity ?? 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {(() => {
                                                        const atp = s.availableToPromiseQuantity ?? s.availableToPromise ?? 0;
                                                        return (
                                                            <span className={`font-bold px-2.5 py-1 rounded-md ${
                                                                atp > 0
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                            }`}>
                                                                {atp.toLocaleString()}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 font-sans text-[11px]">
                                                    {s.lastReplenishedAt ? new Date(s.lastReplenishedAt).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-sans">
                                                    <button
                                                        onClick={() => handleViewStockLedger(s)}
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                                                    >
                                                        <History className="h-3.5 w-3.5" />
                                                        <span>Audit Log</span>
                                                    </button>
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

            {/* TAB 4: ANALYTICS */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {analyticsLoading || !analytics ? (
                        <div className="flex h-64 items-center justify-center bg-white rounded-xl border border-slate-200">
                            <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Units Supplied</span>
                                    <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
                                        {analytics.totalUnitsSuppliedHistorically.toLocaleString()}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Fulfilled to company warehouses
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total POs Fulfilled</span>
                                    <div className="text-2xl font-bold text-emerald-600 font-mono mt-2">
                                        {analytics.totalPurchaseOrdersFulfilled} Orders
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Completed purchase transactions
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Lead Time</span>
                                    <div className="text-2xl font-bold text-indigo-600 font-mono mt-2">
                                        {analytics.averageLeadTimeDays} Days
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Vendor delivery turnaround
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Catalog Offerings</span>
                                    <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
                                        {analytics.totalCatalogProductsCount} Products
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        {analytics.preferredProductsCount} designated preferred
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: RECORD REPLENISHMENT */}
            {isReplenishModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">Record Vendor Replenishment</h3>
                            <button onClick={() => setIsReplenishModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {repError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{repError}</span>
                            </div>
                        )}

                        {repSuccess && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>{repSuccess}</span>
                            </div>
                        )}

                        <form onSubmit={handleRecordReplenishment} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Select Product *
                                    <span className="ml-1 text-[11px] font-normal text-slate-500">
                                        ({eligibleProducts.length} authorized products)
                                    </span>
                                </label>
                                {eligibleProducts.length === 0 ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                        This supplier has no authorized categories configured. Please configure allowed categories in the Capabilities tab first.
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={repProdId}
                                        onChange={(e) => setRepProdId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                    >
                                        <option value="">-- Choose Authorized Product ({eligibleProducts.length}) --</option>
                                        {eligibleProducts.map((p) => {
                                            const inCat = catalog.some((c) => c.productId === p.id);
                                            return (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.sku}) — {p.categoryName || 'General'} • {formatMoneyK(p.sellingPrice)} {inCat ? '✓ [In Catalog]' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Quantity (Units) *</label>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setRepQty((prev) => Math.max(1, (parseInt(prev, 10) || 1) - 1))}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold text-sm shrink-0"
                                            title="Decrease quantity by 1"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            step="1"
                                            value={repQty}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '') {
                                                    setRepQty('');
                                                } else {
                                                    const intVal = parseInt(val, 10);
                                                    setRepQty(isNaN(intVal) ? '' : Math.max(1, intVal));
                                                }
                                            }}
                                            placeholder="e.g. 100"
                                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-center text-slate-900 outline-none focus:border-blue-500 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setRepQty((prev) => (parseInt(prev, 10) || 0) + 1)}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold text-sm shrink-0"
                                            title="Increase quantity by 1"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Unit Cost ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={repCost}
                                        onChange={(e) => setRepCost(e.target.value)}
                                        placeholder="Optional"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Batch / Reference Number</label>
                                <input
                                    type="text"
                                    value={repBatch}
                                    onChange={(e) => setRepBatch(e.target.value)}
                                    placeholder="e.g. BATCH-2026-X1"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes</label>
                                <textarea
                                    rows={2}
                                    value={repNotes}
                                    onChange={(e) => setRepNotes(e.target.value)}
                                    placeholder="Factory production batch details..."
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsReplenishModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={repSubmitting}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                                >
                                    {repSubmitting ? 'Recording...' : 'Record In Ledger'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ADD PRODUCT TO CATALOG */}
            {isAddProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">Add Product to Supplier Catalog</h3>
                            <button onClick={() => setIsAddProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {addProdError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{addProdError}</span>
                            </div>
                        )}

                        <form onSubmit={handleAddProductToCatalog} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Product *
                                    <span className="ml-1 text-[11px] font-normal text-slate-500">
                                        ({uncatalogedEligibleProducts.length} available)
                                    </span>
                                </label>
                                {uncatalogedEligibleProducts.length === 0 ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                        {eligibleProducts.length === 0
                                            ? "This supplier has no authorized categories. Configure authorized categories in the Capabilities tab first."
                                            : "All authorized products for this supplier are already in the catalog."}
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={addProdId}
                                        onChange={(e) => setAddProdId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                    >
                                        <option value="">-- Choose Authorized Product ({uncatalogedEligibleProducts.length}) --</option>
                                        {uncatalogedEligibleProducts.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.sku}) — {p.categoryName || 'General'} • {formatMoneyK(p.sellingPrice)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Supplier's Own Product Code
                                    <span className="ml-1 text-[11px] font-normal text-slate-400">(Optional — auto-generated if empty)</span>
                                </label>
                                <input
                                    type="text"
                                    value={addProdCode}
                                    onChange={(e) => setAddProdCode(e.target.value)}
                                    placeholder="e.g. SUP-VND-SKU (auto-generated if left blank)"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
                                />
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Leave blank to automatically assign unique vendor SKU format.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Purchase Price ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={addProdPrice}
                                        onChange={(e) => setAddProdPrice(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Lead Time (Days)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={addProdLeadTime}
                                        onChange={(e) => setAddProdLeadTime(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={addProdIsPreferred}
                                    onChange={(e) => setAddProdIsPreferred(e.target.checked)}
                                    className="h-4 w-4 rounded text-blue-600"
                                />
                                <div className="text-xs">
                                    <span className="font-semibold text-slate-800">Set as Preferred Supplier</span>
                                    <p className="text-[11px] text-slate-400">At most one active supplier can be preferred for each product.</p>
                                </div>
                            </label>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddProductModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addProdSubmitting}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                                >
                                    {addProdSubmitting ? 'Validating...' : 'Add to Catalog'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: STOCK LEDGER AUDIT */}
            {selectedStockProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">{selectedStockProduct.productName}</h3>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                    On-Hand: {selectedStockProduct.onHandQuantity} • Reserved: {selectedStockProduct.reservedQuantity} • ATP: {selectedStockProduct.availableToPromise}
                                </div>
                            </div>
                            <button onClick={() => setSelectedStockProduct(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {ledgerLoading ? (
                                <div className="p-8 text-center">
                                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                </div>
                            ) : stockLedgerMovements.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400">
                                    No ledger movements recorded for this item.
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs font-mono">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-sans text-[11px] sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2">Date (UTC)</th>
                                            <th className="px-3 py-2">Movement Type</th>
                                            <th className="px-3 py-2 text-right">Quantity</th>
                                            <th className="px-3 py-2">Reference</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[11px]">
                                        {stockLedgerMovements.map((m) => (
                                            <tr key={m.id} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 text-slate-600">{new Date(m.createdAt).toLocaleString()}</td>
                                                <td className="px-3 py-2 font-sans">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        m.movementType === 'ExternalReplenishment'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : m.movementType === 'OrderReserved'
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : m.movementType === 'OrderFulfilledToWarehouse'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-slate-100 text-slate-800'
                                                    }`}>
                                                        {m.movementType}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold text-slate-800">{m.quantity}</td>
                                                <td className="px-3 py-2 text-slate-600 font-sans">{m.referenceType}: {m.referenceId}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedStockProduct(null)}
                                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
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

export default SupplierDetailPage;
