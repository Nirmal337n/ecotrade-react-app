import React, { useEffect, useState } from 'react';
import { FaBell, FaHandshake, FaComments, FaCheck, FaTimes, FaExchangeAlt, FaMoneyBillWave, FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './MarketplaceNotificationModal.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MarketplaceNotificationModal = ({ onClose, onTradeAction }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/notifications?type=trade`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        setNotifications(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchNotifications();
  }, [token]);

  // Mark notification as read
  const markNotificationRead = async (notificationId) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      if (onTradeAction) onTradeAction();
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await Promise.all(
        notifications.map(notification =>
          fetch(`${API_BASE_URL}/notifications/${notification._id}/read`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      setNotifications([]);
      if (onTradeAction) onTradeAction();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    await markNotificationRead(notification._id);
    let path = '/dashboard';
    if (notification.post) {
      path = `/posts/${notification.post}`;
    } else if (notification.trade) {
      path = '/trade-center'; // Or `/trade-center/${notification.trade}` if you have a trade details page
    }
    onClose();
    navigate(path);
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className="marketplace-modal-overlay">
      <div className="marketplace-modal">
        <div className="marketplace-modal-header">
          <div className="marketplace-modal-title">
            <FaBell /> Marketplace Notifications
          </div>
          <button className="marketplace-close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 28px 0 28px' }}>
          {unreadNotifications.length > 0 && (
            <button className="marketplace-mark-all-btn" onClick={markAllAsRead}>
              Mark All Read
            </button>
          )}
        </div>
        <div className="marketplace-modal-content">
          {error && <div className="marketplace-error">{error}</div>}
          {loading ? (
            <div className="marketplace-empty-state">Loading...</div>
          ) : (
            <div className="marketplace-notification-list">
              {notifications.length === 0 ? (
                <div className="marketplace-empty-state">
                  No notifications to display.
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification._id}
                    className={`marketplace-notification-card${!notification.read ? ' unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="marketplace-notification-header">
                      <span className="marketplace-notification-sender">
                        <FaUser style={{ color: '#667eea' }} />
                        {notification.sender?.firstName} {notification.sender?.lastName}
                        {!notification.read && (
                          <span className="marketplace-notification-badge">NEW</span>
                        )}
                      </span>
                      {!notification.read && <span className="marketplace-notification-dot"></span>}
                    </div>
                    <div className="marketplace-notification-content">
                      {notification.content}
                    </div>
                    <div className="marketplace-notification-footer">
                      <FaBell style={{ fontSize: '11px' }} />
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceNotificationModal; 