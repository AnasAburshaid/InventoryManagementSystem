import api from './api';

export const customerService = {
    async getAll() {
        const response = await api.get('/customers');
        return response.data;
    },

    async create(data) {
        const response = await api.post('/customers', data);
        return response.data;
    }
};

export default customerService;
