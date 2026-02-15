import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' }
});

const token = () => typeof window !== 'undefined' && localStorage.getItem('token');
api.interceptors.request.use((config) => {
  const t = token();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const products = {
  list: () => api.get('/products'),
  blinkit: () => api.get('/products/blinkit'), // New method
  search: (products) => api.post('/products/search', { products }),
  forecast: (products, horizonMonths = 6) => api.post('/products/forecast', { products, horizonMonths })
};

export const googleTrends = (keyword) => api.get('/google-trends', { params: { keyword } });

export const datasets = {
  upload: (file, productId) => {
    const form = new FormData();
    form.append('file', file);
    if (productId) form.append('productId', productId);
    return api.post('/datasets/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
};

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me')
};

export default api;
