import api from './api';

export const productService = {
    async getAll() {
        const response = await api.get('/products');
        return response.data;
    },

    async getById(id) {
        const response = await api.get(`/products/${id}`);
        return response.data;
    },

    async create(data) {
        const response = await api.post('/products', data);
        return response.data;
    },

    async getCategories() {
        const response = await api.get('/categories');
        return response.data;
    },

    async createCategory(data) {
        const response = await api.post('/categories', data);
        return response.data;
    },

    async getBrands() {
        const response = await api.get('/brands');
        return response.data;
    },

    async getBrandsByCategory(categoryId) {
        const response = await api.get(`/categories/${categoryId}/brands`);
        return response.data;
    },

    async createBrand(data) {
        const response = await api.post('/brands', data);
        return response.data;
    },

    async getUnitsOfMeasure(activeOnly = true) {
        const response = await api.get(`/unit-of-measures?activeOnly=${activeOnly}`);
        return response.data;
    }
};

export default productService;
