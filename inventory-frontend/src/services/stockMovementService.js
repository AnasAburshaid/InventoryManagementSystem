import api from './api';

export const stockMovementService = {
    async getHistory(warehouseId, productId) {
        const response = await api.get(`/warehouses/${warehouseId}/stock-movements/products/${productId}`);
        return response.data;
    },

    async getCurrentStock(warehouseId, productId) {
        const response = await api.get(`/warehouses/${warehouseId}/stock-movements/products/${productId}/current-stock`);
        return response.data;
    },

    async recordMovement(warehouseId, data) {
        const response = await api.post(`/warehouses/${warehouseId}/stock-movements`, data);
        return response.data;
    },

    async transferStock(warehouseId, data) {
        const response = await api.post(`/warehouses/${warehouseId}/stock-movements/transfers`, data);
        return response.data;
    },

    async getAdjustmentReasons() {
        const response = await api.get('/adjustment-reasons');
        return response.data;
    }
};

export default stockMovementService;
