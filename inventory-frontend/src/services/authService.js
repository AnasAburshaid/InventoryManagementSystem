import api from './api';

export const authService = {
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        const data = response.data;
        if (data.accessToken) {
            localStorage.setItem('jwt_token', data.accessToken);
            localStorage.setItem('user_info', JSON.stringify({
                userId: data.userId,
                fullName: data.fullName,
                email: data.email,
                roles: data.roles || [],
                expiresAt: data.expiresAt
            }));
        }
        return data;
    },

    logout() {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_info');
    },

    getCurrentUser() {
        const token = localStorage.getItem('jwt_token');
        const rawUser = localStorage.getItem('user_info');
        if (!token || !rawUser) return null;
        try {
            return JSON.parse(rawUser);
        } catch {
            return null;
        }
    },

    getToken() {
        return localStorage.getItem('jwt_token');
    }
};

export default authService;
