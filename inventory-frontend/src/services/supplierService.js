import api from './api';

export const supplierService = {
    async getAll() {
        const response = await api.get('/suppliers');
        return response.data;
    },

    async create(data) {
        const response = await api.post('/suppliers', data);
        return response.data;
    }
};

export default supplierService;
