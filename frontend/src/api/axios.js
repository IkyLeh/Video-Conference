// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Ini adalah "penjaga"-nya (interceptor)
api.interceptors.response.use(
  (response) => response, // Jika respons sukses, langsung teruskan
  (error) => {
    // Jika ada error, cek apakah statusnya 401
    if (error.response && error.response.status === 401) {
      // Hapus token yang tidak valid
      localStorage.removeItem('token');
      // Arahkan paksa ke halaman login
      window.location.href = '/login';
      alert('Sesi Anda telah berakhir, silakan login kembali.');
    }
    return Promise.reject(error);
  }
);

export default api;