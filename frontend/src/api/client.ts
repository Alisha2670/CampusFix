import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorPayload = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      details: error.message,
    };
    const message = error.response?.data?.message || 'A network error occurred. Please check your connection.';
    return Promise.reject({ ...error, customMessage: message, errorPayload });
  }
);

