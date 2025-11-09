import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async verify() {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  async displayLogin(token) {
    const response = await api.post('/displays/verify', { token });
    return response.data;
  }
};

export default authService;

