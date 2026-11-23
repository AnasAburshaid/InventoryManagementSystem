import api from './api';

export const warehouseService = {
    async getAll() {
        const response = await api.get('/warehouses');
        return response.data;
    },

    async getById(id) {
        const response = await api.get(`/warehouses/${id}`);
        return response.data;
    },

    async create(data) {
        const response = await api.post('/warehouses', data);
        return response.data;
    },

    async changeStatus(id, isActive) {
        const response = await api.patch(`/warehouses/${id}/status`, { isActive });
        return response.data;
    },

    async getAssignments(warehouseId) {
        const response = await api.get(`/warehouse-assignments/warehouse/${warehouseId}`);
        return response.data;
    },

    async getAllAssignments() {
        const response = await api.get('/warehouse-assignments');
        return response.data;
    },

    async createAssignment(data) {
        const response = await api.post('/warehouse-assignments', data);
        return response.data;
    },

    // Category Restrictions
    async getRestrictions(warehouseId) {
        const response = await api.get(`/warehouses/${warehouseId}/categories`);
        return response.data;
    },

    async setRestrictions(warehouseId, categoryIds) {
        const response = await api.put(`/warehouses/${warehouseId}/categories`, { categoryIds });
        return response.data;
    },

    async updateCategoryFlag(warehouseId, canAcceptAllCategories) {
        const response = await api.put(`/warehouses/${warehouseId}/category-flag`, { canAcceptAllCategories });
        return response.data;
    },

    async checkCategoryEligibility(warehouseId, categoryId) {
        const response = await api.get(`/warehouses/${warehouseId}/category-eligibility/${categoryId}`);
        return response.data;
    },

    async getEligibleProducts(warehouseId) {
        const response = await api.get(`/warehouses/${warehouseId}/eligible-products`);
        return response.data;
    }
};

export default warehouseService;
