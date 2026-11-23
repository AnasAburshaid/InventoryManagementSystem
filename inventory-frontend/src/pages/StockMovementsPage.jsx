import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import stockMovementService from '../services/stockMovementService';
import supplierService from '../services/supplierService';
import customerService from '../services/customerService';
import supplierProductService from '../services/supplierProductService';
import { formatMoneyK, formatCurrency } from '../utils/formatUtils';
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
    ShoppingBag,
    ShieldCheck,
    ShieldAlert,
    Star,
    Search,
    Check,
    Tag,
    ChevronDown,
    Filter,
    DollarSign,
    Building2,
    MapPin
} from 'lucide-react';

export const StockMovementsPage = () => {
    const navigate = useNavigate();

    // Base Entities
    const [warehouses, setWarehouses] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [adjustmentReasons, setAdjustmentReasons] = useState([]);
    const [supplierProducts, setSupplierProducts] = useState([]);

    // Facility & Rules
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [warehouseRestrictions, setWarehouseRestrictions] = useState(null);
    const [loadingRestrictions, setLoadingRestrictions] = useState(false);

    // Movement Form State
    const [movementType, setMovementType] = useState('Purchase'); // Purchase, Sale, AdjustmentIn, AdjustmentOut
    const [eligibleProducts, setEligibleProducts] = useState([]);
    const [loadingEligibleProducts, setLoadingEligibleProducts] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState('');

    // Product Picker Search Modal
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [productCategoryFilter, setProductCategoryFilter] = useState('All');

    // Supplier / Customer / Reason Actor
    const [eligibleSuppliers, setEligibleSuppliers] = useState([]);
    const [loadingEligibleSuppliers, setLoadingEligibleSuppliers] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedAdjustmentReasonId, setSelectedAdjustmentReasonId] = useState('');

    // Quantity & Reference
    const [quantity, setQuantity] = useState(1);
    const [referenceType, setReferenceType] = useState('Supplier');
    const [referenceId, setReferenceId] = useState('');
    const [submittingMovement, setSubmittingMovement] = useState(false);

    // Stock & Ledger Display
    const [currentStock, setCurrentStock] = useState(null);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historySearch, setHistorySearch] = useState('');

    // UI Feedback
    const [pageError, setPageError] = useState('');
    const [pageSuccess, setPageSuccess] = useState('');

    // Inspector Modals
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [selectedSupplierForModal, setSelectedSupplierForModal] = useState(null);
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [selectedCustomerForModal, setSelectedCustomerForModal] = useState(null);

    // Transfer Modal
    const [showTransfer, setShowTransfer] = useState(false);
    const [destWarehouseId, setDestWarehouseId] = useState('');
    const [transferQty, setTransferQty] = useState(1);
    const [submittingTransfer, setSubmittingTransfer] = useState(false);

    // 1. Initial Load of Global Entities
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [whs, custs, adjReasons, spData] = await Promise.all([
                    warehouseService.getAll(),
                    customerService.getAll().catch(() => []),
                    stockMovementService.getAdjustmentReasons().catch(() => []),
                    supplierProductService.getAll().catch(() => [])
                ]);
                setWarehouses(whs || []);
                setCustomers(custs || []);
                setAdjustmentReasons(adjReasons || []);
                setSupplierProducts(spData || []);

                if (whs?.length > 0) {
                    setSelectedWarehouseId(whs[0].id);
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
                setPageError('Failed to load initial facility and customer data.');
            }
        };
        fetchInitial();
    }, []);

    // 2. Load Warehouse Restrictions and Eligible Products
    useEffect(() => {
        if (!selectedWarehouseId) return;

        let isMounted = true;
        const loadWarehouseData = async () => {
            setLoadingEligibleProducts(true);
            setLoadingRestrictions(true);
            try {
                const [restr, prods] = await Promise.all([
                    warehouseService.getRestrictions(selectedWarehouseId).catch(() => null),
                    warehouseService.getEligibleProducts(selectedWarehouseId).catch(() => [])
                ]);

                if (!isMounted) return;
                setWarehouseRestrictions(restr);
                setEligibleProducts(prods || []);

                if (prods && prods.length > 0) {
                    const stillEligible = prods.find((p) => p.id === selectedProductId);
                    if (!stillEligible) {
                        setSelectedProductId(prods[0].id);
                    }
                } else {
                    setSelectedProductId('');
                    setEligibleSuppliers([]);
                    setSelectedSupplierId('');
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Failed to load eligible products:', err);
                    setPageError('Failed to load eligible products for the selected facility.');
                }
            } finally {
                if (isMounted) {
                    setLoadingEligibleProducts(false);
                    setLoadingRestrictions(false);
                }
            }
        };

        loadWarehouseData();
        return () => {
            isMounted = false;
        };
    }, [selectedWarehouseId]);

    // 3. Load Eligible Suppliers for Product
    const fetchEligibleSuppliers = useCallback(async (productId) => {
        if (!productId) {
            setEligibleSuppliers([]);
            setSelectedSupplierId('');
            return;
        }

        setLoadingEligibleSuppliers(true);
        try {
            const data = await supplierService.getEligibleSuppliersForProduct(productId);
            setEligibleSuppliers(data || []);

            if (data && data.length > 0) {
                const preferred = data.find((s) => s.isPreferred);
                setSelectedSupplierId(preferred ? preferred.supplierId : data[0].supplierId);
            } else {
                setSelectedSupplierId('');
            }
        } catch (err) {
            console.error('Failed to fetch eligible suppliers:', err);
            setEligibleSuppliers([]);
            setSelectedSupplierId('');
        } finally {
            setLoadingEligibleSuppliers(false);
        }
    }, []);

    useEffect(() => {
        if (movementType === 'Purchase' && selectedProductId) {
            fetchEligibleSuppliers(selectedProductId);
        }
    }, [selectedProductId, movementType, fetchEligibleSuppliers]);

    // 4. Fetch Stock Level & Ledger History
    const fetchStockData = useCallback(async () => {
        if (!selectedWarehouseId || !selectedProductId) {
            setCurrentStock(null);
            setHistory([]);
            return;
        }
        setLoadingHistory(true);
        try {
            const [stockRes, histRes] = await Promise.all([
                stockMovementService.getCurrentStock(selectedWarehouseId, selectedProductId),
                stockMovementService.getHistory(selectedWarehouseId, selectedProductId)
            ]);
            setCurrentStock(stockRes);
            setHistory(histRes || []);
        } catch (err) {
            console.error('Error fetching stock movements:', err);
        } finally {
            setLoadingHistory(false);
        }
    }, [selectedWarehouseId, selectedProductId]);

    useEffect(() => {
        fetchStockData();
    }, [fetchStockData]);

    // Selected Entities
    const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);
    const selectedProduct = eligibleProducts.find((p) => p.id === selectedProductId);
    const currentSelectedSupplier = eligibleSuppliers.find((s) => s.supplierId === selectedSupplierId);
    const activeCustomers = customers.filter((c) => c.isActive);
    const currentSelectedCustomer = customers.find((c) => c.id === selectedCustomerId);

    // Sourcing Price Intelligence Map per Product (calculates avg purchase price across suppliers)
    const pricingIntelligenceMap = useMemo(() => {
        const map = {};
        supplierProducts.forEach((sp) => {
            if (!sp.productId) return;
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

        Object.keys(map).forEach((prodId) => {
            const item = map[prodId];
            const sum = item.prices.reduce((a, b) => a + b, 0);
            item.avgPrice = item.prices.length > 0 ? sum / item.prices.length : null;
            item.supplierCount = item.prices.length;
        });

        return map;
    }, [supplierProducts]);

    const selectedProductAvgPrice = selectedProduct ? pricingIntelligenceMap[selectedProduct.id]?.avgPrice : null;

    // Calculated Unit Price and Total Valuation / Revenue for the Movement
    const unitPrice = useMemo(() => {
        if (!selectedProduct) return 0;
        const pricing = pricingIntelligenceMap[selectedProduct.id];
        const avgCost = pricing?.avgPrice;
        if (movementType === 'Purchase') {
            return (
                currentSelectedSupplier?.lastPurchasePrice ??
                currentSelectedSupplier?.purchasePrice ??
                avgCost ??
                selectedProduct.sellingPrice ??
                0
            );
        }
        return selectedProduct.sellingPrice || avgCost || 0;
    }, [selectedProduct, movementType, currentSelectedSupplier, pricingIntelligenceMap]);

    const estimatedTotalValue = useMemo(() => {
        const qty = parseFloat(quantity) || 0;
        return qty * unitPrice;
    }, [quantity, unitPrice]);

    // Filtered Products for the Searchable Picker
    const availableCategories = useMemo(() => {
        const cats = new Set(eligibleProducts.map((p) => p.categoryName).filter(Boolean));
        return ['All', ...Array.from(cats)];
    }, [eligibleProducts]);

    const filteredProducts = useMemo(() => {
        return eligibleProducts.filter((p) => {
            const q = productSearch.toLowerCase().trim();
            const matchesQuery = !q ||
                p.name?.toLowerCase().includes(q) ||
                p.sku?.toLowerCase().includes(q) ||
                p.SKU?.toLowerCase().includes(q) ||
                p.categoryName?.toLowerCase().includes(q) ||
                p.brandName?.toLowerCase().includes(q);

            const matchesCategory = productCategoryFilter === 'All' || p.categoryName === productCategoryFilter;
            return matchesQuery && matchesCategory;
        });
    }, [eligibleProducts, productSearch, productCategoryFilter]);

    // Filtered History for Ledger
    const filteredHistory = useMemo(() => {
        if (!historySearch.trim()) return history;
        const q = historySearch.toLowerCase();
        return history.filter((item) =>
            item.type?.toLowerCase().includes(q) ||
            item.referenceId?.toLowerCase().includes(q) ||
            item.referenceType?.toLowerCase().includes(q) ||
            item.adjustmentReasonName?.toLowerCase().includes(q)
        );
    }, [history, historySearch]);

    // Open supplier info modal
    const openSupplierModal = async (supplierId) => {
        if (!supplierId) return;
        try {
            const fullSupplier = await supplierService.getById(supplierId);
            setSelectedSupplierForModal(fullSupplier);
            setSupplierModalOpen(true);
        } catch (err) {
            console.error('Failed to fetch supplier details:', err);
        }
    };

    // Open customer info modal
    const openCustomerModal = (customer) => {
        if (!customer) return;
        setSelectedCustomerForModal(customer);
        setCustomerModalOpen(true);
    };

    // Movement Type Switch
    const handleMovementTypeChange = (type) => {
        setMovementType(type);
        setPageError('');
        setPageSuccess('');
        if (type === 'Purchase') {
            setReferenceType('Supplier');
            if (selectedProductId) {
                fetchEligibleSuppliers(selectedProductId);
            }
        } else if (type === 'Sale') {
            setReferenceType('Customer');
        } else {
            setReferenceType('Adjustment');
        }
    };

    // Submit Movement
    const handleRecordMovement = async (e) => {
        e.preventDefault();
        setPageError('');
        setPageSuccess('');

        const reqQty = parseInt(quantity, 10);
        if (isNaN(reqQty) || reqQty <= 0) {
            setPageError('Please enter a valid whole number quantity of at least 1.');
            return;
        }

        let refType = referenceType;
        let refId = referenceId;
        let supplierIdToPass = null;

        if (movementType === 'Purchase') {
            if (!selectedSupplierId) {
                setPageError('Please select an authorized supplier for this purchase.');
                return;
            }
            supplierIdToPass = selectedSupplierId;
            refType = 'Supplier';
            refId = referenceId.trim()
                ? `${selectedSupplierId}|${referenceId.trim()}`
                : selectedSupplierId;
        } else if (movementType === 'Sale') {
            if (!selectedCustomerId) {
                setPageError('Please select a customer for this sale.');
                return;
            }
            if (reqQty > (currentStock ?? 0)) {
                setPageError(`Cannot sell ${reqQty} units. Only ${currentStock ?? 0} units are currently in stock.`);
                return;
            }
            refType = 'Customer';
            refId = referenceId.trim()
                ? `${selectedCustomerId}|${referenceId.trim()}`
                : selectedCustomerId;
        } else if (movementType.startsWith('Adjustment')) {
            if (movementType === 'AdjustmentOut' && reqQty > (currentStock ?? 0)) {
                setPageError(`Cannot adjust out ${reqQty} units. Only ${currentStock ?? 0} units are currently in warehouse stock.`);
                return;
            }
            if (!selectedAdjustmentReasonId && !referenceId.trim()) {
                setPageError('Please select an adjustment reason or enter an explanatory note.');
                return;
            }
            refType = 'Adjustment';
            refId = referenceId.trim() || null;
        }

        setSubmittingMovement(true);
        try {
            await stockMovementService.recordMovement(selectedWarehouseId, {
                productId: selectedProductId,
                warehouseId: selectedWarehouseId,
                quantity: reqQty,
                type: movementType,
                adjustmentReasonId: movementType.startsWith('Adjustment') ? (selectedAdjustmentReasonId || null) : null,
                referenceType: refType || null,
                referenceId: refId || null,
                supplierId: supplierIdToPass
            });

            let successNote = `Successfully recorded ${movementType} of ${reqQty} units!`;
            if (movementType === 'Purchase' && currentSelectedSupplier) {
                successNote = `Purchased ${reqQty} units from ${currentSelectedSupplier.supplierName}!`;
            } else if (movementType === 'Sale' && currentSelectedCustomer) {
                successNote = `Sold ${reqQty} units to ${currentSelectedCustomer.name}!`;
            }

            setPageSuccess(successNote);
            setReferenceId('');
            setQuantity(1);

            await Promise.all([
                fetchStockData(),
                movementType === 'Purchase' && selectedProductId ? fetchEligibleSuppliers(selectedProductId) : Promise.resolve()
            ]);
        } catch (err) {
            console.error('Error recording movement:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to record stock movement.';
            setPageError(msg);
        } finally {
            setSubmittingMovement(false);
        }
    };

    // Execute Inter-Warehouse Transfer
    const handleTransferStock = async (e) => {
        e.preventDefault();
        if (selectedWarehouseId === destWarehouseId) {
            setPageError('Destination facility must be different from source facility.');
            return;
        }

        setSubmittingTransfer(true);
        setPageError('');
        setPageSuccess('');

        const trfQtyInt = parseInt(transferQty, 10);
        if (isNaN(trfQtyInt) || trfQtyInt <= 0) {
            setPageError('Please enter a valid transfer quantity of at least 1.');
            return;
        }

        try {
            await stockMovementService.transferStock(selectedWarehouseId, {
                productId: selectedProductId,
                destinationWarehouseId: destWarehouseId,
                quantity: trfQtyInt,
                referenceType: 'WarehouseTransfer',
                referenceId: `TRF-${Date.now().toString().slice(-5)}`
            });

            setPageSuccess(`Transferred ${transferQty} units successfully!`);
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

    // Helper: Parse supplier from ledger reference
    const parseSupplierFromRef = (item) => {
        if (!item.referenceId) return null;
        let candidateId = item.referenceId;
        let invoiceNumber = null;

        if (item.referenceId.includes('|')) {
            const parts = item.referenceId.split('|');
            candidateId = parts[0];
            invoiceNumber = parts[1];
        }

        const supplier = eligibleSuppliers.find(
            (s) => s.supplierId.toLowerCase() === candidateId.toLowerCase()
        );

        if (!supplier && item.referenceType !== 'Supplier') return null;

        return {
            supplierId: candidateId,
            supplierName: supplier ? supplier.supplierName : 'Supplier',
            invoiceNumber
        };
    };

    // Helper: Parse customer from ledger reference
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
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock Movements</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Record purchases, sales, and inventory counts with facility and supplier compatibility guards.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            await fetchStockData();
                            if (movementType === 'Purchase' && selectedProductId) {
                                await fetchEligibleSuppliers(selectedProductId);
                            }
                        }}
                        disabled={loadingHistory || loadingEligibleSuppliers}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-60"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Notification Alerts */}
            {pageError && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-50 p-4 text-xs text-rose-800 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span className="font-medium">{pageError}</span>
                </div>
            )}

            {pageSuccess && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-xs text-emerald-800 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="font-medium">{pageSuccess}</span>
                </div>
            )}

            {/* PROMINENT FACILITY / WAREHOUSE SELECTOR */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs shrink-0">
                            <Warehouse className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-md">
                                    Step 1 • Target Facility
                                </span>
                                {selectedWarehouse?.code && (
                                    <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                        {selectedWarehouse.code}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                                {selectedWarehouse?.name || 'Select Warehouse'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {selectedWarehouse?.canAcceptAllCategories ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Accepts All Categories</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                                <span>
                                    {warehouseRestrictions?.permittedCategories?.length
                                        ? `Restricted to ${warehouseRestrictions.permittedCategories.length} Categories`
                                        : 'Category Restricted'}
                                </span>
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs">
                            <Package className="h-3.5 w-3.5 text-blue-600" />
                            <span>{loadingEligibleProducts ? '...' : `${eligibleProducts.length} Eligible Products`}</span>
                        </span>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 block">
                        Choose Active Warehouse:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {warehouses.map((w) => {
                            const isSelected = selectedWarehouseId === w.id;
                            return (
                                <div
                                    key={w.id}
                                    onClick={() => setSelectedWarehouseId(w.id)}
                                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                        isSelected
                                            ? 'border-blue-600 bg-white shadow-md ring-2 ring-blue-600/20'
                                            : 'border-slate-200 bg-white/80 hover:border-blue-300 hover:bg-white hover:shadow-xs'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-3">
                                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${
                                                isSelected ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                <Warehouse className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900">{w.name}</h3>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                        {w.code}
                                                    </span>
                                                    {w.address && (
                                                        <span className="text-[11px] text-slate-500 truncate max-w-[130px]" title={w.address}>
                                                            {w.address}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                                            isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300'
                                        }`}>
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-500 font-medium">Acceptance Policy:</span>
                                        <span className={`font-semibold ${w.canAcceptAllCategories ? 'text-emerald-700' : 'text-amber-700'}`}>
                                            {w.canAcceptAllCategories ? 'All Categories Permitted' : 'Restricted Categories'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Action Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                {/* Mode Selector Tabs */}
                <div className="border-b border-slate-100 p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                    <div className="flex rounded-xl bg-slate-200/70 p-1 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => handleMovementTypeChange('Purchase')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition ${
                                movementType === 'Purchase'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <ShoppingCart className="h-4 w-4 text-emerald-600" />
                            <span>Purchase (Inbound)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleMovementTypeChange('Sale')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition ${
                                movementType === 'Sale'
                                    ? 'bg-white text-purple-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <ShoppingBag className="h-4 w-4 text-purple-600" />
                            <span>Sale (Outbound)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleMovementTypeChange('AdjustmentOut')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition ${
                                movementType.startsWith('Adjustment')
                                    ? 'bg-white text-blue-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Plus className="h-4 w-4 text-blue-600" />
                            <span>Stock Adjustment</span>
                        </button>
                    </div>

                    {/* Active Facility Indicator */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <Warehouse className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-semibold text-slate-500">Active Facility:</span>
                        <span className="text-xs font-bold text-slate-900">{selectedWarehouse?.name}</span>
                        <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {selectedWarehouse?.code}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleRecordMovement} className="p-6 space-y-6">
                    {/* SECTION 1: PRODUCT SELECTOR (SEARCHABLE CARD PICKER) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Package className="h-4 w-4 text-blue-600" />
                                <span>Target Product</span>
                            </label>

                            {selectedProduct && (
                                <button
                                    type="button"
                                    onClick={() => setIsProductPickerOpen(true)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                                >
                                    <Search className="h-3 w-3" />
                                    <span>Change Product</span>
                                </button>
                            )}
                        </div>

                        {selectedProduct ? (
                            /* Selected Product Card */
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl border border-blue-200 bg-blue-50/30">
                                <div className="flex items-center gap-3.5">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs shrink-0">
                                        <Package className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-slate-900">{selectedProduct.name}</h3>
                                            <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                SKU: {selectedProduct.sku || selectedProduct.SKU}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                                                <Tag className="h-2.5 w-2.5 text-blue-500" />
                                                <span>{selectedProduct.categoryName || 'General'}</span>
                                            </span>
                                            {selectedProduct.brandName && (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="text-[11px] font-medium text-slate-600">
                                                        Brand: <strong>{selectedProduct.brandName}</strong>
                                                    </span>
                                                </>
                                            )}
                                            <span className="text-slate-300">•</span>
                                            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                                <DollarSign className="h-3 w-3 text-emerald-600 -mr-0.5" />
                                                <span>Avg Price: {formatMoneyK(selectedProductAvgPrice ?? selectedProduct.sellingPrice)}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-end sm:self-center flex-wrap">
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                            {selectedProductAvgPrice != null ? 'Avg Supplier Price' : 'Estimated Price'}
                                        </span>
                                        <span className="text-base font-extrabold font-mono text-emerald-700" title={formatCurrency(selectedProductAvgPrice ?? selectedProduct.sellingPrice)}>
                                            {formatMoneyK(selectedProductAvgPrice ?? selectedProduct.sellingPrice)}
                                        </span>
                                        {selectedProductAvgPrice != null && (
                                            <span className="text-[10px] text-slate-400 block font-medium">
                                                across authorized vendors
                                            </span>
                                        )}
                                    </div>

                                    <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                                    <div className="text-right">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                            Stock in {selectedWarehouse?.name || 'Facility'}
                                        </span>
                                        <span className="text-lg font-extrabold font-mono text-slate-900">
                                            {loadingHistory ? '...' : (currentStock ?? 0)} <span className="text-xs font-semibold text-slate-500">{selectedProduct.unitOfMeasureName || 'Units'}</span>
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsProductPickerOpen(true)}
                                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Unselected State Prompt */
                            <button
                                type="button"
                                onClick={() => setIsProductPickerOpen(true)}
                                className="w-full p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30 text-center transition flex flex-col items-center justify-center gap-2"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                    <Search className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">Click to Select a Product</p>
                                    <p className="text-[11px] text-slate-500">Search by product name, SKU, category, or brand</p>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* SECTION 2: ACTOR (SUPPLIER CARDS FOR PURCHASE / CUSTOMER FOR SALE / REASONS FOR ADJUSTMENT) */}
                    {movementType === 'Purchase' ? (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Truck className="h-4 w-4 text-emerald-600" />
                                    <span>Select Authorized Supplier</span>
                                </label>
                                {eligibleSuppliers.length > 0 && (
                                    <span className="text-xs text-slate-500 font-medium">
                                        {eligibleSuppliers.length} supplier{eligibleSuppliers.length > 1 ? 's' : ''} authorized
                                    </span>
                                )}
                            </div>

                            {loadingEligibleSuppliers ? (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    Checking authorized suppliers and ATP stock...
                                </div>
                            ) : eligibleSuppliers.length === 0 ? (
                                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800 flex items-center gap-2.5">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                                    <span>
                                        No suppliers are authorized to supply <strong>{selectedProduct?.name}</strong>. A supplier must offer this product and match capability authorizations.
                                    </span>
                                </div>
                            ) : (
                                /* Visual Supplier Selection Cards */
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {eligibleSuppliers.map((s) => {
                                        const isSelected = selectedSupplierId === s.supplierId;
                                        return (
                                            <div
                                                key={s.supplierId}
                                                onClick={() => setSelectedSupplierId(s.supplierId)}
                                                className={`relative p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                                                    isSelected
                                                        ? 'border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-600'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <h4 className="text-xs font-bold text-slate-900">{s.supplierName}</h4>
                                                            {s.isPreferred && (
                                                                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 text-emerald-800 px-1 py-0.2 text-[9px] font-bold">
                                                                    <Star className="h-2 w-2 fill-emerald-700" /> Preferred
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-slate-500">
                                                            Price: <strong title={formatCurrency(s.lastPurchasePrice ?? s.purchasePrice ?? 0)}>{formatMoneyK(s.lastPurchasePrice ?? s.purchasePrice ?? 0)}</strong> {s.leadTimeDays ? `• ${s.leadTimeDays}d lead` : ''}
                                                        </span>
                                                    </div>

                                                    <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
                                                        isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                                                    }`}>
                                                        {isSelected && <Check className="h-2.5 w-2.5" />}
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-500 font-medium">Available to Promise:</span>
                                                    <span className={`font-mono font-bold ${s.availableToPromise > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                        {s.availableToPromise} units
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : movementType === 'Sale' ? (
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                                <Users className="h-4 w-4 text-purple-600" />
                                <span>Client / Customer</span>
                            </label>
                            <div className="flex gap-2">
                                <select
                                    required
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-2xs outline-none focus:border-purple-500"
                                >
                                    {activeCustomers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.phone ? `(${c.phone})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {currentSelectedCustomer && (
                                    <button
                                        type="button"
                                        onClick={() => openCustomerModal(currentSelectedCustomer)}
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-600 hover:bg-slate-100 transition shrink-0"
                                        title="View Customer Profile"
                                    >
                                        <Eye className="h-4 w-4 text-purple-600" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                                    Adjustment Direction
                                </label>
                                <select
                                    value={movementType}
                                    onChange={(e) => setMovementType(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                                >
                                    <option value="AdjustmentOut">- Damaged / Discrepancy (Deduct Stock)</option>
                                    <option value="AdjustmentIn">+ Found / Surplus (Add Stock)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                                    Reason
                                </label>
                                <select
                                    value={selectedAdjustmentReasonId}
                                    onChange={(e) => setSelectedAdjustmentReasonId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                                >
                                    {adjustmentReasons.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: QUANTITY & REFERENCE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Quantity
                                </label>
                                {movementType === 'Purchase' && currentSelectedSupplier && (
                                    <span className="text-[11px] font-semibold text-emerald-700">
                                        Supplier ATP: {currentSelectedSupplier.availableToPromise}
                                    </span>
                                )}
                                {(movementType === 'Sale' || movementType === 'AdjustmentOut') && (
                                    <span className="text-[11px] font-semibold text-slate-600">
                                        Available: {currentStock ?? 0}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setQuantity((prev) => Math.max(1, (parseInt(prev, 10) || 1) - 1))}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold"
                                    title="Decrease quantity by 1"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    value={quantity}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            setQuantity('');
                                        } else {
                                            const intVal = parseInt(val, 10);
                                            setQuantity(isNaN(intVal) ? '' : Math.max(1, intVal));
                                        }
                                    }}
                                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-center text-slate-900 outline-none focus:border-blue-500 h-10 font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setQuantity((prev) => (parseInt(prev, 10) || 0) + 1)}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold"
                                    title="Increase quantity by 1"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                                Reference # (PO / Invoice / Note)
                            </label>
                            <input
                                type="text"
                                placeholder={
                                    movementType === 'Purchase'
                                        ? 'e.g. PO-1024 or Invoice #'
                                        : movementType === 'Sale'
                                        ? 'e.g. SO-8910 or Receipt #'
                                        : 'e.g. Water damage, count correction'
                                }
                                value={referenceId}
                                onChange={(e) => setReferenceId(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 h-10"
                            />
                        </div>
                    </div>

                    {/* Financial Price & Revenue/Cost Summary Box */}
                    {selectedProduct && (
                        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 to-blue-50/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 shadow-2xs ${
                                    movementType === 'Purchase'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : movementType === 'Sale'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-blue-100 text-blue-700'
                                }`}>
                                    <DollarSign className="h-6 w-6" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                        {movementType === 'Purchase'
                                            ? 'Unit Procurement Cost'
                                            : movementType === 'Sale'
                                            ? 'Unit Selling Price'
                                            : 'Unit Valuation'}
                                    </span>
                                    <div className="text-sm font-bold text-slate-900 font-mono" title={formatCurrency(unitPrice)}>
                                        {formatMoneyK(unitPrice)} <span className="text-[11px] font-normal text-slate-500">per {selectedProduct.unitOfMeasureName || 'unit'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                    {movementType === 'Purchase'
                                        ? 'Total Procurement Spend'
                                        : movementType === 'Sale'
                                        ? 'Total Expected Revenue'
                                        : 'Total Stock Valuation'}
                                </span>
                                <div
                                    className={`text-2xl font-black font-mono tracking-tight ${
                                        movementType === 'Sale'
                                            ? 'text-purple-700'
                                            : movementType === 'Purchase'
                                            ? 'text-emerald-700'
                                            : 'text-blue-700'
                                    }`}
                                    title={formatCurrency(estimatedTotalValue)}
                                >
                                    {formatMoneyK(estimatedTotalValue)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Bar */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={
                                submittingMovement ||
                                !selectedProductId ||
                                (movementType === 'Purchase' && (!selectedSupplierId || eligibleSuppliers.length === 0)) ||
                                (movementType === 'Sale' && !selectedCustomerId)
                            }
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
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
                                        {movementType === 'Purchase' && `Confirm Purchase of ${quantity || 0} Units • ${formatMoneyK(estimatedTotalValue)}`}
                                        {movementType === 'Sale' && `Confirm Sale of ${quantity || 0} Units • ${formatMoneyK(estimatedTotalValue)}`}
                                        {movementType.startsWith('Adjustment') && `Commit Stock Adjustment • ${formatMoneyK(estimatedTotalValue)}`}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Inter-Warehouse Transfer Collapsible Action */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                    <Send className="h-4 w-4 text-blue-600" />
                    <div>
                        <h4 className="text-xs font-bold text-slate-900">Need to move stock between facilities?</h4>
                        <p className="text-[11px] text-slate-500">Transfer {selectedProduct?.name || 'this product'} to another active warehouse facility.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowTransfer(!showTransfer)}
                    disabled={!selectedProductId || (currentStock ?? 0) <= 0}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition disabled:opacity-50"
                >
                    {showTransfer ? 'Hide Transfer' : 'Transfer Stock'}
                </button>
            </div>

            {showTransfer && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-in fade-in">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Send className="h-4 w-4 text-blue-600" />
                        <span>Transfer {selectedProduct?.name} to Another Warehouse</span>
                    </h3>
                    <form onSubmit={handleTransferStock} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Destination Warehouse *</label>
                            <select
                                required
                                value={destWarehouseId}
                                onChange={(e) => setDestWarehouseId(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-medium"
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
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quantity to Transfer (Units) *</label>
                            <input
                                type="number"
                                min="1"
                                max={Math.max(1, Math.floor(currentStock || 1))}
                                step="1"
                                value={transferQty}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '') {
                                        setTransferQty('');
                                    } else {
                                        const intVal = parseInt(val, 10);
                                        setTransferQty(isNaN(intVal) ? '' : Math.max(1, intVal));
                                    }
                                }}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium font-mono"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={submittingTransfer}
                                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-60"
                            >
                                {submittingTransfer ? 'Transferring...' : 'Execute Transfer'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowTransfer(false)}
                                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* LEDGER AUDIT TABLE */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                <div className="border-b border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">
                            Movement History Ledger ({filteredHistory.length} records)
                        </h3>
                        <p className="text-xs text-slate-400">
                            Immutable audit trail for {selectedProduct?.name || 'product'} in {selectedWarehouse?.name || 'facility'}
                        </p>
                    </div>

                    <div className="relative">
                        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter ledger records..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 w-48 sm:w-64"
                        />
                    </div>
                </div>

                {loadingHistory ? (
                    <div className="flex justify-center p-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400">
                        No movement records found for this product in this facility.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-3.5">Timestamp</th>
                                    <th className="px-6 py-3.5">Type</th>
                                    <th className="px-6 py-3.5">Quantity</th>
                                    <th className="px-6 py-3.5">Party / Reference</th>
                                    <th className="px-6 py-3.5">Actor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredHistory.map((item) => {
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
                                            <td className="px-6 py-3.5 text-slate-700">
                                                {parsedSupplierRef ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openSupplierModal(parsedSupplierRef.supplierId)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
                                                        >
                                                            <Truck className="h-3 w-3 text-emerald-600" />
                                                            <span>{parsedSupplierRef.supplierName}</span>
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
                                                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 px-2 py-0.5 text-xs font-semibold text-purple-800 hover:bg-purple-100 transition"
                                                        >
                                                            <Users className="h-3 w-3 text-purple-600" />
                                                            <span>{parsedCustomerRef.customer.name}</span>
                                                        </button>
                                                        {parsedCustomerRef.salesOrderNumber && (
                                                            <span className="font-mono text-[11px] text-slate-500">
                                                                Ref: {parsedCustomerRef.salesOrderNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600">
                                                        {item.adjustmentReasonName || item.referenceId || '-'}
                                                    </span>
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

            {/* SEARCHABLE PRODUCT PICKER MODAL */}
            {isProductPickerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Select Compatible Product</h3>
                                    <p className="text-[11px] text-slate-500">Showing products permitted for {selectedWarehouse?.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsProductPickerOpen(false)}
                                className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search & Category Filter Bar */}
                        <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/60">
                            <div className="relative">
                                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search by product name, SKU, category, or brand..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                                {productSearch && (
                                    <button
                                        onClick={() => setProductSearch('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                {availableCategories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setProductCategoryFilter(cat)}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                            productCategoryFilter === cat
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Product Grid / List */}
                        <div className="p-4 overflow-y-auto flex-1 space-y-2">
                            {filteredProducts.length === 0 ? (
                                <div className="p-12 text-center text-xs text-slate-400">
                                    No products found matching "{productSearch}".
                                </div>
                            ) : (
                                filteredProducts.map((p) => {
                                    const isSelected = selectedProductId === p.id;
                                    const pricing = pricingIntelligenceMap[p.id];
                                    const avgPrice = pricing?.avgPrice;
                                    const supplierCount = pricing?.supplierCount || 0;
                                    const displayPrice = avgPrice != null ? avgPrice : (p.sellingPrice || 0);

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => {
                                                setSelectedProductId(p.id);
                                                setIsProductPickerOpen(false);
                                            }}
                                            className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                                                isSelected
                                                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                                                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    <Package className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="font-mono text-[11px] text-slate-500 font-semibold">
                                                            SKU: {p.sku || p.SKU}
                                                        </span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-[11px] text-slate-600 font-medium">
                                                            {p.categoryName || 'General'}
                                                        </span>
                                                        {p.brandName && (
                                                            <>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="text-[11px] text-slate-500">
                                                                    Brand: {p.brandName}
                                                                </span>
                                                            </>
                                                        )}
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                            {avgPrice != null ? `Avg: ${formatMoneyK(avgPrice)}` : formatMoneyK(p.sellingPrice)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="text-right">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                        {avgPrice != null ? 'Avg Price' : 'Selling Price'}
                                                    </span>
                                                    <span className="text-base font-extrabold text-slate-900 font-mono block text-emerald-700" title={formatCurrency(displayPrice)}>
                                                        {formatMoneyK(displayPrice)}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block font-medium">
                                                        {avgPrice != null && supplierCount > 0 ? `${supplierCount} supplier${supplierCount > 1 ? 's' : ''}` : `per ${p.unitOfMeasureName || 'unit'}`}
                                                    </span>
                                                </div>
                                                <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                                                    isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300'
                                                }`}>
                                                    {isSelected && <Check className="h-3 w-3" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                            <span>{filteredProducts.length} products listed</span>
                            <button
                                onClick={() => setIsProductPickerOpen(false)}
                                className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Supplier Info Modal */}
            {supplierModalOpen && selectedSupplierForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
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
                            <button onClick={() => setSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="py-4 space-y-3 text-xs text-slate-600">
                            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Supplier Code</span>
                                <span className="font-mono text-slate-800 text-[11px]">{selectedSupplierForModal.code || selectedSupplierForModal.id}</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400">Email</p>
                                    <span className="text-slate-800 font-medium">{selectedSupplierForModal.email || 'Not provided'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400">Phone</p>
                                    <span className="text-slate-800 font-medium">{selectedSupplierForModal.phone || 'Not provided'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setSupplierModalOpen(false);
                                    navigate(`/suppliers/${selectedSupplierForModal.id}`);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>View Full Profile</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSupplierModalOpen(false)}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Info Modal */}
            {customerModalOpen && selectedCustomerForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">{selectedCustomerForModal.name}</h3>
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 mt-1">
                                        {selectedCustomerForModal.isActive ? 'Active Client' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="py-4 space-y-3 text-xs text-slate-600">
                            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Customer ID</span>
                                <span className="font-mono text-slate-800 text-[11px]">{selectedCustomerForModal.id}</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400">Email</p>
                                    <span className="text-slate-800 font-medium">{selectedCustomerForModal.email || 'Not provided'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400">Phone</p>
                                    <span className="text-slate-800 font-medium">{selectedCustomerForModal.phone || 'Not provided'}</span>
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
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>View Client Directory</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCustomerModalOpen(false)}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
