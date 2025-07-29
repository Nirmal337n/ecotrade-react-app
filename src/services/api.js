import { API_BASE_URL } from '../utils/constants.js';
import { createAuthHeaders, createFormDataHeaders, handleApiError } from '../utils/helpers.js';

// Base API class
class ApiService {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  async postFormData(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: createFormDataHeaders(),
      ...options
    });
  }
}

// Create API service instance
const api = new ApiService();

// Authentication API
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout', {}, { headers: createAuthHeaders() }),
  refreshToken: () => api.post('/auth/refresh', {}, { headers: createAuthHeaders() })
};

// User API
export const userApi = {
  getMe: () => api.get('/users/me', { headers: createAuthHeaders() }),
  updateProfile: (userData) => api.put('/users/me', userData, { headers: createAuthHeaders() }),
  getUserById: (userId) => api.get(`/users/${userId}`, { headers: createAuthHeaders() }),
  searchUsers: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`, { headers: createAuthHeaders() }),
  followUser: (userId) => api.post(`/users/${userId}/follow`, {}, { headers: createAuthHeaders() }),
  unfollowUser: (userId) => api.delete(`/users/${userId}/follow`, { headers: createAuthHeaders() })
};

// Product API
export const productApi = {
  getProducts: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/products?${queryString}`, { headers: createAuthHeaders() });
  },
  getProductById: (productId) => api.get(`/products/${productId}`, { headers: createAuthHeaders() }),
  createProduct: (formData) => api.postFormData('/products', formData),
  updateProduct: (productId, formData) => api.postFormData(`/products/${productId}`, formData),
  deleteProduct: (productId) => api.delete(`/products/${productId}`, { headers: createAuthHeaders() }),
  likeProduct: (productId) => api.post(`/products/${productId}/like`, {}, { headers: createAuthHeaders() }),
  unlikeProduct: (productId) => api.delete(`/products/${productId}/like`, { headers: createAuthHeaders() }),
  addComment: (productId, comment) => api.post(`/products/${productId}/comments`, { text: comment }, { headers: createAuthHeaders() }),
  replyToComment: (productId, commentId, reply) => api.post(`/products/${productId}/comments/${commentId}/replies`, { text: reply }, { headers: createAuthHeaders() }),
  getMyProducts: () => api.get('/products?mine=true', { headers: createAuthHeaders() })
};

// Trade API
export const tradeApi = {
  getMyTrades: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/trades/my-trades?${queryString}`, { headers: createAuthHeaders() });
  },
  createTrade: (tradeData) => api.post('/trades', tradeData, { headers: createAuthHeaders() }),
  acceptTrade: (tradeId) => api.put(`/trades/${tradeId}/accept`, {}, { headers: createAuthHeaders() }),
  rejectTrade: (tradeId) => api.put(`/trades/${tradeId}/reject`, {}, { headers: createAuthHeaders() }),
  sendMessage: (tradeId, message) => api.post(`/trades/${tradeId}/message`, { message }, { headers: createAuthHeaders() }),
  getTradeHistory: () => api.get('/trades/history', { headers: createAuthHeaders() }),
  respondToOffer: (tradeId, offerId, response) => api.put(`/trades/${tradeId}/offer/${offerId}`, response, { headers: createAuthHeaders() })
};

// Notification API
export const notificationApi = {
  getNotifications: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/notifications?${queryString}`, { headers: createAuthHeaders() });
  },
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`, {}, { headers: createAuthHeaders() }),
  markAllAsRead: () => api.put('/notifications/read-all', {}, { headers: createAuthHeaders() }),
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`, { headers: createAuthHeaders() })
};

// Post API (for social features)
export const postApi = {
  getPosts: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/posts?${queryString}`, { headers: createAuthHeaders() });
  },
  getPostById: (postId) => api.get(`/posts/${postId}`, { headers: createAuthHeaders() }),
  createPost: (formData) => api.postFormData('/posts', formData),
  updatePost: (postId, postData) => api.put(`/posts/${postId}`, postData, { headers: createAuthHeaders() }),
  deletePost: (postId) => api.delete(`/posts/${postId}`, { headers: createAuthHeaders() }),
  likePost: (postId) => api.post(`/posts/${postId}/like`, {}, { headers: createAuthHeaders() }),
  unlikePost: (postId) => api.delete(`/posts/${postId}/like`, { headers: createAuthHeaders() }),
  addComment: (postId, comment) => api.post(`/posts/${postId}/comments`, { text: comment }, { headers: createAuthHeaders() }),
  replyToComment: (postId, commentId, reply) => api.post(`/posts/${postId}/comments/${commentId}/replies`, { text: reply }, { headers: createAuthHeaders() })
};

// Category API
export const categoryApi = {
  getCategories: () => api.get('/categories', { headers: createAuthHeaders() }),
  createCategory: (categoryData) => api.post('/categories', categoryData, { headers: createAuthHeaders() }),
  updateCategory: (categoryId, categoryData) => api.put(`/categories/${categoryId}`, categoryData, { headers: createAuthHeaders() }),
  deleteCategory: (categoryId) => api.delete(`/categories/${categoryId}`, { headers: createAuthHeaders() })
};

// Export the main API instance for custom requests
export default api;
