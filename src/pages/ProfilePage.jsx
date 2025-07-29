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
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentUser(data);
                // If no userId is specified in URL, we are viewing our own profile
                if (!userId) {
                    setUser(data);
                    setFormData(data);
                }
            } else {
                navigate('/login');
            }
        };

        const fetchUser = async () => {
            if (!userId) return; // Handled by fetchCurrentUser
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

        const fetchAllData = async () => {
            setLoading(true);
            await fetchCurrentUser();
            if (userId) {
                await fetchUser();
            }
            setLoading(false);
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
            </div>
        </>
    );
};

export default ProfilePage; 