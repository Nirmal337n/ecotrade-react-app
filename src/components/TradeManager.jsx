import React, { useState, useEffect } from 'react';
import { FaHandshake, FaComments, FaBell, FaCheck, FaTimes, FaExchangeAlt, FaMoneyBillWave, FaClock, FaUser, FaBox } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TradeManager = ({ product, onClose, onTradeUpdate }) => {
  const [trades, setTrades] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [myId, setMyId] = useState('');
  const [notifications, setNotifications] = useState([]);

  const token = localStorage.getItem('token');

  // Get current user
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMyId(data._id);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchMe();
  }, [token]);

  // Fetch trades for this product
  const fetchTrades = async () => {
    if (!token || !product) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trades/my-trades?product=${product._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTrades(data);
      }
    } catch (err) {
      setError('Failed to load trades');
      console.error('Error fetching trades:', err);
    }
    setLoading(false);
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/notifications?type=trade`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.filter(n => n.post === product._id));
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchTrades();
    fetchNotifications();
  }, [product, token]);

  // Initiate trade
  const initiateTrade = async () => {
    if (!token || !product) return;
    
    // Validate minimum price for sell products
    if (product.type === 'sell' && product.minimum_price && offerAmount) {
      if (parseFloat(offerAmount) < parseFloat(product.minimum_price)) {
        setError(`Offer must be at least NPR ${product.minimum_price}`);
        return;
      }
    }
    
    setLoading(true);
    setError('');
    
    try {
      const tradeData = {
        productId: product._id,
        tradeType: product.type === 'sell' ? 'sale' : 'exchange',
        message: offerMessage || `Interested in ${product.title}`,
        amount: product.type === 'sell' ? parseFloat(offerAmount) : null
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
        throw new Error(errorData.message || 'Failed to initiate trade');
      }
      
      const trade = await res.json();
      
      // Add automated message to the trade
      const automatedMessage = product.type === 'sell' 
        ? `💰 **NEW OFFER RECEIVED**\n\nProduct: ${product.title}\nSell Price: NPR ${product.sell_price}\nOffered Price: NPR ${offerAmount}\n\nYou can accept, reject, or negotiate this offer.`
        : `🔄 **EXCHANGE REQUEST**\n\nProduct: ${product.title}\nDesired Item: ${product.desired_item}\nOffer: ${offerMessage}\n\nYou can accept, reject, or negotiate this exchange.`;
      
      await addAutomatedMessage(trade._id, automatedMessage);
      
      setTrades(prev => [...prev, trade]);
      setShowOfferForm(false);
      setOfferMessage('');
      setOfferAmount('');
      fetchNotifications();
      if (onTradeUpdate) onTradeUpdate();
    } catch (err) {
      setError(err.message);
      console.error('Error initiating trade:', err);
    }
    setLoading(false);
  };

  // Add automated message to trade
  const addAutomatedMessage = async (tradeId, message) => {
    try {
      await fetch(`${API_BASE_URL}/trades/${tradeId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message,
          isSystemMessage: true,
          messageType: 'system'
        })
      });
    } catch (err) {
      console.error('Error adding automated message:', err);
    }
  };

  // Accept offer
  const acceptOffer = async (tradeId) => {
    if (!token) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trades/${tradeId}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to accept offer');
      
      const trade = await res.json();
      setTrades(prev => prev.map(t => t._id === tradeId ? trade : t));
      
      // Add acceptance message
      const acceptanceMessage = `✅ **OFFER ACCEPTED**\n\nBoth parties have agreed to this trade. The product will be removed from the marketplace and moved to trade history.`;
      await addAutomatedMessage(tradeId, acceptanceMessage);
      
      fetchNotifications();
      if (onTradeUpdate) onTradeUpdate();
    } catch (err) {
      setError(err.message);
      console.error('Error accepting offer:', err);
    }
    setLoading(false);
  };

  // Reject offer
  const rejectOffer = async (tradeId) => {
    if (!token) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trades/${tradeId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to reject offer');
      
      const trade = await res.json();
      setTrades(prev => prev.map(t => t._id === tradeId ? trade : t));
      
      // Add rejection message
      const rejectionMessage = `❌ **OFFER REJECTED**\n\nThis offer has been rejected. The trade is now closed.`;
      await addAutomatedMessage(tradeId, rejectionMessage);
      
      fetchNotifications();
      if (onTradeUpdate) onTradeUpdate();
    } catch (err) {
      setError(err.message);
      console.error('Error rejecting offer:', err);
    }
    setLoading(false);
  };

  // Respond to offer (for counter offers)
  const respondToOffer = async (tradeId, offerId, action, counterAmount = null) => {
    if (!token) return;
    
    setLoading(true);
    try {
      const body = { action };
      if (action === 'countered' && counterAmount) {
        body.counterAmount = parseFloat(counterAmount);
        body.counterMessage = offerMessage;
      }

      const res = await fetch(`${API_BASE_URL}/trades/${tradeId}/offer/${offerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Failed to respond to offer');
      
      const trade = await res.json();
      setTrades(prev => prev.map(t => t._id === tradeId ? trade : t));
      setOfferMessage('');
      fetchNotifications();
      if (onTradeUpdate) onTradeUpdate();
    } catch (err) {
      setError(err.message);
      console.error('Error responding to offer:', err);
    }
    setLoading(false);
  };

  // Send message
  const sendMessage = async (tradeId) => {
    if (!newMessage.trim() || !token) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/trades/${tradeId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage })
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      const trade = await res.json();
      setTrades(prev => prev.map(t => t._id === tradeId ? trade : t));
      setNewMessage('');
    } catch (err) {
      setError(err.message);
      console.error('Error sending message:', err);
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId) => {
    if (!token) return;
    
    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const isOwner = product.user && product.user._id === myId;
  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className="trade-manager">
      <div className="trade-manager-header">
        <h3>Trade Manager - {product.title}</h3>
        <button onClick={onClose} className="close-btn">&times;</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Quick Actions */}
      <div className="quick-actions">
        {!isOwner && (
          <button 
            onClick={() => setShowOfferForm(true)}
            className="action-btn primary"
            disabled={loading}
          >
            <FaHandshake /> Make Offer
          </button>
        )}
        
        <div className="notification-badge">
          <FaBell />
          {unreadNotifications.length > 0 && (
            <span className="badge">{unreadNotifications.length}</span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {unreadNotifications.length > 0 && (
        <div className="notifications-section">
          <h4><FaBell /> Recent Notifications</h4>
          {unreadNotifications.map(notification => (
            <div 
              key={notification._id} 
              className="notification-item"
              onClick={() => markNotificationRead(notification._id)}
            >
              <div className="notification-content">
                <strong>{notification.sender?.firstName} {notification.sender?.lastName}</strong>
                <span>{notification.content}</span>
                <small>{new Date(notification.createdAt).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Offer Form */}
      {showOfferForm && (
        <div className="offer-form">
          <h4>Make an Offer</h4>
          
          {/* Product Details Display */}
          <div style={{ 
            marginBottom: '15px', 
            padding: '10px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Product:</strong> {product.title}
            </div>
            {product.sell_price && (
              <div style={{ marginBottom: '5px', color: '#2ecc71', fontWeight: 'bold' }}>
                <strong>Sell Price:</strong> NPR {product.sell_price}
              </div>
            )}
            {product.minimum_price && (
              <div style={{ marginBottom: '5px', color: '#f39c12' }}>
                <strong>Minimum Price:</strong> NPR {product.minimum_price}
              </div>
            )}
            {product.desired_item && (
              <div style={{ marginBottom: '5px', color: '#3498db' }}>
                <strong>Desired Item:</strong> {product.desired_item}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              <strong>Type:</strong> {product.type === 'sell' ? 'For Sale' : 
                                     product.type === 'exchange' ? 'For Exchange' : 'Giveaway'}
            </div>
          </div>

          {product.type === 'sell' && (
            <div className="form-group">
              <label>Offer Amount (NPR):</label>
              <input
                type="number"
                value={offerAmount}
                onChange={(e) => {
                  setOfferAmount(e.target.value);
                  setError(''); // Clear error when user types
                }}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                style={{
                  border: offerAmount && product.minimum_price && parseFloat(offerAmount) < parseFloat(product.minimum_price) 
                    ? '2px solid #e74c3c' : '1px solid #ddd',
                  backgroundColor: offerAmount && product.minimum_price && parseFloat(offerAmount) < parseFloat(product.minimum_price) 
                    ? '#fdf2f2' : 'white'
                }}
              />
              {offerAmount && product.minimum_price && (
                <div style={{ 
                  marginTop: '5px',
                  fontSize: '12px',
                  color: parseFloat(offerAmount) >= parseFloat(product.minimum_price) ? '#2ecc71' : '#e74c3c'
                }}>
                  {parseFloat(offerAmount) >= parseFloat(product.minimum_price) 
                    ? '✓ Offer meets minimum price requirement' 
                    : `⚠ Offer must be at least NPR ${product.minimum_price}`
                  }
                </div>
              )}
            </div>
          )}

          {product.type === 'exchange' && (
            <div className="form-group">
              <label>What you're offering in exchange:</label>
              <textarea
                value={offerMessage}
                onChange={(e) => {
                  setOfferMessage(e.target.value);
                  setError(''); // Clear error when user types
                }}
                placeholder="Describe what you want to exchange for this item..."
                rows="3"
              />
            </div>
          )}

          {product.type === 'sell' && (
            <div className="form-group">
              <label>Message (optional):</label>
              <textarea
                value={offerMessage}
                onChange={(e) => {
                  setOfferMessage(e.target.value);
                  setError(''); // Clear error when user types
                }}
                placeholder="Add a message with your offer..."
                rows="3"
              />
            </div>
          )}

          <div className="form-actions">
            <button 
              onClick={initiateTrade} 
              disabled={loading || (product.type === 'sell' && offerAmount && product.minimum_price && parseFloat(offerAmount) < parseFloat(product.minimum_price))}
              style={{
                backgroundColor: (product.type === 'sell' && offerAmount && product.minimum_price && parseFloat(offerAmount) < parseFloat(product.minimum_price)) 
                  ? '#95a5a6' : '#2ecc71'
              }}
            >
              <FaHandshake /> Send Offer
            </button>
            <button onClick={() => setShowOfferForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Trades */}
      <div className="trades-section">
        <h4><FaExchangeAlt /> Active Trades ({trades.length})</h4>
        {trades.length === 0 ? (
          <p>No active trades for this product.</p>
        ) : (
          trades.map(trade => (
            <div key={trade._id} className="trade-item">
              <div className="trade-header">
                <div className="trade-users">
                  <span><FaUser /> {trade.buyer?.firstName} {trade.buyer?.lastName}</span>
                  <span>→</span>
                  <span><FaUser /> {trade.seller?.firstName} {trade.seller?.lastName}</span>
                </div>
                <div className="trade-status">
                  <span className={`status ${trade.status}`}>{trade.status}</span>
                </div>
              </div>

              <div className="trade-details">
                <div className="product-info">
                  <FaBox /> {trade.product?.title}
                </div>
                {trade.amount && (
                  <div className="amount">
                    <FaMoneyBillWave /> NPR {trade.amount}
                  </div>
                )}
                <div className="date">
                  <FaClock /> {new Date(trade.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Accept/Reject Buttons */}
              {trade.status === 'pending' && (
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  marginBottom: '15px',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef'
                }}>
                  <button 
                    onClick={() => acceptOffer(trade._id)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      backgroundColor: '#2ecc71',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    ✅ Accept Offer
                  </button>
                  <button 
                    onClick={() => rejectOffer(trade._id)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    ❌ Reject Offer
                  </button>
                </div>
              )}

              {/* Trade Status Display */}
              {trade.status === 'accepted' && (
                <div style={{ 
                  padding: '10px',
                  backgroundColor: '#d4edda',
                  color: '#155724',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  border: '1px solid #c3e6cb'
                }}>
                  ✅ <strong>OFFER ACCEPTED</strong> - Product removed from marketplace
                </div>
              )}

              {trade.status === 'rejected' && (
                <div style={{ 
                  padding: '10px',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  border: '1px solid #f5c6cb'
                }}>
                  ❌ <strong>OFFER REJECTED</strong> - Trade closed
                </div>
              )}

              {/* Offers */}
              {trade.offers && trade.offers.length > 0 && (
                <div className="offers-section">
                  <h5>Offers</h5>
                  {trade.offers.map(offer => (
                    <div key={offer._id} className="offer-item">
                      <div className="offer-details">
                        <span className="amount">NPR {offer.amount}</span>
                        <span className="status">{offer.status}</span>
                        {offer.message && <p>{offer.message}</p>}
                      </div>
                      
                      {/* Offer Actions */}
                      {isOwner && offer.status === 'pending' && (
                        <div className="offer-actions">
                          <button 
                            onClick={() => respondToOffer(trade._id, offer._id, 'accepted')}
                            className="btn-accept"
                          >
                            <FaCheck /> Accept
                          </button>
                          <button 
                            onClick={() => respondToOffer(trade._id, offer._id, 'rejected')}
                            className="btn-reject"
                          >
                            <FaTimes /> Reject
                          </button>
                          <button 
                            onClick={() => {
                              setOfferAmount(offer.amount + 100);
                              respondToOffer(trade._id, offer._id, 'countered', offer.amount + 100);
                            }}
                            className="btn-counter"
                          >
                            <FaExchangeAlt /> Counter
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Messages */}
              <div className="messages-section">
                <h5><FaComments /> Chat Messages</h5>
                <div className="messages-container" style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  marginBottom: '15px',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  {trade.messages && trade.messages.length > 0 ? (
                    <div className="messages-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {trade.messages.map((message, index) => {
                        const isOwnMessage = message.sender === myId;
                        const isSystemMessage = message.isSystemMessage;
                        
                        return (
                          <div key={index} className={`message-bubble ${isSystemMessage ? 'system' : isOwnMessage ? 'own' : 'other'}`}
                               style={{
                                 display: 'flex',
                                 flexDirection: 'column',
                                 maxWidth: '70%',
                                 alignSelf: isSystemMessage ? 'center' : isOwnMessage ? 'flex-end' : 'flex-start',
                                 width: 'fit-content'
                               }}>
                            
                            {/* System Message */}
                            {isSystemMessage && (
                              <div style={{
                                backgroundColor: '#fff3cd',
                                border: '1px solid #ffeaa7',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                textAlign: 'center',
                                fontSize: '12px',
                                color: '#856404',
                                fontWeight: '500',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}>
                                <div style={{ marginBottom: '2px' }}>🤖 System</div>
                                <div style={{ whiteSpace: 'pre-line', fontSize: '11px' }}>
                                  {message.message}
                                </div>
                                <div style={{ 
                                  fontSize: '10px', 
                                  color: '#a17f1a', 
                                  marginTop: '4px',
                                  opacity: 0.8
                                }}>
                                  {new Date(message.createdAt || message.timestamp).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* User Messages */}
                            {!isSystemMessage && (
                              <>
                                {/* Message Bubble */}
                                <div style={{
                                  backgroundColor: isOwnMessage ? '#0084ff' : '#e4e6eb',
                                  color: isOwnMessage ? 'white' : '#050505',
                                  borderRadius: '18px',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  lineHeight: '1.3',
                                  wordWrap: 'break-word',
                                  maxWidth: '100%',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                  position: 'relative'
                                }}>
                                  <div style={{ whiteSpace: 'pre-line' }}>
                                    {message.message}
                                  </div>
                                </div>
                                
                                {/* Message Info */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginTop: '2px',
                                  fontSize: '11px',
                                  color: '#65676b',
                                  alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                                  marginLeft: isOwnMessage ? '0' : '12px',
                                  marginRight: isOwnMessage ? '12px' : '0'
                                }}>
                                  <span style={{ fontWeight: '500' }}>
                                    {isOwnMessage ? 'You' : 
                                     trade.buyer?._id === message.sender ? 
                                     `${trade.buyer.firstName} ${trade.buyer.lastName}` :
                                     `${trade.seller.firstName} ${trade.seller.lastName}`}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(message.createdAt || message.timestamp).toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      color: '#65676b',
                      fontSize: '14px',
                      padding: '20px'
                    }}>
                      No messages yet. Start the conversation!
                    </div>
                  )}
                </div>
                
                {trade.status !== 'rejected' && (
                  <div className="message-input" style={{ 
                    display: 'flex', 
                    gap: '10px',
                    alignItems: 'center',
                    padding: '10px',
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    border: '1px solid #e4e6eb',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage(trade._id)}
                      style={{ 
                        flex: 1, 
                        padding: '8px 12px', 
                        border: 'none', 
                        outline: 'none',
                        fontSize: '14px',
                        backgroundColor: 'transparent'
                      }}
                    />
                    <button 
                      onClick={() => sendMessage(trade._id)}
                      disabled={!newMessage.trim()}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: newMessage.trim() ? '#0084ff' : '#e4e6eb',
                        color: newMessage.trim() ? 'white' : '#65676b',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <FaComments style={{ fontSize: '14px' }} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TradeManager;
