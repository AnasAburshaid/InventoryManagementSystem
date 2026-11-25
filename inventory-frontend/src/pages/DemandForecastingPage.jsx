import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, CircleAlert, PackageSearch, Sparkles, X } from 'lucide-react';
import forecastingService from '../services/forecastingService';

const panel = 'min-w-0 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900';
const field = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800';
const button = 'rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800';
const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2 disabled:opacity-60';
const muted = 'text-sm text-slate-600 dark:text-slate-400';
const risks = { Critical: 'Critical', High: 'High', Moderate: 'Moderate', Low: 'Low', Overstocked: 'Overstocked', NoDemand: 'No projected demand', Unknown: 'Unknown' };
const riskClasses = {
    Critical: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
    High: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    Moderate: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
};
const numbers = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });
const fmt = (value) => value == null ? '—' : numbers.format(value);
const date = (value) => value ? dateFormat.format(new Date(value)) : '—';
const key = (row) => row.productId + '/' + row.warehouseId;
const modeled = (row) => row.forecastConfidence !== 'InsufficientData';
const pageSize = 12;

function Stat({ name, value, caption }) {
    return (
        <div className={panel + ' p-4'}>
            <p className={muted}>{name}</p>
            <p className="mt-2 break-words text-xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{caption}</p>
        </div>
    );
}

function Periods({ points, forecast = false }) {
    const [selected, setSelected] = useState(null);
    const max = Math.max(1, ...points.map(point => forecast ? point.forecastedUnits : point.actualUnits));
    if (!points.length) {
        return <p className={muted + ' py-8'}>{forecast ? 'A projection requires sales in at least two completed months.' : 'No eligible sales in completed months.'}</p>;
    }

    const active = points.find(point => point.date === selected) ?? points.at(-1);
    const label = (point) => forecast ? point.periodLabel : monthFormat.format(new Date(point.periodLabel + '-01T00:00:00Z'));
    const units = (point) => forecast ? point.forecastedUnits : point.actualUnits;

    return (
        <>
            <div className="flex h-36 items-end gap-1 border-b border-slate-200 pb-1 dark:border-slate-700" aria-label={forecast ? 'Projected demand by interval' : 'Actual sales by month'}>
                {points.map(point => (
                    <button
                        key={point.date}
                        type="button"
                        className="group flex h-full min-w-0 flex-1 items-end justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-indigo-500"
                        aria-label={label(point) + ', ' + fmt(units(point)) + ' units'}
                        aria-pressed={active === point}
                        onClick={() => setSelected(point.date)}
                        title={label(point) + ' · ' + fmt(units(point)) + ' units'}
                    >
                        <span
                            className={'w-full max-w-10 rounded-t-sm ' + (forecast ? 'bg-indigo-500' : 'bg-sky-600') + (active === point ? ' ring-2 ring-indigo-600 ring-offset-1 dark:ring-indigo-300 dark:ring-offset-slate-900' : ' opacity-70 group-hover:opacity-100')}
                            style={{ height: Math.max(2, (units(point) / max) * 100) + '%' }}
                        />
                    </button>
                ))}
            </div>
            <div className={muted + ' mt-3 flex justify-between gap-2'}>
                <span>{label(points[0])} – {label(points.at(-1))}</span>
                <span aria-live="polite" className="text-right font-semibold">{label(active)} · {fmt(units(active))} units</span>
            </div>
        </>
    );
}

function ForecastDetail({ row, result, onClose }) {
    const dialog = useRef(null);
    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => element.close();
    }, []);

    const backtest = result?.backtestAccuracy;
    return (
        <dialog ref={dialog} onCancel={onClose} aria-labelledby="forecast-detail-title"
            className="m-auto max-h-[85vh] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className={muted}>{row.productSku} · {row.warehouseName}</p>
                    <h2 id="forecast-detail-title" className="mt-1 text-xl font-bold">{row.productName}</h2>
                </div>
                <button type="button" autoFocus className={button} aria-label="Close forecast details" onClick={onClose}><X size={18} /></button>
            </div>
            <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                {[
                    ['Available stock', fmt(row.currentStock)],
                    ['On-hand stock', fmt(row.onHandStock)],
                    ['Committed to sales orders', fmt(row.committedStock)],
                    ['Units sold in completed months', fmt(row.historicalUnitsSold)],
                    ['Average daily demand', modeled(row) ? fmt(row.averageDailyDemand) : '—'],
                    ['Projected stockout', date(row.estimatedStockoutDate)],
                    ['Suggested replenishment', modeled(row) ? fmt(row.recommendedReplenishmentQty) + ' units' : '—'],
                    ['Forecast method', ({ SimpleMovingAverage: 'Simple moving average', WeightedMovingAverage: 'Weighted moving average', HoltLinearTrend: 'Holt linear trend' })[row.algorithmUsed] || 'Insufficient history'],
                    ['Mean absolute error', fmt(row.mae)],
                    ['Weighted absolute percentage error', row.wape == null ? '—' : fmt(row.wape) + '%'],
                ].map(([label, value]) => (
                    <div key={label}><dt className={muted}>{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>
                ))}
            </dl>
            <p className={muted + ' mt-5'}>
                {backtest ? 'Backtest: ' + backtest.evaluationPointsCount + ' evaluation months (' + backtest.testPeriod + ').' : 'Backtesting requires additional eligible history.'}
            </p>
        </dialog>
    );
}

export default function DemandForecastingPage() {
    const [horizon, setHorizon] = useState(30);
    const [warehouseId, setWarehouseId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [search, setSearch] = useState('');
    const [riskLevel, setRiskLevel] = useState('');
    const [page, setPage] = useState(0);
    const [retry, setRetry] = useState(0);
    const [selected, setSelected] = useState(null);
    const [modal, setModal] = useState(false);
    const [forecastState, setForecastState] = useState(null);
    const [detailState, setDetailState] = useState(null);
    const [insight, setInsight] = useState(null);
    const insightRequest = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        forecastingService.getForecasts({ horizonDays: horizon }, controller.signal)
            .then(rows => setForecastState({ horizon, retry, rows }))
            .catch(() => {
                if (!controller.signal.aborted) setForecastState({ horizon, retry, error: true });
            });
        return () => controller.abort();
    }, [horizon, retry]);

    const current = forecastState?.horizon === horizon && forecastState?.retry === retry ? forecastState : null;
    const rows = current?.rows || [];
    const warehouses = [...new Map(rows.map(row => [row.warehouseId, row.warehouseName]))].sort((a, b) => a[1].localeCompare(b[1]));
    const categories = [...new Map(rows.map(row => [row.categoryId, row.categoryName]))].sort((a, b) => a[1].localeCompare(b[1]));
    const needle = search.trim().toLowerCase();
    const filtered = rows.filter(row =>
        (!warehouseId || row.warehouseId === warehouseId) &&
        (!categoryId || row.categoryId === categoryId) &&
        (!riskLevel || row.stockoutRisk === riskLevel) &&
        (!needle || row.productName.toLowerCase().includes(needle) || row.productSku.toLowerCase().includes(needle)));
    const available = filtered.filter(modeled);
    const top = available.reduce((best, row) => !best || row.predictedDemand > best.predictedDemand ? row : best, null);
    const urgent = available.filter(row => row.stockoutRisk === 'Critical' || row.stockoutRisk === 'High').length;
    const selectedRow = filtered.find(row => key(row) === selected) || available[0] || filtered[0];
    const productId = selectedRow?.productId;
    const detailWarehouseId = selectedRow?.warehouseId;
    const detailKey = productId + '/' + detailWarehouseId + '/' + horizon + '/' + retry;
    const detail = detailState?.key === detailKey ? detailState : null;

    useEffect(() => {
        if (!productId || !detailWarehouseId) return;
        const controller = new AbortController();
        forecastingService.getProductForecastDetail(productId, detailWarehouseId, horizon, controller.signal)
            .then(value => setDetailState({ key: detailKey, value }))
            .catch(() => {
                if (!controller.signal.aborted) setDetailState({ key: detailKey, error: true });
            });
        return () => controller.abort();
    }, [productId, detailWarehouseId, horizon, detailKey]);

    useEffect(() => () => insightRequest.current?.abort(), []);

    const changeFilter = (setter, value) => {
        setter(value);
        setPage(0);
        setModal(false);
        insightRequest.current?.abort();
        setInsight(null);
    };

    async function explain() {
        insightRequest.current?.abort();
        const controller = new AbortController();
        insightRequest.current = controller;
        setInsight({ loading: true });
        try {
            const result = await forecastingService.generateAiInsights({
                warehouseId: warehouseId || undefined,
                categoryId: categoryId || undefined,
                search: search.trim() || undefined,
                riskLevel: riskLevel || undefined,
                horizonDays: horizon,
            }, controller.signal);
            if (!controller.signal.aborted) setInsight({ result });
        } catch {
            if (!controller.signal.aborted) setInsight({ error: true });
        }
    }

    const maxPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
    const displayedPage = Math.min(page, maxPage);

    return (
        <div className="mx-auto min-w-0 max-w-[1600px] space-y-5 text-slate-900 dark:text-slate-100">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        <ChartNoAxesCombined size={18} aria-hidden="true" /> Inventory planning
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Demand forecasting</h1>
                    <p className={muted + ' mt-2'}>Plan replenishment using completed sales months and current warehouse stock.</p>
                </div>
                <div role="group" aria-label="Forecast horizon" className={panel + ' flex p-1'}>
                    {[7, 30, 90].map(days => (
                        <button key={days} type="button" aria-pressed={horizon === days} onClick={() => changeFilter(setHorizon, days)}
                            className={'rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-indigo-500 ' + (horizon === days ? 'bg-indigo-700 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}>
                            {days} days
                        </button>
                    ))}
                </div>
            </header>

            <section aria-label="Forecast filters" className={panel + ' grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4'}>
                <label className="space-y-1 text-sm font-semibold">Product<input className={field} placeholder="Search name or SKU" value={search} onChange={event => changeFilter(setSearch, event.target.value)} /></label>
                <label className="space-y-1 text-sm font-semibold">Warehouse<select className={field} value={warehouseId} onChange={event => changeFilter(setWarehouseId, event.target.value)}>
                    <option value="">All authorized warehouses</option>{warehouses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select></label>
                <label className="space-y-1 text-sm font-semibold">Category<select className={field} value={categoryId} onChange={event => changeFilter(setCategoryId, event.target.value)}>
                    <option value="">All categories</option>{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select></label>
                <label className="space-y-1 text-sm font-semibold">Stockout risk<select className={field} value={riskLevel} onChange={event => changeFilter(setRiskLevel, event.target.value)}>
                    <option value="">All risks</option>{Object.entries(risks).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select></label>
            </section>

            {!current && <p role="status" className={panel + ' p-6 ' + muted}>Loading forecasts…</p>}
            {current?.error && <div role="alert" className={panel + ' flex flex-wrap items-center justify-between gap-3 p-5'}><p>Forecasts could not be loaded.</p><button type="button" className={button} onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
            {current?.rows && !filtered.length && <div className={panel + ' flex items-center gap-3 p-6'}><PackageSearch aria-hidden="true" /><p>{rows.length ? 'No forecasts match the filters.' : 'No inventory activity or replenishment settings were found in your authorized warehouses.'}</p></div>}

            {!!filtered.length && (
                <>
                    <section aria-label="Forecast overview" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Stat name="Projected demand" value={available.length ? fmt(available.reduce((sum, row) => sum + row.predictedDemand, 0)) : '—'} caption={'Total units across modeled pairs · ' + horizon + ' days'} />
                        <Stat name="Stockout attention" value={available.length ? fmt(urgent) : '—'} caption="Pairs projected to stock out within 30 days" />
                        <Stat name="Average confidence" value={available.length ? fmt(available.reduce((sum, row) => sum + row.confidenceScore, 0) / available.length) + '%' : '—'} caption={fmt(filtered.length - available.length) + ' pairs with insufficient history'} />
                        <Stat name="Highest projected demand" value={top?.productName || '—'} caption={top ? top.warehouseName + ' · ' + fmt(top.predictedDemand) + ' units' : 'No modeled products'} />
                    </section>
                    <section aria-labelledby="forecast-review" className={panel + ' p-4 sm:p-5'}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div><h2 id="forecast-review" className="text-lg font-bold">Sales and projected demand</h2>
                                <p className={muted + ' mt-1'}>{selectedRow.productName} · {selectedRow.warehouseName}</p></div>
                            <button type="button" className={button} onClick={() => setModal(true)}>Forecast details</button>
                        </div>
                        {!detail && <p className={muted + ' mt-4'} role="status">Loading sales history…</p>}
                        {detail?.error && <div role="alert" className="mt-4 flex items-center gap-3"><p>Sales history could not be loaded.</p><button type="button" className={button} onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
                        {detail?.value && <div className="mt-4 grid gap-5 lg:grid-cols-2">
                            <div className="min-w-0"><h3 className="text-sm font-semibold">Actual sales · units per month</h3><Periods key={detailKey + 'history'} points={detail.value.historyTimeline} /></div>
                            <div className="min-w-0"><h3 className="text-sm font-semibold">Projected demand · units per interval</h3><Periods key={detailKey + 'future'} points={detail.value.futureProjectionTimeline} forecast /></div>
                        </div>}
                    </section>
                    <section aria-labelledby="planning-insights" className={panel + ' p-4 sm:p-5'}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div><h2 id="planning-insights" className="text-lg font-bold">Planning insights</h2><p className={muted + ' mt-1'}>Review the stockout and purchasing priorities for your current filters.</p></div>
                            <button type="button" className={primary} onClick={explain} disabled={!available.length || insight?.loading}>
                                <Sparkles size={16} aria-hidden="true" /> {insight?.loading ? 'Generating…' : 'Generate AI explanation'}
                            </button>
                        </div>
                        {insight?.loading && <p role="status" className={muted + ' mt-3'}>Analyzing the forecast…</p>}
                        {insight?.error && <p role="alert" className={muted + ' mt-3'}>The explanation could not be loaded. Try again.</p>}
                        {!available.length && <p className={muted + ' mt-3'}>There is insufficient sales history for an explanation.</p>}
                        {insight?.result && <div className="mt-4 space-y-3 text-sm" aria-live="polite">
                            <p className="font-semibold">{insight.result.source === 'OpenRouter' ? 'AI explanation' : 'Statistical summary'}</p>
                            <p>{insight.result.executiveSummary}</p>
                            {[
                                ['Projected stockouts', insight.result.criticalStockoutRisks],
                                ['Rising demand', insight.result.demandSurgeAlerts],
                                ['Replenishment to review', insight.result.purchasingRecommendations],
                            ].filter(([, items]) => items.length).map(([label, items]) => (
                                <div key={label}><h3 className="font-semibold">{label}</h3><ul className="ml-5 list-disc">{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
                            ))}
                        </div>}
                    </section>
                    <section aria-labelledby="forecast-results" className={panel}>
                        <div className="px-4 pt-4 sm:px-5"><h2 id="forecast-results" className="text-lg font-bold">Product forecasts</h2></div>
                        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Product forecasts table">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className={muted}><tr>{['Product', 'Warehouse', 'Available', 'Demand', 'Trend', 'Risk', 'Est. stockout', 'Confidence'].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
                                <tbody className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                                    {filtered.slice(displayedPage * pageSize, (displayedPage + 1) * pageSize).map(row => (
                                        <tr key={key(row)} className={selectedRow === row ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}>
                                            <th scope="row" className="px-4 py-3 font-semibold">
                                                <button type="button" onClick={() => { setSelected(key(row)); setModal(true); }} className="inline-flex items-center gap-1 text-left text-indigo-700 hover:underline dark:text-indigo-300">
                                                    {row.productName}<ArrowUpRight size={13} className="shrink-0" aria-hidden="true" />
                                                </button>
                                                <p className={muted}>{row.productSku}</p>
                                            </th>
                                            <td className="px-4 py-3">{row.warehouseName}</td>
                                            <td className="px-4 py-3 tabular-nums">{fmt(row.currentStock)}</td>
                                            <td className="px-4 py-3 tabular-nums">{modeled(row) ? fmt(row.predictedDemand) : '—'}</td>
                                            <td className="px-4 py-3">{modeled(row) ? row.demandTrend : '—'}</td>
                                            <td className="px-4 py-3"><span className={'inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ' + (riskClasses[row.stockoutRisk] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200')}>{risks[row.stockoutRisk] || row.stockoutRisk}</span></td>
                                            <td className="whitespace-nowrap px-4 py-3">{date(row.estimatedStockoutDate)}</td>
                                            <td className="px-4 py-3">{modeled(row) ? row.forecastConfidence : 'Insufficient history'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-700">
                            <p className={muted}>{displayedPage * pageSize + 1}–{Math.min((displayedPage + 1) * pageSize, filtered.length)} of {filtered.length} product–warehouse pairs</p>
                            <div className="flex gap-2">
                                <button type="button" className={button} disabled={displayedPage === 0} onClick={() => setPage(displayedPage - 1)}>Previous</button>
                                <button type="button" className={button} disabled={displayedPage === maxPage} onClick={() => setPage(displayedPage + 1)}>Next</button>
                            </div>
                        </div>
                    </section>
                    <p className={muted + ' flex items-start gap-2'}><CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Forecasts estimate fulfilled sales. Stockouts and limited history can hide unmet demand. Review estimates before purchasing.</p>
                    {modal && <ForecastDetail row={selectedRow} result={detail?.value} onClose={() => setModal(false)} />}
                </>
            )}
        </div>
    );
}

