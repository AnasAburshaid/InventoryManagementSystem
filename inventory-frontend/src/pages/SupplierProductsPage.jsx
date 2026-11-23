import React, { useState, useEffect } from 'react';
import supplierProductService from '../services/supplierProductService';
import supplierService from '../services/supplierService';
import productService from '../services/productService';
import { formatMoneyK, formatCurrency } from '../utils/formatUtils';
import {
    Link2,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Star,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    X,
    Clock,
    DollarSign,
    Package,
    Truck,
    LayoutGrid,
    List,
    Building2,
    ChevronLeft,
    ChevronRight,
    Info,
    Tag,
    Check,
    Layers
} from 'lucide-react';

export const SupplierProductsPage = () => {
    const [links, setLinks] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // Filter & View states
    const [supplierFilter, setSupplierFilter] = useState('');
    const [productFilter, setProductFilter] = useState('');
    const [preferredFilter, setPreferredFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'grouped'
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, supplierFilter, productFilter, preferredFilter, viewMode]);

    // Create Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [supplierProductCode, setSupplierProductCode] = useState('');
    const [lastPurchasePrice, setLastPurchasePrice] = useState('');
    const [leadTimeDays, setLeadTimeDays] = useState('');
    const [isPreferred, setIsPreferred] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');

    // Eligible products for currently selected supplier in create modal
    const [eligibleProductsForModal, setEligibleProductsForModal] = useState([]);
    const [loadingEligibleProducts, setLoadingEligibleProducts] = useState(false);

    // Edit Modal state
    const [editingLink, setEditingLink] = useState(null);
    const [editSupplierProductCode, setEditSupplierProductCode] = useState('');
    const [editLastPurchasePrice, setEditLastPurchasePrice] = useState('');
    const [editLeadTimeDays, setEditLeadTimeDays] = useState('');
    const [editIsPreferred, setEditIsPreferred] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');

    // Delete Modal state
    const [deletingLink, setDeletingLink] = useState(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [linksData, suppliersData, productsData] = await Promise.all([
                supplierProductService.getAll(),
                supplierService.getAll(),
                productService.getAll()
            ]);
            setLinks(linksData || []);
            setSuppliers(suppliersData || []);
            setProducts(productsData || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load supplier products data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Dynamically fetch compatible products whenever a supplier is selected
    useEffect(() => {
        if (!selectedSupplierId) {
            setEligibleProductsForModal([]);
            setSelectedProductId('');
            return;
        }
        let isCancelled = false;
        setLoadingEligibleProducts(true);
        supplierService.getEligibleProducts(selectedSupplierId)
            .then(data => {
                if (!isCancelled) {
                    setEligibleProductsForModal(data || []);
                }
            })
            .catch(err => {
                console.error('Failed to load eligible products for supplier:', err);
                if (!isCancelled) setEligibleProductsForModal([]);
            })
            .finally(() => {
                if (!isCancelled) setLoadingEligibleProducts(false);
            });

        return () => { isCancelled = true; };
    }, [selectedSupplierId]);

    const handleQuickSetPreferred = async (id) => {
        try {
            await supplierProductService.setPreferred(id);
            fetchData();
        } catch (err) {
            console.error('Set preferred error:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to designate as preferred vendor.';
            alert(msg);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateSubmitting(true);
        setCreateError('');
        setCreateSuccess('');

        if (!selectedSupplierId || !selectedProductId) {
            setCreateError('Please select both a supplier and a product.');
            setCreateSubmitting(false);
            return;
        }

        try {
            await supplierProductService.create({
                supplierId: selectedSupplierId,
                productId: selectedProductId,
                supplierProductCode: supplierProductCode.trim() || null,
                lastPurchasePrice: lastPurchasePrice !== '' ? parseFloat(lastPurchasePrice) : null,
                leadTimeDays: leadTimeDays !== '' ? parseInt(leadTimeDays, 10) : null,
                isPreferred: isPreferred
            });

            setCreateSuccess('Supplier product link created successfully!');
            fetchData();
            setTimeout(() => {
                setIsCreateOpen(false);
                setCreateSuccess('');
                setSelectedSupplierId('');
                setSelectedProductId('');
                setSupplierProductCode('');
                setLastPurchasePrice('');
                setLeadTimeDays('');
                setIsPreferred(false);
            }, 1200);
        } catch (err) {
            console.error('Create error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to create link.';
            setCreateError(msg);
        } finally {
            setCreateSubmitting(false);
        }
    };

    const openEditModal = (link) => {
        setEditingLink(link);
        setEditSupplierProductCode(link.supplierProductCode || '');
        setEditLastPurchasePrice(link.lastPurchasePrice !== null && link.lastPurchasePrice !== undefined ? link.lastPurchasePrice : '');
        setEditLeadTimeDays(link.leadTimeDays !== null && link.leadTimeDays !== undefined ? link.leadTimeDays : '');
        setEditIsPreferred(!!link.isPreferred);
        setEditError('');
        setEditSuccess('');
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setEditSubmitting(true);
        setEditError('');
        setEditSuccess('');

        try {
            await supplierProductService.update(editingLink.id, {
                supplierProductCode: editSupplierProductCode.trim() || null,
                lastPurchasePrice: editLastPurchasePrice !== '' ? parseFloat(editLastPurchasePrice) : null,
                leadTimeDays: editLeadTimeDays !== '' ? parseInt(editLeadTimeDays, 10) : null,
                isPreferred: editIsPreferred
            });

            setEditSuccess('Link updated successfully!');
            fetchData();
            setTimeout(() => {
                setEditingLink(null);
                setEditSuccess('');
            }, 1200);
        } catch (err) {
            console.error('Update error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to update link.';
            setEditError(msg);
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingLink) return;
        setDeleteSubmitting(true);
        setDeleteError('');

        try {
            await supplierProductService.delete(deletingLink.id);
            fetchData();
            setDeletingLink(null);
        } catch (err) {
            console.error('Delete error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to delete link.';
            setDeleteError(msg);
        } finally {
            setDeleteSubmitting(false);
        }
    };

    // Filtered data
    const filteredLinks = links.filter((link) => {
        const matchesSearch =
            link.productName?.toLowerCase().includes(search.toLowerCase()) ||
            link.productSku?.toLowerCase().includes(search.toLowerCase()) ||
            link.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
            (link.supplierProductCode && link.supplierProductCode.toLowerCase().includes(search.toLowerCase()));

        const matchesSupplier = !supplierFilter || link.supplierId === supplierFilter;
        const matchesProduct = !productFilter || link.productId === productFilter;
        const matchesPreferred =
            preferredFilter === 'ALL' ||
            (preferredFilter === 'YES' && link.isPreferred) ||
            (preferredFilter === 'NO' && !link.isPreferred);

        return matchesSearch && matchesSupplier && matchesProduct && matchesPreferred;
    });

    // Metric summaries
    const totalLinks = links.length;
    const preferredCount = links.filter((l) => l.isPreferred).length;
    const uniqueProducts = new Set(links.map((l) => l.productId)).size;
    const avgLeadTime =
        links.filter((l) => l.leadTimeDays !== null).length > 0
            ? Math.round(
                  links
                      .filter((l) => l.leadTimeDays !== null)
                      .reduce((acc, l) => acc + l.leadTimeDays, 0) /
                      links.filter((l) => l.leadTimeDays !== null).length
              )
            : 0;

    // Group by Supplier
    const groupedBySupplier = {};
    filteredLinks.forEach((link) => {
        const key = link.supplierId || link.supplierName;
        if (!groupedBySupplier[key]) {
            groupedBySupplier[key] = {
                supplierId: link.supplierId,
                supplierName: link.supplierName,
                items: []
            };
        }
        groupedBySupplier[key].items.push(link);
    });
    const supplierGroups = Object.values(groupedBySupplier);

    // Pagination calculations
    const totalItemsCount = viewMode === 'table' ? filteredLinks.length : supplierGroups.length;
    const totalPages = Math.max(1, Math.ceil(totalItemsCount / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItemsCount);

    const paginatedLinks = filteredLinks.slice(startIndex, endIndex);
    const paginatedGroups = supplierGroups.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Supplier Products & Sourcing Matrix</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Map approved vendors to products with contracted purchase costs, lead times, custom vendor SKUs, and preferred supplier status.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={() => {
                            setIsCreateOpen(true);
                            setCreateError('');
                            setCreateSuccess('');
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Link Product to Supplier</span>
                    </button>
                </div>
            </div>

            {/* Context & Purpose Guide */}
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/60 via-slate-50 to-indigo-50/40 p-4 shadow-2xs">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-blue-100 p-1.5 text-blue-700 shrink-0">
                        <Info className="h-4 w-4" />
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-semibold text-slate-900">Understanding Vendor Sourcing Agreements:</span>
                        <p className="mt-0.5">
                            Suppliers can only supply products that comply with their authorized categories and brands. Each link below defines commercial terms (negotiated purchasing cost, expected lead time, and supplier-specific code). Marking a vendor as <strong className="text-amber-800 font-semibold">Preferred</strong> prioritizes them automatically in procurement orders and inventory replenishment.
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Link2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Total Sourcing Links</p>
                            <p className="text-xl font-bold text-slate-900">{totalLinks}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                            <Star className="h-5 w-5 fill-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Preferred Suppliers</p>
                            <p className="text-xl font-bold text-slate-900">{preferredCount}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Products Sourced</p>
                            <p className="text-xl font-bold text-slate-900">{uniqueProducts}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Avg Lead Time</p>
                            <p className="text-xl font-bold text-slate-900">{avgLeadTime} days</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error notification */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search product, SKU, supplier, or supplier code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={supplierFilter}
                        onChange={(e) => setSupplierFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">All Suppliers</option>
                        {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">All Products</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                            </option>
                        ))}
                    </select>

                    <select
                        value={preferredFilter}
                        onChange={(e) => setPreferredFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="ALL">All Status</option>
                        <option value="YES">Preferred Only</option>
                        <option value="NO">Non-Preferred Only</option>
                    </select>

                    {(search || supplierFilter || productFilter || preferredFilter !== 'ALL') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                setSupplierFilter('');
                                setProductFilter('');
                                setPreferredFilter('ALL');
                            }}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                        >
                            Reset
                        </button>
                    )}

                    <div className="flex items-center rounded-lg border border-slate-300 bg-slate-100 p-0.5 ml-auto sm:ml-2">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <List className="h-3.5 w-3.5" />
                            <span>Table</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('grouped')}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                viewMode === 'grouped' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Layers className="h-3.5 w-3.5" />
                            <span>By Supplier</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Views: Table or Grouped by Supplier */}
            {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
                    <div className="flex justify-center items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                        <span>Loading supplier product relationships...</span>
                    </div>
                </div>
            ) : totalItemsCount === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
                    No supplier-product links found matching your criteria.
                </div>
            ) : viewMode === 'table' ? (
                /* Table View */
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-5 py-3.5">Supplier</th>
                                    <th className="px-5 py-3.5">Product & SKU</th>
                                    <th className="px-5 py-3.5">Supplier Code</th>
                                    <th className="px-5 py-3.5">Last Purchase Price</th>
                                    <th className="px-5 py-3.5">Lead Time</th>
                                    <th className="px-5 py-3.5">Preferred</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedLinks.map((link) => (
                                    <tr key={link.id} className="hover:bg-slate-50/70 transition">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                                    <Truck className="h-4 w-4" />
                                                </div>
                                                <span className="font-semibold text-slate-900">{link.supplierName}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div>
                                                <p className="font-medium text-slate-900">{link.productName}</p>
                                                <p className="text-xs text-slate-400 font-mono">{link.productSku}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 font-mono text-xs text-slate-600">
                                            {link.supplierProductCode ? (
                                                <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                                                    {link.supplierProductCode}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 font-medium text-slate-900" title={formatCurrency(link.lastPurchasePrice)}>
                                            {formatMoneyK(link.lastPurchasePrice)}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {link.leadTimeDays !== null && link.leadTimeDays !== undefined ? (
                                                `${link.leadTimeDays} days`
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            {link.isPreferred ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                                                    <Star className="h-3 w-3 fill-amber-500" />
                                                    Preferred
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickSetPreferred(link.id)}
                                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 border border-transparent px-2.5 py-0.5 text-xs font-medium text-slate-600 transition cursor-pointer"
                                                    title="Designate this vendor as preferred for this product"
                                                >
                                                    <Star className="h-3 w-3 text-slate-400" />
                                                    <span>Set Preferred</span>
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    onClick={() => openEditModal(link)}
                                                    className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDeletingLink(link);
                                                        setDeleteError('');
                                                    }}
                                                    className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Grouped by Supplier View */
                <div className="space-y-4">
                    {paginatedGroups.map((grp) => (
                        <div key={grp.supplierId || grp.supplierName} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold">
                                        <Truck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">{grp.supplierName}</h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {grp.items.length} authorized product{grp.items.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                        {grp.items.filter((i) => i.isPreferred).length} Preferred
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {grp.items.map((link) => (
                                    <div key={link.id} className="rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 p-3.5 space-y-2.5 transition">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate" title={link.productName}>
                                                    {link.productName}
                                                </p>
                                                <p className="text-[11px] font-mono text-slate-400">{link.productSku}</p>
                                            </div>
                                            {link.isPreferred ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200 shrink-0">
                                                    <Star className="h-3 w-3 fill-amber-500" />
                                                    Preferred
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickSetPreferred(link.id)}
                                                    className="inline-flex items-center gap-1 rounded-full bg-white hover:bg-amber-50 hover:text-amber-800 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500 transition shrink-0"
                                                    title="Set as Preferred Vendor"
                                                >
                                                    <Star className="h-3 w-3 text-slate-400" />
                                                    <span>Set Preferred</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Contract Cost</span>
                                                <p className="font-mono font-bold text-slate-900" title={formatCurrency(link.lastPurchasePrice)}>
                                                    {formatMoneyK(link.lastPurchasePrice)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Lead Time</span>
                                                <p className="font-medium text-slate-700">
                                                    {link.leadTimeDays != null ? `${link.leadTimeDays} days` : '—'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1 text-[11px]">
                                            <span className="font-mono text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                                                {link.supplierProductCode || 'No code'}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditModal(link)}
                                                    className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-white transition"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDeletingLink(link);
                                                        setDeleteError('');
                                                    }}
                                                    className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-white transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalItemsCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>
                            Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to{' '}
                            <span className="font-semibold text-slate-900">{endIndex}</span> of{' '}
                            <span className="font-semibold text-slate-900">{totalItemsCount}</span> {viewMode === 'table' ? 'sourcing links' : 'suppliers'}
                        </span>
                        <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
                            <span>Per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 font-medium focus:border-blue-500 focus:outline-none"
                            >
                                <option value={6}>6</option>
                                <option value={12}>12</option>
                                <option value={24}>24</option>
                                <option value={48}>48</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safeCurrentPage <= 1}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span>Previous</span>
                        </button>
                        <div className="px-3 text-xs font-semibold text-slate-700">
                            Page {safeCurrentPage} of {totalPages}
                        </div>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safeCurrentPage >= totalPages}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span>Next</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Link Product to Supplier</h2>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {createError && (
                            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <span>{createError}</span>
                            </div>
                        )}
                        {createSuccess && (
                            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                <span>{createSuccess}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Supplier <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Select a Supplier</option>
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Product <span className="text-red-500">*</span>
                                    {selectedSupplierId && (
                                        <span className="ml-1 text-[11px] font-normal text-slate-500">
                                            ({eligibleProductsForModal.length} authorized)
                                        </span>
                                    )}
                                </label>
                                {!selectedSupplierId ? (
                                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500">
                                        Please select a supplier first to view compatible authorized products.
                                    </div>
                                ) : loadingEligibleProducts ? (
                                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center gap-2">
                                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                        <span>Loading authorized products for this supplier...</span>
                                    </div>
                                ) : eligibleProductsForModal.length === 0 ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                        This supplier has no authorized categories configured. Configure categories under Supplier Details before linking products.
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select an Authorized Product ({eligibleProductsForModal.length})</option>
                                        {eligibleProductsForModal.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.sku}) — {p.categoryName || 'General'}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Supplier's Own Product Code
                                    <span className="ml-1 text-[11px] font-normal text-slate-400">(Optional — auto-generated if empty)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. SUP-VND-SKU (auto-generated if left blank)"
                                    value={supplierProductCode}
                                    onChange={(e) => setSupplierProductCode(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                        Last Purchase Price ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={lastPurchasePrice}
                                        onChange={(e) => setLastPurchasePrice(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                        Lead Time (Days)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="e.g. 7"
                                        value={leadTimeDays}
                                        onChange={(e) => setLeadTimeDays(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isPreferred"
                                    checked={isPreferred}
                                    onChange={(e) => setIsPreferred(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="isPreferred" className="text-sm font-medium text-slate-700 select-none">
                                    Set as Preferred Supplier for this Product
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createSubmitting}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {createSubmitting ? 'Saving...' : 'Create Link'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingLink && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Edit Supplier Product</h2>
                            <button
                                onClick={() => setEditingLink(null)}
                                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {editError && (
                            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <span>{editError}</span>
                            </div>
                        )}
                        {editSuccess && (
                            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                <span>{editSuccess}</span>
                            </div>
                        )}

                        <form onSubmit={handleUpdate} className="mt-4 space-y-4">
                            <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1">
                                <p className="text-slate-500">
                                    Supplier: <span className="font-semibold text-slate-900">{editingLink.supplierName}</span>
                                </p>
                                <p className="text-slate-500">
                                    Product: <span className="font-semibold text-slate-900">{editingLink.productName} ({editingLink.productSku})</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Supplier's Own Product Code
                                </label>
                                <input
                                    type="text"
                                    value={editSupplierProductCode}
                                    onChange={(e) => setEditSupplierProductCode(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                        Last Purchase Price ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editLastPurchasePrice}
                                        onChange={(e) => setEditLastPurchasePrice(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                        Lead Time (Days)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editLeadTimeDays}
                                        onChange={(e) => setEditLeadTimeDays(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="editIsPreferred"
                                    checked={editIsPreferred}
                                    onChange={(e) => setEditIsPreferred(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="editIsPreferred" className="text-sm font-medium text-slate-700 select-none">
                                    Preferred Supplier for this Product
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingLink(null)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {editSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingLink && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                        <h2 className="text-lg font-semibold text-slate-900">Delete Supplier Product Link</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Are you sure you want to remove the link between <strong className="text-slate-900">{deletingLink.supplierName}</strong> and <strong className="text-slate-900">{deletingLink.productName}</strong>?
                        </p>

                        {deleteError && (
                            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <span>{deleteError}</span>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeletingLink(null)}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleteSubmitting}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                            >
                                {deleteSubmitting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierProductsPage;
