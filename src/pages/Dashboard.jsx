import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ProfilePopup from '../components/ProfilePopup';
import io from 'socket.io-client';
import CreatePostModal from '../components/CreatePostModal';

const socket = io('http://localhost:4000');

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_URL = API_BASE_URL.replace(/\/api$/, '');

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [postFilter, setPostFilter] = useState('recommended'); // 'recommended', 'all', 'friends'
  const [myId, setMyId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportingPost, setReportingPost] = useState(null);
  const [showReportOptions, setShowReportOptions] = useState(false);


  const token = localStorage.getItem('token');

  // Get current user id for delete button
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

  // Fetch posts based on selected filter
  const fetchPosts = async () => {
    setLoading(true);
    try {
      let url;
      
      if (postFilter === 'recommended') {
        // First get the current user's ID
        const userRes = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!userRes.ok) throw new Error('Failed to get user info');
        const userData = await userRes.json();
        
        // Then fetch recommended posts for this user
        url = `${API_BASE_URL}/users/${userData._id}/recommended-posts`;
      } else if (postFilter === 'friends') {
        // Fetch posts from friends only
        url = `${API_BASE_URL}/posts?visibility=friends`;
      } else {
        // Fetch all public posts
        url = `${API_BASE_URL}/posts?visibility=public`;
      }
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(`Failed to load ${postFilter} posts`);
      console.error(`Error fetching ${postFilter} posts:`, err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line
  }, [postFilter]);

  // Handle modal submission
  const handleModalSubmit = async (postData) => {
    setError('');
    try {
      const formData = new FormData();
      formData.append('content', postData.content);
      formData.append('visibility', postData.visibility);
      formData.append('context', postData.context);
      formData.append('tags', JSON.stringify(postData.tags));
      if (postData.image) formData.append('image', postData.image);
      
      const res = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to create post');
      fetchPosts();
    } catch (err) {
      setError(err.message);
      console.error('Error creating post:', err);
    }
  };

  // Like/unlike post
  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to like post');
      fetchPosts();
    } catch (err) {
      setError(err.message);
      console.error('Error liking post:', err);
    }
  };

  // Add comment
  const handleComment = async (postId) => {
    const text = commentText[postId];
    if (!text) return;
    try {
      const res = await fetch(`${API_BASE_URL}/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('Failed to comment');
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      fetchPosts();
    } catch (err) {
      setError(err.message);
      console.error('Error commenting:', err);
    }
  };

  // Delete post
  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete post');
      fetchPosts();
    } catch (err) {
      setError(err.message);
      console.error('Error deleting post:', err);
    }
  };

  // Report post
  const handleReportPost = async (postId, reason) => {
    try {
      const res = await fetch(`${API_BASE_URL}/posts/${postId}/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Failed to report post');
      setReportingPost(null);
      setShowReportOptions(false);
      alert('Post reported. Thank you!');
    } catch (err) {
      setError(err.message);
      console.error('Error reporting post:', err);
    }
  };

  const toggleReportOptions = (postId) => {
    if (reportingPost === postId) {
      setReportingPost(null);
      setShowReportOptions(false);
    } else {
      setReportingPost(postId);
      setShowReportOptions(true);
    }
  };

  useEffect(() => {
    socket.on('new post', (post) => {
      setPosts((prevPosts) => [post, ...prevPosts]);
    });

    return () => {
      socket.off('new post');
    };
  }, []);

  const handleAddFriend = (user) => {
    console.log('Friend action triggered for:', user);
    fetchPosts();
  };

  const handleUserClick = (event, user) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedUser(user);
    setPopupPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
  };

  const handleClosePopup = () => {
    setSelectedUser(null);
  };



  return (
    <div>
      <Header />
      <div className="container">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '18px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{background: 'linear-gradient(135deg, #667eea 0%, #22c55e 100%)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.7rem 1.5rem', fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(102,126,234,0.10)'}}
            >
              + Create Post
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
                <button 
                  onClick={() => setPostFilter('recommended')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: postFilter === 'recommended' ? 'linear-gradient(135deg, #667eea 0%, #22c55e 100%)' : '#f9fafb',
                    color: postFilter === 'recommended' ? 'white' : '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🎯 Recommended
                </button>
                <button 
                  onClick={() => setPostFilter('friends')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: postFilter === 'friends' ? 'linear-gradient(135deg, #667eea 0%, #22c55e 100%)' : '#f9fafb',
                    color: postFilter === 'friends' ? 'white' : '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  👥 Friends
                </button>
                <button 
                  onClick={() => setPostFilter('all')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: postFilter === 'all' ? 'linear-gradient(135deg, #667eea 0%, #22c55e 100%)' : '#f9fafb',
                    color: postFilter === 'all' ? 'white' : '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🌐 All Posts
                </button>
              </div>
              <button 
                onClick={fetchPosts} 
                style={{
                  padding: '8px 18px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e 0%, #667eea 100%)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(34,197,94,0.10)'
                }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        <h3>
          {postFilter === 'recommended' && '🎯 Recommended Posts'}
          {postFilter === 'friends' && '👥 Friends Posts'}
          {postFilter === 'all' && '🌐 All Posts'}
        </h3>
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        {loading ? <div>Loading...</div> : (
          <div id="posts-container">
            {posts.filter(post => post.user && post.user._id !== myId).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <h4>
                  {postFilter === 'recommended' && 'No recommendations yet'}
                  {postFilter === 'friends' && 'No friends posts yet'}
                  {postFilter === 'all' && 'No posts available'}
                </h4>
                <p>
                  {postFilter === 'recommended' && 'Start interacting with posts (like, comment, create) to get personalized recommendations!'}
                  {postFilter === 'friends' && 'Add some friends or wait for them to create posts!'}
                  {postFilter === 'all' && 'Be the first to create a post!'}
                </p>
              </div>
            ) : (
              posts.filter(post => post.user && post.user._id !== myId).map((post, index) => (
              <div className="card" key={post._id || index} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button 
                    onClick={() => toggleReportOptions(post._id)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#666', 
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: reportingPost === post._id ? '#f0f0f0' : 'transparent'
                    }}
                  >
                    ⚠️
                  </button>
                </div>
                {reportingPost === post._id && showReportOptions && (
                  <div style={{ 
                    position: 'absolute',
                    top: '40px',
                    right: '16px',
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    minWidth: '150px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Report Post:</div>
                    <button 
                      onClick={() => handleReportPost(post._id, 'Inappropriate content')}
                      style={{ 
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Inappropriate content
                    </button>
                    <button 
                      onClick={() => handleReportPost(post._id, 'Spam')}
                      style={{ 
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Spam
                    </button>
                    <button 
                      onClick={() => handleReportPost(post._id, 'Harassment')}
                      style={{ 
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Harassment
                    </button>
                    <button 
                      onClick={() => handleReportPost(post._id, 'Other')}
                      style={{ 
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Other
                    </button>
                  </div>
                )}
                <div className="post-header" onClick={(e) => handleUserClick(e, post.user)}>
                  {post.user && post.user.profilePicture && (
                    <img
                      src={
                        post.user.profilePicture.startsWith('/uploads')
                          ? BACKEND_URL + post.user.profilePicture
                          : post.user.profilePicture
                      }
                      alt="Profile"
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', marginRight: 8 }}
                    />
                  )}
                  <h4>{post.user ? `${post.user.firstName} ${post.user.lastName}` : 'Unknown'}</h4>
                </div>
                <p>{post.content}</p>
                {post.image && (
                  <img 
                    src={post.image.startsWith('/uploads') ? BACKEND_URL + post.image : post.image} 
                    alt="Post" 
                    style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginBottom: 8 }} 
                  />
                )}
                <div className="actions">
                  <button onClick={() => handleLike(post._id)}>
                    {post.likes && post.likes.includes(myId) ? 'Unlike' : 'Like'} ({post.likes ? post.likes.length : 0})
                  </button>
                  <button>
                    <span>{post.comments ? post.comments.length : 0} Comments</span>
                  </button>
                  {myId && post.user && post.user._id === myId && (
                    <button onClick={() => handleDelete(post._id)} style={{ color: 'red' }}>Delete</button>
                  )}
                </div>
                <div style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    value={commentText[post._id] || ''}
                    onChange={e => setCommentText(prev => ({ ...prev, [post._id]: e.target.value }))}
                    placeholder="Add a comment..."
                    style={{ width: '80%' }}
                  />
                  <button onClick={() => handleComment(post._id)}>Comment</button>
                </div>
              </div>
            ))
            )}
          </div>
        )}
        
        {selectedUser && (
          <ProfilePopup
            user={selectedUser}
            position={popupPosition}
            onClose={handleClosePopup}
            onAddFriend={handleAddFriend}
          />
        )}
        <CreatePostModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
        />
      </div>
    </div>
  );
};

export default Dashboard; 