import React, { useState, useEffect } from 'react';
import purchaseOrderService from '../services/purchaseOrderService';
import supplierService from '../services/supplierService';
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
    ShoppingBag,
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
    Truck,
    Warehouse,
    ArrowDownLeft,
    Send,
    Ban,
    FileText,
    CheckCheck,
    Boxes,
    BarChart3,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    PieChart
} from 'lucide-react';

const STATUS_BADGES = {
    Draft: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    Ordered: { label: 'Ordered', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    PartiallyReceived: { label: 'Partially Received', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    Received: { label: 'Received', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Cancelled: { label: 'Cancelled', bg: 'bg-red-50 text-red-700 border-red-200' }
};

export const PurchaseOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // Filter states
    const [statusFilter, setStatusFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [fromDateFilter, setFromDateFilter] = useState('');
    const [toDateFilter, setToDateFilter] = useState('');

    // Procurement Analytics & Pagination states
    const [showAnalytics, setShowAnalytics] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Create Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createSupplierId, setCreateSupplierId] = useState('');
    const [createWarehouseId, setCreateWarehouseId] = useState('');
    const [createOrderDate, setCreateOrderDate] = useState(getTodayLocalDateString());
    const [createExpectedDate, setCreateExpectedDate] = useState('');
    const [createNotes, setCreateNotes] = useState('');
    const [createLines, setCreateLines] = useState([
        { productId: '', quantityOrdered: 1, unitCost: 0 }
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
    const [newLineUnitCost, setNewLineUnitCost] = useState(0);
    const [lineSubmitting, setLineSubmitting] = useState(false);

    // Receive Goods Modal state
    const [isReceiveOpen, setIsReceiveOpen] = useState(false);
    const [receiveQuantities, setReceiveQuantities] = useState({});
    const [receiveSubmitting, setReceiveSubmitting] = useState(false);
    const [receiveError, setReceiveError] = useState('');

    // Cancel / Delete Confirmation states
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'submit'|'cancel'|'delete', orderId, orderNumber }
    const [actionReason, setActionReason] = useState('');
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [actionError, setActionError] = useState('');

    const fetchInitialData = async () => {
        setLoading(true);
        setError('');
        try {
            const [ordersData, suppliersData, warehousesData, productsData] = await Promise.all([
                purchaseOrderService.getAll(),
                supplierService.getAll(),
                warehouseService.getAll(),
                productService.getAll()
            ]);
            setOrders(ordersData || []);
            setSuppliers(suppliersData || []);
            setWarehouses(warehousesData || []);
            setProducts(productsData || []);
        } catch (err) {
            console.error('Fetch purchase orders error:', err);
            setError('Failed to load purchase orders.');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrdersOnly = async () => {
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (supplierFilter) params.supplierId = supplierFilter;
            if (warehouseFilter) params.warehouseId = warehouseFilter;
            if (fromDateFilter) params.fromDate = localDateToStartOfDayIso(fromDateFilter);
            if (toDateFilter) params.toDate = localDateToEndOfDayIso(toDateFilter);
            const data = await purchaseOrderService.getAll(params);
            setOrders(data || []);
        } catch (err) {
            console.error('Refetch orders error:', err);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchOrdersOnly();
        setCurrentPage(1);
    }, [statusFilter, supplierFilter, warehouseFilter, fromDateFilter, toDateFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const refreshSelectedOrder = async (orderId) => {
        setDetailLoading(true);
        try {
            const updated = await purchaseOrderService.getById(orderId);
            setSelectedOrder(updated);
            fetchOrdersOnly();
        } catch (err) {
            console.error('Refresh order error:', err);
            setDetailError('Failed to refresh order details.');
        } finally {
            setDetailLoading(false);
        }
    };

    // Create Line Handlers
    const handleAddCreateLine = () => {
        setCreateLines([...createLines, { productId: '', quantityOrdered: 1, unitCost: 0 }]);
    };

    const handleRemoveCreateLine = (index) => {
        if (createLines.length === 1) return;
        setCreateLines(createLines.filter((_, i) => i !== index));
    };

    const handleCreateLineChange = (index, field, value) => {
        const nextLines = [...createLines];
        nextLines[index] = { ...nextLines[index], [field]: value };
        setCreateLines(nextLines);
    };

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        setCreateSubmitting(true);
        setCreateError('');
        setCreateSuccess('');

        if (!createSupplierId || !createWarehouseId) {
            setCreateError('Please select both a supplier and a destination warehouse.');
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
            if (parseFloat(line.unitCost) < 0 || isNaN(line.unitCost)) {
                setCreateError(`Unit cost for line item #${i + 1} cannot be negative.`);
                setCreateSubmitting(false);
                return;
            }
        }

        const distinctProducts = new Set(createLines.map((l) => l.productId));
        if (distinctProducts.size !== createLines.length) {
            setCreateError('A product cannot appear multiple times in the same order. Please combine quantities.');
            setCreateSubmitting(false);
            return;
        }

        try {
            const payload = {
                supplierId: createSupplierId,
                warehouseId: createWarehouseId,
                orderDate: createOrderDate ? localDateToStartOfDayIso(createOrderDate) : null,
                expectedDeliveryDate: createExpectedDate ? localDateToEndOfDayIso(createExpectedDate) : null,
                notes: createNotes.trim() || null,
                lines: createLines.map((l) => ({
                    productId: l.productId,
                    quantityOrdered: parseFloat(l.quantityOrdered),
                    unitCost: parseFloat(l.unitCost)
                }))
            };

            const created = await purchaseOrderService.create(payload);
            setCreateSuccess(`Purchase Order ${created.purchaseOrderNumber} created successfully!`);
            fetchOrdersOnly();

            setTimeout(() => {
                setIsCreateOpen(false);
                setCreateSuccess('');
                setCreateSupplierId('');
                setCreateWarehouseId('');
                setCreateOrderDate(getTodayLocalDateString());
                setCreateNotes('');
                setCreateExpectedDate('');
                setCreateLines([{ productId: '', quantityOrdered: 1, unitCost: 0 }]);
            }, 1200);
        } catch (err) {
            console.error('Create PO error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to create purchase order.';
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
            await purchaseOrderService.addLine(selectedOrder.id, {
                productId: newLineProductId,
                quantityOrdered: parseFloat(newLineQuantity),
                unitCost: parseFloat(newLineUnitCost)
            });

            setDetailSuccess('Line added successfully!');
            setIsAddingLine(false);
            setNewLineProductId('');
            setNewLineQuantity(1);
            setNewLineUnitCost(0);
            refreshSelectedOrder(selectedOrder.id);
        } catch (err) {
            console.error('Add line error:', err);
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
            await purchaseOrderService.deleteLine(lineId);
            setDetailSuccess('Line item removed.');
            refreshSelectedOrder(selectedOrder.id);
        } catch (err) {
            console.error('Delete line error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to delete line.';
            setDetailError(msg);
        }
    };

    // Open Receive Goods Modal
    const openReceiveModal = () => {
        if (!selectedOrder) return;
        const initial = {};
        selectedOrder.lines.forEach((line) => {
            const remaining = line.quantityOrdered - line.quantityReceived;
            initial[line.id] = remaining > 0 ? remaining : 0;
        });
        setReceiveQuantities(initial);
        setReceiveError('');
        setIsReceiveOpen(true);
    };

    const handleReceiveSubmit = async (e) => {
        e.preventDefault();
        setReceiveSubmitting(true);
        setReceiveError('');

        const items = Object.entries(receiveQuantities)
            .filter(([_, qty]) => parseFloat(qty) > 0)
            .map(([lineId, qty]) => ({
                purchaseOrderLineId: lineId,
                quantityToReceive: parseFloat(qty)
            }));

        if (items.length === 0) {
            setReceiveError('Please enter a quantity greater than 0 for at least one item.');
            setReceiveSubmitting(false);
            return;
        }

        try {
            await purchaseOrderService.receive(selectedOrder.id, items);
            setIsReceiveOpen(false);
            setDetailSuccess('Goods successfully received and inbound stock movements recorded!');
            refreshSelectedOrder(selectedOrder.id);
        } catch (err) {
            console.error('Receive goods error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to receive goods.';
            setReceiveError(msg);
        } finally {
            setReceiveSubmitting(false);
        }
    };

    // Status Actions: Submit, Cancel, Delete
    const executeConfirmAction = async () => {
        if (!confirmAction) return;
        setActionSubmitting(true);
        setActionError('');

        try {
            if (confirmAction.type === 'submit') {
                await purchaseOrderService.submit(confirmAction.orderId);
            } else if (confirmAction.type === 'cancel') {
                await purchaseOrderService.cancel(confirmAction.orderId, actionReason.trim() || null);
            } else if (confirmAction.type === 'delete') {
                await purchaseOrderService.delete(confirmAction.orderId);
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
            o.purchaseOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
            o.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
            o.warehouseName?.toLowerCase().includes(search.toLowerCase()) ||
            (o.notes && o.notes.toLowerCase().includes(search.toLowerCase()));

        return matchesSearch;
    });

    // Metrics summary
    const totalOrdersCount = orders.length;
    const draftsCount = orders.filter((o) => o.status === 'Draft').length;
    const awaitingReceiptCount = orders.filter((o) => o.status === 'Ordered' || o.status === 'PartiallyReceived').length;
    const completedCount = orders.filter((o) => o.status === 'Received').length;
    const totalSpend = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Procurement Analytics Calculations
    const supplierSpendMap = {};
    let globalUnitsOrdered = 0;
    let globalUnitsReceived = 0;
    const productProcureMap = {};

    orders.forEach((o) => {
        if (o.status === 'Cancelled') return;
        const sName = o.supplierName || 'Unknown Supplier';
        if (!supplierSpendMap[sName]) {
            supplierSpendMap[sName] = { name: sName, spend: 0, orderCount: 0, unitsOrdered: 0, unitsReceived: 0 };
        }
        supplierSpendMap[sName].spend += (o.totalAmount || 0);
        supplierSpendMap[sName].orderCount += 1;

        (o.lines || []).forEach((l) => {
            const qOrd = l.quantityOrdered || 0;
            const qRec = l.quantityReceived || 0;
            globalUnitsOrdered += qOrd;
            globalUnitsReceived += qRec;
            supplierSpendMap[sName].unitsOrdered += qOrd;
            supplierSpendMap[sName].unitsReceived += qRec;

            const pName = l.productName || 'Unknown Product';
            const pSku = l.productSku || '';
            if (!productProcureMap[pName]) {
                productProcureMap[pName] = { name: pName, sku: pSku, totalQty: 0, totalSpend: 0 };
            }
            productProcureMap[pName].totalQty += qOrd;
            productProcureMap[pName].totalSpend += (l.lineTotal || (qOrd * (l.unitCost || 0)) || 0);
        });
    });

    const topSuppliersBySpend = Object.values(supplierSpendMap).sort((a, b) => b.spend - a.spend);
    const topProcuredProducts = Object.values(productProcureMap).sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 4);
    const globalFulfillmentPct = globalUnitsOrdered > 0 ? Math.round((globalUnitsReceived / globalUnitsOrdered) * 100) : 0;
    const totalActiveSpend = topSuppliersBySpend.reduce((acc, s) => acc + s.spend, 0);

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
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Orders</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage vendor procurement, track shipments, and receive inventory directly into warehouses.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-sm transition ${
                            showAnalytics
                                ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                        title="Toggle procurement spend and fulfillment analytics"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span>{showAnalytics ? 'Hide Analytics' : 'Procurement Analytics'}</span>
                    </button>
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
                        <span>Create Purchase Order</span>
                    </button>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <ShoppingBag className="h-5 w-5" />
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
                            <p className="text-xs font-medium text-slate-500">Awaiting Receipt</p>
                            <p className="text-xl font-bold text-slate-900">{awaitingReceiptCount}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <CheckCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Fully Received</p>
                            <p className="text-xl font-bold text-slate-900">{completedCount}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                            <DollarSign className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">Total Procurement</p>
                            <p className="text-xl font-bold text-slate-900" title={formatCurrency(totalSpend)}>{formatMoneyK(totalSpend)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Procurement Analytics Panel */}
            {showAnalytics && (
                <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 dark:from-slate-900 dark:via-blue-950/20 dark:to-indigo-950/30 p-5 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                Procurement Analytics & Sourcing Distribution
                            </h2>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                            Based on active procurement orders (excludes cancelled)
                        </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* 1. Supplier Spend Share */}
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Spend by Vendor
                                </h3>
                                <span className="text-xs font-semibold text-blue-600">
                                    {topSuppliersBySpend.length} active vendors
                                </span>
                            </div>
                            <div className="space-y-3 pt-1">
                                {topSuppliersBySpend.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-4 text-center">No vendor procurement data yet</p>
                                ) : (
                                    topSuppliersBySpend.slice(0, 4).map((sup, idx) => {
                                        const pct = totalActiveSpend > 0 ? Math.round((sup.spend / totalActiveSpend) * 100) : 0;
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-slate-800 truncate max-w-[140px]" title={sup.name}>
                                                        {sup.name}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-slate-900" title={formatCurrency(sup.spend)}>
                                                            {formatMoneyK(sup.spend)}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-slate-400">
                                                            ({pct}%)
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                                                        style={{ width: `${Math.max(4, pct)}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                    <span>{sup.orderCount} PO{sup.orderCount > 1 ? 's' : ''}</span>
                                                    <span>{sup.unitsReceived} / {sup.unitsOrdered} units received</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* 2. Procurement Fulfillment Health */}
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Receipt & Fulfillment Rate
                                </h3>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                    globalFulfillmentPct >= 90 ? 'bg-emerald-50 text-emerald-700' :
                                    globalFulfillmentPct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                                }`}>
                                    {globalFulfillmentPct}% Fulfilled
                                </span>
                            </div>
                            <div className="space-y-4 pt-1">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-slate-600">
                                        <span>Units Received vs Ordered</span>
                                        <span className="font-semibold text-slate-900">
                                            {globalUnitsReceived.toLocaleString()} / {globalUnitsOrdered.toLocaleString()} units
                                        </span>
                                    </div>
                                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-500"
                                            style={{ width: `${globalFulfillmentPct}%` }}
                                            title={`Received: ${globalUnitsReceived}`}
                                        />
                                        <div
                                            className="h-full bg-amber-400 transition-all duration-500"
                                            style={{ width: `${100 - globalFulfillmentPct}%` }}
                                            title={`Pending: ${globalUnitsOrdered - globalUnitsReceived}`}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                                            Received ({globalUnitsReceived.toLocaleString()})
                                        </span>
                                        <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                                            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                                            Pending ({Math.max(0, globalUnitsOrdered - globalUnitsReceived).toLocaleString()})
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                    <div className="rounded-lg bg-slate-50 p-2 text-center">
                                        <p className="text-[11px] text-slate-500 font-medium">Pending Delivery</p>
                                        <p className="text-base font-bold text-amber-600">{awaitingReceiptCount} orders</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-2 text-center">
                                        <p className="text-[11px] text-slate-500 font-medium">Fully Completed</p>
                                        <p className="text-base font-bold text-emerald-600">{completedCount} orders</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Top Procured Products */}
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Top Procured Products
                                </h3>
                                <span className="text-xs font-semibold text-slate-500">By total spend</span>
                            </div>
                            <div className="space-y-2.5 pt-1">
                                {topProcuredProducts.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-4 text-center">No product lines in active orders</p>
                                ) : (
                                    topProcuredProducts.map((p, idx) => (
                                        <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50/80 px-2.5 py-2">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-semibold text-slate-900 truncate" title={p.name}>
                                                    {p.name}
                                                </p>
                                                <p className="text-[11px] text-slate-400 font-mono">
                                                    {p.sku || 'No SKU'} · {p.totalQty} units
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-bold text-slate-900" title={formatCurrency(p.totalSpend)}>
                                                    {formatMoneyK(p.totalSpend)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Banner */}
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
                        placeholder="Search PO number, supplier, warehouse, notes..."
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
                        <option value="Ordered">Ordered</option>
                        <option value="PartiallyReceived">Partially Received</option>
                        <option value="Received">Received</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>

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
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">All Destination Warehouses</option>
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

                    {(statusFilter || supplierFilter || warehouseFilter || fromDateFilter || toDateFilter) && (
                        <button
                            onClick={() => {
                                setStatusFilter('');
                                setSupplierFilter('');
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
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-6 py-3.5">Purchase Order & Vendor</th>
                                <th className="px-5 py-3.5">Destination Warehouse</th>
                                <th className="px-5 py-3.5">Fulfillment Status</th>
                                <th className="px-5 py-3.5">Total Amount</th>
                                <th className="px-6 py-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                                            <span>Loading purchase orders...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        No purchase orders found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrders.map((order) => {
                                    const badge = STATUS_BADGES[order.status] || {
                                        label: order.status,
                                        bg: 'bg-slate-100 text-slate-700 border-slate-200'
                                    };
                                    const totalOrd = order.totalOrderedQuantity || 0;
                                    const totalRec = order.totalReceivedQuantity || 0;
                                    const pctRec = totalOrd > 0 ? Math.round((totalRec / totalOrd) * 100) : 0;

                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setDetailError('');
                                                setDetailSuccess('');
                                            }}
                                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                            title="Click to open Procurement Voucher"
                                        >
                                            {/* Column 1: PO Number & Supplier */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-black shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                                                        <ShoppingBag className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-black text-blue-600 group-hover:text-blue-700">
                                                                {order.purchaseOrderNumber}
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900">
                                                                {order.supplierName}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                                            <span>Ordered: {formatDateOnly(order.orderDate)}</span>
                                                            <span>•</span>
                                                            <span>{order.lines ? order.lines.length : 0} items ({totalOrd} units)</span>
                                                            {order.expectedDeliveryDate && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-indigo-600 font-medium">Due: {formatDateOnly(order.expectedDeliveryDate)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 2: Destination Warehouse */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Warehouse className="h-4 w-4 text-slate-400" />
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-800 block">{order.warehouseName}</span>
                                                        <span className="text-[10px] font-mono text-slate-400 font-semibold">{order.warehouseCode}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 3: Fulfillment Status & Progress */}
                                            <td className="px-5 py-4">
                                                <div className="space-y-1.5">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${badge.bg}`}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                    {(order.status === 'Ordered' || order.status === 'PartiallyReceived') && (
                                                        <div className="w-32">
                                                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-0.5">
                                                                <span>{totalRec}/{totalOrd} rec</span>
                                                                <span>{pctRec}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                                                    style={{ width: `${pctRec}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Column 4: Total Amount */}
                                            <td className="px-5 py-4 font-bold text-slate-900" title={formatCurrency(order.totalAmount)}>
                                                <span className="font-mono text-sm">{formatCurrency(order.totalAmount)}</span>
                                            </td>

                                            {/* Column 5: Action */}
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrder(order);
                                                        setDetailError('');
                                                        setDetailSuccess('');
                                                    }}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition cursor-pointer"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    <span>Open Voucher</span>
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

            {/* Create Purchase Order Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Create Purchase Order</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Initial order is created in Draft status. Physical stock is only updated when items are received.
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
                                        Supplier <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={createSupplierId}
                                        onChange={(e) => setCreateSupplierId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                        Destination Warehouse <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={createWarehouseId}
                                        onChange={(e) => setCreateWarehouseId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select Destination Warehouse</option>
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
                                        Expected Delivery Date
                                    </label>
                                    <input
                                        type="date"
                                        value={createExpectedDate}
                                        onChange={(e) => setCreateExpectedDate(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Notes / Delivery Instructions
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Optional notes or supplier references..."
                                    value={createNotes}
                                    onChange={(e) => setCreateNotes(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                                />
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
                                        const lineTotal = (parseFloat(line.quantityOrdered) || 0) * (parseFloat(line.unitCost) || 0);
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
                                                        onChange={(e) => handleCreateLineChange(index, 'productId', e.target.value)}
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none bg-white"
                                                    >
                                                        <option value="">Select Product</option>
                                                        {products.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} ({p.sku})
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
                                                        placeholder="Unit Cost ($)"
                                                        value={line.unitCost}
                                                        onChange={(e) => handleCreateLineChange(index, 'unitCost', e.target.value)}
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
                                                    acc + (parseFloat(l.quantityOrdered) || 0) * (parseFloat(l.unitCost) || 0),
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
                                    {createSubmitting ? 'Creating Order...' : 'Create Draft Purchase Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= GORGEOUS PROCUREMENT VOUCHER / ORDER DOCUMENT ================= */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl my-6 border border-slate-200 flex flex-col overflow-hidden">
                        {/* Voucher Document Top Header */}
                        <div className="border-b border-slate-200 bg-slate-900 px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30">
                                    <ShoppingBag className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-black font-mono tracking-tight text-white">
                                            {selectedOrder.purchaseOrderNumber}
                                        </h2>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black border ${
                                                STATUS_BADGES[selectedOrder.status]?.bg || 'bg-slate-800 text-slate-200 border-slate-700'
                                            }`}
                                        >
                                            {STATUS_BADGES[selectedOrder.status]?.label || selectedOrder.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        Official Procurement Voucher • Issued: {formatDateOnly(selectedOrder.orderDate)}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="rounded-xl border border-white/20 p-2 text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer self-start sm:self-center"
                                title="Close Voucher"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Status Stepper Timeline */}
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3.5">
                            <div className="flex items-center justify-between max-w-2xl mx-auto">
                                {[
                                    { key: 'Draft', label: '1. Draft Staged' },
                                    { key: 'Ordered', label: '2. Transmitted' },
                                    { key: 'PartiallyReceived', label: '3. Inbound Dock' },
                                    { key: 'Received', label: '4. Reconciled' }
                                ].map((step, idx) => {
                                    const isCurrent = selectedOrder.status === step.key;
                                    const isPast =
                                        (step.key === 'Draft') ||
                                        (step.key === 'Ordered' && ['Ordered', 'PartiallyReceived', 'Received'].includes(selectedOrder.status)) ||
                                        (step.key === 'PartiallyReceived' && ['PartiallyReceived', 'Received'].includes(selectedOrder.status)) ||
                                        (step.key === 'Received' && selectedOrder.status === 'Received');

                                    return (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                                                isCurrent
                                                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                                                    : isPast
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-slate-200 text-slate-500'
                                            }`}>
                                                {isPast && !isCurrent ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                                            </div>
                                            <span className={`text-xs font-bold hidden sm:inline ${
                                                isCurrent ? 'text-blue-700' : isPast ? 'text-slate-800' : 'text-slate-400'
                                            }`}>
                                                {step.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Document Content Body */}
                        <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
                            {detailError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                    <span>{detailError}</span>
                                </div>
                            )}
                            {detailSuccess && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-700 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                    <span>{detailSuccess}</span>
                                </div>
                            )}

                            {/* Two Sourcing & Destination Dossier Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Vendor Card */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                                        <Truck className="h-4 w-4 text-indigo-600" />
                                        <span>Supplier / Vendor Dossier</span>
                                    </div>
                                    <h3 className="text-base font-black text-slate-900">{selectedOrder.supplierName}</h3>
                                    <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Order Date:</span>
                                            <span className="font-semibold text-slate-800">{formatDateOnly(selectedOrder.orderDate)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Expected Delivery:</span>
                                            <span className="font-semibold text-indigo-700">{formatDateOnly(selectedOrder.expectedDeliveryDate) || 'Standard Shipping'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Destination Facility Card */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                                        <Warehouse className="h-4 w-4 text-blue-600" />
                                        <span>Destination Warehouse</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-base font-black text-slate-900">{selectedOrder.warehouseName}</h3>
                                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                            {selectedOrder.warehouseCode}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Receiving Bay:</span>
                                            <span className="font-semibold text-slate-800">Main Logistics Dock</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Notes / Ref:</span>
                                            <span className="font-semibold text-slate-800 truncate max-w-[180px]">{selectedOrder.notes || 'No remarks'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Ribbon Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Catalog Lines</span>
                                    <span className="font-mono text-lg font-black text-slate-900">
                                        {selectedOrder.lines ? selectedOrder.lines.length : 0} lines
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Ordered Units</span>
                                    <span className="font-mono text-lg font-black text-slate-900">
                                        {selectedOrder.totalOrderedQuantity}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Received Units</span>
                                    <span className="font-mono text-lg font-black text-emerald-600">
                                        {selectedOrder.totalReceivedQuantity || 0}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Procurement Value</span>
                                    <span className="font-mono text-lg font-black text-blue-600" title={formatCurrency(selectedOrder.totalAmount)}>
                                        {formatCurrency(selectedOrder.totalAmount)}
                                    </span>
                                </div>
                            </div>

                            {/* Line Items Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                        Procured Item Lines ({selectedOrder.lines ? selectedOrder.lines.length : 0})
                                    </h3>
                                    {selectedOrder.status === 'Draft' && !isAddingLine && (
                                        <button
                                            onClick={() => setIsAddingLine(true)}
                                            className="inline-flex items-center gap-1 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add Product Line</span>
                                        </button>
                                    )}
                                </div>

                                {/* Add Line Form */}
                                {isAddingLine && (
                                    <form
                                        onSubmit={handleAddLineToOrder}
                                        className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 flex flex-wrap items-center gap-3"
                                    >
                                        <div className="flex-1 min-w-[200px]">
                                            <select
                                                required
                                                value={newLineProductId}
                                                onChange={(e) => setNewLineProductId(e.target.value)}
                                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold bg-white"
                                            >
                                                <option value="">Select Product to Add</option>
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
                                                onChange={(e) => setNewLineQuantity(e.target.value)}
                                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono font-bold"
                                            />
                                        </div>
                                        <div className="w-28">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                required
                                                placeholder="Unit Cost ($)"
                                                value={newLineUnitCost}
                                                onChange={(e) => setNewLineUnitCost(e.target.value)}
                                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono font-bold"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="submit"
                                                disabled={lineSubmitting}
                                                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                                            >
                                                {lineSubmitting ? 'Adding...' : 'Add Item'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingLine(false)}
                                                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Line items Table */}
                                <div className="overflow-hidden rounded-2xl border border-slate-200">
                                    <table className="w-full text-left text-xs text-slate-600">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                                            <tr>
                                                <th className="px-4 py-3">Product SKU & Name</th>
                                                <th className="px-3 py-3 text-center">Ordered</th>
                                                <th className="px-3 py-3 text-center">Received</th>
                                                <th className="px-3 py-3 text-center">Outstanding</th>
                                                <th className="px-4 py-3 text-right">Unit Cost</th>
                                                <th className="px-4 py-3 text-right">Line Total</th>
                                                {selectedOrder.status === 'Draft' && (
                                                    <th className="px-3 py-3 text-right">Action</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedOrder.lines && selectedOrder.lines.length > 0 ? (
                                                selectedOrder.lines.map((l) => (
                                                    <tr key={l.id} className="hover:bg-slate-50/70 transition">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold shrink-0">
                                                                    <Package className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <span className="font-mono text-xs font-bold text-slate-900 block">{l.productSku}</span>
                                                                    <span className="text-slate-600 font-medium block truncate max-w-xs">{l.productName}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono font-bold text-slate-800">
                                                            {l.quantityOrdered}
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono font-bold text-emerald-600">
                                                            {l.quantityReceived}
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono font-bold text-amber-600">
                                                            {l.quantityRemaining}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                                                            ${Number(l.unitCost).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                                                            ${Number(l.lineTotal).toFixed(2)}
                                                        </td>
                                                        {selectedOrder.status === 'Draft' && (
                                                            <td className="px-3 py-3 text-right">
                                                                <button
                                                                    onClick={() => handleDeleteLine(l.id)}
                                                                    disabled={selectedOrder.lines.length === 1}
                                                                    className="text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer p-1"
                                                                    title="Remove line"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" className="p-6 text-center text-slate-400 text-xs">
                                                        No lines in this purchase order.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Voucher Bottom Action Toolbar */}
                        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {selectedOrder.status === 'Draft' && (
                                    <button
                                        onClick={() =>
                                            setConfirmAction({
                                                type: 'delete',
                                                orderId: selectedOrder.id,
                                                orderNumber: selectedOrder.purchaseOrderNumber
                                            })
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Delete Draft Voucher</span>
                                    </button>
                                )}

                                {(selectedOrder.status === 'Draft' ||
                                    (selectedOrder.status === 'Ordered' && selectedOrder.totalReceivedQuantity === 0)) && (
                                    <button
                                        onClick={() =>
                                            setConfirmAction({
                                                type: 'cancel',
                                                orderId: selectedOrder.id,
                                                orderNumber: selectedOrder.purchaseOrderNumber
                                            })
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-red-600 transition cursor-pointer"
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
                                                type: 'submit',
                                                orderId: selectedOrder.id,
                                                orderNumber: selectedOrder.purchaseOrderNumber
                                            })
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer"
                                    >
                                        <Send className="h-4 w-4" />
                                        <span>Submit Order to Supplier</span>
                                    </button>
                                )}

                                {(selectedOrder.status === 'Ordered' || selectedOrder.status === 'PartiallyReceived') && (
                                    <button
                                        onClick={openReceiveModal}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white shadow-md hover:bg-emerald-700 active:bg-emerald-800 transition cursor-pointer"
                                    >
                                        <ArrowDownLeft className="h-4 w-4" />
                                        <span>Receive Goods Into Warehouse</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Receive Goods Modal */}
            {isReceiveOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Receive Goods — {selectedOrder.purchaseOrderNumber}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Recording received inventory will automatically generate inbound Stock Movements for{' '}
                                    <strong>{selectedOrder.warehouseName}</strong>.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsReceiveOpen(false)}
                                className="rounded p-1 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {receiveError && (
                            <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <span>{receiveError}</span>
                            </div>
                        )}

                        <form onSubmit={handleReceiveSubmit} className="mt-4 space-y-3">
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                                        <tr>
                                            <th className="px-3.5 py-2.5">Product</th>
                                            <th className="px-3.5 py-2.5">Ordered</th>
                                            <th className="px-3.5 py-2.5">Received</th>
                                            <th className="px-3.5 py-2.5">Remaining</th>
                                            <th className="px-3.5 py-2.5">Receive Now</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedOrder.lines.map((l) => {
                                            const remaining = l.quantityOrdered - l.quantityReceived;
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
                                                        {l.quantityReceived}
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
                                                            value={receiveQuantities[l.id] ?? 0}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '') {
                                                                    setReceiveQuantities({ ...receiveQuantities, [l.id]: '' });
                                                                } else {
                                                                    const intVal = parseInt(val, 10);
                                                                    setReceiveQuantities({
                                                                        ...receiveQuantities,
                                                                        [l.id]: isNaN(intVal) ? 0 : Math.min(remaining, Math.max(0, intVal))
                                                                    });
                                                                }
                                                            }}
                                                            disabled={remaining <= 0}
                                                            className="w-24 rounded border border-slate-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none disabled:bg-slate-100 font-mono"
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
                                    onClick={() => setIsReceiveOpen(false)}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={receiveSubmitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {receiveSubmitting ? 'Recording Receipts...' : 'Confirm Goods Receipt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Action Confirmation Modal (Submit, Cancel, Delete) */}
            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 capitalize">
                            {confirmAction.type === 'submit' && 'Submit Purchase Order'}
                            {confirmAction.type === 'cancel' && 'Cancel Purchase Order'}
                            {confirmAction.type === 'delete' && 'Delete Purchase Order'}
                        </h3>
                        <p className="mt-2 text-xs text-slate-600">
                            {confirmAction.type === 'submit' &&
                                `Are you sure you want to transition ${confirmAction.orderNumber} from Draft to Ordered? You will be able to receive inventory once submitted.`}
                            {confirmAction.type === 'cancel' &&
                                `Are you sure you want to cancel ${confirmAction.orderNumber}? Cancelled orders cannot receive inventory.`}
                            {confirmAction.type === 'delete' &&
                                `Are you sure you want to permanently delete draft order ${confirmAction.orderNumber}? This action cannot be undone.`}
                        </p>

                        {confirmAction.type === 'cancel' && (
                            <div className="mt-3">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Cancellation Reason (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Vendor out of stock, duplicated order..."
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

export default PurchaseOrdersPage;
