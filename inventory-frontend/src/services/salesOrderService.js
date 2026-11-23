import api from './api';

export const salesOrderService = {
    // Sales Order Headers
    async getAll(params = {}) {
        const response = await api.get('/sales-orders', { params });
        return response.data;
    },

    async getById(id) {
        const response = await api.get(`/sales-orders/${id}`);
        return response.data;
    },

    async getByNumber(orderNumber) {
        const response = await api.get(`/sales-orders/by-number/${orderNumber}`);
        return response.data;
    },

    async create(data) {
        const response = await api.post('/sales-orders', data);
        return response.data;
    },

    async update(id, data) {
        const response = await api.put(`/sales-orders/${id}`, data);
        return response.data;
    },

    async confirm(id) {
        const response = await api.post(`/sales-orders/${id}/confirm`);
        return response.data;
    },

    async fulfill(id, items) {
        const response = await api.post(`/sales-orders/${id}/fulfill`, { items });
        return response.data;
    },

    async cancel(id, reason = null) {
        const response = await api.post(`/sales-orders/${id}/cancel`, null, {
            params: reason ? { reason } : {}
        });
        return response.data;
    },

    async delete(id) {
        const response = await api.delete(`/sales-orders/${id}`);
        return response.data;
    },

    // Sales Order Lines
    async getLines(salesOrderId) {
        const response = await api.get(`/sales-orders/${salesOrderId}/lines`);
        return response.data;
    },

    async addLine(salesOrderId, lineData) {
        const response = await api.post(`/sales-orders/${salesOrderId}/lines`, lineData);
        return response.data;
    },

    async updateLine(lineId, lineData) {
        const response = await api.put(`/sales-order-lines/${lineId}`, lineData);
        return response.data;
    },

    async deleteLine(lineId) {
        const response = await api.delete(`/sales-order-lines/${lineId}`);
        return response.data;
    }
};

export default salesOrderService;
