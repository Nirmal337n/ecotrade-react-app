import React, { useEffect, useState } from 'react';
import { FaHandshake, FaComments, FaBell, FaCheck, FaTimes, FaExchangeAlt, FaMoneyBillWave, FaClock, FaUser, FaBox, FaReply } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MarketplaceMessagesModal = ({ onClose, onTradeAction }) => {
  const [trades, setTrades] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('trades'); // 'trades' or 'notifications'
  const [newMessage, setNewMessage] = useState('');
  const [myId, setMyId] = useState('');
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch trades
        const tradesRes = await fetch(`${API_BASE_URL}/trades/my-trades`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (tradesRes.ok) {
          const tradesData = await tradesRes.json();
          setTrades(tradesData);
        }

        // Fetch notifications
        const notifRes = await fetch(`${API_BASE_URL}/notifications?type=trade`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotifications(notifData);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  // Send message to trade
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
      
      const updatedTrade = await res.json();
      setTrades(prev => prev.map(t => t._id === tradeId ? updatedTrade : t));
      setNewMessage('');
    } catch (err) {
      setError(err.message);
    }
  };

  // Respond to offer
  const respondToOffer = async (tradeId, offerId, action, counterAmount = null) => {
    if (!token) return;
    
    try {
      const body = { action };
      if (action === 'countered' && counterAmount) {
        body.counterAmount = parseFloat(counterAmount);
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
      
      const updatedTrade = await res.json();
      setTrades(prev => prev.map(t => t._id === tradeId ? updatedTrade : t));
      if (onTradeAction) onTradeAction();
    } catch (err) {
      setError(err.message);
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
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#ffc107',
      'accepted': '#28a745',
      'rejected': '#dc3545',
      'completed': '#17a2b8',
      'agreed': '#28a745'
    };
    return colors[status] || '#6c757d';
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content" style={{ maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }}>
        <span className="close-modal" onClick={onClose}>&times;</span>
        <h3>Marketplace Messages & Notifications</h3>
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee' }}>
          <button 
            onClick={() => setActiveTab('trades')}
            style={{ 
              padding: '10px 20px', 
              border: 'none', 
              background: activeTab === 'trades' ? '#007bff' : '#f8f9fa',
              color: activeTab === 'trades' ? 'white' : '#333',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            <FaComments /> Trades ({trades.length})
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            style={{ 
              padding: '10px 20px', 
              border: 'none', 
              background: activeTab === 'notifications' ? '#007bff' : '#f8f9fa',
              color: activeTab === 'notifications' ? 'white' : '#333',
              cursor: 'pointer',
              borderRadius: '4px',
              position: 'relative'
            }}
          >
            <FaBell /> Notifications ({unreadNotifications.length})
            {unreadNotifications.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#e74c3c',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                {unreadNotifications.length}
              </span>
            )}
          </button>
        </div>

        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {/* Trades Tab */}
            {activeTab === 'trades' && (
              <div>
                {trades.length === 0 ? (
                  <p>No active trades.</p>
                ) : (
                  trades.map(trade => (
                    <div key={trade._id} style={{ 
                      border: '1px solid #ddd', 
                      borderRadius: '8px', 
                      padding: '15px', 
                      marginBottom: '15px',
                      background: 'white'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <h4 style={{ margin: 0 }}>
                            <FaBox /> {trade.product?.title}
                          </h4>
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            <FaUser /> {trade.buyer?.firstName} {trade.buyer?.lastName} → {trade.seller?.firstName} {trade.seller?.lastName}
                          </div>
                        </div>
                        <div style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          background: getStatusColor(trade.status),
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {trade.status}
                        </div>
                      </div>

                      {trade.amount && (
                        <div style={{ marginBottom: '10px' }}>
                          <FaMoneyBillWave /> Amount: NPR {trade.amount}
                        </div>
                      )}

                      {/* Offers */}
                      {trade.offers && trade.offers.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                          <h5>Offers:</h5>
                          {trade.offers.map(offer => (
                            <div key={offer._id} style={{ 
                              border: '1px solid #eee', 
                              borderRadius: '4px', 
                              padding: '10px', 
                              marginBottom: '8px',
                              background: offer.status === 'pending' ? '#fff3cd' : '#f8f9fa'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <strong>NPR {offer.amount}</strong>
                                  <span style={{ 
                                    marginLeft: '10px', 
                                    padding: '2px 6px', 
                                    borderRadius: '3px', 
                                    background: getStatusColor(offer.status),
                                    color: 'white',
                                    fontSize: '11px'
                                  }}>
                                    {offer.status}
                                  </span>
                                </div>
                                {offer.status === 'pending' && trade.seller?._id === myId && (
                                  <div style={{ display: 'flex', gap: '5px' }}>
                                    <button 
                                      onClick={() => respondToOffer(trade._id, offer._id, 'accepted')}
                                      style={{ background: '#28a745', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer' }}
                                    >
                                      <FaCheck /> Accept
                                    </button>
                                    <button 
                                      onClick={() => respondToOffer(trade._id, offer._id, 'rejected')}
                                      style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer' }}
                                    >
                                      <FaTimes /> Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                              {offer.message && <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{offer.message}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Messages */}
                      <div>
                        <h5><FaComments /> Messages:</h5>
                        <div style={{ 
                          maxHeight: '200px', 
                          overflowY: 'auto', 
                          border: '1px solid #eee', 
                          borderRadius: '4px', 
                          padding: '10px',
                          marginBottom: '10px'
                        }}>
                          {trade.messages && trade.messages.length > 0 ? (
                            trade.messages.map((message, index) => (
                              <div key={index} style={{ 
                                marginBottom: '8px', 
                                padding: '8px', 
                                borderRadius: '4px',
                                background: message.sender === myId ? '#e3f2fd' : '#f5f5f5',
                                marginLeft: message.sender === myId ? '20px' : '0',
                                marginRight: message.sender === myId ? '0' : '20px'
                              }}>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                  {message.sender === myId ? 'You' : 
                                   trade.buyer?._id === message.sender ? 
                                   `${trade.buyer.firstName} ${trade.buyer.lastName}` :
                                   `${trade.seller.firstName} ${trade.seller.lastName}`}
                                  <span style={{ marginLeft: '10px' }}>
                                    {new Date(message.createdAt).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div>{message.message}</div>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: '#666', fontStyle: 'italic' }}>No messages yet.</p>
                          )}
                        </div>
                        
                        {/* Message Input */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage(trade._id)}
                            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                          />
                          <button 
                            onClick={() => sendMessage(trade._id)}
                            style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <FaReply /> Send
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                {notifications.length === 0 ? (
                  <p>No notifications.</p>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification._id} 
                      style={{ 
                        padding: '15px', 
                        borderBottom: '1px solid #eee',
                        background: notification.read ? 'white' : '#f8f9fa',
                        cursor: 'pointer'
                      }}
                      onClick={() => markNotificationRead(notification._id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                            {notification.sender?.firstName} {notification.sender?.lastName}
                          </div>
                          <div style={{ marginBottom: '5px' }}>{notification.content}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(notification.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {!notification.read && (
                          <div style={{
                            width: '10px',
                            height: '10px',
                            background: '#e74c3c',
                            borderRadius: '50%',
                            marginLeft: '10px'
                          }}></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MarketplaceMessagesModal;
