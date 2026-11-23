import api from './api';

export const purchaseOrderService = {
    // Purchase Order Headers
    async getAll(params = {}) {
        const response = await api.get('/purchase-orders', { params });
        return response.data;
    },

    async getById(id) {
        const response = await api.get(`/purchase-orders/${id}`);
        return response.data;
    },

    async getByNumber(orderNumber) {
        const response = await api.get(`/purchase-orders/by-number/${orderNumber}`);
        return response.data;
    },

    async create(data) {
        const response = await api.post('/purchase-orders', data);
        return response.data;
    },

    async update(id, data) {
        const response = await api.put(`/purchase-orders/${id}`, data);
        return response.data;
    },

    async submit(id) {
        const response = await api.post(`/purchase-orders/${id}/submit`);
        return response.data;
    },

    async receive(id, items) {
        const response = await api.post(`/purchase-orders/${id}/receive`, { items });
        return response.data;
    },

    async cancel(id, reason = null) {
        const response = await api.post(`/purchase-orders/${id}/cancel`, null, {
            params: reason ? { reason } : {}
        });
        return response.data;
    },

    async delete(id) {
        const response = await api.delete(`/purchase-orders/${id}`);
        return response.data;
    },

    // Purchase Order Lines
    async getLines(purchaseOrderId) {
        const response = await api.get(`/purchase-orders/${purchaseOrderId}/lines`);
        return response.data;
    },

    async addLine(purchaseOrderId, lineData) {
        const response = await api.post(`/purchase-orders/${purchaseOrderId}/lines`, lineData);
        return response.data;
    },

    async updateLine(lineId, lineData) {
        const response = await api.put(`/purchase-order-lines/${lineId}`, lineData);
        return response.data;
    },

    async deleteLine(lineId) {
        const response = await api.delete(`/purchase-order-lines/${lineId}`);
        return response.data;
    }
};

export default purchaseOrderService;
