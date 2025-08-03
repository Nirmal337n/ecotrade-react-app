import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ProfilePopup from '../components/ProfilePopup';
import './ProfilePage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ProfilePage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [posts, setPosts] = useState([]);
    const [products, setProducts] = useState([]);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentUser(data);
                if (!userId) {
                    setUser(data);
                    setFormData(data);
                }
            } else {
                navigate('/login');
            }
        };

        const fetchUser = async () => {
            if (!userId) return;
            try {
                const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('User not found.');
                const data = await res.json();
                setUser(data);
                setFormData(data);
            } catch (err) {
                setError(err.message);
            }
        };

        const fetchPosts = async (uid) => {
            try {
                const res = await fetch(`${API_BASE_URL}/posts?user=${uid}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPosts(data);
                }
            } catch {}
        };

        const fetchProducts = async (uid) => {
            try {
                const res = await fetch(`${API_BASE_URL}/products/user/${uid}?status=completed&type=sell,giveaway`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data);
                }
            } catch {}
        };

        const fetchAllData = async () => {
            setLoading(true);
            await fetchCurrentUser();
            let uid = userId;
            if (!uid && currentUser) uid = currentUser._id;
            if (userId) {
                await fetchUser();
            }
            // Wait for user to be set
            setTimeout(async () => {
                const uidToFetch = userId || (currentUser && currentUser._id);
                if (uidToFetch) {
                    await fetchPosts(uidToFetch);
                    await fetchProducts(uidToFetch);
                }
                setLoading(false);
            }, 100);
        };

        fetchAllData();
    }, [userId, token, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setFormData(prev => ({ ...prev, profilePictureFile: e.target.files[0] }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        // Append all form data
        for (const key in formData) {
            if (key === 'profilePictureFile') {
                data.append('profilePicture', formData[key]);
            } else if (formData[key] !== undefined && formData[key] !== null) {
                data.append(key, formData[key]);
            }
        }

        try {
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data,
            });

            if (!res.ok) throw new Error('Failed to update profile.');
            const updatedUser = await res.json();
            setUser(updatedUser);
            setFormData(updatedUser);
            setIsEditing(false);
        } catch (err) {
            setError(err.message);
        }
    };
    
    if (loading) return <div className="profile-page-loading">Loading Profile...</div>;
    if (error) return <div className="profile-page-error">Error: {error}</div>;
    if (!user) return <div className="profile-page-error">User not found.</div>;

    const isOwnProfile = currentUser && user._id === currentUser._id;

    return (
        <>
            <Header />
            <div className="profile-page-container">
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="profile-avatar-container">
                           <img src={formData.profilePictureFile ? URL.createObjectURL(formData.profilePictureFile) : (user.profilePicture && `${API_BASE_URL}${user.profilePicture}`.replace('/api', ''))} alt={user.firstName} className="profile-avatar" />
                           {isEditing && (
                                <label htmlFor="profilePictureInput" className="change-avatar-btn">
                                    Change
                                    <input id="profilePictureInput" type="file" onChange={handleFileChange} />
                                </label>
                            )}
                        </div>
                        <div className="profile-intro">
                            <h1>{user.firstName} {user.lastName}</h1>
                            <p className="profile-email">{user.email}</p>
                            {!isOwnProfile && currentUser && (
                                <ProfilePopup user={user} position={{ top: 120, left: 20 }} onClose={() => {}} onAddFriend={() => {}} />
                            )}
                        </div>
                        {isOwnProfile && !isEditing && (
                            <button onClick={() => setIsEditing(true)} className="profile-action-btn">Edit Profile</button>
                        )}
                    </div>

                    {isEditing ? (
                        <form className="profile-edit-form" onSubmit={handleFormSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input type="text" name="firstName" value={formData.firstName || ''} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input type="text" name="lastName" value={formData.lastName || ''} onChange={handleInputChange} />
                                </div>
                            </div>
                             <div className="form-group">
                                <label>Bio</label>
                                <textarea name="bio" value={formData.bio || ''} onChange={handleInputChange}></textarea>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Address</label>
                                    <input type="text" name="address" value={formData.address || ''} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input type="text" name="phone" value={formData.phone || ''} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-save">Save Changes</button>
                                <button type="button" onClick={() => setIsEditing(false)} className="btn-cancel">Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <div className="profile-details">
                            <div className="detail-item">
                                <h3>About</h3>
                                <p>{user.bio || 'No bio provided.'}</p>
                            </div>
                            <div className="detail-item">
                                <h3>Contact Information</h3>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Phone:</strong> {user.phone}</p>
                                <p><strong>Address:</strong> {user.address}</p>
                            </div>
                            <div className="detail-item">
                                <h3>Interests</h3>
                                <div className="interests-tags">
                                    {user.interests?.length > 0 ? (
                                        user.interests.map(interest => <span key={interest} className="tag">{interest}</span>)
                                    ) : <p>No interests listed.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* User Posts Section */}
                <div className="profile-section">
                    <h2>User's Posts</h2>
                    {posts.length === 0 ? (
                        <div className="profile-empty">No posts found.</div>
                    ) : (
                        <ul className="profile-list">
                            {posts.map(post => (
                                <li key={post._id} className="profile-list-item">
                                    <div><b>{post.content?.slice(0, 60) || post.title}</b></div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>{new Date(post.createdAt).toLocaleString()}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {/* Marketplace History Section */}
                <div className="profile-section">
                    <h2>Marketplace History (Sold/Giveaway)</h2>
                    {products.length === 0 ? (
                        <div className="profile-empty">No marketplace history found.</div>
                    ) : (
                        <ul className="profile-list">
                            {products.map(product => (
                                <li key={product._id} className="profile-list-item">
                                    <div><b>{product.title}</b> ({product.type})</div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>{new Date(product.createdAt).toLocaleString()}</div>
                                    {product.sell_price && <div>Sold for: {product.sell_price}</div>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
};

export default ProfilePage; 