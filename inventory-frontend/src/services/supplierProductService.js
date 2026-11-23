import api from './api';

export const supplierProductService = {
    async getAll(params = {}) {
        const response = await api.get('/supplier-products', { params });
        return response.data;
    },

    async getById(id) {
        const response = await api.get(`/supplier-products/${id}`);
        return response.data;
    },

    async getBySupplier(supplierId) {
        const response = await api.get(`/supplier-products/supplier/${supplierId}`);
        return response.data;
    },

    async getPreferredByProduct(productId) {
        const response = await api.get(`/supplier-products/product/${productId}/preferred`);
        return response.data;
    },

    async create(data) {
        const response = await api.post('/supplier-products', data);
        return response.data;
    },

    async update(id, data) {
        const response = await api.put(`/supplier-products/${id}`, data);
        return response.data;
    },

    async setPreferred(id) {
        const response = await api.patch(`/supplier-products/${id}/preferred`);
        return response.data;
    },

    async delete(id) {
        const response = await api.delete(`/supplier-products/${id}`);
        return response.data;
    }
};

export default supplierProductService;
