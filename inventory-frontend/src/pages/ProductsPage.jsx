import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import productService from '../services/productService';
import supplierProductService from '../services/supplierProductService';
import { formatMoneyK, formatCurrency } from '../utils/formatUtils';
import {
    Package,
    Plus,
    Search,
    Tag,
    Hash,
    Boxes,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    X,
    Layers,
    DollarSign,
    LayoutGrid,
    List,
    Truck,
    TrendingUp,
    ArrowLeftRight,
    Sparkles,
    ShieldCheck
} from 'lucide-react';

export const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);
    const [supplierProducts, setSupplierProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

    // Modal state for product
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [unitOfMeasureId, setUnitOfMeasureId] = useState('');
    const [reorderThreshold, setReorderThreshold] = useState(10);
    const [sellingPrice, setSellingPrice] = useState(0);
    const [categoryId, setCategoryId] = useState('');
    const [brandId, setBrandId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');

    // Quick category creation state
    const [showQuickCategory, setShowQuickCategory] = useState(false);
    const [quickCategoryName, setQuickCategoryName] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [prods, cats, brs, uoms, spData] = await Promise.all([
                productService.getAll(),
                productService.getCategories().catch(() => []),
                productService.getBrands().catch(() => []),
                productService.getUnitsOfMeasure().catch(() => []),
                supplierProductService.getAll().catch(() => [])
            ]);
            setProducts(prods || []);
            setCategories(cats || []);
            setBrands(brs || []);
            setUnitsOfMeasure(uoms || []);
            setSupplierProducts(spData || []);

            if (cats && cats.length > 0 && !categoryId) {
                setCategoryId(cats[0].id);
            }
            if (uoms && uoms.length > 0 && !unitOfMeasureId) {
                setUnitOfMeasureId(uoms[0].id);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products and market data from backend.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Sourcing Price Intelligence Map per Product
    const pricingIntelligenceMap = useMemo(() => {
        const map = {};
        supplierProducts.forEach((sp) => {
            if (!sp.productId || !sp.isActive) return;
            const price = parseFloat(sp.lastPurchasePrice);
            if (isNaN(price) || price <= 0) return;

            if (!map[sp.productId]) {
                map[sp.productId] = {
                    prices: [],
                    suppliers: [],
                    minPrice: price,
                    maxPrice: price,
                    preferredSupplier: null,
                    preferredPrice: null
                };
            }
            map[sp.productId].prices.push(price);
            map[sp.productId].suppliers.push(sp.supplierName || 'Authorized Vendor');
            map[sp.productId].minPrice = Math.min(map[sp.productId].minPrice, price);
            map[sp.productId].maxPrice = Math.max(map[sp.productId].maxPrice, price);
            if (sp.isPreferred) {
                map[sp.productId].preferredSupplier = sp.supplierName;
                map[sp.productId].preferredPrice = price;
            }
        });

        // Compute averages
        Object.keys(map).forEach((prodId) => {
            const item = map[prodId];
            const sum = item.prices.reduce((a, b) => a + b, 0);
            item.avgPrice = item.prices.length > 0 ? (sum / item.prices.length) : null;
            item.supplierCount = item.prices.length;
        });

        return map;
    }, [supplierProducts]);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!quickCategoryName.trim()) return;
        try {
            const newCat = await productService.createCategory({ name: quickCategoryName.trim() });
            setCategories([...categories, newCat]);
            setCategoryId(newCat.id);
            setQuickCategoryName('');
            setShowQuickCategory(false);
        } catch (err) {
            console.error('Error creating category:', err);
            setModalError(err.response?.data?.message || 'Failed to create category');
        }
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setModalError('');
        setModalSuccess('');

        if (!categoryId) {
            setModalError('Please select or create a Category first.');
            setSubmitting(false);
            return;
        }

        if (!unitOfMeasureId) {
            setModalError('Please select a Unit of Measure.');
            setSubmitting(false);
            return;
        }

        try {
            const payload = {
                name: name.trim(),
                unitOfMeasureId: unitOfMeasureId,
                reorderThreshold: parseInt(reorderThreshold, 10),
                sellingPrice: parseFloat(sellingPrice),
                categoryId: categoryId,
                brandId: brandId || null
            };

            const created = await productService.create(payload);
            setModalSuccess(`Product "${created.name}" created with SKU: ${created.sku}!`);

            setName('');
            setSellingPrice(0);
            setReorderThreshold(10);
            await fetchData();

            setTimeout(() => {
                setIsProductModalOpen(false);
                setModalSuccess('');
            }, 1200);
        } catch (err) {
            console.error('Error creating product:', err);
            setModalError(err.response?.data?.message || 'Failed to create product.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter((prod) => {
            const matchesSearch =
                !search ||
                prod.name.toLowerCase().includes(search.toLowerCase()) ||
                prod.sku.toLowerCase().includes(search.toLowerCase()) ||
                (prod.categoryName && prod.categoryName.toLowerCase().includes(search.toLowerCase())) ||
                (prod.brandName && prod.brandName.toLowerCase().includes(search.toLowerCase()));

            const matchesCategory =
                selectedCategoryFilter === 'ALL' ||
                prod.categoryId === selectedCategoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [products, search, selectedCategoryFilter]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products & Catalog</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Global product directory, supplier procurement price benchmarks, and master inventory units.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                        title="Reload catalog"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={() => {
                            setModalError('');
                            setModalSuccess('');
                            setIsProductModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 shadow-blue-500/20"
                    >
                        <Plus className="h-4 w-4" />
                        <span>New Product</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-50 p-4 text-xs text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Filter and View Mode Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search product name, SKU, brand..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Category Dropdown Filter */}
                    <select
                        value={selectedCategoryFilter}
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
                    >
                        <option value="ALL">All Categories ({products.length})</option>
                        {categories.map((c) => {
                            const count = products.filter(p => p.categoryId === c.id).length;
                            return (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({count})
                                </option>
                            );
                        })}
                    </select>

                    {/* View Switcher: Cards vs Table */}
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                viewMode === 'cards'
                                    ? 'bg-white shadow-xs text-blue-600'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>Cards</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                viewMode === 'table'
                                    ? 'bg-white shadow-xs text-blue-600'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <List className="h-3.5 w-3.5" />
                            <span>Table</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Display */}
            {loading ? (
                <div className="flex justify-center p-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <Package className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-4 text-sm font-bold text-slate-900">No products found</h3>
                    <p className="mt-1 text-xs text-slate-500">
                        {search ? 'Try modifying your search query.' : 'Add your first product to begin tracking inventory.'}
                    </p>
                    {!search && (
                        <button
                            onClick={() => setIsProductModalOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Create Product</span>
                        </button>
                    )}
                </div>
            ) : viewMode === 'cards' ? (
                /* RICH PRODUCT CARDS VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredProducts.map((prod) => {
                        const intel = pricingIntelligenceMap[prod.id];
                        const hasSellingPrice = prod.sellingPrice > 0;
                        const hasAvgPrice = intel && intel.avgPrice > 0;

                        return (
                            <div
                                key={prod.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group"
                            >
                                <div className="space-y-3">
                                    {/* Header: SKU, Category & Health */}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                            {prod.sku}
                                        </span>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                                prod.isActive
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}
                                        >
                                            {prod.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    {/* Product Title */}
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2 leading-snug">
                                            {prod.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                <Layers className="h-3 w-3 text-slate-400" />
                                                <span>{prod.categoryName || 'General'}</span>
                                            </span>
                                            {prod.brandName && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                                    <Tag className="h-3 w-3 text-slate-400" />
                                                    <span>{prod.brandName}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* PRICING INTELLIGENCE BENCHMARK SECTION */}
                                    <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 space-y-2">
                                        {/* Selling Price Display */}
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                                Catalog Selling Price
                                            </span>
                                            <span
                                                className="text-lg font-extrabold text-slate-900 font-mono"
                                                title={formatCurrency(prod.sellingPrice)}
                                            >
                                                {hasSellingPrice ? formatMoneyK(prod.sellingPrice) : (
                                                    <span className="text-xs font-semibold text-slate-400 font-sans">Not set</span>
                                                )}
                                            </span>
                                        </div>

                                        {/* Average Supplier Procurement Benchmark */}
                                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                                                <Truck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                <span>Avg Vendor Cost:</span>
                                            </div>
                                            {hasAvgPrice ? (
                                                <div className="text-right">
                                                    <span className="font-bold text-blue-700 font-mono text-sm" title={formatCurrency(intel.avgPrice)}>
                                                        ${intel.avgPrice.toFixed(2)}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block">
                                                        from {intel.supplierCount} {intel.supplierCount === 1 ? 'supplier' : 'suppliers'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-[11px] italic">No vendor quotes</span>
                                            )}
                                        </div>

                                        {/* Range or Margin Highlight */}
                                        {hasAvgPrice && intel.minPrice !== intel.maxPrice && (
                                            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                                                <span>Vendor Range:</span>
                                                <span className="font-mono font-medium text-slate-700">
                                                    ${intel.minPrice.toFixed(2)} - ${intel.maxPrice.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                    <div className="text-[11px] font-medium text-slate-400">
                                        Unit: <span className="font-semibold text-slate-700">{prod.unitOfMeasureName || prod.unitOfMeasure || 'Piece'}</span>
                                    </div>
                                    <Link
                                        to={`/stock-movements?productId=${prod.id}`}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition"
                                    >
                                        <ArrowLeftRight className="h-3 w-3" />
                                        <span>Move Stock</span>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* STRUCTURED TABLE VIEW */
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3.5">Product Name</th>
                                    <th className="px-5 py-3.5">SKU</th>
                                    <th className="px-5 py-3.5">Category & Brand</th>
                                    <th className="px-5 py-3.5">Unit of Measure</th>
                                    <th className="px-5 py-3.5 text-right">Selling Price</th>
                                    <th className="px-5 py-3.5 text-right">Avg Supplier Cost</th>
                                    <th className="px-5 py-3.5 text-center">Status</th>
                                    <th className="px-5 py-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map((prod) => {
                                    const intel = pricingIntelligenceMap[prod.id];
                                    return (
                                        <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-sm text-slate-900">{prod.name}</div>
                                                <div className="text-[11px] text-slate-400">Reorder at: {prod.reorderThreshold} units</div>
                                            </td>
                                            <td className="px-5 py-4 font-mono font-bold text-blue-600 text-xs">
                                                {prod.sku}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-800">{prod.categoryName || 'General'}</div>
                                                <div className="text-[11px] text-slate-400">{prod.brandName || 'Generic'}</div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600 font-medium">
                                                {prod.unitOfMeasureName || prod.unitOfMeasure || 'Piece'}
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono font-bold text-slate-900" title={formatCurrency(prod.sellingPrice)}>
                                                {prod.sellingPrice > 0 ? formatMoneyK(prod.sellingPrice) : (
                                                    <span className="text-slate-400 font-sans text-xs">Unset</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono font-bold text-blue-700">
                                                {intel && intel.avgPrice > 0 ? (
                                                    <div>
                                                        <span>${intel.avgPrice.toFixed(2)}</span>
                                                        <span className="block text-[10px] text-slate-400 font-sans font-normal">
                                                            {intel.supplierCount} {intel.supplierCount === 1 ? 'quote' : 'quotes'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-sans font-normal text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                                                        prod.isActive
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}
                                                >
                                                    {prod.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <Link
                                                    to={`/stock-movements?productId=${prod.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-blue-50"
                                                >
                                                    <ArrowLeftRight className="h-3 w-3" />
                                                    <span>Move</span>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-600" />
                                <h3 className="text-base font-bold text-slate-900">Add New Catalog Product</h3>
                            </div>
                            <button
                                onClick={() => setIsProductModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {modalError && (
                            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-700">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        {modalSuccess && (
                            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 p-3 text-xs text-emerald-700">
                                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                                <span>{modalSuccess}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateProduct} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    minLength={2}
                                    maxLength={200}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Wireless Barcode Scanner"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Unit of Measure *
                                    </label>
                                    <select
                                        required
                                        value={unitOfMeasureId}
                                        onChange={(e) => setUnitOfMeasureId(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-blue-500"
                                    >
                                        {unitsOfMeasure.length === 0 ? (
                                            <option value="" disabled>Loading units...</option>
                                        ) : (
                                            unitsOfMeasure.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.name} ({u.code})
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Selling Price ($)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={sellingPrice}
                                        onChange={(e) => setSellingPrice(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none transition focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Category with Quick-Add */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Category *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickCategory(!showQuickCategory)}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                                    >
                                        {showQuickCategory ? 'Cancel' : '+ New Category'}
                                    </button>
                                </div>

                                {showQuickCategory ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Enter new category name..."
                                            value={quickCategoryName}
                                            onChange={(e) => setQuickCategoryName(e.target.value)}
                                            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCreateCategory}
                                            className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                        >
                                            Save
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-blue-500"
                                    >
                                        {categories.length === 0 ? (
                                            <option value="" disabled>No categories available</option>
                                        ) : (
                                            categories.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                )}
                            </div>

                            {/* Brand Selection */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Brand (Optional)
                                </label>
                                <select
                                    value={brandId}
                                    onChange={(e) => setBrandId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-blue-500"
                                >
                                    <option value="">-- Generic / No Brand --</option>
                                    {brands.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Reorder Threshold (Alert trigger)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={reorderThreshold}
                                    onChange={(e) => setReorderThreshold(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-60 transition"
                                >
                                    {submitting ? 'Creating...' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsPage;
