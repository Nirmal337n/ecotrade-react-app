import React, { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faBell, faHandshake, faHome, faStore, faUsers } from '@fortawesome/free-solid-svg-icons';
import NotificationDropdown from './NotificationDropdown';
import { notificationApi } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { getAuthToken, removeLocalStorage, logError } from '../utils/helpers.js';
import '../App.css';

/**
 * Header component providing navigation, notifications, and user actions
 * Features:
 * - Responsive navigation with active states
 * - Real-time notification system with unread count
 * - User profile dropdown with logout functionality
 * - Optimized API calls and error handling
 */
const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const token = getAuthToken();

  // Fetch notifications with custom hook
  const {
    data: notifications = [],
    loading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications
  } = useApi(
    () => notificationApi.getNotifications(),
    [token],
    { immediate: !!token }
  );

  // Calculate unread count
  const unreadCount = notifications ? notifications.filter(n => !n.read).length : 0;

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(() => {
      refetchNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [token, refetchNotifications]);

  // Handle marking notification as read
  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      // Optimistically update the UI
      refetchNotifications();
    } catch (error) {
      logError(error, 'marking notification as read');
    }
  }, [refetchNotifications]);

  // Handle logout
  const handleLogout = useCallback(() => {
    removeLocalStorage('token');
    removeLocalStorage('userId');
    navigate('/login');
  }, [navigate]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-dropdown') && 
          !event.target.closest('.notification-btn')) {
        setIsDropdownOpen(false);
      }
      if (!event.target.closest('.profile-dropdown')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation items configuration
  const navItems = [
    { to: '/dashboard', label: 'Home', icon: faHome },
    { to: '/marketplace', label: 'Marketplace', icon: faStore },
    { to: '/friends', label: 'Friends', icon: faUsers }
  ];

  return (
    <header className="app-header">
      <div className="header-row">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="header-logo">
            Ecotrade
          </span>
          <span className="header-slogan">benefit: economically and ecologically</span>
        </div>
        <nav className="header-nav">
          {navItems.map((item, index) => (
            <NavLink key={index} to={item.to} className={({ isActive }) => 'header-nav-link' + (isActive ? ' active' : '')}>
              <FontAwesomeIcon icon={item.icon} style={{ marginRight: 8 }} />
              {item.label}
            </NavLink>
          ))}
          <button className="header-trade-center-btn" onClick={() => navigate('/trade-center')}>
            <FontAwesomeIcon icon={faHandshake} style={{ marginRight: 8 }} /> Trade Center
          </button>
        </nav>
        <div className="header-actions">
          <button 
            className="header-icon-btn notification-btn" 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
            aria-label="Notifications"
          >
            <FontAwesomeIcon icon={faBell} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            <span className="header-tooltip">Notifications</span>
          </button>
          {isDropdownOpen && (
            <div className="notification-dropdown">
              <NotificationDropdown
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onClose={() => setIsDropdownOpen(false)}
              />
            </div>
          )}
          <div className="profile-dropdown">
            <button className="header-icon-btn" onClick={() => setIsProfileOpen(!isProfileOpen)} aria-label="Profile">
              <FontAwesomeIcon icon={faUser} />
              <span className="header-tooltip">Profile & Logout</span>
            </button>
            {isProfileOpen && (
              <div className="dropdown-content">
                <Link to="/profile">My Profile</Link>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 