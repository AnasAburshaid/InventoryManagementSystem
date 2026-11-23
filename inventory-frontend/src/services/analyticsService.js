import api from './api';

export const analyticsService = {
    async getMovementHistory(warehouseId, params = {}) {
        const response = await api.get(`/warehouses/${warehouseId}/movement-history`, { params });
        return response.data;
    },

    async getActivitySummary(warehouseId, params = {}) {
        const response = await api.get(`/warehouses/${warehouseId}/activity-summary`, { params });
        return response.data;
    },

    async getWarehouseInventory(warehouseId, params = {}) {
        const response = await api.get(`/warehouses/${warehouseId}/inventory`, { params });
        return response.data;
    },

    async getWarehouseAnalytics(warehouseId, params = {}) {
        const response = await api.get(`/warehouses/${warehouseId}/analytics`, { params });
        return response.data;
    },

    async getSupplierAnalytics(supplierId) {
        const response = await api.get(`/suppliers/${supplierId}/analytics`);
        return response.data;
    }
};

export default analyticsService;
