import React, { useState, useEffect } from 'react';
import productService from '../services/productService';
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
    DollarSign
} from 'lucide-react';

export const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

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
            const [prods, cats, brs, uoms] = await Promise.all([
                productService.getAll(),
                productService.getCategories().catch(() => []),
                productService.getBrands().catch(() => []),
                productService.getUnitsOfMeasure().catch(() => [])
            ]);
            setProducts(prods || []);
            setCategories(cats || []);
            setBrands(brs || []);
            setUnitsOfMeasure(uoms || []);
            if (cats && cats.length > 0 && !categoryId) {
                setCategoryId(cats[0].id);
            }
            if (uoms && uoms.length > 0 && !unitOfMeasureId) {
                setUnitOfMeasureId(uoms[0].id);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products from backend.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
            if (unitsOfMeasure.length > 0) {
                setUnitOfMeasureId(unitsOfMeasure[0].id);
            }
            fetchData();
            setTimeout(() => {
                setIsProductModalOpen(false);
                setModalSuccess('');
            }, 1500);
        } catch (err) {
            console.error('Create product error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to create product.';
            setModalError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.categoryName?.toLowerCase().includes(search.toLowerCase()) ||
        (p.brandName && p.brandName.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products & Catalog</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Track stock keeping units (SKUs), master categories, and units of measurement.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
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
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 shadow-blue-500/20"
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

            {/* Search Filter */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by product name, SKU, category, or brand..."
                        className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            {/* Products Table */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="mt-4 text-sm font-semibold text-slate-900">No products found</h3>
                        <p className="mt-1 text-xs text-slate-500">
                            {search ? 'Try modifying your search query.' : 'Add your first product to begin tracking inventory.'}
                        </p>
                        {!search && (
                            <button
                                onClick={() => setIsProductModalOpen(true)}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Create Product</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-3.5">Product Name</th>
                                    <th className="px-6 py-3.5">SKU</th>
                                    <th className="px-6 py-3.5">Category</th>
                                    <th className="px-6 py-3.5">Brand</th>
                                    <th className="px-6 py-3.5">Unit of Measure</th>
                                    <th className="px-6 py-3.5">Selling Price</th>
                                    <th className="px-6 py-3.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map((prod) => (
                                    <tr key={prod.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900">{prod.name}</div>
                                            <div className="text-[11px] text-slate-400">Reorder at: {prod.reorderThreshold} units</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-blue-600">
                                            {prod.sku}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700">
                                            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                                                <Layers className="h-3 w-3 text-slate-400" />
                                                {prod.categoryName || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {prod.brandName || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            <span className="inline-flex items-center gap-1.5">
                                                <span>{prod.unitOfMeasureName || prod.unitOfMeasure}</span>
                                                {prod.unitOfMeasureCode && (
                                                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                                        {prod.unitOfMeasureCode}
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-900">
                                            ${Number(prod.sellingPrice || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                                    prod.isActive
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {prod.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-600" />
                                <h3 className="text-base font-semibold text-slate-900">Add New Product</h3>
                            </div>
                            <button
                                onClick={() => setIsProductModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {modalError && (
                            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-50 p-3 text-xs text-red-700">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                                <span>{modalError}</span>
                            </div>
                        )}

                        {modalSuccess && (
                            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-xs text-emerald-700">
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
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        {unitsOfMeasure.length === 0 ? (
                                            <option value="" disabled>Loading units...</option>
                                        ) : (
                                            unitsOfMeasure.map((opt) => (
                                                <option key={opt.id} value={opt.id}>
                                                    {opt.name} ({opt.code})
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
                                        step="0.01"
                                        min="0"
                                        value={sellingPrice}
                                        onChange={(e) => setSellingPrice(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Reorder Threshold
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={reorderThreshold}
                                        onChange={(e) => setReorderThreshold(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Brand (Optional)
                                    </label>
                                    <select
                                        value={brandId}
                                        onChange={(e) => setBrandId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">No Brand Selected</option>
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Category *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickCategory(!showQuickCategory)}
                                        className="text-xs text-blue-600 font-medium hover:underline"
                                    >
                                        {showQuickCategory ? 'Cancel' : '+ New Category'}
                                    </button>
                                </div>

                                {showQuickCategory ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={quickCategoryName}
                                            onChange={(e) => setQuickCategoryName(e.target.value)}
                                            placeholder="New category name"
                                            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCreateCategory}
                                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                                        >
                                            Save
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">Select a Category...</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <p className="text-[11px] text-slate-400">
                                The Product SKU will be automatically generated by the backend SkuGenerator.
                            </p>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-60 transition"
                                >
                                    {submitting ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <span>Create Product</span>
                                    )}
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
