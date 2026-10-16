import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import stockMovementService from '../services/stockMovementService';
import supplierService from '../services/supplierService';
import customerService from '../services/customerService';
import {
    ArrowLeftRight,
    ArrowDownLeft,
    ArrowUpRight,
    Plus,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Warehouse,
    Package,
    Layers,
    Calendar,
    Send,
    Truck,
    Users,
    Eye,
    Mail,
    Phone,
    ExternalLink,
    X,
    ShoppingCart,
    ShoppingBag
} from 'lucide-react';

export const StockMovementsPage = () => {
    const navigate = useNavigate();

    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [adjustmentReasons, setAdjustmentReasons] = useState([]);

    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');

    const [currentStock, setCurrentStock] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pageError, setPageError] = useState('');
    const [pageSuccess, setPageSuccess] = useState('');

    // Movement Form State
    const [movementType, setMovementType] = useState('Purchase');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedAdjustmentReasonId, setSelectedAdjustmentReasonId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [referenceType, setReferenceType] = useState('Supplier');
    const [referenceId, setReferenceId] = useState('');
    const [submittingMovement, setSubmittingMovement] = useState(false);

    // Supplier Info Modal State (for popups)
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [selectedSupplierForModal, setSelectedSupplierForModal] = useState(null);

    // Customer Info Modal State (for popups)
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [selectedCustomerForModal, setSelectedCustomerForModal] = useState(null);

    // Transfer Modal / Form State
    const [showTransfer, setShowTransfer] = useState(false);
    const [destWarehouseId, setDestWarehouseId] = useState('');
    const [transferQty, setTransferQty] = useState(1);
    const [submittingTransfer, setSubmittingTransfer] = useState(false);

    // Fetch initial warehouses, products, suppliers, customers, and adjustment reasons
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [whs, prods, sups, custs, adjReasons] = await Promise.all([
                    warehouseService.getAll(),
                    productService.getAll(),
                    supplierService.getAll().catch(() => []),
                    customerService.getAll().catch(() => []),
                    stockMovementService.getAdjustmentReasons().catch(() => [])
                ]);
                setWarehouses(whs || []);
                setProducts(prods || []);
                setSuppliers(sups || []);
                setCustomers(custs || []);
                setAdjustmentReasons(adjReasons || []);

                if (whs?.length > 0) setSelectedWarehouseId(whs[0].id);
                if (prods?.length > 0) setSelectedProductId(prods[0].id);
                if (sups?.length > 0) {
                    const activeSups = sups.filter((s) => s.isActive);
                    if (activeSups.length > 0) setSelectedSupplierId(activeSups[0].id);
                }
                if (custs?.length > 0) {
                    const activeCusts = custs.filter((c) => c.isActive);
                    if (activeCusts.length > 0) setSelectedCustomerId(activeCusts[0].id);
                }
                if (adjReasons?.length > 0) {
                    const activeAdj = adjReasons.filter((r) => r.isActive);
                    if (activeAdj.length > 0) setSelectedAdjustmentReasonId(activeAdj[0].id);
                }
            } catch (err) {
                console.error('Failed to load initial data:', err);
                setPageError('Failed to load warehouses, products, suppliers, or customers.');
            }
        };
        fetchInitial();
    }, []);

    // Fetch Stock Level & Movement History whenever Warehouse or Product changes
    const fetchStockData = async () => {
        if (!selectedWarehouseId || !selectedProductId) return;
        setLoading(true);
        setPageError('');
        try {
            const [stockRes, histRes] = await Promise.all([
                stockMovementService.getCurrentStock(selectedWarehouseId, selectedProductId),
                stockMovementService.getHistory(selectedWarehouseId, selectedProductId)
            ]);
            setCurrentStock(stockRes);
            setHistory(histRes || []);
        } catch (err) {
            console.error('Error fetching stock movements:', err);
            setPageError('Failed to load stock movements. Ensure your account is authorized for this warehouse.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStockData();
    }, [selectedWarehouseId, selectedProductId]);

    // Open supplier info modal
    const openSupplierModal = (supplier) => {
        if (!supplier) return;
        setSelectedSupplierForModal(supplier);
        setSupplierModalOpen(true);
    };

    // Open customer info modal
    const openCustomerModal = (customer) => {
        if (!customer) return;
        setSelectedCustomerForModal(customer);
        setCustomerModalOpen(true);
    };

    // Handle Record Movement (Purchase, Sale, Adjustment)
    const handleRecordMovement = async (e) => {
        e.preventDefault();
        setSubmittingMovement(true);
        setPageError('');
        setPageSuccess('');

        try {
            let refType = referenceType;
            let refId = referenceId;

            if (movementType === 'Purchase') {
                if (!selectedSupplierId) {
                    setPageError('Please select a supplier for this purchase.');
                    setSubmittingMovement(false);
                    return;
                }
                refType = 'Supplier';
                refId = referenceId.trim()
                    ? `${selectedSupplierId}|${referenceId.trim()}`
                    : selectedSupplierId;
            } else if (movementType === 'Sale') {
                if (!selectedCustomerId) {
                    setPageError('Please select a customer for this sale.');
                    setSubmittingMovement(false);
                    return;
                }
                if (parseFloat(quantity) > (currentStock ?? 0)) {
                    setPageError(`Cannot sell ${quantity} units. Only ${currentStock ?? 0} units are currently available.`);
                    setSubmittingMovement(false);
                    return;
                }
                refType = 'Customer';
                refId = referenceId.trim()
                    ? `${selectedCustomerId}|${referenceId.trim()}`
                    : selectedCustomerId;
            } else if (movementType.startsWith('Adjustment')) {
                if (movementType === 'AdjustmentOut' && parseFloat(quantity) > (currentStock ?? 0)) {
                    setPageError(`Cannot adjust out ${quantity} units. Only ${currentStock ?? 0} units are currently in stock.`);
                    setSubmittingMovement(false);
                    return;
                }
                if (!selectedAdjustmentReasonId && !referenceId.trim()) {
                    setPageError('Please select an adjustment reason or provide an explanatory note.');
                    setSubmittingMovement(false);
                    return;
                }
                refType = 'Adjustment';
                refId = referenceId.trim() || null;
            }

            await stockMovementService.recordMovement(selectedWarehouseId, {
                productId: selectedProductId,
                warehouseId: selectedWarehouseId,
                quantity: parseFloat(quantity),
                type: movementType,
                adjustmentReasonId: movementType.startsWith('Adjustment') ? (selectedAdjustmentReasonId || null) : null,
                referenceType: refType || null,
                referenceId: refId || null
            });

            let successNote = `Recorded ${movementType} of ${quantity} units successfully!`;
            if (movementType === 'Purchase') {
                const supplierObj = suppliers.find((s) => s.id === selectedSupplierId);
                if (supplierObj) successNote = `Purchased ${quantity} units from ${supplierObj.name} successfully!`;
            } else if (movementType === 'Sale') {
                const customerObj = customers.find((c) => c.id === selectedCustomerId);
                if (customerObj) successNote = `Sold ${quantity} units to ${customerObj.name} successfully!`;
            } else if (movementType.startsWith('Adjustment')) {
                const reasonObj = adjustmentReasons.find((r) => r.id === selectedAdjustmentReasonId);
                const reasonText = reasonObj ? ` (${reasonObj.name})` : '';
                successNote = `Adjusted stock by ${movementType === 'AdjustmentOut' ? '-' : '+'}${quantity} units${reasonText} successfully!`;
            }

            setPageSuccess(successNote);
            setReferenceId('');
            await fetchStockData();
        } catch (err) {
            console.error('Error recording movement:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to record movement.';
            setPageError(msg);
        } finally {
            setSubmittingMovement(false);
        }
    };

    // Handle Transfer Stock
    const handleTransferStock = async (e) => {
        e.preventDefault();
        if (selectedWarehouseId === destWarehouseId) {
            setPageError('Source and Destination warehouse cannot be the same.');
            return;
        }

        setSubmittingTransfer(true);
        setPageError('');
        setPageSuccess('');

        try {
            await stockMovementService.transferStock(selectedWarehouseId, {
                productId: selectedProductId,
                destinationWarehouseId: destWarehouseId,
                quantity: parseFloat(transferQty),
                referenceType: 'WarehouseTransfer',
                referenceId: `TRF-${Date.now().toString().slice(-5)}`
            });

            setPageSuccess(`Transferred ${transferQty} units to destination warehouse successfully!`);
            setShowTransfer(false);
            await fetchStockData();
        } catch (err) {
            console.error('Transfer stock error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Transfer failed.';
            setPageError(msg);
        } finally {
            setSubmittingTransfer(false);
        }
    };

    const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);
    const selectedProduct = products.find((p) => p.id === selectedProductId);

    const activeSuppliers = suppliers.filter((s) => s.isActive);
    const currentSelectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

    const activeCustomers = customers.filter((c) => c.isActive);
    const currentSelectedCustomer = customers.find((c) => c.id === selectedCustomerId);

    // Helper to parse supplier from ledger reference
    const parseSupplierFromRef = (item) => {
        if (!item.referenceId) return null;
        let candidateId = item.referenceId;
        let invoiceNumber = null;

        if (item.referenceId.includes('|')) {
            const parts = item.referenceId.split('|');
            candidateId = parts[0];
            invoiceNumber = parts[1];
        }

        const supplier = suppliers.find(
            (s) => s.id.toLowerCase() === candidateId.toLowerCase()
        );

        if (!supplier && item.referenceType !== 'Supplier') return null;

        return {
            supplier,
            invoiceNumber
        };
    };

    // Helper to parse customer from ledger reference
    const parseCustomerFromRef = (item) => {
        if (!item.referenceId) return null;
        let candidateId = item.referenceId;
        let salesOrderNumber = null;

        if (item.referenceId.includes('|')) {
            const parts = item.referenceId.split('|');
            candidateId = parts[0];
            salesOrderNumber = parts[1];
        }

        const customer = customers.find(
            (c) => c.id.toLowerCase() === candidateId.toLowerCase()
        );

        if (!customer && item.referenceType !== 'Customer') return null;

        return {
            customer,
            salesOrderNumber
        };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock Movements & Ledger</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Audit-trail inventory movements, purchases from suppliers, customer sales, and warehouse transfers.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchStockData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Refresh Ledger</span>
                    </button>
                </div>
            </div>

            {pageError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-50 p-4 text-xs text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{pageError}</span>
                </div>
            )}

            {pageSuccess && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{pageSuccess}</span>
                </div>
            )}

            {/* Warehouse & Product Selector Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Active Warehouse Facility
                    </label>
                    <div className="relative">
                        <select
                            value={selectedWarehouseId}
                            onChange={(e) => setSelectedWarehouseId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name} ({w.code})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Catalog Product
                    </label>
                    <div className="relative">
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} — SKU: {p.sku}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Live Stock Level Badge Card */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
                <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                        Dynamic Physical Stock Level
                    </span>
                    <div className="mt-2 flex items-baseline gap-3">
                        <span className="text-4xl font-extrabold text-slate-900 font-mono">
                            {loading ? '...' : (currentStock ?? 0)}
                        </span>
                        <span className="text-sm font-semibold text-slate-600">
                            {selectedProduct?.unitOfMeasureName || selectedProduct?.unitOfMeasure || 'Units'} available in {selectedWarehouse?.name}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowTransfer(!showTransfer)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
                    >
                        <Send className="h-3.5 w-3.5" />
                        <span>Transfer to Another Warehouse</span>
                    </button>
                </div>
            </div>

            {/* Transfer Stock Form (Collapsible) */}
            {showTransfer && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Send className="h-4 w-4 text-blue-600" />
                        Inter-Warehouse Stock Transfer
                    </h3>
                    <form onSubmit={handleTransferStock} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Destination Warehouse *</label>
                            <select
                                required
                                value={destWarehouseId}
                                onChange={(e) => setDestWarehouseId(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                            >
                                <option value="">Select destination...</option>
                                {warehouses
                                    .filter((w) => w.id !== selectedWarehouseId)
                                    .map((w) => (
                                        <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                                    ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Quantity to Transfer *</label>
                            <input
                                type="number"
                                min="1"
                                max={currentStock || 1}
                                value={transferQty}
                                onChange={(e) => setTransferQty(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={submittingTransfer}
                                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-60"
                            >
                                {submittingTransfer ? 'Transferring...' : 'Execute Transfer'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowTransfer(false)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Record New Movement Box with Supplier / Customer Selection */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        {movementType === 'Purchase' && <ShoppingCart className="h-4 w-4 text-emerald-600" />}
                        {movementType === 'Sale' && <ShoppingBag className="h-4 w-4 text-purple-600" />}
                        {movementType.startsWith('Adjustment') && <Plus className="h-4 w-4 text-blue-600" />}

                        <span>
                            {movementType === 'Purchase' && 'Purchase Stock from Supplier'}
                            {movementType === 'Sale' && 'Sell Stock to Customer'}
                            {movementType.startsWith('Adjustment') && 'Manual Inventory Adjustment'}
                        </span>
                    </h3>

                    {/* Mode pills */}
                    <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => {
                                setMovementType('Purchase');
                                setReferenceType('Supplier');
                            }}
                            className={`rounded-md px-3 py-1 transition ${
                                movementType === 'Purchase'
                                    ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Purchase (From Supplier)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMovementType('Sale');
                                setReferenceType('Customer');
                            }}
                            className={`rounded-md px-3 py-1 transition ${
                                movementType === 'Sale'
                                    ? 'bg-white text-purple-700 shadow-sm font-semibold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Sale (To Customer)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMovementType('AdjustmentOut');
                                setReferenceType('Adjustment');
                            }}
                            className={`rounded-md px-3 py-1 transition ${
                                movementType.startsWith('Adjustment')
                                    ? 'bg-white text-slate-800 shadow-sm font-semibold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Adjustment
                        </button>
                    </div>
                </div>

                <form onSubmit={handleRecordMovement} className="space-y-4">
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${movementType.startsWith('Adjustment') ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
                        {/* Target Product to Purchase / Sell / Move */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                Product to {movementType === 'Purchase' ? 'Buy' : movementType === 'Sale' ? 'Sell' : 'Adjust'} *
                            </label>
                            <select
                                required
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-medium outline-none focus:border-blue-500"
                            >
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.sku})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Dynamic Actor Picker (Supplier for Purchase, Customer for Sale, Direction & Reason for Adjustment) */}
                        {movementType === 'Purchase' ? (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-medium text-slate-600">
                                        Active Supplier *
                                    </label>
                                    {currentSelectedSupplier && (
                                        <button
                                            type="button"
                                            onClick={() => openSupplierModal(currentSelectedSupplier)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                            title="View supplier information popup"
                                        >
                                            <Eye className="h-3 w-3" />
                                            <span>View Info</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-1.5">
                                    <select
                                        required
                                        value={selectedSupplierId}
                                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-medium outline-none focus:border-blue-500"
                                    >
                                        {activeSuppliers.length === 0 ? (
                                            <option value="">No active suppliers found</option>
                                        ) : (
                                            activeSuppliers.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} {s.phone ? `(${s.phone})` : ''}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    {currentSelectedSupplier && (
                                        <button
                                            type="button"
                                            onClick={() => openSupplierModal(currentSelectedSupplier)}
                                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-600 hover:bg-slate-100 transition"
                                            title="Inspect Supplier Details"
                                        >
                                            <Eye className="h-4 w-4 text-blue-600" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : movementType === 'Sale' ? (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-medium text-slate-600">
                                        Client / Customer *
                                    </label>
                                    {currentSelectedCustomer && (
                                        <button
                                            type="button"
                                            onClick={() => openCustomerModal(currentSelectedCustomer)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 hover:underline"
                                            title="View customer information popup"
                                        >
                                            <Eye className="h-3 w-3" />
                                            <span>View Info</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-1.5">
                                    <select
                                        required
                                        value={selectedCustomerId}
                                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-medium outline-none focus:border-purple-500"
                                    >
                                        {activeCustomers.length === 0 ? (
                                            <option value="">No active customers found</option>
                                        ) : (
                                            activeCustomers.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} {c.phone ? `(${c.phone})` : ''}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    {currentSelectedCustomer && (
                                        <button
                                            type="button"
                                            onClick={() => openCustomerModal(currentSelectedCustomer)}
                                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-600 hover:bg-slate-100 transition"
                                            title="Inspect Customer Details"
                                        >
                                            <Eye className="h-4 w-4 text-purple-600" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Adjustment Direction *</label>
                                    <select
                                        value={movementType}
                                        onChange={(e) => setMovementType(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-medium outline-none focus:border-blue-500"
                                    >
                                        <option value="AdjustmentOut">Adjustment Out (- Damaged / Discrepancy)</option>
                                        <option value="AdjustmentIn">Adjustment In (+ Found / Surplus)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Adjustment Reason *</label>
                                    <select
                                        value={selectedAdjustmentReasonId}
                                        onChange={(e) => setSelectedAdjustmentReasonId(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-medium outline-none focus:border-blue-500"
                                    >
                                        {adjustmentReasons.length === 0 ? (
                                            <option value="">Loading reasons...</option>
                                        ) : (
                                            adjustmentReasons.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Quantity */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-medium text-slate-600">
                                    Quantity *
                                </label>
                                {(movementType === 'Sale' || movementType === 'AdjustmentOut') && (
                                    <span className="text-[11px] text-slate-500">
                                        Max: <strong>{currentStock ?? 0}</strong>
                                    </span>
                                )}
                            </div>
                            <input
                                type="number"
                                min="0.0001"
                                max={(movementType === 'Sale' || movementType === 'AdjustmentOut') ? (currentStock ?? undefined) : undefined}
                                step="any"
                                required
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 outline-none ${
                                    (movementType === 'Sale' || movementType === 'AdjustmentOut') && parseFloat(quantity) > (currentStock ?? 0)
                                        ? 'border-red-500 ring-1 ring-red-500'
                                        : 'border-slate-300 focus:border-blue-500'
                                }`}
                            />
                        </div>

                        {/* Reference / Invoice Identifier / Note */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                {movementType === 'Purchase' && 'Invoice / PO # (Optional)'}
                                {movementType === 'Sale' && 'Sales Order / Receipt # (Optional)'}
                                {movementType.startsWith('Adjustment') && 'Explanatory Note / Reason *'}
                            </label>
                            <input
                                type="text"
                                required={movementType.startsWith('Adjustment')}
                                placeholder={
                                    movementType === 'Purchase'
                                        ? 'e.g. PO-2026-001'
                                        : movementType === 'Sale'
                                        ? 'e.g. SO-8910'
                                        : 'e.g. Apple are damaged, dropped box...'
                                }
                                value={referenceId}
                                onChange={(e) => setReferenceId(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                            {movementType === 'Purchase' && currentSelectedSupplier && (
                                <span>
                                    Purchasing for <strong className="text-slate-800">{selectedWarehouse?.name}</strong> from{' '}
                                    <strong className="text-emerald-700">{currentSelectedSupplier.name}</strong>.
                                </span>
                            )}
                            {movementType === 'Sale' && currentSelectedCustomer && (
                                <span>
                                    Selling from <strong className="text-slate-800">{selectedWarehouse?.name}</strong> to{' '}
                                    <strong className="text-purple-700">{currentSelectedCustomer.name}</strong>.
                                </span>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={submittingMovement}
                            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60 ${
                                movementType === 'Purchase'
                                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                                    : movementType === 'Sale'
                                    ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
                                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                            }`}
                        >
                            {submittingMovement ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <>
                                    {movementType === 'Purchase' && <ShoppingCart className="h-4 w-4" />}
                                    {movementType === 'Sale' && <ShoppingBag className="h-4 w-4" />}
                                    {movementType.startsWith('Adjustment') && <Plus className="h-4 w-4" />}

                                    <span>
                                        {movementType === 'Purchase' && 'Confirm Purchase & Add Stock'}
                                        {movementType === 'Sale' && 'Confirm Sale & Deduct Stock'}
                                        {movementType.startsWith('Adjustment') && 'Commit Adjustment'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Movement History Ledger Table */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            Append-Only Audit Ledger ({history.length} records)
                        </h3>
                        <p className="text-xs text-slate-400">
                            Complete historical ledger for {selectedProduct?.name} in {selectedWarehouse?.name}
                        </p>
                    </div>
                    <span className="text-xs text-slate-400">Newest first</span>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400">
                        No movement history recorded yet for this product in this warehouse.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-3.5">Timestamp</th>
                                    <th className="px-6 py-3.5">Movement Type</th>
                                    <th className="px-6 py-3.5">Quantity</th>
                                    <th className="px-6 py-3.5">Party (Supplier / Customer) / Reference</th>
                                    <th className="px-6 py-3.5">Actor User</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((item) => {
                                    const isPositive = ['Purchase', 'AdjustmentIn', 'TransferIn'].includes(item.type);
                                    const parsedSupplierRef = parseSupplierFromRef(item);
                                    const parsedCustomerRef = parseCustomerFromRef(item);

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/60 transition">
                                            <td className="px-6 py-3.5 text-slate-500 font-mono">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                                    isPositive
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}>
                                                    {isPositive ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 font-bold font-mono text-slate-900">
                                                {isPositive ? `+${item.quantity}` : `-${item.quantity}`}
                                            </td>

                                            {/* Supplier / Customer / Reference Details */}
                                            <td className="px-6 py-3.5 text-slate-700">
                                                {parsedSupplierRef?.supplier ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openSupplierModal(parsedSupplierRef.supplier)}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300"
                                                            title="Click to view supplier popup info"
                                                        >
                                                            <Truck className="h-3.5 w-3.5 text-blue-600" />
                                                            <span>Supplier: {parsedSupplierRef.supplier.name}</span>
                                                            <Eye className="h-3 w-3 text-blue-500 ml-0.5" />
                                                        </button>
                                                        {parsedSupplierRef.invoiceNumber && (
                                                            <span className="font-mono text-[11px] text-slate-500">
                                                                Ref: {parsedSupplierRef.invoiceNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : parsedCustomerRef?.customer ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openCustomerModal(parsedCustomerRef.customer)}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/70 px-2.5 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 hover:border-purple-300"
                                                            title="Click to view customer popup info"
                                                        >
                                                            <Users className="h-3.5 w-3.5 text-purple-600" />
                                                            <span>Customer: {parsedCustomerRef.customer.name}</span>
                                                            <Eye className="h-3 w-3 text-purple-500 ml-0.5" />
                                                        </button>
                                                        {parsedCustomerRef.salesOrderNumber && (
                                                            <span className="font-mono text-[11px] text-slate-500">
                                                                Ref: {parsedCustomerRef.salesOrderNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-0.5">
                                                        {item.adjustmentReasonName && (
                                                            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                                <span>{item.adjustmentReasonName}</span>
                                                            </span>
                                                        )}
                                                        <span className="text-slate-600 text-xs">
                                                            {item.referenceId
                                                                ? (item.adjustmentReasonName ? `Note: ${item.referenceId}` : (item.referenceType ? `${item.referenceType}: ${item.referenceId}` : item.referenceId))
                                                                : (!item.adjustmentReasonName ? '-' : '')}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-3.5 text-slate-400 font-mono text-[11px]">
                                                {item.createdByUserId ? `${item.createdByUserId.substring(0, 8)}...` : 'System'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Supplier Info Popup Modal */}
            {supplierModalOpen && selectedSupplierForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                                    <Truck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        {selectedSupplierForModal.name}
                                    </h3>
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 mt-1">
                                        {selectedSupplierForModal.isActive ? 'Active Supplier' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSupplierModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="py-5 space-y-3.5 text-xs text-slate-600">
                            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                                    Supplier ID
                                </span>
                                <span className="font-mono text-slate-800 text-[11px]">
                                    {selectedSupplierForModal.id}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400">Email Address</p>
                                    {selectedSupplierForModal.email ? (
                                        <a
                                            href={`mailto:${selectedSupplierForModal.email}`}
                                            className="text-blue-600 hover:underline font-medium text-xs"
                                        >
                                            {selectedSupplierForModal.email}
                                        </a>
                                    ) : (
                                        <span className="text-slate-400">Not provided</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400">Phone Contact</p>
                                    {selectedSupplierForModal.phone ? (
                                        <a
                                            href={`tel:${selectedSupplierForModal.phone}`}
                                            className="text-slate-800 font-medium text-xs"
                                        >
                                            {selectedSupplierForModal.phone}
                                        </a>
                                    ) : (
                                        <span className="text-slate-400">Not provided</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400">Joined Supplier Since</p>
                                    <span className="text-slate-800 font-medium text-xs">
                                        {new Date(selectedSupplierForModal.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setSupplierModalOpen(false);
                                    navigate('/suppliers');
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Go to Suppliers Directory</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSupplierModalOpen(false)}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Info Popup Modal */}
            {customerModalOpen && selectedCustomerForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        {selectedCustomerForModal.name}
                                    </h3>
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 mt-1">
                                        {selectedCustomerForModal.isActive ? 'Active Client' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setCustomerModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="py-5 space-y-3.5 text-xs text-slate-600">
                            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                                    Customer ID
                                </span>
                                <span className="font-mono text-slate-800 text-[11px]">
                                    {selectedCustomerForModal.id}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400">Email Address</p>
                                    {selectedCustomerForModal.email ? (
                                        <a
                                            href={`mailto:${selectedCustomerForModal.email}`}
                                            className="text-purple-600 hover:underline font-medium text-xs"
                                        >
                                            {selectedCustomerForModal.email}
                                        </a>
                                    ) : (
                                        <span className="text-slate-400">Not provided</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400">Phone Contact</p>
                                    {selectedCustomerForModal.phone ? (
                                        <a
                                            href={`tel:${selectedCustomerForModal.phone}`}
                                            className="text-slate-800 font-medium text-xs"
                                        >
                                            {selectedCustomerForModal.phone}
                                        </a>
                                    ) : (
                                        <span className="text-slate-400">Not provided</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400">Customer Since</p>
                                    <span className="text-slate-800 font-medium text-xs">
                                        {new Date(selectedCustomerForModal.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setCustomerModalOpen(false);
                                    navigate('/customers');
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 hover:underline"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Go to Customers Directory</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setCustomerModalOpen(false)}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
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

export default StockMovementsPage;
