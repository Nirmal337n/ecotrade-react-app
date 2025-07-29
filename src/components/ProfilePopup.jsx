import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ProfilePopup = ({ user, position, onClose, onAddFriend }) => {
  const popupRef = useRef(null);
  const [friendshipStatus, setFriendshipStatus] = useState('loading');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popupRef, onClose]);

  useEffect(() => {
    if (user) {
      checkFriendshipStatus();
    }
  }, [user]);

  const checkFriendshipStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/friends/status/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFriendshipStatus(data.status);
      }
    } catch (err) {
      console.error('Error checking friendship status:', err);
      setFriendshipStatus('none');
    }
  };

  const handleAddFriend = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/friends/request`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipientId: user._id })
      });
      
      if (response.ok) {
        setFriendshipStatus('request_sent');
        onAddFriend(user);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send friend request');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      alert('Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/friends/accept/${user._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setFriendshipStatus('friends');
        onAddFriend(user);
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
      alert('Failed to accept friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/friends/reject/${user._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setFriendshipStatus('none');
        onAddFriend(user);
      }
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      alert('Failed to reject friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/friends/remove/${user._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setFriendshipStatus('none');
        onAddFriend(user);
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      alert('Failed to remove friend');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const style = {
    position: 'absolute',
    top: `${position.top}px`,
    left: `${position.left}px`,
    zIndex: 100,
  };

  const renderActionButton = () => {
    if (loading) {
      return <div className="profile-popup-option loading">Loading...</div>;
    }

    switch (friendshipStatus) {
      case 'friends':
        return (
          <button onClick={handleRemoveFriend} className="profile-popup-option">
            Remove Friend
          </button>
        );
      case 'request_sent':
        return (
          <div className="profile-popup-option disabled">
            Request Sent
          </div>
        );
      case 'request_received':
        return (
          <div className="profile-popup-actions">
            <button onClick={handleAcceptRequest} className="profile-popup-option accept">
              Accept
            </button>
            <button onClick={handleRejectRequest} className="profile-popup-option reject">
              Reject
            </button>
          </div>
        );
      case 'blocked':
        return (
          <div className="profile-popup-option disabled">
            User Blocked
          </div>
        );
      case 'self':
        return null;
      default:
        return (
          <button onClick={handleAddFriend} className="profile-popup-option">
            Add Friend
          </button>
        );
    }
  };

  return (
    <div ref={popupRef} className="profile-popup-small" style={style}>
      <Link to={`/profile/${user._id}`} className="profile-popup-option" onClick={onClose}>
        View Profile
      </Link>
      {renderActionButton()}
    </div>
  );
};

export default ProfilePopup; 