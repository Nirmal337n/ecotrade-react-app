import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import AddProductForm from '../components/AddProductForm';
import { Link, useNavigate } from 'react-router-dom';
import { FaHeart, FaComment, FaInfoCircle, FaBoxOpen, FaBell, FaHistory, FaInbox, FaGift, FaPlus, FaSearch, FaFilter, FaHandshake, FaExchangeAlt } from 'react-icons/fa';
import ProductDetails from './ProductDetails';
import MarketplaceNotificationModal from '../components/MarketplaceNotificationModal';
import MarketplaceMessagesModal from '../components/MarketplaceMessagesModal';
import MarketplaceGiftsModal from '../components/MarketplaceGiftsModal';
import MyProductsModal from '../components/MyProductsModal';
import TradeHistoryModal from '../components/TradeHistoryModal';
import TradeManager from '../components/TradeManager';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_URL = API_BASE_URL.replace(/\/api$/, '');

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [imageModal, setImageModal] = useState({ isOpen: false, src: '' });
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [currentCommentsProduct, setCurrentCommentsProduct] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState({ productIndex: null, commentIndex: null });
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [showNotif, setShowNotif] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showMyProducts, setShowMyProducts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTradeManager, setShowTradeManager] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [myId, setMyId] = useState('');
  const [tradeNotifications, setTradeNotifications] = useState([]);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Fetch products from backend
  const fetchProducts = async (page = 1) => {
    if (!token) return;
    
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/products?page=${page}&limit=20`;
      
      // Add filters
      if (debouncedSearchTerm) url += `&search=${encodeURIComponent(debouncedSearchTerm)}`;
      if (locationFilter !== 'all') url += `&location=${encodeURIComponent(locationFilter)}`;
      if (typeFilter !== 'all') url += `&type=${typeFilter}`;
      if (conditionFilter !== 'all') url += `&condition=${conditionFilter}`;
      if (categoryFilter !== 'all') url += `&productGroup=${categoryFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch products');
      
      const data = await res.json();
      console.log('Search URL:', url);
      console.log('Search results:', data.products?.length || 0, 'products found');
      setProducts(data.products || []);
      setPagination(data.pagination || { page: 1, total: 0, pages: 0 });
    } catch (err) {
      setError('Failed to load products');
      console.error('Error fetching products:', err);
    }
    setLoading(false);
  };

  // Fetch categories
  const fetchCategories = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Fetch trade notifications
  const fetchTradeNotifications = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/notifications?type=trade`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTradeNotifications(data.filter(n => !n.read));
      }
    } catch (err) {
      console.error('Error fetching trade notifications:', err);
    }
  };

  // Get current user id for filtering
  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMyId(data._id);
        }
      } catch {
        // ignore
      }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchTradeNotifications();
  }, [token]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchProducts(1);
  }, [debouncedSearchTerm, locationFilter, typeFilter, conditionFilter, categoryFilter]);

  // Handle product submission
  const handleProductSubmit = async (productData) => {
    if (!token) return;
    
    try {
      const formData = new FormData();
      
      // Add all product fields
      Object.keys(productData).forEach(key => {
        if (key === 'images' && productData[key]) {
          // Handle multiple images
          Array.from(productData[key]).forEach((file) => {
            formData.append('images', file);
          });
        } else if (key === 'tags' && productData[key]) {
          formData.append('tags', JSON.stringify(productData[key]));
        } else if (key === 'contactInfo' && productData[key]) {
          formData.append('contactInfo', JSON.stringify(productData[key]));
        } else if (productData[key] !== undefined && productData[key] !== null) {
          formData.append(key, productData[key]);
        }
      });

      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Failed to create product');
      
      setShowModal(false);
      fetchProducts(); // Refresh products
    } catch (err) {
      setError(err.message);
      console.error('Error creating product:', err);
    }
  };

  // Handle like/unlike
  const handleLike = async (productId) => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/products/${productId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to like product');
      
      // Refresh products to get updated like count
      fetchProducts(pagination.page);
    } catch (err) {
      setError(err.message);
      console.error('Error liking product:', err);
    }
  };

  // Handle comment
  const handleAddComment = async (productId) => {
    if (!token || !newComment.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/products/${productId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: newComment })
      });

      if (!res.ok) throw new Error('Failed to add comment');
      
      setNewComment('');
      setShowCommentsModal(false);
      fetchProducts(pagination.page); // Refresh to get updated comments
    } catch (err) {
      setError(err.message);
      console.error('Error adding comment:', err);
    }
  };

  // Handle reply to comment
  const handleReplyToComment = async (productId, commentId) => {
    if (!token || !replyText.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/products/${productId}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: replyText })
      });

      if (!res.ok) throw new Error('Failed to add reply');
      
      setReplyText('');
      setReplyingTo({ productIndex: null, commentIndex: null });
      fetchProducts(pagination.page); // Refresh to get updated replies
    } catch (err) {
      setError(err.message);
      console.error('Error adding reply:', err);
    }
  };

  const handleShowDetails = (product) => {
    navigate(`/product/${product._id}`);
  };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, src: '' });
  };

  const handleShowComments = (product) => {
    setCurrentCommentsProduct(product);
    setShowCommentsModal(true);
  };

  const handleImageClick = (src) => {
    setImageModal({ isOpen: true, src });
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/placeholder-image.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    return imagePath.startsWith('/uploads') ? BACKEND_URL + imagePath : imagePath;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getConditionText = (condition) => {
    const conditionMap = {
      'new': 'New',
      'like-new': 'Like New',
      'good': 'Good',
      'fair': 'Fair',
      'poor': 'Poor'
    };
    return conditionMap[condition] || condition;
  };

  const getTypeText = (type) => {
    const typeMap = {
      'sell': 'For Sale',
      'exchange': 'For Exchange',
      'giveaway': 'Giveaway'
    };
    return typeMap[type] || type;
  };

  // Handle trade manager
  const handleShowTradeManager = (product) => {
    setSelectedProduct(product);
    setShowTradeManager(true);
  };

  const handleTradeUpdate = () => {
    fetchTradeNotifications();
    fetchProducts(pagination.page);
  };

  // Filter out own products from main marketplace
  const visibleProducts = products.filter(p => p.user && p.user._id !== myId);

  return (
    <div>
      <Header />
      <div className="container">
        <div className="card">
          <h2>Marketplace</h2>
          <div className="marketplace-options-bar" style={{display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', gap: '0.5rem'}}>
            <button className="marketplace-action-btn" onClick={() => setShowModal(true)}>
              <FaPlus className="icon" /> Add Product
            </button>
            <button className="marketplace-action-btn" onClick={() => setShowMyProducts(true)}>
              <FaBoxOpen className="icon" /> My Products
            </button>
            <button className="marketplace-action-btn" onClick={() => setShowNotif(true)}>
              <FaBell className="icon" /> Notifications
            </button>
            <button className="marketplace-action-btn" onClick={() => setShowGifts(true)}>
              <FaGift className="icon" /> Gifts
            </button>
            <button className="marketplace-action-btn" onClick={() => setShowMessages(true)}>
              <FaInbox className="icon" /> Messages
            </button>
            <button className="marketplace-action-btn" onClick={() => setShowHistory(true)}>
              <FaHistory className="icon" /> Trade History
            </button>
            <button className="marketplace-action-btn" onClick={() => navigate('/trade-center')}>
              <FaHandshake className="icon" /> Trade Center
            </button>
          </div>
          {showModal && (
            <div className="modal" style={{ display: 'block' }}>
              <div className="modal-content fb-post-modal">
                <span className="close-modal" onClick={() => setShowModal(false)}>&times;</span>
                <AddProductForm 
                  onSubmit={handleProductSubmit}
                  categories={categories}
                />
              </div>
            </div>
          )}
        </div>

        <h3>
          Marketplace Items
          {debouncedSearchTerm && (
            <span style={{ fontSize: '0.8em', color: '#666', fontWeight: 'normal' }}>
              {' '}({visibleProducts.length} results for "{debouncedSearchTerm}")
            </span>
          )}
        </h3>
        
        {/* Search and Filters */}
        <div className="search-bar" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaSearch style={{ color: '#666' }} />
              <input 
                type="text" 
                placeholder="Search products by title, description, tags, category, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #ddd',
                  minWidth: '300px',
                  fontSize: '14px'
                }}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    background: '#f8f9fa',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaFilter />
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="all">All Types</option>
                <option value="sell">For Sale</option>
                <option value="exchange">For Exchange</option>
                <option value="giveaway">Giveaway</option>
              </select>
            </div>

            <select 
              value={conditionFilter} 
              onChange={(e) => setConditionFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="all">All Conditions</option>
              <option value="new">New</option>
              <option value="like-new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>

            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select 
              value={locationFilter} 
              onChange={(e) => setLocationFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="all">All Locations</option>
              <option value="kathmandu">Kathmandu</option>
              <option value="lalitpur">Lalitpur</option>
              <option value="bhaktapur">Bhaktapur</option>
              <option value="pokhara">Pokhara</option>
              <option value="butwal">Butwal</option>
            </select>
          </div>
        </div>

        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Loading products...</div>
        ) : visibleProducts.length === 0 && debouncedSearchTerm ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <h4>No products found</h4>
            <p>No products match your search for "{debouncedSearchTerm}"</p>
            <button 
              onClick={() => setSearchTerm('')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: '#667eea',
                color: 'white',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <>
            <div id="marketplace-items">
              {/* Group by type */}
              {['sell', 'exchange', 'giveaway'].map(type => {
                const typeProducts = visibleProducts.filter(prod => prod.type === type);
                if (typeFilter !== 'all' && typeFilter !== type) return null;
                
                return (
                  <div key={type} className="marketplace-group">
                    <h4 style={{marginTop: '1.2rem', marginBottom: '0.5rem'}}>
                      {getTypeText(type)} ({typeProducts.length})
                    </h4>
                    <div className="marketplace-group-items" style={{display: 'flex', flexWrap: 'wrap', gap: '1rem'}}>
                      {typeProducts.length === 0 ? (
                        <span style={{color: '#aaa', fontSize: '0.95rem'}}>No items.</span>
                      ) : (
                        typeProducts.map(prod => (
                          <div className="product" key={prod._id}>
                            <div className="product-condition">
                              <span className={prod.condition === 'new' ? 'condition-new' : 'condition-used'}>
                                {getConditionText(prod.condition)}
                              </span>
                              {prod.usage && <span>Used for {prod.usage}</span>}
                            </div>
                            
                            <img 
                              src={getImageUrl(prod.primaryImage)} 
                              alt={prod.title}
                              onClick={() => handleImageClick(getImageUrl(prod.primaryImage))}
                              style={{ cursor: 'pointer' }}
                            />
                            
                            <h4>{prod.title}</h4>
                            <p><strong>Posted by:</strong> {prod.user ? `${prod.user.firstName} ${prod.user.lastName}` : 'Unknown'}</p>
                            <p><strong>Posted on:</strong> {formatDate(prod.createdAt)}</p>
                            
                            {prod.sell_price && <p className="price"><strong>Price:</strong> NPR {prod.sell_price}</p>}
                            {prod.desired_item && <p className="desired-item"><strong>Desired Item:</strong> {prod.desired_item}</p>}
                            <p><strong>Location:</strong> {prod.location}</p>
                            <p><strong>Delivery:</strong> {prod.delivery_type}</p>
                            {prod.payment && <p><strong>Payment:</strong> {prod.payment}</p>}
                            
                            <div className="product-actions">
                              <div className="product-main-actions" style={{display: 'flex', gap: '0.5rem', justifyContent: 'space-evenly'}}>
                                <button 
                                  className="icon-button" 
                                  onClick={() => handleLike(prod._id)}
                                  style={{ color: prod.likes && prod.likes.includes(localStorage.getItem('userId')) ? '#ff4444' : '#666' }}
                                >
                                  <FaHeart />
                                  <span> ({prod.likes ? prod.likes.length : 0})</span>
                                </button>
                                <button 
                                  className="icon-button" 
                                  onClick={() => handleShowComments(prod)}
                                >
                                  <FaComment />
                                  <span> ({prod.comments ? prod.comments.length : 0})</span>
                                </button>
                                <button 
                                  className="icon-button" 
                                  onClick={() => handleShowDetails(prod)}
                                >
                                  <FaInfoCircle />
                                </button>
                                <button 
                                  className="icon-button" 
                                  onClick={() => handleShowTradeManager(prod)}
                                  title="Trade/Offer"
                                >
                                  <FaHandshake />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                <button 
                  onClick={() => fetchProducts(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  Previous
                </button>
                <span style={{ padding: '8px' }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button 
                  onClick={() => fetchProducts(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Modal */}
      {imageModal.isOpen && (
        <div className="modal image-modal" style={{ display: 'block' }} onClick={closeImageModal}>
          <span className="close-modal image-modal-close" onClick={closeImageModal}>&times;</span>
          <img src={imageModal.src} alt="Full size view" className="image-modal-content" />
        </div>
      )}

      {/* Comments Modal */}
      {showCommentsModal && currentCommentsProduct && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content product-detail-modal">
            <span className="close-modal" onClick={() => setShowCommentsModal(false)}>&times;</span>
            <h2>Comments for {currentCommentsProduct.title}</h2>
            <div className="comments-section">
              {currentCommentsProduct.comments && currentCommentsProduct.comments.length > 0 ? (
                currentCommentsProduct.comments.map((comment, cIdx) => (
                  <div key={cIdx} className="comment-card">
                    <div className="comment-header">
                      <span className="comment-author">
                        {comment.user ? `${comment.user.firstName} ${comment.user.lastName}` : 'Unknown'}
                      </span>
                      <span className="comment-date">{formatDate(comment.createdAt)}</span>
                    </div>
                    <div className="comment-body">{comment.text}</div>
                    <div className="comment-actions">
                      <button className="icon-button">
                        <FaHeart /> {comment.likes ? comment.likes.length : 0}
                      </button>
                      <button 
                        onClick={() => setReplyingTo({ productIndex: currentCommentsProduct._id, commentIndex: comment._id })} 
                        className="icon-button"
                      >
                        Reply
                      </button>
                    </div>
                    
                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="replies-list">
                        {comment.replies.map((reply, rIdx) => (
                          <div key={rIdx} className="reply-card">
                            <span className="reply-author">
                              {reply.user ? `${reply.user.firstName} ${reply.user.lastName}` : 'Unknown'}
                            </span>: 
                            <span className="reply-text">{reply.text}</span> 
                            <span className="reply-date">({formatDate(reply.createdAt)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Reply input */}
                    {replyingTo.productIndex === currentCommentsProduct._id && replyingTo.commentIndex === comment._id && (
                      <div className="reply-input">
                        <input 
                          type="text" 
                          value={replyText} 
                          onChange={e => setReplyText(e.target.value)} 
                          placeholder="Write a reply..." 
                        />
                        <button onClick={() => handleReplyToComment(currentCommentsProduct._id, comment._id)}>
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>No comments yet.</p>
              )}
              
              <div className="add-comment-section">
                <input 
                  type="text" 
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)} 
                  placeholder="Write a comment..." 
                />
                <button onClick={() => handleAddComment(currentCommentsProduct._id)}>
                  Add Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade Manager Modal */}
      {showTradeManager && selectedProduct && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content" style={{ maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
            <TradeManager 
              product={selectedProduct}
              onClose={() => setShowTradeManager(false)}
              onTradeUpdate={handleTradeUpdate}
            />
          </div>
        </div>
      )}

      {/* Modals for marketplace sections */}
      {showNotif && <MarketplaceNotificationModal onClose={() => setShowNotif(false)} onTradeAction={handleTradeUpdate} />}
      {showMessages && <MarketplaceMessagesModal onClose={() => setShowMessages(false)} onTradeAction={handleTradeUpdate} />}
      {showGifts && <MarketplaceGiftsModal onClose={() => setShowGifts(false)} />}
      {showMyProducts && <MyProductsModal onClose={() => setShowMyProducts(false)} onProductClick={id => { setShowMyProducts(false); navigate(`/product/${id}`); }} />}
      {showHistory && <TradeHistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
};

export default Marketplace; 