import React, { useState, useEffect } from 'react';
import { FaGavel, FaClock, FaMoneyBillWave, FaComments, FaHistory, FaCheck, FaTimes, FaExchangeAlt } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TradeModal = ({ isOpen, onClose, product, onTradeCreated }) => {
  const [tradeType, setTradeType] = useState('sale');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAuction, setIsAuction] = useState(false);
  const [auctionSettings, setAuctionSettings] = useState({
    startingPrice: '',
    reservePrice: '',
    auctionEndDate: '',
    autoAcceptPrice: '',
    allowCounterOffers: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (product && product.sell_price) {
      setAmount(product.sell_price.toString());
      setAuctionSettings(prev => ({
        ...prev,
        startingPrice: product.sell_price.toString()
      }));
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const tradeData = {
        productId: product._id,
        tradeType,
        amount: tradeType === 'sale' ? parseFloat(amount) : null,
        message
      };

      if (isAuction) {
        tradeData.isAuction = true;
        tradeData.auctionSettings = {
          startingPrice: parseFloat(auctionSettings.startingPrice),
          reservePrice: auctionSettings.reservePrice ? parseFloat(auctionSettings.reservePrice) : null,
          auctionEndDate: new Date(auctionSettings.auctionEndDate),
          autoAcceptPrice: auctionSettings.autoAcceptPrice ? parseFloat(auctionSettings.autoAcceptPrice) : null,
          allowCounterOffers: auctionSettings.allowCounterOffers
        };
      }

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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!isOpen || !product) return null;

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <span className="close-modal" onClick={onClose}>&times;</span>
        
        <h2>Start Trade for {product.title}</h2>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <img 
            src={product.primaryImage ? 
              (product.primaryImage.startsWith('http') ? product.primaryImage : `http://localhost:5000${product.primaryImage}`) : 
              '/placeholder.jpg'
            } 
            alt={product.title}
            style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
          />
          <div>
            <h3>{product.title}</h3>
            <p><strong>Type:</strong> {product.type}</p>
            <p><strong>Condition:</strong> {product.condition}</p>
            {product.sell_price && <p><strong>Listed Price:</strong> NPR {product.sell_price}</p>}
            <p><strong>Location:</strong> {product.location}</p>
          </div>
        </div>

        {error && <div style={{ color: 'red', marginBottom: '15px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <h4>Trade Type</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="tradeType"
                  value="sale"
                  checked={tradeType === 'sale'}
                  onChange={(e) => setTradeType(e.target.value)}
                />
                <FaMoneyBillWave />
                Direct Sale
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="tradeType"
                  value="exchange"
                  checked={tradeType === 'exchange'}
                  onChange={(e) => setTradeType(e.target.value)}
                />
                <FaExchangeAlt />
                Exchange
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="tradeType"
                  value="giveaway"
                  checked={tradeType === 'giveaway'}
                  onChange={(e) => setTradeType(e.target.value)}
                />
                <FaCheck />
                Giveaway
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isAuction}
                onChange={(e) => setIsAuction(e.target.checked)}
              />
              <FaGavel />
              Create as Auction (Allow multiple offers)
            </label>
          </div>

          {(tradeType === 'sale' || isAuction) && (
            <div style={{ marginBottom: '20px' }}>
              <label>
                <strong>{isAuction ? 'Starting Price' : 'Offer Amount'} (NPR):</strong>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  required
                />
              </label>
            </div>
          )}

          {isAuction && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h4>Auction Settings</h4>
              
              <div style={{ marginBottom: '10px' }}>
                <label>
                  <strong>Reserve Price (NPR):</strong>
                  <input
                    type="number"
                    value={auctionSettings.reservePrice}
                    onChange={(e) => setAuctionSettings(prev => ({ ...prev, reservePrice: e.target.value }))}
                    placeholder="Minimum price you'll accept (optional)"
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </label>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>
                  <strong>Auction End Date:</strong>
                  <input
                    type="datetime-local"
                    value={auctionSettings.auctionEndDate}
                    onChange={(e) => setAuctionSettings(prev => ({ ...prev, auctionEndDate: e.target.value }))}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    required
                  />
                </label>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>
                  <strong>Auto-Accept Price (NPR):</strong>
                  <input
                    type="number"
                    value={auctionSettings.autoAcceptPrice}
                    onChange={(e) => setAuctionSettings(prev => ({ ...prev, autoAcceptPrice: e.target.value }))}
                    placeholder="Automatically accept offers at this price (optional)"
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={auctionSettings.allowCounterOffers}
                  onChange={(e) => setAuctionSettings(prev => ({ ...prev, allowCounterOffers: e.target.checked }))}
                />
                Allow counter offers from seller
              </label>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label>
              <strong>Message to Seller:</strong>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isAuction ? 
                  "Explain why you want this item and any special requirements..." :
                  "Add a message to the seller..."
                }
                style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }}
                rows="3"
              />
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
              disabled={loading}
              style={{
                padding: '10px 20px',
                border: 'none',
                backgroundColor: '#2ecc71',
                color: 'white',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Creating...' : (isAuction ? 'Start Auction' : 'Send Trade Request')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeModal; 