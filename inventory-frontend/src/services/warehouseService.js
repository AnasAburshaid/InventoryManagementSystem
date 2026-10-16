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
    }
};

export default warehouseService;
