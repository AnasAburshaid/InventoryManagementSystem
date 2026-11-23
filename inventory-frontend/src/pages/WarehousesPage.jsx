import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import warehouseService from '../services/warehouseService';
import {
    Warehouse,
    Plus,
    Search,
    MapPin,
    Hash,
    Calendar,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    X
} from 'lucide-react';

export const WarehousesPage = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalName, setModalName] = useState('');
    const [modalAddress, setModalAddress] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');

    const fetchWarehouses = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await warehouseService.getAll();
            setWarehouses(data || []);
        } catch (err) {
            console.error('Error fetching warehouses:', err);
            setError('Failed to load warehouses from backend.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const handleCreateWarehouse = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setModalError('');
        setModalSuccess('');

        try {
            const newWarehouse = await warehouseService.create({
                name: modalName.trim(),
                address: modalAddress.trim() || null
            });
            setModalSuccess(`Warehouse "${newWarehouse.name}" created successfully with code ${newWarehouse.code}!`);
            setModalName('');
            setModalAddress('');
            fetchWarehouses();
            setTimeout(() => {
                setIsModalOpen(false);
                setModalSuccess('');
            }, 1500);
        } catch (err) {
            console.error('Create warehouse error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to create warehouse.';
            setModalError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredWarehouses = warehouses.filter((w) =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.code.toLowerCase().includes(search.toLowerCase()) ||
        (w.address && w.address.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Warehouses</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage your distribution hubs, fulfillment centers, and warehouse properties.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchWarehouses}
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
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 shadow-blue-500/20"
                    >
                        <Plus className="h-4 w-4" />
                        <span>New Warehouse</span>
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
                        placeholder="Search by warehouse name, code, or address..."
                        className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            {/* Warehouse Cards Grid */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                </div>
            ) : filteredWarehouses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <Warehouse className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-4 text-sm font-semibold text-slate-900">No warehouses found</h3>
                    <p className="mt-1 text-xs text-slate-500">
                        {search ? 'Try modifying your search filter.' : 'Get started by creating your first warehouse facility.'}
                    </p>
                    {!search && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Warehouse</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredWarehouses.map((wh) => (
                        <div
                            key={wh.id}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <Warehouse className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-slate-900">{wh.name}</h3>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                <Hash className="h-3 w-3 text-slate-400" />
                                                <span className="font-mono font-medium text-slate-700">{wh.code}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            wh.isActive
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {wh.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                                        <span>{wh.address || 'No physical address specified'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                                        <span>Created {new Date(wh.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
                                <span className="font-mono text-[11px] text-slate-400">ID: {wh.id.substring(0, 8)}...</span>
                                <Link
                                    to={`/warehouses/${wh.id}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                                >
                                    <span>View Inventory & Details</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Warehouse Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <Warehouse className="h-5 w-5 text-blue-600" />
                                <h3 className="text-base font-semibold text-slate-900">Create New Warehouse</h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
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

                        <form onSubmit={handleCreateWarehouse} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Warehouse Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    minLength={2}
                                    maxLength={100}
                                    value={modalName}
                                    onChange={(e) => setModalName(e.target.value)}
                                    placeholder="e.g. Central Logistics Hub"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Physical Address (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    maxLength={250}
                                    value={modalAddress}
                                    onChange={(e) => setModalAddress(e.target.value)}
                                    placeholder="e.g. 742 Evergreen Terrace, Sector 4"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    The warehouse code (e.g. WH-001) will be generated automatically.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
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
                                        <span>Create Warehouse</span>
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

export default WarehousesPage;
