/**
 * Utilities for formatting monetary amounts, currency, and quantities.
 */

/**
 * Formats a monetary amount into a clean, compact representation using K for thousands, M for millions, B for billions.
 * When amount is 13,000 -> "$13K"
 * When amount is 13,500 -> "$13.5K"
 * When amount is 1,200,000 -> "$1.2M"
 * When amount is under 1,000 -> "$450" or "$25.50"
 *
 * @param {number|string|null|undefined} amount - The amount to format
 * @param {string} [prefix='$'] - Currency prefix (default '$')
 * @returns {string} - Formatted compact money string
 */
export function formatMoneyK(amount, prefix = '$') {
    if (amount === null || amount === undefined || amount === '' || isNaN(amount)) {
        return '—';
    }

    const num = Number(amount);
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);

    if (abs >= 1_000_000_000) {
        const val = abs / 1_000_000_000;
        const formatted = val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(2));
        return `${sign}${prefix}${formatted}B`;
    }

    if (abs >= 1_000_000) {
        const val = abs / 1_000_000;
        const formatted = val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(2));
        return `${sign}${prefix}${formatted}M`;
    }

    if (abs >= 1_000) {
        const val = abs / 1_000;
        const formatted = val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(2));
        return `${sign}${prefix}${formatted}K`;
    }

    if (abs === 0) {
        return `${prefix}0`;
    }

    if (abs % 1 === 0) {
        return `${sign}${prefix}${abs.toFixed(0)}`;
    }

    return `${sign}${prefix}${abs.toFixed(2)}`;
}

/**
 * Formats a number to full currency with comma separation and 2 decimal places.
 * Example: 13000 -> "$13,000.00"
 */
export function formatCurrency(amount, prefix = '$') {
    if (amount === null || amount === undefined || amount === '' || isNaN(amount)) {
        return '—';
    }
    const num = Number(amount);
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);
    return `${sign}${prefix}${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default {
    formatMoneyK,
    formatCurrency
};
