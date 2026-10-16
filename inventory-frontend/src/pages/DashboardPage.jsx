import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import {
    Warehouse,
    Package,
    ArrowLeftRight,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Plus,
    Boxes
} from 'lucide-react';

export const DashboardPage = () => {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [whData, prodData] = await Promise.all([
                warehouseService.getAll().catch(() => []),
                productService.getAll().catch(() => [])
            ]);
            setWarehouses(whData || []);
            setProducts(prodData || []);
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

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Welcome back, {user?.fullName || 'User'}!
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Here is what is happening across your warehouse facilities and product inventory.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Refresh Data</span>
                    </button>
                    <Link
                        to="/stock-movements"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 shadow-blue-500/20"
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

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Warehouses Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Total Warehouses
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Warehouse className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tight text-slate-900">
                            {loading ? '-' : warehouses.length}
                        </span>
                        <span className="text-xs text-slate-500">
                            ({activeWarehouses.length} active)
                        </span>
                    </div>
                    <div className="mt-4 text-xs font-medium text-blue-600 hover:text-blue-700">
                        <Link to="/warehouses" className="hover:underline">View all warehouses &rarr;</Link>
                    </div>
                </div>

                {/* Products Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Catalog Products
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Package className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tight text-slate-900">
                            {loading ? '-' : products.length}
                        </span>
                        <span className="text-xs text-slate-500">
                            ({activeProducts.length} active)
                        </span>
                    </div>
                    <div className="mt-4 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                        <Link to="/products" className="hover:underline">View product catalog &rarr;</Link>
                    </div>
                </div>

                {/* System Status Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            API Health
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-xl font-bold tracking-tight text-slate-900">
                            Operational
                        </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        REST API on Port 5068
                    </p>
                </div>

                {/* Inventory Security Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Active Session
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-lg font-bold tracking-tight text-slate-900 truncate">
                            {user?.roles?.[0] || 'Authenticated'}
                        </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 truncate">
                        {user?.email}
                    </p>
                </div>
            </div>

            {/* Quick Overview Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Warehouses Table */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-slate-500" />
                            <h2 className="text-sm font-semibold text-slate-900">Warehouses ({warehouses.length})</h2>
                        </div>
                        <Link to="/warehouses" className="text-xs font-semibold text-blue-600 hover:underline">
                            Manage
                        </Link>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {warehouses.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                {loading ? 'Loading warehouses...' : 'No warehouses found in database yet.'}
                            </div>
                        ) : (
                            warehouses.slice(0, 5).map((wh) => (
                                <div key={wh.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/60 transition">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{wh.name}</p>
                                        <p className="text-xs text-slate-400">Code: <span className="font-mono text-slate-600">{wh.code}</span> &bull; {wh.address || 'No address'}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        wh.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {wh.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Products Table */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-slate-500" />
                            <h2 className="text-sm font-semibold text-slate-900">Catalog Products ({products.length})</h2>
                        </div>
                        <Link to="/products" className="text-xs font-semibold text-blue-600 hover:underline">
                            Manage
                        </Link>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {products.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                {loading ? 'Loading catalog...' : 'No products found in database yet.'}
                            </div>
                        ) : (
                            products.slice(0, 5).map((prod) => (
                                <div key={prod.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/60 transition">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{prod.name}</p>
                                        <p className="text-xs text-slate-400">SKU: <span className="font-mono text-slate-600">{prod.sku}</span> &bull; {prod.unitOfMeasureName || prod.unitOfMeasure}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        prod.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {prod.isActive ? 'Active' : 'Inactive'}
                                    </span>
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
