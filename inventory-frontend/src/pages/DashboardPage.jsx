import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import supplierService from '../services/supplierService';
import customerService from '../services/customerService';
import { formatMoneyK, formatCurrency } from '../utils/formatUtils';
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
    ExternalLink
} from 'lucide-react';

export const DashboardPage = () => {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [prodSearch, setProdSearch] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [whData, prodData, supData, custData] = await Promise.all([
                warehouseService.getAll().catch(() => []),
                productService.getAll().catch(() => []),
                supplierService.getAll().catch(() => []),
                customerService.getAll().catch(() => [])
            ]);
            setWarehouses(whData || []);
            setProducts(prodData || []);
            setSuppliers(supData || []);
            setCustomers(custData || []);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('Could not load all dashboard data from API. Ensure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const activeWarehouses = warehouses.filter((w) => w.isActive);
    const activeProducts = products.filter((p) => p.isActive);
    const activeSuppliers = suppliers.filter((s) => s.isActive);
    const activeCustomers = customers.filter((c) => c.isActive);

    const filteredDashboardProducts = useMemo(() => {
        if (!prodSearch.trim()) return products.slice(0, 6);
        const q = prodSearch.toLowerCase();
        return products.filter((p) =>
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.categoryName?.toLowerCase().includes(q) ||
            p.brandName?.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [products, prodSearch]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Welcome back, {user?.fullName || 'User'}!
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Real-time overview of warehouses, inventory catalog, commercial partners, and movements.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                        title="Reload latest metrics"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Refresh Data</span>
                    </button>
                    <Link
                        to="/stock-movements"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 shadow-blue-500/20"
                    >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        <span>Record Movement</span>
                    </Link>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Core Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Warehouses Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-blue-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Warehouses
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                            <Warehouse className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                            {loading ? '-' : warehouses.length}
                        </span>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            {activeWarehouses.length} Active
                        </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span>Logistics facilities</span>
                        <Link to="/warehouses" className="font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                            <span>Manage</span>
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>

                {/* Products Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-emerald-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Catalog Products
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                            <Package className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                            {loading ? '-' : products.length}
                        </span>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            {activeProducts.length} Active
                        </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span>Global SKU catalog</span>
                        <Link to="/products" className="font-semibold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1">
                            <span>Catalog</span>
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>

                {/* Suppliers Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-indigo-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Vendors & Suppliers
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                            <Truck className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                            {loading ? '-' : suppliers.length}
                        </span>
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                            {activeSuppliers.length} Active
                        </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span>Authorized vendors</span>
                        <Link to="/suppliers" className="font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                            <span>Suppliers</span>
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>

                {/* Customers Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-amber-200 group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Customers
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                            {loading ? '-' : customers.length}
                        </span>
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                            {activeCustomers.length} Active
                        </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span>Commercial clients</span>
                        <Link to="/sales-orders" className="font-semibold text-amber-600 hover:text-amber-800 inline-flex items-center gap-1">
                            <span>Orders</span>
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quick Overview Section: Warehouses & Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Warehouses Facilities */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                <Warehouse className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Warehouse Network</h2>
                                <p className="text-[11px] text-slate-400">Configured fulfillment & storage centers</p>
                            </div>
                        </div>
                        <Link to="/warehouses" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                            View All ({warehouses.length}) &rarr;
                        </Link>
                    </div>

                    <div className="divide-y divide-slate-100 flex-1">
                        {warehouses.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                {loading ? 'Loading warehouses...' : 'No warehouses configured.'}
                            </div>
                        ) : (
                            warehouses.slice(0, 5).map((wh) => (
                                <Link
                                    key={wh.id}
                                    to={`/warehouses/${wh.id}`}
                                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition group"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition">
                                                {wh.name}
                                            </p>
                                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                {wh.code}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {wh.address || 'Standard fulfillment warehouse'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                                            wh.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {wh.isActive ? 'Active Facility' : 'Inactive'}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Catalog Products Showcase */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                <Package className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Catalog Products</h2>
                                <p className="text-[11px] text-slate-400">Featured items and inventory SKU status</p>
                            </div>
                        </div>
                        <Link to="/products" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">
                            Full Catalog ({products.length}) &rarr;
                        </Link>
                    </div>

                    {/* Quick Search on Dashboard */}
                    <div className="px-6 py-2.5 bg-slate-50/60 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter products by name, SKU, or category..."
                                value={prodSearch}
                                onChange={(e) => setProdSearch(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100 flex-1">
                        {filteredDashboardProducts.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                {loading ? 'Loading catalog...' : 'No products found matching query.'}
                            </div>
                        ) : (
                            filteredDashboardProducts.map((prod) => (
                                <div key={prod.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/80 transition group">
                                    <div className="space-y-1 min-w-0 pr-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition truncate">
                                                {prod.name}
                                            </p>
                                            <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                {prod.sku}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                                <Layers className="h-2.5 w-2.5 text-slate-400" />
                                                <span>{prod.categoryName || 'General'}</span>
                                            </span>
                                            {prod.brandName && (
                                                <span className="text-[11px] font-medium text-slate-500">
                                                    &bull; {prod.brandName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200" title={formatCurrency(prod.sellingPrice)}>
                                                {prod.sellingPrice > 0 ? formatMoneyK(prod.sellingPrice) : 'Tracked Unit'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                                {prod.unitOfMeasureName || prod.unitOfMeasure || 'Units'}
                                            </div>
                                        </div>
                                        <Link
                                            to={`/stock-movements?productId=${prod.id}`}
                                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition"
                                            title="Move or purchase this product"
                                        >
                                            <ArrowLeftRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
