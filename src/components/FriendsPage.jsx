import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Header from './Header';
import './FriendsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const FriendsPage = () => {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requestsReceived, setRequestsReceived] = useState([]);
  const [requestsSent, setRequestsSent] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ exact: [], similar: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatFriend, setChatFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    loadFriendsData();
    initializeSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  const initializeSocket = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: {
        token: token
      }
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });
    
    newSocket.on('newMessage', (message) => {
      if (chatFriend && message.senderId === chatFriend._id) {
        setChatMessages(prev => [...prev, message]);
      }
    });
    
    setSocket(newSocket);
  };

  const loadFriendsData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      // First try to get all friends data from the main endpoint
      const friendsRes = await fetch(`${API_BASE_URL}/friends/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        console.log('Friends data received:', friendsData); // Debug log
        
        // Set friends, requests received, and requests sent from the response
        setFriends(friendsData.friends || []);
        setRequestsReceived(friendsData.requestsReceived || []);
        setRequestsSent(friendsData.requestsSent || []);
      } else {
        console.error('Failed to load friends:', friendsRes.status, friendsRes.statusText);
        const errorData = await friendsRes.json().catch(() => ({}));
        setError(errorData.message || 'Failed to load friends data');
        
        // Fallback: try individual endpoints
        try {
          const [sentRes, receivedRes] = await Promise.all([
            fetch(`${API_BASE_URL}/friends/requests/sent`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/friends/requests/received`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          ]);

          if (sentRes.ok) {
            const sentData = await sentRes.json();
            console.log('Sent requests data:', sentData); // Debug log
            setRequestsSent(sentData);
          }

          if (receivedRes.ok) {
            const receivedData = await receivedRes.json();
            console.log('Received requests data:', receivedData); // Debug log
            setRequestsReceived(receivedData);
          }
        } catch (fallbackErr) {
          console.error('Fallback request failed:', fallbackErr);
        }
      }
    } catch (err) {
      console.error('Error loading friends data:', err);
      setError('Failed to load friends data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/friends/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to search users');
      const data = await response.json();
      
      // Process search results to categorize exact and similar matches
      const users = data.users || [];
      const exactMatches = [];
      const similarMatches = [];
      
      users.forEach(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const query = searchQuery.toLowerCase();
        
        // Check for exact matches
        if (user.firstName.toLowerCase() === query || 
            user.lastName.toLowerCase() === query || 
            user.email.toLowerCase() === query ||
            fullName === query) {
          exactMatches.push(user);
        } else {
          similarMatches.push(user);
        }
      });
      
      setSearchResults({ exact: exactMatches, similar: similarMatches });
      setRecommended(data.recommended || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recommended friends on mount or when switching to search tab with no query
  useEffect(() => {
    if (activeTab === 'search' && (!searchQuery || searchQuery.length < 2)) {
      const fetchRecommended = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/friends/search`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Failed to fetch recommendations');
          const data = await response.json();
          setRecommended(data.recommended || []);
          setSearchResults({ exact: [], similar: [] });
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchRecommended();
    }
  }, [activeTab, searchQuery]);

  const openRequestModal = (user) => {
    setSelectedUser(user);
    setRequestMessage('');
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedUser(null);
    setRequestMessage('');
  };

  const sendFriendRequest = async (userId, message = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/friends/request`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipientId: userId, message })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send friend request');
      }
      
      setSuccess('Friend request sent successfully!');
      // Update the user's status in search results
      setSearchResults(prev => ({
        exact: prev.exact.map(user => 
          user._id === userId ? { ...user, friendshipStatus: 'request_sent' } : user
        ),
        similar: prev.similar.map(user => 
          user._id === userId ? { ...user, friendshipStatus: 'request_sent' } : user
        )
      }));
      closeRequestModal();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendRequest = () => {
    if (selectedUser) {
      sendFriendRequest(selectedUser._id, requestMessage);
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/friends/accept/${requestId}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to accept friend request`);
      }
      
      const result = await response.json();
      setSuccess('Friend request accepted successfully! You are now friends.');
      
      // Emit socket event to notify the other user
      if (socket) {
        socket.emit('friendRequestAccepted', { requestId, acceptedBy: localStorage.getItem('userId') });
      }
      
      await loadFriendsData(); // Refresh the data to show new friend
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setError(err.message || 'Failed to accept friend request');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const rejectFriendRequest = async (requestId) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/friends/reject/${requestId}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to reject friend request`);
      }
      
      const result = await response.json();
      setSuccess('Friend request rejected successfully');
      await loadFriendsData(); // Refresh the data
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      setError(err.message || 'Failed to reject friend request');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/friends/remove/${friendId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to remove friend');
      
      setSuccess('Friend removed successfully');
      loadFriendsData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const blockUser = async (userId) => {
    if (!window.confirm('Are you sure you want to block this user?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/friends/block/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to block user');
      
      setSuccess('User blocked successfully');
      loadFriendsData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const viewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const startChat = async (friend) => {
    setChatFriend(friend);
    setShowChatModal(true);
    await loadChatMessages(friend._id);
  };

  const loadChatMessages = async (friendId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const messages = await response.json();
        setChatMessages(messages);
      }
    } catch (err) {
      console.error('Error loading chat messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatFriend) return;
    
    try {
      const messageData = {
        receiverId: chatFriend._id,
        content: newMessage.trim()
      };
      
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
      
      if (response.ok) {
        const sentMessage = await response.json();
        setChatMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        
        // Emit socket event for real-time delivery
        if (socket) {
          socket.emit('sendMessage', sentMessage);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const closeChatModal = () => {
    setShowChatModal(false);
    setChatFriend(null);
    setChatMessages([]);
    setNewMessage('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchUsers();
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    if (query.length >= 2) {
      const timeout = setTimeout(() => {
        searchUsers();
      }, 500); // 500ms delay
      setSearchTimeout(timeout);
    } else {
      // Clear results if query is too short
      setSearchResults({ exact: [], similar: [] });
    }
  };

  // Handle accepting friend request from search results
  const acceptFriendRequestFromSearch = async (userId) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/friends/accept/${userId}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to accept friend request`);
      }
      
      setSuccess('Friend request accepted successfully! You are now friends.');
      
      // Update the user's status in search results
      setSearchResults(prev => ({
        exact: prev.exact.map(user => 
          user._id === userId ? { ...user, friendshipStatus: 'friends' } : user
        ),
        similar: prev.similar.map(user => 
          user._id === userId ? { ...user, friendshipStatus: 'friends' } : user
        )
      }));
      
      await loadFriendsData(); // Refresh the data to show new friend
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setError(err.message || 'Failed to accept friend request');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Render action buttons based on friendship status
  const renderActionButtons = (user) => {
    switch (user.friendshipStatus) {
      case 'friends':
        return (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/profile/${user._id}`)}
            >
              View Profile
            </button>
            <button
              className="btn btn-success"
              onClick={() => startChat(user)}
            >
              Send Message
            </button>
          </div>
        );
      case 'request_sent':
        return (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/profile/${user._id}`)}
            >
              View Profile
            </button>
            <span className="status-badge sent">Request Sent</span>
          </div>
        );
      case 'request_received':
        return (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/profile/${user._id}`)}
            >
              View Profile
            </button>
            <button
              className="btn btn-primary"
              onClick={() => acceptFriendRequestFromSearch(user._id)}
            >
              Accept Request
            </button>
            <span className="status-badge received">Request Received</span>
          </div>
        );
      default:
        return (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-primary"
              onClick={() => openRequestModal(user)}
            >
              Add Friend
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/profile/${user._id}`)}
            >
              View Profile
            </button>
          </div>
        );
    }
  };

  // Add cancelFriendRequest function
  const cancelFriendRequest = async (userId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/friends/cancel-request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientId: userId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel friend request');
      }
      setRequestsSent(prev => prev.filter(user => user._id !== userId));
      setSuccess('Friend request cancelled.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="friends-page">
      <Header />
      <div className="friends-container">
        <h1>Friends</h1>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <div className="friends-tabs">
          <button 
            className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('friends');
              loadFriendsData(); // Refresh friends when tab is clicked
            }}
          >
            Friends ({friends.length})
          </button>
          <button 
            className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Requests ({requestsReceived.length})
          </button>
          <button 
            className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent ({requestsSent.length})
          </button>
          <button 
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Find Friends
          </button>
        </div>

        <div className="friends-content">
          {activeTab === 'friends' && (
            <div className="friends-list">
              {console.log('Rendering friends section, friends count:', friends.length)} {/* Debug log */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Your Friends ({friends.length})</h3>
                <button 
                  className="btn btn-secondary"
                  onClick={loadFriendsData}
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              {loading ? (
                <div className="loading">Loading friends...</div>
              ) : friends.length === 0 ? (
                <div className="empty-state">No friends yet. Start by finding people to connect with!</div>
              ) : (
                friends.map(friend => (
                  <div key={friend._id} className="friend-item">
                    <div className="friend-info">
                      <img 
                        src={friend.profilePicture || '/default-avatar.png'} 
                        alt={`${friend.firstName} ${friend.lastName}`}
                        className="friend-avatar"
                      />
                      <div className="friend-details">
                        <h3>{friend.firstName} {friend.lastName}</h3>
                        <p>{friend.email}</p>
                        {friend.bio && <p className="friend-bio">{friend.bio}</p>}
                      </div>
                    </div>
                    <div className="friend-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => viewProfile(friend._id)}
                      >
                        View Profile
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={() => startChat(friend)}
                      >
                        Send Message
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => removeFriend(friend._id)}
                      >
                        Remove Friend
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => blockUser(friend._id)}
                      >
                        Block
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="requests-list">
              {loading ? (
                <div className="loading">Loading requests...</div>
              ) : requestsReceived.length === 0 ? (
                <div className="empty-state">No pending friend requests</div>
              ) : (
                requestsReceived.map(request => {
                  console.log('Individual request data:', request); // Debug log
                  return (
                    <div key={request._id} className="request-item">
                      <div className="request-info">
                        <img 
                          src={request.sender?.profilePicture || request.profilePicture || '/default-avatar.png'} 
                          alt={`${request.sender?.firstName || request.firstName || 'Unknown'} ${request.sender?.lastName || request.lastName || 'User'}`}
                          className="request-avatar"
                        />
                        <div className="request-details">
                          <h3>
                            {request.sender?.firstName || request.firstName || 'Unknown'} {' '}
                            {request.sender?.lastName || request.lastName || 'User'}
                          </h3>
                          <p>{request.sender?.email || request.email || 'No email provided'}</p>
                          {request.message && (
                            <div className="request-message">
                              <strong>Message:</strong> <em>"{request.message}"</em>
                            </div>
                          )}
                          <p className="request-date">
                            Sent: {request.createdAt ? 
                              new Date(request.createdAt).toLocaleDateString() : 
                              request.sentAt ? 
                              new Date(request.sentAt).toLocaleDateString() : 
                              'Date not available'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="request-actions" style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          className="btn btn-primary"
                          onClick={() => acceptFriendRequest(request._id)}
                        >
                          Accept
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => rejectFriendRequest(request._id)}
                        >
                          Reject
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => navigate(`/profile/${request.sender?._id}`)}
                          disabled={!request.sender?._id}
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="sent-requests-list">
              {loading ? (
                <div className="loading">Loading sent requests...</div>
              ) : requestsSent.length === 0 ? (
                <div className="empty-state">No sent friend requests</div>
              ) : (
                <>
                  {requestsSent.map(request => (
                    <div key={request._id} className="request-item">
                      <div className="request-info">
                        <img 
                          src={request.recipient?.profilePicture || '/default-avatar.png'} 
                          alt={`${request.recipient?.firstName || ''} ${request.recipient?.lastName || ''}`}
                          className="request-avatar"
                        />
                        <div className="request-details">
                          <h3>{request.recipient?.firstName} {request.recipient?.lastName}</h3>
                          <p>{request.recipient?.email}</p>
                          <p className="request-status">Request sent - pending response</p>
                        </div>
                      </div>
                      <div className="request-actions" style={{ display: 'flex', gap: '10px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => navigate(`/profile/${request.recipient?._id}`)}
                        >
                          View Profile
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => cancelFriendRequest(request.recipient?._id)}
                        >
                          Cancel Request
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="search-section">
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder="Search by name or email..."
                  className="search-input long-input"
                  minLength={2}
                  style={{ width: '400px', maxWidth: '90%' }}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading || searchQuery.length < 2}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {loading && <div className="loading">Searching for users...</div>}

              {!loading && (searchResults.exact?.length > 0 || searchResults.similar?.length > 0) && (
                <div className="search-results">
                  {/* Exact Matches */}
                  {searchResults.exact?.length > 0 && (
                    <div className="exact-matches">
                      <h3>
                        <span className="match-badge exact">✓</span>
                        Exact Matches for "{searchQuery}" ({searchResults.exact.length})
                      </h3>
                      {searchResults.exact.map(user => (
                        <div key={user._id} className="search-result-item exact-match">
                          <div className="user-info">
                            <img 
                              src={user.profilePicture || '/default-avatar.png'} 
                              alt={`${user.firstName} ${user.lastName}`}
                              className="user-avatar"
                            />
                            <div className="user-details">
                              <h3>{user.firstName} {user.lastName}</h3>
                              <p>{user.email}</p>
                              {user.bio && <p className="user-bio">{user.bio}</p>}
                            </div>
                          </div>
                          {renderActionButtons(user)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Similar Matches */}
                  {searchResults.similar?.length > 0 && (
                    <div className="similar-matches">
                      <h3>
                        <span className="match-badge similar">~</span>
                        Similar Matches for "{searchQuery}" ({searchResults.similar.length})
                      </h3>
                      {searchResults.similar.map(user => (
                        <div key={user._id} className="search-result-item similar-match">
                          <div className="user-info">
                            <img 
                              src={user.profilePicture || '/default-avatar.png'} 
                              alt={`${user.firstName} ${user.lastName}`}
                              className="user-avatar"
                            />
                            <div className="user-details">
                              <h3>{user.firstName} {user.lastName}</h3>
                              <p>{user.email}</p>
                              {user.bio && <p className="user-bio">{user.bio}</p>}
                            </div>
                          </div>
                          {renderActionButtons(user)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* No search results message */}
              {!loading && searchQuery.length >= 2 && searchResults.exact?.length === 0 && searchResults.similar?.length === 0 && (
                <div className="empty-state">
                  <p>No users found matching "{searchQuery}"</p>
                  <p>Try searching with a different name or email address.</p>
                </div>
              )}

              {/* Recommended friends section */}
              {!loading && recommended.length > 0 && (
                <div className="search-results recommended-results">
                  <h3>Recommended Friends</h3>
                  {recommended.map(user => (
                    <div key={user._id} className="search-result-item">
                      <div className="user-info">
                        <img 
                          src={user.profilePicture || '/default-avatar.png'} 
                          alt={`${user.firstName} ${user.lastName}`}
                          className="user-avatar"
                        />
                        <div className="user-details">
                          <h3>{user.firstName} {user.lastName}</h3>
                          <p>{user.email}</p>
                          {user.bio && <p className="user-bio">{user.bio}</p>}
                          {user.interests && user.interests.length > 0 && (
                            <p className="user-bio"><b>Interests:</b> {user.interests.join(', ')}</p>
                          )}
                        </div>
                      </div>
                      {renderActionButtons(user)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showRequestModal && (
        <div className="request-modal">
          <div className="modal-content">
            <span className="close" onClick={closeRequestModal}>&times;</span>
            <h2>Send Friend Request</h2>
            {selectedUser && (
              <p className="modal-user-info">
                To: {selectedUser.firstName} {selectedUser.lastName}
              </p>
            )}
            <input
              type="text"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Message (optional)"
              className="message-input"
            />
            <button 
              className="btn btn-primary"
              onClick={handleSendRequest}
            >
              Send Request
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => sendFriendRequest(selectedUser._id)}
              style={{ marginTop: '10px' }}
            >
              Send Without Message
            </button>
          </div>
        </div>
      )}

      {/* Live Chat Modal */}
      {showChatModal && chatFriend && (
        <div className="modal-overlay" onClick={closeChatModal}>
          <div className="modal-content chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chat with {chatFriend.firstName} {chatFriend.lastName}</h3>
              <button className="close-btn" onClick={closeChatModal}>&times;</button>
            </div>
            
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <div className="empty-chat">No messages yet. Start the conversation!</div>
              ) : (
                chatMessages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`message ${message.senderId === localStorage.getItem('userId') ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">{message.content}</div>
                    <div className="message-time">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="chat-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} disabled={!newMessage.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsPage; 