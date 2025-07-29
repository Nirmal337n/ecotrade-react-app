import React, { useEffect, useState } from 'react';
import { FaGift, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './MarketplaceGiftsModal.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MarketplaceGiftsModal = ({ onClose }) => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGifts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/products?type=giveaway&mine=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch gifts');
        const data = await res.json();
        setGifts(data.products || []);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchGifts();
  }, [token]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/assets/images/reuse.png';
    if (imagePath.startsWith('http')) return imagePath;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${imagePath}`;
  };

  return (
    <div className="gifts-modal-overlay">
      <div className="gifts-modal">
        <div className="gifts-modal-header">
          <div className="gifts-modal-title">
            <FaGift /> My Giveaways / Pending Gifts
          </div>
          <button className="gifts-close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="gifts-modal-content">
          {loading ? (
            <div className="gifts-empty-state">Loading...</div>
          ) : error ? (
            <div className="gifts-error">{error}</div>
          ) : (
            <ul className="gifts-list">
              {gifts.length === 0 ? (
                <li className="gifts-empty-state">No giveaways or pending gifts.</li>
              ) : (
                gifts.map(g => (
                  <li
                    key={g._id}
                    className="gift-card"
                    onClick={() => { onClose(); navigate(`/product/${g._id}`); }}
                  >
                    <img
                      src={getImageUrl(g.primaryImage)}
                      alt={g.title}
                      className="gift-image"
                      onError={e => { e.target.src = '/assets/images/reuse.png'; }}
                    />
                    <div className="gift-info">
                      <span className="gift-title">{g.title}</span>
                      {/* Optionally add status or recipient info here */}
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceGiftsModal; 