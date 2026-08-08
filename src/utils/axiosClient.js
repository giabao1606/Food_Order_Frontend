import axios from 'axios';

const axiosClient = axios.create({
    baseURL: 'https://food-order-backend-myjy.onrender.com/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

axiosClient.interceptors.response.use((response) => {
    return response.data; 
}, (error) => {
    if (axios.isCancel(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        return new Promise(() => {}); // Promise treo — không resolve/reject để tránh side effect
    }

    if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user'); 
        window.location.href = '/'; 
    } 
    else if (error.response?.status === 403) {
        console.error("Bạn không có quyền thực hiện hành động này.");
    }
    
    return Promise.reject(error.response?.data || error);
});

export default axiosClient;
