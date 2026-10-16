import React, { useState, useEffect } from 'react';
import customerService from '../services/customerService';
import {
    Users,
    Plus,
    Search,
    Mail,
    Phone,
    Calendar,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    X
} from 'lucide-react';

export const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');

    const fetchCustomers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await customerService.getAll();
            setCustomers(data || []);
        } catch (err) {
            console.error('Error fetching customers:', err);
            setError('Failed to load customers from backend.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setModalError('');
        setModalSuccess('');

        try {
            const newCustomer = await customerService.create({
                name: name.trim(),
                email: email.trim() || null,
                phone: phone.trim() || null
            });

            setModalSuccess(`Customer "${newCustomer.name}" added successfully!`);
            setName('');
            setEmail('');
            setPhone('');
            fetchCustomers();
            setTimeout(() => {
                setIsModalOpen(false);
                setModalSuccess('');
            }, 1500);
        } catch (err) {
            console.error('Create customer error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to add customer.';
            setModalError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCustomers = customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
        (c.phone && c.phone.includes(search))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage customer accounts, sales destinations, and client contact profiles.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchCustomers}
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
                        <span>New Customer</span>
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
                        placeholder="Search by customer name, email, or phone..."
                        className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            {/* Customers Grid */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-4 text-sm font-semibold text-slate-900">No customers found</h3>
                    <p className="mt-1 text-xs text-slate-500">
                        {search ? 'Try modifying your search filter.' : 'Add your first customer account.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredCustomers.map((cust) => (
                        <div key={cust.id} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900">{cust.name}</h3>
                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                            {cust.isActive ? 'Active Client' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                                {cust.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                        <a href={`mailto:${cust.email}`} className="text-blue-600 hover:underline">{cust.email}</a>
                                    </div>
                                )}
                                {cust.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                                        <span>{cust.phone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Calendar className="h-4 w-4 shrink-0" />
                                    <span>Joined {new Date(cust.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Customer Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="text-base font-semibold text-slate-900">Add New Customer</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
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

                        <form onSubmit={handleCreateCustomer} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Customer Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Apex Retail Stores"
                                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="contact@apexstores.com"
                                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1 555-0822"
                                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                                >
                                    {submitting ? 'Saving...' : 'Add Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersPage;
