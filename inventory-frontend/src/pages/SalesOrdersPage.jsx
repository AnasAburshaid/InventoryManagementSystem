import React, { useState, useEffect } from 'react';
import salesOrderService from '../services/salesOrderService';
import customerService from '../services/customerService';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import {
    getTodayLocalDateString,
    formatDateOnly,
    formatDateTime,
    localDateToStartOfDayIso,
    localDateToEndOfDayIso
} from '../utils/dateUtils';
import { formatMoneyK, formatCurrency } from '../utils/formatUtils';
import {
    ShoppingCart,
    Plus,
    Search,
    Filter,
    Eye,
    Trash2,
    Calendar,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    X,
    Clock,
    DollarSign,
    Package,
    Users,
    Warehouse,
    ArrowUpRight,
    Send,
    Ban,
    FileText,
    CheckCheck,
    CheckCircle,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const STATUS_BADGES = {
    Draft: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    Confirmed: { label: 'Confirmed', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    PartiallyFulfilled: { label: 'Partially Fulfilled', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    Fulfilled: { label: 'Fulfilled', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Cancelled: { label: 'Cancelled', bg: 'bg-red-50 text-red-700 border-red-200' }
};

export const SalesOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // Filter states
    const [statusFilter, setStatusFilter] = useState('');
    const [customerFilter, setCustomerFilter] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [fromDateFilter, setFromDateFilter] = useState('');
    const [toDateFilter, setToDateFilter] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Create Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createCustomerId, setCreateCustomerId] = useState('');
    const [createWarehouseId, setCreateWarehouseId] = useState('');
    const [createOrderDate, setCreateOrderDate] = useState(getTodayLocalDateString());
    const [createNotes, setCreateNotes] = useState('');
    const [createLines, setCreateLines] = useState([
        { productId: '', quantityOrdered: 1, unitPrice: 0 }
    ]);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');

    // Detail Drawer / Modal state
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [detailSuccess, setDetailSuccess] = useState('');

    // Add Line in Detail Modal state
    const [isAddingLine, setIsAddingLine] = useState(false);
    const [newLineProductId, setNewLineProductId] = useState('');
    const [newLineQuantity, setNewLineQuantity] = useState(1);
    const [newLineUnitPrice, setNewLineUnitPrice] = useState(0);
    const [lineSubmitting, setLineSubmitting] = useState(false);

    // Fulfill Goods Modal state
    const [isFulfillOpen, setIsFulfillOpen] = useState(false);
    const [fulfillQuantities, setFulfillQuantities] = useState({});
    const [fulfillSubmitting, setFulfillSubmitting] = useState(false);
    const [fulfillError, setFulfillError] = useState('');

    // Confirm / Cancel / Delete Confirmation states
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'confirm'|'cancel'|'delete', orderId, orderNumber }
    const [actionReason, setActionReason] = useState('');
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [actionError, setActionError] = useState('');

    const fetchInitialData = async () => {
        setLoading(true);
        setError('');
        try {
            const [ordersData, customersData, warehousesData, productsData] = await Promise.all([
                salesOrderService.getAll(),
                customerService.getAll(),
                warehouseService.getAll(),
                productService.getAll()
            ]);
            setOrders(ordersData || []);
            setCustomers(customersData || []);
            setWarehouses(warehousesData || []);
            setProducts(productsData || []);
        } catch (err) {
            console.error('Fetch sales orders error:', err);
            setError('Failed to load sales orders.');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrdersOnly = async () => {
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (customerFilter) params.customerId = customerFilter;
            if (warehouseFilter) params.warehouseId = warehouseFilter;
            if (fromDateFilter) params.fromDate = localDateToStartOfDayIso(fromDateFilter);
            if (toDateFilter) params.toDate = localDateToEndOfDayIso(toDateFilter);
            const data = await salesOrderService.getAll(params);
            setOrders(data || []);
        } catch (err) {
            console.error('Refetch sales orders error:', err);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchOrdersOnly();
        setCurrentPage(1);
    }, [statusFilter, customerFilter, warehouseFilter, fromDateFilter, toDateFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const refreshSelectedOrder = async (orderId) => {
        setDetailLoading(true);
        try {
            const updated = await salesOrderService.getById(orderId);
            setSelectedOrder(updated);
            fetchOrdersOnly();
        } catch (err) {
            console.error('Refresh sales order error:', err);
            setDetailError('Failed to refresh order details.');
        } finally {
            setDetailLoading(false);
        }
    };

    // Create Line Handlers
    const handleAddCreateLine = () => {
        setCreateLines([...createLines, { productId: '', quantityOrdered: 1, unitPrice: 0 }]);
    };

    const handleRemoveCreateLine = (index) => {
        if (createLines.length === 1) return;
        setCreateLines(createLines.filter((_, i) => i !== index));
    };

    const handleCreateLineChange = (index, field, value) => {
        const nextLines = [...createLines];
        nextLines[index] = { ...nextLines[index], [field]: value };

        // When product changes, auto-fill standard selling price
        if (field === 'productId') {
            const selectedProduct = products.find((p) => p.id === value);
            if (selectedProduct && selectedProduct.sellingPrice !== undefined) {
                nextLines[index].unitPrice = selectedProduct.sellingPrice;
            }
        }

        setCreateLines(nextLines);
    };

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        setCreateSubmitting(true);
        setCreateError('');
        setCreateSuccess('');

        if (!createCustomerId || !createWarehouseId) {
            setCreateError('Please select both a customer and a fulfillment warehouse.');
            setCreateSubmitting(false);
            return;
        }

        // Validate lines
        for (let i = 0; i < createLines.length; i++) {
            const line = createLines[i];
            if (!line.productId) {
                setCreateError(`Please select a product for line item #${i + 1}.`);
                setCreateSubmitting(false);
                return;
            }
            if (parseFloat(line.quantityOrdered) <= 0 || isNaN(line.quantityOrdered)) {
                setCreateError(`Quantity for line item #${i + 1} must be greater than 0.`);
                setCreateSubmitting(false);
                return;
            }
            if (parseFloat(line.unitPrice) < 0 || isNaN(line.unitPrice)) {
                setCreateError(`Unit price for line item #${i + 1} cannot be negative.`);
                setCreateSubmitting(false);
                return;
            }
        }

        const distinctProducts = new Set(createLines.map((l) => l.productId));
        if (distinctProducts.size !== createLines.length) {
            setCreateError('A product cannot appear multiple times in the same sales order. Please combine quantities.');
            setCreateSubmitting(false);
            return;
        }

        try {
            const payload = {
                customerId: createCustomerId,
                warehouseId: createWarehouseId,
                orderDate: createOrderDate ? localDateToStartOfDayIso(createOrderDate) : null,
                notes: createNotes.trim() || null,
                lines: createLines.map((l) => ({
                    productId: l.productId,
                    quantityOrdered: parseFloat(l.quantityOrdered),
                    unitPrice: parseFloat(l.unitPrice)
                }))
            };

            const created = await salesOrderService.create(payload);
            setCreateSuccess(`Sales Order ${created.salesOrderNumber} created successfully!`);
            fetchOrdersOnly();

            setTimeout(() => {
                setIsCreateOpen(false);
                setCreateSuccess('');
                setCreateCustomerId('');
                setCreateWarehouseId('');
                setCreateOrderDate(getTodayLocalDateString());
                setCreateNotes('');
                setCreateLines([{ productId: '', quantityOrdered: 1, unitPrice: 0 }]);
            }, 1200);
        } catch (err) {
            console.error('Create SO error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to create sales order.';
            setCreateError(msg);
        } finally {
            setCreateSubmitting(false);
        }
    };

    // Detail Action Handlers
    const handleAddLineToOrder = async (e) => {
        e.preventDefault();
        setLineSubmitting(true);
        setDetailError('');
        setDetailSuccess('');

        if (!newLineProductId) {
            setDetailError('Please select a product.');
            setLineSubmitting(false);
            return;
        }

        try {
            await salesOrderService.addLine(selectedOrder.id, {
                productId: newLineProductId,
                quantityOrdered: parseFloat(newLineQuantity),
                unitPrice: parseFloat(newLineUnitPrice)
            });

            setDetailSuccess('Line added successfully!');
            setIsAddingLine(false);
            setNewLineProductId('');
            setNewLineQuantity(1);
            setNewLineUnitPrice(0);
            refreshSelectedOrder(selectedOrder.id);
        } catch (err) {
            console.error('Add SO line error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to add line item.';
            setDetailError(msg);
        } finally {
            setLineSubmitting(false);
        }
    };

    const handleDeleteLine = async (lineId) => {
        setDetailError('');
        setDetailSuccess('');
        try {
            await salesOrderService.deleteLine(lineId);
            setDetailSuccess('Line item removed.');
            refreshSelectedOrder(selectedOrder.id);
        } catch (err) {
            console.error('Delete SO line error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to delete line.';
            setDetailError(msg);
        }
    };

    // Open Fulfill Goods Modal
    const openFulfillModal = () => {
        if (!selectedOrder) return;
        const initial = {};
        selectedOrder.lines.forEach((line) => {
            const remaining = line.quantityOrdered - line.quantityFulfilled;
            initial[line.id] = remaining > 0 ? remaining : 0;
        });
        setFulfillQuantities(initial);
        setFulfillError('');
        setIsFulfillOpen(true);
    };

    const handleFulfillSubmit = async (e) => {
        e.preventDefault();
        setFulfillSubmitting(true);
        setFulfillError('');

        const items = Object.entries(fulfillQuantities)
            .filter(([_, qty]) => parseFloat(qty) > 0)
            .map(([lineId, qty]) => ({
                salesOrderLineId: lineId,
                quantityToFulfill: parseFloat(qty)
            }));

        if (items.length === 0) {
            setFulfillError('Please enter a quantity greater than 0 for at least one item.');
            setFulfillSubmitting(false);
            return;
        }

        try {
            await salesOrderService.fulfill(selectedOrder.id, items);
            setIsFulfillOpen(false);
            setDetailSuccess('Goods successfully dispatched and outbound Stock Movements recorded!');
            refreshSelectedOrder(selectedOrder.id);
        } catch (err) {
            console.error('Fulfill order error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to fulfill sales order.';
            setFulfillError(msg);
        } finally {
            setFulfillSubmitting(false);
        }
    };

    // Status Actions: Confirm, Cancel, Delete
    const executeConfirmAction = async () => {
        if (!confirmAction) return;
        setActionSubmitting(true);
        setActionError('');

        try {
            if (confirmAction.type === 'confirm') {
                await salesOrderService.confirm(confirmAction.orderId);
            } else if (confirmAction.type === 'cancel') {
                await salesOrderService.cancel(confirmAction.orderId, actionReason.trim() || null);
            } else if (confirmAction.type === 'delete') {
                await salesOrderService.delete(confirmAction.orderId);
                setSelectedOrder(null);
            }

            fetchOrdersOnly();
            if (selectedOrder && confirmAction.type !== 'delete') {
                refreshSelectedOrder(confirmAction.orderId);
            }
            setConfirmAction(null);
            setActionReason('');
        } catch (err) {
            console.error('Execute action error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Action failed.';
            setActionError(msg);
        } finally {
            setActionSubmitting(false);
        }
    };

    // Filtered orders list
    const filteredOrders = orders.filter((o) => {
        const matchesSearch =
            o.salesOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
            o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
            o.warehouseName?.toLowerCase().includes(search.toLowerCase()) ||
            (o.notes && o.notes.toLowerCase().includes(search.toLowerCase()));

        return matchesSearch;
    });

    // Metrics summary
    const totalOrdersCount = orders.length;
    const draftsCount = orders.filter((o) => o.status === 'Draft').length;
    const readyForFulfillmentCount = orders.filter(
        (o) => o.status === 'Confirmed' || o.status === 'PartiallyFulfilled'
    ).length;
    const completedCount = orders.filter((o) => o.status === 'Fulfilled').length;
    const cancelledCount = orders.filter((o) => o.status === 'Cancelled').length;
    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredOrders.length);
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales Orders</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Track customer orders, verify available stock, and fulfill outbound shipments from assigned warehouses.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchInitialData}
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
                        <span>Create Sales Order</span>
                    </button>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <ShoppingCart className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Total Orders</p>
                            <p className="text-xl font-bold text-slate-900">{totalOrdersCount}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Drafts</p>
                            <p className="text-xl font-bold text-slate-900">{draftsCount}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Ready to Fulfill</p>
                            <p className="text-xl font-bold text-slate-900">{readyForFulfillmentCount}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <CheckCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Completed Orders</p>
                            <p className="text-xl font-bold text-slate-900">{completedCount}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <DollarSign className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Total Revenue</p>
                            <p className="text-xl font-bold text-slate-900" title={formatCurrency(totalSales)}>{formatMoneyK(totalSales)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Status Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                    { key: '', label: 'All Orders', count: totalOrdersCount },
                    { key: 'Draft', label: 'Drafts', count: draftsCount },
                    { key: 'Confirmed', label: 'Ready to Fulfill', count: readyForFulfillmentCount },
                    { key: 'Fulfilled', label: 'Completed', count: completedCount },
                    { key: 'Cancelled', label: 'Cancelled', count: cancelledCount }
                ].map((tab) => {
                    const isActive = statusFilter === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setStatusFilter(tab.key)}
                            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                                isActive
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 text-slate-700'
                                }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search SO number, customer, warehouse, notes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">All Statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="PartiallyFulfilled">Partially Fulfilled</option>
                        <option value="Fulfilled">Fulfilled</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>

                    <select
                        value={customerFilter}
                        onChange={(e) => setCustomerFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">All Customers</option>
                        {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">All Source Warehouses</option>
                        {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name} ({w.code})
                            </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5">
                        <span className="text-[11px] font-medium text-slate-500">From:</span>
                        <input
                            type="date"
                            value={fromDateFilter}
                            onChange={(e) => setFromDateFilter(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5">
                        <span className="text-[11px] font-medium text-slate-500">To:</span>
                        <input
                            type="date"
                            value={toDateFilter}
                            onChange={(e) => setToDateFilter(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 focus:outline-none"
                        />
                    </div>

                    {(statusFilter || customerFilter || warehouseFilter || fromDateFilter || toDateFilter) && (
                        <button
                            onClick={() => {
                                setStatusFilter('');
                                setCustomerFilter('');
                                setWarehouseFilter('');
                                setFromDateFilter('');
                                setToDateFilter('');
                            }}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                            title="Clear Filters"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-5 py-3.5">SO Number</th>
                                <th className="px-5 py-3.5">Customer</th>
                                <th className="px-5 py-3.5">Fulfillment Warehouse</th>
                                <th className="px-5 py-3.5">Order Date</th>
                                <th className="px-5 py-3.5">Status</th>
                                <th className="px-5 py-3.5">Items</th>
                                <th className="px-5 py-3.5">Total Amount</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                                            <span>Loading sales orders...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                                        No sales orders found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrders.map((order) => {
                                    const badge = STATUS_BADGES[order.status] || {
                                        label: order.status,
                                        bg: 'bg-slate-100 text-slate-700'
                                    };
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50/70 transition">
                                            <td className="px-5 py-4 font-mono font-semibold text-blue-600">
                                                {order.salesOrderNumber}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-slate-400" />
                                                    <span className="font-medium text-slate-900">{order.customerName}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Warehouse className="h-4 w-4 text-slate-400" />
                                                    <span>{order.warehouseName}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600">
                                                {formatDateOnly(order.orderDate)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${badge.bg}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600">
                                                {order.lines ? order.lines.length : 0} lines ({order.totalOrderedQuantity} units)
                                            </td>
                                            <td className="px-5 py-4 font-semibold text-slate-900" title={formatCurrency(order.totalAmount)}>
                                                {formatMoneyK(order.totalAmount)}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setDetailError('');
                                                        setDetailSuccess('');
                                                    }}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    <span>Manage</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredOrders.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-3">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>
                                Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to{' '}
                                <span className="font-semibold text-slate-900">{endIndex}</span> of{' '}
                                <span className="font-semibold text-slate-900">{filteredOrders.length}</span> orders
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
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
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
            </div>

            {/* Create Sales Order Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Create Sales Order</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Initial order is created in Draft status. Physical inventory is only decremented when items are fulfilled.
                                </p>
                            </div>
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

                        <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                        Customer <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={createCustomerId}
                                        onChange={(e) => setCreateCustomerId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select Customer</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                        Fulfillment Warehouse <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={createWarehouseId}
                                        onChange={(e) => setCreateWarehouseId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select Warehouse</option>
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name} ({w.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                        Order Date
                                    </label>
                                    <input
                                        type="date"
                                        value={createOrderDate}
                                        onChange={(e) => setCreateOrderDate(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                        Notes / Order Reference
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Customer reference or delivery notes..."
                                        value={createNotes}
                                        onChange={(e) => setCreateNotes(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Line Items Editor */}
                            <div className="pt-2">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Order Line Items ({createLines.length})
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleAddCreateLine}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Add Line</span>
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {createLines.map((line, index) => {
                                        const lineTotal =
                                            (parseFloat(line.quantityOrdered) || 0) * (parseFloat(line.unitPrice) || 0);
                                        return (
                                            <div
                                                key={index}
                                                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border border-slate-200 p-3 bg-slate-50/50"
                                            >
                                                <span className="text-xs font-mono font-bold text-slate-400 w-6">
                                                    #{index + 1}
                                                </span>
                                                <div className="flex-1 w-full">
                                                    <select
                                                        required
                                                        value={line.productId}
                                                        onChange={(e) =>
                                                            handleCreateLineChange(index, 'productId', e.target.value)
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none bg-white"
                                                    >
                                                        <option value="">Select Product</option>
                                                        {products.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} ({p.sku}) — Standard Price: ${Number(p.sellingPrice || 0).toFixed(2)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="w-full sm:w-28">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        required
                                                        placeholder="Quantity"
                                                        value={line.quantityOrdered}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '') {
                                                                handleCreateLineChange(index, 'quantityOrdered', '');
                                                            } else {
                                                                const intVal = parseInt(val, 10);
                                                                handleCreateLineChange(index, 'quantityOrdered', isNaN(intVal) ? '' : Math.max(1, intVal));
                                                            }
                                                        }}
                                                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none bg-white font-mono"
                                                    />
                                                </div>
                                                <div className="w-full sm:w-28">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        required
                                                        placeholder="Unit Price ($)"
                                                        value={line.unitPrice}
                                                        onChange={(e) =>
                                                            handleCreateLineChange(index, 'unitPrice', e.target.value)
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none bg-white"
                                                    />
                                                </div>
                                                <div className="w-full sm:w-28 text-right font-semibold text-xs text-slate-900">
                                                    ${lineTotal.toFixed(2)}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCreateLine(index)}
                                                    disabled={createLines.length === 1}
                                                    className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 flex justify-end gap-3 text-sm font-semibold text-slate-900 border-t border-slate-100 pt-3">
                                    <span>Total Order Amount:</span>
                                    <span className="text-blue-600 font-bold">
                                        $
                                        {createLines
                                            .reduce(
                                                (acc, l) =>
                                                    acc +
                                                    (parseFloat(l.quantityOrdered) || 0) * (parseFloat(l.unitPrice) || 0),
                                                0
                                            )
                                            .toFixed(2)}
                                    </span>
                                </div>
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
                                    {createSubmitting ? 'Creating Order...' : 'Create Draft Sales Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View / Manage Sales Order Drawer / Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl my-8">
                        {/* Drawer Header */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold font-mono text-slate-900">
                                        {selectedOrder.salesOrderNumber}
                                    </h2>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                            STATUS_BADGES[selectedOrder.status]?.bg || 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {STATUS_BADGES[selectedOrder.status]?.label || selectedOrder.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Customer: <strong className="text-slate-700">{selectedOrder.customerName}</strong> | Fulfillment: <strong className="text-slate-700">{selectedOrder.warehouseName}</strong> ({selectedOrder.warehouseCode})
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {detailError && (
                            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <span>{detailError}</span>
                            </div>
                        )}
                        {detailSuccess && (
                            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                <span>{detailSuccess}</span>
                            </div>
                        )}

                        {/* Order Summary Cards */}
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-lg p-3 text-xs">
                            <div>
                                <span className="text-slate-400">Order Date:</span>
                                <p className="font-semibold text-slate-800">
                                    {formatDateOnly(selectedOrder.orderDate)}
                                </p>
                            </div>
                            <div>
                                <span className="text-slate-400">Customer Contact:</span>
                                <p className="font-semibold text-slate-800">
                                    {selectedOrder.customerEmail || 'No email on record'}
                                </p>
                            </div>
                            <div>
                                <span className="text-slate-400">Total Items:</span>
                                <p className="font-semibold text-slate-800">
                                    {selectedOrder.lines ? selectedOrder.lines.length : 0} lines ({selectedOrder.totalOrderedQuantity} units)
                                </p>
                            </div>
                            <div>
                                <span className="text-slate-400">Total Amount:</span>
                                <p className="font-bold text-emerald-600 text-sm" title={formatCurrency(selectedOrder.totalAmount)}>
                                    {formatMoneyK(selectedOrder.totalAmount)}
                                </p>
                            </div>
                        </div>

                        {selectedOrder.notes && (
                            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                                <span className="font-semibold text-slate-900 block mb-1">Notes:</span>
                                {selectedOrder.notes}
                            </div>
                        )}

                        {/* Order Lines Table */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
                                {selectedOrder.status === 'Draft' && !isAddingLine && (
                                    <button
                                        onClick={() => setIsAddingLine(true)}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-blue-600"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Add Item</span>
                                    </button>
                                )}
                            </div>

                            {/* Add Line Form */}
                            {isAddingLine && (
                                <form
                                    onSubmit={handleAddLineToOrder}
                                    className="mb-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 flex flex-wrap items-center gap-3"
                                >
                                    <div className="flex-1 min-w-[200px]">
                                        <select
                                            required
                                            value={newLineProductId}
                                            onChange={(e) => {
                                                setNewLineProductId(e.target.value);
                                                const p = products.find((prod) => prod.id === e.target.value);
                                                if (p && p.sellingPrice !== undefined) {
                                                    setNewLineUnitPrice(p.sellingPrice);
                                                }
                                            }}
                                            className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                                        >
                                            <option value="">Select Product</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.sku})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            required
                                            placeholder="Qty"
                                            value={newLineQuantity}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '') {
                                                    setNewLineQuantity('');
                                                } else {
                                                    const intVal = parseInt(val, 10);
                                                    setNewLineQuantity(isNaN(intVal) ? '' : Math.max(1, intVal));
                                                }
                                            }}
                                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs bg-white font-mono"
                                        />
                                    </div>
                                    <div className="w-28">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            required
                                            placeholder="Price ($)"
                                            value={newLineUnitPrice}
                                            onChange={(e) => setNewLineUnitPrice(e.target.value)}
                                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs bg-white"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="submit"
                                            disabled={lineSubmitting}
                                            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                        >
                                            {lineSubmitting ? 'Adding...' : 'Add'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingLine(false)}
                                            className="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-2.5">Line #</th>
                                            <th className="px-4 py-2.5">Product</th>
                                            <th className="px-4 py-2.5">Ordered</th>
                                            <th className="px-4 py-2.5">Fulfilled</th>
                                            <th className="px-4 py-2.5">Remaining</th>
                                            <th className="px-4 py-2.5">Unit Price</th>
                                            <th className="px-4 py-2.5">Line Total</th>
                                            {selectedOrder.status === 'Draft' && (
                                                <th className="px-4 py-2.5 text-right">Action</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedOrder.lines && selectedOrder.lines.length > 0 ? (
                                            selectedOrder.lines.map((l) => (
                                                <tr key={l.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-2.5 font-mono text-slate-400">#{l.lineNumber}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="font-semibold text-slate-900 block">{l.productName}</span>
                                                        <span className="font-mono text-[11px] text-slate-400">{l.productSku}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                                                        {l.quantityOrdered}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-semibold text-emerald-600">
                                                        {l.quantityFulfilled}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-semibold text-amber-600">
                                                        {l.quantityRemaining}
                                                    </td>
                                                    <td className="px-4 py-2.5">${Number(l.unitPrice).toFixed(2)}</td>
                                                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                                                        ${Number(l.lineTotal).toFixed(2)}
                                                    </td>
                                                    {selectedOrder.status === 'Draft' && (
                                                        <td className="px-4 py-2.5 text-right">
                                                            <button
                                                                onClick={() => handleDeleteLine(l.id)}
                                                                disabled={selectedOrder.lines.length === 1}
                                                                className="text-slate-400 hover:text-red-600 disabled:opacity-30"
                                                                title="Delete line item"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="p-4 text-center text-slate-400">
                                                    No lines in this sales order.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Order Workflow Actions */}
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-2">
                                {selectedOrder.status === 'Draft' && (
                                    <button
                                        onClick={() =>
                                            setConfirmAction({
                                                type: 'delete',
                                                orderId: selectedOrder.id,
                                                orderNumber: selectedOrder.salesOrderNumber
                                            })
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Delete Draft</span>
                                    </button>
                                )}

                                {(selectedOrder.status === 'Draft' ||
                                    (selectedOrder.status === 'Confirmed' && selectedOrder.totalFulfilledQuantity === 0)) && (
                                    <button
                                        onClick={() =>
                                            setConfirmAction({
                                                type: 'cancel',
                                                orderId: selectedOrder.id,
                                                orderNumber: selectedOrder.salesOrderNumber
                                            })
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-red-600"
                                    >
                                        <Ban className="h-4 w-4" />
                                        <span>Cancel Order</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {selectedOrder.status === 'Draft' && (
                                    <button
                                        onClick={() =>
                                            setConfirmAction({
                                                type: 'confirm',
                                                orderId: selectedOrder.id,
                                                orderNumber: selectedOrder.salesOrderNumber
                                            })
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                                    >
                                        <Send className="h-4 w-4" />
                                        <span>Confirm Order</span>
                                    </button>
                                )}

                                {(selectedOrder.status === 'Confirmed' ||
                                    selectedOrder.status === 'PartiallyFulfilled') && (
                                    <button
                                        onClick={openFulfillModal}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                                    >
                                        <ArrowUpRight className="h-4 w-4" />
                                        <span>Fulfill & Dispatch Goods</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fulfill Goods Modal */}
            {isFulfillOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Fulfill Goods — {selectedOrder.salesOrderNumber}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Fulfilling items validates warehouse physical stock and creates outbound Stock Movements from{' '}
                                    <strong>{selectedOrder.warehouseName}</strong>.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsFulfillOpen(false)}
                                className="rounded p-1 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {fulfillError && (
                            <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <span>{fulfillError}</span>
                            </div>
                        )}

                        <form onSubmit={handleFulfillSubmit} className="mt-4 space-y-3">
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                                        <tr>
                                            <th className="px-3.5 py-2.5">Product</th>
                                            <th className="px-3.5 py-2.5">Ordered</th>
                                            <th className="px-3.5 py-2.5">Fulfilled</th>
                                            <th className="px-3.5 py-2.5">Remaining</th>
                                            <th className="px-3.5 py-2.5">Fulfill Now</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedOrder.lines.map((l) => {
                                            const remaining = l.quantityOrdered - l.quantityFulfilled;
                                            return (
                                                <tr key={l.id}>
                                                    <td className="px-3.5 py-2.5 font-medium text-slate-900">
                                                        {l.productName}
                                                        <span className="block text-[11px] text-slate-400 font-mono">
                                                            {l.productSku}
                                                        </span>
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-slate-700">{l.quantityOrdered}</td>
                                                    <td className="px-3.5 py-2.5 text-emerald-600 font-semibold">
                                                        {l.quantityFulfilled}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-amber-600 font-semibold">
                                                        {remaining}
                                                    </td>
                                                    <td className="px-3.5 py-2.5">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={remaining}
                                                            step="1"
                                                            value={fulfillQuantities[l.id] ?? 0}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '') {
                                                                    setFulfillQuantities({ ...fulfillQuantities, [l.id]: '' });
                                                                } else {
                                                                    const intVal = parseInt(val, 10);
                                                                    setFulfillQuantities({
                                                                        ...fulfillQuantities,
                                                                        [l.id]: isNaN(intVal) ? 0 : Math.min(remaining, Math.max(0, intVal))
                                                                    });
                                                                }
                                                            }}
                                                            disabled={remaining <= 0}
                                                            className="w-24 rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none disabled:bg-slate-100 font-mono"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsFulfillOpen(false)}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={fulfillSubmitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {fulfillSubmitting ? 'Dispatching Stock...' : 'Confirm Fulfillment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Action Confirmation Modal (Confirm, Cancel, Delete) */}
            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 capitalize">
                            {confirmAction.type === 'confirm' && 'Confirm Sales Order'}
                            {confirmAction.type === 'cancel' && 'Cancel Sales Order'}
                            {confirmAction.type === 'delete' && 'Delete Sales Order'}
                        </h3>
                        <p className="mt-2 text-xs text-slate-600">
                            {confirmAction.type === 'confirm' &&
                                `Are you sure you want to confirm ${confirmAction.orderNumber}? Once confirmed, the order is ready for warehouse fulfillment.`}
                            {confirmAction.type === 'cancel' &&
                                `Are you sure you want to cancel ${confirmAction.orderNumber}? Cancelled orders cannot be fulfilled.`}
                            {confirmAction.type === 'delete' &&
                                `Are you sure you want to permanently delete draft sales order ${confirmAction.orderNumber}? This action cannot be undone.`}
                        </p>

                        {confirmAction.type === 'cancel' && (
                            <div className="mt-3">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Cancellation Reason (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Customer cancelled, order duplicate..."
                                    value={actionReason}
                                    onChange={(e) => setActionReason(e.target.value)}
                                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                                />
                            </div>
                        )}

                        {actionError && (
                            <div className="mt-3 rounded bg-red-50 p-2.5 text-xs text-red-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <span>{actionError}</span>
                            </div>
                        )}

                        <div className="mt-5 flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={executeConfirmAction}
                                disabled={actionSubmitting}
                                className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60 ${
                                    confirmAction.type === 'delete' || confirmAction.type === 'cancel'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {actionSubmitting ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesOrdersPage;
