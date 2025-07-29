// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const BACKEND_URL = API_BASE_URL.replace(/\/api$/, '');
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

// Product Types
export const PRODUCT_TYPES = {
  SELL: 'sell',
  EXCHANGE: 'exchange',
  GIVEAWAY: 'giveaway'
};

export const PRODUCT_TYPE_LABELS = {
  [PRODUCT_TYPES.SELL]: 'For Sale',
  [PRODUCT_TYPES.EXCHANGE]: 'For Exchange',
  [PRODUCT_TYPES.GIVEAWAY]: 'Giveaway'
};

// Product Conditions
export const PRODUCT_CONDITIONS = {
  NEW: 'new',
  LIKE_NEW: 'like-new',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor'
};

export const PRODUCT_CONDITION_LABELS = {
  [PRODUCT_CONDITIONS.NEW]: 'New',
  [PRODUCT_CONDITIONS.LIKE_NEW]: 'Like New',
  [PRODUCT_CONDITIONS.GOOD]: 'Good',
  [PRODUCT_CONDITIONS.FAIR]: 'Fair',
  [PRODUCT_CONDITIONS.POOR]: 'Poor'
};

// Trade Status
export const TRADE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Notification Types
export const NOTIFICATION_TYPES = {
  TRADE: 'trade',
  MESSAGE: 'message',
  LIKE: 'like',
  COMMENT: 'comment',
  SYSTEM: 'system'
};

// Default Images
export const DEFAULT_IMAGES = {
  PRODUCT: '/assets/images/reuse.png',
  AVATAR: '/assets/images/default-avatar.png'
};

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// Validation Rules
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_TAGS: 10,
  MAX_IMAGES: 5
};

// Colors
export const COLORS = {
  PRIMARY: '#667eea',
  SUCCESS: '#28a745',
  WARNING: '#ffc107',
  DANGER: '#dc3545',
  INFO: '#17a2b8',
  LIGHT: '#f8f9fa',
  DARK: '#343a40'
};

// Type Colors
export const TYPE_COLORS = {
  [PRODUCT_TYPES.SELL]: COLORS.SUCCESS,
  [PRODUCT_TYPES.EXCHANGE]: COLORS.WARNING,
  [PRODUCT_TYPES.GIVEAWAY]: COLORS.INFO
};

// Condition Colors
export const CONDITION_COLORS = {
  [PRODUCT_CONDITIONS.NEW]: COLORS.SUCCESS,
  [PRODUCT_CONDITIONS.LIKE_NEW]: '#20c997',
  [PRODUCT_CONDITIONS.GOOD]: COLORS.INFO,
  [PRODUCT_CONDITIONS.FAIR]: COLORS.WARNING,
  [PRODUCT_CONDITIONS.POOR]: COLORS.DANGER
};
