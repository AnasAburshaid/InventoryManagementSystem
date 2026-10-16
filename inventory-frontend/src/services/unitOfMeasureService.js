import api from './api';

export const unitOfMeasureService = {
    async getAll(activeOnly = true) {
        const response = await api.get(`/unit-of-measures?activeOnly=${activeOnly}`);
        return response.data;
    },

    async getById(id) {
        const response = await api.get(`/unit-of-measures/${id}`);
        return response.data;
    }
};

export default unitOfMeasureService;
