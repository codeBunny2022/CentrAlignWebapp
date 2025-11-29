import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (email: string, password: string) =>
    api.post('/auth/signup', { email, password }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

// Forms API
export const formsAPI = {
  generate: (prompt: string, imageUrls?: string[]) =>
    api.post('/forms/generate', { prompt, imageUrls }),
  getAll: () => api.get('/forms'),
  getById: (id: string) => api.get(`/forms/${id}`),
  getByShareableId: (shareableId: string) =>
    api.get(`/forms/share/${shareableId}`),
  delete: (id: string) => api.delete(`/forms/${id}`),
};

// Submissions API
export const submissionsAPI = {
  submit: (formId: string, data: any, imageUrls?: string[]) =>
    api.post('/submissions', { formId, data, imageUrls }),
  getAll: () => api.get('/submissions'),
  getByFormId: (formId: string) => api.get(`/submissions/form/${formId}`),
};

// Upload API
export const uploadAPI = {
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  },
  uploadImages: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const response = await api.post('/upload/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.urls;
  },
};

export default api;

