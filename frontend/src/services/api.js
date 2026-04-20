import axios from 'axios';

const api = axios.create({
    baseURL: 'https://api-ptar-fes.onrender.com/api',
});

// Esto es para que siempre mande el Token de seguridad si existe
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;