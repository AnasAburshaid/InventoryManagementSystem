/**
 * Date utility helper functions for consistent local date boundary handling.
 */

/**
 * Returns today's date formatted as 'YYYY-MM-DD' based on the user's current local timezone.
 * Avoids the UTC-shift issue where new Date().toISOString() returns tomorrow or yesterday.
 */
export const getTodayLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formats a calendar date string (e.g. '2026-10-26' or '2026-10-26T00:00:00')
 * consistently in the user's locale without suffering from timezone day-shifts.
 */
export const formatDateOnly = (dateInput) => {
    if (!dateInput) return '—';

    try {
        if (typeof dateInput === 'string') {
            const datePart = dateInput.split('T')[0];
            const parts = datePart.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const localDate = new Date(year, month, day);
                return localDate.toLocaleDateString();
            }
        }

        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
    } catch {
        return String(dateInput);
    }
};

/**
 * Formats an audit timestamp (date + time) into the user's local timezone.
 */
export const formatDateTime = (dateInput) => {
    if (!dateInput) return '—';
    try {
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? '—' : date.toLocaleString();
    } catch {
        return String(dateInput);
    }
};

/**
 * Converts a local 'YYYY-MM-DD' date string into an ISO string representing
 * the start of that day (00:00:00.000) in the user's local timezone.
 */
export const localDateToStartOfDayIso = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    const localStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    return localStart.toISOString();
};

/**
 * Converts a local 'YYYY-MM-DD' date string into an ISO string representing
 * the end of that day (23:59:59.999) in the user's local timezone.
 */
export const localDateToEndOfDayIso = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
    return localEnd.toISOString();
};

/**
 * Checks if a given date string or Date falls within a local date range [fromDate, toDate].
 * fromDate and toDate are 'YYYY-MM-DD' strings.
 */
export const isDateInLocalRange = (dateInput, fromDateString, toDateString) => {
    if (!dateInput) return false;
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return false;

    if (fromDateString) {
        const [fYear, fMonth, fDay] = fromDateString.split('-').map(Number);
        const start = new Date(fYear, fMonth - 1, fDay, 0, 0, 0, 0);
        if (date < start) return false;
    }

    if (toDateString) {
        const [tYear, tMonth, tDay] = toDateString.split('-').map(Number);
        const end = new Date(tYear, tMonth - 1, tDay, 23, 59, 59, 999);
        if (date > end) return false;
    }

    return true;
};
