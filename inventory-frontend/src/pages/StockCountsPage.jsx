import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    ClipboardCheck,
    Plus,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Warehouse,
    Package,
    Calendar,
    Eye,
    X,
    Filter,
    ShieldCheck,
    Check,
    Search,
    Clock,
    FileSpreadsheet,
    ArrowUpRight,
    ArrowDownLeft,
    SlidersHorizontal,
    AlertTriangle,
    CheckCheck,
    Info,
    Ban,
    Barcode,
    Sparkles,
    CheckSquare,
    ChevronRight,
    Maximize2,
    Minimize2,
    Layers,
    ListFilter,
    LayoutGrid,
    List
} from 'lucide-react';
import warehouseService from '../services/warehouseService';
import productService from '../services/productService';
import stockCountService from '../services/stockCountService';
import { useAuth } from '../context/AuthContext';

export const StockCountsPage = () => {
    const { user } = useAuth();
    const isSupervisorOrManager = user?.roles?.some(r => ['Admin', 'Manager', 'Supervisor'].includes(r));

    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [products, setProducts] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('cards');
    const [alertMessage, setAlertMessage] = useState(null);

    // Active session sheet/drawer
    const [activeSession, setActiveSession] = useState(null);
    const [loadingSession, setLoadingSession] = useState(false);
    const [countInputs, setCountInputs] = useState({});
    const [notesInputs, setNotesInputs] = useState({});
    const [savingCounts, setSavingCounts] = useState(false);
    const [submittingSession, setSubmittingSession] = useState(false);
    const [showOnlyDiscrepancies, setShowOnlyDiscrepancies] = useState(false);
    const [sheetSearchTerm, setSheetSearchTerm] = useState('');
    const [sheetIsFullscreen, setSheetIsFullscreen] = useState(false);

    // New Session Modal
    const [showNewModal, setShowNewModal] = useState(false);
    const [newCountType, setNewCountType] = useState('Full');
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [newSessionNotes, setNewSessionNotes] = useState('');
    const [submittingNew, setSubmittingNew] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Review Modal
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewAction, setReviewAction] = useState('Approve');
    const [reviewNotes, setReviewNotes] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    // Input refs for keyboard navigation
    const inputRefs = useRef({});

    // Listen for custom event from Command Palette
    useEffect(() => {
        const handleOpenNew = () => setShowNewModal(true);
        window.addEventListener('open-new-stock-count', handleOpenNew);
        return () => window.removeEventListener('open-new-stock-count', handleOpenNew);
    }, []);

    // Initial load
    useEffect(() => {
        const loadInitial = async () => {
            try {
                const whData = await warehouseService.getAll();
                setWarehouses(whData || []);
                if (whData && whData.length > 0) {
                    setSelectedWarehouseId(whData[0].id);
                }

                const prodData = await productService.getAll();
                setProducts(prodData || []);
            } catch (err) {
                console.error('Failed to load initial data:', err);
                showAlert('Failed to load warehouses or products.', 'error');
            }
        };
        loadInitial();
    }, []);

    // Load Sessions for warehouse
    const loadSessions = useCallback(async () => {
        if (!selectedWarehouseId) return;
        setLoading(true);
        try {
            const data = await stockCountService.getSessions(selectedWarehouseId, statusFilter || null);
            setSessions(data || []);
        } catch (err) {
            console.error('Failed to load count sessions:', err);
            const errMsg = err.response?.data?.message || err.message || 'Failed to load stock count sessions for this facility.';
            showAlert(errMsg, 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedWarehouseId, statusFilter]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const showAlert = (message, type = 'success') => {
        setAlertMessage({ message, type });
        setTimeout(() => setAlertMessage(null), 5000);
    };

    // Load full details of a session
    const openSessionDetail = async (sessionId) => {
        if (!selectedWarehouseId) return;
        setLoadingSession(true);
        try {
            const data = await stockCountService.getSessionById(selectedWarehouseId, sessionId);
            setActiveSession(data);

            const inputs = {};
            const notes = {};
            (data.items || []).forEach(item => {
                inputs[item.productId] = item.countedQuantity !== null && item.countedQuantity !== undefined ? item.countedQuantity : '';
                notes[item.productId] = item.notes || '';
            });
            setCountInputs(inputs);
            setNotesInputs(notes);
            setShowOnlyDiscrepancies(false);
            setSheetSearchTerm('');
        } catch (err) {
            console.error('Failed to load session details:', err);
            showAlert('Could not load session details.', 'error');
        } finally {
            setLoadingSession(false);
        }
    };

    // Quick Action: Match All Uncounted Items to System Quantity
    const handleMatchAllToSystem = () => {
        if (!activeSession?.items) return;
        const newInputs = { ...countInputs };
        activeSession.items.forEach(item => {
            if (newInputs[item.productId] === '' || newInputs[item.productId] === undefined) {
                newInputs[item.productId] = item.systemQuantity;
            }
        });
        setCountInputs(newInputs);
        showAlert('Populated uncounted items with system ledger quantities. Review and save when ready!', 'success');
    };

    // Adjust single item count stepper
    const adjustItemCount = (productId, delta) => {
        setCountInputs(prev => {
            const currentVal = parseFloat(prev[productId]) || 0;
            const newVal = Math.max(0, currentVal + delta);
            return { ...prev, [productId]: newVal };
        });
    };

    // Create New Session
    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!selectedWarehouseId) return;
        if (newCountType === 'SelectedProducts' && selectedProductIds.length === 0) {
            showAlert('Please select at least one product for a partial count.', 'error');
            return;
        }

        setSubmittingNew(true);
        try {
            const payload = {
                warehouseId: selectedWarehouseId,
                countType: newCountType,
                productIds: newCountType === 'SelectedProducts' ? selectedProductIds : null,
                notes: newSessionNotes
            };

            const created = await stockCountService.createSession(selectedWarehouseId, payload);
            showAlert(`Session ${created.sessionNumber} created successfully!`, 'success');
            setShowNewModal(false);
            setNewSessionNotes('');
            setSelectedProductIds([]);
            loadSessions();
            openSessionDetail(created.id);
        } catch (err) {
            console.error('Failed to create session:', err);
            showAlert(err.response?.data?.message || 'Failed to create count session.', 'error');
        } finally {
            setSubmittingNew(false);
        }
    };

    // Save Physical Counts
    const handleSaveCounts = async () => {
        if (!activeSession) return;
        const itemsToSave = [];

        Object.keys(countInputs).forEach(productId => {
            const val = countInputs[productId];
            if (val !== '' && !isNaN(val)) {
                itemsToSave.push({
                    productId,
                    countedQuantity: parseFloat(val),
                    notes: notesInputs[productId] || ''
                });
            }
        });

        if (itemsToSave.length === 0) {
            showAlert('Please enter at least one counted quantity.', 'error');
            return;
        }

        setSavingCounts(true);
        try {
            const updated = await stockCountService.recordCounts(selectedWarehouseId, activeSession.id, itemsToSave);
            setActiveSession(updated);
            showAlert('Physical count entries updated and saved to server!', 'success');
            loadSessions();
        } catch (err) {
            console.error('Failed to save counts:', err);
            showAlert(err.response?.data?.message || 'Failed to save counts.', 'error');
        } finally {
            setSavingCounts(false);
        }
    };

    // Submit For Review
    const handleSubmitForReview = async () => {
        if (!activeSession) return;
        setSubmittingSession(true);
        try {
            const updated = await stockCountService.submitForReview(selectedWarehouseId, activeSession.id);
            setActiveSession(updated);
            showAlert(`Session ${activeSession.sessionNumber} submitted for supervisor review!`, 'success');
            loadSessions();
        } catch (err) {
            console.error('Failed to submit session:', err);
            showAlert(err.response?.data?.message || 'Failed to submit session.', 'error');
        } finally {
            setSubmittingSession(false);
        }
    };

    // Review Session (Supervisor Action)
    const handleReviewSubmit = async () => {
        if (!activeSession) return;
        setSubmittingReview(true);
        try {
            const payload = {
                approve: reviewAction === 'Approve',
                reviewNotes
            };

            const updated = await stockCountService.reviewSession(selectedWarehouseId, activeSession.id, payload);
            setActiveSession(updated);
            setShowReviewModal(false);
            setReviewNotes('');
            showAlert(
                reviewAction === 'Approve'
                    ? `Session ${activeSession.sessionNumber} approved! Discrepancies have been posted to the stock ledger.`
                    : `Session ${activeSession.sessionNumber} rejected.`,
                'success'
            );
            loadSessions();
        } catch (err) {
            console.error('Review failed:', err);
            showAlert(err.response?.data?.message || 'Failed to process review.', 'error');
        } finally {
            setSubmittingReview(false);
        }
    };

    // Cancel Session
    const handleCancelSession = async () => {
        if (!activeSession) return;
        if (!window.confirm('Are you sure you want to cancel this stock count session?')) return;

        try {
            await stockCountService.cancelSession(selectedWarehouseId, activeSession.id, 'Cancelled by user');
            showAlert(`Session ${activeSession.sessionNumber} has been cancelled.`, 'success');
            setActiveSession(null);
            loadSessions();
        } catch (err) {
            console.error('Cancel failed:', err);
            showAlert(err.response?.data?.message || 'Failed to cancel session.', 'error');
        }
    };

    // Unique Categories for product selector
    const productCategories = useMemo(() => {
        const set = new Set();
        products.forEach(p => {
            if (p.categoryName) set.add(p.categoryName);
        });
        return ['All', ...Array.from(set)];
    }, [products]);

    // Filtered Sessions
    const filteredSessions = useMemo(() => {
        if (!searchQuery.trim()) return sessions;
        const q = searchQuery.toLowerCase();
        return sessions.filter(s =>
            s.sessionNumber?.toLowerCase().includes(q) ||
            s.notes?.toLowerCase().includes(q) ||
            s.createdByUserName?.toLowerCase().includes(q)
        );
    }, [sessions, searchQuery]);

    // Metrics
    const totalCount = sessions.length;
    const inProgressCount = sessions.filter(s => s.status === 'Draft' || s.status === 'InProgress').length;
    const submittedCount = sessions.filter(s => s.status === 'Submitted').length;
    const approvedCount = sessions.filter(s => s.status === 'Approved').length;
    const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Draft':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span> Draft
                    </span>
                );
            case 'InProgress':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                        <Clock className="h-3 w-3 text-amber-600" /> In Progress
                    </span>
                );
            case 'Submitted':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                        <ShieldCheck className="h-3 w-3 text-blue-600" /> Under Review
                    </span>
                );
            case 'Approved':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Reconciled
                    </span>
                );
            case 'Rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
                        <XCircle className="h-3 w-3 text-rose-600" /> Rejected
                    </span>
                );
            case 'Cancelled':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 border border-gray-200">
                        <Ban className="h-3 w-3 text-gray-500" /> Cancelled
                    </span>
                );
            default:
                return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{status}</span>;
        }
    };

    // Calculate session discrepancies summary for active session
    const discrepancySummary = useMemo(() => {
        if (!activeSession?.items) return { totalDiscrepancies: 0, positiveQty: 0, negativeQty: 0, countedItemsCount: 0 };
        let count = 0;
        let pos = 0;
        let neg = 0;
        let countedCount = 0;

        activeSession.items.forEach(item => {
            const counted = countInputs[item.productId];
            if (counted !== '' && counted !== undefined && !isNaN(counted)) {
                countedCount++;
                const diff = parseFloat(counted) - (item.systemQuantity || 0);
                if (diff !== 0) {
                    count++;
                    if (diff > 0) pos += diff;
                    else neg += Math.abs(diff);
                }
            } else if (item.discrepancyQuantity && item.discrepancyQuantity !== 0) {
                count++;
                if (item.discrepancyQuantity > 0) pos += item.discrepancyQuantity;
                else neg += Math.abs(item.discrepancyQuantity);
            }
        });
        return { totalDiscrepancies: count, positiveQty: pos, negativeQty: neg, countedItemsCount: countedCount };
    }, [activeSession, countInputs]);

    // Active session items filtered
    const visibleSessionItems = useMemo(() => {
        if (!activeSession?.items) return [];
        let items = activeSession.items;

        if (sheetSearchTerm.trim()) {
            const q = sheetSearchTerm.toLowerCase();
            items = items.filter(i =>
                i.productName?.toLowerCase().includes(q) ||
                i.productSku?.toLowerCase().includes(q)
            );
        }

        if (showOnlyDiscrepancies) {
            items = items.filter(item => {
                const counted = countInputs[item.productId];
                if (counted !== '' && counted !== undefined && !isNaN(counted)) {
                    return parseFloat(counted) !== (item.systemQuantity || 0);
                }
                return item.discrepancyQuantity && item.discrepancyQuantity !== 0;
            });
        }

        return items;
    }, [activeSession, showOnlyDiscrepancies, sheetSearchTerm, countInputs]);

    const completionPct = activeSession?.items?.length > 0
        ? Math.round((discrepancySummary.countedItemsCount / activeSession.items.length) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <ClipboardCheck className="h-7 w-7 text-blue-600" />
                        Stock Counting & Reconciliation
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Physical inventory count verification, cycle audits, discrepancy detection, and automated ledger reconciliation.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={loadSessions}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={() => setShowNewModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Start Count Session</span>
                    </button>
                </div>
            </div>

            {/* Alert Banner */}
            {alertMessage && (
                <div
                    className={`flex items-center justify-between gap-2 rounded-xl p-4 text-sm font-medium shadow-sm transition ${
                        alertMessage.type === 'error'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {alertMessage.type === 'error' ? (
                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        )}
                        <span>{alertMessage.message}</span>
                    </div>
                    <button
                        onClick={() => setAlertMessage(null)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Facility Context & KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Facility</span>
                        <Warehouse className="h-4 w-4 text-blue-600" />
                    </div>
                    <select
                        value={selectedWarehouseId}
                        onChange={(e) => { setSelectedWarehouseId(e.target.value); setActiveSession(null); }}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-bold text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                        {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name} ({w.code})
                            </option>
                        ))}
                    </select>
                    {selectedWarehouse && (
                        <p className="text-[11px] text-slate-400 mt-2 truncate font-medium">
                            {selectedWarehouse.address || 'Facility active & operational'}
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Count Sessions</span>
                        <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black text-slate-900 font-mono tabular-nums">{totalCount}</span>
                        <span className="text-xs text-slate-500 font-medium">recorded sessions</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Full facility & cycle counts</p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">In Progress</span>
                        <Clock className={`h-4 w-4 ${inProgressCount > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className={`text-3xl font-black font-mono tabular-nums ${inProgressCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                            {inProgressCount}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">under count</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Floor count entry active</p>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Awaiting Review</span>
                        <ShieldCheck className={`h-4 w-4 ${submittedCount > 0 ? 'text-blue-600' : 'text-slate-300'}`} />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className={`text-3xl font-black font-mono tabular-nums ${submittedCount > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
                            {submittedCount}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">ready for approval</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Supervisor reconciliation</p>
                </div>
            </div>

            {/* Filter, View Switcher and Search Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Filter className="h-4 w-4 text-slate-400 mr-1" />
                    {[
                        { key: '', label: 'All Sessions', count: sessions.length },
                        { key: 'Draft', label: 'Draft', count: sessions.filter(s => s.status === 'Draft').length },
                        { key: 'InProgress', label: 'In Progress', count: sessions.filter(s => s.status === 'InProgress').length },
                        { key: 'Submitted', label: 'In Review', count: sessions.filter(s => s.status === 'Submitted').length },
                        { key: 'Approved', label: 'Reconciled', count: sessions.filter(s => s.status === 'Approved').length }
                    ].map((tab) => (
                        <button
                            key={tab.key || 'all'}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                                statusFilter === tab.key
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${statusFilter === tab.key ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher: Cards vs Table */}
                    <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                        <button
                            onClick={() => setViewMode('cards')}
                            title="Session Cards Grid"
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                viewMode === 'cards'
                                    ? 'bg-white text-blue-700 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>Cards</span>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            title="Streamlined Table"
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-white text-blue-700 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <List className="h-3.5 w-3.5" />
                            <span>Table</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search session # or user..."
                            className="rounded-xl border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-44 sm:w-56"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Sessions Content: Cards vs Streamlined Table */}
            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-slate-400 shadow-sm">
                    <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-500 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Loading count sessions...</p>
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                        <ClipboardCheck className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">No Stock Count Sessions</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        {searchQuery
                            ? 'No sessions match your search terms.'
                            : 'No inventory count sessions have been initiated for this facility matching the active filter.'}
                    </p>
                    <div className="mt-4">
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Start New Count Session</span>
                        </button>
                    </div>
                </div>
            ) : viewMode === 'cards' ? (
                /* ================= SESSION CARDS GRID ================= */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredSessions.map((session) => {
                        const itemsCount = session.itemsCount || 0;
                        const countedCount = session.countedItemsCount || 0;
                        const pct = itemsCount > 0 ? Math.round((countedCount / itemsCount) * 100) : 0;

                        return (
                            <div
                                key={session.id}
                                onClick={() => openSessionDetail(session.id)}
                                className={`rounded-3xl border bg-white p-5 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer group ${
                                    activeSession?.id === session.id
                                        ? 'border-blue-400 ring-2 ring-blue-500/10'
                                        : 'border-slate-200/90'
                                }`}
                            >
                                <div className="space-y-4">
                                    {/* Card Header: Session #, Status & Scope */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 font-bold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                                                <ClipboardCheck className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <span className="font-mono text-sm font-black text-slate-900 block group-hover:text-blue-600 transition">
                                                    {session.sessionNumber}
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-500 block">
                                                    {session.countType === 'Full' ? 'Full Warehouse Audit' : `Partial (${session.itemsCount || 0} items)`}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            {getStatusBadge(session.status)}
                                        </div>
                                    </div>

                                    {/* Counting Progress Meter */}
                                    <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Counting Progress
                                            </span>
                                            <span className="font-mono font-bold text-slate-800">
                                                {countedCount} / {itemsCount} items ({pct}%)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                                }`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Discrepancy & Remarks */}
                                    <div className="flex items-center justify-between text-xs pt-0.5">
                                        <div>
                                            {session.hasDiscrepancies ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                                                    <AlertTriangle className="h-3 w-3" /> Discrepancies
                                                </span>
                                            ) : countedCount > 0 ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                                    <Check className="h-3 w-3" /> Exact Match
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic font-medium">Uncounted</span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-slate-400">
                                            {new Date(session.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {session.notes && (
                                        <p className="text-xs text-slate-500 line-clamp-1 italic bg-slate-50/50 rounded-lg px-2 py-1">
                                            "{session.notes}"
                                        </p>
                                    )}
                                </div>

                                {/* Card Footer Action */}
                                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        By: <strong className="text-slate-700">{session.createdByUserName || 'Operator'}</strong>
                                    </span>
                                    <span className="font-bold text-blue-600 group-hover:translate-x-1 transition flex items-center gap-1">
                                        <span>{session.status === 'Draft' || session.status === 'InProgress' ? 'Open Workspace' : 'Inspect Audit'}</span>
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ================= STREAMLINED TABLE VIEW ================= */
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase font-bold tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-3.5">Session # & Scope</th>
                                    <th className="px-5 py-3.5">Auditor & Date</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5 text-center">Progress & Variance</th>
                                    <th className="px-6 py-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredSessions.map((session) => {
                                    const itemsCount = session.itemsCount || 0;
                                    const countedCount = session.countedItemsCount || 0;
                                    const pct = itemsCount > 0 ? Math.round((countedCount / itemsCount) * 100) : 0;

                                    return (
                                        <tr
                                            key={session.id}
                                            onClick={() => openSessionDetail(session.id)}
                                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                                                activeSession?.id === session.id ? 'bg-blue-50/40' : ''
                                            }`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                                                        <ClipboardCheck className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <span className="font-mono text-xs font-black text-slate-900 block group-hover:text-blue-600">
                                                            {session.sessionNumber}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-slate-400">
                                                            {session.countType === 'Full' ? 'Full Warehouse' : `Partial (${itemsCount} items)`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-xs">
                                                <span className="font-bold text-slate-800 block">{session.createdByUserName || 'Operator'}</span>
                                                <span className="text-slate-400 font-mono text-[11px]">{new Date(session.createdAt).toLocaleDateString()}</span>
                                            </td>

                                            <td className="px-5 py-4">
                                                {getStatusBadge(session.status)}
                                            </td>

                                            <td className="px-5 py-4 text-center">
                                                <div className="inline-block text-left">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-xs font-bold text-slate-800">
                                                            {countedCount} / {itemsCount}
                                                        </span>
                                                        {session.hasDiscrepancies ? (
                                                            <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2">
                                                                Variance
                                                            </span>
                                                        ) : countedCount > 0 ? (
                                                            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2">
                                                                Exact
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="h-1.5 w-28 rounded-full bg-slate-100 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openSessionDetail(session.id);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition cursor-pointer"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    <span>{session.status === 'Draft' || session.status === 'InProgress' ? 'Open Workspace' : 'Inspect Audit'}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* IMMERSIVE AUDIT WORKSPACE (DRAWER / FULL MODAL) */}
            {activeSession && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-all`}>
                    <div className={`w-full ${sheetIsFullscreen ? 'max-w-[98vw] h-[95vh]' : 'max-w-6xl max-h-[90vh]'} rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200`}>
                        {/* Header Banner */}
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20">
                                    <ClipboardCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="text-lg font-black text-slate-900 font-mono tracking-tight">{activeSession.sessionNumber}</h2>
                                        {getStatusBadge(activeSession.status)}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Facility: <strong className="text-slate-800">{activeSession.warehouseName}</strong> • {activeSession.countType === 'Full' ? 'Full Warehouse Audit' : 'Partial Audit'} • Created: {new Date(activeSession.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Controls & Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {(activeSession.status === 'Draft' || activeSession.status === 'InProgress') && (
                                    <>
                                        <button
                                            onClick={handleMatchAllToSystem}
                                            title="Fill remaining empty counts with system quantity"
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                                        >
                                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                            <span>Match System Qty</span>
                                        </button>

                                        <button
                                            onClick={handleSaveCounts}
                                            disabled={savingCounts}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer disabled:opacity-50"
                                        >
                                            {savingCounts && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                            <span>Save Physical Counts</span>
                                        </button>

                                        <button
                                            onClick={handleSubmitForReview}
                                            disabled={submittingSession}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>Submit for Review</span>
                                        </button>

                                        <button
                                            onClick={handleCancelSession}
                                            className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                            title="Cancel Session"
                                        >
                                            <Ban className="h-4 w-4" />
                                        </button>
                                    </>
                                )}

                                {activeSession.status === 'Submitted' && isSupervisorOrManager && (
                                    <button
                                        onClick={() => { setShowReviewModal(true); setReviewAction('Approve'); }}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 transition cursor-pointer"
                                    >
                                        <CheckCheck className="h-4 w-4" />
                                        <span>Reconcile & Post Discrepancies</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => setSheetIsFullscreen(!sheetIsFullscreen)}
                                    className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                                    title={sheetIsFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                >
                                    {sheetIsFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </button>

                                <button
                                    onClick={() => setActiveSession(null)}
                                    className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                                    title="Close workspace"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar & KPI Cards */}
                        <div className="bg-white px-6 py-4 border-b border-slate-200 space-y-4">
                            {/* Completion Progress Bar */}
                            <div>
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                                        <span>Physical Counting Progress</span>
                                    </span>
                                    <span className="font-mono text-blue-700">
                                        {discrepancySummary.countedItemsCount} / {activeSession.items?.length || 0} items ({completionPct}%)
                                    </span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                                        style={{ width: `${completionPct}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-600">Discrepancy Items</span>
                                    <span className={`font-mono text-sm font-black ${discrepancySummary.totalDiscrepancies > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                        {discrepancySummary.totalDiscrepancies} items
                                    </span>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-600">Surplus Adjustment (+)</span>
                                    <span className="font-mono text-sm font-black text-blue-700">
                                        +{discrepancySummary.positiveQty} units
                                    </span>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-600">Shortage Adjustment (-)</span>
                                    <span className="font-mono text-sm font-black text-rose-700">
                                        -{discrepancySummary.negativeQty} units
                                    </span>
                                </div>
                            </div>

                            {/* Filter and Barcode Scanner Simulator */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showOnlyDiscrepancies}
                                            onChange={(e) => setShowOnlyDiscrepancies(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span>Show Discrepancies Only</span>
                                        {discrepancySummary.totalDiscrepancies > 0 && (
                                            <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono px-1.5 py-0.2">
                                                {discrepancySummary.totalDiscrepancies}
                                            </span>
                                        )}
                                    </label>
                                </div>

                                <div className="relative w-full sm:w-72">
                                    <Barcode className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="text"
                                        value={sheetSearchTerm}
                                        onChange={(e) => setSheetSearchTerm(e.target.value)}
                                        placeholder="Scan barcode or type SKU..."
                                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    {sheetSearchTerm && (
                                        <button
                                            onClick={() => setSheetSearchTerm('')}
                                            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Items Table Workspace */}
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] uppercase font-bold tracking-wider text-slate-500 shadow-2xs">
                                    <tr>
                                        <th className="px-6 py-3">Product SKU & Name</th>
                                        <th className="px-4 py-3 text-center">System Ledger Qty</th>
                                        <th className="px-6 py-3 text-center">Physical Count (Entry)</th>
                                        <th className="px-4 py-3 text-center">Variance / Discrepancy</th>
                                        <th className="px-6 py-3">Notes & Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visibleSessionItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-12 text-center text-xs text-slate-400">
                                                No items match the current filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        visibleSessionItems.map((item, index) => {
                                            const counted = countInputs[item.productId];
                                            const hasInput = counted !== '' && counted !== undefined && !isNaN(counted);
                                            const parsedCount = hasInput ? parseFloat(counted) : null;
                                            const diff = parsedCount !== null ? parsedCount - (item.systemQuantity || 0) : item.discrepancyQuantity;

                                            const isEditable = activeSession.status === 'Draft' || activeSession.status === 'InProgress';

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`hover:bg-slate-50/80 transition-colors ${
                                                        diff !== 0 && diff !== null && diff !== undefined ? 'bg-amber-50/20' : ''
                                                    }`}
                                                >
                                                    <td className="px-6 py-3.5">
                                                        <span className="font-mono text-xs font-bold text-slate-900 block">{item.productSku}</span>
                                                        <span className="text-xs text-slate-500 block truncate max-w-xs">{item.productName}</span>
                                                    </td>

                                                    <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-800">
                                                        {item.systemQuantity}
                                                    </td>

                                                    {/* Count Input with Stepper Controls */}
                                                    <td className="px-6 py-3.5">
                                                        {isEditable ? (
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => adjustItemCount(item.productId, -1)}
                                                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                                                >
                                                                    -
                                                                </button>
                                                                <input
                                                                    ref={(el) => (inputRefs.current[index] = el)}
                                                                    type="number"
                                                                    min="0"
                                                                    step="any"
                                                                    value={countInputs[item.productId] ?? ''}
                                                                    onChange={(e) => setCountInputs({ ...countInputs, [item.productId]: e.target.value })}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            const next = inputRefs.current[index + 1];
                                                                            if (next) next.focus();
                                                                        }
                                                                    }}
                                                                    placeholder="Count"
                                                                    className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-center font-mono text-xs font-black text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => adjustItemCount(item.productId, 1)}
                                                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="font-mono text-xs font-bold text-slate-900 block text-center">
                                                                {item.countedQuantity !== null && item.countedQuantity !== undefined ? item.countedQuantity : '-'}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Variance Badge */}
                                                    <td className="px-4 py-3.5 text-center">
                                                        {diff !== null && diff !== undefined ? (
                                                            diff === 0 ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                                                                    <Check className="h-3 w-3" /> Matched (0)
                                                                </span>
                                                            ) : diff > 0 ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800 font-mono border border-blue-200">
                                                                    <ArrowUpRight className="h-3 w-3" /> +{diff} Surplus
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800 font-mono border border-rose-200">
                                                                    <ArrowDownLeft className="h-3 w-3" /> {diff} Loss
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Uncounted</span>
                                                        )}
                                                    </td>

                                                    {/* Notes */}
                                                    <td className="px-6 py-3.5">
                                                        {isEditable ? (
                                                            <input
                                                                type="text"
                                                                value={notesInputs[item.productId] ?? ''}
                                                                onChange={(e) => setNotesInputs({ ...notesInputs, [item.productId]: e.target.value })}
                                                                placeholder="Add physical count notes..."
                                                                className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                                                            />
                                                        ) : (
                                                            <span className="text-xs text-slate-500">{item.notes || '-'}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer bar */}
                        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
                            <span>Press <kbd className="font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">Enter</kbd> to jump to next product input</span>
                            <button
                                onClick={() => setActiveSession(null)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                                Done & Close Workspace
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: Start New Stock Count Session */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
                                    <ClipboardCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Initiate Stock Count Session</h3>
                                    <p className="text-xs text-slate-500">Configure audit scope and product targets</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSession} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Target Facility</label>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-800 flex items-center gap-2">
                                    <Warehouse className="h-4 w-4 text-blue-600" />
                                    <span>{selectedWarehouse?.name} ({selectedWarehouse?.code})</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-2">Audit Scope</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewCountType('Full')}
                                        className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                                            newCountType === 'Full'
                                                ? 'border-blue-600 bg-blue-50/60 text-blue-900 ring-2 ring-blue-500/20'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <span className="block text-xs font-black">Full Warehouse Audit</span>
                                        <span className="block text-[11px] text-slate-500 mt-1">Snapshot of all active products in facility</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setNewCountType('SelectedProducts')}
                                        className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                                            newCountType === 'SelectedProducts'
                                                ? 'border-blue-600 bg-blue-50/60 text-blue-900 ring-2 ring-blue-500/20'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <span className="block text-xs font-black">Partial Cycle Count</span>
                                        <span className="block text-[11px] text-slate-500 mt-1">Audit specific high-value or fast-moving SKUs</span>
                                    </button>
                                </div>
                            </div>

                            {/* Product Selection for Partial Count */}
                            {newCountType === 'SelectedProducts' && (
                                <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700">
                                            Selected: {selectedProductIds.length} items
                                        </span>
                                        <div className="flex gap-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProductIds(products.map(p => p.id))}
                                                className="text-blue-600 hover:underline font-semibold cursor-pointer"
                                            >
                                                Select All
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProductIds([])}
                                                className="text-slate-500 hover:underline cursor-pointer"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                        <input
                                            type="text"
                                            value={productSearchTerm}
                                            onChange={(e) => setProductSearchTerm(e.target.value)}
                                            placeholder="Search product name or SKU..."
                                            className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-slate-100 rounded-xl bg-white border border-slate-200 p-2">
                                        {products
                                            .filter(p => !productSearchTerm || p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                            .map((p) => {
                                                const isSelected = selectedProductIds.includes(p.id);
                                                return (
                                                    <label
                                                        key={p.id}
                                                        className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer ${
                                                            isSelected ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedProductIds([...selectedProductIds, p.id]);
                                                                } else {
                                                                    setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                                                                }
                                                            }}
                                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="font-mono text-slate-900">{p.sku}</span>
                                                        <span className="truncate text-slate-600 font-normal">{p.name}</span>
                                                    </label>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Audit Notes / Objective (Optional)</label>
                                <textarea
                                    rows="2"
                                    value={newSessionNotes}
                                    onChange={(e) => setNewSessionNotes(e.target.value)}
                                    placeholder="e.g. End of month physical inventory reconciliation..."
                                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingNew}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                                >
                                    {submittingNew && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>Create Count Session</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: Supervisor Review & Reconciliation */}
            {showReviewModal && activeSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Supervisor Reconciliation Decision</h3>
                                    <p className="text-xs text-slate-500">Post adjustments to stock ledger</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Summary Box */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-bold text-slate-900">{activeSession.sessionNumber}</span>
                                    <span className="text-xs text-slate-500">{activeSession.warehouseName}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Discrepancies</span>
                                        <span className="font-black text-amber-700">{discrepancySummary.totalDiscrepancies} items</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Surplus Units</span>
                                        <span className="font-black text-blue-700">+{discrepancySummary.positiveQty}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Shortage Units</span>
                                        <span className="font-black text-rose-700">-{discrepancySummary.negativeQty}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Decision Cards */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-2">Reconciliation Decision</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setReviewAction('Approve')}
                                        className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                                            reviewAction === 'Approve'
                                                ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            <span className="text-xs font-bold">Approve & Post</span>
                                        </div>
                                        <span className="block text-[11px] text-slate-500 mt-1">
                                            Post adjustments into stock ledger
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setReviewAction('Reject')}
                                        className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                                            reviewAction === 'Reject'
                                                ? 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <XCircle className="h-4 w-4 text-rose-600" />
                                            <span className="text-xs font-bold">Reject Audit</span>
                                        </div>
                                        <span className="block text-[11px] text-slate-500 mt-1">
                                            Rejects count; no movements created
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Supervisor Audit Findings</label>
                                <textarea
                                    rows="2"
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    placeholder="Enter review notes, observations, or reconciliation reasons..."
                                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowReviewModal(false)}
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReviewSubmit}
                                    disabled={submittingReview}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50 ${
                                        reviewAction === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                    }`}
                                >
                                    {submittingReview && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{reviewAction === 'Approve' ? 'Confirm Approval & Post Adjustments' : 'Reject Count Session'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockCountsPage;
