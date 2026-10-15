import axios from 'axios';

// Create a customized Axios instance
const api = axios.create({
    // We will update this port to match your C# API port in the next step
    baseURL: 'https://localhost:7000/api', 
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add a request interceptor to attach the JWT token automatically
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;