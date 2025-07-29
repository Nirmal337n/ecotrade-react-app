import React, { useEffect, useState } from 'react';
import { FaBox, FaEye, FaEdit, FaTrash, FaHeart, FaComment, FaCalendar, FaMapMarkerAlt, FaTag, FaTimes, FaSearch } from 'react-icons/fa';
import './MyProductsModal.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MyProductsModal = ({ onClose, onProductClick }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/products?mine=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch products');
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [token]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/assets/images/reuse.png';
    if (imagePath.startsWith('http')) return imagePath;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${imagePath}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getConditionText = (condition) => {
    const conditions = {
      'new': 'New',
      'like-new': 'Like New',
      'good': 'Good',
      'fair': 'Fair',
      'poor': 'Poor'
    };
    return conditions[condition] || condition;
  };

  const getTypeText = (type) => {
    const types = {
      'sell': 'For Sale',
      'exchange': 'For Exchange',
      'giveaway': 'Giveaway'
    };
    return types[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      'sell': '#28a745',
      'exchange': '#ffc107',
      'giveaway': '#17a2b8'
    };
    return colors[type] || '#6c757d';
  };

  const getConditionColor = (condition) => {
    const colors = {
      'new': '#28a745',
      'like-new': '#20c997',
      'good': '#17a2b8',
      'fair': '#ffc107',
      'poor': '#dc3545'
    };
    return colors[condition] || '#6c757d';
  };

  const filteredProducts = products
    .filter(product => filterType === 'all' || product.type === filterType)
    .filter(product => 
      searchTerm === '' || 
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.desired_item && product.desired_item.toLowerCase().includes(searchTerm.toLowerCase())) ||
      product.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="my-products-modal-overlay" onClick={onClose}>
      <div className="my-products-modal" onClick={(e) => e.stopPropagation()}>
        <div className="my-products-modal-header">
          <div className="my-products-modal-title">
            <FaBox className="title-icon" />
            <h2>My Products</h2>
            <span className="product-count">({products.length} total)</span>
          </div>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search your products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({products.length})
          </button>
          <button 
            className={`filter-tab ${filterType === 'sell' ? 'active' : ''}`}
            onClick={() => setFilterType('sell')}
          >
            For Sale ({products.filter(p => p.type === 'sell').length})
          </button>
          <button 
            className={`filter-tab ${filterType === 'exchange' ? 'active' : ''}`}
            onClick={() => setFilterType('exchange')}
          >
            For Exchange ({products.filter(p => p.type === 'exchange').length})
          </button>
          <button 
            className={`filter-tab ${filterType === 'giveaway' ? 'active' : ''}`}
            onClick={() => setFilterType('giveaway')}
          >
            Giveaway ({products.filter(p => p.type === 'giveaway').length})
          </button>
        </div>

        <div className="my-products-content">
          {!loading && !error && filteredProducts.length > 0 && (
            <div className="results-counter">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          )}
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your products...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="error-message">{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <FaBox className="empty-icon" />
              <h3>No products found</h3>
              <p>You haven't posted any products yet.</p>
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map(product => (
                <div key={product._id} className="product-card" onClick={() => onProductClick && onProductClick(product._id)}>
                  <div className="product-image-container">
                    <img 
                      src={getImageUrl(product.primaryImage)} 
                      alt={product.title}
                      className="product-image"
                      onError={(e) => {
                        e.target.src = '/assets/images/reuse.png';
                      }}
                    />
                    <div className="product-type-badge" style={{ backgroundColor: getTypeColor(product.type) }}>
                      {getTypeText(product.type)}
                    </div>
                    <div className="product-condition-badge" style={{ backgroundColor: getConditionColor(product.condition) }}>
                      {getConditionText(product.condition)}
                    </div>
                  </div>

                  <div className="product-info">
                    <h3 className="product-title">{product.title}</h3>
                    
                    <div className="product-meta">
                      <div className="meta-item">
                        <FaCalendar className="meta-icon" />
                        <span>{formatDate(product.createdAt)}</span>
                      </div>
                      <div className="meta-item">
                        <FaMapMarkerAlt className="meta-icon" />
                        <span>{product.location}</span>
                      </div>
                    </div>

                    {product.sell_price && (
                      <div className="product-price">
                        <FaTag className="price-icon" />
                        <span className="price-amount">NPR {product.sell_price}</span>
                      </div>
                    )}

                    {product.desired_item && (
                      <div className="desired-item">
                        <span className="desired-label">Desired:</span>
                        <span className="desired-text">{product.desired_item}</span>
                      </div>
                    )}

                    <div className="product-stats">
                      <div className="stat-item">
                        <FaHeart className="stat-icon" />
                        <span>{product.likes ? product.likes.length : 0}</span>
                      </div>
                      <div className="stat-item">
                        <FaComment className="stat-icon" />
                        <span>{product.comments ? product.comments.length : 0}</span>
                      </div>
                    </div>

                    <div className="product-actions">
                      <button className="action-button view-button">
                        <FaEye />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProductsModal;