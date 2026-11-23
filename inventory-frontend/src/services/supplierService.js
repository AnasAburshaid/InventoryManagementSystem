import api from './api';

export const supplierService = {
    async getAll() {
        const response = await api.get('/suppliers');
        return response.data;
    },

    async getById(id) {
        const response = await api.get(`/suppliers/${id}`);
        return response.data;
    },

    async create(data) {
        const response = await api.post('/suppliers', data);
        return response.data;
    },

    // Capabilities
    async getCapabilities(supplierId) {
        const response = await api.get(`/suppliers/${supplierId}/capabilities`);
        return response.data;
    },

    async setCategoryCapabilities(supplierId, categoryIds) {
        const response = await api.put(`/suppliers/${supplierId}/capabilities/categories`, { categoryIds });
        return response.data;
    },

    async setBrandCapabilities(supplierId, brandIds) {
        const response = await api.put(`/suppliers/${supplierId}/capabilities/brands`, { brandIds });
        return response.data;
    },

    async updateCapabilityFlags(supplierId, data) {
        const response = await api.put(`/suppliers/${supplierId}/capabilities/flags`, data);
        return response.data;
    },

    async getEligibleProducts(supplierId) {
        const response = await api.get(`/suppliers/${supplierId}/capabilities/eligible-products`);
        return response.data;
    },

    // Stock & Inventory Tracking
    async getStockSummary(supplierId) {
        const response = await api.get(`/suppliers/${supplierId}/stock`);
        return response.data;
    },

    async recordReplenishment(supplierId, data) {
        const response = await api.post(`/suppliers/${supplierId}/stock/replenish`, data);
        return response.data;
    },

    async recordAdjustment(supplierId, data) {
        const response = await api.post(`/suppliers/${supplierId}/stock/adjust`, data);
        return response.data;
    },

    async getProductStock(supplierId, productId) {
        const response = await api.get(`/suppliers/${supplierId}/stock/${productId}`);
        return response.data;
    },

    async getStockLedger(supplierId, productId = null) {
        const params = productId ? { productId } : {};
        const response = await api.get(`/suppliers/${supplierId}/stock/history`, { params });
        return response.data;
    },

    async getEligibleSuppliersForProduct(productId) {
        const response = await api.get(`/products/${productId}/eligible-suppliers`);
        return response.data;
    }
};

export default supplierService;
