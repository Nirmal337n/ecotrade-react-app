import React, { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SimpleTradeModal = ({ isOpen, onClose, product, onTradeCreated }) => {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAuction, setIsAuction] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const token = localStorage.getItem('token');

  const validateOffer = () => {
    const offerAmount = parseFloat(amount);
    const minPrice = parseFloat(product.minimum_price);
    
    if (isNaN(offerAmount) || offerAmount <= 0) {
      setValidationError('Please enter a valid offer amount');
      return false;
    }
    
    if (product.minimum_price && offerAmount < minPrice) {
      setValidationError(`Offer must be at least NPR ${product.minimum_price} (minimum price)`);
      return false;
    }
    
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (!validateOffer()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tradeData = {
        productId: product._id,
        tradeType: 'sale',
        amount: parseFloat(amount),
        message,
        isAuction
      };

      const res = await fetch(`${API_BASE_URL}/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(tradeData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create trade');
      }

      const trade = await res.json();
      onTradeCreated(trade);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <span className="close-modal" onClick={onClose}>&times;</span>
        
        <h2>Make Offer for {product.title}</h2>
        
        {/* Product Image */}
        {product.primaryImage && (
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <img 
              src={product.primaryImage.startsWith('/uploads') ? `http://localhost:5000${product.primaryImage}` : product.primaryImage}
              alt={product.title}
              style={{ 
                maxWidth: '200px', 
                maxHeight: '150px', 
                objectFit: 'cover',
                borderRadius: '8px',
                border: '2px solid #e9ecef'
              }}
            />
          </div>
        )}
        
        {/* Seller's Offer Details */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Seller's Offer Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <strong>Product Type:</strong>
              <div style={{ color: '#6c757d' }}>
                {product.type === 'sell' ? 'For Sale' : 
                 product.type === 'exchange' ? 'For Exchange' : 'Giveaway'}
              </div>
            </div>
            
            <div>
              <strong>Condition:</strong>
              <div style={{ color: '#6c757d' }}>
                {product.condition === 'new' ? 'Brand New' :
                 product.condition === 'like-new' ? 'Like New' :
                 product.condition === 'good' ? 'Good' :
                 product.condition === 'fair' ? 'Fair' : 'Poor'}
              </div>
            </div>
          </div>

          {product.sell_price && (
            <div style={{ 
              marginBottom: '10px',
              padding: '10px',
              backgroundColor: '#e8f5e8',
              borderRadius: '6px',
              border: '1px solid #c3e6c3'
            }}>
              <strong style={{ color: '#2ecc71' }}>Sell Price: NPR {product.sell_price}</strong>
            </div>
          )}

          {product.minimum_price && (
            <div style={{ 
              marginBottom: '10px',
              padding: '10px',
              backgroundColor: '#fff3cd',
              borderRadius: '6px',
              border: '1px solid #ffeaa7'
            }}>
              <strong style={{ color: '#f39c12' }}>Minimum Price: NPR {product.minimum_price}</strong>
              <div style={{ fontSize: '12px', color: '#856404', marginTop: '3px' }}>
                Your offer must be at least this amount
              </div>
            </div>
          )}

          {product.desired_item && (
            <div style={{ 
              marginBottom: '10px',
              padding: '10px',
              backgroundColor: '#d1ecf1',
              borderRadius: '6px',
              border: '1px solid #bee5eb'
            }}>
              <strong style={{ color: '#0c5460' }}>Desired Item:</strong>
              <div style={{ color: '#0c5460' }}>{product.desired_item}</div>
            </div>
          )}

          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '10px' }}>
            <strong>Location:</strong> {product.location} | <strong>Delivery:</strong> {product.delivery_type}
          </div>
        </div>
        
        {error && <div style={{ color: 'red', marginBottom: '15px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>{error}</div>}
        {validationError && <div style={{ color: 'red', marginBottom: '15px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>{validationError}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label>
              <strong>Your Offer Amount (NPR):</strong>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setValidationError(''); // Clear validation error when user types
                }}
                placeholder="Enter your offer"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '5px',
                  border: validationError ? '2px solid #e74c3c' : '1px solid #ddd',
                  backgroundColor: validationError ? '#fdf2f2' : 'white'
                }}
                required
              />
            </label>
            
            {/* Real-time validation feedback */}
            {amount && product.minimum_price && (
              <div style={{ 
                marginTop: '5px',
                fontSize: '12px',
                color: parseFloat(amount) >= parseFloat(product.minimum_price) ? '#2ecc71' : '#e74c3c',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {parseFloat(amount) >= parseFloat(product.minimum_price) 
                  ? '✓ Offer meets minimum price requirement' 
                  : `⚠ Offer must be at least NPR ${product.minimum_price}`
                }
              </div>
            )}
            
            {/* Price comparison for sell products */}
            {amount && product.sell_price && product.type === 'sell' && (
              <div style={{ 
                marginTop: '3px',
                fontSize: '11px',
                color: '#666'
              }}>
                {parseFloat(amount) >= parseFloat(product.sell_price) 
                  ? `✓ Your offer (NPR ${amount}) is at or above the sell price`
                  : `Your offer (NPR ${amount}) is ${parseFloat(product.sell_price) - parseFloat(amount)} NPR below the sell price`
                }
              </div>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <strong>Message to Seller:</strong>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message with your offer..."
                style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }}
                rows="3"
              />
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isAuction}
                onChange={(e) => setIsAuction(e.target.checked)}
              />
              Create as auction (allow multiple offers)
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #ccc',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (amount && product.minimum_price && parseFloat(amount) < parseFloat(product.minimum_price))}
              style={{
                padding: '10px 20px',
                border: 'none',
                backgroundColor: (amount && product.minimum_price && parseFloat(amount) < parseFloat(product.minimum_price)) ? '#95a5a6' : '#2ecc71',
                color: 'white',
                borderRadius: '4px',
                cursor: (loading || (amount && product.minimum_price && parseFloat(amount) < parseFloat(product.minimum_price))) ? 'not-allowed' : 'pointer',
                opacity: (loading || (amount && product.minimum_price && parseFloat(amount) < parseFloat(product.minimum_price))) ? 0.7 : 1
              }}
            >
              {loading ? 'Sending...' : 
               (amount && product.minimum_price && parseFloat(amount) < parseFloat(product.minimum_price)) ? 'Offer Too Low' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleTradeModal; 