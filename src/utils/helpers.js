import { 
  API_BASE_URL, 
  BACKEND_URL, 
  DEFAULT_IMAGES, 
  PRODUCT_TYPE_LABELS, 
  PRODUCT_CONDITION_LABELS,
  TYPE_COLORS,
  CONDITION_COLORS
} from './constants.js';

// Authentication helpers
export const getAuthToken = () => localStorage.getItem('token');
export const getUserId = () => localStorage.getItem('userId');
export const isAuthenticated = () => !!getAuthToken();

// API helpers
export const createAuthHeaders = (token = getAuthToken()) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

export const createFormDataHeaders = (token = getAuthToken()) => ({
  'Authorization': `Bearer ${token}`
});

// Image helpers
export const getImageUrl = (imagePath) => {
  if (!imagePath) return DEFAULT_IMAGES.PRODUCT;
  if (imagePath.startsWith('http')) return imagePath;
  return `${BACKEND_URL}/${imagePath}`;
};

export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return DEFAULT_IMAGES.AVATAR;
  if (avatarPath.startsWith('http')) return avatarPath;
  return `${BACKEND_URL}/${avatarPath}`;
};

// Date helpers
export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(dateString);
};

// Product helpers
export const getProductTypeText = (type) => PRODUCT_TYPE_LABELS[type] || type;
export const getProductConditionText = (condition) => PRODUCT_CONDITION_LABELS[condition] || condition;
export const getProductTypeColor = (type) => TYPE_COLORS[type] || '#6c757d';
export const getProductConditionColor = (condition) => CONDITION_COLORS[condition] || '#6c757d';

// Validation helpers
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0;
};

export const validatePrice = (price) => {
  const numPrice = parseFloat(price);
  return !isNaN(numPrice) && numPrice > 0;
};

// Array helpers
export const removeDuplicates = (array, key) => {
  if (!key) return [...new Set(array)];
  return array.filter((item, index, self) => 
    index === self.findIndex(t => t[key] === item[key])
  );
};

export const sortByDate = (array, dateKey = 'createdAt', ascending = false) => {
  return [...array].sort((a, b) => {
    const dateA = new Date(a[dateKey]);
    const dateB = new Date(b[dateKey]);
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

// String helpers
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Search helpers
export const searchInText = (text, searchTerm) => {
  if (!text || !searchTerm) return false;
  return text.toLowerCase().includes(searchTerm.toLowerCase());
};

export const searchInArray = (array, searchTerm, searchKeys = []) => {
  if (!searchTerm) return array;
  
  return array.filter(item => {
    if (searchKeys.length === 0) {
      return JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return searchKeys.some(key => {
      const value = key.split('.').reduce((obj, k) => obj?.[k], item);
      return value && searchInText(value.toString(), searchTerm);
    });
  });
};

// Debounce helper
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Local storage helpers
export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// Error handling helpers
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return defaultMessage;
};

export const logError = (error, context = '') => {
  console.error(`Error ${context}:`, error);
};

// Form helpers
export const createFormData = (data) => {
  const formData = new FormData();
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (value === null || value === undefined) return;
    
    if (key === 'images' && value instanceof FileList) {
      Array.from(value).forEach(file => {
        formData.append('images', file);
      });
    } else if (Array.isArray(value) || typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value);
    }
  });
  
  return formData;
};
