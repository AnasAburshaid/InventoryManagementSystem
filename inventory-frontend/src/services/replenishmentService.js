import api from './api';

export const replenishmentService = {
    async getSettings(warehouseId) {
        const response = await api.get(`/warehouses/${warehouseId}/replenishment/settings`);
        return response.data;
    },

    async upsertSetting(warehouseId, data) {
        const response = await api.post(`/warehouses/${warehouseId}/replenishment/settings`, data);
        return response.data;
    },

    async getSuggestions(warehouseId, onlyBelowReorderPoint = true) {
        const response = await api.get(`/warehouses/${warehouseId}/replenishment/suggestions`, {
            params: { onlyBelowReorderPoint }
        });
        return response.data;
    },

    async convertToPo(warehouseId, data) {
        const response = await api.post(`/warehouses/${warehouseId}/replenishment/convert-to-po`, data);
        return response.data;
    }
};

export default replenishmentService;
