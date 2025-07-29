import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SimpleTradeModal from '../components/SimpleTradeModal';
import { FaHeart, FaComment, FaShare, FaFlag, FaPhone, FaEnvelope, FaMapMarkerAlt, FaGavel, FaMoneyBillWave } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_URL = API_BASE_URL.replace(/\/api$/, '');

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [activeAuctions, setActiveAuctions] = useState([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProduct();
    fetchActiveAuctions();
  }, [id]);

  const fetchProduct = async () => {
    if (!token || !id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Product not found');
      
      const data = await res.json();
      setProduct(data);
    } catch (err) {
      setError('Failed to load product');
      console.error('Error fetching product:', err);
    }
    setLoading(false);
  };

  const fetchActiveAuctions = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/trades/auctions/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setActiveAuctions(data);
      }
    } catch (err) {
      console.error('Error fetching auctions:', err);
    }
  };

  const handleLike = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to like product');
      
      fetchProduct();
    } catch (err) {
      setError(err.message);
      console.error('Error liking product:', err);
    }
  };

  const handleReport = async () => {
    if (!token || !reportReason.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reportReason })
      });

      if (!res.ok) throw new Error('Failed to report product');
      
      setShowReportModal(false);
      setReportReason('');
      alert('Product reported successfully');
    } catch (err) {
      setError(err.message);
      console.error('Error reporting product:', err);
    }
  };

  const handleTradeCreated = (trade) => {
    alert(`Trade request sent successfully! ${trade.auction && trade.auction.isAuction ? 'Auction started!' : ''}`);
    fetchActiveAuctions(); // Refresh auctions list
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads')) return BACKEND_URL + imagePath;
    return imagePath;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getConditionText = (condition) => {
    const conditionMap = {
      'new': 'Brand New',
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

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container">
          <div style={{ textAlign: 'center', padding: '20px' }}>Loading product...</div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div>
        <Header />
        <div className="container">
          <button onClick={() => navigate(-1)} style={{marginBottom: '1rem'}}>Back</button>
          <div className="card">
            <h2>Product not found</h2>
            <p>{error || 'The product you are looking for does not exist.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const images = product.images || [];
  const currentImage = images[currentImageIndex] || product.primaryImage;
  const hasActiveAuction = activeAuctions.some(auction => auction.product._id === product._id);

  return (
    <div>
      <Header />
      <div className="container">
        <button onClick={() => navigate(-1)} style={{marginBottom: '1rem'}}>← Back</button>
        
        <div className="card">
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <img 
                src={getImageUrl(currentImage)} 
                alt={product.title} 
                style={{
                  width: '100%', 
                  maxHeight: '400px', 
                  objectFit: 'cover', 
                  borderRadius: '8px',
                  marginBottom: '10px'
                }} 
              />
              
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {images.map((image, index) => (
                    <img 
                      key={index}
                      src={getImageUrl(image)} 
                      alt={`${product.title} ${index + 1}`} 
                      style={{
                        width: '80px', 
                        height: '80px', 
                        objectFit: 'cover', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: index === currentImageIndex ? '3px solid #2ecc71' : '1px solid #ccc'
                      }}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: '1', minWidth: '300px' }}>
              <h2>{product.title}</h2>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                marginBottom: '15px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <span style={{ 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: product.type === 'sell' ? '#3498db' : 
                                  product.type === 'exchange' ? '#f39c12' : '#27ae60',
                  color: 'white'
                }}>
                  {getTypeText(product.type)}
                </span>
                <span style={{ 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '12px',
                  backgroundColor: product.condition === 'new' ? '#2ecc71' : '#95a5a6',
                  color: 'white'
                }}>
                  {getConditionText(product.condition)}
                </span>
                {hasActiveAuction && (
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <FaGavel />
                    AUCTION ACTIVE
                  </span>
                )}
              </div>

              {product.sell_price && (
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2ecc71', marginBottom: '15px' }}>
                  NPR {product.sell_price}
                </div>
              )}

              {product.desired_item && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>Desired Item:</strong> {product.desired_item}
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <p><strong>Posted by:</strong> {product.user ? `${product.user.firstName} ${product.user.lastName}` : 'Unknown'}</p>
                <p><strong>Posted on:</strong> {formatDate(product.createdAt)}</p>
                <p><strong>Location:</strong> <FaMapMarkerAlt style={{ marginRight: '5px' }} />{product.location}</p>
                <p><strong>Delivery:</strong> {product.delivery_type}</p>
                {product.payment && <p><strong>Payment:</strong> {product.payment}</p>}
                {product.usage && <p><strong>Usage:</strong> {product.usage}</p>}
                {product.valid_till && <p><strong>Valid till:</strong> {formatDate(product.valid_till)}</p>}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <strong>Description:</strong>
                <p style={{ marginTop: '5px', lineHeight: '1.6' }}>{product.description}</p>
              </div>

              {product.tags && product.tags.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>Tags:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                    {product.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        style={{ 
                          background: '#2ecc71', 
                          color: 'white', 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <button 
                  onClick={handleLike}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: product.likes && product.likes.includes(localStorage.getItem('userId')) ? '#ff4444' : '#666'
                  }}
                >
                  <FaHeart />
                  <span>{product.likes ? product.likes.length : 0}</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666' }}>
                  <FaComment />
                  <span>{product.comments ? product.comments.length : 0}</span>
                </div>
                <button 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  <FaShare />
                  <span>Share</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <button 
                  className="icon-button" 
                  style={{background: '#2ecc71', color: '#fff', flex: 1, minWidth: '120px'}} 
                  onClick={() => setShowTradeModal(true)}
                >
                  <FaMoneyBillWave style={{ marginRight: '5px' }} />
                  {hasActiveAuction ? 'Join Auction' : 'Make Offer'}
                </button>
                <button 
                  className="icon-button" 
                  style={{background: '#3498db', color: '#fff', flex: 1, minWidth: '120px'}} 
                  onClick={() => setShowContactModal(true)}
                >
                  <FaPhone style={{ marginRight: '5px' }} />
                  Contact Seller
                </button>
                <button 
                  className="icon-button" 
                  style={{background: '#e74c3c', color: '#fff', flex: 1, minWidth: '120px'}} 
                  onClick={() => setShowReportModal(true)}
                >
                  <FaFlag style={{ marginRight: '5px' }} />
                  Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <span className="close-modal" onClick={() => setShowContactModal(false)}>&times;</span>
            <h3>Contact Information</h3>
            {product.contactInfo ? (
              <div>
                {product.contactInfo.phone && (
                  <p><FaPhone style={{ marginRight: '10px' }} />Phone: {product.contactInfo.phone}</p>
                )}
                {product.contactInfo.email && (
                  <p><FaEnvelope style={{ marginRight: '10px' }} />Email: {product.contactInfo.email}</p>
                )}
                <p><strong>Preferred contact:</strong> {product.contactInfo.preferredContact}</p>
              </div>
            ) : (
              <p>No contact information available. Use the trade request feature to contact the seller.</p>
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <span className="close-modal" onClick={() => setShowReportModal(false)}>&times;</span>
            <h3>Report Product</h3>
            <select 
              value={reportReason} 
              onChange={(e) => setReportReason(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            >
              <option value="">Select a reason</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="spam">Spam</option>
              <option value="fake">Fake product</option>
              <option value="harassment">Harassment</option>
              <option value="other">Other</option>
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleReport}
                disabled={!reportReason}
                style={{ flex: 1, padding: '10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                Report
              </button>
              <button 
                onClick={() => setShowReportModal(false)}
                style={{ flex: 1, padding: '10px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      <SimpleTradeModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        product={product}
        onTradeCreated={handleTradeCreated}
      />
    </div>
  );
};

export default ProductDetails; 