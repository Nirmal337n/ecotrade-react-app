import React, { useEffect, useState } from 'react';
import { FaHistory, FaTimes, FaArrowRight, FaArrowLeft, FaGift, FaShoppingCart, FaHandHoldingUsd } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './TradeHistoryModal.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TABS = [
  { key: 'sold', label: 'Sold', icon: <FaHandHoldingUsd /> },
  { key: 'purchased', label: 'Purchased', icon: <FaShoppingCart /> },
  { key: 'giveaway', label: 'Giveaway', icon: <FaGift /> },
  { key: 'claimedfree', label: 'Claimed Free', icon: <FaArrowRight /> },
];

const TradeHistoryModal = ({ onClose }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('sold');
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/trades/my-trades?status=completed`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch trade history');
        const data = await res.json();
        setTrades(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchTrades();
  }, [token]);

  // Filtering logic
  const filteredTrades = trades.filter(t => {
    if (!t || !t.tradeType) return false;
    if (activeTab === 'sold') {
      return t.tradeType === 'sale' && t.seller === userId;
    }
    if (activeTab === 'purchased') {
      return t.tradeType === 'sale' && t.buyer === userId;
    }
    if (activeTab === 'giveaway') {
      return t.tradeType === 'giveaway' && t.seller === userId;
    }
    if (activeTab === 'claimedfree') {
      return t.tradeType === 'giveaway' && t.buyer === userId;
    }
    return false;
  });

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/assets/images/reuse.png';
    if (imagePath.startsWith('http')) return imagePath;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${imagePath}`;
  };

  return (
    <div className="trade-history-modal-overlay">
      <div className="trade-history-modal">
        <div className="trade-history-modal-header">
          <div className="trade-history-modal-title">
            <FaHistory /> Trade History
          </div>
          <button className="trade-history-close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="trade-history-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`trade-history-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div className="trade-history-modal-content">
          {loading ? (
            <div className="trade-history-empty-state">Loading...</div>
          ) : error ? (
            <div className="trade-history-error">{error}</div>
          ) : (
            <ul className="trade-list">
              {filteredTrades.length === 0 ? (
                <li className="trade-history-empty-state">No trades found for this category.</li>
              ) : (
                filteredTrades.map(t => (
                  <li
                    key={t._id}
                    className="trade-card"
                    onClick={() => { onClose(); navigate(`/product/${t.product}`); }}
                  >
                    <img
                      src={getImageUrl(t.product?.primaryImage)}
                      alt={t.product?.title || 'Trade'}
                      className="gift-image"
                      onError={e => { e.target.src = '/assets/images/reuse.png'; }}
                    />
                    <div className="trade-info">
                      <span className="trade-title">{t.product?.title || 'Trade'}</span>
                      <span className="trade-meta">{t.tradeType === 'sale' ? (t.seller === userId ? 'Sold' : 'Purchased') : (t.seller === userId ? 'Giveaway' : 'Claimed Free')}</span>
                      <span className="trade-status">{t.status}</span>
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

export default TradeHistoryModal; 