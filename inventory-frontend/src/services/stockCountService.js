import api from './api';

export const stockCountService = {
    async getSessions(warehouseId, status = null) {
        const params = status ? { status } : {};
        const response = await api.get(`/warehouses/${warehouseId}/stock-counts`, { params });
        return response.data;
    },

    async getSessionById(warehouseId, sessionId) {
        const response = await api.get(`/warehouses/${warehouseId}/stock-counts/${sessionId}`);
        return response.data;
    },

    async createSession(warehouseId, data) {
        const response = await api.post(`/warehouses/${warehouseId}/stock-counts`, data);
        return response.data;
    },

    async recordCounts(warehouseId, sessionId, items) {
        const response = await api.post(`/warehouses/${warehouseId}/stock-counts/${sessionId}/counts`, { items });
        return response.data;
    },

    async submitForReview(warehouseId, sessionId) {
        const response = await api.post(`/warehouses/${warehouseId}/stock-counts/${sessionId}/submit`);
        return response.data;
    },

    async reviewSession(warehouseId, sessionId, data) {
        const response = await api.post(`/warehouses/${warehouseId}/stock-counts/${sessionId}/review`, data);
        return response.data;
    },

    async cancelSession(warehouseId, sessionId, reason = null) {
        const response = await api.post(`/warehouses/${warehouseId}/stock-counts/${sessionId}/cancel`, null, {
            params: reason ? { reason } : {}
        });
        return response.data;
    }
};

export default stockCountService;
