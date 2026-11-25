import api from './api';

export const forecastingService = {
    async getForecasts(params = {}, signal) {
        const response = await api.get('/forecasting', { params, signal });
        return response.data;
    },

    async getSummary(params = {}) {
        const response = await api.get('/forecasting/summary', { params });
        return response.data;
    },

    async getProductForecastDetail(productId, warehouseId = null, horizonDays = 30, signal) {
        const response = await api.get(`/forecasting/products/${productId}`, {
            params: { warehouseId, horizonDays },
            signal,
        });
        return response.data;
    },

    async generateAiInsights(filters, signal) {
        const response = await api.post('/forecasting/ai-insights', filters, { signal });
        return response.data;
    }
};

export default forecastingService;
